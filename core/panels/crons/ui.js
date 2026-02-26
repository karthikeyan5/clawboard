/**
 * Crons Panel UI — Vanilla JS
 * COMPLEX: Filter tabs, expandable detail rows, action buttons
 */

(function() {
  const escHtml = (s) => { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; };
  const shortModel = (m) => m ? m.replace('anthropic/','').replace('google/','').replace(/-2025\d{4}/g,'') : '';
  
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

  const fmtSchedule = (s) => {
    if (!s) return '—';
    if (s.kind === 'cron') return s.expr + (s.tz ? ` (${s.tz.replace('Asia/Calcutta','IST').replace('Asia/Kolkata','IST')})` : '');
    if (s.kind === 'every') {
      const ms = s.everyMs;
      if (ms >= 3600000) return `every ${ms/3600000}h`;
      if (ms >= 60000) return `every ${ms/60000}m`;
      return `every ${ms/1000}s`;
    }
    if (s.kind === 'at') return new Date(s.at).toLocaleString('en-IN', { dateStyle:'medium', timeStyle:'short' });
    return JSON.stringify(s);
  };

  const cronStatusInfo = (j) => {
    if (!j.enabled) return { cls: 'disabled', label: 'Disabled', desc: 'This job is turned off and will not run.' };
    if (j.lastStatus === 'ok') return { cls: 'ok', label: 'Healthy', desc: 'Last run completed successfully.' };
    if (j.lastStatus === 'error') return { cls: 'error', label: 'Error', desc: `Failed${j.consecutiveErrors > 1 ? ` (${j.consecutiveErrors}× in a row)` : ''}.` };
    return { cls: 'pending', label: 'Pending', desc: 'Has not run yet or waiting for first execution.' };
  };

  let cronData = [];
  let cronFilter = 'all';
  let cronExpanded = {};
  let panelEl = null;

  function toggleCronItem(id) {
    cronExpanded[id] = !cronExpanded[id];
    const detail = panelEl.querySelector('#cd-' + id);
    const chevron = panelEl.querySelector('#cc-' + id);
    if (detail) detail.classList.toggle('open');
    if (chevron) chevron.classList.toggle('open');
  }

  function setCronFilter(f) {
    cronFilter = f;
    if (!panelEl) return;
    panelEl.querySelectorAll('.cron-filter').forEach(el => el.classList.toggle('active', el.dataset.filter === f));
    renderCronList();
  }

  function filterCrons(crons) {
    if (cronFilter === 'active') return crons.filter(j => j.enabled);
    if (cronFilter === 'errors') return crons.filter(j => j.enabled && j.lastStatus === 'error');
    if (cronFilter === 'disabled') return crons.filter(j => !j.enabled);
    return crons;
  }

  async function cronAction(jobId, action, btn) {
    if (btn) { btn.disabled = true; btn.style.opacity = '0.5'; }
    try {
      const res = await fetch('/api/crons/action', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, action })
      });
      if (res.ok) {
        if (btn) { btn.textContent = '✓'; setTimeout(() => { btn.disabled = false; btn.style.opacity = '1'; }, 1500); }
      } else {
        if (btn) { btn.textContent = '✗'; btn.style.color = 'var(--red)'; setTimeout(() => { btn.disabled = false; btn.style.opacity = '1'; }, 2000); }
      }
    } catch {
      if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
    }
  }

  function renderCronList() {
    if (!panelEl) return;
    const list = panelEl.querySelector('[data-id="cron-list-items"]');
    if (!list) return;
    
    const filtered = filterCrons(cronData);
    let html = '';
    
    for (const j of filtered) {
      const si = cronStatusInfo(j);
      const lastRun = j.lastRunAt ? fmtFetchedAt(j.lastRunAt) : 'never';
      const dur = j.lastDurationMs ? (j.lastDurationMs / 1000).toFixed(1) + 's' : '';
      const nameStyle = j.enabled ? '' : 'opacity:0.4;';
      const isOpen = cronExpanded[j.id];

      html += `<div class="cron-item" style="${nameStyle}" data-job-id="${j.id}">
        <div class="cron-status ${si.cls}"></div>
        <span class="cron-name" title="${escHtml(j.name)}">${escHtml(j.name)}</span>
        <span class="cron-meta">${lastRun}${dur ? ' · ' + dur : ''}</span>
        <span class="cron-chevron${isOpen ? ' open' : ''}" id="cc-${j.id}">▶</span>
      </div>`;

      // Expandable detail panel
      html += `<div class="cron-detail${isOpen ? ' open' : ''}" id="cd-${j.id}"><div class="cron-detail-inner">`;

      // Status badge + description
      html += `<div class="cron-detail-row">
        <span class="cron-detail-label">Status</span>
        <span class="cron-status-badge ${si.cls}">${si.label}</span>
      </div>`;
      html += `<div style="font-size:10px;color:var(--text-dim);padding:2px 0 6px;line-height:1.4;">${si.desc}</div>`;

      // Schedule
      html += `<div class="cron-detail-row">
        <span class="cron-detail-label">Schedule</span>
        <span class="cron-detail-value">${escHtml(fmtSchedule(j.schedule))}</span>
      </div>`;

      // Model
      if (j.model) {
        html += `<div class="cron-detail-row">
          <span class="cron-detail-label">Model</span>
          <span class="cron-detail-value">${escHtml(shortModel(j.model))}</span>
        </div>`;
      }

      // Session target
      if (j.sessionTarget) {
        html += `<div class="cron-detail-row">
          <span class="cron-detail-label">Session</span>
          <span class="cron-detail-value">${escHtml(j.sessionTarget)}</span>
        </div>`;
      }

      // Last run
      if (j.lastRunAt) {
        const exactTime = new Date(j.lastRunAt).toLocaleString('en-IN', { dateStyle:'medium', timeStyle:'medium' });
        html += `<div class="cron-detail-row">
          <span class="cron-detail-label">Last Run</span>
          <span class="cron-detail-value">${exactTime}</span>
        </div>`;
      }

      // Duration
      if (j.lastDurationMs) {
        html += `<div class="cron-detail-row">
          <span class="cron-detail-label">Duration</span>
          <span class="cron-detail-value">${(j.lastDurationMs / 1000).toFixed(1)}s</span>
        </div>`;
      }

      // Next run
      if (j.nextRunAt) {
        const nextTime = new Date(j.nextRunAt).toLocaleString('en-IN', { dateStyle:'medium', timeStyle:'short' });
        const nextRel = fmtResetTime(j.nextRunAt);
        html += `<div class="cron-detail-row">
          <span class="cron-detail-label">Next Run</span>
          <span class="cron-detail-value">${nextTime} (${nextRel})</span>
        </div>`;
      }

      // Error detail
      if (j.lastError && j.consecutiveErrors > 0) {
        html += `<div class="cron-detail-error">${escHtml(j.lastError)}</div>`;
      }

      // Actions
      html += `<div class="cron-actions">`;
      if (j.enabled) {
        html += `<button class="cron-action-btn primary" data-job-id="${j.id}" data-action="run">▶ Run Now</button>`;
        html += `<button class="cron-action-btn danger" data-job-id="${j.id}" data-action="disable">⏸ Disable</button>`;
      } else {
        html += `<button class="cron-action-btn primary" data-job-id="${j.id}" data-action="enable">▶ Enable</button>`;
      }
      html += `</div>`;

      html += `</div></div>`;
    }
    
    list.innerHTML = html;
    
    // Attach event listeners
    list.querySelectorAll('.cron-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('.cron-actions')) return; // Don't toggle if clicking action buttons
        toggleCronItem(item.dataset.jobId);
      });
    });

    list.querySelectorAll('.cron-action-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        cronAction(btn.dataset.jobId, btn.dataset.action, btn);
      });
    });
  }

  window.DashboardPanels = window.DashboardPanels || {};
  window.DashboardPanels['crons'] = {
    render(el, data) {
      panelEl = el;
      el.innerHTML = `
        <button class="cron-toggle" data-id="cron-toggle">
          <span class="dot" style="display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--accent);"></span>
          <span>Scheduled Jobs</span>
          <span style="margin-left:auto;display:flex;align-items:center;gap:6px;">
            <span data-id="summary" style="font-size:10px;color:var(--text-dim);font-weight:400;text-transform:none;letter-spacing:0;font-family:'JetBrains Mono',monospace;"></span>
            <span data-id="arrow" class="arrow" style="font-size:10px;transition:transform 0.2s;">▶</span>
          </span>
        </button>
        <div data-id="cron-body" style="max-height:0;overflow:hidden;transition:max-height 0.3s ease;">
          <div data-id="cron-filter-row" class="cron-filter-row" style="display:flex;gap:6px;margin-bottom:10px;">
            <button class="cron-filter active" data-filter="all">All</button>
            <button class="cron-filter" data-filter="active">Active</button>
            <button class="cron-filter" data-filter="errors">Errors</button>
            <button class="cron-filter" data-filter="disabled">Disabled</button>
          </div>
          <div data-id="cron-list-items"></div>
        </div>
      `;

      // Toggle entire section
      const toggle = el.querySelector('[data-id="cron-toggle"]');
      const body = el.querySelector('[data-id="cron-body"]');
      const arrow = el.querySelector('[data-id="arrow"]');
      let isOpen = false;
      toggle.addEventListener('click', () => {
        isOpen = !isOpen;
        body.style.maxHeight = isOpen ? body.scrollHeight + 2000 + 'px' : '0';
        arrow.style.transform = isOpen ? 'rotate(90deg)' : '';
      });

      // Attach filter button handlers
      el.querySelectorAll('.cron-filter').forEach(btn => {
        btn.addEventListener('click', () => setCronFilter(btn.dataset.filter));
      });
    },
    update(el, data) {
      if (!data || !data.length) return;
      panelEl = el;

      // Sort: enabled first, then by name
      cronData = [...data].sort((a, b) => {
        if (a.enabled !== b.enabled) return a.enabled ? -1 : 1;
        return (a.name || '').localeCompare(b.name || '');
      });

      const active = cronData.filter(j => j.enabled).length;
      const errors = cronData.filter(j => j.enabled && j.lastStatus === 'error').length;
      const disabled = cronData.filter(j => !j.enabled).length;
      
      const summary = el.querySelector('[data-id="summary"]');
      if (summary) {
        summary.textContent = `${active} active` + (errors ? ` · ${errors} ⚠` : '') + (disabled ? ` · ${disabled} off` : '');
      }

      renderCronList();
    }
  };
})();
