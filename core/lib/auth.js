/**
 * Authentication module — Telegram Mini App & Login Widget validation
 * 
 * Supports two auth flows:
 * 1. Mini App: HMAC validation of initData
 * 2. Browser: Login Widget → signed cookie
 */

const crypto = require('crypto');

let BOT_TOKEN = null;
let ALLOWED_USERS = new Set();

/**
 * Initialize auth module with bot token and allowed user IDs
 * @param {string} token - Telegram bot token
 * @param {number[]} allowedIds - Array of Telegram user IDs
 */
function init(token, allowedIds = []) {
  BOT_TOKEN = token;
  ALLOWED_USERS = new Set(allowedIds);
}

/**
 * Validate Telegram Mini App initData (HMAC-SHA256)
 * @param {string} initData - Raw initData string from Telegram WebApp
 * @returns {object|null} User object if valid, null otherwise
 */
function validateInitData(initData) {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return null;

    // Remove hash from params before validation
    params.delete('hash');

    // Sort params alphabetically and build data-check-string
    const entries = [...params.entries()].sort(([a], [b]) => a.localeCompare(b));
    const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join('\n');

    // Compute HMAC: HMAC_SHA256(secret_key, data-check-string)
    // where secret_key = HMAC_SHA256("WebAppData", BOT_TOKEN)
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(BOT_TOKEN)
      .digest();
    const computedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    // Timing-safe comparison
    if (!crypto.timingSafeEqual(Buffer.from(computedHash, 'hex'), Buffer.from(hash, 'hex'))) {
      return null;
    }

    // Check auth_date (expire after 24 hours)
    const authDate = parseInt(params.get('auth_date') || '0', 10);
    if (Math.floor(Date.now() / 1000) - authDate > 86400) {
      return null;
    }

    // Parse and return user
    const user = params.get('user');
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
}

/**
 * Validate Telegram Login Widget callback (HMAC-SHA256)
 * @param {object} params - Query params from Telegram OAuth callback
 * @returns {boolean} True if valid, false otherwise
 */
function validateTelegramLogin(params) {
  const hash = params.hash;
  const checkParams = { ...params };
  delete checkParams.hash;

  // Build data-check-string
  const dataCheckString = Object.keys(checkParams)
    .sort()
    .map(k => `${k}=${checkParams[k]}`)
    .join('\n');

  // Compute HMAC: HMAC_SHA256(SHA256(BOT_TOKEN), data-check-string)
  const secretKey = crypto.createHash('sha256').update(BOT_TOKEN).digest();
  const hmac = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  // Timing-safe comparison
  return crypto.timingSafeEqual(Buffer.from(hmac, 'hex'), Buffer.from(hash, 'hex'));
}

/**
 * Extract user from signed cookie (for browser mode)
 * @param {object} req - Express request object (with cookieParser)
 * @returns {object|null} User object if valid, null otherwise
 */
function getUserFromCookie(req) {
  try {
    const data = req.signedCookies.tg_user;
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

/**
 * Check if a user ID is allowed
 * @param {number} userId - Telegram user ID
 * @returns {boolean}
 */
function isAllowed(userId) {
  return ALLOWED_USERS.has(userId);
}

/**
 * Express middleware — require auth (Mini App initData OR signed cookie)
 * Attaches user to req.user if authenticated
 * @param {object} req - Express request
 * @param {object} res - Express response
 * @param {function} next - Next middleware
 */
function requireAuth(req, res, next) {
  let user = null;

  // Try initData first (Mini App)
  if (req.body && req.body.initData) {
    user = validateInitData(req.body.initData);
  }

  // Fallback to cookie (browser)
  if (!user) {
    user = getUserFromCookie(req);
  }

  // Check if user is valid and allowed
  if (!user || !isAllowed(user.id)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Attach user to request
  req.user = user;
  next();
}

module.exports = {
  init,
  validateInitData,
  validateTelegramLogin,
  getUserFromCookie,
  isAllowed,
  requireAuth
};
