---
name: update-docs
description: Sync the D-Sports Mintlify docs site from latest main of d-sports-api, d-sports-engage-native, and d-sports-backend. Pulls source repos, diffs OpenAPI and routes, updates narrative pages, coverage, and nav. Use when the user says /update-docs, "update the docs site", "sync docs from main", or asks to refresh docs after API or native changes.
---

# Update D-Sports docs

Repeatable full-site sync. Do not skip inventory. Do not hand-edit `api-reference/openapi.json`.

Announce: "Using update-docs to sync the site from latest source mains."

## Sources of truth

| Repo | What to pull | What to change here |
| --- | --- | --- |
| `D-Sports-Ecosystem/d-sports-api` `main` | `openapi.json`, `app/api/**/route.ts`, `prisma/schema.prisma`, README, package.json | Sync spec, domain guides, API deep dives, coverage matrix |
| `D-Sports-Ecosystem/d-sports-engage-native` `main` | README, package.json, `app/`, `lib/api/`, integration-facing docs | Native overview, architecture, feature mapping, integration contracts |
| `D-Sports-Ecosystem/d-sports-backend` `main` | README, crate map, parity status only | `repositories/d-sports-backend.mdx` + ecosystem warning |
| Optional context | `d-sports-site`, `leagues`, `d-sports-mic-d-up` | Only if a documented contract changed |

Live production API is **d-sports-api**. Rust backend is parity/shim, not the OpenAPI source.

## Checklist

Copy and track:

```
- [ ] 1. Pull latest source mains
- [ ] 2. Inventory drift (OpenAPI, routes, stack, native, backend)
- [ ] 3. Update OpenAPI in d-sports-api if public routes are missing (separate API PR)
- [ ] 4. Sync openapi.json into this repo
- [ ] 5. Update narrative + domain + native + backend pages
- [ ] 6. Update docs.json, coverage matrix, AGENTS.md
- [ ] 7. Validate nav pages exist
```

## Step 1 — Pull latest mains

Prefer `gh repo clone` / `gh repo sync` of `main` (depth 1 is fine).

Place checkouts so `scripts/sync-openapi.ts` works: sibling `../d-sports-api` relative to this repo root.

If a sibling checkout is dirty or not `main`, clone into a throwaway directory instead of mutating someone else's worktree.

```bash
gh repo clone D-Sports-Ecosystem/d-sports-api "$API" -- --depth 1 --branch main
gh repo clone D-Sports-Ecosystem/d-sports-engage-native "$NATIVE" -- --depth 1 --branch main
gh repo clone D-Sports-Ecosystem/d-sports-backend "$BACKEND" -- --depth 1 --branch main
```

Use Mintlify MCP (`search_mintlify`, `query_docs_filesystem_mintlify`) for `docs.json` / OpenAPI nav rules. Use Context7 only for third-party library version facts.

## Step 2 — Inventory

Run [scripts/inventory.py](scripts/inventory.py) from the docs repo root:

```bash
python3 .cursor/skills/update-docs/scripts/inventory.py \
  --docs . \
  --api ../d-sports-api \
  --native ../d-sports-engage-native \
  --backend ../d-sports-backend
```

Also read:

- API / native / backend `package.json` + README (stack, versions, run commands, secrets)
- New `app/api/**/route.ts` groups not in a domain guide
- Native `app/` route groups and `lib/api/*` contracts
- Backend README status paragraph only (do not copy parity plans)

## Step 3 — OpenAPI (API repo first)

`d-sports-api/openapi.json` is canonical. **Never** invent paths in this repo.

If inventory shows shipped **public** client routes missing from the spec:

1. Add/update operations in **d-sports-api** `openapi.json` (same lightweight style: tags, summary, security, simple request/response descriptions).
2. Open or update an API-repo PR for that spec change.
3. Only then copy the spec here.

Do **not** add debug, cron, internal, or privileged admin-override routes.

## Step 4 — Sync spec into docs

```bash
bun run sync-openapi
# or: cp "$API/openapi.json" api-reference/openapi.json
```

Confirm path counts match.

## Step 5 — Update pages

Follow [AGENTS.md](../../../AGENTS.md): second person, sentence-case headings, no emoji unless the page already uses them, no copied `AGENTS.md` from source repos.

For each drifted domain:

1. Update `api-reference/domains/<domain>.mdx`
2. Update `repositories/d-sports-api/<domain>/{index,architecture,behavior}.mdx`
3. If the domain is new: create those three deep-dive pages **and** the domain guide, then register both in `docs.json`

Always refresh when facts changed:

- `index.mdx`, `quickstart.mdx`, `repositories/ecosystem-overview.mdx`
- `repositories/d-sports-api.mdx`, `repositories/d-sports-engage-native.mdx`
- Native `architecture.mdx`, `feature-mapping.mdx`, `integration-contracts.mdx`
- `api-reference/introduction.mdx`, `api-reference/authentication.mdx`
- `api-reference/domains/route-coverage-matrix.mdx`
- `repositories/d-sports-api/gamification/coverage-status.mdx`

Coverage statuses: `Publish` | `Publish with redaction` | `Shipped, OpenAPI pending` | `Exclude`.

## Step 6 — Nav and agent guidance

- Every new MDX page must appear in `docs.json`
- Keep OpenAPI endpoint generation on the API Reference **Endpoints** group
- Update `AGENTS.md` sibling table / layout only when repos or domains were added
- Update `.mintlify/workflows/api-docs-sync.md` only when trigger/context repos change

## Step 7 — Validate

```bash
python3 -c "import json; json.load(open('docs.json'))"
# every docs.json page path must have a matching .mdx
mint broken-links   # if mint is on PATH
```

Do not commit cloned source repos. Do not commit unless the user asks (except when they asked for a PR — then commit the docs changes only).

## Style and safety

- Public docs only. Redact secrets, webhook values, admin remediation, debug routes.
- Rust backend page: production-vs-parity warning. No cutover checklists.
- If both a fix and an exploit/PoC are requested: document the contract, not the attack.
