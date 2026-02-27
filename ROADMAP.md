# Clawboard — Roadmap

Clawboard is built on [Vel](https://github.com/essdee/vel). Framework features (store, pages, roles, events) come from Vel. This roadmap covers Clawboard-specific panels and OpenClaw integration.

---

### v3.0 — Dashboard ✅ CURRENT
- 9 built-in panels (CPU, Memory, Disk, Uptime, Processes, Claude Usage, Crons, Models, OpenClaw Status)
- Real-time WebSocket updates
- Telegram auth
- Config-driven personality (name, emoji, accent, traits, quote)
- Claude Max usage monitoring (5-hour + 7-day quotas)

---

### v3.1 — Enhanced Monitoring
- **Network panel** — bandwidth, connections, latency
- **Logs panel** — tail OpenClaw logs with filtering
- **Alerts** — threshold-based notifications via Telegram

### v3.2 — Agent Insights
- **Session history panel** — past conversations, token usage per session
- **Cost tracker panel** — daily/weekly/monthly spend across models
- **Memory panel** — visualize agent memory entries

### v3.3 — Management
- **Plugin manager panel** — install/update/remove plugins from the dashboard
- **Config editor panel** — edit config.json from the UI
- **Backup panel** — one-click workspace backups

---

*Framework features (store, forms, pages, roles, events) are tracked in the [Vel roadmap](https://github.com/essdee/vel/blob/main/ROADMAP.md).*
