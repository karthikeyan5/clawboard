import { html } from '/core/vendor/preact-htm.js';

export default function OpenclawStatusPanel({ data, error, connected, cls }) {
  if (error) return html`<div class=${cls('error')}>${error.error}</div>`;

  const placeholder = html`
    <div class=${cls('wrap')}>
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--text-dim);margin-bottom:8px">System</div>
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:12px">
        <span style="width:8px;height:8px;border-radius:50%;background:var(--text-dim)"></span>
        <span style="font-size:13px;color:var(--text-dim)">Loading…</span>
      </div>
    </div>
  `;

  if (!data) return placeholder;

  if (data.error || !data.online) {
    return html`
      <div class=${cls('wrap')}>
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--text-dim);margin-bottom:8px">System</div>
        <div style="display:flex;align-items:center;gap:6px">
          <span style="width:8px;height:8px;border-radius:50%;background:var(--red)"></span>
          <span style="font-size:13px;color:var(--red);font-weight:600">Offline</span>
        </div>
        ${data.error && html`<div style="font-size:10px;color:var(--text-dim);margin-top:6px">${data.error}</div>`}
      </div>
    `;
  }

  const chanName = data.channel?.name || '—';
  const chanOK = (data.channel?.status || '').toUpperCase() === 'ON';

  // Parse session count
  const sessionMatch = (data.sessions || '').match(/^(\d+)/);
  const sessionCount = sessionMatch ? sessionMatch[1] : '—';

  // Parse model
  const modelMatch = (data.sessions || '').match(/default\s+(\S+)/);
  const model = modelMatch ? modelMatch[1].replace('claude-', '') : '—';

  // Security
  const sec = data.security;
  const hasSecIssues = sec && (sec.critical > 0 || sec.warn > 0);

  return html`
    <div class=${cls('wrap')}>
      ${!connected && html`<div class=${cls('stale')}>⚠ Stale</div>`}

      <!-- Status header -->
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--text-dim);margin-bottom:8px">System</div>
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:12px">
        <span style="width:8px;height:8px;border-radius:50%;background:var(--green)"></span>
        <span style="font-size:13px;color:var(--green);font-weight:600">Online</span>
        <span style="font-size:10px;color:var(--text-dim);margin-left:auto;font-family:'JetBrains Mono',monospace">${data.heartbeat || ''}</span>
      </div>

      <!-- Key metrics -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">
        <div style="background:rgba(255,255,255,0.03);border-radius:6px;padding:8px">
          <div style="font-size:9px;color:var(--text-dim);text-transform:uppercase;margin-bottom:2px">Sessions</div>
          <div style="font-size:18px;font-weight:700;font-family:'JetBrains Mono',monospace;color:var(--text)">${sessionCount}</div>
        </div>
        <div style="background:rgba(255,255,255,0.03);border-radius:6px;padding:8px">
          <div style="font-size:9px;color:var(--text-dim);text-transform:uppercase;margin-bottom:2px">Channel</div>
          <div style="font-size:13px;font-weight:600;color:${chanOK ? 'var(--green)' : 'var(--red)'}">${chanName} ${chanOK ? '✓' : '✗'}</div>
        </div>
      </div>

      <!-- Model -->
      <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;font-size:11px">
        <span style="color:var(--text-dim)">Model</span>
        <span style="font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--text)">${model}</span>
      </div>

      <!-- Security -->
      ${hasSecIssues && html`
        <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;font-size:11px;margin-top:2px">
          <span style="color:var(--text-dim)">Security</span>
          <span style="font-size:10px">
            ${sec.critical > 0 && html`<span style="color:var(--red)">${sec.critical}⚠</span>`}
            ${sec.critical > 0 && sec.warn > 0 && ' '}
            ${sec.warn > 0 && html`<span style="color:#f0ad4e">${sec.warn}!</span>`}
          </span>
        </div>
      `}
    </div>
  `;
}
