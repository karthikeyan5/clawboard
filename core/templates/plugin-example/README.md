# Plugin Example

A complete plugin structure that demonstrates:
- Panels
- Hooks
- Custom routes

## Installation

```bash
cd plugins/
git clone https://github.com/your-username/your-plugin.git
```

Restart the dashboard server. The plugin will be auto-discovered.

## Structure

```
my-plugin/
├── manifest.json           ← Plugin metadata
├── hooks.js                ← Register hooks (actions & filters)
├── routes/                 ← Custom API endpoints
│   └── custom-endpoint.js
└── panels/                 ← Plugin panels
    └── my-panel/
        ├── manifest.json
        ├── api.js
        └── ui.js
```

## Hooks

Plugins can register hooks to modify dashboard behavior:

### Actions (fire-and-forget)

```javascript
hooks.on('server.init', (app) => {
  console.log('Server starting!');
});
```

### Filters (data transformation)

```javascript
hooks.addFilter('panel.cpu.data', (data) => {
  data.temperature = getTemperature();
  return data;
});
```

### Available Hooks

**Actions:**
- `server.init` — Fired when Express app is created (before routes)
- `server.ready` — Fired when server starts listening
- `panels.discovered` — Fired after panel discovery

**Filters:**
- `panels.order` — Modify panel order/visibility
- `panel.{id}.data` — Modify panel data before sending to client
- `api.config` — Modify safe config sent to client
- `api.panels` — Modify panel manifest list
- `api.usage` — Modify Claude usage data
- `api.metrics` — Modify system metrics
- `api.agent` — Modify agent info
- `api.crons` — Modify cron job list
- `ws.metrics` — Modify WebSocket metrics payload

## Custom Routes

Add custom API endpoints in `routes/*.js`:

```javascript
module.exports = (app, { hooks, config, auth }) => {
  app.get('/api/plugins/my-plugin/data', auth.requireAuth, (req, res) => {
    res.json({ hello: 'world' });
  });
};
```

## Panels

Plugin panels work exactly like core panels. See `core/templates/panel-example/` for details.

## Publishing

1. Create a GitHub repository
2. Add manifest.json with proper metadata
3. Document installation in README.md
4. Share the repo URL — users can clone it into `plugins/`
