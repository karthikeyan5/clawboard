# CONVENTIONS.md — Decision Framework

When CONTRACTS.md doesn't cover your situation, these principles guide the decision. They're ordered by priority — when two conflict, the lower number wins.

## 1. Structure IS the convention

Don't document what can be discovered by reading the file system. `ls core/panels/` teaches panel naming. `cat manifest.json` teaches the schema. If an agent needs to read CONVENTIONS.md to understand naming, the project structure has failed.

**Exception:** empty extension points (no examples to learn from) need bootstrap templates. Every extension point (`custom/panels/`, `custom/routes/`, `plugins/`) should have a `_template/` or `_example` that teaches the pattern even when no real implementations exist yet.

## 2. Derive from core, don't memorize

Every convention follows from one rule: match the nearest existing **core** pattern.

- Adding a panel? Copy `core/panels/cpu/`, rename, modify.
- Adding a hook? Find an existing `hooks.filter()` call, follow its naming.
- Adding a route? Look at `custom/routes/` examples.

**Important:** always derive from `core/` implementations, never from `custom/` or `plugins/`. Core is the reference implementation. Custom/plugin code may have subtle mistakes that propagate if copied.

## 3. Names describe WHAT, not HOW

- `data.js` not `fetchAndParseSystemMetrics.js`
- `validator.js` not `jsonSchemaValidatorForManifests.js`
- `hooks.js` not `asyncHookRegistryWithFilterChain.js`

**Tiebreaker:** when two WHAT-names are equally valid, prefer the more general name. `data.js` over `metrics.js` — because it might hold more than metrics later. Names should accommodate growth.

## 4. When in doubt, choose the boring option

- Prefer established patterns over clever ones
- Prefer explicit over implicit
- Prefer one obvious location over flexible placement

This is the most important tiebreaker. If you're debating between two valid approaches, pick the one a junior developer would understand on first read.

## 5. Conventions are functional, not cosmetic

`p-cpu-value` isn't a style choice — `cls()` generates it and CSS matches on it. Break the naming, break the feature.

Distinction:

- **Rules** (functional, enforced): CSS prefixes, hook naming segments, api route prefixes, manifest field names. Breaking these breaks features.
- **Suggestions** (cosmetic, encouraged): Commit message format (`feat:`, `fix:`), component naming (`CpuPanel`), code style. Breaking these is messy but nothing crashes.

Don't enforce suggestions as rules. Mark the difference.

## 6. The file system is the API — with limits

```
core/panels/       → ls = know all panels
core/lib/          → ls = know all core modules
custom/            → ls = know all user extensions
plugins/           → ls = know all plugins
```

If an agent needs to grep for something, the directory structure needs work.

But: the file system shows structure, not relationships. For cross-panel dependencies, hook chains, and data flow — that's `architecture.yaml`. File system for discovery, architecture.yaml for relationships.

## 7. One canonical location per concern

Every piece of information lives in exactly ONE place. Duplication creates contradictions.
Cross-references are fine ("see CONTRACTS.md"), copies are not.

**Canonical locations:**

| Concern | File | Contains |
|---------|------|----------|
| What the rules are | `CONTRACTS.md` | Panel contract, manifest schema, ui.js props, CSS, hooks, errors |
| Why it's built this way | `ARCHITECTURE.md` | WHY decisions with "would change if" conditions |
| How to extend it | `AGENT-EXTEND.md` | Tutorials for custom panels, routes, plugins, themes |
| How to set it up | `AGENT-SETUP.md` | Step-by-step setup for AI agents |
| Testing strategy | `TESTING.md` | 3 layers, conventions, coverage map, visual testing plan |
| Decision framework | `CONVENTIONS.md` | This file — principles that guide decisions |
| What's planned | `ROADMAP.md` | Version-by-version feature plan (v2→v6) |
| What broke | `BREAKING_CHANGES.md` | Migration guide for breaking changes |
| Machine-readable spec | `architecture.yaml` | Structure, relationships, extension points |
| What it is + install | `README.md` | Intro, quick start, links to docs. Never duplicates other docs. |

**Rule:** When updating information, find the canonical location first. If you update README.md with contract details that belong in CONTRACTS.md, you've created a future contradiction.

**Enforced by CI:** `.github/workflows/docs-check.yml` blocks PRs that change core Go files without updating documentation. Escape hatch: `[no-docs]` in commit message for internal refactors.
