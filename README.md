<h1 align="center">🦞 Clawboard</h1>

<p align="center">
  <strong>Eyes for your AI agent.</strong><br>
  Stop asking. Start seeing.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-c9a84c?style=flat-square" alt="Version">
  <img src="https://img.shields.io/badge/built_with-Vel_⚡-ff6b35?style=flat-square" alt="Built with Vel">
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="License">
</p>

---

You have an AI agent on Telegram. You ask it things — *"what's my CPU at?"*, *"how much quota left?"*, *"any cron jobs failing?"*

It answers. But that's a message, a wait, and tokens burned. Every. Single. Time.

**Clawboard gives you a live dashboard instead.** Open a tab. Everything's right there — updating in real time. No more asking for numbers your screen could just show you.

<p align="center">
  <img src="./screenshots/dashboard-mobile.png" alt="Clawboard Dashboard" width="600">
</p>

---

## What's on your dashboard

<table>
<tr>
<td align="center" width="25%">⚡ <strong>CPU</strong></td>
<td align="center" width="25%">🧠 <strong>Memory</strong></td>
<td align="center" width="25%">💾 <strong>Disk</strong></td>
<td align="center" width="25%">⏱ <strong>Uptime</strong></td>
</tr>
<tr>
<td align="center">⚙️ <strong>Processes</strong></td>
<td align="center">🔧 <strong>OpenClaw</strong></td>
<td align="center">📊 <strong>Claude Usage</strong></td>
<td align="center">📅 <strong>Cron Jobs</strong></td>
</tr>
<tr>
<td align="center">🤖 <strong>Models</strong></td>
<td align="center">🌐 <strong>Browser Relay</strong></td>
<td align="center" colspan="2">✨ <strong>Whatever you want next</strong></td>
</tr>
</table>

All live. All WebSocket. Nothing stale.

---

## It grows with you

These 10 panels are just what it ships with. Want to see your database performance? Your Docker containers? Your stock portfolio? Your CI pipeline?

**Tell your agent.** It builds the panel. The framework makes sure it works — streaming, layout, error handling, auth. All handled. You don't touch any of that.

This is the part that matters: **you don't need to know how it works.** You just need to know what you want to see. Your agent handles the rest, and the framework makes sure it can't mess it up.

---

## Browser Relay

Your agent can see and control a real browser. Pair yours with a 6-character code and it gets access — no setup, no extensions.

📖 **[Learn more →](./RELAY.md)**

---

## Built on Vel

Clawboard runs on **[Vel](https://github.com/essdee/vel)** — an AI-native framework designed so agents build things that just work. Single binary. No dependencies. Framework-enforced correctness.

Your agent writes the interesting parts. The framework guarantees everything else. That's why you can trust it to keep adding panels without things breaking.

---

## Get started

```bash
cd your-vel-app/apps/
git clone https://github.com/karthikeyan5/clawboard.git
cd /path/to/vel && ./vel build && ./vel start
```

---

## License

[MIT](./LICENSE)

---

<p align="center">
  <sub>Part of the <a href="https://github.com/openclaw/openclaw">OpenClaw</a> ecosystem 🦞</sub>
</p>
