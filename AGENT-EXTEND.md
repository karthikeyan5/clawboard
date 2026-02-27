# AGENT-EXTEND.md — AI Agent Playbook

**For AI agents:** How to extend Clawboard on behalf of your human. Create custom panels, override core panels, register hooks, add routes, install plugins, and create themes.

---

## ⚠️ Docs Ship With Code — Mandatory

Every code change **must** include corresponding documentation updates. No exceptions.

- New panel → update AGENT-EXTEND.md with usage example
- Contract change → update CONTRACTS.md
- Architecture change → update architecture.yaml + ARCHITECTURE.md
- Testing change → update TESTING.md
- New convention → update CONVENTIONS.md
- Breaking change → update BREAKING_CHANGES.md
- README-visible feature → update README.md

**A PR/commit without docs for user-facing changes is incomplete.**
This is enforced by CI — see `.github/workflows/docs-check.yml`.

---

## Architecture Overview

See [`architecture.yaml`](./architecture.yaml) for the full structure and [`ARCHITECTURE.md`](./ARCHITECTURE.md) for WHY decisions.

Extension points: `custom/panels/`, `custom/overrides/`, `custom/theme/`, `plugins/`, config-driven routes, Go-native hooks.

**Override resolution (last wins):** core → custom → plugins → overrides.

---

## 1. Create a Custom Panel

When your human says "add a panel that shows X":

### Step 1: Copy an existing panel

```bash
cp -r core/panels/uptime custom/panels/my-panel
```

There are no templates — just copy an existing panel folder and modify it.

### Step 2: Edit manifest.json

```json
{
  "id": "my-panel",
  "name": "My Panel",
  "version": "1.0.0",
  "contractVersion": "1.0",
  "description": "What this panel shows",
  "author": "agent",
  "position": 100,
  "size": "half",
  "refreshMs": 5000,
  "requires": [],
  "capabilities": ["fetch"],
  "dataSchema": { "type": "object", "properties": {} },
  "config": {}
}
```

See [`CONTRACTS.md`](./CONTRACTS.md) for all required fields and validation rules.

### Step 3: Data handler (Go, in `internal/data/`)

Panel data is served by Go handlers in `internal/data/`. To add data for a custom panel, add a function there and wire it into the `servesPanelData` switch in `internal/server/server.go`:

```go
// internal/data/mypanel.go
package data

import "encoding/json"

func GetMyPanelData() json.RawMessage {
    result, _ := json.Marshal(map[string]interface{}{
        "value": 42,
        "label": "My Metric",
    })
    return result
}
```

Then add the case in `internal/server/server.go`:
```go
case "my-panel":
    result = data.GetMyPanelData()
```

### Step 4: Write ui.js (browser-side Preact+HTM component)

```javascript
// Runs in the browser as a Preact+HTM component
// Import from the vendored bundle — no CDN, no build step
import { html, useState, useEffect } from '/core/vendor/preact-htm.js';

// Export default function component. PascalCase of panel id.
export default function MyPanel({ data, error, connected, lastUpdate, api, config, cls }) {
  if (error) return html`<div class=${cls('error')}>${error.error}</div>`;
  if (!data) return html`<div class=${cls('wrap')}><div class=${cls('label')}>Loading...</div></div>`;

  return html`
    <div class=${cls('wrap')}>
      ${!connected && html`<div class=${cls('stale')}>⚠ Stale</div>`}
      <div class=${cls('label')}>${data.label}</div>
      <div class=${cls('value')}>${data.value}</div>
    </div>
  `;
}
```

### Rules for ui.js

See [`CONTRACTS.md`](./CONTRACTS.md) for the full ui.js contract (props, rules, CSS). Key points:
- Import from `/core/vendor/preact-htm.js`, use `cls()` for scoped classes, handle `data === null`.

### Available CSS Variables

See `core/public/core.css` for the full list. Key variables:

```css
var(--bg)          /* #06060e — page background */
var(--bg2)         /* #0c0c18 — slightly lighter bg */
var(--card)        /* #10101e — card background */
var(--card-border) /* rgba(accent, 0.08) */
var(--accent)      /* from config.json accent field */
var(--accent-dim)  /* accent at 15% opacity */
var(--text)        /* #e8e8f0 — primary text */
var(--text-dim)    /* #6a6a7a — secondary text */
var(--text-mid)    /* #9a9aaa — mid text */
var(--red)         /* #ef4444 */
var(--green)       /* #4ade80 */
var(--yellow)      /* #fbbf24 */
var(--cyan)        /* #22d3ee */
```

---

## 2. Override a Core Panel

When your human says "redesign the CPU panel":

```bash
# Copy the core panel's ui.js to overrides
mkdir -p custom/overrides/cpu
cp core/panels/cpu/ui.js custom/overrides/cpu/ui.js

# Edit the copy — optionally copy manifest.json too for different config
```

Your override replaces the core panel's UI but keeps the core data handler.

**To revert:** Delete the folder in custom/overrides/.

---

## 3. Hooks

The hook engine is Go-native (`internal/hooks/hooks.go`). Filters and actions are registered programmatically in Go.

To extend hooks, modify Go code in `internal/hooks/` and rebuild:

```go
// Register a filter
hookEngine.AddFilter("panel.cpu.data", func(data interface{}) interface{} {
    // Modify data
    return data
})

// Register an action
hookEngine.On("core.server.ready", func() {
    fmt.Println("Server is ready!")
})
```

### Available Hooks

| Hook Name | Type | Description |
|-----------|------|-------------|
| `core.server.init` | action | Server initializing |
| `core.server.ready` | action | Server listening |
| `core.panels.discovered` | action | All panels found |
| `panel.{id}.data` | filter | Modify panel data response |
| `config.loaded` | filter | Modify config after loading |

---

## 4. Add Custom Routes

Routes are config-driven in `config.json`. Static file serving only — no programmatic route handlers:

```json
{
  "routes": {
    "/screenshots/": "custom/screenshots",
    "/docs/": "custom/docs"
  }
}
```

Each key is a URL prefix, each value is a directory (relative to project root). Files in that directory are served statically.

---

## 5. Install a Plugin

Plugins are external repos containing panels:

```bash
cd plugins/
git clone https://github.com/someone/clawboard-plugin-docker docker-panel
```

### Plugin structure

```
plugins/docker-panel/
├── panels/
│   └── docker/
│       ├── manifest.json
│       └── ui.js
```

Plugin panels are discovered from `plugins/*/panels/*/manifest.json` and auto-merge into the panel registry. A plugin panel with the same ID as a core panel will override it.

---

## 6. Create a Theme

Create `custom/theme/theme.css` to override any CSS variable:

```css
/* custom/theme/theme.css */
/* Loaded AFTER core.css — your values win */

:root {
  /* Change accent to red */
  --color-accent: #e94560;
  --color-accent-dim: rgba(233, 69, 96, 0.15);
  --color-accent-glow: rgba(233, 69, 96, 0.3);

  /* Change background */
  --color-bg: #0a0a12;

  /* Change fonts */
  --font-heading: 'Outfit', sans-serif;
}
```

---

## Error Handling

- If a panel data handler panics → returns error JSON (doesn't crash server)
- If a panel's ui.js throws → ErrorBoundary catches it and shows error card
- If a hook panics → logged, other hooks continue

**The dashboard never goes down because of custom/plugin code.**

---

## Testing

```bash
# Run all Go tests
go test ./...

# Build to check compilation
go build -o /dev/null .

# Start the server for manual testing
BOT_TOKEN=your-token ./clawboard

# Test your API endpoint
curl http://localhost:3700/api/panels/my-panel

# Open the dashboard in browser — your panel should appear in the grid
```

---

## Conventions (Follow These)

1. **NEVER edit anything in `core/`** — use custom/ or plugins/
2. **Panel IDs:** lowercase, hyphens only (e.g. `my-panel`, not `myPanel`)
3. **UI components:** Preact+HTM, import from `/core/vendor/preact-htm.js`, `export default function`
4. **Always handle null data** in ui.js
5. **Use CSS variables** for colors/fonts — don't hardcode
6. **Use `cls()`** for scoped class names — never raw class strings
7. **Return data from filters** — forgetting `return` silently drops the data
8. **Keep manifests accurate** — the shell relies on them for layout
9. **Test before deploying** — `go test ./...`
