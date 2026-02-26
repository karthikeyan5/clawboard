/**
 * Uptime Panel UI — Vanilla JS
 * Displays: Uptime formatted, hostname
 */

(function() {
  const fmtUptime = (s) => {
    const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
    if (d > 0) return d + 'd ' + h + 'h ' + m + 'm';
    if (h > 0) return h + 'h ' + m + 'm';
    return m + 'm';
  };

  window.DashboardPanels = window.DashboardPanels || {};
  window.DashboardPanels['uptime'] = {
    render(el, data) {
      el.innerHTML = `
        <div class="metric-icon">⏱</div>
        <div class="metric-label">UPTIME</div>
        <div class="metric-value" data-id="value" style="color:var(--cyan)">—</div>
        <div class="metric-sub" data-id="sub"></div>
      `;
    },
    update(el, data) {
      if (!data) return;
      const val = el.querySelector('[data-id="value"]');
      const sub = el.querySelector('[data-id="sub"]');
      if (val) val.textContent = fmtUptime(data.uptime);
      if (sub) sub.textContent = data.hostname || '';
    }
  };
})();
