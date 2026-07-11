# Pack Opening × Market Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship weighted-random pack opening integrated with the shop and a new Digital Binder, authored from an in-app admin, on the live TypeScript backend — with a **tamper-evident server CSPRNG + append-only audit (closed-economy technical floor)** and an opt-in finite-supply mode.

**Architecture:** Land everything on `d-sports-api` (TS/Next.js 16/Prisma/Postgres, the live backend) as the system of record. Extend the existing `Pack`/`Collectible`/`PackPurchase`/odds engine rather than rebuilding. Add `Binder`/`BinderCard`, a per-pack `mintMode` (`ODDS_ONLY` default / `FINITE` opt-in via `MintInstance`), a CSPRNG-backed draw + append-only audit log, and pack video/GLB upload endpoints (signed URL + **post-PUT confirm-upload revalidation**). Native app (`d-sports-engage-native`) gets an admin route group (pack management only), the new opening animation ported from the `Pack-opening` prototype, and the Digital Binder UI **coexisting** with the wallet `BinderScreen` inventory viewer. Rust (`d-sports-backend`) stays a tracked parity backlog; its legacy shim uses **explicit** route allowlisting — new binder/upload/confirm-upload routes must be added before Phase 3 hits shim environments.

**Tech Stack:** TypeScript, Next.js 16 App Router, Prisma 6, PostgreSQL, Clerk auth, Supabase Storage, Bun test runner, Expo/React Native, `expo-video`, `expo-document-picker`, Node `crypto`.

**Spec:** `docs/PACK_OPENING_MARKET_INTEGRATION_SPEC.md` (approved 2026-07-08, decisions D1–D7, Q1–Q4 resolved).

**Pre-execution audit:** Folded 2026-07-11 (v2). Do not start coding Phase 0 FINITE guarantees, Open Later, or signed uploads without the patched tasks below (0.5a–c, 0.6a/b, 0.7a, 1.3, 2.0, 2.5a, 2.7a, 2.8, 3A.0, 3B.5, 3C.0, 4.2).

---

## Decisions carried into this plan

- **D2 / Q3:** `FINITE` mint mode is opt-in per pack; `ODDS_ONLY` stays default. FINITE packs honor **hard per-open** tier guarantees; publish is blocked if a guarantee is mathematically unsatisfiable for the full open count.
- **D5 / Q4:** Swap `Math.random()` draw for Node `crypto`-backed CSPRNG + append-only audit log now. Language: **tamper-evident audit**, not “compliance-grade.” drand/on-chain fairness (ADR-0001) stays deferred; keep an odds-table hash in the audit log so the later on-chain track is forward-compatible. Counsel (Mode A closed vs Mode B open economy) is a separate compliance workstream — not an engineering default.
- **Q1:** Transfer restrictions ship as a rate-limit mechanism that is **implemented but switched off** (config flag + limit value), so it can be enabled without a code change.
- **Q2:** Build the interactive GLB upload endpoint from the proven `scripts/upload-official-dsports-glbs.ts` workflow (Supabase `pack-assets`, `teams/{teamId}/animations/`, `model/gltf-binary`).
- **D6:** In-app admin = pack management only. Rest of web admin deferred (documented in spec §4.3).

### Author decisions locked (2026-07-11 audit)

| ID | Decision |
|---|---|
| **D-G** | **Hard** per-open `guaranteeMinRarity`. `validateFiniteConfig` requires `guaranteeSupply >= totalMintCount / maxReveal` (exact division). Implement `drawWithGuarantee` forced-slot; late-life unsatisfiable → typed error. |
| **D-G2** | When `guaranteeMinRarity` is set, odds API responses **replace** display-only `getDefaultGuaranteeForTier` with structured guarantee copy from that field. |
| **D-L** | Legal: ship closed-economy floor (CSPRNG + audit + disclosure). Counsel signs Mode A vs B. |
| **D-B** | **Coexist** wallet `BinderScreen` + Digital Binder. Distinct nav/copy + dual-PIN first-run disclosure. |
| **D-O** | Open Later: **both** checkout body **and** post-purchase PATCH for `targetBinderId`. |
| **D-P** | Preview: **demo-biased** (may force a showcase high card); watermark; **never** claim “same RNG as real opens.” |

### Branching rule (mandatory)

**Every phase branch must be cut from an up-to-date `main` (or the agreed integration branch), never from another unmerged phase branch.**

- Correct: `main` → `feat/pack-market-phase0`; after merge, `main` → `feat/pack-market-phase1` / `phase2` / `native-*`
- Forbidden: `feat/pack-market-phase0` → `feat/pack-market-phase2` (or any phase stacked on an unmerged sibling)
- Phase 1 ‖ Phase 2 parallelism is fine **only** as independent branches both based on post-Phase-0 `main`.

## Conventions (read once)

- All server actions and API routes return `ActionResult<T>` (`{ success, data?, error?, code? }`). Use typed errors (`ValidationError`, `ForbiddenError`, `NotFoundError`, `ConflictError`).
- Business logic lives in `server/*` (`'use server'`); routes in `app/api/*` are thin wrappers.
- Use path aliases (`@/lib`, `@/server`), `pino` logger not `console.log`, `revalidateTag()` after mutations.
- Tests run with `bun run test` (Bun's `bun:test`, `describe`/`it`/`expect`). Existing example: `server/__tests__/pack-odds.test.ts`.
- DB commands need Infisical: `infisical run --env=dev -- bunx prisma migrate dev`. Type/lint gates: `bun run typecheck`, `bun run lint` (max-warnings=0).
- All `/api/admin/*` work is gated by `canManageTeam(userId, teamId)` (mutations) / `canAccessTeam` (reads) — already exists in `server/team-permissions.ts`.

## File map (what gets created/modified)

**IMPORTANT — `'use server'` constraint (applies everywhere):** files in `server/*` carry the `'use server'` directive, and Next.js only allows **async function exports** from them. Every pure/sync helper in this plan therefore lives in `lib/*` modules (imported by server actions), never exported from `server/*`. This is also why the pure logic is unit-testable without a Prisma client.

**`d-sports-api` — Phase 0 (backend foundations)**
- `prisma/schema.prisma` — add enums `PackSize`, `MintMode`; fields on `Pack`; models `MintInstance`, `Binder`, `BinderCard`, `BinderTransferLog`, `PackDrawAudit`.
- `lib/weighted-random.ts` — CSPRNG draw (swap `Math.random`).
- `lib/secure-random.ts` — **new** — `secureRandomFloat()`, `secureRandomInt()` (Node `crypto`). Server-only.
- `lib/odds-table-hash.ts` — **new** — canonical odds-table hash for audit.
- `lib/mint-allocation.ts` — **new** — pure: `computeAllocation`, `validateFiniteConfig` (**hard** guarantee supply ≥ opens), `tiersAtOrAbove`, `drawWithGuarantee` (forced-slot).
- `server/pack-actions.ts` — accept `packSize`/`mintMode`/`totalMintCount` + tier allocation on create; finite validation + guarantee check; **single writer** derives `maxReveal` from `packSize`.
- `server/minting-actions.ts` — branch open flow ODDS_ONLY vs FINITE; ODDS_ONLY draw **inside** tx; write `PackDrawAudit` (FINITE includes `availableCount` / pool snapshot).
- `server/mint-instances.ts` — **new** — async DB ops only: `generateMintInstances`, `consumeMintInstance` (raw-SQL claim, **capped** SKIP LOCKED re-picks).
- `lib/pack-odds.ts` / odds route — when `guaranteeMinRarity` set, structured guarantee copy replaces `getDefaultGuaranteeForTier` (D-G2).
- `server/__tests__/secure-random.test.ts`, `mint-allocation.test.ts`, `finite-mint.test.ts` — **new** (incl. depletion + contention).

**`d-sports-api` — Phase 1 (admin authoring)**
- `app/api/admin/packs/upload-model/route.ts` — **new** — mints a Supabase **signed upload URL** (GLB; no file body through the route).
- `app/api/admin/packs/upload-video/route.ts` — **new** — same signed-URL pattern (video).
- `app/api/admin/packs/confirm-upload/route.ts` — **new** — post-PUT service-role revalidation (size + GLB magic / video content-type) before persisting URLs (**Task 1.3**).
- `lib/upload-validation.ts` — **new** — pure validators (+ GLB magic-byte check helper).
- `server/__tests__/upload-validation.test.ts` — **new**.

**`d-sports-api` — Phase 2 (binder API)**
- `lib/binder-pin.ts` — **new** (salted PBKDF2 PIN; store iterations in hash string); `lib/binder-logic.ts` — **new** (pure: invariants, shelf grouping, transfer math); `lib/pack-open-logic.ts` — **new** (pure: `resolveShelf`, `buildBinderLandings`); `lib/transfer-rate-limit.ts` — **new** (Q1, wired to `BinderTransferLog`).
- `server/binder-actions.ts` — **new** (async actions only); `app/api/binders/**` routes — **new**.
- `prisma/schema.prisma` — add `PackPurchase.targetBinderId` + PIN lockout fields in **Task 2.0** (migration first).
- `app/api/checkout/dsports-cash/route.ts` — accept optional `targetBinderId` / per-line binder (**Task 2.7a**).
- `app/api/user/packs/[purchaseId]/route.ts` — **new** PATCH to set/clear `targetBinderId` (post-purchase Open Later).
- `server/minting-actions.ts` — `openPack` gains `binderId`; lands via `buildBinderLandings`; fallback `binderId ?? purchase.targetBinderId`; **`FOR UPDATE`** on ownership invariant (Task 2.5a).

**`d-sports-engage-native` — Phases 1–3**
- `app/(admin)/**`, `hooks/use-admin-role.ts`, admin pack screens (spike signed-URL on device first — **3A.0**).
- `components/pack-opening/**` (ported look), `app/binder/**` (Digital Binder — **coexist** with wallet `BinderScreen`), binder-selection modal, `lib/api/binder-api.ts`.
- `components/shop/CollectibleDetailModal.tsx` — real odds + **demo-biased** "Preview opening" (watermark; not `PackDetailModal` — orphaned).

**`d-sports-backend` — Phase 4**
- `docs/parity/plans/PARITY_GAPS.md` — append new endpoints/models.
- `crates/engage/src/legacy_compat/routes.rs` — **explicit** allowlist entries for binders, uploads, confirm-upload (**merge-block** Phase 3 on shim envs).

---

# PHASE 0 — Backend foundations & compliance (d-sports-api)

*Independently shippable: after this phase the live open-pack flow uses a CSPRNG draw with an audit trail, and the schema supports finite packs and binders — with no user-facing change yet. This is the prerequisite for all other phases.*

Work in a worktree/branch off **up-to-date `main`**: `feat/pack-market-phase0` (never from another unmerged phase branch).

### Task 0.1: Secure RNG utility

**Files:**
- Create: `lib/secure-random.ts`
- Test: `server/__tests__/secure-random.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// server/__tests__/secure-random.test.ts
import { describe, it, expect } from "bun:test";
import { secureRandomFloat, secureRandomInt } from "@/lib/secure-random";

describe("secure-random", () => {
  it("secureRandomFloat returns values in [0,1)", () => {
    for (let i = 0; i < 10_000; i++) {
      const v = secureRandomFloat();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("secureRandomInt returns values in [0,max) and is unbiased-ish", () => {
    const max = 5;
    const counts = new Array(max).fill(0);
    for (let i = 0; i < 50_000; i++) {
      const v = secureRandomInt(max);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(max);
      counts[v]++;
    }
    // each bucket should be within ~15% of expected (10000)
    for (const c of counts) expect(Math.abs(c - 10_000)).toBeLessThan(1_500);
  });

  it("secureRandomInt throws on non-positive max", () => {
    expect(() => secureRandomInt(0)).toThrow();
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `bun run test server/__tests__/secure-random.test.ts`
Expected: FAIL — module `@/lib/secure-random` not found.

- [ ] **Step 3: Implement**

```typescript
// lib/secure-random.ts
import { randomInt, randomBytes } from "node:crypto";

/** Cryptographically-secure float in [0, 1). */
export function secureRandomFloat(): number {
  // 6 bytes -> 48 bits of entropy, divided by 2^48
  const buf = randomBytes(6);
  let value = 0;
  for (let i = 0; i < 6; i++) value = value * 256 + buf[i];
  return value / 2 ** 48;
}

/** Cryptographically-secure integer in [0, max). */
export function secureRandomInt(max: number): number {
  if (!Number.isInteger(max) || max <= 0) {
    throw new Error("secureRandomInt: max must be a positive integer");
  }
  return randomInt(0, max); // Node's crypto.randomInt is unbiased
}
```

- [ ] **Step 4: Run test, verify pass**

Run: `bun run test server/__tests__/secure-random.test.ts` → PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/secure-random.ts server/__tests__/secure-random.test.ts
git commit -m "feat(rng): add CSPRNG secure-random utility for pack draws"
```

### Task 0.2: Swap the weighted draw onto the CSPRNG

**Files:**
- Modify: `lib/weighted-random.ts:26` and `:58` (the two `Math.random()` calls)
- Test: `server/__tests__/pack-odds.test.ts` (existing suite still passes) + reuse existing behavior

- [ ] **Step 1: Add a distribution test that pins draw fairness**

Append to `server/__tests__/secure-random.test.ts`:

```typescript
import { weightedRandomSelect } from "@/lib/weighted-random";

it("weightedRandomSelect honors weights within tolerance", () => {
  const items = [
    { item: "a", weight: 70 },
    { item: "b", weight: 20 },
    { item: "c", weight: 10 },
  ];
  const counts: Record<string, number> = { a: 0, b: 0, c: 0 };
  for (let i = 0; i < 60_000; i++) counts[weightedRandomSelect(items)]++;
  expect(counts.a / 60_000).toBeCloseTo(0.7, 1);
  expect(counts.b / 60_000).toBeCloseTo(0.2, 1);
  expect(counts.c / 60_000).toBeCloseTo(0.1, 1);
});
```

- [ ] **Step 2: Run, verify pass with current `Math.random`** (baseline)

Run: `bun run test server/__tests__/secure-random.test.ts` → PASS (proves test is valid before swap).

- [ ] **Step 3: Swap the RNG source**

In `lib/weighted-random.ts`: add `import { secureRandomFloat } from "@/lib/secure-random";` at top. Replace both `Math.random()` occurrences (line ~26 in `weightedRandomSelect`, line ~58 in `weightedRandomSelectMultiple`) with `secureRandomFloat()`.

**Do NOT touch `components/Admin/pack-testing.tsx:224`** (revised from spec §5 after review): it's a **client component** — `lib/secure-random.ts` imports `node:crypto` and cannot run in the browser. More importantly, the sim is being promoted to a **public demo-biased "preview this pack" feature** (see Task 3B.5 / D-P): visualization that awards nothing and must **not** claim the same RNG as production — only real draws (server-side) need CSPRNG. Add a comment at `pack-testing.tsx:224`: `// Demo simulation only — real draws use lib/secure-random server-side; preview must not claim same RNG`. (Also leave the non-draw `Math.random()` at `minting-actions.ts:501`, which only salts a token-ID string; call this out in the commit body.)

- [ ] **Step 4: Run full existing suite + new test**

Run: `bun run test server/__tests__/` → PASS (pack-odds + secure-random). Then `bun run typecheck`.

- [ ] **Step 5: Commit**

```bash
git add lib/weighted-random.ts components/Admin/pack-testing.tsx server/__tests__/secure-random.test.ts
git commit -m "feat(rng): draw packs with CSPRNG instead of Math.random"
```

### Task 0.3: Odds-table hash (audit forward-compat with ADR-0001)

**Files:**
- Create: `lib/odds-table-hash.ts`
- Test: `server/__tests__/odds-table-hash.test.ts`

- [ ] **Step 1: Failing test**

```typescript
// server/__tests__/odds-table-hash.test.ts
import { describe, it, expect } from "bun:test";
import { hashOddsTable } from "@/lib/odds-table-hash";

describe("hashOddsTable", () => {
  const table = [
    { collectibleId: "c1", quantity: 12, weight: 100 },
    { collectibleId: "c2", quantity: 8, weight: 60 },
  ];
  it("is stable regardless of input order", () => {
    const a = hashOddsTable(table);
    const b = hashOddsTable([...table].reverse());
    expect(a).toBe(b);
  });
  it("changes when a weight changes", () => {
    const a = hashOddsTable(table);
    const b = hashOddsTable([{ ...table[0], weight: 101 }, table[1]]);
    expect(a).not.toBe(b);
  });
  it("returns a 64-char hex sha256", () => {
    expect(hashOddsTable(table)).toMatch(/^[0-9a-f]{64}$/);
  });
});
```

- [ ] **Step 2: Run, verify fail.** `bun run test server/__tests__/odds-table-hash.test.ts` → FAIL.

- [ ] **Step 3: Implement**

```typescript
// lib/odds-table-hash.ts
import { createHash } from "node:crypto";

export interface OddsRow { collectibleId: string; quantity: number; weight: number; }

/** Canonical, order-independent SHA-256 of a pack's odds table. */
export function hashOddsTable(rows: OddsRow[]): string {
  const canonical = rows
    .map((r) => `${r.collectibleId}:${r.quantity}:${r.weight}`)
    .sort()
    .join("|");
  return createHash("sha256").update(canonical).digest("hex");
}
```

- [ ] **Step 4: Run, verify pass.** → PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/odds-table-hash.ts server/__tests__/odds-table-hash.test.ts
git commit -m "feat(audit): add canonical odds-table hash"
```

### Task 0.4: Schema — Pack fields, enums, MintInstance, Binder, audit

**Files:**
- Modify: `prisma/schema.prisma` (Pack model ~866, UserCollectible ~1016, enums ~1231)

- [ ] **Step 1: Add enums** (near the other enums, after `enum Rarity`)

```prisma
enum PackSize { THREE FIVE SEVEN }
enum MintMode { ODDS_ONLY FINITE }
```

- [ ] **Step 2: Add fields to `model Pack`**

```prisma
  packSize        PackSize  @default(THREE)
  videoUrl        String?
  videoDurationMs Int?
  whiteFlashMs    Int?
  modelUrl        String?
  mintMode          MintMode  @default(ODDS_ONLY)
  totalMintCount    Int?
  guaranteeMinRarity Rarity?   // hard per-open guarantee >= X; null = no guarantee; supply must cover all opens
  mintInstances     MintInstance[]
```

- [ ] **Step 3: Add new models**

```prisma
model MintInstance {
  id                String      @id @default(cuid())
  packId            String
  collectibleId     String
  serialNo          Int
  status            String      @default("available") // available | drawn
  drawnByPurchaseId String?
  createdAt         DateTime    @default(now())
  pack              Pack        @relation(fields: [packId], references: [id], onDelete: Cascade)
  collectible       Collectible @relation(fields: [collectibleId], references: [id])
  @@unique([packId, collectibleId, serialNo])
  @@index([packId, status])
}

model Binder {
  id         String       @id @default(cuid())
  userId     String
  name       String
  pinHash    String?
  coverImage String?
  createdAt  DateTime     @default(now())
  updatedAt  DateTime     @updatedAt
  user       User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  cards      BinderCard[]
  @@index([userId])
}

model BinderCard {
  id            String      @id @default(cuid())
  binderId      String
  collectibleId String
  quantity      Int         @default(1)   // # of this collectible placed in this binder
  shelf         String?                    // team/league key, or null -> "General"
  addedAt       DateTime    @default(now())
  binder        Binder      @relation(fields: [binderId], references: [id], onDelete: Cascade)
  collectible   Collectible @relation(fields: [collectibleId], references: [id])
  @@unique([binderId, collectibleId])
  @@index([binderId])
}
// NOTE (design fix from plan review): BinderCard is a QUANTITY BUCKET, not one row
// per copy. UserCollectible is unique per (userId, collectibleId) with a `quantity`
// counter that the open flow increments (minting-actions.ts:519-536) — so a per-copy
// BinderCard is impossible for duplicates. Invariant enforced in binder-actions.ts
// **inside one interactive tx with FOR UPDATE** on UserCollectible + relevant BinderCard
// rows (Task 2.5a) — app-only checks without row locks are TOCTOU:
//   sum(BinderCard.quantity for a user's binders, per collectible) <= UserCollectible.quantity.
// "Loose"/unplaced copies = owned quantity - sum(placed). This leaves the existing
// mint upsert untouched (no schema change to UserCollectible's uniqueness).

model PackDrawAudit {
  id             String   @id @default(cuid())
  userId         String
  packId         String
  packPurchaseId String
  mintMode       String   // prefer Prisma MintMode enum
  oddsTableHash  String
  drawnCardIds   String[]
  availableCount Int?     // FINITE: pool size at draw time (C6)
  poolSnapshot   Json?    // FINITE: optional per-collectible available counts
  createdAt      DateTime @default(now())
  @@index([packPurchaseId])
  @@index([packId, createdAt])
}

model BinderTransferLog {
  id        String   @id @default(cuid())
  userId    String
  createdAt DateTime @default(now())
  @@index([userId, createdAt])
}
// Q1: the transfer rate-limit switch must actually work when flicked.
// Every transfer inserts a row; the limiter counts rows in the last hour.
// Tiny table, no FK needed — it's a counter, not an audit of what moved
// (PackDrawAudit and binder state cover that). Prefer a name that does not
// collide with "audit" language in docs (rate-limit event log).
```

- [ ] **Step 4: Add relations** to existing models:
  - `model Collectible`: add `mintInstances MintInstance[]` and `binderCards BinderCard[]`
  - `model User`: add `binders Binder[]`
  - (No change to `UserCollectible` — BinderCard references `collectibleId`, not `userCollectibleId`, so the existing `@@unique([userId, collectibleId])` + quantity upsert is untouched.)

- [ ] **Step 5: Create migration**

Run: `infisical run --env=dev -- bunx prisma migrate dev --name pack_market_foundations`
Expected: migration created + applied, client regenerated.

- [ ] **Step 6: Typecheck + commit**

Run: `bun run typecheck` → PASS.

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(schema): pack size/mint-mode, MintInstance, Binder, draw audit"
```

### Task 0.5: Mint-instance generation & consumption (FINITE mode core)

**Files:**
- Create: `lib/mint-allocation.ts` (pure math — NOT in `server/*`: `'use server'` files may only export async functions, and pure helpers must be importable by tests and by the native admin's allocation preview without a Prisma client)
- Create: `server/mint-instances.ts` (async DB ops only)
- Test: `server/__tests__/mint-allocation.test.ts`

#### Task 0.5a — Hard guarantee supply + allocation edge cases

- [ ] **Step 1: Failing test** — cover allocation math + divisibility + **hard** guarantee + % / empty-tier / remainder policy.

```typescript
// server/__tests__/mint-allocation.test.ts
import { describe, it, expect } from "bun:test";
import { computeAllocation, validateFiniteConfig } from "@/lib/mint-allocation";

const pool = [
  { collectibleId: "c1", rarity: "COMMON" },
  { collectibleId: "c2", rarity: "COMMON" },
  { collectibleId: "c3", rarity: "RARE" },
  { collectibleId: "c4", rarity: "LEGENDARY" },
];

describe("finite allocation", () => {
  it("splits total across tiers by percentage, evenly per card", () => {
    const alloc = computeAllocation(pool, 100, { COMMON: 50, RARE: 30, EPIC: 0, LEGENDARY: 20, MYTHIC: 0 });
    expect(alloc.perCard["c1"]).toBe(25);
    expect(alloc.perCard["c3"]).toBe(30);
    expect(alloc.perCard["c4"]).toBe(20);
    expect(alloc.total).toBe(100);
  });

  it("flags non-divisible tier as invalid", () => {
    const res = validateFiniteConfig(pool, 101, { COMMON: 50, RARE: 30, EPIC: 0, LEGENDARY: 20, MYTHIC: 0 }, undefined, 1);
    expect(res.ok).toBe(false);
    expect(res.reason).toContain("evenly");
  });

  it("rejects tier percentages that do not sum to 100", () => {
    const res = validateFiniteConfig(pool, 100, { COMMON: 40, RARE: 30, EPIC: 0, LEGENDARY: 20, MYTHIC: 0 }, undefined, 1);
    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/100|percent/i);
  });

  it("rejects empty tier with pct > 0", () => {
    const noEpicCards = pool; // no EPIC cards in pool
    const res = validateFiniteConfig(noEpicCards, 100, { COMMON: 50, RARE: 20, EPIC: 10, LEGENDARY: 20, MYTHIC: 0 }, undefined, 1);
    expect(res.ok).toBe(false);
  });

  it("blocks publish when guarantee supply < opens (hard per-open)", () => {
    // totalMintCount=300, maxReveal=3 → 100 opens; need ≥100 cards at/above RARE, not ≥1
    const res = validateFiniteConfig(
      pool,
      300,
      { COMMON: 250, RARE: 30, EPIC: 0, LEGENDARY: 20, MYTHIC: 0 }, // only 50 at/above RARE
      "RARE",
      3,
    );
    expect(res.ok).toBe(false);
    expect(res.reason).toContain("guarantee");
  });

  it("passes hard guarantee when guaranteeSupply >= opens", () => {
    // 100 opens, 100+ at/above RARE
    const res = validateFiniteConfig(
      pool,
      300,
      { COMMON: 150, RARE: 100, EPIC: 0, LEGENDARY: 50, MYTHIC: 0 },
      "RARE",
      3,
    );
    expect(res.ok).toBe(true);
  });

  it("requires totalMintCount % maxReveal === 0", () => {
    const res = validateFiniteConfig(pool, 301, { COMMON: 50, RARE: 30, EPIC: 0, LEGENDARY: 20, MYTHIC: 0 }, undefined, 3);
    expect(res.ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run, verify fail.**
- [ ] **Step 3: Implement `lib/mint-allocation.ts` (pure):**
  - `RARITY_ORDER = ["COMMON","RARE","EPIC","LEGENDARY","MYTHIC"]` and `tiersAtOrAbove(min: Rarity): Rarity[]`. Do NOT use `getDefaultGuaranteeForTier` for validation — that is display copy only.
  - Signature: `validateFiniteConfig(pool, total, tierPct, guaranteeMinRarity?, maxReveal)`:
    1. Reject if tier % do not sum to 100 (document remainder policy: **no silent remainder** — fail closed).
    2. Reject empty tier with pct > 0; reject non-integer totals / non-divisible per-card copies.
    3. Require `total % maxReveal === 0`; `opens = total / maxReveal`.
    4. **Hard guarantee (D-G):** if `guaranteeMinRarity` set, require `sum(allocation for tiersAtOrAbove) >= opens` — **not** `>= 1`.
  - `computeAllocation`: split `total` across tiers by pct, then evenly per card within a tier.

#### Task 0.5b — `drawWithGuarantee` forced-slot + depletion tests

- [ ] **Step 1: Failing test** for pure `drawWithGuarantee(availableByCollectible, weights, maxReveal, guaranteeMinRarity, rarityByCollectible)`:
  - One forced slot from `tiersAtOrAbove(guaranteeMinRarity)`; remaining `maxReveal - 1` from full pool **without replacement within the open**.
  - When guarantee-tier pool is empty mid-life → throw typed error (never silent commons).
  - Depletion simulation: after `opens` successful draws with hard RARE guarantee, pool still had enough; one more open fails typed.
- [ ] **Step 2–3: Implement** in `lib/mint-allocation.ts`; wire FINITE open path (Task 0.6) to call it (or equivalent inside `consumeMintInstance` loop: first claim forced-slot collectible, then free picks).
- [ ] **Step 4: Pass.** Commit with 0.5a as `feat(mint): hard guarantee supply + forced-slot draw`.

#### Task 0.5c — Cap SKIP LOCKED re-picks + contention test

- [ ] **Step 1–3: Implement `server/mint-instances.ts`:**
  - `generateMintInstances(tx, packId, alloc)`: write `MintInstance` rows (serialNo 1..copies per collectible). Prefer Prisma enums for `MintInstance.status` if not already.
  - `consumeMintInstance(tx, packId, purchaseId, opts?)`: weighted at collectible level; claim with raw SQL:
    ```ts
    const claimed = await tx.$queryRaw<{ id: string }[]>`
      UPDATE "MintInstance" SET status = 'drawn', "drawnByPurchaseId" = ${purchaseId}
      WHERE id = (
        SELECT id FROM "MintInstance"
        WHERE "packId" = ${packId} AND "collectibleId" = ${collectibleId} AND status = 'available'
        LIMIT 1 FOR UPDATE SKIP LOCKED
      )
      RETURNING id`;
    ```
  - If `claimed` empty: refresh counts and re-pick — **cap retries** (e.g. `MAX_CLAIM_RETRIES = 8`); then typed sold-out / contention error. Unbounded retry is forbidden.
  - Add a contention test (parallel claims on same pack) that asserts no double-draw and bounded retries.
- [ ] **Step 4: Pass.** `bun run typecheck`.
- [ ] **Step 5: Commit** `feat(mint): finite mint-instance allocation, hard guarantee, capped SKIP LOCKED`.

### Task 0.6: Branch the open flow (ODDS_ONLY vs FINITE) + write audit

**Files:**
- Modify: `server/minting-actions.ts:443-559` (the open transaction)
- Test: `server/__tests__/finite-mint.test.ts`

#### Task 0.6a — Draw inside tx + FINITE audit snapshot

- [ ] **Step 1: Failing test** — ODDS_ONLY uses weighted pool; FINITE consumes instances + sold-out; both write `PackDrawAudit` with odds-table hash; **FINITE audit includes `availableCount` (or pool snapshot JSON)** so the hash is not a lie over depleting life.
- [ ] **Step 2: Run, verify fail.**
- [ ] **Step 3: Implement** — after building `pool`, branch on `pack.mintMode`. **Preserve optimistic lock** (`updateMany` on `openedAt: null`). **Move ODDS_ONLY selection inside the same `$transaction`** after the lock (M7) — do not draw outside the tx.
  - `ODDS_ONLY`: `weightedRandomSelectMultiple(pool, pack.maxReveal)` inside tx.
  - `FINITE`: use `drawWithGuarantee` / `consumeMintInstance` `maxReveal` times (forced-slot first when guarantee set). Exhausted / unsatisfiable guarantee → typed Conflict/sold-out — never silent commons.
  - Insert `PackDrawAudit` with `hashOddsTable(...)`, `mintMode`, drawn IDs, and for FINITE: `availableCount` / pool snapshot at draw time. Prefer Prisma enum for `mintMode` on the audit row.
- [ ] **Step 4–5: Pass + commit** `feat(open): finite-mode draws + tamper-evident draw audit`.

#### Task 0.6b — Odds API guarantee copy (D-G2)

- [ ] When a pack has `guaranteeMinRarity` set, `GET /api/packs/{id}/odds` (and any shared odds builder in `lib/pack-odds.ts`) must return **structured guarantee text derived from that field** and **must not** use `getDefaultGuaranteeForTier` for that pack.
- [ ] Public copy for FINITE packs must disclose that remaining supply can change effective odds over the pack's life.
- [ ] Test: pack with `guaranteeMinRarity: RARE` → response guarantee label/description mentions RARE (or tiers at/above); pack without → may keep default display helper.
- [ ] Commit `feat(odds): structured guarantee copy from guaranteeMinRarity`.

### Task 0.7: Extend pack create to accept new config

**Files:**
- Modify: `server/pack-actions.ts` (`CreatePackInput` type ~line 17-31, create logic ~line 180-281)

- [ ] **Step 1: Failing test** — creating a pack with `mintMode: "FINITE"`, `totalMintCount`, tier percentages, and `guaranteeMinRarity` generates the right `MintInstance` count on publish and rejects invalid divisibility / unsatisfiable **hard** guarantee.
- [ ] **Step 2: Run, verify fail.**
- [ ] **Step 3: Implement** — add `packSize`, `mintMode`, `totalMintCount`, `tierPercentages`, `guaranteeMinRarity` to `CreatePackInput`; on publish of a FINITE pack call `validateFiniteConfig` (incl. hard guarantee + `maxReveal`) then `generateMintInstances` in a transaction; ODDS_ONLY packs skip instance generation.

#### Task 0.7a — `packSize` ↔ `maxReveal` single writer + sold-out alignment

- [ ] **Single writer:** derive `maxReveal` from `packSize` (THREE→3, FIVE→5, SEVEN→7) on create/update; **reject** requests that pass a drifting `maxReveal`. Backfill existing rows if needed.
- [ ] Spec which sold-out gate wins for FINITE: prefer **`MintInstance` available count** (and/or open count vs `totalMintCount / maxReveal`) over stale `Pack.quantity`/`sold` when they disagree; document and align open path.
- [ ] **Step 4: Pass.** `bun run test` + `bun run typecheck` + `bun run lint`.
- [ ] **Step 5: Commit** `feat(pack): author finite/odds-only packs with size + mint config`.

**Phase 0 checkpoint:** `bun run test && bun run typecheck && bun run lint` all green. Open the PR for `feat/pack-market-phase0` (from updated `main`). Nothing user-facing changed; existing packs default to `ODDS_ONLY` and behave exactly as before, now on a CSPRNG with a tamper-evident audit trail. **Do not market FINITE guarantees until 0.5a/b land.**

---
# PHASE 1 — Admin authoring: video + GLB upload (d-sports-api)

*Independently shippable: admins can upload pack videos and GLB models through the API (consumed by the native admin in Phase 3's sibling work). Builds directly on the proven seed-script workflow (Q2).*

**Why signed upload URLs (review fix — read before implementing):** streaming file bodies through Next.js route handlers fails on Vercel, which caps request bodies at **~4.5MB** — a 50MB GLB or 100MB video would 413 (the repo has already worked around this once: see the "upload banner directly to vercel blob storage" commit). So the routes below do **auth + validation + mint a Supabase signed upload URL** (`createAdminClient().storage.from(bucket).createSignedUploadUrl(path)`); the client then PUTs the file **directly to Supabase Storage**, bypassing Vercel entirely. Same `canManageTeam` boundary, no big-file buffering, less server code. The response still hands back the final public URL so the admin dropdown (`GET /api/admin/team-animations`) picks it up unchanged.

### Task 1.1: GLB signed-upload endpoint (from the working script workflow)

**Files:**
- Create: `app/api/admin/packs/upload-model/route.ts`
- Create: `lib/upload-validation.ts`
- Test: `server/__tests__/upload-validation.test.ts`

- [ ] **Step 1: Failing test** for pure validators (unit-testable without HTTP): `validateModelUpload(meta)` accepts `.glb`/`model/gltf-binary`, rejects other types, rejects > 50MB; `isGlbMagic(bytes)` checks the 4-byte `glTF` magic header.

```typescript
// server/__tests__/upload-validation.test.ts
import { describe, it, expect } from "bun:test";
import { validateModelUpload, isGlbMagic } from "@/lib/upload-validation";

const meta = (name: string, type: string, size: number) => ({ name, type, size });

describe("validateModelUpload", () => {
  it("accepts .glb", () => {
    expect(validateModelUpload(meta("pack.glb", "model/gltf-binary", 1_000)).ok).toBe(true);
  });
  it("accepts .glb even if browser sends octet-stream", () => {
    expect(validateModelUpload(meta("pack.glb", "application/octet-stream", 1_000)).ok).toBe(true);
  });
  it("rejects images", () => {
    expect(validateModelUpload(meta("x.png", "image/png", 10)).ok).toBe(false);
  });
  it("rejects > 50MB", () => {
    expect(validateModelUpload(meta("big.glb", "model/gltf-binary", 60 * 1024 * 1024)).ok).toBe(false);
  });
});

describe("isGlbMagic", () => {
  it("accepts the glTF binary magic header", () => {
    expect(isGlbMagic(new Uint8Array([0x67, 0x6c, 0x54, 0x46, 2, 0, 0, 0]))).toBe(true); // "glTF"
  });
  it("rejects other bytes", () => {
    expect(isGlbMagic(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBe(false); // PNG
  });
});
```

- [ ] **Step 2: Run, verify fail.**

- [ ] **Step 3: Implement**
  - `lib/upload-validation.ts`: `validateModelUpload(meta: {name, type, size})`, `validateVideoUpload(meta)`, `isGlbMagic(bytes: Uint8Array)` (first 4 bytes === `glTF`). Pure — no imports beyond types.
  - Route `POST /api/admin/packs/upload-model`: JSON body `{ teamId, fileName, fileSize, mimeType, magicBytes }` (`magicBytes` = base64 of the file's first 8 bytes, read client-side). Clerk auth + `canManageTeam(userId, teamId)` gate (mirror `upload-image/route.ts:21-37`). Validate via `validateModelUpload` + `isGlbMagic`. Then mint the signed URL:
    ```ts
    const path = `teams/${teamId}/animations/${Date.now()}-${sanitizeFilename(fileName)}`;
    const { data, error } = createAdminClient().storage
      .from("pack-assets")
      .createSignedUploadUrl(path); // client PUTs the file here directly
    ```
    Return `{ signedUrl: data.signedUrl, token: data.token, path, publicUrl }` (`publicUrl` from `getPublicUrl(path)` — same shape the `team-animations` dropdown consumes).
  - Note: the client uploads with `contentType: "model/gltf-binary"` via `supabase.storage.from(bucket).uploadToSignedUrl(path, token, file)` or a plain `PUT` — document both in the route's JSDoc for the native client (Task 3A.4e).

- [ ] **Step 4: Run, verify pass.** `bun run typecheck`.

- [ ] **Step 5: Commit** `feat(admin): signed-URL GLB upload for pack models (Vercel body-limit safe)`.

### Task 1.2: Video signed-upload endpoint

**Files:**
- Create: `app/api/admin/packs/upload-video/route.ts`

- [ ] **Step 1: Failing test** for `validateVideoUpload` (mp4/webm only, ≤ 100MB) — add to `upload-validation.test.ts`.
- [ ] **Step 2: Run, verify fail.**
- [ ] **Step 3: Implement** — same signed-URL pattern as Task 1.1: JSON body `{ teamId, fileName, fileSize, mimeType, durationMs }`, auth + validate, signed URL for `teams/${teamId}/videos/`, return `{ signedUrl, token, path, publicUrl }`. Duration: the **client** supplies `durationMs` (browser video element / native player metadata) — server-side ffprobe is out of scope (no ffmpeg dependency; **ponytail:** client supplies duration, add server extraction only if a client can't). `videoUrl`/`videoDurationMs`/`whiteFlashMs` are then saved on the pack via the existing pack update action after the direct upload succeeds.
- [ ] **Step 4: Run, verify pass.** `bun run typecheck` + `bun run lint`.
- [ ] **Step 5: Commit** `feat(admin): signed-URL pack video upload with client-supplied duration`.

### Task 1.3: Confirm-upload revalidation (C4 — required)

**Files:**
- Create: `app/api/admin/packs/confirm-upload/route.ts`
- Extend: `lib/upload-validation.ts` / server helper that uses service-role Storage download of first bytes

Signed-URL mint only validates **client-declared** metadata. After the client PUTs the object, nothing today re-checks the bytes before `videoUrl`/`modelUrl` are persisted on the pack.

- [ ] **Step 1: Failing test** — `confirmUpload({ path, kind: "model"|"video", expectedSize })` rejects when Storage object size mismatches, GLB magic fails, or video content-type is wrong; accepts a valid object.
- [ ] **Step 2: Implement** `POST /api/admin/packs/confirm-upload`:
  - Body: `{ teamId, path, kind, publicUrl }` (and optional packId if attaching immediately).
  - Auth + `canManageTeam`.
  - Service-role: head/download object; verify size; for model run `isGlbMagic` on first bytes; for video check content-type / extension.
  - Only then allow pack update to persist `videoUrl`/`modelUrl` (native 3A.4e and web admin must call confirm **before** save).
- [ ] **Step 3: Document** in upload route JSDoc: mint URL → PUT → **confirm-upload** → pack update.
- [ ] **Step 4: Commit** `feat(admin): confirm-upload revalidation before asset URL persist`.

**Phase 1 checkpoint:** endpoints callable; a client can mint a signed URL, PUT a real GLB/video, **confirm**, and see the asset listed. Branch from **updated `main`** after Phase 0 merge: `feat/pack-market-phase1`.

---

# PHASE 2 — Digital Binder API (d-sports-api)

*Independently shippable: full binder CRUD + PIN + transfer API with tests, plus pack-open landing — no UI yet. Branch `feat/pack-market-phase2` from **updated `main` after Phase 0** (does not need Phase 1; never branch from unmerged phase0 tip).*

**Binder model recap (from Phase 0 fix):** `BinderCard` is a quantity bucket `(binderId, collectibleId, quantity, shelf)`, unique per `(binderId, collectibleId)`. The ownership invariant — `sum(BinderCard.quantity across a user's binders, per collectible) <= UserCollectible.quantity` — is enforced in `binder-actions.ts` **with `FOR UPDATE` row locks inside one interactive transaction** (Task 2.5a). Unplaced ("loose") copies = owned − placed. **PIN is UX-only** (hides binder on a shared unlocked phone); ownership + Clerk session is the API boundary.

### Task 2.0: Migration first — lockout fields + `targetBinderId` (M1)

**Do this before Task 2.3 verifyPin code and before Open Later writes.**

- [ ] One Prisma migration adding:
  - `PackPurchase.targetBinderId String?` (+ optional FK to `Binder` if desired; validate ownership in app)
  - `Binder.pinFailedCount Int @default(0)`
  - `Binder.pinLastFailedAt DateTime?`
- [ ] Commit `feat(schema): binder PIN lockout + PackPurchase.targetBinderId`.
- [ ] Tasks 2.3 / 2.7 reference this migration — **do not** invent a second migration for the same fields.

### Task 2.1: Binder PIN hashing helper

**Files:**
- Create: `lib/binder-pin.ts`
- Test: `server/__tests__/binder-pin.test.ts`

**Why a dedicated helper:** the wallet code in `server/wallet-actions.ts` hashes PINs with **plain unsalted `createHash("sha256")`** (verified at `wallet-actions.ts:194,247`). Unsalted SHA-256 over a short numeric PIN is trivially rainbow-tableable. Reuse the *primitive that's already a dependency* (`pbkdf2`, already imported in `wallet-actions.ts:7`) but salt it — don't copy the unsalted pattern, and don't add a new crypto lib.

- [ ] **Step 1: Write the failing test**

```typescript
// server/__tests__/binder-pin.test.ts
import { describe, it, expect } from "bun:test";
import { hashBinderPin, verifyBinderPin } from "@/lib/binder-pin";

describe("binder PIN", () => {
  it("verifies a correct PIN", async () => {
    const stored = await hashBinderPin("1234");
    expect(await verifyBinderPin("1234", stored)).toBe(true);
  });
  it("rejects a wrong PIN", async () => {
    const stored = await hashBinderPin("1234");
    expect(await verifyBinderPin("0000", stored)).toBe(false);
  });
  it("uses a random salt (two hashes of same PIN differ)", async () => {
    const a = await hashBinderPin("1234");
    const b = await hashBinderPin("1234");
    expect(a).not.toBe(b);
  });
  it("stored format is iterations:salt:hash (three parts)", async () => {
    const stored = await hashBinderPin("1234");
    expect(stored.split(":").length).toBe(3);
  });
});
```

- [ ] **Step 2: Run, verify fail.** `bun run test server/__tests__/binder-pin.test.ts` → FAIL (module missing).

- [ ] **Step 3: Implement**

```typescript
// lib/binder-pin.ts
import { pbkdf2 as pbkdf2Cb, randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const pbkdf2 = promisify(pbkdf2Cb);
const ITERATIONS = 100_000;
const KEYLEN = 32;
const DIGEST = "sha256";

/** Returns "iterations:base64(salt):base64(hash)" so future iteration bumps can verify old hashes. */
export async function hashBinderPin(pin: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await pbkdf2(pin, salt, ITERATIONS, KEYLEN, DIGEST);
  return `${ITERATIONS}:${salt.toString("base64")}:${hash.toString("base64")}`;
}

export async function verifyBinderPin(pin: string, stored: string): Promise<boolean> {
  const parts = stored.split(":");
  // Support both "salt:hash" (legacy test shape) and "iterations:salt:hash"
  const [iterStr, saltB64, hashB64] =
    parts.length === 3 ? parts : ["100000", parts[0], parts[1]];
  if (!saltB64 || !hashB64) return false;
  const iterations = Number(iterStr) || ITERATIONS;
  const salt = Buffer.from(saltB64, "base64");
  const expected = Buffer.from(hashB64, "base64");
  const actual = await pbkdf2(pin, salt, iterations, KEYLEN, DIGEST);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
```

- [ ] Update the unit test: stored format is `iterations:salt:hash` (three parts). Keep timing-safe verify.

- [ ] **Step 4: Run, verify pass.** → PASS. Then `bun run typecheck`.

- [ ] **Step 5: Commit**

```bash
git add lib/binder-pin.ts server/__tests__/binder-pin.test.ts
git commit -m "feat(binder): salted pbkdf2 PIN hashing helper"
```

### Task 2.2: Binder CRUD server actions

**Files:**
- Create: `lib/binder-logic.ts` (pure — sync exports are illegal in `'use server'` files, so invariant math cannot live in `server/binder-actions.ts`)
- Create: `server/binder-actions.ts` (async actions only)
- Test: `server/__tests__/binder-logic.test.ts`

- [ ] **Step 1: Write the failing test** (pure invariant helpers)

```typescript
// server/__tests__/binder-logic.test.ts
import { describe, it, expect } from "bun:test";
import { placedExceedsOwned, groupByShelf } from "@/lib/binder-logic";

describe("binder invariants", () => {
  it("placedExceedsOwned true when placing more than owned", () => {
    // owned 2 of c1; already 2 placed elsewhere; trying to place 1 more
    expect(placedExceedsOwned({ owned: 2, placedElsewhere: 2, adding: 1 })).toBe(true);
  });
  it("placedExceedsOwned false when within owned", () => {
    expect(placedExceedsOwned({ owned: 3, placedElsewhere: 1, adding: 2 })).toBe(false);
  });
});

describe("groupByShelf", () => {
  it("buckets null shelf under General", () => {
    const grouped = groupByShelf([
      { collectibleId: "c1", quantity: 1, shelf: "nhl" },
      { collectibleId: "c2", quantity: 2, shelf: null },
    ]);
    expect(grouped["General"].length).toBe(1);
    expect(grouped["nhl"].length).toBe(1);
  });
});
```

- [ ] **Step 2: Run, verify fail.**

- [ ] **Step 3: Implement**
  - `lib/binder-logic.ts` (pure): `placedExceedsOwned({owned, placedElsewhere, adding})` → boolean; `groupByShelf(cards)` → `Record<string, BinderCard[]>` (null → `"General"`); `MAX_BINDERS_PER_USER = 20`.
  - `server/binder-actions.ts` (async only, imports the pure module):
    - `listBinders(): Promise<ActionResult<Binder[]>>` — `getAuthUserId()` gate, `prisma.binder.findMany({ where: { userId } })`.
    - `createBinder(input: { name: string; pin?: string; coverImage?: string })` — validate name non-empty (`ValidationError`); reject when the user already has `MAX_BINDERS_PER_USER` binders (`ValidationError`, one `count()` query — prevents unbounded rows); `pinHash = pin ? await hashBinderPin(pin) : null`; create.
    - `getBinderContents(binderId)` — ownership check (binder.userId === userId else `ForbiddenError`); load `cards` incl. collectible (name/image/rarity/team); return `{ binder, shelves: groupByShelf(cards) }`.
    - `renameBinder`, `deleteBinder` (block delete if it holds cards, or cascade-return them to loose — pick block-with-message for v1; **ponytail:** simplest safe default).
    - Use `ActionResult<T>`, typed errors, `revalidateTag` not needed server-side for RN clients (skip).

- [ ] **Step 4: Run, verify pass.** `bun run typecheck`.

- [ ] **Step 5: Commit** `feat(binder): binder CRUD actions + ownership/shelf helpers`.

### Task 2.3: Verify-PIN action (with attempt lockout)

**Files:**
- Modify: `server/binder-actions.ts`, `lib/binder-logic.ts`
- Test: add to `server/__tests__/binder-logic.test.ts`

PIN gating is UX-level (protects viewing a binder when someone else holds the unlocked phone); **ownership is the real security boundary** — the server returns contents only to the binder's owner regardless. Consequently there is **no signed grant/session token** (a prior draft had an HMAC-signed grant the server never enforced — security theater, cut in review). `verifyBinderPin` returns a plain boolean and the client gates the view. What the PIN *does* need is **attempt lockout**: a 4-digit PIN falls to 10k guesses if a session is hijacked. Document in API docs: **binder PIN ≠ wallet PIN** (salted PBKDF2 vs unsalted SHA-256).

- [ ] **Step 1: Failing test** — pure lockout math in `lib/binder-logic.ts`:

```typescript
import { isPinLockedOut, LOCKOUT_AFTER, LOCKOUT_MS } from "@/lib/binder-logic";
it("locks out after LOCKOUT_AFTER failures within the window", () => {
  const now = 100_000;
  expect(isPinLockedOut({ failedCount: LOCKOUT_AFTER, lastFailedAt: now - 1_000 }, now)).toBe(true);
  expect(isPinLockedOut({ failedCount: LOCKOUT_AFTER - 1, lastFailedAt: now - 1_000 }, now)).toBe(false);
  expect(isPinLockedOut({ failedCount: LOCKOUT_AFTER, lastFailedAt: now - LOCKOUT_MS - 1 }, now)).toBe(false); // window expired
});
```

- [ ] **Step 2: Run, verify fail.**
- [ ] **Step 3: Implement**
  - `lib/binder-logic.ts`: `LOCKOUT_AFTER = 5`, `LOCKOUT_MS = 30_000`, `isPinLockedOut({failedCount, lastFailedAt}, now)`.
  - Schema fields already landed in **Task 2.0** — do not re-migrate.
  - `server/binder-actions.ts` `verifyPin(binderId, pin)` action: load binder (ownership check, `ForbiddenError` otherwise); if locked out per `isPinLockedOut` → `ConflictError("Too many attempts — try again in 30s")`; if `pinHash` null → `{ granted: true }`; else check via `lib/binder-pin.verifyBinderPin`. On failure increment `pinFailedCount`/set `pinLastFailedAt`; on success reset both. Return `{ granted: boolean }` — nothing more.
- [ ] **Step 4: Run, verify pass.**
- [ ] **Step 5: Commit** `feat(binder): PIN verification with attempt lockout`.

### Task 2.4: Transfer-rate-limit guard (Q1 — implemented, shipped OFF)

**Files:**
- Create: `lib/transfer-rate-limit.ts`
- Test: `server/__tests__/transfer-rate-limit.test.ts`

- [ ] **Step 1: Failing test**

```typescript
// server/__tests__/transfer-rate-limit.test.ts
import { describe, it, expect } from "bun:test";
import { isRateLimited } from "@/lib/transfer-rate-limit";

describe("transfer rate limit", () => {
  const cfg = { enabled: false, perHour: 10 };
  it("never limits when disabled", () => {
    expect(isRateLimited({ ...cfg }, 9999)).toBe(false);
  });
  it("limits when enabled and over the cap", () => {
    expect(isRateLimited({ enabled: true, perHour: 10 }, 10)).toBe(true);
    expect(isRateLimited({ enabled: true, perHour: 10 }, 9)).toBe(false);
  });
});
```

- [ ] **Step 2: Run, verify fail.**
- [ ] **Step 3: Implement** `lib/transfer-rate-limit.ts`:
  - `getConfig()` reads `TRANSFER_RATELIMIT_ENABLED` (default `false`) and `TRANSFER_RATELIMIT_PER_HOUR` (default `20`) from env.
  - `isRateLimited(cfg, countInWindow)` → `cfg.enabled && countInWindow >= cfg.perHour`.
  - **The switch must actually work when flicked (Q1 requirement — review fix):** `transferCard` (Task 2.5) always inserts a `BinderTransferLog { userId }` row (table added in Task 0.4) and, when `cfg.enabled`, counts the user's rows in the last hour (`prisma.binderTransferLog.count({ where: { userId, createdAt: { gte: hourAgo } } })`) before allowing the transfer. While disabled, skip the count query (one cheap insert is the only cost). Flipping `TRANSFER_RATELIMIT_ENABLED=true` is then a real switch — no code change, no backfill needed.
- [ ] **Step 4: Run, verify pass.**
- [ ] **Step 5: Commit** `feat(binder): transfer rate-limit guard (shipped disabled, Q1)`.

### Task 2.5: Transfer-card action (quantity move)

**Files:**
- Modify: `server/binder-actions.ts`, `lib/binder-logic.ts`
- Test: add pure-helper test to `binder-logic.test.ts`

- [ ] **Step 1: Failing test** — pure `computeTransfer({ fromQty, toQty, amount })` (in `lib/binder-logic.ts`) returns new `{ from, to }` or throws when `amount > fromQty`.

```typescript
import { computeTransfer } from "@/lib/binder-logic";
it("moves quantity between binders", () => {
  expect(computeTransfer({ fromQty: 3, toQty: 1, amount: 2 })).toEqual({ from: 1, to: 3 });
});
it("throws when moving more than present", () => {
  expect(() => computeTransfer({ fromQty: 1, toQty: 0, amount: 2 })).toThrow();
});
```

- [ ] **Step 2: Run, verify fail.**
- [ ] **Step 3: Implement** `transferCard(input: { collectibleId; fromBinderId; toBinderId; amount?: number })`:
  - Auth + ownership of BOTH binders (`ForbiddenError` if either isn't the user's).
  - Rate-limit gate (per Task 2.4): if `getConfig().enabled`, count the user's `BinderTransferLog` rows in the last hour; `isRateLimited(cfg, count)` → throw `ConflictError("Transfer rate limit reached")`.
  - In one `prisma.$transaction`:
    - **`FOR UPDATE`** on the user's `UserCollectible` row for `collectibleId` and on relevant `BinderCard` rows (from/to) before computing quantities (C2 / Task 2.5a).
    - Re-check `placedExceedsOwned` / transfer math against locked rows.
    - `computeTransfer`; decrement/delete `from` (delete row if new qty 0); upsert `to` BinderCard incrementing quantity (shelf resolved from collectible team/league); insert a `BinderTransferLog { userId }` row (always — this is what makes the switch live).
  - Return updated both-binder state.

#### Task 2.5a — Concurrent invariant stress test

- [ ] Parallel open-landing + transfer (or two transfers) must not oversubscribe placed vs owned. Add an integration/stress test that fails without `FOR UPDATE` and passes with it. DB trigger = stretch goal, not launch blocker.
- [ ] **Step 4: Run, verify pass.** `bun run typecheck`.
- [ ] **Step 5: Commit** `feat(binder): transfer cards between binders (quantity move + row locks)`.

### Task 2.6: Binder API routes

**Files:**
- Create: `app/api/binders/route.ts` (GET list, POST create)
- Create: `app/api/binders/[id]/route.ts` (GET contents, PATCH rename, DELETE)
- Create: `app/api/binders/[id]/verify-pin/route.ts` (POST)
- Create: `app/api/binders/[id]/transfer-card/route.ts` (POST)

- [ ] **Step 1–4 (per route):** thin wrappers mirroring existing route style (e.g. `app/api/packs/[id]/open/route.ts`): parse body, call the matching `binder-actions` function, map `ActionResult` → `apiSuccess`/`apiError` with codes (`FORBIDDEN`→**403**, `NOT_FOUND`→404, `VALIDATION_ERROR`→400, `CONFLICT`→**409**, sold-out/open errors consistently). No new business logic. Verify each with a quick `curl`/REST check against `bun dev` (documented per route).
- [ ] **Step 5: Commit** `feat(api): binder REST routes`.

### Task 2.7: Extend pack open to land cards in a binder

**Files:**
- Modify: `server/minting-actions.ts` (`openPack` signature :354, the tx :465-561)
- Modify: `app/api/packs/[id]/open/route.ts` (pass `binderId` from body)
- Test: `server/__tests__/finite-mint.test.ts` (extend) or a new `open-binder-landing.test.ts` for the pure landing helper

- [ ] **Step 1: Failing test** — pure `resolveShelf(collectible)` returns team/league key or null→"General"; and a `buildBinderLandings(cards, binderId)` returns upsert instructions grouping duplicates into quantities. Both live in **`lib/pack-open-logic.ts`** (new — sync exports can't come from `'use server'` files; `server/minting-actions.ts` imports them).

```typescript
import { resolveShelf, buildBinderLandings } from "@/lib/pack-open-logic";
it("groups duplicate pulls into one binder entry with quantity", () => {
  const cards = [{ id: "c1", team: { slug: "hc-sierre" } }, { id: "c1", team: { slug: "hc-sierre" } }];
  const landings = buildBinderLandings(cards as any, "b1");
  expect(landings).toEqual([{ binderId: "b1", collectibleId: "c1", quantity: 2, shelf: "hc-sierre" }]);
});
```

- [ ] **Step 2: Run, verify fail.**
- [ ] **Step 3: Implement:**
  - Change signature to `openPack(purchaseId: string, expectedPackId?: string, binderId?: string)`.
  - In the open route, read `binderId` from the POST body and pass it through.
  - Resolve landing binder as `binderId ?? purchase.targetBinderId` (Open Later fallback).
  - If a binder id is present: validate ownership (`ForbiddenError`) BEFORE the draw. After minting inside the existing `$transaction`, **`FOR UPDATE`** ownership invariant then upsert `BinderCard` via `buildBinderLandings`. If no binder id, cards stay loose in `UserCollectible` (wallet inventory).
  - Schema for `targetBinderId` / lockout already in **Task 2.0** — do not duplicate migration here.
- [ ] **Step 4: Run, verify pass.** Full suite `bun run test` + `bun run typecheck` + `bun run lint`.
- [ ] **Step 5: Commit** `feat(open): land opened cards into chosen binder`.

### Task 2.7a: Dual Open Later write paths (D-O / C3)

Live checkout is `POST /api/checkout/dsports-cash` (`d-sports-api/app/api/checkout/dsports-cash/route.ts`) — **no `targetBinderId` today**. Plan must name both persist APIs.

1. **Checkout write:** Extend `POST /api/checkout/dsports-cash` (and crypto pack checkout if applicable) to accept optional `targetBinderId` and/or per-line binder ids; validate binder ownership inside the purchase-create transaction; set `PackPurchase.targetBinderId`.
2. **Post-purchase write:** Add `PATCH /api/user/packs/{purchaseId}` (or equivalent) to set/clear `targetBinderId` for the post-purchase modal path; ownership + unopened purchase only.
3. Native (Phase 3C.5): cart can pass binder at checkout; post-success modal can PATCH then Open Now / Open Later.
4. Tests: both write paths persist; `openPack` without body `binderId` uses purchase target.

- [ ] Commit `feat(checkout): dual targetBinderId write paths for Open Later`.

### Task 2.8: API integration test — open → land → transfer

- [ ] Automated test covering: purchase (or fixture) → open with binder → cards land → transfer between binders; plus a parallel-open race case where feasible.
- [ ] Commit `test(binder): open-land-transfer integration`.

**Phase 2 checkpoint:** `bun run test && bun run typecheck && bun run lint` green. Manually exercise the binder routes against `bun dev`. PR `feat/pack-market-phase2` from updated `main`. **Do not start Phase 3C until C2 (2.5a) and C3 (2.7a) land.**

---

# PHASE 3 — Native app: admin, opening animation, binder UI (d-sports-engage-native)

*Three independently shippable slices (3A/3B/3C), each its own PR. Branch each from **updated `main`**: `feat/pack-market-native-*`. Native has no test harness for UI by default — each slice ends with a manual E2E verification via the `/run` skill instead of unit tests, except pure helpers (rarity mapping, allocation preview) which get `bun test`-style specs if a test runner is configured; otherwise assert via a scratch `demo()`.*

**Pre-flight (once, before 3A/3B):** add missing deps.

- [ ] Install: `npx expo install expo-video expo-document-picker`
  - `expo-video` — pack-opening video (no video lib exists today).
  - `expo-document-picker` — admin GLB/video file picking (`expo-image-picker` exists but is images-only).
  - `expo-haptics`, `react-native-gesture-handler`, `react-native-reanimated` already installed — no action.
- [ ] Commit `chore(native): add expo-video + expo-document-picker`.

### Slice 3A — In-app admin (pack management only, D6)

**Admin gate reality (from native audit):** the app does NOT read Clerk claims for roles. `context/user-context.tsx` already exposes `user.role` (from the backend profile, `apiProfile.roles?.[0]?.role ?? "user"`). The client gate is UX only — every `/api/admin/*` route re-checks `canManageTeam` server-side (the real boundary). So no new role endpoint is needed.

#### Task 3A.0 — Spike signed-URL round-trip on device (M9)

- [ ] Before building the full create form, prove on a real device/simulator: pick GLB → mint signed URL → PUT to Supabase → **confirm-upload** → public URL loads. Split large admin PRs; pin `lib/mint-allocation.ts` parity with API.
- [ ] Commit `chore(native-admin): signed-URL upload spike` (or fold notes into 3A.4e if spike is a short spike branch).

- [ ] **Task 3A.1 — `hooks/use-admin-role.ts`**
  - Create a hook returning `{ isAdmin, isAdminLoading }` derived from `useUser().user.role`. Admin set = `["admin","superadmin","dev","staff"]` — a subset of `lib/badge-utils.ts` staff roles; `moderator` is deliberately excluded (moderators don't author packs). No network call. (Server-side `canManageTeam` remains the real gate on every `/api/admin/*` route; this hook is UX only.)
  - Verify: log the value on the profile screen for an admin vs non-admin account.
  - Commit `feat(native-admin): useAdminRole from profile role`.

- [ ] **Task 3A.2 — `app/(admin)/_layout.tsx` + route registration**
  - Create `app/(admin)/_layout.tsx` as a `<Stack>`; inside, redirect to `/(tabs)` if `!isAdmin && !isAdminLoading` (use `<Redirect>` from expo-router).
  - Register the group in root `app/_layout.tsx` with `<Stack.Screen name="(admin)" />`.
  - Entry point: add an "Admin" row in settings (gated by `isAdmin`) that routes to `/(admin)/packs`.
  - Verify: admin sees the route; non-admin is bounced. `/run` skill.
  - Commit `feat(native-admin): (admin) route group with role gate`.

- [ ] **Task 3A.3 — `app/(admin)/packs/index.tsx` (pack list)**
  - New `lib/api/admin-api.ts` module (register in `lib/api/index.ts` `useApi()`): `listPacks()` → `GET /api/admin/packs`, `createPack(body)`, `updatePack(id, body)`, `uploadModel(teamId, file)` → `POST /api/admin/packs/upload-model`, `uploadVideo(teamId, file, durationMs)` → `POST /api/admin/packs/upload-video`, `uploadImage(...)`.
  - Screen lists packs (name, status, mintMode, sold/quantity) with edit/create buttons.
  - Verify: list renders real packs. `/run`.
  - Commit `feat(native-admin): pack list screen + admin-api module`.

- [ ] **Task 3A.4 — `app/(admin)/packs/create.tsx` (create/edit form)** — the biggest native admin task; build incrementally, verifying each block:
  - **3A.4a** Details: name, description, `packSize` (THREE/FIVE/SEVEN segmented control → maps to `maxReveal`).
  - **3A.4b** Card-pool multi-select: searchable list from `GET /api/admin/collectibles`, show rarity per card, running tally ("25 selected: 12 C, 8 R, 4 E, 1 L").
  - **3A.4c** Odds config: per-tier weight/percentage inputs; live drop-rate preview calling the same math as backend `computePackOdds` (port the pure fn or fetch `GET /api/packs/{id}/odds` after save).
  - **3A.4d** Mint-mode toggle: `ODDS_ONLY | FINITE`. When FINITE: `totalMintCount` input + `guaranteeMinRarity` picker + **live allocation preview** (copies-per-card per tier) and the divisibility warning ("Total 301 won't divide evenly — adjust to 300 or 304"). The math is Phase 0's `lib/mint-allocation.ts` — a dependency-free pure module precisely so it can be copied verbatim into the native repo (`lib/mint-allocation.ts` there too; keep the files identical; sharing a package is over-engineering for one file).
  - **3A.4e** Asset upload (two-step signed-URL flow + **confirm**, matching Phase 1 / Task 1.3): pick file with `expo-document-picker` (GLB filtered to `.glb`/`model/gltf-binary`; video mp4/webm) → read the first 8 bytes (GLB) / duration via a hidden `expo-video` load (video) → `POST upload-model`/`upload-video` with the metadata to mint the signed URL → PUT the file **directly to Supabase** (`uploadToSignedUrl`) → **`POST confirm-upload`** → save the returned `publicUrl` (+ `durationMs`, `whiteFlashMs` input) onto the pack. Files never pass through the Next.js backend (Vercel 4.5MB body cap). This is the native counterpart to your proven script workflow (Q2).
  - **3A.4f** Review & publish: summary + confirm → `createPack`/`updatePack`. Draft supported via existing `Pack.status`.
  - Verify each block via `/run`; final E2E: create a FINITE pack end-to-end, confirm `MintInstance` rows appear (check via `bunx prisma studio` on the backend).
  - Commit per block (`feat(native-admin): pack create — details / pool / odds / mint / assets / publish`).

### Slice 3B — Opening animation (port the `Pack-opening` look, D3)

Port the *visual sequence* of the `Pack-opening` prototype (video → white-flash → orbit → swipeable stack → rarity FX) into native. The prototype's vanilla-DOM/CSS/Web-Animations code is a **reference, not portable code** — rebuild with RN primitives. Extend the live opener (`components/wallet/PackOpeningModal.tsx`, which already calls `useCollectibles().openPack`), not the presentational `PackOpeningView.tsx`.

- [ ] **Task 3B.0 — Standardize rarity to 5 tiers (prerequisite, flagged by audit).** Today two systems disagree: `lib/rarity-utils.ts` (6-tier) vs `types/shop.types.ts` + `collectibles-context.tsx` `mapRarity` which **collapses mythic→Legendary, uncommon→Common**. The backend `Rarity` enum is `COMMON/RARE/EPIC/LEGENDARY/MYTHIC`. Fix `mapRarity` (and `Collectible.rarity` type) to preserve all 5 tiers so pack FX and binder display match backend truth. Pure function → add a `demo()` assert. Verify wallet still renders. Commit `fix(native): preserve 5 rarity tiers end-to-end`.
- [ ] **Task 3B.1 — Video stage.** New `components/pack-opening/PackRevealVideo.tsx`: `expo-video` player fed the pack's `videoUrl`; fire an `onWhiteFlash` callback at `whiteFlashMs` and `onEnd` at `videoDurationMs` (both from pack metadata, NOT constants — the prototype's 7.733s was one asset).
  - **expo-video gotcha (verified against current docs):** `timeUpdate` events are OFF by default — `player.timeUpdateEventInterval` is `0` unless set. In the `useVideoPlayer` setup callback set `player.timeUpdateEventInterval = 0.05`, then `player.addListener('timeUpdate', ({ currentTime }) => ...)` and fire the flash when `currentTime * 1000 >= whiteFlashMs` (once; guard with a ref). Remove the subscription on unmount.
  - **Wall-clock fallback (keep the prototype's one good trick):** also arm a `setTimeout(fire, whiteFlashMs + 350)` from playback start — if the video stalls/buffers past the cue, the flash still fires and the reveal never hangs. First of the two wins.
  - Verify with a real pack video. Commit.
- [ ] **Task 3B.2 — Reveal stage.** New `components/pack-opening/PackRevealStack.tsx`: after white flash, cards animate in a ring (radius scaled by `packSize`: 3=small/5=med/7=full) → collapse to a stack → swipeable/flingable via `react-native-gesture-handler` (+ `react-native-reanimated` for 60fps; the existing components use legacy `Animated` — Reanimated is installed and better here). One-card-at-a-time reveal, "next"/"add to collection" like the current `PackOpeningModal`. Commit.
- [ ] **Task 3B.3 — Rarity FX + haptics.** Per-tier particle/beam/glow intensity driven by `getRarityColors` (5-tier after 3B.0): common=subtle, rare=blue+particles, epic=flare, legendary=gold beam+burst, mythic=max. Haptics via `expo-haptics` scaled by tier (`ImpactFeedbackStyle.Light`→`Heavy` + `notificationAsync` for legendary/mythic). Commit.
- [ ] **Task 3B.4 — Wire into `PackOpeningModal`.** Replace its reveal internals with the new video→flash→stack sequence, preserving its existing `openPack` call + `onFinish(cards)` contract so callers (wallet screen) don't change. Post-open 3D detail keeps using the existing GLB viewer (`WebGlbViewer.web` / `NativeGlbViewer.filament`) — no in-reveal 3D (matches spec). 
- [ ] **Task 3B.5 — Public "Preview opening" simulation (D-P — demo-biased).** Anyone browsing the shop can see a **demo** of the opening experience — disclosure + marketing, not a claim of production RNG.
  - **Fix the odds source first:** live shop odds UI is `components/shop/CollectibleDetailModal.tsx` (not orphaned `PackDetailModal.tsx`). Replace hardcoded rates with real odds from `GET /api/packs/{id}/odds`. Hardcoded rates on a public odds surface is a disclosure bug.
  - Add a "Preview opening" button in `CollectibleDetailModal` → runs the 3B reveal sequence with a **demo-biased** simulator (`lib/simulate-pull.ts`): may force a showcase high-rarity card; uses a **different** RNG path from real opens; **must not** claim “same RNG as real opens.”
  - Watermark: **"SIMULATION — demo odds / not a real open"** (overlay during reveal + on results). No purchase, no API mutation, no binder landing.
  - Keep sim draw logic in `lib/simulate-pull.ts` so web `pack-testing.tsx` can share the same demo math if desired.
- [ ] **E2E:** open a real 3/5/7 pack on device, confirm timing + per-tier FX; run a preview sim from the shop without purchasing. `/run`. Commit `feat(native): new pack-opening reveal (video/flash/orbit/FX) + demo-biased pack preview`.

### Slice 3C — Digital Binder UI (D4) — coexist with wallet BinderScreen

#### Task 3C.0 — Coexist + dual-PIN disclosure (D-B / M5)

Wallet already has PIN-gated `components/wallet/BinderScreen.tsx` (inventory viewer; wallet PIN = unsalted SHA-256). Digital Binder is a separate server feature (salted PBKDF2).

- [ ] Keep `BinderScreen` as-is. Do **not** replace it with `app/binder/**`.
- [ ] Nav/copy differentiation: wallet surface → “Inventory” / “Wallet binder”; new routes → “Digital Binders” / “My binders.”
- [ ] First-run + PIN-set UI copy on Digital Binder: **“This PIN is separate from your Wallet PIN.”**
- [ ] One-line note in binder API docs / OpenAPI narrative: binder PIN ≠ wallet PIN (different hash schemes).
- [ ] Commit `feat(native-binder): coexist copy + dual-PIN disclosure` before building full binder screens.

- [ ] **Task 3C.1 — `lib/api/binder-api.ts`** — client for Phase 2 routes (`listBinders`, `createBinder`, `getBinder`, `verifyPin`, `transferCard`, `patchPurchaseTargetBinder`), registered in `useApi()`. Commit.
- [ ] **Task 3C.2 — Binder home `app/binder/index.tsx`** — swipeable cover carousel of the user's **Digital** binders; "create binder" affordance. Register `app/binder/_layout.tsx` in root. Commit.
- [ ] **Task 3C.3 — PIN entry `app/binder/[binderId].tsx`** — if the binder has a PIN, show a PIN pad → `verifyPin`; on grant, render interior. Show dual-PIN reminder on first set. Interior groups cards by `shelf`. Commit.
- [ ] **Task 3C.4 — New-card highlight** — after an open lands cards, pulse/glow the new cards for ~3s and show a "New from Pack" badge (state passed from the opening flow). Commit.
- [ ] **Task 3C.5 — Binder-selection modal (checkout + post-purchase)** — hook into `hooks/use-shop-screen.ts` `handleCheckout`. Support **both** D-O paths:
  - Optional binder id on `api.checkout.dsportsCash` body at purchase time.
  - Post-success modal: pick binder / create inline / "Open Now" vs "Open Later" → `PATCH` purchase `targetBinderId` then dismiss or open.
  - Raw RN `<Modal>` matches existing patterns.
  - **Thread `binderId` through all three layers (arg order matters — audit caught a swap):**
    1. Client `lib/api/collectibles-api.ts` `openPack(purchaseId, packId?, binderId?)` — add `binderId` to the POST body `{ purchaseId, packId, binderId }`.
    2. Context hook `context/collectibles-context.tsx` `openPack(packId, purchaseId?, binderId?)` — note the hook's arg order is `(packId, purchaseId, …)`, the REVERSE of the client fn; add `binderId` as a 3rd param and pass through.
    3. Call site: `openPack(packId, purchaseId, binderId)` (hook order), NOT `(purchaseId, packId, binderId)`.
  - Commit.
- [ ] **E2E:** buy pack → binder-select modal → Open Now → reveal → cards land in the chosen binder on the correct shelves → transfer a card between two binders. `/run`. Commit.

**Phase 3 checkpoint:** full purchase→open→land→transfer loop works on device; admin can author a pack (incl. FINITE + GLB/video upload) from inside the app. Three PRs merged. **Do not ship preview without D-P labeling. Do not start 3C feature screens until 3C.0 + Phase 2 C2/C3 land.**

---

# PHASE 4 — Rust parity backlog & polish (d-sports-backend)

*Non-blocking; keeps the fallback coherent (D1). The native app reaches these features through the Rust legacy shim's proxy to `d-sports-api`, so the goal here is: (a) the shim doesn't 503 on any new route, (b) the gap is documented so the eventual native port isn't a surprise.*

### Task 4.1: Document the new surface in PARITY_GAPS

**Files:** Modify `d-sports-backend/docs/parity/plans/PARITY_GAPS.md`

- [ ] Append a "Pack Opening × Market" section listing every new endpoint (`GET/POST /api/binders`, `GET/PATCH/DELETE /api/binders/{id}`, `POST /api/binders/{id}/verify-pin`, `POST /api/binders/{id}/transfer-card`, `POST /api/admin/packs/upload-video`, `POST /api/admin/packs/upload-model`, `POST /api/admin/packs/confirm-upload`, `PATCH /api/user/packs/{purchaseId}`, extended checkout with `targetBinderId`, extended `POST /api/packs/{id}/open` with `binderId`) and every new model (`Binder`, `BinderCard`, `MintInstance`, `PackDrawAudit`, `Pack` new fields, `PackPurchase.targetBinderId`). Mark all as "TS-only, Rust-pending." Note binder PIN ≠ wallet PIN in the narrative.
- [ ] Commit `docs(parity): record pack/binder surface as Rust-pending`.

### Task 4.2: Ensure the legacy shim proxies the new routes (explicit allowlist — confirmed)

**Files:** `d-sports-backend/crates/engage/src/legacy_compat/routes.rs`, `handlers/packs.rs`, `handlers/commerce.rs`; test `crates/engage/tests/legacy_compat_contract.rs`

Codebase reality: the shim registers **explicit** routes in `legacy_compat/routes.rs` — **not** a `/api/*` catch-all. Execute the explicit-route branch.

- [ ] **Step 1:** Add explicit entries for `/api/binders/**`, upload-model, upload-video, **confirm-upload**, and purchase PATCH if proxied.
- [ ] **Step 2:** Contract tests asserting each new path forwards to `LEGACY__API_BASE_URL` (not 404/503) when configured.
- [ ] **Step 3:** Run `cargo test -p engage` → PASS.
- [ ] **Step 4:** Commit `feat(shim): proxy pack/binder/upload routes to legacy backend`.
- [ ] **Merge-block:** Do not roll Phase 3 to any environment that still hits the Rust shim until 4.2 is green.

### Task 4.3: Native implementation — explicitly deferred to ADR-0001

- [ ] Add a one-paragraph note in `PARITY_GAPS.md`: when `crates/collectibles`/`marketplace` leave stub status (separate effort), port the Phase 0 Prisma schema 1:1 to Diesel and implement the draw per **ADR-0001** (`docs/proposals/onchain-gacha-architecture.md`: drand quicknet beacon + commit-reveal, SHA-256 drawing-pool anchor, pull-to-mint finite supply). The TS `PackDrawAudit.oddsTableHash` we write in Phase 0 is the forward-compatible seam. **Out of scope for this feature** — no Rust draw code is written now. Commit `docs(parity): link Rust gacha to ADR-0001`.

**Phase 4 checkpoint:** parity docs updated; shim contract test green. No user-facing change.

---

## Sequencing summary

```
0.1–0.4 → 0.5a/b/c → 0.6a/b → 0.7a
     ↓  (merge to main)
1.1–1.2 → 1.3 confirm-upload          } from updated main (parallel OK)
2.0 migration → … → 2.5a → 2.7a → 2.8 } from updated main (parallel OK)
4.2 shim explicit routes (from updated main once routes exist; block shim envs)
3A.0 spike → 3A.* | 3B.* | 3C.0 (dual-PIN copy) → 3C.*   } from updated main
```

```
Phase 0 (backend foundations) ──┬── Phase 1 (admin upload + confirm) ──┐
                                └── Phase 2 (binder API + Open Later) ─┤
                                                                        ├── Phase 3A (needs 0,1)
                                                                        ├── Phase 3B (needs 0)
                                                                        └── Phase 3C (needs 0,2 + 3C.0)
                                                                                    │
                                                          Phase 4 (parity/shim) ────┘  (merge-block shim envs)
```

Phases 0–2 are backend, independently mergeable **from updated `main`**. Phase 1 ‖ Phase 2 (parallel after 0). Phase 3 is the user-facing integration. Phase 4 shim work is merge-blocking for Phase 3 on shim environments.

## Docs / compliance checklist (closed-economy floor)

- [ ] Replace any remaining “compliance-grade draw” language with **tamper-evident server CSPRNG + append-only audit**.
- [ ] Apple App Store **3.1.1** odds-before-purchase verification on shop surfaces (`CollectibleDetailModal`).
- [ ] FINITE depleting-odds disclosure in public odds copy.
- [ ] PIN UX-only note + **binder PIN ≠ wallet PIN** in API docs.
- [ ] Counsel checklist (Mode A closed vs Mode B open) tracked outside engineering — not a Phase 0 coding gate.
- [ ] Demo preview never claims same RNG as production (D-P).

## Deferred / explicitly out of scope

- Full admin port to native (only pack management ships in-app; rest stays on `api.d-sports.org/admin` — spec §4.3, D6).
- drand/on-chain provably-fair draw (ADR-0001) — CSPRNG + audit log now; on-chain later (Q4).
- Server-side video duration extraction (ffprobe) — client supplies `durationMs` (Phase 1 Task 1.2).
- Transfer rate-limiting ships OFF, but the switch is fully wired (`BinderTransferLog` + env flag — Q1).
- `@gorhom/bottom-sheet` — not added; raw RN `<Modal>` matches existing patterns.
- HMAC-signed binder PIN grant — **cut in review** (server never enforced it = theater); `verify-pin` returns a boolean + attempt lockout instead.
- Integer-weight RNG walk (`randomInt(totalWeight)` instead of 48-bit float) — considered, skipped: diff noise for marginal audit gain; `secureRandomFloat` over Int weights is fine. Revisit only if an auditor asks.
- Production CSPRNG in client-side simulations (`pack-testing.tsx`, native pack preview) — deliberately demo RNG; sims award nothing. Only server draws use `lib/secure-random`.
- Replacing wallet `BinderScreen` with Digital Binder — **out of scope**; coexist (D-B).
- DB trigger for binder quantity invariant — stretch goal; `FOR UPDATE` is the launch bar (C2).
