<p align="center">
  <img src="./screenshots/dashboard-mobile.png" alt="Clawboard Dashboard" width="300">
</p>

<h1 align="center">🦞 Clawboard</h1>

<p align="center">
  <strong>Real-time dashboard for OpenClaw agents.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-3.0.0-c9a84c?style=flat-square" alt="Version">
  <img src="https://img.shields.io/badge/built_with-Vel_⚡-ff6b35?style=flat-square" alt="Built with Vel">
  <img src="https://img.shields.io/badge/panels-9-00ADD8?style=flat-square" alt="Panels">
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="License">
</p>

<p align="center">
  <sub>Built on <a href="https://github.com/essdee/vel">Vel</a> — the AI-native Go framework for real-time web apps.</sub>
</p>

---

## Your agent shouldn't waste tokens telling you the time

Every *"what's my CPU at?"* costs tokens. Every *"how much Claude quota left?"* — more tokens. You're burning money to ask questions a dashboard could answer in zero seconds, forever.

**Clawboard is a real-time dashboard for [OpenClaw](https://github.com/openclaw/openclaw) agents.** One binary. No dependencies. Your agent talks less. You see more.

---

## What you get

| Panel | What it shows |
|-------|---------------|
| ⚡ **CPU** | Load %, core count, color-coded bar |
| 🧠 **Memory** | Used/total GB, percentage bar |
| 💾 **Disk** | Usage per mount point |
| ⏱ **Uptime** | System uptime + hostname |
| ⚙️ **Processes** | Running/sleeping/total |
| 🔧 **OpenClaw Status** | Version, sessions, channel |
| 📊 **Claude Usage** | 5-hour + 7-day quotas with reset countdowns |
| 📅 **Cron Jobs** | List, status, run/enable/disable buttons |
| 🤖 **Models** | Primary, fallback, sub-agent routing |

All panels update every 2 seconds via WebSocket. No polling. No refresh.

---

## Screenshots

<table>
<tr>
<td><img src="./screenshots/landing-mobile.png" alt="Landing" width="280"></td>
<td><img src="./screenshots/dashboard-mobile.png" alt="Dashboard" width="280"></td>
</tr>
<tr>
<td align="center"><sub>Personality landing page</sub></td>
<td align="center"><sub>Live dashboard</sub></td>
</tr>
</table>

---

## Install

```bash
git clone https://github.com/karthikeyan5/clawboard.git
cd clawboard
go build -o clawboard .
cp config.example.json config.json  # edit with your bot token + user IDs
BOT_TOKEN=your-token ./clawboard
```

Open `localhost:3700`. That's it.

### Or let your agent do it

> Set up Clawboard from https://github.com/karthikeyan5/clawboard

It reads [`AGENT-SETUP.md`](./AGENT-SETUP.md) and handles cloning, config, nginx, SSL, systemd — everything.

### Development mode

```bash
TEST_MODE=true BOT_TOKEN=dummy ./clawboard
```

---

## How it works

Clawboard is built on [**Vel**](https://github.com/essdee/vel), an AI-native Go framework for real-time panel-based apps.

```
Browser ←── WebSocket (2s) ──→ Clawboard (Go/Vel) ──→ System metrics
   │                              │                      (gopsutil)
   │                              ├──→ OpenClaw CLI
   │                              ├──→ Claude usage JSON
   └── Preact+HTM (5KB, no build) └──→ Cron jobs
```

Clawboard adds **9 OpenClaw-specific panels** on top of Vel's panel architecture, hook engine, auth system, and plugin support.

For framework documentation (panel contracts, hooks, CSS, architecture decisions), see the [Vel docs](https://github.com/essdee/vel).

---

## Config

```json
{
  "name": "My Agent",
  "emoji": "🤖",
  "accent": "#c9a84c",
  "traits": ["Loyal", "Sharp", "Resourceful"],
  "quote": "I don't wait for permission.",
  "auth": { "allowedUsers": [123456789] },
  "panels": { "order": ["cpu", "memory", "disk", "claude-usage"] }
}
```

Your agent gets a personality. Your dashboard gets a soul.

---

## Why not Grafana / Uptime Kuma / Dashy?

| | Clawboard | Grafana | Uptime Kuma | Dashy |
|---|-----------|---------|-------------|-------|
| Built for AI agents | ✅ | ❌ | ❌ | ❌ |
| Claude/LLM quota tracking | ✅ | ❌ | ❌ | ❌ |
| Cron job management | ✅ | ❌ | ❌ | ❌ |
| Agent installs it | ✅ | ❌ | ❌ | ❌ |
| Single binary | ✅ | ❌ | ❌ | ❌ |
| RAM usage | 2.6MB | 200MB+ | 80MB+ | 50MB+ |
| Setup time | 60 seconds | Hours | Minutes | Minutes |

---

## Extending Clawboard

Clawboard uses Vel's extension system. See the [Vel AGENT-EXTEND.md](https://github.com/essdee/vel/blob/main/AGENT-EXTEND.md) for how to:

- Add custom panels
- Override core panels
- Install plugins
- Register hooks
- Create themes

---

## Contributing

```bash
go test ./... -race
```

PRs welcome. See [Vel TESTING.md](https://github.com/essdee/vel/blob/main/TESTING.md) for testing strategy.

---

## License

[MIT](./LICENSE)

---

<p align="center">
  <sub>Built on <a href="https://github.com/essdee/vel">Vel ⚡</a> for <a href="https://github.com/openclaw/openclaw">OpenClaw</a>.</sub>
</p>
