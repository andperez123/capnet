/**
 * Session helpers for operator auth (cookie-based).
 * Cookie: HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=...
 */

const COOKIE_NAME = 'capnet_session';
const MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7 days

/**
 * Parse session ID from cookie header.
 * @param {string} cookieHeader - Cookie header value
 * @returns {string|null} sessionId or null
 */
function parseSessionFromCookie(cookieHeader) {
  if (!cookieHeader || typeof cookieHeader !== 'string') return null;
  const parts = cookieHeader.split(';').map((p) => p.trim());
  for (const p of parts) {
    const [name, value] = p.split('=').map((s) => s.trim());
    if (name === COOKIE_NAME && value) return decodeURIComponent(value);
  }
  return null;
}

/**
 * Create a random session ID.
 */
function createSessionId() {
  return 'sess_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/**
 * Build Set-Cookie header value for session.
 * @param {string} sessionId
 * @param {boolean} secure - Use Secure flag (true in production)
 */
function buildSetCookie(sessionId, secure = true) {
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(sessionId)}`,
    'HttpOnly',
    'Path=/',
    `Max-Age=${MAX_AGE_SEC}`,
    'SameSite=Lax',
  ];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

/**
 * Set session cookie on response.
 * @param {import('http').ServerResponse} res
 * @param {string} sessionId
 */
function setSessionCookie(res, sessionId) {
  const isDev = !process.env.VERCEL && process.env.NODE_ENV !== 'production';
  res.setHeader('Set-Cookie', buildSetCookie(sessionId, !isDev));
}

/**
 * Require session; returns { session, operatorId, email } or null if invalid.
 * @param {import('http').IncomingMessage} req
 * @param {Function} getSession - async (sessionId) => session
 */
async function requireSession(req, getSession) {
  const cookieHeader = req.headers.cookie || req.headers.Cookie || '';
  const sessionId = parseSessionFromCookie(cookieHeader);
  if (!sessionId) return null;
  const session = await getSession(sessionId);
  return session || null;
}

module.exports = {
  COOKIE_NAME,
  MAX_AGE_SEC,
  parseSessionFromCookie,
  createSessionId,
  buildSetCookie,
  setSessionCookie,
  requireSession,
};
