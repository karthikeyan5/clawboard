/**
 * Models Panel UI — Vanilla JS
 * Displays: Primary/Fallback/Sub-agent/Heartbeat rows with model pills
 */

(function() {
  const shortModel = (m) => {
    if (!m) return '';
    return m.replace('anthropic/', '').replace('google/', '').replace(/-2025\d{4}/g, '');
  };

  let rendered = false; // Render once (static data)

  window.DashboardPanels = window.DashboardPanels || {};
  window.DashboardPanels['models'] = {
    render(el, data) {
      el.innerHTML = `
        <div class="section-title"><div class="dot"></div> Models</div>
        <div data-id="content" style="color:var(--text-dim);font-size:12px;">Loading...</div>
      `;
    },
    update(el, data) {
      if (!data || rendered) return;
      
      const content = el.querySelector('[data-id="content"]');
      if (!content) return;

      const rows = [];
      rows.push({ label: 'Primary', model: data.primary, cls: 'primary' });
      for (let i = 0; i < (data.fallbacks || []).length; i++) {
        rows.push({ label: `Fallback ${i + 1}`, model: data.fallbacks[i], cls: 'fallback' });
      }
      if (data.subagent) rows.push({ label: 'Sub-agents', model: data.subagent, cls: 'sub' });
      if (data.heartbeat) rows.push({ label: 'Heartbeat', model: data.heartbeat, cls: '' });

      let html = '';
      for (const r of rows) {
        html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.03);">
          <span style="font-size:11px;color:var(--text-dim);">${r.label}</span>
          <span class="model-pill ${r.cls}" style="margin:0;">${shortModel(r.model)}</span>
        </div>`;
      }

      // Channel + context row
      html += `<div style="display:flex;gap:14px;flex-wrap:wrap;margin-top:10px;font-size:11px;color:var(--text-dim);font-family:'JetBrains Mono',monospace;">`;
      if (data.channel) html += `<span>📡 ${data.channel}</span>`;
      if (data.context) html += `<span>📚 ${data.context} context</span>`;
      if (data.heartbeatInterval) html += `<span>💓 ${data.heartbeatInterval}</span>`;
      html += '</div>';

      content.innerHTML = html;
      rendered = true;
    }
  };
})();
