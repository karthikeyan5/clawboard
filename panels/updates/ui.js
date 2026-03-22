import { html, useState, useEffect } from '/core/vendor/preact-htm.js';

function DirtyWarning({ repo, api, onResolved }) {
  const [resolving, setResolving] = useState(null); // 'stash-pull' | 'stash-drop-pull' | 'diff'
  const [diffText, setDiffText] = useState(null);
  const [result, setResult] = useState(null);

  const resolve = async (action) => {
    setResolving(action);
    setResult(null);
    try {
      const r = await api.fetch('/api/updates/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo: repo.name, action })
      });
      const d = await r.json();
      if (action === 'diff') {
        setDiffText(d.diff || 'No changes');
      } else {
        setResult(d);
        if (d.ok && onResolved) setTimeout(onResolved, 500);
      }
    } catch (e) {
      setResult({ ok: false, error: e.message });
    }
    setResolving(null);
  };

  return html`
    <div style="margin-top:6px;padding:6px 8px;background:rgba(245,158,11,0.08);border-radius:6px;border:1px solid rgba(245,158,11,0.15)">
      <div style="font-size:9px;color:var(--yellow, #f59e0b);margin-bottom:4px;font-weight:600">⚠ Local modifications will block pull:</div>
      ${repo.dirtyFiles.map(f => html`
        <div style="font-size:10px;font-family:'JetBrains Mono',monospace;color:var(--text-dim);padding:1px 0">${f}</div>
      `)}
      <div style="display:flex;gap:4px;margin-top:6px;flex-wrap:wrap">
        <button onClick=${() => resolve('stash-pull')} disabled=${!!resolving}
          style="font-size:9px;padding:2px 8px;background:rgba(34,197,94,0.15);color:var(--green);border:1px solid rgba(34,197,94,0.3);border-radius:4px;cursor:pointer"
          title="Save changes, update, reapply changes">
          ${resolving === 'stash-pull' ? '...' : '🔄 Update (keep changes)'}
        </button>
        <button onClick=${() => resolve('stash-drop-pull')} disabled=${!!resolving}
          style="font-size:9px;padding:2px 8px;background:rgba(245,158,11,0.1);color:var(--yellow, #f59e0b);border:1px solid rgba(245,158,11,0.2);border-radius:4px;cursor:pointer"
          title="Save changes aside, update cleanly (recoverable via git stash)">
          ${resolving === 'stash-drop-pull' ? '...' : '⬆ Update (discard changes)'}
        </button>
        <button onClick=${() => resolve('diff')} disabled=${!!resolving}
          style="font-size:9px;padding:2px 8px;background:rgba(255,255,255,0.05);color:var(--text-dim);border:1px solid rgba(255,255,255,0.1);border-radius:4px;cursor:pointer">
          ${resolving === 'diff' ? '...' : '👁 View Diff'}
        </button>
      </div>
      ${result && html`
        <div style="margin-top:4px;font-size:9px;padding:4px 6px;border-radius:4px;background:${result.ok ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)'};color:${result.ok ? 'var(--green)' : 'var(--red)'}">
          ${result.ok ? '✅ Resolved' : '❌ ' + result.error}
          ${result.output && html`<pre style="margin-top:2px;font-size:8px;white-space:pre-wrap;opacity:0.7;max-height:80px;overflow:auto">${result.output}</pre>`}
        </div>
      `}
      ${diffText && html`
        <pre style="margin-top:4px;font-size:8px;font-family:'JetBrains Mono',monospace;color:var(--text-dim);background:rgba(0,0,0,0.3);padding:6px;border-radius:4px;max-height:150px;overflow:auto;white-space:pre-wrap">${diffText}</pre>
      `}
    </div>
  `;
}

function DeployLog({ api }) {
  const [log, setLog] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const fetchLog = async () => {
    setLoading(true);
    try {
      const r = await api.fetch('/api/updates/deploy-log');
      const d = await r.json();
      setLog(d);
    } catch (e) {}
    setLoading(false);
  };

  if (!expanded) {
    return html`
      <button onClick=${() => { setExpanded(true); fetchLog(); }}
        style="margin-top:6px;font-size:9px;padding:2px 8px;background:rgba(255,255,255,0.04);color:var(--text-dim);border:1px solid rgba(255,255,255,0.08);border-radius:4px;cursor:pointer">
        📋 Deploy Log
      </button>
    `;
  }

  return html`
    <div style="margin-top:6px">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
        <span style="font-size:9px;color:var(--text-dim);font-weight:600">Deploy Log</span>
        <button onClick=${fetchLog} disabled=${loading}
          style="font-size:9px;padding:1px 6px;background:rgba(255,255,255,0.05);color:var(--text-dim);border:none;border-radius:3px;cursor:pointer">
          ${loading ? '...' : '↻'}
        </button>
        <button onClick=${() => setExpanded(false)}
          style="font-size:9px;padding:1px 6px;background:none;color:var(--text-dim);border:none;cursor:pointer">✕</button>
      </div>
      ${log && log.log ? html`
        <pre style="font-size:8px;font-family:'JetBrains Mono',monospace;color:var(--text-dim);background:rgba(0,0,0,0.3);padding:8px;border-radius:4px;max-height:200px;overflow:auto;white-space:pre-wrap;line-height:1.4">${log.log}</pre>
        ${log.timestamp && html`<div style="font-size:8px;color:var(--text-dim);opacity:0.5;margin-top:2px;text-align:right">${new Date(log.timestamp).toLocaleString()}</div>`}
      ` : html`<div style="font-size:9px;color:var(--text-dim)">No deploy log found</div>`}
    </div>
  `;
}

export default function UpdatesPanel({ data, error, connected, lastUpdate, api, cls }) {
  const [status, setStatus] = useState(null);
  const [checking, setChecking] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [deployMsg, setDeployMsg] = useState('');

  const check = async () => {
    setChecking(true);
    setDeployMsg('');
    try {
      const r = await api.fetch('/api/updates/check', { method: 'POST' });
      if (!r.ok) { console.error('[updates] check failed:', r.status); setChecking(false); return; }
      const d = await r.json();
      setStatus(d);
    } catch (e) { console.error('[updates] check error:', e); }
    setChecking(false);
  };

  const deploy = async () => {
    setDeploying(true);
    setDeployMsg('');
    try {
      const r = await api.fetch('/api/updates/apply', { method: 'POST' });
      const d = await r.json();
      setDeployMsg(d.message || d.error || 'Deploy triggered');
    } catch (e) {
      setDeployMsg('Deploy failed: ' + e.message);
    }
    setDeploying(false);
  };

  useEffect(() => { check(); }, []);

  const repos = [];
  if (status) {
    if (status.framework) repos.push(status.framework);
    if (status.apps) repos.push(...status.apps);
  }

  const totalBehind = repos.reduce((s, r) => s + (r.commitsBehind || 0), 0);
  const hasUpdates = totalBehind > 0;

  const sha = (s) => s ? s.slice(0, 7) : '—';

  return html`
    <div class=${cls('wrap')}>
      ${!connected && html`<div class=${cls('stale')}>⚠ Stale</div>`}

      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <span style="display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:1px">
          <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${hasUpdates ? 'var(--yellow, #f59e0b)' : 'var(--green, #22c55e)'}"></span>
          Updates
          ${hasUpdates && html`<span style="font-size:10px;font-weight:500;color:var(--yellow, #f59e0b);opacity:0.9">${totalBehind} behind</span>`}
        </span>
        <div style="display:flex;gap:6px;align-items:center">
          ${hasUpdates && html`
            <button onClick=${deploy} disabled=${deploying}
              style="font-size:10px;padding:3px 10px;background:var(--green, #22c55e);color:#000;border:none;border-radius:4px;cursor:pointer;font-weight:600;opacity:${deploying ? 0.5 : 1}">
              ${deploying ? '...' : '⬆ Deploy'}
            </button>
          `}
          <button onClick=${check} disabled=${checking}
            style="font-size:10px;padding:3px 10px;background:rgba(255,255,255,0.06);color:var(--text, #e2e8f0);border:none;border-radius:4px;cursor:pointer;opacity:${checking ? 0.5 : 1}">
            ${checking ? '...' : '↻ Check'}
          </button>
        </div>
      </div>

      ${!status && html`
        <div style="font-size:12px;color:var(--text-dim, #8892a4);padding:8px 0">${checking ? 'Checking...' : 'No data'}</div>
      `}

      ${repos.length > 0 && html`
        <div style="display:flex;flex-direction:column;gap:6px">
          ${repos.map(r => {
            const behind = r.commitsBehind || 0;
            const upToDate = r.upToDate && !r.error;
            const hasError = !!r.error;
            const borderColor = hasError ? 'rgba(239,68,68,0.2)' : behind > 0 ? 'rgba(245,158,11,0.2)' : 'rgba(34,197,94,0.15)';
            const bgColor = hasError ? 'rgba(239,68,68,0.05)' : behind > 0 ? 'rgba(245,158,11,0.05)' : 'rgba(34,197,94,0.04)';
            const dotColor = hasError ? 'var(--red, #ef4444)' : behind > 0 ? 'var(--yellow, #f59e0b)' : 'var(--green, #22c55e)';

            return html`
              <div style="padding:8px 12px;border-radius:8px;background:${bgColor};border:1px solid ${borderColor}">
                <div style="display:flex;align-items:center;justify-content:space-between">
                  <div style="display:flex;align-items:center;gap:8px;min-width:0">
                    <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${dotColor};flex-shrink:0"></span>
                    <span style="font-size:13px;font-weight:600;font-family:'JetBrains Mono',monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${r.name}</span>
                    ${r.branch && html`<span style="font-size:10px;color:var(--text-dim, #8892a4);opacity:0.7">${r.branch}</span>`}
                  </div>
                  <div style="display:flex;align-items:center;gap:10px;flex-shrink:0">
                    ${hasError
                      ? html`<span style="font-size:10px;color:var(--red, #ef4444)">${r.error}</span>`
                      : html`
                        <span style="font-size:11px;font-family:'JetBrains Mono',monospace;color:var(--text-dim, #8892a4)">
                          ${sha(r.currentSHA)}${r.latestSHA && r.latestSHA !== r.currentSHA ? html` → <span style="color:var(--yellow, #f59e0b)">${sha(r.latestSHA)}</span>` : ''}
                        </span>
                        ${behind > 0
                          ? html`<span style="font-size:10px;color:var(--yellow, #f59e0b);font-weight:600">${behind} behind</span>`
                          : html`<span style="font-size:10px;color:var(--green, #22c55e)">✓ current</span>`
                        }
                      `
                    }
                  </div>
                </div>
                ${r.hasDirty && html`<${DirtyWarning} repo=${r} api=${api} onResolved=${check} />`}
              </div>
            `;
          })}
        </div>
      `}

      ${deployMsg && html`
        <div style="margin-top:8px;font-size:11px;padding:6px 10px;border-radius:6px;background:rgba(255,255,255,0.04);color:var(--text-dim, #8892a4)">${deployMsg}</div>
      `}
      <${DeployLog} api=${api} />

      ${status && status.checkedAt && html`
        <div style="margin-top:8px;font-size:10px;color:var(--text-dim, #8892a4);opacity:0.6;text-align:right">
          Checked: ${new Date(status.checkedAt).toLocaleTimeString()}
        </div>
      `}
    </div>
  `;
}
