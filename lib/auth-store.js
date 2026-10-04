const crypto = require("node:crypto");
const { isSupabaseConfigured, supabaseRequest } = require("./supabase-db");
const sessions = new Map();
const attempts = new Map();
const WINDOW_SECONDS = 900;
const MAX_ATTEMPTS = 5;
function persistent() {
  if (isSupabaseConfigured()) return true;
  if (process.env.VERCEL || process.env.NODE_ENV === "production") {
    const error = new Error(
      "Konfigurasi Supabase dan migrasi auth diperlukan untuk login.",
    );
    error.statusCode = 503;
    throw error;
  }
  return false;
}
function hash(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}
async function consumeAttempt(key, now = Date.now()) {
  if (persistent())
    return supabaseRequest("rpc/consume_login_attempt", {
      method: "POST",
      body: { p_key: key },
    });
  for (const [id, value] of attempts)
    if (value.expires <= now) attempts.delete(id);
  const value = attempts.get(key) || {
    count: 0,
    expires: now + WINDOW_SECONDS * 1000,
  };
  const allowed = value.count < MAX_ATTEMPTS;
  value.count++;
  attempts.set(key, value);
  return {
    allowed,
    retry_after: Math.max(1, Math.ceil((value.expires - now) / 1000)),
  };
}
async function saveSession(token, expires, passwordHash) {
  const id = hash(token);
  if (persistent()) {
    await supabaseRequest("auth_sessions", {
      method: "POST",
      body: {
        token_hash: id,
        expires_at: new Date(expires).toISOString(),
        password_hash: passwordHash,
      },
    });
  } else {
    for (const [key, value] of sessions)
      if (value.expires <= Date.now()) sessions.delete(key);
    sessions.set(id, { expires, password_hash: passwordHash });
  }
}
async function getSession(token) {
  const id = hash(token);
  if (persistent()) {
    const rows = await supabaseRequest(
      `auth_sessions?token_hash=eq.${id}&select=expires_at,password_hash&limit=1`,
    );
    return rows?.[0]
      ? { ...rows[0], expires: Date.parse(rows[0].expires_at) }
      : null;
  }
  return sessions.get(id);
}
async function deleteSession(token) {
  if (persistent())
    await supabaseRequest(`auth_sessions?token_hash=eq.${hash(token)}`, {
      method: "DELETE",
    });
  else sessions.delete(hash(token));
}
module.exports = {
  hash,
  consumeAttempt,
  saveSession,
  getSession,
  deleteSession,
};
