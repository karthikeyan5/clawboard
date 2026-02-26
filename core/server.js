/**
 * OpenClaw Dashboard Kit v2 — Core Server
 * 
 * Modular panel architecture with WordPress-style hooks
 * Preserves ALL functionality from v1 monolithic server
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const http = require('http');
const cookieParser = require('cookie-parser');
const { WebSocketServer } = require('ws');
const rateLimit = require('express-rate-limit');
const si = require('systeminformation');
const { execFileSync } = require('child_process');

// Load core modules
const hooks = require('./lib/hooks');
const auth = require('./lib/auth');
const panels = require('./lib/panels');
const updater = require('./lib/updater');

// Paths
const ROOT_DIR = path.resolve(__dirname, '..');
const WORKSPACE = path.resolve(ROOT_DIR, '..');
const CONFIG_PATH = path.join(ROOT_DIR, 'config.json');

// ── Load Config ──
let config = {};
try {
  config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  console.log('[Config] Loaded config.json');
} catch (err) {
  console.error('[Config] Failed to load config.json:', err.message);
  console.error('[Config] Copy config.example.json to config.json and configure it');
  process.exit(1);
}

// ── Load BOT_TOKEN from environment ──
const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error('[Fatal] BOT_TOKEN environment variable is required');
  console.error('[Fatal] Set it in .env file or systemd service');
  process.exit(1);
}

// ── Initialize auth ──
auth.init(BOT_TOKEN, config.allowedUsers || []);

// ── Persistent cookie secret ──
const COOKIE_SECRET_FILE = path.join(ROOT_DIR, '.cookie-secret');
let COOKIE_SECRET;
try {
  COOKIE_SECRET = fs.readFileSync(COOKIE_SECRET_FILE, 'utf8').trim();
} catch {
  COOKIE_SECRET = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(COOKIE_SECRET_FILE, COOKIE_SECRET, { mode: 0o600 });
  console.log('[Auth] Generated new cookie secret');
}

// ── Load version info ──
updater.loadVersion(ROOT_DIR);

// ── Express app setup ──
const app = express();
const server = http.createServer(app);
const PORT = config.port || 3700;

// Fire server.init hook
hooks.action('server.init', app, config);

// Middleware
app.use(express.json());
app.use(cookieParser(COOKIE_SECRET));
app.set('trust proxy', 1);

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true
});
const statusLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10
});

app.use('/api/', apiLimiter);

// Static files (core/public/)
app.use('/public', express.static(path.join(ROOT_DIR, 'core', 'public')));

// ── Discover and register panels ──
const panelRegistry = panels.discoverPanels(ROOT_DIR);

// ── Serve panel UI files (ui.js) for browser import ──
app.get('/api/panels/:panelId/ui.js', (req, res) => {
  const panelId = req.params.panelId;
  const panelInfo = panelRegistry.get(panelId);
  if (!panelInfo) return res.status(404).send('Panel not found');
  const uiPath = path.join(panelInfo.path, 'ui.js');
  if (!fs.existsSync(uiPath)) return res.status(404).send('No UI for panel');
  res.setHeader('Content-Type', 'application/javascript');
  res.sendFile(uiPath);
});
const context = { hooks, config, auth };
panels.registerPanelAPIs(app, panelRegistry, context);

// ── Load custom hooks (if exists) ──
const customHooksPath = path.join(ROOT_DIR, 'custom', 'hooks.js');
if (fs.existsSync(customHooksPath)) {
  try {
    const customHooks = require(customHooksPath);
    if (typeof customHooks === 'function') {
      customHooks(hooks, { config, auth });
    }
    console.log('[Hooks] Loaded custom/hooks.js');
  } catch (err) {
    console.error('[Hooks] Error loading custom/hooks.js:', err.message);
  }
}

// ── Load custom routes (if exist) ──
const customRoutesDir = path.join(ROOT_DIR, 'custom', 'routes');
if (fs.existsSync(customRoutesDir)) {
  const routeFiles = fs.readdirSync(customRoutesDir).filter(f => f.endsWith('.js'));
  for (const file of routeFiles) {
    try {
      const routeModule = require(path.join(customRoutesDir, file));
      if (typeof routeModule === 'function') {
        routeModule(app, { hooks, config, auth });
      }
      console.log(`[Routes] Loaded custom/routes/${file}`);
    } catch (err) {
      console.error(`[Routes] Error loading custom/routes/${file}:`, err.message);
    }
  }
}

// ── Load plugin hooks and routes ──
const pluginsDir = path.join(ROOT_DIR, 'plugins');
if (fs.existsSync(pluginsDir)) {
  const plugins = fs.readdirSync(pluginsDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);
  for (const plugin of plugins) {
    const pluginDir = path.join(pluginsDir, plugin);
    
    // Load plugin hooks
    const pluginHooksPath = path.join(pluginDir, 'hooks.js');
    if (fs.existsSync(pluginHooksPath)) {
      try {
        const pluginHooks = require(pluginHooksPath);
        if (typeof pluginHooks === 'function') {
          pluginHooks(hooks, { config, auth });
        }
        console.log(`[Hooks] Loaded plugins/${plugin}/hooks.js`);
      } catch (err) {
        console.error(`[Hooks] Error loading plugins/${plugin}/hooks.js:`, err.message);
      }
    }

    // Load plugin routes
    const pluginRoutesDir = path.join(pluginDir, 'routes');
    if (fs.existsSync(pluginRoutesDir)) {
      const routeFiles = fs.readdirSync(pluginRoutesDir).filter(f => f.endsWith('.js'));
      for (const file of routeFiles) {
        try {
          const routeModule = require(path.join(pluginRoutesDir, file));
          if (typeof routeModule === 'function') {
            routeModule(app, { hooks, config, auth });
          }
          console.log(`[Routes] Loaded plugins/${plugin}/routes/${file}`);
        } catch (err) {
          console.error(`[Routes] Error loading plugins/${plugin}/routes/${file}:`, err.message);
        }
      }
    }
  }
}

// ── API Routes (preserved from v1) ──

// Safe config (no secrets)
app.get('/api/config', (req, res) => {
  const { allowedUsers, ...safeConfig } = config;
  res.json(hooks.filter('api.config', safeConfig));
});

// Panel manifest list
app.get('/api/panels', (req, res) => {
  const panelList = panels.buildPanelList(panelRegistry, config);
  res.json(hooks.filter('api.panels', panelList));
});

// Auth check (Mini App)
app.post('/api/auth', (req, res) => {
  const { initData } = req.body || {};
  if (!initData) return res.status(401).json({ ok: false });
  const user = auth.validateInitData(initData);
  if (!user || !auth.isAllowed(user.id)) return res.status(401).json({ ok: false });
  return res.json({ ok: true, user: { id: user.id, first_name: user.first_name } });
});

// Auth check (Browser)
app.get('/api/auth', (req, res) => {
  const user = auth.getUserFromCookie(req);
  if (!user || !auth.isAllowed(user.id)) return res.status(401).json({ ok: false });
  return res.json({ ok: true, user });
});

// Claude usage data
function getUsageData() {
  try {
    const data = fs.readFileSync(path.join(WORKSPACE, 'claude-usage.json'), 'utf8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

app.get('/api/usage', auth.requireAuth, (req, res) => {
  const data = getUsageData();
  if (!data) return res.status(404).json({ error: 'Usage data not available' });
  res.json(hooks.filter('api.usage', data));
});

app.post('/api/usage', (req, res) => {
  const user = auth.validateInitData(req.body?.initData);
  if (!user || !auth.isAllowed(user.id)) return res.status(403).json({ error: 'Unauthorized' });
  const data = getUsageData();
  if (!data) return res.status(404).json({ error: 'Usage data not available' });
  res.json(hooks.filter('api.usage', data));
});

// Refresh Claude usage
app.post('/api/usage/refresh', statusLimiter, async (req, res) => {
  let user = req.body?.initData ? auth.validateInitData(req.body.initData) : auth.getUserFromCookie(req);
  if (!user || !auth.isAllowed(user.id)) return res.status(403).json({ error: 'Unauthorized' });

  try {
    const scriptPath = path.join(WORKSPACE, 'skills/claude-usage-monitor/scripts/claude-usage-poll.sh');
    const { execFile } = require('child_process');
    execFile('bash', [scriptPath], {
      timeout: 15000,
      env: { ...process.env, HOME: process.env.HOME || '/home/claw' }
    }, (err) => {
      if (err) return res.status(500).json({ error: 'Refresh failed' });
      const data = getUsageData();
      res.json(data || { error: 'No data after refresh' });
    });
  } catch {
    res.status(500).json({ error: 'Refresh failed' });
  }
});

// System metrics
async function getSystemMetrics() {
  const [cpu, mem, disk, time, osInfo, proc] = await Promise.all([
    si.currentLoad(),
    si.mem(),
    si.fsSize(),
    si.time(),
    si.osInfo(),
    si.processes()
  ]);
  const rootDisk = disk.find(d => d.mount === '/') || disk[0] || {};
  return hooks.filter('api.metrics', {
    cpu: { load: Math.round(cpu.currentLoad * 10) / 10, cores: cpu.cpus?.length || 0 },
    memory: {
      total: mem.total,
      used: mem.used,
      free: mem.free,
      available: mem.available,
      pct: Math.round((mem.used / mem.total) * 1000) / 10
    },
    disk: {
      total: rootDisk.size || 0,
      used: rootDisk.used || 0,
      free: (rootDisk.size || 0) - (rootDisk.used || 0),
      pct: Math.round((rootDisk.use || 0) * 10) / 10,
      mount: rootDisk.mount || '/'
    },
    uptime: time.uptime,
    os: `${osInfo.distro} ${osInfo.release}`,
    hostname: osInfo.hostname,
    processes: { total: proc.all, running: proc.running, sleeping: proc.sleeping },
    ts: Date.now()
  });
}

app.get('/api/metrics', auth.requireAuth, async (req, res) => {
  res.json(await getSystemMetrics());
});

app.post('/api/metrics', async (req, res) => {
  const user = auth.validateInitData(req.body?.initData);
  if (!user || !auth.isAllowed(user.id)) return res.status(403).json({ error: 'Unauthorized' });
  res.json(await getSystemMetrics());
});

// OpenClaw status
function getSystemStatus() {
  try {
    const raw = execFileSync('openclaw', ['status'], {
      timeout: 5000,
      encoding: 'utf8',
      shell: false
    }).trim();
    return { _raw: raw };
  } catch {
    return null;
  }
}

app.get('/api/status', auth.requireAuth, (req, res) => {
  const data = getSystemStatus();
  res.json(hooks.filter('api.status', data || { _raw: 'Status unavailable' }));
});

app.post('/api/status', (req, res) => {
  const user = auth.validateInitData(req.body?.initData);
  if (!user || !auth.isAllowed(user.id)) return res.status(403).json({ error: 'Unauthorized' });
  const data = getSystemStatus();
  res.json(hooks.filter('api.status', data || { _raw: 'Status unavailable' }));
});

// Agent info
function getAgentInfo() {
  try {
    const cfgPath = path.join(WORKSPACE, '..', 'openclaw.json');
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

app.get('/api/agent', auth.requireAuth, (req, res) => {
  res.json(hooks.filter('api.agent', getAgentInfo() || {}));
});

app.post('/api/agent', (req, res) => {
  const user = auth.validateInitData(req.body?.initData);
  if (!user || !auth.isAllowed(user.id)) return res.status(403).json({ error: 'Unauthorized' });
  res.json(hooks.filter('api.agent', getAgentInfo() || {}));
});

// Cron jobs
function getCronJobs() {
  try {
    const cronPaths = [
      path.join(WORKSPACE, '..', 'cron', 'jobs.json'),
      path.join(WORKSPACE, '..', 'agents', 'main', 'cron-jobs.json')
    ];
    for (const p of cronPaths) {
      if (fs.existsSync(p)) {
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
      }
    }
    return [];
  } catch {
    return [];
  }
}

app.get('/api/crons', auth.requireAuth, (req, res) => {
  res.json(hooks.filter('api.crons', getCronJobs()));
});

app.post('/api/crons', (req, res) => {
  const user = auth.validateInitData(req.body?.initData);
  if (!user || !auth.isAllowed(user.id)) return res.status(403).json({ error: 'Unauthorized' });
  res.json(hooks.filter('api.crons', getCronJobs()));
});

// Cron actions
app.post('/api/crons/action', statusLimiter, async (req, res) => {
  let user = req.body?.initData ? auth.validateInitData(req.body.initData) : auth.getUserFromCookie(req);
  if (!user || !auth.isAllowed(user.id)) return res.status(403).json({ error: 'Unauthorized' });

  const { jobId, action } = req.body || {};
  if (!jobId || !action) return res.status(400).json({ error: 'Missing jobId or action' });
  if (!['run', 'enable', 'disable'].includes(action)) return res.status(400).json({ error: 'Invalid action' });

  try {
    if (action === 'run') {
      execFileSync('openclaw', ['cron', 'run', jobId], { timeout: 10000, encoding: 'utf8', shell: false });
    } else if (action === 'enable') {
      execFileSync('openclaw', ['cron', 'update', jobId, '--enabled', 'true'], { timeout: 5000, encoding: 'utf8', shell: false });
    } else if (action === 'disable') {
      execFileSync('openclaw', ['cron', 'update', jobId, '--enabled', 'false'], { timeout: 5000, encoding: 'utf8', shell: false });
    }
    res.json({ ok: true, action, jobId });
  } catch {
    res.status(500).json({ error: 'Action failed' });
  }
});

// Version info
app.get('/api/version', (req, res) => {
  res.json(updater.getVersionInfo());
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: updater.getVersionInfo().version });
});

// ── Pages ──
app.get('/', (req, res) => {
  res.sendFile(path.join(ROOT_DIR, 'core', 'public', 'landing.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(ROOT_DIR, 'core', 'public', 'shell.html'));
});

// Telegram Login Widget callback
app.get('/auth/telegram/callback', authLimiter, (req, res) => {
  const params = req.query;
  if (!params.hash || !params.id) return res.status(400).send('Invalid login data');
  
  try {
    if (!auth.validateTelegramLogin(params)) return res.status(401).send('Authentication failed');
  } catch {
    return res.status(401).send('Authentication failed');
  }

  const authDate = parseInt(params.auth_date || '0', 10);
  if (Math.floor(Date.now() / 1000) - authDate > 86400) return res.status(401).send('Login expired');
  
  const userId = parseInt(params.id, 10);
  if (!auth.isAllowed(userId)) return res.status(403).send('Access denied');

  const userInfo = JSON.stringify({
    id: userId,
    first_name: params.first_name || '',
    username: params.username || ''
  });

  res.cookie('tg_user', userInfo, {
    signed: true,
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  res.redirect('/dashboard');
});

// Logout
app.get('/auth/logout', (req, res) => {
  res.clearCookie('tg_user');
  res.redirect('/');
});

// ── WebSocket for live metrics ──
const wss = new WebSocketServer({ server, path: '/ws/metrics' });

wss.on('connection', (ws) => {
  let authenticated = false;
  let interval = null;

  ws.on('message', async (msg) => {
    try {
      const data = JSON.parse(msg);
      if (data.type === 'auth') {
        let user = null;
        if (data.initData) {
          user = auth.validateInitData(data.initData);
        } else if (data.cookieAuth) {
          user = data.user;
        }
        if (user && auth.isAllowed(user.id)) {
          authenticated = true;
          ws.send(JSON.stringify({ type: 'auth', ok: true }));

          const sendMetrics = async () => {
            if (ws.readyState !== 1) {
              clearInterval(interval);
              return;
            }
            try {
              const metrics = await getSystemMetrics();
              const usageData = getUsageData();
              const agentInfo = getAgentInfo();
              const cronJobs = getCronJobs();
              ws.send(JSON.stringify({
                type: 'metrics',
                data: hooks.filter('ws.metrics', metrics),
                usage: hooks.filter('ws.usage', usageData),
                agent: hooks.filter('ws.agent', agentInfo),
                crons: hooks.filter('ws.crons', cronJobs)
              }));
            } catch {}
          };

          sendMetrics();
          interval = setInterval(sendMetrics, 2000);
        } else {
          ws.send(JSON.stringify({ type: 'auth', ok: false }));
          ws.close();
        }
      }
    } catch {
      ws.close();
    }
  });

  ws.on('close', () => {
    if (interval) clearInterval(interval);
  });
  ws.on('error', () => {
    if (interval) clearInterval(interval);
  });

  setTimeout(() => {
    if (!authenticated) ws.close();
  }, 10000);
});

// Fire server.ready hook
hooks.action('server.ready', server, config);

// Start server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n[Server] ${config.name || 'OpenClaw Dashboard'} v${updater.getVersionInfo().version} running on http://0.0.0.0:${PORT}\n`);
});
