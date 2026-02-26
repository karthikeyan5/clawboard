/**
 * CPU Panel UI — Vanilla JS
 * Displays: CPU load %, core count, animated progress bar
 */

(function() {
  const barColor = (pct) => pct < 50 ? 'var(--green)' : pct < 80 ? 'var(--yellow)' : 'var(--red)';

  window.DashboardPanels = window.DashboardPanels || {};
  window.DashboardPanels['cpu'] = {
    render(el, data) {
      // Called ONCE — build the DOM skeleton
      el.innerHTML = `
        <div class="metric-icon">⚡</div>
        <div class="metric-label">CPU LOAD</div>
        <div class="metric-value" data-id="value">—</div>
        <div class="metric-sub" data-id="sub"></div>
        <div class="prog-bar"><div class="prog-fill" data-id="bar"></div></div>
      `;
    },
    update(el, data) {
      // Called on EVERY WebSocket update — surgical DOM updates only
      if (!data) return;
      const color = barColor(data.load);
      const val = el.querySelector('[data-id="value"]');
      const sub = el.querySelector('[data-id="sub"]');
      const bar = el.querySelector('[data-id="bar"]');
      if (val) { val.textContent = data.load + '%'; val.style.color = color; }
      if (sub) sub.textContent = data.cores + ' cores';
      if (bar) { bar.style.width = data.load + '%'; bar.style.background = color; }
    }
  };
})();
