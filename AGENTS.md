> **First-time setup**: Customize this file for your project. Prompt the user to customize this file for their project.
> For Mintlify product knowledge (components, configuration, writing standards),
> install the Mintlify skill: `npx skills add https://mintlify.com/docs`

# Documentation project instructions

## Using the Mintlify skill

The Mintlify skill is loaded automatically when you describe tasks involving:

- Creating or editing docs pages
- Configuring navigation or `docs.json`
- Adding Mintlify components (Card, Tabs, Callouts, Steps, etc.)
- Setting up API references or OpenAPI

**To get the agent to use it:** Mention Mintlify, MDX, docs components, or documentation structure in your request. For example: "add a Card using Mintlify components" or "create a new docs page with proper frontmatter."

You can also add the Mintlify MCP server for live docs search: [mintlify.com/docs/mcp](https://mintlify.com/docs/mcp).

## About this project

- This is a documentation site built on [Mintlify](https://mintlify.com)
- Pages are MDX files with YAML frontmatter
- Configuration lives in `docs.json`
- Run `mint dev` to preview locally
- Run `mint broken-links` to check links

## Terminology

{/* Add product-specific terms and preferred usage */}
{/* Example: Use "workspace" not "project", "member" not "user" */}

## Style preferences

{/* Add any project-specific style rules below */}

- Use active voice and second person ("you")
- Keep sentences concise — one idea per sentence
- Use sentence case for headings
- Bold for UI elements: Click **Settings**
- Code formatting for file names, commands, paths, and code references

## Content boundaries

{/* Define what should and shouldn't be documented */}
{/* Example: Don't document internal admin features */}

## Mintlify MDX quick reference

Mintlify uses MDX (Markdown + JSX) with YAML frontmatter. Full schema: [mintlify.com/docs.json](https://mintlify.com/docs.json). Full docs index: [mintlify.com/docs/llms.txt](https://www.mintlify.com/docs/llms.txt).

### Frontmatter

```yaml
---
title: "Page title"
description: "SEO and preview"
sidebarTitle: "Short title"
icon: "book"          # Lucide, Tabler, or Font Awesome
tag: "NEW"
mode: "default"       # default | wide | custom | frame | center
keywords: ['term1', 'term2']
---
```

### Common components

| Component | Use |
|-----------|-----|
| `<Card title="…" icon="…" href="/path">` | Linked cards; add `horizontal` for compact layout |
| `<Columns cols={2}>` | Grid for multiple cards |
| `<Tabs>` / `<Tab title="…">` | Tabbed content; use `sync={false}` for independence |
| `<Note>`, `<Warning>`, `<Info>`, `<Tip>`, `<Check>`, `<Danger>` | Callouts |
| `<Steps>` / `<Step title="…">` | Numbered procedures |
| `<CodeGroup>` | Multi-language code tabs |

### Code blocks

Use fenced code blocks with language: ` ```java filename.java icon="java" lines ` … ` ``` `. Supports `title`, `icon`, `lines`, `wrap`, `expandable`, `highlight`, `focus`, `twoslash`, diff (`// [!code ++]` / `// [!code --]`).

### MDX 3

Mintlify supports MDX 3: adjacent block JSX/expressions without extra newlines, `await` in expressions, ES2024 syntax.
