/**
 * Models Panel API
 */

const fs = require('fs');
const path = require('path');

function getAgentInfo() {
  const WORKSPACE = path.resolve(__dirname, '..', '..', '..', '..');
  const cfgPath = path.join(WORKSPACE, '..', 'openclaw.json');
  
  try {
    const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
    const agent = cfg.agents?.defaults || {};
    const model = agent.model || {};
    return {
      primary: model.primary || 'unknown',
      fallbacks: model.fallbacks || [],
      subagent: agent.subagents?.model || null,
      heartbeat: agent.heartbeat?.model || null,
      heartbeatInterval: agent.heartbeat?.every || null,
      context: '200k',
      channel: cfg.channels?.telegram?.enabled ? 'Telegram' : 'unknown',
      streamMode: cfg.channels?.telegram?.streamMode || 'off',
      name: cfg.ui?.assistant?.name || 'Agent'
    };
  } catch {
    return null;
  }
}

module.exports = ({ hooks, auth }) => ({
  endpoint: '/api/panels/models',
  handler: async (req, res) => {
    let user = req.body?.initData
      ? auth.validateInitData(req.body.initData)
      : auth.getUserFromCookie(req);
    
    if (!user || !auth.isAllowed(user.id)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const data = getAgentInfo();
    if (!data) return res.status(500).json({ error: 'Agent config not found' });

    res.json(hooks.filter('panel.models.data', data));
  }
});
