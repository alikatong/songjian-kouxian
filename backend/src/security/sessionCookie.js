const SESSION_COOKIE = 'xxgame_session';
const DAY_MS = 24 * 60 * 60 * 1000;
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function sessionMaxAge() {
  const configured = Number(process.env.AUTH_COOKIE_MAX_AGE_MS);
  return Number.isSafeInteger(configured) && configured > 0 && configured <= 30 * DAY_MS
    ? configured
    : 7 * DAY_MS;
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  };
}

function setSessionCookie(res, token) {
  res.cookie(SESSION_COOKIE, token, { ...cookieOptions(), maxAge: sessionMaxAge() });
}

function clearSessionCookie(res) {
  if (typeof res.clearCookie === 'function') res.clearCookie(SESSION_COOKIE, cookieOptions());
}

function readCookie(req, name) {
  const header = req.headers?.cookie;
  if (typeof header !== 'string' || !header) return null;
  for (const segment of header.split(';')) {
    const separator = segment.indexOf('=');
    if (separator === -1) continue;
    if (segment.slice(0, separator).trim() !== name) continue;
    try {
      return decodeURIComponent(segment.slice(separator + 1).trim());
    } catch (_error) {
      return null;
    }
  }
  return null;
}

function allowedOrigins() {
  const configured = (process.env.CLIENT_ORIGIN || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const localOrigins = process.env.NODE_ENV === 'production'
    ? []
    : ['http://localhost:5173', 'http://127.0.0.1:5173'];
  return new Set([...configured, ...localOrigins]);
}

function isAllowedBrowserOrigin(origin) {
  return typeof origin === 'string' && allowedOrigins().has(origin);
}

function requiresOriginCheck(req) {
  return !SAFE_METHODS.has(String(req.method || 'GET').toUpperCase());
}

module.exports = {
  SESSION_COOKIE,
  setSessionCookie,
  clearSessionCookie,
  readSessionCookie: (req) => readCookie(req, SESSION_COOKIE),
  allowedOrigins,
  isAllowedBrowserOrigin,
  requiresOriginCheck,
};
