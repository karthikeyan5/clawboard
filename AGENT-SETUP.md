# Agent Setup Instructions — Clawboard

**For AI agents:** Follow these steps when a user asks you to set up Clawboard.

Clawboard is built on [Vel](https://github.com/essdee/vel). For framework concepts (panels, hooks, plugins), see the [Vel docs](https://github.com/essdee/vel).

---

## Step 0 — Clone

```bash
cd ~/.openclaw/workspace
git clone https://github.com/karthikeyan5/clawboard.git
cd clawboard
```

## Step 1 — Ask the user (one message)

> I'll set up your dashboard! I need a few details:
>
> 1. **Agent name** — What should the dashboard call me?
> 2. **Emoji** — Pick an emoji for the avatar (e.g. 🤖, ⚡, 🦞)
> 3. **Subtitle/tagline** — A short line under the name
> 4. **Role** — What appears as my title
> 5. **Quote** — A philosophy quote for the landing page
> 6. **Company name** — For the footer
> 7. **Accent color** — 🟡 Gold (#c9a84c), 🔴 Red (#e94560), 🔵 Cyan (#00d2ff), 🟣 Purple (#a855f7), 🟢 Green (#22c55e), 🟠 Orange (#f97316), or custom hex
> 8. **Dashboard domain** — The domain you'll point to this server
> 9. **Do you have a Claude Max subscription?** — For usage monitoring

Wait for their response before proceeding.

## Step 2 — Get bot credentials

Check if the Telegram bot token is in your OpenClaw config:

```bash
cat ~/.openclaw/openclaw.json | grep -o '"token"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1
```

If not found, ask the user for their bot token from @BotFather.

## Step 3 — Get allowed user IDs

You likely know the user's Telegram ID from chat metadata. Ask if anyone else should have access.

## Step 4 — Write config.json

```json
{
  "name": "<agent_name>",
  "emoji": "<emoji>",
  "subtitle": "<subtitle>",
  "role": "<role>",
  "quote": "<quote>",
  "traits": ["Loyal", "Sharp", "Resourceful"],
  "cards": [
    { "icon": "🧠", "label": "Always Thinking", "text": "Research, analysis, automation — running 24/7." },
    { "icon": "🔒", "label": "Dashboard", "text": "Sign in with Telegram to see system status." }
  ],
  "accent": "<accent_hex>",
  "accentName": "custom",
  "company": "<company>",
  "botUsername": "<bot_username>",
  "authUrl": "https://<domain>/auth/telegram/callback",
  "telegramLink": "https://t.me/<bot_username>",
  "allowedUsers": [<user_ids>],
  "port": 3700
}
```

## Step 5 — Write .env

```bash
echo "BOT_TOKEN=<bot_token>" > .env
chmod 600 .env
```

## Step 6 — Build

```bash
go build -o clawboard .
```

## Step 7 — Claude Max setup (if applicable)

If the user has Claude Max:

1. Check if `claude` CLI is authenticated: `which claude && cat ~/.claude/.credentials.json | grep -c "user:profile"`
2. Test the monitor: `CLAUDE_USAGE_OUTPUT=~/.openclaw/workspace/claude-usage.json bash ./core/services/claude-usage-monitor/scripts/claude-usage-poll.sh`
3. Set up a cron job (every minute) for the poll script
4. If not authenticated, tell the user to run `claude login` once

## Step 8 — Nginx + Systemd

Set up nginx reverse proxy and systemd service. See [Vel AGENT-SETUP.md](https://github.com/essdee/vel/blob/main/AGENT-SETUP.md) Steps 5-6 for the standard setup — use port 3700 and service name `clawboard`.

## Step 9 — Tell the user

> ✅ Dashboard is live at `https://<domain>`
>
> **One thing you need to do** — open @BotFather:
> 1. `/mybots` → select your bot → `Bot Settings` → `Domain` → enter: `<domain>`
> 2. Optionally set Menu Button: `📊 Dashboard` → `https://<domain>/dashboard`

## Error Handling

- `go build` fails → needs Go 1.22+
- Port 3700 in use → change in config.json
- Service fails → `journalctl -u clawboard -f`
- "Bot domain invalid" → BotFather domain not set
