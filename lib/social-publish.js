// Publishing Post Pilot posts and reading their engagement: Facebook Page
// (Graph API) and Threads (Threads API). Every network call goes through
// deps.fetch, so tests never reach Meta. Nothing here runs without an explicit
// publish action from the owner.
const GRAPH_BASE = String(process.env.META_GRAPH_API_URL || "https://graph.facebook.com/v25.0").replace(/\/+$/, "");
const THREADS_BASE = "https://graph.threads.net/v1.0";
const THREADS_LIMIT = 500;
const THREADS_MAX_PARTS = 25;
const TIMEOUT_MS = 20000;

class SocialError extends Error {
  constructor(code, message, statusCode = 502) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

function defaultDeps() {
  return { fetch, sleep: (ms) => new Promise((done) => setTimeout(done, ms)) };
}

// Meta error bodies can echo request details, so only the status and Meta's
// own numeric code decide the message shown.
function metaError(name, status, payload) {
  const code = Number(payload?.error?.code) || 0;
  if (status === 401 || code === 190) return new SocialError("auth", `Token ${name} tamat tempoh atau tidak sah. Kemas kini token di Tetapan > Akaun sosial.`, 502);
  if (status === 403 || [10, 200, 299].includes(code)) return new SocialError("permission", `Token ${name} tiada kebenaran untuk tindakan ini. Semak kebenaran token.`, 502);
  if (status === 429 || [4, 17, 32, 613].includes(code)) return new SocialError("rate_limit", `${name} sedang hadkan permintaan. Cuba semula kemudian.`, 429);
  if (status >= 500) return new SocialError("unavailable", `${name} tidak tersedia buat sementara. Cuba semula.`, 503);
  return new SocialError("rejected", `${name} menolak permintaan (${status}${code ? `, kod ${code}` : ""}).`, 502);
}

async function call(name, url, { method = "GET", token, form, deps }) {
  let response;
  try {
    response = await deps.fetch(url, {
      method,
      headers: { authorization: `Bearer ${token}`, accept: "application/json", ...(form ? { "content-type": "application/x-www-form-urlencoded" } : {}) },
      body: form ? new URLSearchParams(form).toString() : undefined,
      redirect: "error",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new SocialError("network", `${name} tidak dapat dihubungi atau tamat masa. Cuba semula.`, 504);
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.error) throw metaError(name, response.status, payload);
  return payload;
}

const total = (value) => Number(value?.summary?.total_count ?? value?.count ?? value) || 0;

// ---------- Facebook Page ----------

const PAGE_FIELDS = "id,message,created_time,permalink_url,shares,reactions.summary(total_count).limit(0),comments.summary(total_count).limit(0)";
const PAGE_REACH = "insights.metric(post_impressions_unique)";

function pagePost(row) {
  const reach = Number(row?.insights?.data?.[0]?.values?.[0]?.value);
  return {
    remoteId: String(row.id || ""),
    url: String(row.permalink_url || ""),
    text: String(row.message || ""),
    postedAt: row.created_time ? new Date(row.created_time).toISOString() : "",
    metrics: { reactions: total(row.reactions), comments: total(row.comments), shares: total(row.shares), ...(Number.isFinite(reach) ? { reach } : {}) },
  };
}

// Reach needs the read_insights permission. Without it the post is still read,
// only without reach.
async function pageRead(path, account, deps) {
  const join = path.includes("?") ? "&" : "?";
  try {
    return await call("Facebook", `${GRAPH_BASE}/${path}${join}fields=${encodeURIComponent(`${PAGE_FIELDS},${PAGE_REACH}`)}`, { token: account.token, deps });
  } catch (error) {
    if (!["permission", "rejected"].includes(error.code)) throw error;
    return call("Facebook", `${GRAPH_BASE}/${path}${join}fields=${encodeURIComponent(PAGE_FIELDS)}`, { token: account.token, deps });
  }
}

const facebookPage = {
  name: "Facebook Page",
  // With a photo the post is a Page photo whose caption is the text.
  async publish(account, text, { image = "" } = {}, deps = defaultDeps()) {
    const created = image
      ? await call("Facebook", `${GRAPH_BASE}/${account.accountId}/photos`, { method: "POST", token: account.token, form: { url: image, caption: text }, deps })
      : await call("Facebook", `${GRAPH_BASE}/${account.accountId}/feed`, { method: "POST", token: account.token, form: { message: text }, deps });
    const id = String(created?.post_id || created?.id || "");
    if (!id) throw new SocialError("rejected", "Facebook tidak memulangkan ID post.", 502);
    const info = await call("Facebook", `${GRAPH_BASE}/${id}?fields=permalink_url`, { token: account.token, deps }).catch(() => ({}));
    return { remoteId: id, url: String(info.permalink_url || `https://www.facebook.com/${id}`) };
  },
  async metrics(account, remoteId, deps = defaultDeps()) {
    return pagePost(await pageRead(String(remoteId), account, deps)).metrics;
  },
  async list(account, { limit = 50 } = {}, deps = defaultDeps()) {
    const payload = await pageRead(`${account.accountId}/posts?limit=${Math.min(100, limit)}`, account, deps);
    return (payload.data || []).map(pagePost).filter((post) => post.remoteId && post.text.trim().length >= 80);
  },
  async test(account, deps = defaultDeps()) {
    const page = await call("Facebook", `${GRAPH_BASE}/${account.accountId}?fields=id,name`, { token: account.token, deps });
    await call("Facebook", `${GRAPH_BASE}/${account.accountId}/posts?limit=1&fields=id`, { token: account.token, deps });
    return { connected: true, name: String(page.name || ""), message: `Disambung ke Page "${String(page.name || account.accountId)}". Bacaan post disahkan; kebenaran menghantar post hanya diketahui pada post pertama.` };
  },
};

// ---------- Threads ----------

function threadsMetrics(payload) {
  const value = (name) => Number((payload.data || []).find((row) => row.name === name)?.values?.[0]?.value) || 0;
  return { reactions: value("likes"), comments: value("replies"), shares: value("reposts") + value("quotes"), views: value("views") };
}

async function threadsPost(account, text, replyTo, image, deps) {
  const container = await call("Threads", `${THREADS_BASE}/${account.accountId}/threads`, { method: "POST", token: account.token, form: { ...(image ? { media_type: "IMAGE", image_url: image } : { media_type: "TEXT" }), text, ...(replyTo ? { reply_to_id: replyTo } : {}) }, deps });
  if (!container?.id) throw new SocialError("rejected", "Threads tidak memulangkan ID.", 502);
  // A fresh container is sometimes not ready for a moment, longer when Threads
  // has to fetch a photo; retries cover it.
  const waits = image ? [4000, 8000, 15000] : [1500, 4000];
  for (let attempt = 0; ; attempt += 1) {
    await deps.sleep(waits[attempt]);
    try {
      const published = await call("Threads", `${THREADS_BASE}/${account.accountId}/threads_publish`, { method: "POST", token: account.token, form: { creation_id: container.id }, deps });
      if (published?.id) return String(published.id);
      throw new SocialError("rejected", "Threads tidak memulangkan ID post.", 502);
    } catch (error) {
      if (attempt >= waits.length - 1 || !["rejected", "unavailable"].includes(error.code)) throw error;
    }
  }
}

const threads = {
  name: "Threads",
  // Posts the parts in order, each a reply to the one before. If a later part
  // fails the earlier ones stay up, and the error says how far it got.
  // The photo, when there is one, goes on the first part.
  async publish(account, parts, { image = "" } = {}, deps = defaultDeps()) {
    const list = validateParts(parts);
    const ids = [];
    for (const part of list) {
      try {
        ids.push(await threadsPost(account, part, ids[ids.length - 1] || "", ids.length ? "" : image, deps));
      } catch (error) {
        if (!ids.length) throw error;
        throw Object.assign(new SocialError("partial", `Threads berhenti selepas bahagian ${ids.length} daripada ${list.length}: ${error.message}`, 502), { postedIds: ids });
      }
    }
    const info = await call("Threads", `${THREADS_BASE}/${ids[0]}?fields=permalink`, { token: account.token, deps }).catch(() => ({}));
    return { remoteId: ids[0], partIds: ids, url: String(info.permalink || "") };
  },
  async metrics(account, remoteId, deps = defaultDeps()) {
    return threadsMetrics(await call("Threads", `${THREADS_BASE}/${remoteId}/insights?metric=views,likes,replies,reposts,quotes`, { token: account.token, deps }));
  },
  async list(account, { limit = 50 } = {}, deps = defaultDeps()) {
    const payload = await call("Threads", `${THREADS_BASE}/me/threads?fields=id,text,timestamp,permalink,media_type&limit=${Math.min(100, limit)}`, { token: account.token, deps });
    return (payload.data || [])
      .filter((row) => row.id && String(row.text || "").trim().length >= 80)
      .map((row) => ({ remoteId: String(row.id), url: String(row.permalink || ""), text: String(row.text), postedAt: row.timestamp ? new Date(row.timestamp).toISOString() : "", metrics: null }));
  },
  async test(account, deps = defaultDeps()) {
    const me = await call("Threads", `${THREADS_BASE}/me?fields=id,username`, { token: account.token, deps });
    if (String(me.id) !== String(account.accountId)) throw new SocialError("mismatch", "Token ini milik akaun Threads lain daripada User ID yang dimasukkan.", 400);
    return { connected: true, name: String(me.username || ""), message: `Disambung ke Threads @${String(me.username || account.accountId)}.` };
  },
  // Long-lived Threads tokens last 60 days and can be renewed once a day old.
  async refresh(account, deps = defaultDeps()) {
    let response;
    try {
      response = await deps.fetch(`${THREADS_BASE}/refresh_access_token?grant_type=th_refresh_token&access_token=${encodeURIComponent(account.token)}`, { redirect: "error", signal: AbortSignal.timeout(TIMEOUT_MS) });
    } catch {
      throw new SocialError("network", "Threads tidak dapat dihubungi untuk memperbaharui token.", 504);
    }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.access_token) throw metaError("Threads", response.status, payload);
    return { token: String(payload.access_token), expiresAt: new Date(Date.now() + (Number(payload.expires_in) || 5184000) * 1000).toISOString() };
  },
};

// ---------- thread parts ----------

function validateParts(parts) {
  const list = (Array.isArray(parts) ? parts : []).map((part) => String(part ?? "").replace(/\r\n?/g, "\n").trim()).filter(Boolean);
  if (!list.length) throw new SocialError("invalid", "Thread kosong.", 400);
  if (list.length > THREADS_MAX_PARTS) throw new SocialError("invalid", `Thread terlalu panjang (maksimum ${THREADS_MAX_PARTS} bahagian).`, 400);
  const long = list.findIndex((part) => part.length > THREADS_LIMIT);
  if (long >= 0) throw new SocialError("invalid", `Bahagian ${long + 1} ada ${list[long].length} aksara; had Threads ialah ${THREADS_LIMIT}.`, 400);
  return list;
}

// Splits text into parts of at most `limit` characters without AI: whole
// paragraphs where they fit, then sentences, then words. Order is preserved
// and nothing is dropped.
function splitForThreads(text, limit = THREADS_LIMIT - 20) {
  const pieces = [];
  for (const paragraph of String(text || "").replace(/\r\n?/g, "\n").split(/\n{2,}/).map((part) => part.trim()).filter(Boolean)) {
    if (paragraph.length <= limit) { pieces.push({ text: paragraph, join: "\n\n" }); continue; }
    for (const sentence of paragraph.match(/(?:[^.!?…]+[.!?…]*|[.!?…]+)\s*/g) || [paragraph]) {
      const clean = sentence.trim();
      if (!clean) continue;
      if (clean.length <= limit) { pieces.push({ text: clean, join: " " }); continue; }
      let line = "";
      for (const word of clean.split(/\s+/)) {
        if (line && line.length + 1 + word.length > limit) {
          pieces.push({ text: line, join: " " });
          line = "";
        }
        let rest = word;
        while (rest.length > limit) {
          const end = /[\uD800-\uDBFF]/.test(rest[limit - 1]) ? limit - 1 : limit;
          pieces.push({ text: rest.slice(0, end), join: "" });
          rest = rest.slice(end);
        }
        line = line ? `${line} ${rest}` : rest;
      }
      if (line) pieces.push({ text: line, join: " " });
    }
    pieces[pieces.length - 1].join = "\n\n";
  }
  const parts = [];
  let current = "";
  let glue = "";
  for (const piece of pieces) {
    if (current && `${current}${glue}${piece.text}`.length > limit) { parts.push(current); current = piece.text; }
    else current = current ? `${current}${glue}${piece.text}` : piece.text;
    glue = piece.join;
  }
  if (current) parts.push(current);
  return parts;
}

module.exports = { SocialError, THREADS_LIMIT, THREADS_MAX_PARTS, facebookPage, splitForThreads, threads, validateParts };
