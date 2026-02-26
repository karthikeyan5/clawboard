/**
 * OpenClaw Status Panel UI — Clean status card
 */

(function() {
  window.DashboardPanels = window.DashboardPanels || {};
  window.DashboardPanels['openclaw-status'] = {
    render(el, data) {
      el.innerHTML = `
        <div class="metric-icon">🔧</div>
        <div class="metric-label">OPENCLAW STATUS</div>
        <div data-id="status-body" style="margin-top:12px;">
          <div style="color:var(--text-dim);font-size:12px;">Loading...</div>
        </div>
      `;
    },
    update(el, data) {
      const body = el.querySelector('[data-id="status-body"]');
      if (!body || !data) return;

      if (data.error || !data.online) {
        body.innerHTML = `<div style="color:var(--red);font-size:13px;">⛔ Offline — ${data.error || 'unknown'}</div>`;
        return;
      }

      const dot = '🟢';
      const chanName = data.channel?.name || 'unknown';
      const chanOK = (data.channel?.status || '').toUpperCase() === 'ON';

      const rows = [
        { label: 'Status', value: `${dot} Online`, cls: 'color:var(--green)' },
        { label: 'Version', value: data.version },
        { label: 'Heartbeat', value: data.heartbeat },
        { label: 'Sessions', value: data.sessions },
        { label: 'Channel', value: `${chanName} ${chanOK ? '✅' : '❌'}` },
        { label: 'Memory', value: data.memory },
      ];

      if (data.security) {
        const s = data.security;
        const parts = [];
        if (s.critical > 0) parts.push(`<span style="color:var(--red)">${s.critical} critical</span>`);
        if (s.warn > 0) parts.push(`<span style="color:#f0ad4e">${s.warn} warn</span>`);
        if (s.info > 0) parts.push(`${s.info} info`);
        rows.push({ label: 'Security', value: parts.join(' · '), html: true });
      }

      body.innerHTML = rows.map(r => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
          <span style="color:var(--text-dim);font-size:12px;">${r.label}</span>
          <span style="font-size:12px;font-weight:500;${r.cls || 'color:var(--text)'}">${r.html ? r.value : escHtml(r.value)}</span>
        </div>
      `).join('');
    }
  };

  function escHtml(s) {
    if (!s) return '—';
    const d = document.createElement('div');
    d.textContent = String(s);
    return d.innerHTML;
  }
})();
