/**
 * Claude Usage Panel UI — Vanilla JS
 * Shows 5hr session, 7day weekly, Opus, Sonnet usage bars
 */

(function() {
  const barColor = (pct) => pct < 50 ? 'var(--green)' : pct < 80 ? 'var(--yellow)' : 'var(--red)';
  
  const fmtResetTime = (iso) => {
    if (!iso) return '';
    const diff = new Date(iso) - new Date();
    if (diff <= 0) return 'Resetting…';
    const mins = Math.floor(diff / 60000), hrs = Math.floor(mins / 60);
    if (hrs < 1) return 'in ' + mins + 'm';
    if (hrs < 24) return 'in ' + hrs + 'h ' + (mins % 60) + 'm';
    return new Date(iso).toLocaleDateString('en-IN', { month:'short', day:'numeric' });
  };

  const fmtFetchedAt = (iso) => {
    if (!iso) return '';
    const mins = Math.floor((Date.now() - new Date(iso)) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return mins + 'm ago';
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + 'h ' + (mins % 60) + 'm ago';
    return new Date(iso).toLocaleDateString('en-IN', { month:'short', day:'numeric' });
  };

  const labels = {
    five_hour: '5-Hour Session',
    seven_day: '7-Day Weekly',
    seven_day_opus: 'Opus',
    seven_day_sonnet: 'Sonnet'
  };

  window.DashboardPanels = window.DashboardPanels || {};
  window.DashboardPanels['claude-usage'] = {
    render(el, data) {
      el.innerHTML = `
        <div class="section-title" style="display:flex;justify-content:space-between;align-items:center;">
          <span><span class="dot" style="display:inline-block;vertical-align:middle;margin-right:8px"></span> Claude Usage</span>
          <span style="display:flex;align-items:center;gap:8px;">
            <span data-id="fetched" style="font-size:10px;color:var(--text-dim);text-transform:none;letter-spacing:0;font-weight:400;font-family:'JetBrains Mono',monospace;"></span>
            <button data-id="refresh-btn" class="refresh-btn" title="Refresh from Anthropic" style="padding:3px 8px;font-size:10px;">↻</button>
          </span>
        </div>
        <div data-id="grid" class="metrics-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;"></div>
      `;

      // Attach refresh handler
      const btn = el.querySelector('[data-id="refresh-btn"]');
      if (btn) {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          btn.disabled = true;
          btn.textContent = '⟳';
          btn.style.opacity = '0.5';
          
          // Trigger global refresh event
          el.dispatchEvent(new CustomEvent('refresh-usage', { bubbles: true, composed: true }));
          
          setTimeout(() => {
            btn.disabled = false;
            btn.textContent = '↻';
            btn.style.opacity = '1';
          }, 2000);
        });
      }
    },
    update(el, data) {
      if (!data) return;

      const fetched = el.querySelector('[data-id="fetched"]');
      const grid = el.querySelector('[data-id="grid"]');
      if (!grid) return;

      if (fetched) fetched.textContent = fmtFetchedAt(data.fetched_at);

      const keys = ['five_hour', 'seven_day', 'seven_day_opus', 'seven_day_sonnet'];
      let html = '';
      
      for (const k of keys) {
        const info = data[k];
        if (!info) continue;
        const pct = info.utilization_pct;
        if (pct === null || pct === undefined) continue; // Hide null cards
        
        const color = barColor(pct);
        html += `
          <div class="metric-card" style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.04);border-radius:10px;padding:12px;">
            <div class="metric-label">${labels[k]}</div>
            <div class="metric-value" style="color:${color};font-size:22px;">${pct}%</div>
            <div class="prog-bar" style="margin-top:6px;"><div class="prog-fill" style="width:${pct}%;background:${color}"></div></div>
            <div class="metric-sub" style="margin-top:4px;">${fmtResetTime(info.resets_at)}</div>
          </div>
        `;
      }

      grid.innerHTML = html;
    }
  };
})();
