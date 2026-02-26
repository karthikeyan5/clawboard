/**
 * Crons Panel API
 */

const fs = require('fs');
const path = require('path');

function getCronJobs() {
  const WORKSPACE = path.resolve(__dirname, '..', '..', '..', '..');
  const cronPaths = [
    path.join(WORKSPACE, '..', 'cron', 'jobs.json'),
    path.join(WORKSPACE, '..', 'agents', 'main', 'cron-jobs.json')
  ];
  
  for (const p of cronPaths) {
    if (fs.existsSync(p)) {
      try {
        const data = JSON.parse(fs.readFileSync(p, 'utf8'));
        const jobs = Array.isArray(data) ? data : (data.jobs || []);
        return jobs.map(j => ({
          id: j.id,
          name: j.name || 'Unnamed',
          enabled: j.enabled !== false,
          schedule: j.schedule || null,
          sessionTarget: j.sessionTarget || null,
          model: j.payload?.model || null,
          payloadKind: j.payload?.kind || null,
          lastStatus: j.state?.lastStatus || null,
          lastRunAt: j.state?.lastRunAtMs ? new Date(j.state.lastRunAtMs).toISOString() : null,
          lastDurationMs: j.state?.lastDurationMs || null,
          nextRunAt: j.state?.nextRunAtMs ? new Date(j.state.nextRunAtMs).toISOString() : null,
          consecutiveErrors: j.state?.consecutiveErrors || 0,
          lastError: j.state?.lastError || null
        }));
      } catch {}
    }
  }
  return [];
}

module.exports = ({ hooks, auth }) => ({
  endpoint: '/api/panels/crons',
  handler: async (req, res) => {
    let user = req.body?.initData
      ? auth.validateInitData(req.body.initData)
      : auth.getUserFromCookie(req);
    
    if (!user || !auth.isAllowed(user.id)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    res.json(hooks.filter('panel.crons.data', getCronJobs()));
  }
});
