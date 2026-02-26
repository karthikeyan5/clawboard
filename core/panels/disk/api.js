/**
 * Disk Panel API
 */

const si = require('systeminformation');

module.exports = ({ hooks, auth }) => ({
  endpoint: '/api/panels/disk',
  handler: async (req, res) => {
    let user = req.body?.initData
      ? auth.validateInitData(req.body.initData)
      : auth.getUserFromCookie(req);
    
    if (!user || !auth.isAllowed(user.id)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const disk = await si.fsSize();
    const rootDisk = disk.find(d => d.mount === '/') || disk[0] || {};
    const data = {
      total: rootDisk.size || 0,
      used: rootDisk.used || 0,
      free: (rootDisk.size || 0) - (rootDisk.used || 0),
      pct: Math.round((rootDisk.use || 0) * 10) / 10,
      mount: rootDisk.mount || '/'
    };

    res.json(hooks.filter('panel.disk.data', data));
  }
});
