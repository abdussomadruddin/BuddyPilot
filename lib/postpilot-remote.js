const crypto = require("node:crypto");
const { getPostPilotHookImage, postPilotHookImageUrl } = require("./supabase-db");
const { reportOperationalFailure, reportOperationalSuccess } = require("./operations-events");

const ACTIVE_JOB_STATUSES = ["queued", "claimed", "running"];
const FINAL_JOB_STATUSES = ["completed", "failed", "cancelled", "expired"];
const PAIR_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const JOB_TTL_MS = 24 * 60 * 60 * 1000;

function config() {
  return {
    url: String(process.env.SUPABASE_URL || "").trim().replace(/\/+$/, ""),
    serviceKey: String(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || "").trim(),
    publishableKey: String(process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || "").trim(),
  };
}

function requireConfig() {
  const value = config();
  if (!value.url || !value.serviceKey) throw Object.assign(new Error("Set SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY dahulu."), { statusCode: 500 });
  return value;
}

async function request(path, options = {}) {
  const { url, serviceKey } = requireConfig();
  const response = await fetch(`${url}/rest/v1/${path}`, {
    method: options.method || "GET",
    headers: {
      apikey: serviceKey,
      authorization: `Bearer ${serviceKey}`,
      "content-type": "application/json",
      ...(options.prefer ? { Prefer: options.prefer } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  if (!response.ok) {
    const text = await response.text();
    let detail = text;
    try {
      const json = JSON.parse(text);
      detail = json.message || json.details || json.hint || text;
    } catch {
      // Keep the response text.
    }
    const error = new Error(detail || `Supabase request failed (${response.status}).`);
    error.statusCode = response.status;
    throw error;
  }
  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

function encode(value) {
  return encodeURIComponent(String(value || ""));
}

function hashSecret(value) {
  const key = process.env.APP_PASSWORD || requireConfig().serviceKey;
  return crypto.createHmac("sha256", key).update(String(value || "")).digest("hex");
}

function randomPairCode() {
  let code = "";
  for (let index = 0; index < 8; index += 1) {
    code += PAIR_CODE_ALPHABET[crypto.randomInt(0, PAIR_CODE_ALPHABET.length)];
  }
  return code;
}

function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64url");
}

function jobToPublic(row) {
  if (!row) return null;
  const progress = row.progress || {};
  const recoveryAttempt = Math.max(0, Number(progress.recoveryAttempt) || 0);
  return {
    id: row.id,
    type: row.job_type,
    status: row.status,
    progress,
    recovery: recoveryAttempt ? {
      attempt: recoveryAttempt,
      maxAttempts: 2,
      failureClass: progress.failureClass || "",
      nextRetryAt: progress.nextRetryAt || "",
      recovered: row.status === "completed",
    } : null,
    error: row.error_message || "",
    cancelRequested: Boolean(row.cancel_requested_at),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    expiresAt: row.expires_at,
    completedAt: row.completed_at,
  };
}

function deviceToPublic(row, activeJob = null) {
  if (!row) return null;
  const lastSeenMs = row.last_seen_at ? Date.now() - new Date(row.last_seen_at).getTime() : Infinity;
  return {
    id: row.id,
    name: row.device_name || "Mac Chrome",
    status: activeJob ? "busy" : lastSeenMs <= 90_000 ? "online" : "offline",
    pairedAt: row.paired_at,
    lastSeenAt: row.last_seen_at,
  };
}

async function expireQueuedJobs() {
  const now = new Date().toISOString();
  await request(`postpilot_automation_jobs?status=eq.queued&expires_at=lt.${encode(now)}`, {
    method: "PATCH",
    body: { status: "expired", error_message: "Job expired selepas menunggu 24 jam." },
  });
}

async function getActiveDeviceRow() {
  const rows = await request("postpilot_extension_devices?status=eq.active&select=*&order=paired_at.desc&limit=1");
  return rows?.[0] || null;
}

async function getActiveJobRow(deviceId = "") {
  await expireQueuedJobs();
  const deviceFilter = deviceId ? `&device_id=eq.${encode(deviceId)}` : "";
  const rows = await request(`postpilot_automation_jobs?status=in.(${ACTIVE_JOB_STATUSES.join(",")})${deviceFilter}&select=*&order=created_at.asc&limit=1`);
  return rows?.[0] || null;
}

async function createPairCode() {
  const code = randomPairCode();
  const now = new Date().toISOString();
  // Keep every still-valid code usable. This avoids invalidating the code shown
  // on another device when the Pair Mac button is tapped more than once.
  await request(`postpilot_extension_pair_codes?used_at=is.null&expires_at=lt.${encode(now)}`, {
    method: "PATCH",
    body: { used_at: now },
  });
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  await request("postpilot_extension_pair_codes", {
    method: "POST",
    prefer: "return=minimal",
    body: { code_hash: hashSecret(code), expires_at: expiresAt },
  });
  return { code, expiresAt };
}

async function pairDevice({ code, name }) {
  const normalized = String(code || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (normalized.length !== 8) throw Object.assign(new Error("Pairing code tidak sah."), { statusCode: 401 });
  const now = new Date().toISOString();
  const rows = await request(`postpilot_extension_pair_codes?code_hash=eq.${encode(hashSecret(normalized))}&used_at=is.null&expires_at=gt.${encode(now)}`, {
    method: "PATCH",
    prefer: "return=representation",
    body: { used_at: now },
  });
  const pairing = rows?.[0];
  if (!pairing) {
    throw Object.assign(new Error("Pairing code tidak sepadan atau sudah tamat tempoh. Jana code baru dalam webapp dan masukkan code yang masih dipaparkan."), { statusCode: 401 });
  }

  const token = randomToken();
  const wakeTopic = `postpilot-${randomToken(18)}`;
  await request("postpilot_extension_devices?status=eq.active", {
    method: "PATCH",
    body: { status: "revoked", revoked_at: now },
  });
  const created = await request("postpilot_extension_devices", {
    method: "POST",
    prefer: "return=representation",
    body: {
      device_name: String(name || "Mac Chrome").trim().slice(0, 80) || "Mac Chrome",
      token_hash: hashSecret(token),
      wake_topic: wakeTopic,
      status: "active",
      paired_at: now,
      last_seen_at: now,
    },
  });
  await request("postpilot_extension_pair_codes?used_at=is.null", {
    method: "PATCH",
    body: { used_at: now },
  });
  const { url, publishableKey } = config();
  return {
    device: deviceToPublic(created?.[0]),
    token,
    apiBaseUrl: String(process.env.APP_BASE_URL || "https://buddypilot.vercel.app").replace(/\/+$/, ""),
    realtime: publishableKey ? { url, key: publishableKey, topic: wakeTopic } : null,
  };
}

async function authenticateDevice(token) {
  if (!token) throw Object.assign(new Error("Extension token diperlukan."), { statusCode: 401 });
  const rows = await request(`postpilot_extension_devices?token_hash=eq.${encode(hashSecret(token))}&status=eq.active&select=*&limit=1`);
  const device = rows?.[0];
  if (!device) throw Object.assign(new Error("Extension belum dipasangkan atau token telah dibatalkan."), { statusCode: 401 });
  return device;
}

async function heartbeatDevice(device) {
  const now = new Date().toISOString();
  await request(`postpilot_extension_devices?id=eq.${encode(device.id)}&status=eq.active`, {
    method: "PATCH",
    body: { last_seen_at: now },
  });
}

function validatePayload(type, payload) {
  const posts = Array.isArray(payload?.posts) ? payload.posts : [];
  const max = type === "facebook_threads" ? 5 : 50;
  if (!posts.length || posts.length > max) throw Object.assign(new Error(`Job perlu ada 1 hingga ${max} post.`), { statusCode: 400 });
  for (const post of posts) {
    if (!String(post?.postText || "").trim()) throw Object.assign(new Error("Caption post tidak boleh kosong."), { statusCode: 400 });
    if (type === "facebook_threads" && !post?.image?.id) throw Object.assign(new Error("Setiap Facebook + Threads post mesti ada gambar hook."), { statusCode: 400 });
  }
  return posts.length;
}

async function assertJobAvailable() {
  const device = await getActiveDeviceRow();
  if (!device) throw Object.assign(new Error("Mac extension belum dipasangkan. Generate pairing code dahulu."), { statusCode: 409 });
  const active = await getActiveJobRow(device.id);
  if (active) throw Object.assign(new Error("Satu automation masih berjalan. Tunggu siap atau cancel dahulu."), { statusCode: 409, job: jobToPublic(active) });
  return device;
}

async function broadcastWake(device, jobId) {
  const { url, serviceKey, publishableKey } = config();
  if (!url || !serviceKey || !publishableKey || !device?.wake_topic) return false;
  try {
    const response = await fetch(`${url}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        messages: [{
          topic: device.wake_topic,
          event: "job-ready",
          payload: { jobId },
        }],
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function createJob({ type, payload, device: providedDevice = null }) {
  if (!["facebook_threads", "threads_text"].includes(type)) throw Object.assign(new Error("Jenis automation tidak sah."), { statusCode: 400 });
  const device = providedDevice || await assertJobAvailable();
  const total = validatePayload(type, payload);
  const now = new Date().toISOString();
  let rows;
  try {
    rows = await request("postpilot_automation_jobs", {
      method: "POST",
      prefer: "return=representation",
      body: {
        device_id: device.id,
        job_type: type,
        payload,
        status: "queued",
        progress: { index: 0, total, phase: "queued", message: "Menunggu Chrome Mac." },
        idempotency_key: crypto.randomUUID(),
        expires_at: new Date(Date.now() + JOB_TTL_MS).toISOString(),
      },
    });
  } catch (error) {
    if (/duplicate key|active_job/i.test(error.message || "")) {
      throw Object.assign(new Error("Satu automation masih berjalan. Tunggu siap atau cancel dahulu."), { statusCode: 409 });
    }
    throw error;
  }
  const job = rows?.[0];
  await broadcastWake(device, job.id);
  const deviceOffline = !device.last_seen_at || Date.now() - new Date(device.last_seen_at).getTime() > 90_000;
  if (deviceOffline) {
    await reportOperationalFailure({
      fingerprint: `mac-offline-queue:${device.id}`,
      serviceName: "mac_extension",
      entityType: "automation_device",
      entityId: device.id,
      title: "Chrome Mac offline",
      detail: "Post Pilot job sedang menunggu tetapi extension Mac tidak online.",
      action: { kind: "navigate", label: "Open Post Pilot", tab: "personalpostpilot", subtab: "postpilot-auto-panel" },
      metadata: { jobId: job.id },
    });
  } else {
    await reportOperationalSuccess({ fingerprint: `mac-offline-queue:${device.id}`, serviceName: "mac_extension", detail: "Chrome Mac online." });
  }
  return jobToPublic(job);
}

async function getRemoteOverview() {
  const device = await getActiveDeviceRow();
  const activeJob = device ? await getActiveJobRow(device.id) : null;
  const jobs = device
    ? await request(`postpilot_automation_jobs?device_id=eq.${encode(device.id)}&select=*&order=created_at.desc&limit=10`)
    : [];
  return {
    device: deviceToPublic(device, activeJob),
    activeJob: jobToPublic(activeJob),
    jobs: (jobs || []).map(jobToPublic),
  };
}

async function claimJob(device) {
  await heartbeatDevice(device);
  const existingRows = await request(`postpilot_automation_jobs?device_id=eq.${encode(device.id)}&status=in.(claimed,running)&select=*&order=created_at.asc&limit=1`);
  if (existingRows?.[0]) return existingRows[0];
  await expireQueuedJobs();
  const queued = await request(`postpilot_automation_jobs?device_id=eq.${encode(device.id)}&status=eq.queued&expires_at=gt.${encode(new Date().toISOString())}&select=*&order=created_at.asc&limit=1`);
  const job = queued?.[0];
  if (!job) return null;
  const claimed = await request(`postpilot_automation_jobs?id=eq.${encode(job.id)}&device_id=eq.${encode(device.id)}&status=eq.queued`, {
    method: "PATCH",
    prefer: "return=representation",
    body: {
      status: "claimed",
      claimed_at: new Date().toISOString(),
      progress: { ...(job.progress || {}), phase: "claimed", message: "Chrome Mac menerima job." },
    },
  });
  return claimed?.[0] || null;
}

async function getOwnedJob(device, jobId) {
  const rows = await request(`postpilot_automation_jobs?id=eq.${encode(jobId)}&device_id=eq.${encode(device.id)}&select=*&limit=1`);
  const job = rows?.[0];
  if (!job) throw Object.assign(new Error("Remote job tidak dijumpai."), { statusCode: 404 });
  return job;
}

async function updateJobProgress(device, { jobId, progress }) {
  await heartbeatDevice(device);
  const job = await getOwnedJob(device, jobId);
  if (FINAL_JOB_STATUSES.includes(job.status)) return { job, cancelRequested: true, terminalStatus: job.status };
  const merged = { ...(job.progress || {}), ...(progress || {}) };
  const rows = await request(`postpilot_automation_jobs?id=eq.${encode(job.id)}&device_id=eq.${encode(device.id)}`, {
    method: "PATCH",
    prefer: "return=representation",
    body: { status: "running", progress: merged, started_at: job.started_at || new Date().toISOString() },
  });
  return { job: rows?.[0] || job, cancelRequested: Boolean(job.cancel_requested_at), terminalStatus: "" };
}

async function finishJob(device, { jobId, status, error = "", progress = {} }) {
  const job = await getOwnedJob(device, jobId);
  const finalStatus = status === "completed" ? "completed" : status === "cancelled" ? "cancelled" : "failed";
  const now = new Date().toISOString();
  const rows = await request(`postpilot_automation_jobs?id=eq.${encode(job.id)}&device_id=eq.${encode(device.id)}`, {
    method: "PATCH",
    prefer: "return=representation",
    body: {
      status: finalStatus,
      progress: { ...(job.progress || {}), ...(progress || {}), phase: finalStatus },
      error_message: String(error || "").slice(0, 1200),
      completed_at: finalStatus === "completed" ? now : null,
      failed_at: finalStatus === "failed" ? now : null,
      cancelled_at: finalStatus === "cancelled" ? now : null,
    },
  });
  return jobToPublic(rows?.[0] || job);
}

async function jobAction({ jobId, action }) {
  const device = await getActiveDeviceRow();
  if (!device) throw Object.assign(new Error("Mac extension belum dipasangkan."), { statusCode: 409 });
  const rows = await request(`postpilot_automation_jobs?id=eq.${encode(jobId)}&device_id=eq.${encode(device.id)}&select=*&limit=1`);
  const job = rows?.[0];
  if (!job) throw Object.assign(new Error("Remote job tidak dijumpai."), { statusCode: 404 });
  const now = new Date().toISOString();
  if (action === "cancel") {
    const immediate = job.status === "queued" || job.status === "claimed";
    const updated = await request(`postpilot_automation_jobs?id=eq.${encode(job.id)}`, {
      method: "PATCH",
      prefer: "return=representation",
      body: immediate
        ? { status: "cancelled", cancelled_at: now, progress: { ...(job.progress || {}), phase: "cancelled", message: "Job dibatalkan." } }
        : { cancel_requested_at: now, progress: { ...(job.progress || {}), message: "Cancel diminta. Menunggu step semasa selesai." } },
    });
    return jobToPublic(updated?.[0] || job);
  }
  if (action === "retry") {
    if (!FINAL_JOB_STATUSES.includes(job.status) || job.status === "completed") throw Object.assign(new Error("Hanya job gagal, batal atau expired boleh diretry."), { statusCode: 409 });
    const active = await getActiveJobRow(device.id);
    if (active) throw Object.assign(new Error("Satu automation masih berjalan."), { statusCode: 409 });
    const updated = await request(`postpilot_automation_jobs?id=eq.${encode(job.id)}`, {
      method: "PATCH",
      prefer: "return=representation",
      body: {
        status: "queued",
        error_message: "",
        cancel_requested_at: null,
        cancelled_at: null,
        failed_at: null,
        expires_at: new Date(Date.now() + JOB_TTL_MS).toISOString(),
        progress: { ...(job.progress || {}), phase: "queued", message: "Retry menunggu Chrome Mac." },
      },
    });
    await broadcastWake(device, job.id);
    return jobToPublic(updated?.[0] || job);
  }
  throw Object.assign(new Error("Action tidak sah."), { statusCode: 400 });
}

async function downloadJobImage(device, { jobId, index }) {
  const job = await getOwnedJob(device, jobId);
  const safeIndex = Math.max(0, Number(index) || 0);
  const imageId = job.payload?.posts?.[safeIndex]?.image?.id;
  if (!imageId) throw Object.assign(new Error("Gambar job tidak dijumpai."), { statusCode: 404 });
  const image = await getPostPilotHookImage(imageId);
  return { image, url: postPilotHookImageUrl(image) };
}

module.exports = {
  assertJobAvailable,
  authenticateDevice,
  claimJob,
  createJob,
  createPairCode,
  downloadJobImage,
  finishJob,
  getRemoteOverview,
  heartbeatDevice,
  jobAction,
  jobToPublic,
  pairDevice,
  updateJobProgress,
  validatePayload,
};
