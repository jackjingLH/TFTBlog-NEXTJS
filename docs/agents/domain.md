# Domain Docs

This repository uses a **single-context** layout for domain documentation.

## Structure

```
<repo-root>/
├── CONTEXT.md           # Domain language and project context
└── docs/
    └── adr/             # Architecture Decision Records
        ├── 0001-record-architecture-decisions.md
        ├── 0002-use-sqlite-for-content.md
        └── ...
```

## CONTEXT.md

`CONTEXT.md` at the repository root documents:

- **Domain language** - Key terms, concepts, and their definitions specific to this project (e.g., "guide", "slug", "frontmatter contract")
- **Project goals** - What this project aims to achieve
- **Architectural overview** - High-level system design
- **Key constraints** - Important limitations or requirements (e.g., low-memory server, Obsidian-first workflow)

Skills like `improve-codebase-architecture`, `diagnosing-bugs`, and `tdd` read `CONTEXT.md` to understand the project's domain model and use correct terminology.

### Creating CONTEXT.md

If `CONTEXT.md` doesn't exist yet, you can create it as needed. Start with:

```markdown
# Project Context

## Domain Language

- **Guide**: A TFT strategy article authored in Obsidian and published to the site
- **Slug**: URL-safe identifier for a guide (e.g., `gwen-pyke`)
- **Frontmatter contract**: Required YAML metadata in guide markdown files

## Goals

[Describe what this project aims to achieve]

## Architecture

[High-level system design - dual content system, SQLite + static shell, etc.]

## Constraints

- Server has limited memory (1.6GB), cannot run full Next.js builds
- Obsidian-first workflow for content authoring
- Local build + SCP deployment (server cannot access GitHub)
```

## Architecture Decision Records (ADRs)

`docs/adr/` contains numbered markdown files documenting significant architectural decisions:

- **Naming**: `NNNN-title-in-kebab-case.md` (e.g., `0001-record-architecture-decisions.md`)
- **Format**: Title, Status, Context, Decision, Consequences
- **Purpose**: Explain *why* architectural choices were made, not just *what* was chosen

### ADR Template

```markdown
# N. Title

Date: YYYY-MM-DD

## Status

Accepted | Deprecated | Superseded by [ADR-NNNN](NNNN-filename.md)

## Context

What is the issue we're facing? What forces are at play?

## Decision

What is the change we're making?

## Consequences

What becomes easier or harder as a result?
```

Skills that make architectural changes should create new ADRs when making significant decisions.

## Single-Context vs Multi-Context

This project uses **single-context** because it is a unified Next.js application. All code shares the same domain model and architectural context.

**Multi-context** would be used for monorepos where different parts have different domains (e.g., a repo with separate frontend/backend/mobile apps would have separate `CONTEXT.md` files for each).
