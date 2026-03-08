# D-Sports Docs

This repository contains the documentation for the D-Sports fan engagement platform, published at **[docs.d-sports.org](https://docs.d-sports.org)**.

It covers:

- **Getting started** — Quickstart, local development, and the [ecosystem overview](repositories/ecosystem-overview) of our four repositories
- **Repositories** — [d-sports-api](repositories/d-sports-api), [d-sports-site](repositories/d-sports-site), [d-sports-engage-native](repositories/d-sports-engage-native), [d-sports-mic-d-up](repositories/d-sports-mic-d-up)
- **API reference** — Introduction and endpoint examples for the d-sports-api backend
- **Docs configuration and Writing D-Sports docs** — How we configure and write these docs (docs.json, MDX, AGENTS.md)

## Development

1. Install the [Mintlify CLI](https://www.npmjs.com/package/mint): `npm i -g mint`
2. In this repo root (where `docs.json` is), run: `mint dev`
3. Open http://localhost:3000 to preview.

Changes are deployed to **docs.d-sports.org** automatically when you push to the default branch (with the Mintlify GitHub app connected).

## AI-assisted writing

To use Cursor, Claude Code, or Windsurf with this repo:

```bash
npx skills add https://mintlify.com/docs
```

See the [AI assistants](/ai-tools) section in the docs for Cursor, Claude Code, and Windsurf setup. The repo’s **AGENTS.md** defines D-Sports terminology, style, and a Mintlify MDX quick reference.

## Links

- **Live docs:** [docs.d-sports.org](https://docs.d-sports.org)
- **Mintlify docs:** [mintlify.com/docs](https://mintlify.com/docs)
