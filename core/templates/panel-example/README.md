# Example Panel Template

This is a complete working panel that demonstrates the panel architecture.

## Structure

```
example-panel/
├── manifest.json   ← Panel metadata (name, size, position, config schema)
├── api.js          ← Server-side data endpoint (Node.js)
└── ui.js           ← Client-side UI component (Lit web component)
```

## How to Use This Template

### 1. Copy to custom/panels/ or custom/overrides/

```bash
cp -r core/templates/panel-example custom/panels/my-new-panel
```

### 2. Edit manifest.json

Change the `id`, `name`, and `description` to match your panel.

```json
{
  "id": "my-new-panel",
  "name": "My New Panel",
  "description": "Does something cool"
}
```

### 3. Edit api.js (server-side logic)

Add your data collection logic:
- Read files
- Query databases
- Call APIs
- Run shell commands
- Access OpenClaw internals

### 4. Edit ui.js (client-side rendering)

Customize the HTML template and styles. Use Lit's reactive properties and lifecycle methods.

### 5. Restart the server

```bash
sudo systemctl restart clawboard
```

The panel will be auto-discovered and loaded.

## Key Concepts

### Reactive Properties

```javascript
static properties = {
  data: { type: Object }
};
```

When you set `this.data = newData`, Lit automatically re-renders the component.

### CSS Variables

You have access to all core CSS variables:
- `--accent`, `--accent-dim`
- `--green`, `--red`, `--yellow`, `--cyan`
- `--text`, `--text-dim`, `--text-mid`
- `--card`, `--card-border`

### Hooks

Your API can interact with the hook system:

```javascript
// Listen to actions
hooks.on('server.ready', (server) => {
  console.log('Server is ready!');
});

// Modify data with filters
hooks.addFilter('panel.my-panel.data', (data) => {
  data.extraField = 'custom value';
  return data;
});
```

### Auth

The auth check is already built-in — just copy the pattern from the template.

## Panel Sizes

- `"half"` — 50% width (2 columns)
- `"full"` — 100% width (spans both columns)

## Refresh Rate

Set `refreshMs` in manifest.json. The shell will fetch fresh data at this interval via WebSocket.

## Custom Events

Dispatch custom events to communicate with the shell:

```javascript
this.dispatchEvent(new CustomEvent('my-custom-event', {
  detail: { foo: 'bar' },
  bubbles: true,
  composed: true
}));
```

Listen in the shell's JavaScript or in custom/hooks.js.

## Further Reading

- Lit docs: https://lit.dev
- Hook system: see core/lib/hooks.js
- Auth system: see core/lib/auth.js
