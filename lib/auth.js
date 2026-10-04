const crypto = require("node:crypto");
const store = require("./auth-store");
const AUTH_COOKIE = "postpilot_auth";
const SESSION_SECONDS = 8 * 60 * 60;
function getAppPassword() {
  return process.env.APP_PASSWORD || "";
}
function parseCookies(header) {
  const cookies = {};
  for (const part of String(header || "").split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    try {
      cookies[part.slice(0, idx).trim()] = decodeURIComponent(
        part.slice(idx + 1).trim(),
      );
    } catch {
      /* Ignore malformed cookies. */
    }
  }
  return cookies;
}
function safeEqual(a, b) {
  const left = Buffer.from(String(a || ""));
  const right = Buffer.from(String(b || ""));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}
function sessionToken(req) {
  const token = parseCookies(req.headers.cookie)[AUTH_COOKIE];
  return /^[A-Za-z0-9_-]{43}$/.test(token || "") ? token : "";
}
async function isAuthed(req) {
  const token = sessionToken(req);
  if (!getAppPassword() || !token) return false;
  const session = await store.getSession(token);
  return Boolean(
    session &&
    session.expires > Date.now() &&
    safeEqual(session.password_hash, store.hash(getAppPassword())),
  );
}
async function requireAuth(req) {
  if (!getAppPassword()) {
    const error = new Error("APP_PASSWORD belum diset di Vercel env.");
    error.statusCode = 500;
    throw error;
  }
  if (!(await isAuthed(req))) {
    const error = new Error("Unauthorized.");
    error.statusCode = 401;
    throw error;
  }
}
async function authCookie() {
  const token = crypto.randomBytes(32).toString("base64url");
  await store.saveSession(
    token,
    Date.now() + SESSION_SECONDS * 1000,
    store.hash(getAppPassword()),
  );
  return `${AUTH_COOKIE}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${SESSION_SECONDS}`;
}
function clearAuthCookie() {
  return `${AUTH_COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}
async function revokeSession(req) {
  const token = sessionToken(req);
  if (token) await store.deleteSession(token);
}
async function checkLoginAttempt(req) {
  // Vercel overwrites x-vercel-forwarded-for. Never trust arbitrary x-forwarded-for.
  const address = process.env.VERCEL
    ? String(req.headers["x-vercel-forwarded-for"] || "unknown")
        .split(",")[0]
        .trim()
    : req.socket?.remoteAddress || "local";
  return store.consumeAttempt(store.hash(address));
}
function verifyPassword(input) {
  return Boolean(getAppPassword()) && safeEqual(input, getAppPassword());
}
module.exports = {
  authCookie,
  clearAuthCookie,
  isAuthed,
  requireAuth,
  verifyPassword,
  revokeSession,
  checkLoginAttempt,
};
