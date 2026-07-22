const { checkGoogleDriveConnection, getMergedClientsWithStatus } = require("./invoices");
const { getRemoteOverview } = require("./postpilot-remote");
const { tikTokConnectionStatus } = require("./tiktok-ads");
const {
  listActivity,
  listOpenOperationsIncidents,
  listOperationsHealth,
  listRecentDailyReportDeliveries,
} = require("./supabase-db");
const { recordServiceHealth } = require("./operations-events");
const { isTransientError } = require("./retry-policy");

const STALE_MS = 24 * 60 * 60 * 1000;
const CHECK_TIMEOUT_MS = 12000;

const SERVICE_DEFINITIONS = [
  { id: "supabase", label: "Supabase", description: "Database dan storage", action: {} },
  { id: "google_drive", label: "Google Drive", description: "Report, invoice dan receipt", action: { kind: "href", label: "Reconnect", href: "/api/google/oauth-start" } },
  { id: "meta_adflow", label: "Meta / AdFlow", description: "Meta Ads reporting", action: { kind: "navigate", label: "Open Client Pilot", tab: "clientpilot" } },
  { id: "tiktok", label: "TikTok MCP", description: "TikTok Ads reporting", action: { kind: "href", label: "Reauthorize", href: "/api/tiktok/oauth-start" } },
  { id: "telegram", label: "Telegram Bot", description: "Daily report delivery", action: { kind: "navigate", label: "Open Client Pilot", tab: "clientpilot" } },
  { id: "facebook_page", label: "Facebook Page", description: "Page Pilot publishing", action: { kind: "navigate", label: "Open Page Pilot", tab: "personalpostpilot", subtab: "pagepilot-panel" } },
  { id: "mac_extension", label: "Chrome Mac", description: "Remote Post Pilot automation", action: { kind: "navigate", label: "Open Post Pilot", tab: "personalpostpilot", subtab: "postpilot-auto-panel" } },
];

function clean(value) {
  return String(value || "").trim();
}

function activeClients(clients = []) {
  return clients.filter((client) => !client.deletedAt && client.serviceStatus !== "paused");
}

function adsConfig(client) {
  return client?.metadata?.adsReportConfig || {};
}

function telegramRecipients(client) {
  return client?.metadata?.telegramReportConfig?.recipients || [];
}

function serviceContext(clients = [], remote = {}) {
  const active = activeClients(clients);
  const metaUsed = active.some((client) => clean(adsConfig(client).platform || "meta").toLowerCase() !== "tiktok" && clean(adsConfig(client).accountId));
  const tiktokUsed = active.some((client) => clean(adsConfig(client).platform).toLowerCase() === "tiktok" && clean(adsConfig(client).accountId));
  const telegramUsed = active.some((client) => telegramRecipients(client).some((recipient) => recipient.chatId || recipient.autoEnabled));
  return {
    supabase: { configured: Boolean(process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY)), required: true },
    google_drive: { configured: Boolean(process.env.GOOGLE_REFRESH_TOKEN), required: active.length > 0 },
    meta_adflow: { configured: Boolean(process.env.ADFLOW_MCP_TOKEN), required: metaUsed },
    tiktok: { configured: tiktokUsed || Boolean(process.env.TIKTOK_TOKEN_ENCRYPTION_KEY), required: tiktokUsed },
    telegram: { configured: Boolean(process.env.TELEGRAM_BOT_TOKEN), required: telegramUsed },
    facebook_page: { configured: Boolean(process.env.FACEBOOK_PAGE_ID && process.env.FACEBOOK_PAGE_ACCESS_TOKEN), required: Boolean(process.env.FACEBOOK_PAGE_ID || process.env.FACEBOOK_PAGE_ACCESS_TOKEN) },
    mac_extension: { configured: Boolean(remote.device), required: Boolean(remote.device || remote.activeJob) },
  };
}

function publicJob(job) {
  if (!job) return null;
  const progress = job.progress || {};
  const recoveryAttempt = Math.max(0, Number(progress.recoveryAttempt) || 0);
  return {
    id: job.id,
    status: job.status,
    type: job.type || job.jobType,
    progress,
    recovery: recoveryAttempt ? {
      attempt: recoveryAttempt,
      maxAttempts: 2,
      failureClass: progress.failureClass || "",
      nextRetryAt: progress.nextRetryAt || "",
      recovered: (job.status === "completed" || job.status === "sent") && recoveryAttempt > 0,
    } : null,
    error: job.error || job.errorMessage || "",
    createdAt: job.createdAt || job.created_at || "",
    updatedAt: job.updatedAt || job.updated_at || job.createdAt || "",
  };
}

function clientNameMap(clients = []) {
  return new Map(clients.map((client) => [clean(client.code).toUpperCase(), client.brandClient || client.name || client.code]));
}

function incidentToPublic(row, names) {
  const clientCode = clean(row.client_code).replace(/#TG\d+$/i, "").toUpperCase();
  return {
    id: row.id || row.fingerprint,
    fingerprint: row.fingerprint,
    severity: row.severity || "warning",
    service: row.service_name || "",
    title: row.title || "BuddyPilot perlukan perhatian",
    detail: row.detail || "",
    clientCode,
    clientName: names.get(clientCode) || clientCode,
    action: row.action || {},
    lastSeenAt: row.last_seen_at || row.updated_at || "",
  };
}

function syntheticIncidents(remote, deliveries, names) {
  const items = [];
  for (const job of remote.jobs || []) {
    if (!['failed', 'expired'].includes(job.status)) continue;
    items.push({
      id: `job:${job.id}`,
      fingerprint: `postpilot-job:${job.id}`,
      severity: "critical",
      service: "mac_extension",
      title: "Post Pilot automation gagal",
      detail: job.error || "Job tidak berjaya diselesaikan.",
      clientCode: "",
      clientName: "",
      action: { kind: "automation", label: "Retry", operation: "retry", jobId: job.id },
      lastSeenAt: job.updatedAt || job.createdAt || "",
    });
  }
  for (const delivery of deliveries) {
    if (delivery.status !== "failed") continue;
    const rawCode = clean(delivery.client_code).toUpperCase();
    const clientCode = rawCode.replace(/#TG2$/i, "");
    const recipientSlot = /#TG2$/i.test(rawCode) ? 2 : Number(delivery.metadata?.recipientSlot || 1);
    items.push({
      id: `telegram:${delivery.id}`,
      fingerprint: `telegram-delivery:${rawCode}:${delivery.report_date}`,
      severity: "critical",
      service: "telegram",
      title: `Telegram report gagal${names.get(clientCode) ? ` · ${names.get(clientCode)}` : ""}`,
      detail: delivery.error_message || "Daily report tidak berjaya dihantar.",
      clientCode,
      clientName: names.get(clientCode) || clientCode,
      action: { kind: "telegram", label: "Resend", clientCode, recipientSlot },
      lastSeenAt: delivery.updated_at || delivery.created_at || "",
    });
  }
  return items;
}

function mergeIncidents(rows, synthetic, names) {
  const map = new Map();
  for (const row of rows) map.set(row.fingerprint, incidentToPublic(row, names));
  for (const item of synthetic) if (!map.has(item.fingerprint)) map.set(item.fingerprint, item);
  return [...map.values()].sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === "critical" ? -1 : 1;
    return new Date(b.lastSeenAt || 0) - new Date(a.lastSeenAt || 0);
  });
}

function baseHealth(definition, row, context, now) {
  const configured = Boolean(context.configured);
  const required = Boolean(context.required);
  let status = row?.status || (configured ? "warning" : "setup");
  let detail = row?.detail || (configured ? "Belum diperiksa." : "Belum digunakan.");
  const checkedAt = row?.last_checked_at || "";
  const checkedMs = new Date(checkedAt).getTime();
  if (["healthy", "warning"].includes(status) && Number.isFinite(checkedMs) && now.getTime() - checkedMs > STALE_MS) {
    status = "stale";
    detail = `Last known: ${detail || "status lama"}`;
  }
  return {
    id: definition.id,
    label: definition.label,
    description: definition.description,
    status,
    detail,
    required,
    configured,
    latencyMs: row?.latency_ms ?? null,
    checkedAt,
    action: definition.action,
  };
}

function buildHealth({ rows = [], context = {}, remote = {}, tiktok = {}, now = new Date() }) {
  const rowMap = new Map(rows.map((row) => [row.service_name, row]));
  return SERVICE_DEFINITIONS.map((definition) => {
    const item = baseHealth(definition, rowMap.get(definition.id), context[definition.id] || {}, now);
    if (definition.id === "supabase") {
      return { ...item, status: "healthy", detail: "Snapshot database tersedia.", checkedAt: now.toISOString() };
    }
    if (definition.id === "tiktok") {
      if (!tiktok.connected) {
        const status = tiktok.status === "expired" || (item.required && tiktok.status !== "disconnected") ? "down" : "setup";
        return { ...item, status, detail: tiktok.error || (status === "down" ? "Authorization tamat atau gagal." : "Belum digunakan."), checkedAt: tiktok.expiresAt || item.checkedAt };
      }
      return {
        ...item,
        status: tiktok.status === "expiring" ? "warning" : "healthy",
        detail: tiktok.status === "expiring" ? "Authorization tamat dalam tujuh hari." : "Authorization aktif.",
        checkedAt: tiktok.authorizedAt || item.checkedAt,
        metadata: { expiresAt: tiktok.expiresAt || "" },
      };
    }
    if (definition.id === "mac_extension") {
      if (!remote.device) return { ...item, status: "setup", detail: "Mac extension belum dipasangkan." };
      const online = ["online", "busy"].includes(remote.device.status) || remote.device.online;
      return {
        ...item,
        status: online ? "healthy" : remote.activeJob ? "down" : "warning",
        detail: online ? (remote.activeJob ? "Online dan sedang menjalankan job." : "Online dan sedia menerima job.") : (remote.activeJob ? "Mac offline ketika job sedang menunggu." : "Mac sedang offline."),
        checkedAt: remote.device.lastSeenAt || remote.device.last_seen_at || item.checkedAt,
      };
    }
    return item;
  });
}

function operationFromActivity(item) {
  const failed = /failed|error/i.test(item.type || "");
  return {
    id: `activity:${item.id}`,
    type: "activity",
    status: failed ? "failed" : "completed",
    title: item.title,
    detail: item.description || "",
    timestamp: item.createdAt || "",
  };
}

function buildRecentOperations(remote, deliveries, activities) {
  const jobs = (remote.jobs || []).map((job) => ({
    id: `job:${job.id}`,
    type: "automation",
    status: job.status,
    title: job.type === "threads_text" ? "Threads automation" : "Facebook + Threads automation",
    detail: job.recovery?.recovered
      ? `Recovered automatically · ${job.progress?.message || "Selesai."}`
      : job.error || job.progress?.message || "",
    timestamp: job.updatedAt || job.createdAt || "",
  }));
  const telegram = deliveries.map((row) => ({
    id: `delivery:${row.id}`,
    type: "telegram",
    status: row.status,
    title: `Telegram report · ${clean(row.client_code).replace(/#TG2$/i, "")}`,
    detail: row.status === "failed" ? row.error_message : row.report_date,
    timestamp: row.updated_at || row.created_at || "",
  }));
  return [...jobs, ...telegram, ...activities.map(operationFromActivity)]
    .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))
    .slice(0, 50);
}

function buildOperationsOverview({ clients = [], remote = {}, tiktok = {}, healthRows = [], incidentRows = [], deliveries = [], activities = [], warnings = [], now = new Date() } = {}) {
  const names = clientNameMap(clients);
  const context = serviceContext(clients, remote);
  const health = buildHealth({ rows: healthRows, context, remote, tiktok, now });
  const incidents = mergeIncidents(incidentRows, syntheticIncidents(remote, deliveries, names), names);
  const requiredProblems = health.filter((item) => item.required && item.status !== "healthy");
  const critical = incidents.some((item) => item.severity === "critical") || requiredProblems.some((item) => item.status === "down");
  const activeOperations = [publicJob(remote.activeJob)].filter(Boolean);
  const overall = critical ? "critical" : (incidents.length || requiredProblems.length ? "attention" : "operational");
  return {
    generatedAt: now.toISOString(),
    overall,
    summary: {
      running: activeOperations.length,
      failed: incidents.filter((item) => item.severity === "critical").length,
      attention: incidents.length + requiredProblems.length,
      healthy: health.filter((item) => item.status === "healthy").length,
    },
    health,
    incidents,
    activeOperations,
    recentOperations: buildRecentOperations(remote, deliveries, activities),
    clients: { total: clients.length, active: activeClients(clients).length },
    warnings,
  };
}

async function settled(promise, fallback, warnings, label) {
  try {
    return await promise;
  } catch (error) {
    warnings.push(`${label}: ${error?.message || error}`);
    return fallback;
  }
}

async function getOperationsOverview() {
  const warnings = [];
  const [clientResult, remote, tiktok, healthRows, incidentRows, deliveries, activities] = await Promise.all([
    settled(getMergedClientsWithStatus(), { clients: [] }, warnings, "Pelanggan"),
    settled(getRemoteOverview(), {}, warnings, "Automation"),
    settled(tikTokConnectionStatus(), {}, warnings, "TikTok"),
    settled(listOperationsHealth(), [], warnings, "Health"),
    settled(listOpenOperationsIncidents(40), [], warnings, "Incident"),
    settled(listRecentDailyReportDeliveries(40), [], warnings, "Telegram"),
    settled(listActivity(50), [], warnings, "Activity"),
  ]);
  return buildOperationsOverview({ clients: clientResult.clients, remote, tiktok, healthRows, incidentRows, deliveries, activities, warnings });
}

function timeoutSignal(ms = CHECK_TIMEOUT_MS) {
  return AbortSignal.timeout(ms);
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, { ...options, signal: options.signal || timeoutSignal() });
  const json = await response.json().catch(() => null);
  if (!response.ok || json?.error) throw new Error(json?.error?.message || json?.description || `HTTP ${response.status}`);
  return json;
}

async function probeService(serviceName, remote) {
  if (serviceName === "supabase") {
    await listActivity(1);
    return { status: "healthy", detail: "Database read berjaya." };
  }
  if (serviceName === "google_drive") {
    if (!process.env.GOOGLE_REFRESH_TOKEN) return { status: "setup", detail: "Google Drive belum disambung." };
    const result = await checkGoogleDriveConnection();
    return { status: "healthy", detail: result.emailAddress || result.displayName || "Google Drive connected.", metadata: result };
  }
  if (serviceName === "meta_adflow") {
    const token = clean(process.env.ADFLOW_MCP_TOKEN);
    if (!token) return { status: "setup", detail: "ADFLOW_MCP_TOKEN belum diset." };
    const response = await fetchJson("https://adflowapps.com/api/mcp", {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json", accept: "application/json, text/event-stream" },
      body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method: "tools/call", params: { name: "list_ad_accounts", arguments: {} } }),
    });
    if (response?.error) throw new Error(response.error.message || "AdFlow MCP gagal.");
    return { status: "healthy", detail: "AdFlow MCP memberi respons." };
  }
  if (serviceName === "tiktok") {
    const result = await tikTokConnectionStatus();
    if (!result.connected) return { status: result.status === "expired" ? "down" : "setup", detail: result.error || "TikTok MCP belum connected.", metadata: result };
    return { status: result.status === "expiring" ? "warning" : "healthy", detail: result.status === "expiring" ? "Authorization tamat dalam tujuh hari." : "TikTok authorization aktif.", metadata: result };
  }
  if (serviceName === "telegram") {
    const token = clean(process.env.TELEGRAM_BOT_TOKEN);
    if (!token) return { status: "setup", detail: "TELEGRAM_BOT_TOKEN belum diset." };
    const result = await fetchJson(`https://api.telegram.org/bot${token}/getMe`);
    return { status: "healthy", detail: result.result?.username ? `@${result.result.username}` : "Telegram Bot connected." };
  }
  if (serviceName === "facebook_page") {
    const pageId = clean(process.env.FACEBOOK_PAGE_ID);
    const token = clean(process.env.FACEBOOK_PAGE_ACCESS_TOKEN);
    if (!pageId || !token) return { status: "setup", detail: "Facebook Page belum dikonfigurasi." };
    const url = new URL(`https://graph.facebook.com/v21.0/${pageId}`);
    url.searchParams.set("fields", "id,name");
    url.searchParams.set("access_token", token);
    const result = await fetchJson(url);
    return { status: "healthy", detail: result.name || `Page ${result.id}` };
  }
  if (serviceName === "mac_extension") {
    const overview = remote || await getRemoteOverview();
    if (!overview.device) return { status: "setup", detail: "Mac extension belum dipasangkan." };
    const online = ["online", "busy"].includes(overview.device.status) || overview.device.online;
    return { status: online ? "healthy" : overview.activeJob ? "down" : "warning", detail: online ? "Chrome Mac online." : "Chrome Mac offline.", metadata: { lastSeenAt: overview.device.lastSeenAt || "" } };
  }
  throw new Error("Health service tidak sah.");
}

async function checkOneService(serviceName, { required = false, remote = null } = {}) {
  const definition = SERVICE_DEFINITIONS.find((item) => item.id === serviceName);
  if (!definition) throw new Error("Health service tidak sah.");
  const started = Date.now();
  let lastError;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const result = await probeService(serviceName, remote);
      await recordServiceHealth({ serviceName, ...result, latencyMs: Date.now() - started, required, action: definition.action });
      return { serviceName, ...result, latencyMs: Date.now() - started };
    } catch (error) {
      lastError = error;
      if (attempt === 2 || !isTransientError(error)) break;
      await new Promise((resolve) => setTimeout(resolve, 350));
    }
  }
  const detail = lastError?.message || String(lastError);
  await recordServiceHealth({ serviceName, status: "down", detail, latencyMs: Date.now() - started, required, action: definition.action });
  return { serviceName, status: "down", detail, latencyMs: Date.now() - started };
}

async function runHealthChecks(serviceNames = []) {
  const [clientResult, remote] = await Promise.all([
    getMergedClientsWithStatus().catch(() => ({ clients: [] })),
    getRemoteOverview().catch(() => ({})),
  ]);
  const context = serviceContext(clientResult.clients, remote);
  const targets = serviceNames.length ? serviceNames : SERVICE_DEFINITIONS.map((item) => item.id);
  return Promise.all(targets.map((serviceName) => checkOneService(serviceName, { required: context[serviceName]?.required, remote })));
}

module.exports = {
  SERVICE_DEFINITIONS,
  STALE_MS,
  buildOperationsOverview,
  checkOneService,
  getOperationsOverview,
  runHealthChecks,
  serviceContext,
};
