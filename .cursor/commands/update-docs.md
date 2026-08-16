---
description: Sync the D-Sports docs site from latest API, native, and backend main
---

Run the **update-docs** skill at `.cursor/skills/update-docs/SKILL.md`.

Pull latest `main` for `d-sports-api`, `d-sports-engage-native`, and `d-sports-backend`. Diff OpenAPI, routes, stack, and native contracts. Update the spec in `d-sports-api` first if public routes are missing, then `bun run sync-openapi`. Refresh narrative pages, coverage, and `docs.json`. Do not hand-edit `api-reference/openapi.json`.
