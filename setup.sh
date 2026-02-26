#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────
# OpenClaw Dashboard — Interactive Setup
# Run: bash setup.sh
# ─────────────────────────────────────────────────────────────────
set -euo pipefail

BOLD='\033[1m'
DIM='\033[2m'
GOLD='\033[33m'
GREEN='\033[32m'
RED='\033[31m'
CYAN='\033[36m'
RESET='\033[0m'

echo ""
echo -e "${GOLD}${BOLD}  ╔═══════════════════════════════════════════╗${RESET}"
echo -e "${GOLD}${BOLD}  ║   🦞 OpenClaw Agent Dashboard — Setup    ║${RESET}"
echo -e "${GOLD}${BOLD}  ╚═══════════════════════════════════════════╝${RESET}"
echo ""

DIR="$(cd "$(dirname "$0")" && pwd)"
CONFIG="$DIR/config.json"
ENV_FILE="$DIR/.env"

# ── Helper ──
ask() {
  local prompt="$1" default="$2" var="$3"
  if [ -n "$default" ]; then
    read -rp "$(echo -e "${CYAN}${prompt}${RESET} ${DIM}[${default}]${RESET}: ")" val
    eval "$var='${val:-$default}'"
  else
    read -rp "$(echo -e "${CYAN}${prompt}${RESET}: ")" val
    eval "$var='$val'"
  fi
}

ask_yn() {
  local prompt="$1" default="$2"
  read -rp "$(echo -e "${CYAN}${prompt}${RESET} ${DIM}[${default}]${RESET}: ")" val
  val="${val:-$default}"
  [[ "$val" =~ ^[Yy] ]]
}

# ── 1. Agent Identity ──
echo -e "${BOLD}1. Agent Identity${RESET}"
echo -e "${DIM}   Customize how your dashboard looks${RESET}"
echo ""
ask "   Agent name" "My Agent" AGENT_NAME
ask "   Emoji" "🤖" AGENT_EMOJI
ask "   Subtitle/tagline" "Always watching. Always learning." AGENT_SUBTITLE
ask "   Role" "AI Assistant" AGENT_ROLE
ask "   Quote" "I don't wait for permission. I wait for the right moment." AGENT_QUOTE
ask "   Company name" "My Company" COMPANY
ask "   Accent color hex" "#c9a84c" ACCENT
echo ""

# ── 2. Telegram Bot ──
echo -e "${BOLD}2. Telegram Bot${RESET}"
echo -e "${DIM}   Create a bot via @BotFather if you haven't already${RESET}"
echo ""
ask "   Bot username (without @)" "" BOT_USERNAME
ask "   Bot token" "" BOT_TOKEN_VAL
echo ""

# ── 3. Domain ──
echo -e "${BOLD}3. Domain & Networking${RESET}"
echo ""
ask "   Dashboard domain (e.g. dashboard.example.com)" "" DOMAIN
ask "   Dashboard port" "3700" PORT

# ── 4. Allowed users ──
echo ""
echo -e "${BOLD}4. Allowed Telegram Users${RESET}"
echo -e "${DIM}   Only these user IDs can access the dashboard.${RESET}"
echo -e "${DIM}   Find your ID: message @userinfobot on Telegram${RESET}"
echo ""
ALLOWED_IDS=""
while true; do
  ask "   Telegram user ID (or 'done' to finish)" "" UID_INPUT
  [[ "$UID_INPUT" == "done" || -z "$UID_INPUT" ]] && break
  if [ -z "$ALLOWED_IDS" ]; then ALLOWED_IDS="$UID_INPUT"; else ALLOWED_IDS="$ALLOWED_IDS,$UID_INPUT"; fi
done
echo ""

# ── 5. Claude Max subscription ──
echo -e "${BOLD}5. Claude Max Subscription (Optional)${RESET}"
echo -e "${DIM}   If you have Anthropic Claude Max, the dashboard can show live usage stats.${RESET}"
echo -e "${DIM}   If not, the dashboard shows system metrics only — works perfectly fine.${RESET}"
echo ""
HAS_MAX=false
if ask_yn "   Do you have a Claude Max subscription? (y/n)" "n"; then
  HAS_MAX=true
  MONITOR_DIR="$DIR/claude-usage-monitor"
  if [ -d "$MONITOR_DIR" ]; then
    echo ""
    echo -e "   ${GREEN}✓${RESET} Claude usage monitor found."
    echo ""
    echo -e "   ${BOLD}Prerequisites:${RESET}"
    echo -e "   • ${CYAN}claude login${RESET} (full browser login — NOT setup-token)"
    echo -e "   • ${CYAN}jq${RESET} installed (apt install jq / brew install jq)"
    echo ""

    # Detect workspace
    WORKSPACE="${OPENCLAW_WORKSPACE:-$HOME/.openclaw/workspace}"
    ask "   OpenClaw workspace path" "$WORKSPACE" WORKSPACE

    # Install skill
    SKILL_DIR="$WORKSPACE/skills/claude-usage-monitor"
    mkdir -p "$SKILL_DIR/scripts"
    cp "$MONITOR_DIR/SKILL.md" "$SKILL_DIR/"
    cp "$MONITOR_DIR/README.md" "$SKILL_DIR/"
    cp "$MONITOR_DIR/scripts/claude-usage-poll.sh" "$SKILL_DIR/scripts/"
    chmod +x "$SKILL_DIR/scripts/claude-usage-poll.sh"
    echo -e "   ${GREEN}✓${RESET} Installed to $SKILL_DIR"

    # Test it
    echo ""
    if ask_yn "   Test the usage poll script now? (y/n)" "y"; then
      export CLAUDE_USAGE_OUTPUT="$WORKSPACE/claude-usage.json"
      if bash "$SKILL_DIR/scripts/claude-usage-poll.sh" 2>/dev/null; then
        echo -e "   ${GREEN}✓${RESET} Usage data written to $WORKSPACE/claude-usage.json"
      else
        echo -e "   ${RED}✗${RESET} Script failed. Make sure you've run 'claude login' first."
        echo -e "   ${DIM}   See claude-usage-monitor/README.md for troubleshooting.${RESET}"
      fi
    fi

    # Cron setup
    echo ""
    echo -e "   ${BOLD}Cron setup:${RESET}"
    echo -e "   ${DIM}To auto-update usage stats, add a cron job (system or OpenClaw).${RESET}"
    echo -e "   ${DIM}See claude-usage-monitor/README.md for options.${RESET}"
    echo ""
    echo -e "   Quick option — add to system crontab:"
    echo -e "   ${CYAN}* * * * * CLAUDE_USAGE_OUTPUT=\"$WORKSPACE/claude-usage.json\" bash \"$SKILL_DIR/scripts/claude-usage-poll.sh\"${RESET}"
  else
    echo ""
    echo -e "   ${RED}✗${RESET} claude-usage-monitor/ folder not found in the kit."
    echo -e "   ${DIM}   Download it separately and place it inside this directory.${RESET}"
  fi
else
  echo ""
  echo -e "   ${DIM}   Dashboard will show system metrics only (CPU, RAM, Disk, Uptime, etc.)${RESET}"
  echo -e "   ${DIM}   You can enable usage monitoring later — see claude-usage-monitor/README.md${RESET}"
fi
echo ""

# ── Generate config.json ──
echo -e "${BOLD}Generating config.json...${RESET}"

# Build allowed users JSON array
IFS=',' read -ra ID_ARR <<< "$ALLOWED_IDS"
USERS_JSON="["
first=true
for id in "${ID_ARR[@]}"; do
  id="$(echo "$id" | tr -d ' ')"
  [ -z "$id" ] && continue
  $first && first=false || USERS_JSON+=","
  USERS_JSON+="$id"
done
USERS_JSON+="]"

AUTH_URL="https://${DOMAIN}/auth/telegram/callback"
TG_LINK="https://t.me/${BOT_USERNAME}"

cat > "$CONFIG" << EOJSON
{
  "name": "${AGENT_NAME}",
  "emoji": "${AGENT_EMOJI}",
  "subtitle": "${AGENT_SUBTITLE}",
  "role": "${AGENT_ROLE}",
  "quote": "${AGENT_QUOTE}",
  "traits": ["Loyal", "Sharp", "Resourceful"],
  "cards": [
    {
      "icon": "🧠",
      "label": "Always Thinking",
      "text": "Research, analysis, automation — running 24/7 so you don't have to."
    },
    {
      "icon": "🔒",
      "label": "Dashboard",
      "text": "Sign in with Telegram to see system status and usage stats. Authorized users only."
    }
  ],
  "accent": "${ACCENT}",
  "accentName": "custom",
  "company": "${COMPANY}",
  "botUsername": "${BOT_USERNAME}",
  "authUrl": "${AUTH_URL}",
  "telegramLink": "${TG_LINK}",
  "allowedUsers": ${USERS_JSON},
  "port": ${PORT}
}
EOJSON
echo -e "   ${GREEN}✓${RESET} config.json written"

# ── Generate .env ──
echo "BOT_TOKEN=${BOT_TOKEN_VAL}" > "$ENV_FILE"
chmod 600 "$ENV_FILE"
echo -e "   ${GREEN}✓${RESET} .env written (chmod 600)"

# ── Install dependencies ──
echo ""
echo -e "${BOLD}Installing dependencies...${RESET}"
cd "$DIR"
npm install --production 2>&1 | tail -1
echo -e "   ${GREEN}✓${RESET} Dependencies installed"

# ── Nginx config ──
echo ""
echo -e "${BOLD}6. Nginx Reverse Proxy${RESET}"
if ask_yn "   Generate nginx server block? (y/n)" "y"; then
  NGINX_CONF="/etc/nginx/sites-available/${DOMAIN}"
  
  echo ""
  echo -e "   ${DIM}Do you handle SSL termination upstream (e.g. Cloudflare, load balancer)?${RESET}"
  UPSTREAM_SSL=false
  if ask_yn "   SSL terminated upstream? (y/n)" "n"; then
    UPSTREAM_SSL=true
  fi

  NGINX_BLOCK=""
  if $UPSTREAM_SSL; then
    NGINX_BLOCK="server {
    listen 80;
    server_name ${DOMAIN};

    location / {
        proxy_pass http://127.0.0.1:${PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection \"upgrade\";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 86400;
    }
}"
  else
    NGINX_BLOCK="server {
    listen 80;
    server_name ${DOMAIN};
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ${DOMAIN};

    ssl_certificate     /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:${PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection \"upgrade\";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_read_timeout 86400;
    }
}"
    echo ""
    echo -e "   ${DIM}Run this to get SSL certificates:${RESET}"
    echo -e "   ${CYAN}sudo certbot --nginx -d ${DOMAIN}${RESET}"
  fi

  echo ""
  echo -e "   ${BOLD}Your nginx config:${RESET}"
  echo ""
  echo -e "${DIM}───────────────────────────────────────────${RESET}"
  echo "$NGINX_BLOCK"
  echo -e "${DIM}───────────────────────────────────────────${RESET}"
  echo ""

  if ask_yn "   Write this to ${NGINX_CONF} and enable? (requires sudo) (y/n)" "y"; then
    echo "$NGINX_BLOCK" | sudo tee "$NGINX_CONF" > /dev/null
    sudo ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/ 2>/dev/null || true
    if sudo nginx -t 2>/dev/null; then
      sudo systemctl reload nginx
      echo -e "   ${GREEN}✓${RESET} Nginx configured and reloaded"
    else
      echo -e "   ${RED}✗${RESET} Nginx config test failed — check manually"
    fi
  else
    echo -e "   ${DIM}   Skipped. Copy the config above manually.${RESET}"
  fi
fi

# ── Systemd service ──
echo ""
echo -e "${BOLD}7. Systemd Service${RESET}"
if ask_yn "   Create systemd service (auto-start on boot)? (y/n)" "y"; then
  SERVICE_NAME="clawboard"
  CURRENT_USER="$(whoami)"
  
  sudo tee "/etc/systemd/system/${SERVICE_NAME}.service" > /dev/null << EOSVC
[Unit]
Description=OpenClaw Agent Dashboard
After=network.target

[Service]
Type=simple
User=${CURRENT_USER}
WorkingDirectory=${DIR}
EnvironmentFile=${ENV_FILE}
ExecStart=$(which node) core/server.js
Restart=on-failure
RestartSec=5
Environment=TZ=$(cat /etc/timezone 2>/dev/null || echo 'UTC')

[Install]
WantedBy=multi-user.target
EOSVC
  
  sudo systemctl daemon-reload
  sudo systemctl enable --now "$SERVICE_NAME"
  echo -e "   ${GREEN}✓${RESET} Service '${SERVICE_NAME}' created and started"
else
  echo ""
  echo -e "   ${DIM}   To start manually: node core/server.js${RESET}"
fi

# ── BotFather reminder ──
echo ""
echo -e "${GOLD}${BOLD}  ┌─────────────────────────────────────────┐${RESET}"
echo -e "${GOLD}${BOLD}  │  ⚠️  Don't forget: BotFather Setup      │${RESET}"
echo -e "${GOLD}${BOLD}  └─────────────────────────────────────────┘${RESET}"
echo ""
echo -e "   Open @BotFather on Telegram and configure:"
echo ""
echo -e "   ${BOLD}1. Set domain for Login Widget:${RESET}"
echo -e "      /mybots → ${BOT_USERNAME} → Bot Settings → Domain → ${CYAN}${DOMAIN}${RESET}"
echo ""
echo -e "   ${BOLD}2. Set Menu Button (optional):${RESET}"
echo -e "      /mybots → ${BOT_USERNAME} → Bot Settings → Menu Button"
echo -e "      URL: ${CYAN}https://${DOMAIN}/dashboard${RESET}"
echo ""
echo -e "   ${BOLD}3. Mini App (optional):${RESET}"
echo -e "      /newapp → select ${BOT_USERNAME} → Web App URL: ${CYAN}https://${DOMAIN}${RESET}"
echo ""

# ── Done ──
echo -e "${GREEN}${BOLD}  ✅ Setup complete!${RESET}"
echo ""
echo -e "   Dashboard: ${CYAN}https://${DOMAIN}${RESET}"
echo -e "   Health:    ${CYAN}https://${DOMAIN}/api/health${RESET}"
echo ""
echo -e "${DIM}   ─────────────────────────────────────────────────────────────${RESET}"
echo ""
echo -e "${BOLD}   Why this exists${RESET}"
echo ""
echo -e "   Every time you ask your agent ${CYAN}\"what's my CPU usage?\"${RESET} or"
echo -e "   ${CYAN}\"how much quota do I have left?\"${RESET}, that's a full round-trip —"
echo -e "   tokens in, tokens out, seconds of waiting."
echo ""
echo -e "   This dashboard moves those read-heavy interactions out of"
echo -e "   chat and into a live UI. No tokens burned. No waiting."
echo -e "   Just open and look."
echo ""
echo -e "   But this is just one example. Your agent can build ${BOLD}any${RESET}"
echo -e "   interface — approval workflows, report viewers, data entry"
echo -e "   forms, monitoring panels — anything where a direct UI beats"
echo -e "   a chat round-trip. ${BOLD}The agent builds it once, you use it forever.${RESET}"
echo ""
