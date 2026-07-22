const crypto = require("node:crypto");
const {
  clearTikTokMcpConnection,
  getTikTokMcpConnection,
  saveTikTokMcpConnection,
} = require("./supabase-db");
const { aggregateAdflowData, normalizeAdsReportConfig, validateCustomWeek } = require("./adflow-ads");
const { withTransientRetry } = require("./retry-policy");

const TIKTOK_MCP_URL = "https://business-api.tiktok.com/open_mcp/tt-ads-mcp-layer";
const AUTH_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

function cleanText(value) {
  return String(value || "").trim();
}

function encryptionKey() {
  const secret = cleanText(process.env.TIKTOK_TOKEN_ENCRYPTION_KEY);
  if (secret.length < 32) throw new Error("TIKTOK_TOKEN_ENCRYPTION_KEY mesti sekurang-kurangnya 32 aksara.");
  return crypto.createHash("sha256").update(secret).digest();
}

function encryptState(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".");
}

function decryptState(value) {
  if (!value) return {};
  const [version, iv, tag, encrypted] = String(value).split(".");
  if (version !== "v1" || !iv || !tag || !encrypted) throw new Error("TikTok OAuth state tidak sah.");
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(encrypted, "base64url")), decipher.final()]).toString("utf8"));
}

function appBaseUrl() {
  return cleanText(process.env.APP_BASE_URL || "https://buddypilot.vercel.app").replace(/\/+$/, "");
}

async function loadStoredConnection() {
  const row = await getTikTokMcpConnection();
  return { row, state: row?.encrypted_state ? decryptState(row.encrypted_state) : {} };
}

async function persistState(state, details = {}) {
  const now = new Date();
  const authorizedAt = details.authorizedAt || state.authorizedAt || null;
  const expiresAt = details.expiresAt || state.expiresAt || (authorizedAt ? new Date(new Date(authorizedAt).getTime() + AUTH_WINDOW_MS).toISOString() : null);
  state.authorizedAt = authorizedAt;
  state.expiresAt = expiresAt;
  return saveTikTokMcpConnection({
    encryptedState: encryptState(state),
    status: details.status || "authorizing",
    authorizedAt,
    expiresAt,
    errorMessage: details.errorMessage || "",
  });
}

class StoredTikTokOAuthProvider {
  constructor(state = {}) {
    this.data = state;
    this.authorizationUrl = "";
  }
  get redirectUrl() { return `${appBaseUrl()}/api/tiktok/oauth-callback`; }
  get clientMetadata() {
    return {
      client_name: "BuddyPilot TikTok Ads Reporting",
      redirect_uris: [this.redirectUrl],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
      application_type: "web",
    };
  }
  async state() { return this.data.oauthState; }
  async clientInformation() { return this.data.clientInformation; }
  async saveClientInformation(value) { this.data.clientInformation = value; await persistState(this.data); }
  async tokens() { return this.data.tokens; }
  async saveTokens(value) {
    this.data.tokens = value;
    const authorizedAt = this.data.authorizedAt || new Date().toISOString();
    await persistState(this.data, { status: "connected", authorizedAt });
  }
  async redirectToAuthorization(url) { this.authorizationUrl = String(url); }
  async saveCodeVerifier(value) { this.data.codeVerifier = value; await persistState(this.data); }
  async codeVerifier() { return this.data.codeVerifier || ""; }
  async saveDiscoveryState(value) { this.data.discoveryState = value; await persistState(this.data); }
  async discoveryState() { return this.data.discoveryState; }
  async invalidateCredentials(scope) {
    if (scope === "all" || scope === "tokens") delete this.data.tokens;
    if (scope === "all" || scope === "client") delete this.data.clientInformation;
    if (scope === "all" || scope === "verifier") delete this.data.codeVerifier;
    if (scope === "all" || scope === "discovery") delete this.data.discoveryState;
    await persistState(this.data, { status: "authorizing" });
  }
}

async function mcpClasses() {
  return require("@modelcontextprotocol/client");
}

async function createMcpConnection(provider) {
  const { Client, StreamableHTTPClientTransport } = await mcpClasses();
  const client = new Client({ name: "buddypilot", version: "1.0.0" });
  const transport = new StreamableHTTPClientTransport(new URL(TIKTOK_MCP_URL), { authProvider: provider });
  return { client, transport };
}

async function startTikTokAuthorization() {
  const { state } = await loadStoredConnection();
  state.oauthState = crypto.randomBytes(24).toString("base64url");
  delete state.tokens;
  delete state.codeVerifier;
  await persistState(state, { status: "authorizing", authorizedAt: null, expiresAt: null });
  const provider = new StoredTikTokOAuthProvider(state);
  const { client, transport } = await createMcpConnection(provider);
  try {
    await client.connect(transport);
  } catch (error) {
    if (provider.authorizationUrl) return provider.authorizationUrl;
    throw error;
  } finally {
    await transport.close().catch(() => {});
  }
  throw new Error("TikTok sudah connected. Disconnect dahulu jika mahu authorize semula.");
}

async function finishTikTokAuthorization(searchParams) {
  const { state } = await loadStoredConnection();
  if (!state.oauthState || searchParams.get("state") !== state.oauthState) throw new Error("TikTok OAuth state tidak sepadan.");
  const provider = new StoredTikTokOAuthProvider(state);
  const { client, transport } = await createMcpConnection(provider);
  try {
    await transport.finishAuth(searchParams);
    await client.connect(transport);
    const authorizedAt = new Date().toISOString();
    state.authorizedAt = authorizedAt;
    state.expiresAt = new Date(Date.now() + AUTH_WINDOW_MS).toISOString();
    delete state.codeVerifier;
    await persistState(state, { status: "connected", authorizedAt, expiresAt: state.expiresAt });
    return await listTikTokAdvertisersWithClient(client);
  } catch (error) {
    await persistState(state, { status: "error", errorMessage: error?.message || String(error) });
    throw error;
  } finally {
    await transport.close().catch(() => {});
  }
}

async function withTikTokClient(operation) {
  const { row, state } = await loadStoredConnection();
  if (!row || row.status === "disconnected") throw new Error("TikTok Ads belum connected.");
  if (row.expires_at && new Date(row.expires_at) <= new Date()) {
    await saveTikTokMcpConnection({ ...row, status: "expired", errorMessage: "Authorization TikTok tamat. Connect semula." });
    throw new Error("Authorization TikTok tamat. Connect semula.");
  }
  const provider = new StoredTikTokOAuthProvider(state);
  const { client, transport } = await createMcpConnection(provider);
  try {
    await client.connect(transport);
    return await operation(client);
  } catch (error) {
    const message = error?.message || String(error);
    const authFailed = /unauthori[sz]ed|invalid[_ -]?token|token.*expired|401/i.test(message);
    await saveTikTokMcpConnection({
      ...row,
      encryptedState: encryptState(provider.data),
      status: authFailed ? "expired" : (row.status === "connected" ? "connected" : row.status),
      errorMessage: message,
    });
    throw error;
  } finally {
    await transport.close().catch(() => {});
  }
}

function parseToolResult(result) {
  if (result?.structuredContent) return decodeMaybeJson(result.structuredContent);
  const text = (result?.content || []).filter((item) => item.type === "text").map((item) => item.text).join("\n").trim();
  if (!text) return {};
  return decodeMaybeJson(text);
}

function decodeMaybeJson(value) {
  let current = value;
  for (let depth = 0; depth < 4 && typeof current === "string"; depth += 1) {
    const text = current.trim();
    if (!text) return {};
    try { current = JSON.parse(text); } catch { return { text }; }
  }
  return current || {};
}

function payloadError(payload) {
  const roots = [payload, payload?.result, payload?.data].filter((item) => item && typeof item === "object");
  for (const root of roots) {
    const code = root.code ?? root.error_code ?? root.status_code;
    if (code != null && String(code) !== "0" && String(code).toLowerCase() !== "ok") {
      return cleanText(root.message || root.msg || root.error?.message || `TikTok API error ${code}`);
    }
    if (root.error && (typeof root.error === "string" || root.error.message)) {
      return cleanText(typeof root.error === "string" ? root.error : root.error.message);
    }
  }
  return "";
}

async function resolveTool(client, candidates, searchQuery) {
  let tools = (await client.listTools()).tools || [];
  let tool = tools.find((item) => candidates.includes(item.name))
    || tools.find((item) => candidates.some((name) => item.name.includes(name)));
  if (tool) return tool;
  const searchTool = tools.find((item) => /search.*tool|tool.*search/i.test(item.name));
  if (searchTool) {
    const schema = searchTool.inputSchema?.properties || {};
    const key = ["query", "keyword", "search_query", "description"].find((name) => schema[name]) || "query";
    await client.callTool({ name: searchTool.name, arguments: { [key]: searchQuery } });
    tools = (await client.listTools()).tools || [];
    tool = tools.find((item) => candidates.includes(item.name))
      || tools.find((item) => candidates.some((name) => item.name.includes(name)));
  }
  if (!tool) throw new Error(`TikTok MCP tool tidak dijumpai: ${searchQuery}`);
  return tool;
}

async function callResolvedTool(client, candidates, searchQuery, args) {
  const tool = await resolveTool(client, candidates, searchQuery);
  return withTransientRetry(async () => {
    const result = await client.callTool({ name: tool.name, arguments: args });
    const parsed = parseToolResult(result);
    const message = payloadError(parsed) || (result?.isError ? cleanText(parsed?.text) : "");
    if (!message) return parsed;
    const error = new Error(message);
    if (/rate limit|too many requests|429/i.test(message)) error.statusCode = 429;
    throw error;
  });
}

function rowsFromPayload(payload) {
  const queue = [decodeMaybeJson(payload)];
  const visited = new Set();
  while (queue.length) {
    const current = queue.shift();
    if (!current || typeof current !== "object" || visited.has(current)) continue;
    visited.add(current);
    if (Array.isArray(current)) {
      if (current.length && current.every((item) => item && typeof item === "object" && !item.type)) return current;
      queue.push(...current);
      continue;
    }
    for (const key of ["list", "rows", "advertisers", "items"]) {
      if (Array.isArray(current[key])) return current[key];
    }
    for (const key of ["data", "result", "response", "body", "payload"]) {
      if (current[key] != null) queue.push(decodeMaybeJson(current[key]));
    }
    if (Array.isArray(current.content)) {
      for (const item of current.content) if (item?.text) queue.push(decodeMaybeJson(item.text));
    }
  }
  return [];
}

async function listTikTokAdvertisersWithClient(client) {
  const payload = await callResolvedTool(client,
    ["oauth2_advertiser_get", "advertiser_get", "get_authorized_advertisers"],
    "get authorized advertiser accounts",
    {});
  return rowsFromPayload(payload).map((item) => ({
    id: cleanText(item.advertiser_id || item.id),
    name: cleanText(item.advertiser_name || item.name || item.advertiser_id),
    currency: cleanText(item.currency || "MYR").toUpperCase(),
    platform: "tiktok",
  })).filter((item) => item.id);
}

async function listTikTokAdvertisers() {
  return withTikTokClient(listTikTokAdvertisersWithClient);
}

function metricValue(row, keys) {
  for (const key of keys) if (row?.[key] != null && row[key] !== "") return Number(row[key]) || 0;
  return 0;
}

function normalizeTikTokRow(item, level, config) {
  const row = { ...(item.dimensions || {}), ...(item.metrics || {}), ...item };
  const genericResult = metricValue(row, ["result"]);
  const purchaseResults = metricValue(row, ["complete_payment", "onsite_total_purchase", "purchase", "conversion", "conversions"]);
  const directLeads = metricValue(row, ["onsite_form"])
    + metricValue(row, ["form"])
    + metricValue(row, ["total_sales_lead", "sales_lead"]);
  const directMessaging = metricValue(row, ["messaging_total_conversation_tiktok_direct_message", "messaging_conversation", "conversation"]);
  const conversions = purchaseResults || (config.resultMetric === "conversions" ? genericResult : 0);
  const leads = directLeads || metricValue(row, ["lead", "leads"]) || (config.resultMetric === "leads" ? genericResult : 0);
  const messaging = directMessaging || (config.resultMetric === "messaging_conversations" ? genericResult : 0);
  const common = {
    spend: metricValue(row, ["spend"]), impressions: metricValue(row, ["impressions"]), clicks: metricValue(row, ["clicks"]),
    link_clicks: metricValue(row, ["clicks_on_music_disc", "destination_clicks", "clicks"]), ctr: metricValue(row, ["ctr"]),
    cpm: metricValue(row, ["cpm"]), cpc: metricValue(row, ["cpc"]), reach: metricValue(row, ["reach"]),
    frequency: metricValue(row, ["frequency"]), conversions, leads, messaging_conversations: messaging,
    roas: metricValue(row, ["complete_payment_roas", "onsite_purchases_roas", "roas"]), currency: config.currency,
  };
  if (level === "advertiser") return common;
  if (level === "campaign") return { ...common, id: cleanText(row.campaign_id), name: cleanText(row.campaign_name || row.campaign_id) };
  if (level === "adgroup") return { ...common, id: cleanText(row.adgroup_id), name: cleanText(row.adgroup_name || row.adgroup_id), campaignId: cleanText(row.campaign_id), campaignName: cleanText(row.campaign_name) };
  return { ...common, id: cleanText(row.ad_id), name: cleanText(row.ad_name || row.ad_id), adSetId: cleanText(row.adgroup_id), adSetName: cleanText(row.adgroup_name), campaignId: cleanText(row.campaign_id), campaignName: cleanText(row.campaign_name) };
}

async function fetchTikTokLevel(client, config, startDate, endDate, level) {
  const dimensionMap = {
    advertiser: ["advertiser_id"], campaign: ["campaign_id"], adgroup: ["adgroup_id"], ad: ["ad_id"],
  };
  const attributeMetrics = {
    advertiser: ["advertiser_name"],
    campaign: ["campaign_name"],
    adgroup: ["campaign_id", "campaign_name", "adgroup_name"],
    ad: ["campaign_id", "campaign_name", "adgroup_id", "adgroup_name", "ad_name"],
  };
  const metrics = [
    "spend", "impressions", "clicks", "ctr", "cpc", "cpm", "reach", "frequency", "conversion", "result",
    ...attributeMetrics[level],
  ];
  if (config.resultMetric === "conversions") metrics.push("complete_payment", "complete_payment_roas", "onsite_total_purchase", "onsite_purchases_roas");
  if (config.resultMetric === "leads") metrics.push("onsite_form", "cost_per_onsite_form", "form", "cost_per_form", "sales_lead", "total_sales_lead");
  if (config.resultMetric === "messaging_conversations") metrics.push("messaging_total_conversation_tiktok_direct_message");
  const payload = await callResolvedTool(client,
    ["report_integrated_get", "integrated_report_get", "get_integrated_report"],
    "run synchronous integrated ads performance report",
    {
      advertiser_id: config.accountId,
      report_type: "BASIC",
      data_level: `AUCTION_${level.toUpperCase()}`,
      dimensions: dimensionMap[level],
      metrics: [...new Set(metrics)],
      start_date: startDate,
      end_date: endDate,
      page: 1,
      page_size: 1000,
    });
  return rowsFromPayload(payload).map((row) => normalizeTikTokRow(row, level, config));
}

function sumTikTokRows(rows, config) {
  const totals = rows.reduce((total, row) => {
    for (const key of ["spend", "impressions", "clicks", "link_clicks", "reach", "conversions", "leads", "messaging_conversations"]) {
      total[key] += Number(row[key]) || 0;
    }
    return total;
  }, { spend: 0, impressions: 0, clicks: 0, link_clicks: 0, reach: 0, conversions: 0, leads: 0, messaging_conversations: 0 });
  totals.ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
  totals.cpc = totals.clicks > 0 ? totals.spend / totals.clicks : 0;
  totals.cpm = totals.impressions > 0 ? (totals.spend / totals.impressions) * 1000 : 0;
  totals.frequency = totals.reach > 0 ? totals.impressions / totals.reach : 0;
  totals.currency = config.currency;
  return totals;
}

async function fetchTikTokReportRange(configInput, startDate, endDate, { validateWeek = true, allowEmpty = false } = {}) {
  const config = normalizeAdsReportConfig({ ...configInput, platform: "tiktok" });
  if (!config.accountId) throw new Error("Pilih TikTok advertiser dahulu.");
  if (validateWeek) validateCustomWeek(startDate, endDate);
  return withTikTokClient(async (client) => {
    const accountRows = await fetchTikTokLevel(client, config, startDate, endDate, "advertiser");
    const campaigns = await fetchTikTokLevel(client, config, startDate, endDate, "campaign");
    const adsets = await fetchTikTokLevel(client, config, startDate, endDate, "adgroup");
    const ads = await fetchTikTokLevel(client, config, startDate, endDate, "ad");
    if (!accountRows.length && !campaigns.length) {
      if (!allowEmpty) throw new Error(`Tiada data TikTok Ads untuk ${startDate} hingga ${endDate}. Semak advertiser dan tempoh report.`);
      const emptyAnalytics = aggregateAdflowData({
        insights: { currency: config.currency },
        campaigns: [],
        adsets: [],
        ads: [],
      }, config);
      emptyAnalytics.warnings.unshift("TikTok Ads tidak memulangkan insights untuk tarikh ini. Semua angka dilaporkan sebagai 0.");
      return emptyAnalytics;
    }
    const insights = accountRows[0] || sumTikTokRows(campaigns, config);
    return aggregateAdflowData({ insights: { ...insights, currency: config.currency }, campaigns, adsets, ads }, config);
  });
}

async function fetchTikTokCustomReport(configInput, startDate, endDate) {
  return fetchTikTokReportRange(configInput, startDate, endDate);
}

async function fetchTikTokDailyReport(configInput, reportDate) {
  return fetchTikTokReportRange(configInput, reportDate, reportDate, { validateWeek: false, allowEmpty: true });
}

async function tikTokConnectionStatus() {
  const row = await getTikTokMcpConnection();
  if (!row) return { status: "disconnected", connected: false };
  const expiresAt = row.expires_at || "";
  const expired = expiresAt && new Date(expiresAt) <= new Date();
  const expiring = expiresAt && !expired && new Date(expiresAt).getTime() - Date.now() <= 7 * 86400000;
  return {
    status: expired ? "expired" : expiring ? "expiring" : row.status,
    connected: row.status === "connected" && !expired,
    authorizedAt: row.authorized_at || "",
    expiresAt,
    error: row.error_message || "",
  };
}

async function disconnectTikTok() {
  await clearTikTokMcpConnection();
}

module.exports = {
  TIKTOK_MCP_URL,
  decryptState,
  disconnectTikTok,
  encryptState,
  _test: { decodeMaybeJson, normalizeTikTokRow, payloadError, rowsFromPayload, sumTikTokRows },
  fetchTikTokCustomReport,
  fetchTikTokDailyReport,
  finishTikTokAuthorization,
  listTikTokAdvertisers,
  startTikTokAuthorization,
  tikTokConnectionStatus,
};
