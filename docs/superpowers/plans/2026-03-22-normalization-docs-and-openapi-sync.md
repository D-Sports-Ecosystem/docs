# Data normalization docs and OpenAPI sync implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align the docs site with the final normalization state (Phase 1 -> Phase 2 batches A/B/C/D -> Phase 2B/2C -> app `1.10.10`) and keep OpenAPI synced from `d-sports-api` as source of truth.

**Architecture:** Treat `../d-sports-api/openapi.json` as canonical API contract, sync it into docs, then update Mintlify fundamentals/domain/repository pages to describe the final strict envelope behavior and exceptions. Add an explicit coverage audit artifact so missing OpenAPI paths are intentional and documented, not accidental drift.

**Tech Stack:** Mintlify (`docs.json`, MDX), Bun scripts, OpenAPI 3.1 JSON, Next.js API routes (`d-sports-api`), Expo native client (`d-sports-engage-native`).

---

## File structure and responsibility map

- `d-sports-api/openapi.json`
  Canonical route contract used by generated API reference pages.
- `docs/api-reference/openapi.json`
  Synced copy consumed by Mintlify endpoint generation.
- `docs/api-reference/introduction.mdx`
  Entry page for API architecture and how to use generated endpoint docs.
- `docs/api-reference/errors-and-status-codes.mdx`
  Canonical semantics for status code and `code`-field handling.
- `docs/api-reference/authentication.mdx`
  Auth contract + protected/public expectations.
- `docs/api-reference/domains/*.mdx`
  Domain-level endpoint maps and migration-specific caveats.
- `docs/repositories/d-sports-api.mdx`
  Backend/PWA lifecycle notes and normalization rollout summary.
- `docs/repositories/d-sports-engage-native.mdx`
  Native contract behavior aligned with strict envelope mode (`1.10.10`).
- `docs/docs.json`
  Navigation updates for any newly added normalization contract/history page.
- `docs/.mintlify/workflows/api-docs-sync.md`
  Workflow rules for future updates after merges.
- `docs/docs/superpowers/artifacts/2026-03-22-openapi-route-audit.md` (new)
  Route coverage decision log for every API route not present in OpenAPI.
- `docs/scripts/audit-openapi-coverage.ts` (new, optional but recommended)
  Repeatable route-vs-spec audit script.

### Task 1: Capture route/spec baseline and classify coverage deltas

**Files:**
- Create: `docs/superpowers/artifacts/2026-03-22-openapi-route-audit.md`
- Modify: none
- Test: run shell audit command from docs repo root

- [ ] **Step 1: Generate route-vs-openapi inventory**

Run:
```bash
powershell -NoProfile -Command "$apiRoot='..\\d-sports-api'; $routes=Get-ChildItem -Path \"$apiRoot\\app\\api\" -Recurse -Filter route.ts | % { $_.FullName.Substring((Resolve-Path \"$apiRoot\\app\").Path.Length+1).Replace('\\','/') } | % { $_ -replace '^api/','/api/' -replace '/route\\.ts$','' -replace '\\[(\\.\\.\\.)?([^\\]]+)\\]','{$2}' }; $openapi=(Get-Content \"$apiRoot\\openapi.json\" -Raw | ConvertFrom-Json).paths.PSObject.Properties.Name; $routes | Sort-Object -Unique | ? { $openapi -notcontains $_ }"
```
Expected: list of paths missing from OpenAPI.

- [ ] **Step 2: Classify each missing path**

In `docs/superpowers/artifacts/2026-03-22-openapi-route-audit.md`, classify each route as:
- `public-and-should-document`
- `internal/admin/not-in-public-reference`
- `test/debug/operational`
- `non-json/stream/binary exception`

- [ ] **Step 3: Define action per route**

For each `public-and-should-document` route, add “OpenAPI add/update required” with owning repo file path.

- [ ] **Step 4: Commit baseline artifact**

```bash
git add docs/superpowers/artifacts/2026-03-22-openapi-route-audit.md
git commit -m "docs: add openapi route coverage audit baseline"
```

### Task 2: Update canonical OpenAPI and sync into docs

**Files:**
- Modify: `../d-sports-api/openapi.json` (only where Task 1 marked required)
- Modify (synced): `api-reference/openapi.json`
- Test: OpenAPI validation + hash parity check

- [ ] **Step 1: Patch canonical OpenAPI in API repo**

Update `../d-sports-api/openapi.json` for any public missing routes and any route contract changes introduced by Phase 2/2B/2C and app `1.10.10`.

- [ ] **Step 2: Validate canonical OpenAPI**

Run in `../d-sports-api`:
```bash
bun run openapi:validate
```
Expected: spec validates successfully.

- [ ] **Step 3: Sync spec into docs repo**

Run in docs repo:
```bash
bun run sync-openapi
```
Expected: `api-reference/openapi.json` updated from `../d-sports-api/openapi.json`.

- [ ] **Step 4: Verify file parity**

Run:
```bash
powershell -NoProfile -Command "(Get-FileHash api-reference/openapi.json).Hash; (Get-FileHash ..\\d-sports-api\\openapi.json).Hash"
```
Expected: both hashes are identical.

- [ ] **Step 5: Commit synced spec**

```bash
git add api-reference/openapi.json
git commit -m "docs: sync openapi from d-sports-api source of truth"
```

### Task 3: Update API fundamentals for final normalization contract

**Files:**
- Modify: `api-reference/introduction.mdx`
- Modify: `api-reference/errors-and-status-codes.mdx`
- Modify: `api-reference/authentication.mdx`
- Create: `api-reference/normalization-contract-and-rollout.mdx`
- Modify: `docs.json` (add new page in API Fundamentals)
- Test: local content/link checks

- [ ] **Step 1: Add normalization contract page**

Create `api-reference/normalization-contract-and-rollout.mdx` covering:
- rollout timeline: Phase 1 -> Phase 2 A/B/C/D -> Phase 2B/2C -> app `1.10.10`
- standard envelope:
```json
{ "success": true, "data": {} }
{ "success": false, "error": "message", "code": "MACHINE_CODE" }
```
- strict native behavior (`INVALID_RESPONSE_ENVELOPE` on non-envelope `2xx`)
- known exceptions (SSE/binary passthrough routes).

- [ ] **Step 2: Update fundamentals pages to link/use new contract**

Update the three fundamentals pages so they explicitly reference the final envelope and machine-readable `code` semantics.

- [ ] **Step 3: Add page to navigation**

Insert `api-reference/normalization-contract-and-rollout` in `docs.json` under API Fundamentals.

- [ ] **Step 4: Commit fundamentals update**

```bash
git add api-reference/introduction.mdx api-reference/errors-and-status-codes.mdx api-reference/authentication.mdx api-reference/normalization-contract-and-rollout.mdx docs.json
git commit -m "docs: publish normalization contract and rollout reference"
```

### Task 4: Refresh domain guides for phase-2-complete behavior

**Files:**
- Modify: `api-reference/domains/auth-onboarding.mdx`
- Modify: `api-reference/domains/social-locker-room.mdx`
- Modify: `api-reference/domains/gamification.mdx`
- Modify: `api-reference/domains/commerce.mdx`
- Modify: `api-reference/domains/collectibles.mdx`
- Modify: `api-reference/domains/wallet-web3.mdx`
- Modify: `api-reference/domains/moderation.mdx`
- Modify: `api-reference/domains/platform-infra.mdx`
- Test: MDX lint by `mint validate`

- [ ] **Step 1: Update endpoint caveats by domain**

For each domain page, add current contract notes tied to completed batches (for example async checkout verification, quest payload compatibility notes, stream/reconnect handling, envelope expectations).

- [ ] **Step 2: Link each domain to normalization contract page**

Add a short “Contract expectations” section with a link to `/api-reference/normalization-contract-and-rollout`.

- [ ] **Step 3: Commit domain updates**

```bash
git add api-reference/domains/*.mdx
git commit -m "docs: align domain api guides with post-1.10.10 contracts"
```

### Task 5: Update repository overviews to match latest rollout state

**Files:**
- Modify: `repositories/d-sports-api.mdx`
- Modify: `repositories/d-sports-engage-native.mdx`
- Test: link check + content accuracy pass

- [ ] **Step 1: Add normalized API contract summary to backend page**

In `repositories/d-sports-api.mdx`, add a concise “API contract status” section that points to the normalization contract page and OpenAPI source-of-truth workflow.

- [ ] **Step 2: Add strict client behavior summary to native page**

In `repositories/d-sports-engage-native.mdx`, document strict envelope mode and the app-version anchor at `1.10.10`.

- [ ] **Step 3: Commit repository updates**

```bash
git add repositories/d-sports-api.mdx repositories/d-sports-engage-native.mdx
git commit -m "docs: update repo overviews for normalization rollout completion"
```

### Task 6: Harden future sync workflow (recommended)

**Files:**
- Modify: `.mintlify/workflows/api-docs-sync.md`
- Create: `scripts/audit-openapi-coverage.ts`
- Modify: `package.json`
- Test: run audit script

- [ ] **Step 1: Add explicit sync gates to workflow**

Update workflow doc with mandatory gates after API merges:
- update `../d-sports-api/openapi.json`
- run `bun run sync-openapi`
- run route coverage audit
- update docs pages when behavior changes.

- [ ] **Step 2: Add repeatable coverage audit script**

Create `scripts/audit-openapi-coverage.ts` to print and optionally fail on undocumented public routes.

- [ ] **Step 3: Expose audit command**

Add script in `package.json`:
```json
"openapi:audit": "bun run scripts/audit-openapi-coverage.ts"
```

- [ ] **Step 4: Commit guardrail updates**

```bash
git add .mintlify/workflows/api-docs-sync.md scripts/audit-openapi-coverage.ts package.json
git commit -m "chore(docs): add openapi coverage audit guardrails"
```

### Task 7: Verify docs integrity end-to-end and package PR

**Files:**
- Modify: none (verification/report only)
- Test: Mintlify + OpenAPI + broken links

- [ ] **Step 1: Run final verification**

From docs repo root:
```bash
bun run sync-openapi
mint broken-links
mint validate
bun run openapi:audit
```
Expected: no broken links, valid docs build, no unexpected uncovered public routes.

- [ ] **Step 2: Validate timeline consistency**

Confirm all references consistently indicate:
- Phase 1 established starter envelope
- Phase 2 A/B/C/D completed
- Phase 2B/2C action/client hardening completed
- app/version context aligned to `1.10.10`.

- [ ] **Step 3: Prepare PR summary**

Include:
- canonical OpenAPI changes
- synced docs OpenAPI update
- docs pages updated
- coverage audit results (including intentional exclusions list).
