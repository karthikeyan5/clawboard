import { html } from '/core/vendor/preact-htm.js';

export default function OpenclawStatusPanel({ data, error, connected, cls }) {
  if (error) return html`<div class=${cls('error')}>${error.error}</div>`;

  if (!data) return html`
    <div class=${cls('wrap')}>
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--text-dim)">System</div>
      <div style="display:flex;align-items:center;gap:6px;margin-top:8px">
        <span style="width:8px;height:8px;border-radius:50%;background:var(--text-dim)"></span>
        <span style="font-size:13px;color:var(--text-dim)">Loading…</span>
      </div>
    </div>
  `;

  if (data.error || !data.online) {
    return html`
      <div class=${cls('wrap')}>
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--text-dim);margin-bottom:8px">System</div>
        <div style="display:flex;align-items:center;gap:6px">
          <span style="width:8px;height:8px;border-radius:50%;background:var(--red)"></span>
          <span style="font-size:15px;color:var(--red);font-weight:600">Offline</span>
        </div>
        ${data.error && html`<div style="font-size:10px;color:var(--text-dim);margin-top:6px">${data.error}</div>`}
      </div>
    `;
  }

  const sec = data.security;
  const hasCritical = sec && sec.critical > 0;
  const hasWarn = sec && sec.warn > 0;

  // Determine overall health color
  const healthColor = hasCritical ? 'var(--red)' : hasWarn ? '#f0ad4e' : 'var(--green)';
  const healthLabel = hasCritical ? 'Needs attention' : hasWarn ? 'Warnings' : 'Healthy';

  // Parse active session context percentages for the bar
  const sessions = data.activeSessions || [];

  // Friendly session name
  const sessionLabel = (key) => {
    if (key.includes(':direct:')) {
      const id = key.split(':').pop();
      return id.substring(0, 6) + '…';
    }
    if (key.includes(':cron:')) return 'cron';
    if (key.includes(':main')) return 'main';
    return key.split(':').pop().substring(0, 8);
  };

  // Parse context like "109k/200k (55%)"
  const parseContext = (ctx) => {
    if (!ctx) return { used: 0, total: 0, pct: 0 };
    const m = ctx.match(/([\d.]+)k\/([\d.]+)k\s*\((\d+)%\)/);
    if (!m) return { used: 0, total: 0, pct: 0 };
    return { used: parseFloat(m[1]), total: parseFloat(m[2]), pct: parseInt(m[3]) };
  };

  return html`
    <div class=${cls('wrap')}>
      ${!connected && html`<div class=${cls('stale')}>⚠ Stale</div>`}

      <!-- Health bar -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="width:10px;height:10px;border-radius:50%;background:${healthColor};box-shadow:0 0 6px ${healthColor}"></span>
          <span style="font-size:14px;font-weight:600;color:${healthColor}">${healthLabel}</span>
        </div>
        <span style="font-size:10px;color:var(--text-dim);font-family:'JetBrains Mono',monospace">
          ${data.heartbeat || ''}
        </span>
      </div>

      <!-- Alerts row (only if issues) -->
      ${(hasCritical || hasWarn || data.update) && html`
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px">
          ${hasCritical && html`
            <span style="font-size:10px;padding:3px 8px;border-radius:10px;background:rgba(255,82,82,0.15);color:var(--red)">
              ${sec.critical} critical
            </span>
          `}
          ${hasWarn && html`
            <span style="font-size:10px;padding:3px 8px;border-radius:10px;background:rgba(240,173,78,0.15);color:#f0ad4e">
              ${sec.warn} warning${sec.warn > 1 ? 's' : ''}
            </span>
          `}
          ${data.update && html`
            <span style="font-size:10px;padding:3px 8px;border-radius:10px;background:rgba(100,180,255,0.15);color:#64b4ff">
              ↑ ${data.update}
            </span>
          `}
        </div>
      `}

      <!-- Active sessions with context bars -->
      ${sessions.length > 0 && html`
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--text-dim);margin-bottom:6px">
          Active sessions
        </div>
        ${sessions.map(s => {
          const ctx = parseContext(s.context);
          const barColor = ctx.pct > 80 ? 'var(--red)' : ctx.pct > 50 ? '#f0ad4e' : 'var(--green)';
          return html`
            <div style="margin-bottom:6px">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px">
                <span style="font-size:10px;color:var(--text-dim);font-family:'JetBrains Mono',monospace">
                  ${sessionLabel(s.key)}
                </span>
                <span style="font-size:10px;color:var(--text-dim);font-family:'JetBrains Mono',monospace">
                  ${s.context}
                </span>
              </div>
              <div style="height:3px;background:rgba(255,255,255,0.05);border-radius:2px;overflow:hidden">
                <div style="height:100%;width:${ctx.pct}%;background:${barColor};border-radius:2px;transition:width 0.3s"></div>
              </div>
            </div>
          `;
        })}
      `}

      <!-- Channel + Gateway footer -->
      <div style="display:flex;justify-content:space-between;margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.04)">
        <span style="font-size:10px;color:var(--text-dim)">
          ${data.channel?.name || 'telegram'} ${data.channel?.status === 'ON' ? html`<span style="color:var(--green)">✓</span>` : html`<span style="color:var(--red)">✗</span>`}
        </span>
        <span style="font-size:10px;color:var(--text-dim)">
          gw ${data.gateway || 'running'}
        </span>
      </div>
    </div>
  `;
}
