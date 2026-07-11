# D-Sports Ecosystem TDD — Data Room Build Plan

**Date:** 2026-06-03  •  **Author:** Jon (jon@d-sports.org)  •  **Status:** Draft for approval

**Goal:** Produce a Mosaic-ready technical due diligence data room covering the entire D-Sports ecosystem, delivered as a versioned Google Doc set in the Drive `Tech Due Diligence (TDD)` folder, matching the style/depth of the existing *D-Sports Engage UI/UX Overview*.

**Audience:** Mosaic (HoD's TDD partner) + the House of Doge board. External-facing but technical. The diligence is intended to *advance* the fall Sierre/Milan GTM, so the document set must be credible under scrutiny — current-state truth plus a roadmap-with-status for the build-ahead.

**Posture (locked):** Full data room • Google Docs in the TDD folder • document unbuilt/scaffold areas honestly, marked built / partial / planned and tied to the HC Sierre 2026/27 roadmap dates. **No fabricated numbers** — financials/op-model/team sections pull from existing roadmap artifacts where they exist and are marked `OWNER-PENDING` otherwise.

---

## 1. Strategic context (why this matters and where the risk is)

Mosaic is doing diligence on a `doge.live` build partner and expanding it to D-Sports in parallel. A competent TDD firm will probe code quality, scalability, security, key-person risk, and — most sharply — the gap between claims and reality. Our own internal record already flags the exposed seams:

- **Legacy parity is code-complete at the routing layer** (~126/137 contract paths, 0 RN-critical 501 stubs, Strangler Fig proxy live) — but **ops cutover has not run** (no 7-day RN soak, edge-proxy traffic shift P2–P5 pending, staging Infisical config pending).
- **The native `/v1/*` domain API is essentially all stubs** (engage/collectibles/oracle/marketplace/campaigns/fantasy handlers return TODO). This is the real build ahead.
- **Oracle `state_machine.rs` is done + tested**, but `pipeline.rs` + WebSocket fan-out are scaffolds.
- **No automated CI** — verification is manual (`make verify-native-parity`). 20 tests / 7 files.
- **Data model split is incomplete** — 3 Wave-1 migrations applied; Wave 2 (table splits, gacha tables, Privy backfill) is post-launch.

Hiding these fails diligence the moment Mosaic reads the repo. Presenting them as a sequenced, dated plan against the Sierre roadmap is what turns the diligence into GTM acceleration. **The plan below is built around that honesty.**

> **Decision flag for Jon:** confirm how much of the internal risk register (24 risks / 12 open decisions, FINMA/nDSG/Sportradar/consent blockers) goes into an *externally shared* data room vs. a redacted summary. Default: include a summarized risk posture, redact named individuals and unsigned-contract specifics. → see §6 open items.

---

## 2. Source inventory (what we already have vs. what must be written)

| Source | Location | Use |
|--------|----------|-----|
| Frontend UI/UX TDD | Drive: *D-Sports Engage UI/UX Overview* (v1.18.4) | Reference template + the "Frontend/App" data-room section (already done) |
| Rust backend | `d-sports-backend/` (README, `docs/architecture.md`, `docs/development.md`, `docs/parity/*`, `crates/`) | Backend architecture, parity story, cutover |
| Legacy API | `d-sports-api/` (README, `CLAUDE.md`, `docs/`, Prisma schema) | Legacy API, data model, integrations, compliance docs |
| Native app | `d-sports-engage-native/` (README, AGENTS.md, app store/compliance notes) | App ops, store posture, account-deletion |
| Web + adjacent | `d-sports-site/`, `d-sports-mic-d-up/`, `dsports-ad/`, `leagues/` | Ecosystem map |
| Roadmap artifacts | `HC_Sierre_Roadmap_2026-27/`, `DSports_Roadmap_2026-27/` (docx/pdf/xlsx/html) | Roadmap, build-ahead, risk register, KPIs, op model inputs |
| On-chain/gacha | `d-sports-backend/docs/proposals/onchain-gacha-*`, ADR-0001 | Oracle/Web3 + gacha (deferred) section |
| Compliance | `d-sports-api/docs/compliance/*`, app-store privacy labels, odds disclosure | Security & compliance section |

**Gaps with no existing source (OWNER-PENDING):** company/legal entity structure, cap table/financials, headcount & org chart, commercial/op model economics. These need Jon + HoD input or get marked pending.

---

## 3. Data room document set (deliverables)

Each is a separate Google Doc in the TDD folder, prefixed for ordering. One master **Index** doc links them all. Depth target = the frontend TDD (table-heavy, versioned, prose + reference tables).

| # | Document | Primary source | Build status of *content* |
|---|----------|----------------|---------------------------|
| 00 | **Data Room Index & Diligence README** | this plan | New |
| 01 | **Company, Team & Org** | OWNER-PENDING + memory | Skeleton + pending flags |
| 02 | **Product Overview** (Engage, DogeCARD, 3-team rollout, engagement layers) | roadmap artifacts, READMEs | Writable now |
| 03 | **Ecosystem System Architecture** (all repos, request flow, strangler fig) | both backends, native, site | Writable now |
| 04 | **Backend Technical Architecture (Rust)** ⟵ core new doc | `d-sports-backend` docs/crates | Writable now |
| 05 | **Frontend / Native App Architecture** | existing UI/UX TDD | Done — link + light extension |
| 06 | **Data Model & Migrations** (Prisma legacy + Rust Wave 1/2, `user_id_map`) | schemas, SCHEMA_STRATEGY | Writable now |
| 07 | **Integrations & Third Parties** (Clerk/Privy, Supabase, Thirdweb, RevenueCat, OneSignal, Sentry, Sportradar, Story, Fractal Engine, Infisical) | READMEs, docs | Writable now |
| 08 | **Oracle Pipeline & Web3 / On-Chain** (OracleProof/Settle, Doge L1, state machine, gacha deferred) | parity docs, gacha proposal, memory | Writable now, mark scaffold status |
| 09 | **Security & Compliance** (auth, secrets, FINMA/nDSG, app-store privacy, odds/gambling) | api compliance docs | Writable now |
| 10 | **DevOps, Infra & Observability** (EAS, Vercel, Docker, CI gap, Sentry, runbooks) | dev docs, deployment docs | Writable now |
| 11 | **Testing, QA & the Fall GTM Build/Test Plan** ⟵ Mosaic's stated deliverable | parity testing docs, roadmap | Writable now; co-author w/ Mosaic |
| 12 | **Operations & Op Model** | roadmap + OWNER-PENDING | Partial + pending flags |
| 13 | **Financials / Commercial** | OWNER-PENDING | Skeleton + pending flags |
| 14 | **Roadmap & Build-Ahead to Fall GTM** (parity cutover → v1 build → Sierre dates) | roadmap artifacts | Writable now |
| 15 | **Risk Register & Open Decisions (diligence summary)** | Risk/Decision register xlsx | Writable now; redaction decision needed |

**Scope reality check:** 16 docs at frontend-TDD depth is large. Recommend phasing (see §5) — ship the technical spine (00, 03, 04, 06, 07, 08) first since that is what Mosaic engages on immediately and what we can author without external input. 01/12/13 are the slowest (depend on others) and shouldn't block the technical handoff.

---

## 4. Per-document build approach

For every doc, the loop is: (a) extract facts from the repo/docs — never assert from memory without verifying against current code; (b) draft in markdown; (c) status-tag each subsystem `Built / Partial / Planned`; (d) convert to Google Doc in the TDD folder. Diagrams (architecture, request flow, oracle state machine, data model ERD) generated via the diagram tooling and embedded.

**Verification step (required before any doc is marked done):** cross-check every technical claim against the live repo at current HEAD (the memory notes are 2–28 days old and explicitly point-in-time). Specifically re-verify: crate handler status (stub vs native), migration count, test count, CI presence, proxy route count. A subagent does this pass per doc.

---

## 5. Build sequence (phased)

**Phase A — Spine (author now, no external dependency):**
00 Index → 03 Ecosystem Architecture → 04 Backend (Rust) → 06 Data Model → 07 Integrations → 08 Oracle/Web3.

**Phase B — Diligence depth:**
09 Security & Compliance → 10 DevOps/Infra → 11 Testing & Fall GTM Build/Test Plan → 14 Roadmap/Build-Ahead → 15 Risk summary.

**Phase C — External-dependent:**
02 Product (mostly now) → 05 Frontend (link existing) → 01 Company/Team → 12 Op Model → 13 Financials. These carry OWNER-PENDING blocks until Jon/HoD supply inputs.

**Per-doc cycle:** draft → self-verify against repo → subagent review (accuracy + does-it-survive-diligence) → convert to Google Doc → link in Index.

---

## 6. Open items needing Jon's decision

1. **Risk register exposure** — full internal register vs. redacted external summary in doc 15? (Default: redacted summary.)
2. **Financials/op model** — author skeleton + OWNER-PENDING, or omit docs 12/13 entirely until HoD provides? (Default: skeleton with pending flags so the data room shows structure.)
3. **Named individuals / unsigned contracts** — keep names (Sportradar, FINMA contacts, athlete consent) out of the external set? (Default: yes, redact.)
4. **Doc granularity** — 16 separate Google Docs vs. one master doc with 16 sections? (Default: separate docs + index, matching how Mosaic data rooms are typically navigated.)
5. **Who co-authors doc 11** — the test/build plan is explicitly Mosaic's engagement; do we draft a starting version or wait? (Recommend: draft a strong v0 so we set the agenda.)

---

## 7. What I'll do on approval

Start Phase A: generate docs 00, 03, 04 first (the technical spine Mosaic reads first), each verified against current repo HEAD, with embedded diagrams, then create them as Google Docs in the `Tech Due Diligence (TDD)` folder and link them from the Index. I'll check in after the first three so you can validate tone/depth before I scale to the rest.
