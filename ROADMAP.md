# OpenClaw Dashboard Kit — Roadmap

## Architecture: Path A (Dashboard-first, App-capable)

Each version adds one layer. Panels and plugins written for v2 will work in v6.

---

### v2 — Modular Dashboard ✅ (Current)
**Adds:** Panel architecture + hook system + custom folder + error boundaries + templates

**You can build:** Read-only dashboards, monitoring, live metrics, status pages

**Core:**
- 9 built-in panels (CPU, Memory, Disk, Uptime, Processes, Claude Usage, Crons, Models, OpenClaw Status)
- WordPress-style hooks (actions + filters)
- Panel contract: manifest.json + api.js + ui.js (Preact+HTM components)
- Override system: custom/overrides/ folder name match = override
- Plugin support: git clone into plugins/
- Error boundaries: bad panel → fallback to core, dashboard never crashes
- Auto-update: git pull core/, safety checks, opt-in

---

### v3 — Interactive Apps (Planned)
**Adds:** SQLite store + forms + CRUD operations

**You can build:** Todo apps, trackers, note-taking, simple data management

**Store contract:**
```javascript
store.get('todos', id)
store.list('todos', { filter, sort, page })
store.create('todos', data)
store.update('todos', id, data)
store.delete('todos', id)
```

**Form contract:**
```javascript
// Panel declares forms in manifest.json
"forms": {
  "create": {
    "fields": [
      { "name": "title", "type": "text", "required": true },
      { "name": "due", "type": "date" },
      { "name": "priority", "type": "select", "options": ["low", "medium", "high"] }
    ]
  }
}
```

**Key decisions:**
- Default store: SQLite (zero setup, single file)
- Swappable adapters: PostgreSQL, MySQL for production scale
- Panels declare data schema in manifest.json
- Auto-migration when schemas change
- Core renders forms from JSON schema, validates, handles submission

---

### v4 — Multi-Page Apps (Planned)
**Adds:** Routing + pages + sidebar navigation

**You can build:** Multi-page apps, wikis, project management tools

**Page concept:**
```json
{
  "pages": {
    "dashboard": { "panels": ["cpu", "memory", "disk"], "icon": "📊" },
    "todos": { "panels": ["todo-list", "todo-stats"], "icon": "✅" },
    "erp": {
      "pages": {
        "invoices": { "panels": ["invoice-list"] },
        "vendors": { "panels": ["vendor-list"] }
      }
    }
  }
}
```

- Sidebar/tab navigation auto-generated from config
- URL routing: /dashboard, /todos, /erp/invoices
- Breadcrumbs for nested pages
- Panel lazy-loading (only load panels for current page)

---

### v5 — Team Apps (Planned)
**Adds:** Roles + permissions

**You can build:** Team workspaces, shared apps, basic ERP

**Role-based access:**
```json
{
  "roles": {
    "admin": { "users": [123], "access": "*" },
    "manager": { "users": [456], "access": ["dashboard", "erp.*"] },
    "team": { "users": [789], "access": ["todos.own", "dashboard"] }
  }
}
```

- Panels declare required permission in manifest
- Core filters pages/panels based on user role
- Row-level security for store queries (own vs all)

---

### v6 — Full Platform (Planned)
**Adds:** Inter-panel events + search + file handling + notifications

**You can build:** Full ERP, CRM, document management, any business app

- **Event bus:** `ctx.emit('invoice.created', data)` / `ctx.on('invoice.created', handler)`
- **Shared state:** `ctx.state.set('selectedDate', '2026-02-25')` — reactive, all panels update
- **Search:** Core search endpoint across all panel stores, SQLite FTS5
- **Files:** Upload endpoint, data/files/ storage, panel API for attachments
- **Notifications:** Server push → WebSocket + OpenClaw message tool (Telegram/Discord/etc.)

---

## Design Principles (All Versions)

1. **Config over code** — Users customize via config.json, never edit core/
2. **Convention over configuration** — Predictable file locations, consistent contracts
3. **AI-agent-first** — Manifest-driven, template-rich, validation built in
4. **Graceful degradation** — Bad plugin → error card → fallback to core
5. **Forward compatible** — v2 plugins work in v6 without changes
6. **Zero build step** — No webpack, no bundler, just Node.js + browser ES modules
