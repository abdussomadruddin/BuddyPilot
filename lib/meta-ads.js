const crypto = require("node:crypto");
const {
  clearMetaMcpConnection,
  getMetaMcpConnection,
  saveMetaMcpConnection,
} = require("./supabase-db");

const META_MCP_URL = "https://mcp.facebook.com/ads";
const DATE_PRESETS = new Set(["yesterday", "last_7d", "last_14d", "last_30d", "this_month", "last_month"]);
const { withTransientRetry } = require("./retry-policy");

function cleanText(value) {
  return String(value || "").trim();
}

function numeric(value) {
  if (Array.isArray(value)) return numeric(value[0]?.value ?? value[0]);
  if (value && typeof value === "object") return numeric(value.value ?? value.result ?? 0);
  const parsed = Number(String(value ?? "").replace(/[^\d.+-]/g, "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(numeric(value) * factor) / factor;
}

function metaConversationId() {
  return crypto.randomBytes(15).toString("base64url");
}

function keywordList(value) {
  const values = Array.isArray(value) ? value : String(value || "").split(/[\n,]/);
  return [...new Set(values.map((item) => cleanText(item).toLowerCase()).filter(Boolean))];
}

function normalizeAdsReportConfig(value = {}) {
  const source = value.adsReportConfig || value;
  const platform = cleanText(source.platform).toLowerCase() === "tiktok" ? "tiktok" : "meta";
  const resultMetric = ["conversions", "leads", "messaging_conversations"].includes(source.resultMetric) ? source.resultMetric : "conversions";
  return {
    platform,
    accountId: cleanText(source.accountId || source.adAccountId),
    accountName: cleanText(source.accountName || source.adAccountName),
    currency: cleanText(source.currency || "MYR").toUpperCase(),
    resultMetric,
    resultLabel: resultMetric === "messaging_conversations" ? "Messaging Conversations" : resultMetric === "leads" ? "Leads" : "Purchases",
    prospectingKeywords: keywordList(source.prospectingKeywords || "prospecting,pros,cold,tof"),
    retargetingKeywords: keywordList(source.retargetingKeywords || "retargeting,retarget,rtg,warm,remarketing"),
  };
}

function encryptionKey() {
  const secret = cleanText(process.env.META_TOKEN_ENCRYPTION_KEY || process.env.TIKTOK_TOKEN_ENCRYPTION_KEY);
  if (secret.length < 32) throw new Error("META_TOKEN_ENCRYPTION_KEY mesti sekurang-kurangnya 32 aksara.");
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
  if (version !== "v1" || !iv || !tag || !encrypted) throw new Error("Meta OAuth state tidak sah.");
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(encrypted, "base64url")), decipher.final()]).toString("utf8"));
}

function appBaseUrl() {
  return cleanText(process.env.APP_BASE_URL || "https://buddypilot.vercel.app").replace(/\/+$/, "");
}

function metaAppId() {
  const value = cleanText(process.env.META_APP_ID);
  if (!value) throw new Error("META_APP_ID belum diset untuk sambungan Meta Ads rasmi.");
  return value;
}

async function loadStoredConnection() {
  const row = await getMetaMcpConnection();
  return { row, state: row?.encrypted_state ? decryptState(row.encrypted_state) : {} };
}

function tokenExpiry(tokens) {
  const seconds = Number(tokens?.expires_in || tokens?.expiresIn || 0);
  return seconds > 0 ? new Date(Date.now() + seconds * 1000).toISOString() : null;
}

async function persistState(state, details = {}) {
  const authorizedAt = details.authorizedAt !== undefined ? details.authorizedAt : state.authorizedAt || null;
  const expiresAt = details.expiresAt !== undefined ? details.expiresAt : state.expiresAt || null;
  state.authorizedAt = authorizedAt;
  state.expiresAt = expiresAt;
  return saveMetaMcpConnection({
    encryptedState: encryptState(state),
    status: details.status || "authorizing",
    authorizedAt,
    expiresAt,
    errorMessage: details.errorMessage || "",
  });
}

class StoredMetaOAuthProvider {
  constructor(state = {}) { this.data = state; this.authorizationUrl = ""; }
  get redirectUrl() { return `${appBaseUrl()}/api/meta/oauth-callback`; }
  get clientMetadata() {
    return {
      client_name: "BuddyPilot Meta Ads Reporting",
      redirect_uris: [this.redirectUrl],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
      application_type: "web",
    };
  }
  async state() { return this.data.oauthState; }
  async clientInformation(context = {}) {
    return this.data.clientInformation || {
      client_id: metaAppId(),
      issuer: context.issuer || "https://www.facebook.com",
    };
  }
  async saveClientInformation(value) { this.data.clientInformation = value; await persistState(this.data); }
  async tokens() { return this.data.tokens; }
  async saveTokens(value) {
    this.data.tokens = value;
    const authorizedAt = this.data.authorizedAt || new Date().toISOString();
    const expiresAt = tokenExpiry(value) || this.data.expiresAt || null;
    await persistState(this.data, { status: "connected", authorizedAt, expiresAt });
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

async function createMcpConnection(provider) {
  const { Client, StreamableHTTPClientTransport } = require("@modelcontextprotocol/client");
  const client = new Client({ name: "buddypilot", version: "1.0.0" });
  const transport = new StreamableHTTPClientTransport(new URL(META_MCP_URL), {
    authProvider: provider,
    // Meta's protected-resource metadata currently names mcp.facebook.com/ads as
    // its authorization server, while its own OAuth metadata uses www.facebook.com
    // as the issuer. The SDK flag only relaxes that discovery echo check; the
    // callback remains bound to the persisted www.facebook.com issuer.
    skipIssuerMetadataValidation: true,
  });
  return { client, transport };
}

async function startMetaAuthorization() {
  const { state } = await loadStoredConnection();
  state.oauthState = crypto.randomBytes(24).toString("base64url");
  delete state.tokens;
  delete state.codeVerifier;
  delete state.discoveryState;
  delete state.clientInformation;
  await persistState(state, { status: "authorizing", authorizedAt: null, expiresAt: null });
  const provider = new StoredMetaOAuthProvider(state);
  const { client, transport } = await createMcpConnection(provider);
  try {
    await client.connect(transport);
  } catch (error) {
    if (provider.authorizationUrl) return provider.authorizationUrl;
    throw error;
  } finally {
    await transport.close().catch(() => {});
  }
  throw new Error("Meta Ads sudah connected. Disconnect dahulu jika mahu authorize semula.");
}

async function finishMetaAuthorization(searchParams) {
  const { state } = await loadStoredConnection();
  if (!state.oauthState || searchParams.get("state") !== state.oauthState) throw new Error("Meta OAuth state tidak sepadan.");
  const provider = new StoredMetaOAuthProvider(state);
  const { client, transport } = await createMcpConnection(provider);
  try {
    await transport.finishAuth(searchParams);
    await client.connect(transport);
    const authorizedAt = new Date().toISOString();
    state.authorizedAt = authorizedAt;
    state.expiresAt = tokenExpiry(state.tokens);
    delete state.codeVerifier;
    await persistState(state, { status: "connected", authorizedAt, expiresAt: state.expiresAt });
    // Authorization is complete once the MCP session connects. Account discovery
    // is deliberately deferred: Meta's current tool catalog can expose an
    // unrelated parameterized tool under an account-listing alias, and a
    // discovery failure must not invalidate otherwise valid OAuth credentials.
    return [];
  } catch (error) {
    await persistState(state, { status: "error", errorMessage: error?.message || String(error) });
    throw error;
  } finally {
    await transport.close().catch(() => {});
  }
}

async function withMetaClient(operation) {
  const { row, state } = await loadStoredConnection();
  if (!row || row.status === "disconnected") throw new Error("Meta Ads belum connected. Buka Menu > Meta Ads untuk connect.");
  if (row.expires_at && new Date(row.expires_at) <= new Date()) {
    await saveMetaMcpConnection({ ...row, status: "expired", errorMessage: "Authorization Meta tamat. Connect semula." });
    throw new Error("Authorization Meta tamat. Connect semula.");
  }
  const provider = new StoredMetaOAuthProvider(state);
  const { client, transport } = await createMcpConnection(provider);
  try {
    await client.connect(transport);
    return await operation(client);
  } catch (error) {
    const message = error?.message || String(error);
    const authFailed = /unauthori[sz]ed|invalid[_ -]?token|token.*expired|401/i.test(message);
    await saveMetaMcpConnection({
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

function decodeMaybeJson(value) {
  let current = value;
  for (let depth = 0; depth < 4 && typeof current === "string"; depth += 1) {
    const text = current.trim();
    if (!text) return {};
    try { current = JSON.parse(text); } catch { return { text }; }
  }
  return current || {};
}

function parseToolResult(result) {
  if (result?.structuredContent) return decodeMaybeJson(result.structuredContent);
  const text = (result?.content || []).filter((item) => item.type === "text").map((item) => item.text).join("\n").trim();
  return text ? decodeMaybeJson(text) : {};
}

function payloadErrorMessage(payload) {
  const queue = [payload];
  const visited = new Set();
  while (queue.length) {
    const current = queue.shift();
    if (current == null) continue;
    if (typeof current === "string") {
      if (current.trim()) return current.trim();
      continue;
    }
    if (typeof current !== "object" || visited.has(current)) continue;
    visited.add(current);
    for (const key of ["error_message", "errorMessage", "message", "detail", "error", "text"]) {
      if (typeof current[key] === "string" && current[key].trim()) return current[key].trim();
    }
    if (Array.isArray(current)) queue.push(...current);
    else queue.push(...Object.values(current));
  }
  return "Meta MCP request gagal.";
}

function rowsFromPayload(payload) {
  const queue = [decodeMaybeJson(payload)];
  const visited = new Set();
  while (queue.length) {
    const current = queue.shift();
    if (!current || typeof current !== "object" || visited.has(current)) continue;
    visited.add(current);
    if (Array.isArray(current)) {
      if (!current.length || current.every((item) => item && typeof item === "object" && !item.type)) return current;
      queue.push(...current);
      continue;
    }
    for (const key of ["data", "rows", "entities", "accounts", "ad_accounts", "adaccounts", "items", "results"]) {
      const candidate = decodeMaybeJson(current[key]);
      if (Array.isArray(candidate)) return candidate;
      if (candidate && typeof candidate === "object") queue.push(candidate);
    }
    for (const value of Object.values(current)) {
      const candidate = decodeMaybeJson(value);
      if (candidate && typeof candidate === "object") queue.push(candidate);
    }
  }
  const single = decodeMaybeJson(payload);
  if (single && typeof single === "object" && !Array.isArray(single)
    && (single.account_id || single.ad_account_id || single.campaign_id || single.ad_id || single.id)) return [single];
  return [];
}

function nestedTextByKeys(value, keys) {
  const wanted = new Set(keys.map((key) => key.toLowerCase()));
  const queue = [decodeMaybeJson(value)];
  const visited = new Set();
  while (queue.length) {
    const current = queue.shift();
    if (!current || typeof current !== "object" || visited.has(current)) continue;
    visited.add(current);
    for (const [key, child] of Object.entries(current)) {
      if (wanted.has(key.toLowerCase()) && typeof child === "string" && cleanText(child)) return cleanText(child);
      if (child && typeof child === "object") queue.push(child);
    }
  }
  return "";
}

function normalizeMetaAccount(account) {
  const id = cleanText(account?.account_id || account?.ad_account_id || account?.id
    || nestedTextByKeys(account, ["account_id", "ad_account_id"])).replace(/^act_/, "");
  const name = cleanText(account?.name || account?.account_name || account?.ad_account_name
    || account?.display_name || account?.business_name
    || nestedTextByKeys(account, ["account_name", "ad_account_name", "display_name", "business_name", "name"]));
  return {
    id,
    name: name && name !== id && name !== `act_${id}` ? name : id,
    currency: cleanText(account?.currency || nestedTextByKeys(account, ["currency"]) || "MYR").toUpperCase(),
    platform: "meta",
  };
}

async function resolveTool(client, candidates, predicate, label) {
  const tools = (await client.listTools()).tools || [];
  const exact = tools.find((tool) => candidates.includes(tool.name));
  const fuzzy = tools.find((tool) => predicate(tool.name.toLowerCase(), tool));
  const tool = exact || fuzzy;
  if (!tool) throw new Error(`Meta MCP tool tidak dijumpai: ${label}`);
  return tool;
}

function schemaArgument(tool, aliases, value) {
  const properties = tool.inputSchema?.properties || {};
  const key = aliases.find((name) => properties[name]);
  if (!key || value == null) return {};
  const schema = properties[key] || {};
  if (schema.type === "string" && typeof value !== "string") return { [key]: JSON.stringify(value) };
  if (schema.type === "array" && typeof value === "string") return { [key]: value.split(",").map((item) => item.trim()).filter(Boolean) };
  return { [key]: value };
}

async function callTool(client, tool, args) {
  return withTransientRetry(async () => {
    const result = await client.callTool({ name: tool.name, arguments: args });
    const parsed = parseToolResult(result);
    if (!result?.isError) return parsed;
    throw new Error(cleanText(payloadErrorMessage(parsed)));
  });
}

function actionValue(actions, actionType) {
  return numeric((actions || []).find((item) => item.action_type === actionType)?.value);
}

function firstActionValue(actions, actionTypes) {
  for (const actionType of actionTypes) {
    const match = (actions || []).find((item) => item.action_type === actionType);
    if (match && numeric(match.value) > 0) return numeric(match.value);
  }
  return 0;
}

async function metaMcpCall(name, args = {}) {
  return withMetaClient(async (client) => {
    if (name === "list_ad_accounts") {
      const tool = await resolveTool(client,
        ["ads_get_ad_accounts", "list_ad_accounts", "get_ad_accounts", "meta_ads_list_ad_accounts"],
        (toolName) => /(?:list|get).*ad.*accounts?/.test(toolName),
        "list ad accounts");
      return callTool(client, tool, {
        limit: 100,
        advertiser_request: "tukar MCP facebook ad guna ad flow kepada direct meta mcp terus semua lepas ni",
        client_conversation_id: metaConversationId(),
      });
    }
    const tool = await resolveTool(client,
      ["ads_get_ad_entities", "get_insights", "get_ad_insights", "get_meta_insights", "meta_ads_get_insights"],
      (toolName) => /insights|performance.*report|report.*performance/.test(toolName),
      "ads insights");
    const params = args.params || {};
    const accountId = cleanText(args.path || args.account_id).match(/act_(\d+)/)?.[1] || cleanText(args.account_id).replace(/^act_/, "");
    let timeRange = params.time_range || args.time_range || {};
    if (typeof timeRange === "string") {
      try { timeRange = JSON.parse(timeRange); } catch { timeRange = {}; }
    }
    const callArgs = {
      ...schemaArgument(tool, ["account_id", "ad_account_id", "accountId"], accountId),
      ...schemaArgument(tool, ["level", "aggregation_level", "data_level"], params.level || args.level || "account"),
      ...schemaArgument(tool, ["time_range", "date_range"], timeRange),
      ...schemaArgument(tool, ["since", "start_date", "startDate"], timeRange.since),
      ...schemaArgument(tool, ["until", "end_date", "endDate"], timeRange.until),
      ...schemaArgument(tool, ["fields", "metrics"], params.fields || args.fields),
      ...schemaArgument(tool, ["limit", "page_size"], Number(params.limit || args.limit || 500)),
      ...schemaArgument(tool, ["filtering", "filters"], params.filtering),
      ...schemaArgument(tool, ["advertiser_request"], "tukar MCP facebook ad guna ad flow kepada direct meta mcp terus semua lepas ni"),
      ...schemaArgument(tool, ["client_conversation_id"], metaConversationId()),
    };
    const payload = await callTool(client, tool, callArgs);
    const rows = rowsFromPayload(payload);
    return { ...(payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {}), data: rows };
  });
}

async function listMetaAdAccountsWithClient(client) {
  const tools = (await client.listTools()).tools || [];
  const candidates = tools.filter((tool) => {
    const name = cleanText(tool.name).toLowerCase();
    const description = cleanText(tool.description).toLowerCase();
    const required = Array.isArray(tool.inputSchema?.required) ? tool.inputSchema.required : [];
    return required.length === 0
      && /ad.?accounts?/.test(`${name} ${description}`)
      && !/audience|custom/.test(`${name} ${description}`);
  });
  const tool = candidates.find((item) => ["ads_get_ad_accounts", "list_ad_accounts", "get_ad_accounts", "meta_ads_list_ad_accounts"].includes(item.name))
    || candidates[0];
  if (!tool) throw new Error("Meta MCP tidak menyediakan account discovery tanpa parameter.");
  const data = await callTool(client, tool, {
    limit: 100,
    advertiser_request: "tukar MCP facebook ad guna ad flow kepada direct meta mcp terus semua lepas ni",
    client_conversation_id: metaConversationId(),
  });
  const accounts = rowsFromPayload(data);
  return accounts.map(normalizeMetaAccount).filter((account) => account.id).sort((a, b) => a.name.localeCompare(b.name));
}

async function listMetaAdAccounts() {
  const storedAccounts = async () => {
    const { listPersonalAdsAccounts } = require("./supabase-db");
    return (await listPersonalAdsAccounts()).map((account) => ({
      id: cleanText(account.account_id).replace(/^act_/, ""),
      name: cleanText(account.account_name || account.account_id),
      currency: cleanText(account.currency || "MYR").toUpperCase(),
      platform: "meta",
    })).filter((account) => account.id).sort((a, b) => a.name.localeCompare(b.name));
  };
  try {
    const discovered = await withMetaClient(listMetaAdAccountsWithClient);
    if (!discovered.length) return storedAccounts();
    const stored = await storedAccounts();
    const storedById = new Map(stored.map((account) => [account.id, account]));
    return discovered.map((account) => {
      const saved = storedById.get(account.id);
      return saved?.name && saved.name !== saved.id ? { ...account, name: saved.name, currency: saved.currency || account.currency } : account;
    }).sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    const fallback = await storedAccounts();
    if (fallback.length) return fallback;
    throw error;
  }
}

function formatIso(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function presetDateRange(preset, now = new Date()) {
  if (!DATE_PRESETS.has(preset)) throw new Error("Pilihan tempoh Meta tidak sah.");
  const current = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kuala_Lumpur" }));
  current.setHours(0, 0, 0, 0);
  let start = new Date(current);
  let end = new Date(current);
  if (preset === "yesterday") {
    start.setDate(start.getDate() - 1);
    end = new Date(start);
  } else if (/^last_(7|14|30)d$/.test(preset)) {
    const days = Number(preset.match(/\d+/)[0]);
    end.setDate(end.getDate() - 1);
    start = new Date(end);
    start.setDate(start.getDate() - days + 1);
  } else if (preset === "last_month") {
    start = new Date(current.getFullYear(), current.getMonth() - 1, 1);
    end = new Date(current.getFullYear(), current.getMonth(), 0);
  } else {
    start = new Date(current.getFullYear(), current.getMonth(), 1);
  }
  return { startDate: formatIso(start), endDate: formatIso(end) };
}

function validateCustomWeek(startDate, endDate, now = new Date()) {
  const pattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!pattern.test(cleanText(startDate)) || !pattern.test(cleanText(endDate))) throw new Error("Pilih tarikh mula dan akhir report.");
  const start = new Date(`${startDate}T00:00:00+08:00`);
  const end = new Date(`${endDate}T00:00:00+08:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) throw new Error("Tarikh report tidak sah.");
  const days = Math.round((end - start) / 86400000) + 1;
  if (days !== 7) throw new Error("Report mingguan mesti tepat 7 hari.");
  const yesterday = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kuala_Lumpur" }));
  yesterday.setHours(0, 0, 0, 0);
  yesterday.setDate(yesterday.getDate() - 1);
  if (end > yesterday) throw new Error("Tarikh akhir mesti hari yang sudah lengkap, selewat-lewatnya semalam.");
  return { startDate, endDate };
}

function classifyCampaign(name, config) {
  const lower = cleanText(name).toLowerCase();
  if (config.platform === "tiktok") {
    const stageTokens = lower.split(/[^a-z0-9]+/).filter(Boolean);
    if (stageTokens.includes("top")) return "prospecting";
    if (stageTokens.includes("mid") || stageTokens.includes("bot")) return "retargeting";
  }
  if (config.retargetingKeywords.some((keyword) => lower.includes(keyword))) return "retargeting";
  if (config.prospectingKeywords.some((keyword) => lower.includes(keyword))) return "prospecting";
  return "other";
}

function rowResults(row, config, level) {
  if (config.resultMetric === "messaging_conversations") {
    return numeric(level === "campaign" ? row.messaging_conversations : row.conversations);
  }
  if (config.resultMetric === "leads") return numeric(row.leads);
  return numeric(row.conversions);
}

function metricsFromRow(row, config, level) {
  const spend = round(row.spend);
  const results = round(rowResults(row, config, level));
  const purchases = round(row.conversions);
  const revenue = round(row.revenue);
  const leads = round(row.leads);
  const messaging = round(level === "campaign" ? row.messaging_conversations : row.conversations);
  return {
    spend,
    results,
    purchases,
    revenue,
    leads,
    messaging,
    cpr: results > 0 ? round(spend / results) : null,
    impressions: round(row.impressions),
    clicks: round(row.clicks),
    linkClicks: round(row.link_clicks ?? row.linkClicks),
    ctr: row.ctr == null ? null : round(row.ctr),
    cpc: row.cpc == null ? null : round(row.cpc),
    roas: row.roas == null ? null : round(row.roas),
    reach: round(row.reach),
    frequency: row.frequency == null ? null : round(row.frequency),
    cpm: row.cpm == null ? null : round(row.cpm),
  };
}

function combineMetrics(target, source) {
  target.spend += source.spend;
  target.results += source.results;
  target.impressions += source.impressions;
  target.clicks += source.clicks;
  target.linkClicks += source.linkClicks;
  target.purchases += source.purchases;
  target.revenue += source.revenue;
  target.leads += source.leads;
  target.messaging += source.messaging;
  target.reach += source.reach;
}

function finishCombined(metrics) {
  const result = Object.fromEntries(Object.entries(metrics).map(([key, value]) => [key, round(value)]));
  result.cpr = result.results > 0 ? round(result.spend / result.results) : null;
  result.ctr = result.impressions > 0 ? round((result.clicks / result.impressions) * 100) : null;
  result.cpc = result.clicks > 0 ? round(result.spend / result.clicks) : null;
  result.cpm = result.impressions > 0 ? round((result.spend / result.impressions) * 1000) : null;
  result.frequency = result.reach > 0 ? round(result.impressions / result.reach) : null;
  return result;
}

function aggregateMetaData({ insights = {}, campaigns = [], adsets = [], ads = [] }, configInput = {}) {
  const config = normalizeAdsReportConfig(configInput);
  const categories = {
    prospecting: { spend: 0, results: 0, purchases: 0, revenue: 0, leads: 0, messaging: 0, impressions: 0, clicks: 0, linkClicks: 0, reach: 0 },
    retargeting: { spend: 0, results: 0, purchases: 0, revenue: 0, leads: 0, messaging: 0, impressions: 0, clicks: 0, linkClicks: 0, reach: 0 },
    other: { spend: 0, results: 0, purchases: 0, revenue: 0, leads: 0, messaging: 0, impressions: 0, clicks: 0, linkClicks: 0, reach: 0 },
  };
  const campaignRows = campaigns.map((row) => {
    const category = classifyCampaign(row.name, config);
    const metrics = metricsFromRow(row, config, "campaign");
    combineMetrics(categories[category], metrics);
    return { id: cleanText(row.id), name: cleanText(row.name), status: cleanText(row.status), objective: cleanText(row.objective), category, ...metrics };
  }).sort((a, b) => b.spend - a.spend);
  const adsetRows = adsets.map((row) => ({
    id: cleanText(row.id), name: cleanText(row.name), campaignId: cleanText(row.campaignId), campaignName: cleanText(row.campaignName),
    category: classifyCampaign(row.campaignName || row.name, config), status: cleanText(row.status), ...metricsFromRow(row, config, "adset"),
  })).sort((a, b) => b.spend - a.spend);
  const adRows = ads.map((row) => ({
    id: cleanText(row.id), name: cleanText(row.name), adsetId: cleanText(row.adSetId), adsetName: cleanText(row.adSetName),
    campaignId: cleanText(row.campaignId), campaignName: cleanText(row.campaignName), category: classifyCampaign(row.campaignName || row.name, config),
    status: cleanText(row.status), qualityRanking: cleanText(row.qualityRanking), engagementRanking: cleanText(row.engagementRanking), conversionRanking: cleanText(row.conversionRanking),
    ...metricsFromRow(row, config, "ad"),
  })).sort((a, b) => b.spend - a.spend);

  const totalResults = config.resultMetric === "messaging_conversations"
    ? campaignRows.reduce((sum, row) => sum + row.results, 0)
    : config.resultMetric === "leads" ? numeric(insights.leads) : numeric(insights.conversions);
  const totalSpend = numeric(insights.spend);
  const total = {
    spend: round(totalSpend),
    results: round(totalResults),
    purchases: round(insights.conversions),
    revenue: round(insights.revenue),
    leads: round(insights.leads),
    messaging: round(insights.messaging_conversations ?? insights.conversations),
    cpr: totalResults > 0 ? round(totalSpend / totalResults) : null,
    impressions: round(insights.impressions),
    clicks: round(insights.clicks),
    linkClicks: round(insights.link_clicks ?? insights.linkClicks),
    ctr: insights.ctr == null ? null : round(insights.ctr),
    cpc: insights.cpc == null ? null : round(insights.cpc),
    cpm: insights.cpm == null ? null : round(insights.cpm),
    reach: round(insights.reach),
    frequency: insights.frequency == null ? null : round(insights.frequency),
    roas: insights.roas == null ? (totalSpend > 0 && numeric(insights.revenue) > 0 ? round(numeric(insights.revenue) / totalSpend) : null) : round(insights.roas),
  };
  const categoryResults = Object.fromEntries(Object.entries(categories).map(([key, value]) => [key, finishCombined(value)]));
  const warnings = [];
  if (!campaignRows.length) warnings.push("Meta tidak memulangkan kempen untuk tempoh ini.");
  if (categoryResults.other.spend > 0) warnings.push("Ada spend dalam Other / Unmapped. Semak keyword kategori client.");
  if (config.resultMetric === "conversions" && total.results > 0 && !campaignRows.some((row) => row.results > 0)) {
    warnings.push("Meta account insights mempunyai conversions tetapi pecahan campaign tidak lengkap.");
  }
  return { platform: config.platform, currency: cleanText(insights.currency || config.currency || "MYR").toUpperCase(), resultMetric: config.resultMetric, resultLabel: config.resultLabel, total, categories: categoryResults, campaigns: campaignRows, adsets: adsetRows, ads: adRows, warnings };
}

async function fetchMetaDailyRaw(accountId, reportDate) {
  const targetAccount = cleanText(accountId).replace(/^act_/, "");
  if (!targetAccount) throw new Error("Pilih Meta ad account dahulu.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanText(reportDate))) throw new Error("Tarikh daily report tidak sah.");
  const timeRange = JSON.stringify({ since: reportDate, until: reportDate });
  const [accountResult, campaignResult] = await Promise.all([
    metaMcpCall("meta_api_get", {
      path: `act_${targetAccount}/insights`,
      params: {
        fields: "spend,impressions,clicks,inline_link_clicks,reach,frequency,cpm,cpc,ctr,actions,action_values,purchase_roas",
        level: "account",
        time_range: timeRange,
        limit: "10",
      },
    }),
    metaMcpCall("meta_api_get", {
      path: `act_${targetAccount}/insights`,
      params: {
        fields: "campaign_id,campaign_name,spend,impressions,reach,frequency,clicks,inline_link_clicks,cpm,cpc,ctr,actions,action_values,purchase_roas",
        level: "campaign",
        time_range: timeRange,
        limit: "500",
      },
    }),
  ]);
  return {
    account: accountResult.data?.[0] ? normalizeGraphRow(accountResult.data[0], "account") : null,
    campaigns: (campaignResult.data || []).map((row) => normalizeGraphRow(row, "campaign")),
  };
}

function aggregateMetaDailyRaw(raw, configInput = {}) {
  const config = normalizeAdsReportConfig(configInput);
  const account = raw?.account || {};
  const analytics = aggregateMetaData({
    insights: { ...account, currency: config.currency },
    campaigns: raw?.campaigns || [],
  }, config);
  if (!raw?.account && !(raw?.campaigns || []).length) {
    analytics.warnings.unshift("Meta tidak memulangkan insights untuk tarikh ini.");
  }
  return analytics;
}

function money(value, currency) {
  return new Intl.NumberFormat("en-MY", { style: "currency", currency: currency || "MYR", maximumFractionDigits: 2 }).format(numeric(value));
}

function costResultText(value, currency, resultLabel) {
  if (value == null) return "N/A";
  if (resultLabel === "Leads") return `CPL ${money(value, currency)}`;
  if (resultLabel === "Messaging Conversations") return `${money(value, currency)} per conversation`;
  return `${money(value, currency)} per result`;
}

function metricLine(label, metrics, currency, resultLabel) {
  return `${label}: ${money(metrics.spend, currency)} spend | ${metrics.results} ${resultLabel.toLowerCase()} | ${costResultText(metrics.cpr, currency, resultLabel)}`;
}

function deliveryMetricLine(label, metrics, currency) {
  return `${label}: ${money(metrics.spend, currency)} spend | ${metrics.impressions} impressions | ${metrics.clicks} clicks | ${metrics.cpm == null ? "N/A CPM" : `${money(metrics.cpm, currency)} CPM`} | ${metrics.cpc == null ? "N/A CPC" : `${money(metrics.cpc, currency)} CPC`} | ${metrics.frequency == null ? "N/A frequency" : `${metrics.frequency} frequency`}`;
}

function separatesTikTokLeadFunnel(config) {
  return config.platform === "tiktok" && config.resultMetric === "leads";
}

function selectBestAd(ads, category, currency, resultLabel) {
  const candidates = ads.filter((item) => item.category === category && item.spend > 0);
  const withResults = candidates.filter((item) => item.results > 0 && item.cpr != null).sort((a, b) => a.cpr - b.cpr);
  if (withResults.length) {
    const ad = withResults[0];
    return { ad: ad.name || "N/A", campaignName: ad.campaignName, adsetName: ad.adsetName, performance: `${ad.results} ${resultLabel.toLowerCase()} | ${costResultText(ad.cpr, currency, resultLabel)} | ${money(ad.spend, currency)} spend` };
  }
  const withCpmAndCpc = candidates.filter((item) => item.cpm > 0 && item.cpc > 0).sort((a, b) => a.cpm - b.cpm || a.cpc - b.cpc);
  if (withCpmAndCpc.length) {
    const ad = withCpmAndCpc[0];
    return {
      ad: ad.name || "N/A",
      campaignName: ad.campaignName,
      adsetName: ad.adsetName,
      performance: `${money(ad.cpm, currency)} CPM | ${money(ad.cpc, currency)} CPC | secondary fallback kerana tiada ${resultLabel.toLowerCase()}`,
    };
  }
  const withCpm = candidates.filter((item) => item.cpm > 0).sort((a, b) => a.cpm - b.cpm);
  if (withCpm.length) {
    const ad = withCpm[0];
    return {
      ad: ad.name || "N/A",
      campaignName: ad.campaignName,
      adsetName: ad.adsetName,
      performance: `${money(ad.cpm, currency)} CPM | ${ad.cpc > 0 ? money(ad.cpc, currency) : "N/A"} CPC | secondary fallback kerana tiada ${resultLabel.toLowerCase()}`,
    };
  }
  const withCpc = candidates.filter((item) => item.cpc > 0).sort((a, b) => a.cpc - b.cpc);
  if (withCpc.length) {
    const ad = withCpc[0];
    return { ad: ad.name || "N/A", campaignName: ad.campaignName, adsetName: ad.adsetName, performance: `N/A CPM | ${money(ad.cpc, currency)} CPC | secondary fallback kerana tiada ${resultLabel.toLowerCase()}` };
  }
  return { ad: "N/A", performance: `Tiada data ${category} yang mencukupi.` };
}

function selectBestDeliveryAd(ads, category, currency) {
  const candidates = ads
    .filter((item) => item.category === category && item.spend > 0)
    .map((item) => ({
      ...item,
      deliveryCpc: item.clicks > 0 ? round(item.spend / item.clicks) : null,
    }));
  const withClicks = candidates
    .filter((item) => item.clicks > 0)
    .sort((a, b) => a.deliveryCpc - b.deliveryCpc || b.clicks - a.clicks);
  const ad = withClicks[0] || candidates.sort((a, b) => b.spend - a.spend)[0];
  if (!ad) return { ad: "N/A", performance: "Tiada data retargeting yang mencukupi." };
  return {
    ad: ad.name || "N/A",
    campaignName: ad.campaignName,
    adsetName: ad.adsetName,
    performance: `${ad.clicks} clicks | ${ad.deliveryCpc == null ? "N/A CPC" : `${money(ad.deliveryCpc, currency)} CPC`} | ${money(ad.spend, currency)} spend`,
  };
}

function creativeSignal(name) {
  const signal = cleanText(name)
    .replace(/[_|]+/g, " ")
    .replace(/\s*-\s*/g, " ")
    .replace(/^\d+\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
  return signal && signal.toLowerCase() !== "n/a" ? signal : "creative pemenang";
}

function audienceSignal(best, fallback) {
  const adName = cleanText(best.ad).toLowerCase();
  return [best.adsetName, best.campaignName]
    .map(cleanText)
    .find((name) => name && name.toLowerCase() !== adName) || fallback;
}

function conversionMessageAction(resultMetric) {
  if (resultMetric === "leads") return "Untuk tarik lead lebih berkualiti, jelaskan siapa yang sesuai, outcome utama dan CTA untuk dihubungi/appointment.";
  if (resultMetric === "messaging_conversations") return "Gunakan CTA perbualan yang jelas: nyatakan masalah, manfaat segera dan sebab pelanggan patut mula chat sekarang.";
  return "Untuk purchase, bina urutan mesej benefit → bukti → offer → urgency dan kekalkan tuntutan hanya yang boleh disahkan.";
}

function buildNextSevenDays(analytics, config, prospectingBest, retargetingBest) {
  const { total, categories, resultLabel, currency } = analytics;
  const actions = [];
  if (total.spend <= 0) {
    actions.push("Sediakan tiga konsep Prospecting untuk pelanggan baharu: pain/problem, desired outcome dan offer/bonus; gunakan satu CTA yang sama supaya angle boleh dibandingkan.");
  } else if (total.results <= 0) {
    const topCampaign = analytics.campaigns.find((item) => item.spend > 0);
    actions.push(`${money(total.spend, currency)} belum menghasilkan ${resultLabel.toLowerCase()}; refresh mesej dalam ${topCampaign?.name || "campaign berbelanja tertinggi"} dengan tiga angle: masalah pelanggan, hasil yang diingini dan bukti/offer.`);
  } else {
    if (prospectingBest.ad !== "N/A") {
      actions.push(`Prospecting: jadikan “${prospectingBest.ad}” sebagai control. Sasarkan profil pelanggan dalam “${audienceSignal(prospectingBest, "cold audience semasa")}” dan hasilkan dua variasi hook daripada angle “${creativeSignal(prospectingBest.ad)}”.`);
    }
    actions.push(`Creative plan: uji satu versi pain-led dan satu versi benefit/proof-led; kekalkan offer serta CTA supaya beza result datang daripada angle, bukan terlalu banyak perubahan serentak.`);
  }
  if (categories.retargeting.spend > 0) {
    if (separatesTikTokLeadFunnel(config)) {
      actions.push(`MID/BOT Retargeting: nilai delivery berasingan melalui CPM, reach, clicks, CPC dan frequency. Jangan gabungkan spend ini dalam CPL TOP.`);
    } else {
      const warmResult = categories.retargeting.results;
      actions.push(`Retargeting: gunakan “${retargetingBest.ad}” sebagai rujukan untuk warm audience dalam “${audienceSignal(retargetingBest, "retargeting semasa")}”. ${warmResult > 0 ? "Bina variasi social proof dan objection-handling daripada angle ini." : "Uji angle bukti, jawapan keraguan dan urgency kerana primary result belum muncul."}`);
    }
  } else {
    actions.push("Sediakan creative warm audience berasaskan social proof, objection-handling dan urgency untuk pelanggan yang sudah melihat atau berinteraksi dengan offer.");
  }
  actions.push(conversionMessageAction(config.resultMetric));
  return actions.slice(0, 5);
}

function buildCmoRecommendation(analytics, config, prospectingBest, retargetingBest) {
  const { total, categories, resultLabel, currency } = analytics;
  const resultName = resultLabel.toLowerCase();
  if (total.spend <= 0) return [
    "Fokus: Cari message-market fit.",
    "Prospecting: Uji pain, desired outcome dan offer.",
    "Retargeting: Guna proof dan objection pelanggan.",
  ].join("\n");
  if (total.results <= 0) {
    const topCampaign = analytics.campaigns.find((item) => item.spend > 0);
    return [
      `Result: ${money(total.spend, currency)} spend | 0 ${resultName}.`,
      `Fokus: Refresh “${topCampaign?.name || "campaign aktif"}”.`,
      "Angle: Uji pain, desired outcome dan proof/offer.",
      "Elakkan: Mengulang hook dan mesej yang sama.",
    ].join("\n");
  }
  if (separatesTikTokLeadFunnel(config)) {
    const top = categories.prospecting;
    const warm = categories.retargeting;
    return [
      `TOP Lead Gen: ${top.results} leads | ${costResultText(top.cpr, currency, resultLabel)} | ${money(top.spend, currency)} spend.`,
      `MID/BOT Traffic WhatsApp: ${money(warm.spend, currency)} spend | ${warm.clicks} clicks | ${warm.cpc == null ? "N/A CPC" : `${money(warm.cpc, currency)} CPC`}.`,
      "Kiraan CPL hanya menggunakan spend dan lead TOP; delivery MID/BOT dinilai berasingan.",
    ].join("\n");
  }
  const prospecting = categories.prospecting;
  const retargeting = categories.retargeting;
  const control = prospectingBest.ad !== "N/A" ? prospectingBest.ad : "Belum ada";
  const warm = retargetingBest.ad !== "N/A" ? retargetingBest.ad : "Belum ada";
  const segmentShort = prospecting.results > 0 && retargeting.results > 0
    ? `${prospecting.cpr <= retargeting.cpr ? "Prospecting" : "Retargeting"} lebih efisien.`
    : prospecting.results > 0 ? "Prospecting menghasilkan result; Retargeting belum terbukti."
      : retargeting.results > 0 ? "Retargeting menghasilkan result; Prospecting perlu angle baharu."
        : "Belum ada segmen yang terbukti.";
  return [
    `Result: ${total.results} ${resultName} | ${costResultText(total.cpr, currency, resultLabel)}.`,
    `Fokus: ${segmentShort}`,
    `Creative: Cold—${control}; Warm—${warm}.`,
    `Angle: Cold—${creativeSignal(control)}, pain + benefit/proof. Warm—proof + objection + urgency.`,
  ].join("\n");
}

function recommendationHeadline(analytics) {
  if (analytics.total.spend <= 0) return "TEST CUSTOMER ANGLES";
  if (analytics.total.results <= 0) return "REFRESH MESSAGE & OFFER";
  if (analytics.total.results < 3) return "EXPAND CREATIVE LEARNING";
  return "BUILD ON WINNING ANGLES";
}

function buildPerformanceLeaks(analytics, prospectingBest, retargetingBest, config) {
  const { total, categories, campaigns, ads, currency, resultLabel } = analytics;
  const resultName = resultLabel.toLowerCase();
  const ideas = [];
  if (total.spend <= 0) {
    return ["Idea: Sediakan tiga angle—pain, desired outcome dan proof/offer. Sebab: belum ada spend atau result untuk mengenal pasti leak campaign minggu ini."];
  }
  const wastedAd = ads
    .filter((item) => item.spend > 0 && item.results <= 0 && (!separatesTikTokLeadFunnel(config) || item.category === "prospecting"))
    .sort((a, b) => b.spend - a.spend)[0];
  if (wastedAd) {
    ideas.push(`Idea: Refresh hook/angle “${wastedAd.name}”. Sebab: ${money(wastedAd.spend, currency)} spend tanpa ${resultName}.`);
  } else if (total.results <= 0) {
    const wastedCampaign = campaigns.find((item) => item.spend > 0);
    ideas.push(`Idea: Uji pain, desired outcome dan proof/offer untuk “${wastedCampaign?.name || "campaign aktif"}”. Sebab: ${money(total.spend, currency)} spend tanpa ${resultName}.`);
  }

  const prospecting = categories.prospecting;
  const retargeting = categories.retargeting;
  if (prospecting.results > 0 && retargeting.results > 0 && prospecting.cpr !== retargeting.cpr) {
    const prospectingWins = prospecting.cpr < retargeting.cpr;
    const winnerName = prospectingWins ? prospectingBest.ad : retargetingBest.ad;
    const weakLabel = prospectingWins ? "Retargeting" : "Prospecting";
    const weakCost = prospectingWins ? retargeting.cpr : prospecting.cpr;
    const strongCost = prospectingWins ? prospecting.cpr : retargeting.cpr;
    ideas.push(`Idea: Adapt angle “${winnerName}” untuk ${weakLabel}. Sebab: cost ${weakLabel} ${costResultText(weakCost, currency, resultLabel)} vs ${costResultText(strongCost, currency, resultLabel)}.`);
  } else if (!separatesTikTokLeadFunnel(config) && retargeting.spend > 0 && retargeting.results <= 0) {
    ideas.push(`Idea: Uji social proof, objection dan urgency untuk Retargeting. Sebab: ${money(retargeting.spend, currency)} spend tanpa primary result.`);
  }

  const weakCampaign = campaigns
    .filter((item) => item.spend > 0 && item.results > 0 && total.cpr != null && item.cpr > total.cpr && (!separatesTikTokLeadFunnel(config) || item.category === "prospecting"))
    .sort((a, b) => b.cpr - a.cpr)[0];
  if (weakCampaign) {
    ideas.push(`Idea: Bina variasi creative baharu untuk “${weakCampaign.name}”. Sebab: cost ${costResultText(weakCampaign.cpr, currency, resultLabel)} vs purata account ${costResultText(total.cpr, currency, resultLabel)}.`);
  }

  if (!ideas.length) {
    const winner = prospectingBest.ad !== "N/A" ? prospectingBest.ad : retargetingBest.ad;
    ideas.push(`Idea: Hasilkan dua variasi daripada “${winner}”. Sebab: tiada leak kos yang jelas; pembelajaran seterusnya perlu datang daripada angle creative.`);
  }
  return ideas.slice(0, 1);
}

function buildReportDraft(analytics, configInput = {}) {
  const config = normalizeAdsReportConfig(configInput);
  const { total, categories, campaigns, ads, currency, resultLabel, warnings } = analytics;
  const separatedTikTokLeadFunnel = separatesTikTokLeadFunnel(config);
  const primary = separatedTikTokLeadFunnel ? categories.prospecting : total;
  const funnelSpend = round(categories.prospecting.spend + categories.retargeting.spend + categories.other.spend);
  const overallSpend = total.spend > 0 ? total.spend : funnelSpend;
  const fallbackToClicks = config.resultMetric === "leads" && primary.results <= 0;
  const overallClicks = total.clicks > 0
    ? total.clicks
    : round(categories.prospecting.clicks + categories.retargeting.clicks + categories.other.clicks);
  const pdfResultLabel = fallbackToClicks ? "Clicks" : resultLabel;
  const pdfResults = fallbackToClicks ? overallClicks : primary.results;
  const pdfCostPerResult = fallbackToClicks
    ? (overallClicks > 0 ? round(overallSpend / overallClicks) : null)
    : primary.cpr;
  const reportingAnalytics = separatedTikTokLeadFunnel ? { ...analytics, total: primary } : analytics;
  const prospectingBest = separatedTikTokLeadFunnel && fallbackToClicks
    ? selectBestDeliveryAd(ads, "prospecting", currency)
    : selectBestAd(ads, "prospecting", currency, resultLabel);
  const retargetingBest = separatedTikTokLeadFunnel
    ? selectBestDeliveryAd(ads, "retargeting", currency)
    : selectBestAd(ads, "retargeting", currency, resultLabel);
  const whatWeProved = separatedTikTokLeadFunnel ? [
    fallbackToClicks
      ? deliveryMetricLine("TOP - Prospecting Lead Gen", categories.prospecting, currency)
      : metricLine("TOP - Prospecting Lead Gen", categories.prospecting, currency, resultLabel),
    deliveryMetricLine("MID/BOT - Retargeting Traffic WhatsApp", categories.retargeting, currency),
  ] : [
    metricLine("Total account", total, currency, resultLabel),
    metricLine("Prospecting", categories.prospecting, currency, resultLabel),
    metricLine("Retargeting", categories.retargeting, currency, resultLabel),
  ];
  const clicksSummary = `${overallClicks} clicks | ${pdfCostPerResult == null ? "N/A CPC" : `${money(pdfCostPerResult, currency)} CPC`} | ${money(overallSpend, currency)} spend`;
  const leaks = separatedTikTokLeadFunnel && fallbackToClicks
    ? ["Semak kualiti click dan perjalanan selepas click sebelum menambah budget."]
    : buildPerformanceLeaks(reportingAnalytics, prospectingBest, retargetingBest, config);
  const nextSevenDays = separatedTikTokLeadFunnel && fallbackToClicks
    ? [
        "Semak landing atau WhatsApp flow selepas click untuk kenal pasti titik drop-off.",
        "Bandingkan CPC dan click quality antara TOP, MID dan BOT.",
        "Uji satu variasi hook dan CTA tanpa mengubah terlalu banyak perkara serentak.",
      ]
    : buildNextSevenDays(reportingAnalytics, config, prospectingBest, retargetingBest);
  const recommendation = separatedTikTokLeadFunnel && fallbackToClicks
    ? [
        `Overall delivery: ${clicksSummary}.`,
        "Fokus: Baiki kualiti traffic dan perjalanan selepas click.",
        "Elakkan scale sebelum tracking lead kembali tersedia atau conversion path disahkan.",
      ].join("\n")
    : buildCmoRecommendation(reportingAnalytics, config, prospectingBest, retargetingBest);
  return {
    adSpend: overallSpend,
    leadsGenerated: Math.round(pdfResults),
    costPerLead: pdfCostPerResult,
    currency,
    resultLabel: pdfResultLabel,
    whatWeProved: whatWeProved.join("\n"),
    winningCreative: prospectingBest.ad,
    bestPerformance: prospectingBest.performance,
    retargetingWinningCreative: retargetingBest.ad,
    retargetingBestPerformance: retargetingBest.performance,
    bestAudience: "Prospecting / Cold and Retargeting / Warm",
    leadLeaks: leaks.join("\n"),
    next7Days: nextSevenDays.join("\n"),
    recommendation,
    recommendationHeadline: separatedTikTokLeadFunnel && fallbackToClicks
      ? "OPTIMIZE CLICK QUALITY"
      : recommendationHeadline(reportingAnalytics),
    warnings,
  };
}

async function fetchMetaReport(configInput, datePreset) {
  const config = normalizeAdsReportConfig(configInput);
  if (!config.accountId) throw new Error("Pilih Meta ad account dahulu.");
  if (!DATE_PRESETS.has(datePreset)) throw new Error("Pilihan tempoh Meta tidak sah.");
  const { startDate, endDate } = presetDateRange(datePreset);
  return fetchMetaRange(config, startDate, endDate, { full: true });
}

function normalizeGraphRow(row, level) {
  const conversions = numeric(row.conversions ?? row.purchases ?? row["actions:omni_purchase"]
    ?? row.offsite_conversion_fb_pixel_purchase ?? row.onsite_conversion_purchase)
    || firstActionValue(row.actions, ["purchase", "omni_purchase", "offsite_conversion.fb_pixel_purchase", "onsite_web_purchase"]);
  const leads = numeric(row.leads ?? row.form_submissions ?? row.lead ?? row.onsite_conversion_lead_grouped)
    || firstActionValue(row.actions, ["lead", "onsite_conversion.lead_grouped", "offsite_conversion.fb_pixel_lead"]);
  const conversations = numeric(row.messaging_conversations ?? row.conversations) || firstActionValue(row.actions, [
    "onsite_conversion.messaging_conversation_started_7d",
    "messaging_conversation_started_7d",
    "onsite_conversion.total_messaging_connection",
  ]);
  const revenue = numeric(row.revenue ?? row.purchase_value ?? row.conversion_value
    ?? row.omni_purchase_values ?? row.offsite_conversion_fb_pixel_purchase_values ?? row.result_values)
    || firstActionValue(row.action_values, ["purchase", "omni_purchase", "offsite_conversion.fb_pixel_purchase", "onsite_web_purchase"]);
  const common = {
    spend: numeric(row.spend ?? row.amount_spent), impressions: numeric(row.impressions), clicks: numeric(row.clicks),
    link_clicks: numeric(row.inline_link_clicks ?? row["actions:link_click"] ?? row.unique_link_click), ctr: numeric(row.ctr), cpm: numeric(row.cpm), cpc: numeric(row.cpc),
    reach: numeric(row.reach), frequency: numeric(row.frequency), conversions, leads, revenue,
    roas: numeric(row.roas ?? row.purchase_roas),
  };
  if (level === "account") return {
    ...common, messaging_conversations: conversations,
    roas: common.roas || numeric(row.purchase_roas?.find((item) => ["omni_purchase", "purchase"].includes(item.action_type))?.value),
  };
  if (level === "campaign") return { ...common, id: cleanText(row.campaign_id || row.id), name: cleanText(row.campaign_name || row.name), messaging_conversations: conversations };
  if (level === "adset") return {
    ...common, id: cleanText(row.adset_id || row.id), name: cleanText(row.adset_name || row.name), campaignId: cleanText(row.campaign_id),
    campaignName: cleanText(row.campaign_name), conversations,
  };
  return {
    ...common, id: cleanText(row.ad_id || row.id), name: cleanText(row.ad_name || row.name), adSetId: cleanText(row.adset_id),
    adSetName: cleanText(row.adset_name), campaignId: cleanText(row.campaign_id), campaignName: cleanText(row.campaign_name), conversations,
    qualityRanking: cleanText(row.quality_ranking), engagementRanking: cleanText(row.engagement_rate_ranking), conversionRanking: cleanText(row.conversion_rate_ranking),
  };
}

async function fetchMetaRange(configInput, startDate, endDate, { full = true } = {}) {
  const config = normalizeAdsReportConfig(configInput);
  if (!config.accountId) throw new Error("Pilih Meta ad account dahulu.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) throw new Error("Tarikh Ads CMO tidak sah.");
  const timeRange = JSON.stringify({ since: startDate, until: endDate });
  const base = "spend,amount_spent,impressions,reach,frequency,clicks,cpm,cpc,ctr,actions:link_click,actions:omni_purchase,lead,onsite_conversion_lead_grouped,offsite_conversion_fb_pixel_purchase,onsite_conversion_purchase,omni_purchase_values,offsite_conversion_fb_pixel_purchase_values,purchase_roas,results,result_values";
  const definitions = [
    ["account", `id,name,${base}`],
    ["campaign", `id,name,${base}`],
    ...(full ? [
      ["adset", `id,name,campaign_id,${base}`],
      ["ad", `id,name,campaign_id,adset_id,${base}`],
    ] : []),
  ];
  const results = await Promise.all(definitions.map(([level, fields]) => metaMcpCall("meta_api_get", {
    path: `act_${cleanText(config.accountId).replace(/^act_/, "")}/insights`,
    params: { fields, level, time_range: timeRange, limit: "500" },
  })));
  const byLevel = Object.fromEntries(definitions.map(([level], index) => [level, results[index]]));
  const insights = { ...(byLevel.account?.data?.[0] ? normalizeGraphRow(byLevel.account.data[0], "account") : {}), currency: config.currency };
  const analytics = aggregateMetaData({
    insights,
    campaigns: (byLevel.campaign?.data || []).map((row) => normalizeGraphRow(row, "campaign")),
    adsets: (byLevel.adset?.data || []).map((row) => normalizeGraphRow(row, "adset")),
    ads: (byLevel.ad?.data || []).map((row) => normalizeGraphRow(row, "ad")),
  }, config);
  analytics.startDate = startDate;
  analytics.endDate = endDate;
  if (!byLevel.account?.data?.length && !byLevel.campaign?.data?.length) analytics.warnings.unshift("Meta tidak memulangkan insights untuk tempoh ini.");
  return analytics;
}

async function fetchMetaCustomReport(configInput, startDate, endDate) {
  const config = normalizeAdsReportConfig(configInput);
  if (!config.accountId) throw new Error("Pilih Meta ad account dahulu.");
  validateCustomWeek(startDate, endDate);
  const timeRange = JSON.stringify({ since: startDate, until: endDate });
  const definitions = [
    ["account", "id,name,spend,amount_spent,impressions,clicks,reach,frequency,cpm,cpc,ctr,actions:link_click,actions:omni_purchase,lead,onsite_conversion_lead_grouped,offsite_conversion_fb_pixel_purchase,onsite_conversion_purchase,omni_purchase_values,offsite_conversion_fb_pixel_purchase_values,purchase_roas,results,result_values"],
    ["campaign", "id,name,spend,amount_spent,impressions,reach,frequency,clicks,cpm,cpc,ctr,actions:link_click,actions:omni_purchase,lead,onsite_conversion_lead_grouped,offsite_conversion_fb_pixel_purchase,onsite_conversion_purchase,omni_purchase_values,offsite_conversion_fb_pixel_purchase_values,purchase_roas,results,result_values"],
    ["adset", "id,name,campaign_id,spend,amount_spent,impressions,clicks,cpm,cpc,ctr,actions:link_click,actions:omni_purchase,lead,onsite_conversion_lead_grouped,offsite_conversion_fb_pixel_purchase,onsite_conversion_purchase,omni_purchase_values,offsite_conversion_fb_pixel_purchase_values,purchase_roas,results,result_values"],
    ["ad", "id,name,campaign_id,adset_id,spend,amount_spent,impressions,clicks,cpm,cpc,ctr,actions:link_click,actions:omni_purchase,lead,onsite_conversion_lead_grouped,offsite_conversion_fb_pixel_purchase,onsite_conversion_purchase,omni_purchase_values,offsite_conversion_fb_pixel_purchase_values,purchase_roas,results,result_values"],
  ];
  const results = await Promise.all(definitions.map(([level, fields]) => metaMcpCall("meta_api_get", {
    path: `act_${config.accountId}/insights`, params: { fields, level, time_range: timeRange, limit: "500" },
  })));
  const insights = { ...(results[0].data?.[0] ? normalizeGraphRow(results[0].data[0], "account") : {}), currency: config.currency };
  const normalizedCampaigns = (results[1].data || []).map((row) => normalizeGraphRow(row, "campaign"));
  const analytics = aggregateMetaData({
    insights,
    campaigns: normalizedCampaigns,
    adsets: (results[2].data || []).map((row) => normalizeGraphRow(row, "adset")),
    ads: (results[3].data || []).map((row) => normalizeGraphRow(row, "ad")),
  }, config);
  const retargetingIds = normalizedCampaigns.filter((row) => classifyCampaign(row.name, config) === "retargeting").map((row) => row.id).filter(Boolean);
  if (retargetingIds.length) {
    try {
      const delivery = await metaMcpCall("meta_api_get", {
        path: `act_${config.accountId}/insights`,
        params: {
          fields: "spend,impressions,reach,frequency,cpm,clicks,cpc",
          level: "account",
          time_range: timeRange,
          filtering: JSON.stringify([{ field: "campaign.id", operator: "IN", value: retargetingIds }]),
          limit: "10",
        },
      });
      const row = delivery.data?.[0];
      if (row) {
        analytics.categories.retargeting.spend = round(row.spend);
        analytics.categories.retargeting.impressions = round(row.impressions);
        analytics.categories.retargeting.reach = round(row.reach);
        analytics.categories.retargeting.frequency = row.frequency == null ? null : round(row.frequency);
        analytics.categories.retargeting.cpm = row.cpm == null ? null : round(row.cpm);
        analytics.categories.retargeting.clicks = round(row.clicks);
        analytics.categories.retargeting.cpc = row.cpc == null ? null : round(row.cpc);
      }
    } catch {
      analytics.warnings.push("Reach dan frequency retargeting ialah jumlah campaign kerana agregat tepat tidak tersedia.");
    }
  }
  return analytics;
}

async function metaConnectionStatus() {
  const row = await getMetaMcpConnection();
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

async function disconnectMeta() {
  await clearMetaMcpConnection();
}

module.exports = {
  META_MCP_URL,
  DATE_PRESETS,
  aggregateMetaData,
  aggregateMetaDailyRaw,
  buildReportDraft,
  fetchMetaCustomReport,
  fetchMetaDailyRaw,
  fetchMetaRange,
  fetchMetaReport,
  listMetaAdAccounts,
  disconnectMeta,
  finishMetaAuthorization,
  metaConnectionStatus,
  normalizeGraphRow,
  normalizeAdsReportConfig,
  presetDateRange,
  startMetaAuthorization,
  validateCustomWeek,
  _test: { decodeMaybeJson, normalizeMetaAccount, rowsFromPayload, schemaArgument },
};
