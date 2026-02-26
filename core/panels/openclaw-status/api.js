/**
 * OpenClaw Status Panel API — Parsed fields
 */

const { execFileSync } = require('child_process');

function getSystemStatus() {
  try {
    const raw = execFileSync('openclaw', ['status'], {
      timeout: 15000,
      encoding: 'utf8',
      shell: false
    }).trim();

    // Parse key fields from the table output
    const get = (label) => {
      const re = new RegExp(`│\\s*${label}\\s*│\\s*(.+?)\\s*│`, 'i');
      const m = raw.match(re);
      return m ? m[1].trim() : null;
    };

    const version = get('Updated') || get('Version');
    const os = get('OS');
    const channel = get('Channel');
    const tailscale = get('Tailscale');
    const heartbeat = get('Heartbeat');
    const sessions = get('Sessions');
    const gateway = get('Gateway service');
    const agents = get('Agents');
    const memory = get('Memory');

    // Parse security audit line
    const secMatch = raw.match(/Summary:\s*(\d+)\s*critical[,·]\s*(\d+)\s*warn[,·]\s*(\d+)\s*info/i);
    const security = secMatch
      ? { critical: parseInt(secMatch[1]), warn: parseInt(secMatch[2]), info: parseInt(secMatch[3]) }
      : null;

    // Channel status
    const chanMatch = raw.match(/│\s*(telegram|discord|whatsapp|signal)\s*│\s*(ON|OFF)\s*│/i);
    const chanStatus = chanMatch ? { name: chanMatch[1], status: chanMatch[2] } : null;

    return {
      online: true,
      version: version || 'unknown',
      os: os || 'unknown',
      channel: chanStatus || { name: channel || 'unknown', status: 'ON' },
      heartbeat: heartbeat || 'unknown',
      sessions: sessions || 'unknown',
      gateway: gateway || 'unknown',
      agents: agents || 'unknown',
      memory: memory || 'unknown',
      security,
    };
  } catch {
    return { online: false, error: 'CLI not found or failed' };
  }
}

module.exports = ({ hooks, auth }) => ({
  endpoint: '/api/panels/openclaw-status',
  handler: async (req, res) => {
    let user = req.body?.initData
      ? auth.validateInitData(req.body.initData)
      : auth.getUserFromCookie(req);
    
    if (!user || !auth.isAllowed(user.id)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    res.json(hooks.filter('panel.openclaw-status.data', getSystemStatus()));
  }
});
