---
name: "API Docs Sync"
on:
  push:
    - repo: "d-sports-ecosystem/d-sports-api"
    - repo: "d-sports-ecosystem/d-sports-engage-native"
    - repo: "d-sports-ecosystem/d-sports-mic-d-up"
context:
  - repo: "d-sports-ecosystem/d-sports-site"
  - repo: "d-sports-ecosystem/d-sports-backend"
  - repo: "d-sports-ecosystem/leagues"
---

When a PR merges into one of the trigger repos, update the **docs** repo so documentation stays in sync.

## If the change is in **d-sports-api** (API routes, new endpoints, or behavior changes):
- If any `app/api/**` route was added, changed, or removed, update the OpenAPI spec in **d-sports-api**: `openapi.json` at the repo root. Keep the same structure (paths, tags, parameters, request/response descriptions) and add/update/remove operations to match the code.
- In the **docs** repo, run the sync step so the spec is copied: from docs root run `bun run sync-openapi` (or ensure the docs deployment runs this). Do not edit `docs/api-reference/openapi.json` by hand; it is synced from d-sports-api.

## If the change is in **d-sports-engage-native** or **d-sports-mic-d-up**:
- If the change affects how developers use the app or its APIs, update the corresponding doc page under `repositories/` in the docs repo (e.g. `repositories/d-sports-engage-native.mdx` or `repositories/d-sports-mic-d-up.mdx`). Add or update setup steps, env vars, or usage notes as needed.

## If the change is in **d-sports-backend** (context repo):
- Only update public docs when the production-vs-parity story changes (for example a documented cutover, or a new public warning). Do not copy internal parity plans, gap registers, or unpublished ADRs into this site.
- The live API contract remains `d-sports-api` + `openapi.json`.

## If the change is in **leagues** (context repo):
- Update `repositories/leagues.mdx`, canonical-data, roster, and sync-workflow pages when branding, roster snapshots, or the webhook trigger paths change.

## If the change is in **d-sports-site** (context repo):
- Only suggest doc updates if the PR clearly affects something documented in the docs repo (e.g. shared config or integration points). Prefer not to open a docs PR for minor marketing-site-only changes.

## Format and style:
- Follow the existing style in the docs repo: Mintlify MDX, second person ("you"), sentence case for headings, **bold** for UI and `code` for commands/paths.
- Keep changes minimal and only where the merge actually affects docs (API surface, setup, or integration).
- In the PR description, list which files changed in the trigger repo and which doc pages or openapi.json sections you updated and why.
