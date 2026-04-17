# AGENTS.md

Guidance for AI coding agents (Cursor, Claude, Windsurf, Warp, GitHub Copilot, etc.) working in this repository.

## Project Overview

This is the **public documentation site for the entire D-Sports ecosystem**, built on [Mintlify](https://mintlify.com). It documents:

- The **D-Sports API** (full OpenAPI reference + per-domain narrative docs)
- The **D-Sports Engage native** mobile app (architecture, integration contracts, compliance evidence)
- The **`leagues`** data repo (league assets, sync workflows, canonical team data)
- The **`d-sports-site`** marketing site
- Cross-cutting topics: ecosystem overview, AI tooling integration (Cursor, Claude Code, Windsurf), authentication, errors, rate limits

Pages are MDX files with YAML frontmatter. Configuration lives in `docs.json`. Run `mint dev` to preview locally.

## Build & Run Commands

```bash
bun install            # Install dependencies (Bun 1.3+)
bun run dev            # Sync OpenAPI then start mint dev (live preview)
bun run sync-openapi   # Manually re-pull api-reference/openapi.json from d-sports-api
mint broken-links      # Check for broken internal links
```

> The `predev` hook runs `bun run sync-openapi` automatically before `mint dev`. The script lives at [`scripts/sync-openapi.ts`](./scripts/sync-openapi.ts) and pulls the latest spec from the `d-sports-api` repo into [`api-reference/openapi.json`](./api-reference/openapi.json).

## Repository Layout

```tree
docs/
├── docs.json                         # Mintlify navigation + theme config
├── index.mdx                         # Landing page
├── quickstart.mdx
├── development.mdx
│
├── api-reference/                    # API reference (OpenAPI-driven)
│   ├── openapi.json                  # Synced from d-sports-api (do NOT edit by hand)
│   ├── introduction.mdx
│   ├── authentication.mdx
│   ├── errors-and-status-codes.mdx
│   ├── rate-limits-and-retries.mdx
│   └── domains/                      # Per-domain narrative docs
│       ├── auth-onboarding.mdx
│       ├── gamification.mdx
│       ├── wallet-web3.mdx
│       ├── commerce.mdx
│       ├── collectibles.mdx
│       ├── social-locker-room.mdx
│       ├── moderation.mdx
│       ├── teams-leagues.mdx
│       ├── platform-infra.mdx
│       ├── admin-team-management.mdx
│       └── route-coverage-matrix.mdx # Endpoint coverage tracking
│
├── repositories/                     # Per-repo deep dives
│   ├── ecosystem-overview.mdx
│   ├── d-sports-api.mdx              # Index page for the API repo
│   ├── d-sports-api/                 # Domain folders mirroring api-reference/domains/
│   │   ├── <domain>/index.mdx
│   │   ├── <domain>/architecture.mdx
│   │   ├── <domain>/behavior.mdx
│   │   └── ...
│   ├── d-sports-engage-native.mdx
│   ├── d-sports-engage-native/
│   │   ├── architecture.mdx
│   │   ├── feature-mapping.mdx
│   │   ├── integration-contracts.mdx
│   │   └── compliance/...
│   ├── d-sports-site.mdx
│   ├── d-sports-mic-d-up.mdx
│   ├── leagues.mdx
│   └── leagues/                      # sync-workflow.mdx, teams-canonical-data.mdx
│
├── ai-tools/                         # Agent integration guides
│   ├── cursor.mdx
│   ├── claude-code.mdx
│   └── windsurf.mdx
│
├── essentials/                       # Mintlify component examples
│   ├── code.mdx, navigation.mdx, images.mdx, settings.mdx,
│   ├── markdown.mdx, reusable-snippets.mdx
│
├── snippets/                         # Reusable MDX snippets
├── logo/, images/, favicon.svg       # Branding
│
├── .mintlify/workflows/              # Internal Mintlify automation docs
│   └── api-docs-sync.md
│
├── scripts/sync-openapi.ts           # OpenAPI spec sync
└── docs/superpowers/plans/           # Internal planning docs (not published)
```

## Conventions

### Frontmatter (every MDX page)

```yaml
---
title: "Page title"
description: "SEO and link-preview blurb (one sentence)"
sidebarTitle: "Short title"          # optional, shown in nav
icon: "book"                          # Lucide, Tabler, or Font Awesome
tag: "NEW"                            # optional badge
mode: "default"                       # default | wide | custom | frame | center
keywords: ['term1', 'term2']
---
```

### Style

- **Active voice, second person ("you")** — talking to the reader
- **One idea per sentence** — keep it scannable
- **Sentence case** for headings (`## Adding a new endpoint`, not `## Adding A New Endpoint`)
- **Bold for UI elements**: "Click **Settings**"
- **Code formatting** for file names, paths, commands, and code references (e.g. `prisma/schema.prisma`)
- Avoid emoji unless the surrounding doc already uses them

### Navigation

- All sidebar / tab structure is in [`docs.json`](./docs.json). New pages must be referenced there or they won't appear in the nav.
- Run `mint broken-links` after restructuring to catch dangling references.

### OpenAPI

- **Never hand-edit** [`api-reference/openapi.json`](./api-reference/openapi.json). It is regenerated from `d-sports-api`'s spec by `scripts/sync-openapi.ts`.
- If the API changes, update the spec **in `d-sports-api`**, then re-run `bun run sync-openapi` here, then update the matching narrative page under `api-reference/domains/<domain>.mdx` and the deep dive under `repositories/d-sports-api/<domain>/`.
- The endpoint coverage tracker is at [`api-reference/domains/route-coverage-matrix.mdx`](./api-reference/domains/route-coverage-matrix.mdx).

## Common Tasks

### Add a new docs page

1. Create the MDX file in the right folder (mirror existing structure).
2. Add proper frontmatter (`title`, `description` minimum).
3. Add the page to [`docs.json`](./docs.json) under the right group/tab.
4. Run `bun run dev` and verify it renders + appears in the sidebar.
5. Run `mint broken-links` if you added cross-page links.

### Document a new API domain

1. Add narrative page under `api-reference/domains/<new-domain>.mdx`.
2. Mirror with deep-dive folder `repositories/d-sports-api/<new-domain>/` containing at least `index.mdx`, `architecture.mdx`, `behavior.mdx`.
3. Update `repositories/d-sports-api.mdx` to link the new domain.
4. Add both pages to `docs.json`.

### Update an integration contract

For native ↔ API contract changes, update both:

- [`repositories/d-sports-engage-native/integration-contracts.mdx`](./repositories/d-sports-engage-native/integration-contracts.mdx)
- The relevant `repositories/d-sports-api/<domain>/behavior.mdx`

Keep them in sync — they are the canonical contract docs that cross-team reviewers read.

## Mintlify Quick Reference

Full schema: [mintlify.com/docs.json](https://mintlify.com/docs.json). Component cheat sheet: [mintlify.com/docs/llms.txt](https://www.mintlify.com/docs/llms.txt).

| Component | Use |
|-----------|-----|
| `<Card title="…" icon="…" href="/path">` | Linked cards; add `horizontal` for compact layout |
| `<Columns cols={2}>` | Grid for multiple cards |
| `<Tabs>` / `<Tab title="…">` | Tabbed content; use `sync={false}` for independence |
| `<Note>`, `<Warning>`, `<Info>`, `<Tip>`, `<Check>`, `<Danger>` | Callouts |
| `<Steps>` / `<Step title="…">` | Numbered procedures |
| `<CodeGroup>` | Multi-language code tabs |

### Code blocks

Fenced blocks support `title`, `icon`, `lines`, `wrap`, `expandable`, `highlight`, `focus`, `twoslash`, and diff syntax (`// [!code ++]` / `// [!code --]`).

```ts filename.ts icon="typescript" lines
// example
```

### MDX 3

Mintlify supports MDX 3: adjacent block JSX/expressions without extra newlines, `await` in expressions, ES2024 syntax.

## Sibling Workspaces

This documentation site sits alongside the four code repos it documents:

| Workspace | What this site documents about it |
|---|---|
| [`d-sports-api`](../d-sports-api/) | OpenAPI reference (auto-synced) + per-domain narrative + architecture deep dives |
| [`d-sports-engage-native`](../d-sports-engage-native/) | Architecture, integration contracts, compliance evidence |
| [`d-sports-site`](../d-sports-site/) | Brief overview only — the marketing site is largely self-documenting |
| [`leagues`](../leagues/) | Data model, sync workflow, canonical team data |

When the source repo changes, the docs need to keep up. The `d-sports-api` repo is the most coupled — most doc PRs here are paired with one there.

## What Not To Do

- **Don't hand-edit `api-reference/openapi.json`.** It's generated.
- **Don't write docs that duplicate `repositories/<repo>/AGENTS.md`** — link to the source repo instead. AGENTS.md files are for in-repo agent guidance; this site is for end-users and integrators.
- **Don't ship product features from this repo.** Code lives in the sibling repos.
- **Don't add a page without registering it in `docs.json`** — Mintlify won't surface it in the nav.

## Optional: Mintlify MCP

For live docs search inside an agent, see the [Mintlify MCP server](https://mintlify.com/docs/mcp). The workspace `d-sports-engage-native` already wires it into `.cursor/mcp.json` as `Mintlify Docs`.
