const crypto = require("node:crypto");

const AUTH_COOKIE = "postpilot_auth";
const AUTH_MESSAGE = "postpilot-auth-v1";

function getAppPassword() {
  return process.env.APP_PASSWORD || "";
}

function authToken() {
  const password = getAppPassword();
  if (!password) return "";
  return crypto.createHmac("sha256", password).update(AUTH_MESSAGE).digest("base64url");
}

function parseCookies(header) {
  const cookies = {};
  for (const part of String(header || "").split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    cookies[key] = decodeURIComponent(value);
  }
  return cookies;
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a || ""));
  const right = Buffer.from(String(b || ""));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function isAuthed(req) {
  const expected = authToken();
  if (!expected) return false;
  const cookies = parseCookies(req.headers.cookie);
  return safeEqual(cookies[AUTH_COOKIE], expected);
}

function requireAuth(req) {
  if (!getAppPassword()) {
    const error = new Error("APP_PASSWORD belum diset di Vercel env.");
    error.statusCode = 500;
    throw error;
  }

  if (!isAuthed(req)) {
    const error = new Error("Unauthorized.");
    error.statusCode = 401;
    throw error;
  }
}

function authCookie() {
  const token = authToken();
  return `${AUTH_COOKIE}=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=2592000`;
}

function clearAuthCookie() {
  return `${AUTH_COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}

function verifyPassword(input) {
  const password = getAppPassword();
  return Boolean(password) && safeEqual(String(input || ""), password);
}

module.exports = {
  authCookie,
  clearAuthCookie,
  isAuthed,
  requireAuth,
  verifyPassword,
};
