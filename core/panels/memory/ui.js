/**
 * Memory Panel UI — Vanilla JS
 * Displays: Memory used/total %, progress bar
 */

(function() {
  const barColor = (pct) => pct < 50 ? 'var(--green)' : pct < 80 ? 'var(--yellow)' : 'var(--red)';
  const fmtBytes = (b) => {
    if (b >= 1073741824) return (b / 1073741824).toFixed(1) + ' GB';
    if (b >= 1048576) return (b / 1048576).toFixed(0) + ' MB';
    return (b / 1024).toFixed(0) + ' KB';
  };

  window.DashboardPanels = window.DashboardPanels || {};
  window.DashboardPanels['memory'] = {
    render(el, data) {
      el.innerHTML = `
        <div class="metric-icon">🧠</div>
        <div class="metric-label">MEMORY</div>
        <div class="metric-value" data-id="value">—</div>
        <div class="metric-sub" data-id="sub"></div>
        <div class="prog-bar"><div class="prog-fill" data-id="bar"></div></div>
      `;
    },
    update(el, data) {
      if (!data) return;
      const color = barColor(data.pct);
      const val = el.querySelector('[data-id="value"]');
      const sub = el.querySelector('[data-id="sub"]');
      const bar = el.querySelector('[data-id="bar"]');
      if (val) { val.textContent = data.pct + '%'; val.style.color = color; }
      if (sub) sub.textContent = fmtBytes(data.used) + ' / ' + fmtBytes(data.total);
      if (bar) { bar.style.width = data.pct + '%'; bar.style.background = color; }
    }
  };
})();
