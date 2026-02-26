/**
 * Processes Panel UI — Vanilla JS
 * Displays: Total/running/sleeping counts, OS
 */

(function() {
  window.DashboardPanels = window.DashboardPanels || {};
  window.DashboardPanels['processes'] = {
    render(el, data) {
      el.innerHTML = `
        <div class="metric-icon">⚙️</div>
        <div class="metric-label">PROCESSES</div>
        <div class="proc-row"><span class="proc-label">Total</span><span class="proc-value" data-id="total">—</span></div>
        <div class="proc-row"><span class="proc-label">Running</span><span class="proc-value" data-id="running" style="color:var(--green)">—</span></div>
        <div class="proc-row"><span class="proc-label">Sleeping</span><span class="proc-value" data-id="sleeping">—</span></div>
        <div class="proc-row"><span class="proc-label">OS</span><span class="proc-value" data-id="os" style="font-size:11px">—</span></div>
      `;
    },
    update(el, data) {
      if (!data) return;
      const total = el.querySelector('[data-id="total"]');
      const running = el.querySelector('[data-id="running"]');
      const sleeping = el.querySelector('[data-id="sleeping"]');
      const os = el.querySelector('[data-id="os"]');
      if (total) total.textContent = data.total || '—';
      if (running) running.textContent = data.running || '—';
      if (sleeping) sleeping.textContent = data.sleeping || '—';
      if (os) os.textContent = data.os || '—';
    }
  };
})();
