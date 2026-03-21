import { html, useState, useMemo } from '/core/vendor/preact-htm.js';

const fmtTokens = (n) => {
  if (!n || n === 0) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(n);
};

const fmtAge = (mins) => {
  if (mins < 1) return 'now';
  if (mins < 60) return Math.floor(mins) + 'm';
  if (mins < 1440) return Math.floor(mins / 60) + 'h';
  return Math.floor(mins / 1440) + 'd';
};

const fmtFetchedAt = (ts) => {
  if (!ts) return '';
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return mins + 'm ago';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + 'h ' + (mins % 60) + 'm ago';
  return new Date(ts).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
};

const kindColor = {
  main: 'var(--accent)',
  cron: 'var(--green)',
  subagent: '#8b5cf6',
  dm: '#3b82f6',
  other: 'var(--text-dim)',
};

const kindIcon = { main: '●', cron: '⏱', subagent: '⚡', dm: '💬', other: '○' };

const ctxBarColor = (pct) => {
  if (pct > 80) return 'var(--red)';
  if (pct > 50) return '#f0ad4e';
  return 'var(--green)';
};

/* Detect current user from Telegram WebApp or URL */
const getCurrentUserId = () => {
  try {
    if (window.Telegram?.WebApp?.initDataUnsafe?.user?.id) {
      return String(window.Telegram.WebApp.initDataUnsafe.user.id);
    }
  } catch(e) {}
  return null;
};

// Pulse animation injected once
const PulseStyle = () => html`<style>
  @keyframes vel-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }
  .vel-pulse-dot { animation: vel-pulse 1.5s ease-in-out infinite; }
</style>`;

function ActivityDot({ s }) {
  if (s.working === true) {
    return html`<span
      class="vel-pulse-dot"
      style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#22c55e;flex-shrink:0"
      title=${s.kind + ' — working'}
    ></span>`;
  }
  if (s.ageMins < 5) {
    return html`<span
      style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#eab308;flex-shrink:0"
      title=${s.kind + ' — recent'}
    ></span>`;
  }
  return html`<span
    style="display:inline-block;width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,0.15);flex-shrink:0"
    title=${s.kind}
  ></span>`;
}

function SessionRow({ s }) {
  const pct = s.contextPct || 0;
  const hasCtx = s.usedTokens > 0 || s.totalTokens > 0;
  const maxCtx = s.maxContextTokens || 200000;
  const used = s.usedTokens || s.totalTokens || 0;
  const modelShort = (s.model || '').replace('claude-', '').replace('-4-6', '4.6').replace('-latest', '');

  // Build info chips
  const chips = [];
  if (s.agentId && s.agentId !== 'main') chips.push({ text: s.agentId, color: '#f59e0b' });
  if (s.provider) chips.push({ text: s.provider, color: '#3b82f6' });
  if (s.chatType) chips.push({ text: s.chatType, color: 'var(--text-dim)' });
  if (modelShort) chips.push({ text: modelShort, color: '#8b5cf6' });

  return html`
    <div style="padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.03);opacity:${s.active ? 1 : 0.5}">
      <!-- Top row: activity dot, label, age -->
      <div style="display:flex;align-items:center;gap:8px">
        <${ActivityDot} s=${s} />
        <div style="flex:1;min-width:0">
          <div style="font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.label}</div>
          ${s.userLabel && s.kind !== 'cron' && html`
            <div style="font-size:9px;color:var(--text-dim);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.userLabel}</div>
          `}
        </div>
        <span style="font-size:9px;color:var(--text-dim);font-family:'JetBrains Mono',monospace;flex-shrink:0">${fmtTokens(s.totalTokens)} tok</span>
        <span style="font-size:9px;color:${s.active ? 'var(--green)' : 'var(--text-dim)'};font-family:'JetBrains Mono',monospace;flex-shrink:0;width:28px;text-align:right">${fmtAge(s.ageMins)}</span>
      </div>
      <!-- Info chips: provider, chatType, model -->
      ${chips.length > 0 && html`
        <div style="display:flex;gap:4px;margin-top:3px;padding-left:16px;flex-wrap:wrap">
          ${chips.map(c => html`
            <span style="font-size:8px;padding:1px 5px;border-radius:6px;background:rgba(255,255,255,0.05);color:${c.color};font-family:'JetBrains Mono',monospace">${c.text}</span>
          `)}
        </div>
      `}
      <!-- Context bar -->
      ${hasCtx && html`
        <div style="display:flex;align-items:center;gap:8px;margin-top:4px;padding-left:16px">
          <div style="flex:1;height:3px;background:rgba(255,255,255,0.05);border-radius:2px;overflow:hidden">
            <div style="height:100%;width:${Math.min(pct, 100)}%;background:${ctxBarColor(pct)};border-radius:2px;transition:width 0.3s"></div>
          </div>
          <span style="font-size:8px;color:var(--text-dim);font-family:'JetBrains Mono',monospace;flex-shrink:0;min-width:60px;text-align:right">
            ${fmtTokens(used)}/${fmtTokens(maxCtx)} (${Math.round(pct)}%)
          </span>
        </div>
      `}
    </div>
  `;
}

function CollapsibleGroup({ title, icon, count, sessions, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);

  if (!sessions || sessions.length === 0) return null;

  return html`
    <div style="margin-bottom:4px">
      <button
        onClick=${() => setOpen(!open)}
        style="display:flex;align-items:center;gap:6px;width:100%;padding:4px 0;border:none;background:none;color:var(--text);cursor:pointer;font-size:10px;text-transform:uppercase;letter-spacing:0.5px"
      >
        <span style="font-size:8px;transition:transform 0.2s;transform:rotate(${open ? '90deg' : '0deg'})">\u25B6</span>
        <span>${icon} ${title}</span>
        <span style="color:var(--text-dim);font-family:'JetBrains Mono',monospace">${count}</span>
      </button>
      ${open && html`
        <div style="padding-left:4px">
          ${sessions.map(s => html`<${SessionRow} s=${s} />`)}
        </div>
      `}
    </div>
  `;
}

export default function SessionsPanel({ data, error, connected, api, cls }) {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await api.fetch('/api/sessions/refresh', { method: 'POST' });
    } catch {}
    setTimeout(() => setRefreshing(false), 2000);
  };

  if (error) return html`<div class=${cls('error')}>${error.error}</div>`;
  if (!data || data.error) return html`<div style="color:var(--text-dim);font-size:12px;line-height:1.5">
    Sessions data not available. The sessions panel is now served directly by the Go backend.
  </div>`;

  const { total, active, working, byKind, byModel, recent } = data;
  const currentUserId = useMemo(() => getCurrentUserId(), []);

  // Group sessions: current user's sessions first (uncollapsed), then rest (collapsed)
  const groups = useMemo(() => {
    const myDirect = [];
    const mySubagents = [];
    const crons = [];
    const otherUsers = [];
    const rest = [];

    for (const s of recent) {
      const isMySession = currentUserId && s.telegramId === currentUserId;
      const isMyDirect = isMySession && (s.kind === 'main' || (s.kind === 'other' && s.key.includes(':telegram:')));
      // Topic sessions are team sessions (show under "Your Sessions")
      const isTeamSession = s.key.includes(':telegram:group:') && s.key.includes(':topic:');

      if (isMyDirect || isTeamSession) {
        myDirect.push(s);
      } else if (s.kind === 'subagent') {
        mySubagents.push(s);
      } else if (s.kind === 'cron') {
        crons.push(s);
      } else if (s.key.includes(':telegram:') && !isMySession) {
        otherUsers.push(s);
      } else if (s.kind === 'main') {
        // Main session without telegram context
        myDirect.push(s);
      } else {
        rest.push(s);
      }
    }

    return { myDirect, mySubagents, crons, otherUsers, rest };
  }, [recent, currentUserId]);

  return html`
    <div class=${cls('wrap')}>
      <${PulseStyle} />
      ${!connected && html`<div class=${cls('stale')}>⚠ Stale</div>`}

      <!-- Header -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--text-dim);font-weight:600">Sessions</span>
          <span style="font-size:10px;color:var(--accent);font-family:'JetBrains Mono',monospace">${active} active</span>
          ${working > 0 && html`<span style="font-size:10px;color:#22c55e;font-family:'JetBrains Mono',monospace">${working} working</span>`}
          <span style="font-size:10px;color:var(--text-dim);font-family:'JetBrains Mono',monospace">/ ${total}</span>
        </div>
        <span style="font-size:10px;color:var(--text-dim);font-family:'JetBrains Mono',monospace;display:flex;align-items:center;gap:4px">
          ${data ? fmtFetchedAt(data.ts) : ''}
          <button
            onClick=${handleRefresh}
            style="background:none;border:none;cursor:pointer;font-size:14px;color:var(--text);opacity:${refreshing ? 0.3 : 0.7};padding:2px 4px;transition:opacity 0.2s"
            disabled=${refreshing}
            title="Refresh sessions"
          >↻</button>
        </span>
      </div>

      <!-- Agent + Model badges -->
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">
        ${data.byAgent && Object.entries(data.byAgent).map(([agent, count]) => html`
          <span style="font-size:9px;padding:2px 8px;border-radius:8px;background:rgba(245,158,11,0.1);color:#f59e0b;font-family:'JetBrains Mono',monospace">
            ${agent} <span style="color:var(--text)">${count}</span>
          </span>
        `)}
        ${byModel && Object.entries(byModel).map(([model, count]) => html`
          <span style="font-size:9px;padding:2px 8px;border-radius:8px;background:rgba(255,255,255,0.05);color:var(--text-dim);font-family:'JetBrains Mono',monospace">
            ${model.replace('claude-', '')} <span style="color:var(--text)">${count}</span>
          </span>
        `)}
      </div>

      <!-- Grouped session list -->
      <${CollapsibleGroup}
        title="Your Sessions"
        icon=${kindIcon.main}
        count=${groups.myDirect.length}
        sessions=${groups.myDirect}
        defaultOpen=${true}
      />

      <${CollapsibleGroup}
        title="Sub-Agents"
        icon=${kindIcon.subagent}
        count=${groups.mySubagents.length}
        sessions=${groups.mySubagents}
        defaultOpen=${true}
      />

      <${CollapsibleGroup}
        title="Other Users"
        icon=${kindIcon.dm}
        count=${groups.otherUsers.length}
        sessions=${groups.otherUsers}
        defaultOpen=${false}
      />

      <${CollapsibleGroup}
        title="Cron Jobs"
        icon=${kindIcon.cron}
        count=${groups.crons.length}
        sessions=${groups.crons}
        defaultOpen=${false}
      />

      ${groups.rest.length > 0 && html`
        <${CollapsibleGroup}
          title="Other"
          icon=${kindIcon.other}
          count=${groups.rest.length}
          sessions=${groups.rest}
          defaultOpen=${false}
        />
      `}

      <!-- Kind summary -->
      <div style="display:flex;gap:12px;margin-top:10px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.05)">
        ${byKind && Object.entries(byKind).filter(([,v]) => v > 0).map(([kind, count]) => html`
          <span style="font-size:9px;color:${kindColor[kind] || 'var(--text-dim)'};font-family:'JetBrains Mono',monospace">
            ${kindIcon[kind] || '○'} ${kind} ${count}
          </span>
        `)}
      </div>
    </div>
  `;
}
