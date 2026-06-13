// Signed session cookies using only Node's built-in crypto — no extra deps.
// A cookie holds a small JSON payload plus an HMAC signature. If the signature
// doesn't verify (tampered, or signed with a different secret), it's rejected.

const crypto = require('crypto');

const COOKIE_NAME = 'rc_session';
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      'SESSION_SECRET is missing or too short. Set a long random value in your .env file.'
    );
  }
  return secret;
}

function base64url(input) {
  return Buffer.from(input).toString('base64url');
}

function sign(value) {
  return crypto.createHmac('sha256', getSecret()).update(value).digest('base64url');
}

// Build a signed token from a payload object.
function createToken(payload) {
  const body = base64url(JSON.stringify({ ...payload, exp: Date.now() + MAX_AGE_MS }));
  const sig = sign(body);
  return `${body}.${sig}`;
}

// Verify a token and return its payload, or null if invalid/expired.
function verifyToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  const expected = sign(body);
  // Constant-time compare to avoid leaking signature info via timing.
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

// Minimal cookie parser (avoids pulling in cookie-parser).
function parseCookies(req) {
  const header = req.headers.cookie;
  const out = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    out[key] = decodeURIComponent(val);
  }
  return out;
}

function setSessionCookie(res, username) {
  const token = createToken({ user: username });
  const attrs = [
    `${COOKIE_NAME}=${token}`,
    'HttpOnly',
    'Path=/',
    'SameSite=Lax',
    `Max-Age=${Math.floor(MAX_AGE_MS / 1000)}`,
  ];
  if (process.env.NODE_ENV === 'production') attrs.push('Secure');
  res.setHeader('Set-Cookie', attrs.join('; '));
}

function clearSessionCookie(res) {
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`
  );
}

function getSession(req) {
  const cookies = parseCookies(req);
  return verifyToken(cookies[COOKIE_NAME]);
}

// Validate submitted credentials against the env-configured admin account.
function checkCredentials(username, password) {
  const ADMIN_USER = process.env.ADMIN_USER;
  const ADMIN_PASS = process.env.ADMIN_PASS;
  if (!ADMIN_USER || !ADMIN_PASS) {
    throw new Error('ADMIN_USER and ADMIN_PASS must be set in your environment.');
  }
  // Constant-time comparison for both fields.
  const safeEqual = (x, y) => {
    const bx = Buffer.from(String(x));
    const by = Buffer.from(String(y));
    if (bx.length !== by.length) return false;
    return crypto.timingSafeEqual(bx, by);
  };
  return safeEqual(username, ADMIN_USER) && safeEqual(password, ADMIN_PASS);
}

// Express middleware: blocks API requests without a valid session.
function requireAuth(req, res, next) {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'Not authenticated' });
  req.session = session;
  next();
}

module.exports = {
  COOKIE_NAME,
  setSessionCookie,
  clearSessionCookie,
  getSession,
  checkCredentials,
  requireAuth,
};
