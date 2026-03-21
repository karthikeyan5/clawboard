#!/bin/bash
# Multi-agent aware: reads sessions from ALL agent directories
OUTPUT_FILE="$HOME/.openclaw/workspace/sessions-summary.json"

python3 << 'PYEOF'
import json, time, sys, os, glob

home = os.path.expanduser("~")
AGENTS_DIR = os.path.join(home, ".openclaw/agents")
OUTPUT_FILE = os.path.join(home, ".openclaw/workspace/sessions-summary.json")

# Discover all agent session files
d = {}
agent_ids = set()
for sessions_file in glob.glob(os.path.join(AGENTS_DIR, "*/sessions/sessions.json")):
    agent_id = sessions_file.split("/agents/")[1].split("/sessions/")[0]
    agent_ids.add(agent_id)
    try:
        with open(sessions_file) as f:
            agent_sessions = json.load(f)
            d.update(agent_sessions)
    except:
        pass

if not d:
    with open(OUTPUT_FILE, 'w') as f:
        json.dump({"error": "Cannot read sessions", "agentsScanned": list(agent_ids)}, f)
    sys.exit(0)

now = time.time() * 1000
sessions = []
by_kind = {"main": 0, "cron": 0, "subagent": 0, "dm": 0, "other": 0}
by_model = {}

for k, v in d.items():
    # Extract agentId from session key (agent:<agentId>:...)
    agent_id = "main"
    if k.startswith("agent:"):
        parts = k.split(":")
        if len(parts) >= 2:
            agent_id = parts[1]

    if k.endswith(":main"):
        kind = "main"
    elif ":cron:" in k:
        kind = "cron"
    elif ":subagent:" in k or ":spawn:" in k:
        kind = "subagent"
    elif ":dm:" in k:
        kind = "dm"
    else:
        kind = "other"

    # Skip individual cron run sessions (keep only the persistent cron session)
    # Pattern: agent:main:cron:<job-id>:run:<hash> — skip these
    if kind == "cron" and ":run:" in k:
        continue

    # Skip slash command sessions (ephemeral, not real conversations)
    if ":slash:" in k:
        continue

    by_kind[kind] = by_kind.get(kind, 0) + 1

    model = v.get("model", "unknown")
    short_model = model.split("/")[-1] if "/" in model else model
    by_model[short_model] = by_model.get(short_model, 0) + 1

    updated = v.get("updatedAt", 0)
    age_mins = (now - updated) / 60000 if updated else 999999

    # Extract user info from origin or key
    origin = v.get("origin", {})
    user_label = ""
    provider = ""
    chat_type = v.get("chatType", "")

    if isinstance(origin, dict):
        user_label = origin.get("label", "")
        provider = origin.get("provider", "")
        if not chat_type:
            chat_type = origin.get("chatType", "")

    # Extract telegram user ID from key
    # For DMs: agent:<id>:telegram:direct:<userId> → userId
    # For groups/topics: use the session's last sender or fall back to origin
    telegram_id = ""
    if ":telegram:direct:" in k:
        telegram_id = k.split(":telegram:direct:")[-1].split(":")[0]
    elif ":telegram:group:" in k:
        # Group/topic session — try to find the actual user from origin or delivery context
        # For now, extract from deliveryContext or mark as group
        dc = v.get("deliveryContext", {})
        last_to = dc.get("to", "") or v.get("lastTo", "")
        # lastTo for groups is "telegram:<groupId>", not useful
        # Check if origin has sender info
        orig = v.get("origin", {})
        orig_from = orig.get("from", "")
        # Group sessions: associate with the configured allowFrom user
        # This is a reasonable default for single-user groups
        telegram_id = ""  # Will be empty for groups — UI should handle this

    # Agent display names
    AGENT_NAMES = {
        "main": "Ram",
        "architect": "Architect Ram",
        "coder": "Coder Ram",
        "sentinel": "Sentinel Ram",
    }

    # Topic display names (for known groups)
    TOPIC_NAMES = {
        "2": "Architect",
        "3": "Coder",
        "4": "Sentinel",
        "1": "General",
    }

    # Build label
    label = v.get("label", "")
    if not label:
        if kind == "main":
            label = "Main Session"
        elif ":topic:" in k:
            # Forum topic session — extract topic ID and build clean label
            topic_id = k.split(":topic:")[-1] if ":topic:" in k else ""
            topic_name = TOPIC_NAMES.get(topic_id, "Topic " + topic_id)
            agent_name = AGENT_NAMES.get(agent_id, agent_id.title())
            label = agent_name + " — " + topic_name
        elif ":telegram:group:" in k and agent_id != "main":
            # Non-main agent in a group (no topic) — probably General
            agent_name = AGENT_NAMES.get(agent_id, agent_id.title())
            label = agent_name + " — Group"
        elif ":telegram:" in k and user_label:
            label = user_label.split(" (")[0] if " (" in user_label else user_label
        elif kind == "subagent":
            # Try to extract task from session transcript
            sf = v.get("sessionFile", "")
            if sf:
                try:
                    with open(sf) as tf:
                        for tline in tf:
                            tmsg = json.loads(tline)
                            if tmsg.get("type") == "message" and tmsg.get("message", {}).get("role") == "user":
                                txt = ""
                                mc = tmsg["message"].get("content", [])
                                if isinstance(mc, list):
                                    for cc in mc:
                                        if isinstance(cc, dict) and cc.get("type") == "text":
                                            txt = cc["text"]
                                            break
                                elif isinstance(mc, str):
                                    txt = mc
                                # Extract after [Subagent Task]:
                                if "[Subagent Task]:" in txt:
                                    txt = txt.split("[Subagent Task]:")[1].strip()
                                # Take first meaningful line
                                for tl in txt.split("\n"):
                                    tl = tl.strip()
                                    if tl and not tl.startswith("[") and not tl.startswith("#"):
                                        label = tl[:60]
                                        break
                                break
                except:
                    pass
            if not label:
                label = "Sub-agent " + k.split(":")[-1][:8]
        else:
            # Fallback: use agent name if non-main, otherwise key fragment
            if agent_id != "main":
                agent_name = AGENT_NAMES.get(agent_id, agent_id.title())
                label = agent_name
            else:
                parts = k.split(":")
                label = parts[-1][:16] if len(parts) > 1 else k[:16]

    max_ctx = v.get("contextTokens", 200000)
    inp = v.get("inputTokens", 0)
    out = v.get("outputTokens", 0)
    total = v.get("totalTokens", 0)
    ctx_pct = round((total / max_ctx) * 100, 1) if max_ctx > 0 and total > 0 else 0

    sessions.append({
        "key": k[:120],
        "agentId": agent_id,
        "kind": kind,
        "label": label[:60],
        "model": short_model,
        "usedTokens": total,
        "maxContextTokens": max_ctx,
        "contextPct": ctx_pct,
        "inputTokens": inp,
        "outputTokens": out,
        "totalTokens": total,
        "updatedAt": updated,
        "ageMins": round(age_mins, 1),
        "active": age_mins < 60,
        "userLabel": user_label[:60],
        "provider": provider,
        "chatType": chat_type,
        "telegramId": telegram_id,
    })

sessions.sort(key=lambda s: s["updatedAt"], reverse=True)
active = [s for s in sessions if s["active"]]

by_agent = {}
for s in sessions:
    aid = s.get("agentId", "main")
    by_agent[aid] = by_agent.get(aid, 0) + 1

result = {
    "total": len(sessions),
    "active": len(active),
    "byKind": by_kind,
    "byModel": by_model,
    "byAgent": by_agent,
    "agentIds": sorted(agent_ids),
    "recent": sessions[:30],
    "ts": int(now),
}

with open(OUTPUT_FILE, "w") as f:
    json.dump(result, f)
PYEOF
