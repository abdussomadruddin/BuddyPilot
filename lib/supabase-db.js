const SUPABASE_TABLES_ERROR = "Supabase table belum setup. Run SQL dalam supabase/schema.sql dahulu.";
const BANK_QR_BUCKET = "bank-qr";
const BUSINESS_ASSETS_BUCKET = "business-assets";
const IMAGE_ASSET_MAX_BYTES = 2 * 1024 * 1024;
const IMAGE_ASSET_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function supabaseConfig() {
  const url = String(process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || "").trim();
  return { url, key };
}

function isSupabaseConfigured() {
  const { url, key } = supabaseConfig();
  return Boolean(url && key);
}

function requireSupabaseConfig() {
  const config = supabaseConfig();
  if (!config.url || !config.key) {
    throw new Error("Set SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY dahulu.");
  }
  return config;
}

const inflightReads = require("./inflight-reads").createInflightReads();

async function supabaseRequest(path, options = {}) {
  const { url, key } = requireSupabaseConfig();
  const method = String(options.method || "GET").toUpperCase();
  if (method !== "GET") inflightReads.invalidate();
  if (method === "GET" && Object.keys(options).length === 0) {
    return inflightReads.run([url, key], path, () => performSupabaseRequest(path, options));
  }
  try {
    return await performSupabaseRequest(path, options);
  } finally {
    if (method !== "GET") inflightReads.invalidate();
  }
}

async function performSupabaseRequest(path, options = {}) {
  const { url, key } = requireSupabaseConfig();
  const response = await fetch(`${url}/rest/v1/${path}`, {
    method: options.method || "GET",
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
      ...(options.prefer ? { Prefer: options.prefer } : {}),
      ...(options.headers || {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: options.signal || AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const body = await response.text();
    let detail = body;
    let code = "";
    try {
      const error = JSON.parse(body);
      code = error.code || "";
      detail = error.message || error.details || JSON.stringify(error);
    } catch {}
    if (["42P01", "PGRST205"].includes(code) || /relation .* does not exist/i.test(detail)) {
      throw new Error(SUPABASE_TABLES_ERROR);
    }
    const error = new Error(/<\/?(?:html|!doctype)/i.test(detail)
      ? `Supabase tidak tersedia (HTTP ${response.status}). Semak status project dan cuba semula.`
      : detail || `Supabase request failed (${response.status}).`);
    error.statusCode = response.status >= 500 || response.status === 429 ? 503 : 502;
    throw error;
  }

  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

async function getTikTokMcpConnection() {
  const rows = await supabaseRequest("tiktok_mcp_connections?id=eq.default&select=*&limit=1");
  return rows?.[0] || null;
}

async function saveTikTokMcpConnection(value = {}) {
  const rows = await supabaseRequest("tiktok_mcp_connections?on_conflict=id", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=representation",
    body: [{
      id: "default",
      encrypted_state: String(value.encryptedState || value.encrypted_state || ""),
      status: String(value.status || "disconnected"),
      authorized_at: value.authorizedAt || value.authorized_at || null,
      expires_at: value.expiresAt || value.expires_at || null,
      error_message: String(value.errorMessage || value.error_message || "").slice(0, 1000),
    }],
  });
  return rows?.[0] || null;
}

async function clearTikTokMcpConnection() {
  await supabaseRequest("tiktok_mcp_connections?id=eq.default", { method: "DELETE" });
}

async function getMetaMcpConnection() {
  const rows = await supabaseRequest("meta_mcp_connections?id=eq.default&select=*&limit=1");
  return rows?.[0] || null;
}

async function saveMetaMcpConnection(value = {}) {
  const rows = await supabaseRequest("meta_mcp_connections?on_conflict=id", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=representation",
    body: [{
      id: "default",
      encrypted_state: String(value.encryptedState || value.encrypted_state || ""),
      status: String(value.status || "disconnected"),
      authorized_at: value.authorizedAt || value.authorized_at || null,
      expires_at: value.expiresAt || value.expires_at || null,
      error_message: String(value.errorMessage || value.error_message || "").slice(0, 1000),
    }],
  });
  return rows?.[0] || null;
}

async function clearMetaMcpConnection() {
  await supabaseRequest("meta_mcp_connections?id=eq.default", { method: "DELETE" });
}

async function savePushSubscription(subscription, userAgent = "") {
  const endpoint = cleanText(subscription?.endpoint);
  const p256dh = cleanText(subscription?.keys?.p256dh);
  const auth = cleanText(subscription?.keys?.auth);
  if (!endpoint || !p256dh || !auth) throw new Error("Push subscription tidak sah.");
  const rows = await supabaseRequest("push_subscriptions?on_conflict=endpoint", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=representation",
    body: [{ endpoint, p256dh, auth, user_agent: cleanText(userAgent).slice(0, 500) }],
  });
  return rows?.[0] || null;
}

async function deletePushSubscription(endpoint) {
  const value = cleanText(endpoint);
  if (!value) return;
  await supabaseRequest(`push_subscriptions?endpoint=eq.${eq(value)}`, { method: "DELETE" });
}

async function listPushSubscriptions() {
  return await supabaseRequest("push_subscriptions?select=*&order=updated_at.desc") || [];
}

async function markPushSubscriptionNotified(endpoint, expiresAt) {
  await supabaseRequest(`push_subscriptions?endpoint=eq.${eq(endpoint)}`, {
    method: "PATCH",
    body: { last_notified_expires_at: expiresAt },
  });
}

async function listPersonalAdsAccounts() {
  return await supabaseRequest("personal_ads_accounts?select=*&order=account_name.asc") || [];
}

async function getPersonalAdsAccount(accountId) {
  const rows = await supabaseRequest(`personal_ads_accounts?account_id=eq.${eq(cleanText(accountId).replace(/^act_/, ""))}&select=*&limit=1`);
  return rows?.[0] || null;
}

async function savePersonalAdsAccount(value = {}) {
  const accountId = cleanText(value.accountId || value.account_id).replace(/^act_/, "");
  if (!accountId) throw new Error("Ads account ID wajib ada.");
  const rows = await supabaseRequest("personal_ads_accounts?on_conflict=account_id", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=representation",
    body: [{
      account_id: accountId,
      account_name: cleanText(value.accountName || value.account_name || accountId),
      currency: cleanText(value.currency || "MYR").toUpperCase(),
      auto_report_enabled: Boolean(value.autoReportEnabled ?? value.auto_report_enabled),
      prospecting_keywords: Array.isArray(value.prospectingKeywords) ? value.prospectingKeywords : (value.prospecting_keywords || []),
      retargeting_keywords: Array.isArray(value.retargetingKeywords) ? value.retargetingKeywords : (value.retargeting_keywords || []),
      product_rules: Array.isArray(value.productRules) ? value.productRules : (value.product_rules || []),
    }],
  });
  return rows?.[0] || null;
}

async function listEnabledPersonalAdsAccounts() {
  return await supabaseRequest("personal_ads_accounts?auto_report_enabled=eq.true&select=*&order=account_name.asc") || [];
}

async function getPersonalAdsReport(accountId, reportDate) {
  const rows = await supabaseRequest(`personal_ads_daily_reports?account_id=eq.${eq(cleanText(accountId).replace(/^act_/, ""))}&report_date=eq.${eq(reportDate)}&select=*&limit=1`);
  return rows?.[0] || null;
}

async function listPersonalAdsReportDates(accountId, limit = 45) {
  const safeLimit = Math.max(1, Math.min(Number(limit || 45), 180));
  return await supabaseRequest(`personal_ads_daily_reports?account_id=eq.${eq(cleanText(accountId).replace(/^act_/, ""))}&select=report_date,status,generated_at,error_message&order=report_date.desc&limit=${safeLimit}`) || [];
}

async function savePersonalAdsReport(value = {}) {
  const accountId = cleanText(value.accountId || value.account_id).replace(/^act_/, "");
  const reportDate = cleanText(value.reportDate || value.report_date);
  if (!accountId || !reportDate) throw new Error("Account dan tarikh Ads CMO wajib ada.");
  const status = ["processing", "ready", "failed"].includes(value.status) ? value.status : "processing";
  const rows = await supabaseRequest("personal_ads_daily_reports?on_conflict=account_id,report_date", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=representation",
    body: [{
      account_id: accountId,
      report_date: reportDate,
      status,
      yesterday: value.yesterday ?? null,
      current_period: value.currentPeriod ?? value.current_period ?? null,
      comparison_period: value.comparisonPeriod ?? value.comparison_period ?? null,
      diagnosis: value.diagnosis ?? null,
      error_message: cleanText(value.error || value.error_message).slice(0, 1200),
      generated_at: status === "ready" ? (value.generatedAt || new Date().toISOString()) : null,
    }],
  });
  return rows?.[0] || null;
}

async function getPersonalAdsReportRun(reportDate) {
  const rows = await supabaseRequest(`personal_ads_report_runs?report_date=eq.${eq(reportDate)}&select=*&limit=1`);
  return rows?.[0] || null;
}

async function savePersonalAdsReportRun(value = {}) {
  const reportDate = cleanText(value.reportDate || value.report_date);
  if (!reportDate) throw new Error("Tarikh run Ads CMO wajib ada.");
  const rows = await supabaseRequest("personal_ads_report_runs?on_conflict=report_date", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=representation",
    body: [{
      report_date: reportDate,
      status: ["processing", "ready", "partial", "failed"].includes(value.status) ? value.status : "processing",
      selected_count: Number(value.selectedCount ?? value.selected_count ?? 0),
      ready_count: Number(value.readyCount ?? value.ready_count ?? 0),
      failed_count: Number(value.failedCount ?? value.failed_count ?? 0),
      push_sent_at: value.pushSentAt ?? value.push_sent_at ?? null,
      push_result: value.pushResult ?? value.push_result ?? {},
      error_message: cleanText(value.error || value.error_message).slice(0, 1200),
      started_at: value.startedAt || value.started_at || new Date().toISOString(),
      completed_at: value.completedAt ?? value.completed_at ?? null,
    }],
  });
  return rows?.[0] || null;
}

async function supabaseStorageRequest(path, options = {}) {
  const { url, key } = requireSupabaseConfig();
  const headers = {
    apikey: key,
    authorization: `Bearer ${key}`,
    ...(options.contentType ? { "content-type": options.contentType } : {}),
    ...(options.headers || {}),
  };
  const response = await fetch(`${url}/storage/v1/${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body,
  });

  if (!response.ok) {
    let detail = "";
    try {
      const error = await response.json();
      detail = error.message || error.error || JSON.stringify(error);
    } catch (parseError) {
      detail = await response.text();
    }
    throw new Error(detail || `Supabase storage request failed (${response.status}).`);
  }

  return response;
}

function storageObjectPath(bucket, path) {
  const safePath = String(path || "")
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/");
  return `object/${encodeURIComponent(bucket)}/${safePath}`;
}

async function ensureBankQrBucket() {
  await ensureStorageBucket(BANK_QR_BUCKET);
}

async function ensureBusinessAssetsBucket() {
  await ensureStorageBucket(BUSINESS_ASSETS_BUCKET);
}


async function ensureStorageBucket(bucket, options = {}) {
  try {
    await supabaseStorageRequest("bucket", {
      method: "POST",
      contentType: "application/json",
      body: JSON.stringify({
        id: bucket,
        name: bucket,
        public: Boolean(options.public),
        file_size_limit: IMAGE_ASSET_MAX_BYTES,
        allowed_mime_types: Array.from(IMAGE_ASSET_MIME_TYPES),
      }),
    });
  } catch (error) {
    if (!/already exists|duplicate/i.test(error?.message || "")) throw error;
  }
}

function amount(value) {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) && numeric >= 0 ? Math.round(numeric * 100) / 100 : 0;
}

function cleanText(value) {
  return String(value || "").trim();
}

function eq(value) {
  return encodeURIComponent(String(value || ""));
}

function clientToRow(client) {
  const metadata = { ...(client.metadata || {}) };
  if (client.deletedAt || client.deleted_at) metadata.deletedAt = client.deletedAt || client.deleted_at;
  if (client.deletedDriveFolderId || client.deleted_drive_folder_id) {
    metadata.deletedDriveFolderId = client.deletedDriveFolderId || client.deleted_drive_folder_id;
  }
  if (client.deletedDriveFolderName || client.deleted_drive_folder_name) {
    metadata.deletedDriveFolderName = client.deletedDriveFolderName || client.deleted_drive_folder_name;
  }

  return {
    code: client.code,
    brand_client: client.brandClient || client.name || client.code,
    name: client.name || client.brandClient || client.code,
    contact_name: client.contactName || "",
    email: client.email || "",
    phone: client.phone || "",
    company_name: client.companyName || "",
    registration_number: client.registrationNumber || "",
    billing_name: client.billingName || client.companyName || client.brandClient || client.name || client.code,
    billing_address: client.billingAddress || "",
    monthly_retainer: amount(client.monthlyRetainer),
    service_type: client.serviceType || client.service_type || "",
    monthly_ad_budget: amount(client.monthlyAdBudget || client.monthly_ad_budget),
    start_date: client.startDate || client.start_date || null,
    agency_status: client.agencyStatus || client.agency_status || "active",
    notes: client.notes || "",
    archived_at: client.archivedAt || client.archived_at || null,
    drive_folder_id: client.driveFolderId || "",
    drive_folder_name: client.driveFolderName || "",
    weekly_report_folder_id: client.weeklyReportFolderId || "",
    invoice_receipt_folder_id: client.invoiceReceiptFolderId || "",
    onboarding_status: client.onboardingStatus || client.onboarding_status || "completed",
    onboarding_step: client.onboardingStep || client.onboarding_step || "",
    onboarding_state: client.onboardingState || client.onboarding_state || {},
    onboarding_completed_at: client.onboardingCompletedAt || client.onboarding_completed_at || null,
    service_status: client.serviceStatus || client.service_status || "active",
    service_stopped_at: client.serviceStoppedAt || client.service_stopped_at || null,
    service_recovered_at: client.serviceRecoveredAt || client.service_recovered_at || null,
    source: "supabase",
    metadata,
  };
}

function rowToClient(row) {
  const metadata = row.metadata || {};
  return {
    code: row.code,
    brandClient: row.brand_client,
    name: row.name || row.brand_client,
    contactName: row.contact_name || "",
    email: row.email || "",
    phone: row.phone || "",
    companyName: row.company_name || "",
    registrationNumber: row.registration_number || "",
    billingName: row.billing_name || row.company_name || row.brand_client,
    billingAddress: row.billing_address || "",
    monthlyRetainer: amount(row.monthly_retainer),
    serviceType: row.service_type || "",
    monthlyAdBudget: amount(row.monthly_ad_budget),
    startDate: row.start_date || "",
    agencyStatus: row.agency_status || "active",
    notes: row.notes || "",
    archivedAt: row.archived_at || "",
    driveFolderId: row.drive_folder_id || "",
    driveFolderName: row.drive_folder_name || "",
    weeklyReportFolderId: row.weekly_report_folder_id || "",
    invoiceReceiptFolderId: row.invoice_receipt_folder_id || "",
    onboardingStatus: row.onboarding_status || "completed",
    onboardingStep: row.onboarding_step || "",
    onboardingState: row.onboarding_state || {},
    onboardingCompletedAt: row.onboarding_completed_at || "",
    serviceStatus: row.service_status || "active",
    serviceStoppedAt: row.service_stopped_at || "",
    serviceRecoveredAt: row.service_recovered_at || "",
    deletedAt: row.deleted_at || metadata.deletedAt || "",
    deletedDriveFolderId: row.deleted_drive_folder_id || metadata.deletedDriveFolderId || "",
    deletedDriveFolderName: row.deleted_drive_folder_name || metadata.deletedDriveFolderName || "",
    source: "supabase",
    createdAt: row.created_at || "",
    updatedAt: row.updated_at || "",
    metadata,
  };
}

async function listSupabaseClients() {
  const rows = await supabaseRequest("invoice_clients?select=*&order=brand_client.asc");
  return (rows || []).map(rowToClient);
}

async function saveClientAdsMonitorPlatform(code, platform, config) {
  const rows = await supabaseRequest(`invoice_clients?code=eq.${eq(code)}&select=code,metadata,updated_at`);
  const row = rows?.[0];
  if (!row) throw new Error("Client perlu disimpan dalam Supabase dahulu.");
  const metadata = { ...(row.metadata || {}), adsMonitor: { ...(row.metadata?.adsMonitor || {}), [platform]: config } };
  const filter = row.updated_at ? `&updated_at=eq.${eq(row.updated_at)}` : "&updated_at=is.null";
  const saved = await supabaseRequest(`invoice_clients?code=eq.${eq(code)}${filter}`, {
    method: "PATCH", prefer: "return=representation",
    body: { metadata, updated_at: new Date().toISOString() },
  });
  if (!saved?.length) throw Object.assign(new Error("Client telah berubah. Refresh dan cuba simpan semula."), { statusCode: 409 });
  return config;
}

// Replace one key in a client's metadata, refusing if the row changed meanwhile.
async function saveClientMetadataKey(code, key, value) {
  const rows = await supabaseRequest(`invoice_clients?code=eq.${eq(code)}&select=code,metadata,updated_at`);
  const row = rows?.[0];
  if (!row) throw Object.assign(new Error("Client perlu disimpan dalam Supabase dahulu."), { statusCode: 404 });
  const metadata = { ...(row.metadata || {}), [key]: value };
  const filter = row.updated_at ? `&updated_at=eq.${eq(row.updated_at)}` : "&updated_at=is.null";
  const saved = await supabaseRequest(`invoice_clients?code=eq.${eq(code)}${filter}`, {
    method: "PATCH", prefer: "return=representation",
    body: { metadata, updated_at: new Date().toISOString() },
  });
  if (!saved?.length) throw Object.assign(new Error("Client telah berubah. Refresh dan cuba simpan semula."), { statusCode: 409 });
  return value;
}

async function upsertSupabaseClient(client) {
  const rows = await supabaseRequest("invoice_clients?on_conflict=code", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=representation",
    body: [clientToRow(client)],
  });
  return rowToClient(rows?.[0] || clientToRow(client));
}

async function deleteSupabaseOnboardingDraft(code) {
  const target = cleanText(code).toUpperCase();
  if (!target) throw new Error("Client code wajib ada.");
  await supabaseRequest(
    `invoice_clients?code=eq.${eq(target)}&onboarding_status=eq.in_progress`,
    { method: "DELETE", prefer: "return=minimal" }
  );
}

async function setSupabaseClientServiceStatus(code, status) {
  const target = cleanText(code).toUpperCase();
  if (!target) throw new Error("Client code wajib ada.");
  const rows = await supabaseRequest(`invoice_clients?code=eq.${eq(target)}&select=*`);
  if (!rows?.[0]) throw new Error(`Client ${target} tidak dijumpai dalam database.`);
  const now = new Date().toISOString();
  const isPaused = status === "paused";
  const savedRows = await supabaseRequest(`invoice_clients?code=eq.${eq(target)}`, {
    method: "PATCH",
    prefer: "return=representation",
    body: {
      service_status: isPaused ? "paused" : "active",
      agency_status: isPaused ? "paused" : "active",
      archived_at: null,
      service_stopped_at: isPaused ? now : rows[0].service_stopped_at,
      service_recovered_at: isPaused ? rows[0].service_recovered_at : now,
    },
  });
  return rowToClient(savedRows?.[0] || rows[0]);
}

async function assertSupabaseClientDeleteReady() {
  await supabaseRequest("invoice_clients?select=code,metadata,service_status,drive_folder_id&limit=1");
}

async function tombstoneSupabaseClient({ client, driveFolderId, driveFolderName }) {
  const target = cleanText(client?.code).toUpperCase();
  if (!target) throw new Error("Client code wajib ada.");
  const deletedAt = new Date().toISOString();
  const rows = await supabaseRequest("invoice_clients?on_conflict=code", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=representation",
    body: [{
      ...clientToRow({
        ...client,
        metadata: {
          ...(client.metadata || {}),
          deletedAt,
          deletedDriveFolderId: driveFolderId || client.driveFolderId || "",
          deletedDriveFolderName: driveFolderName || client.driveFolderName || "",
        },
        deletedAt,
        deletedDriveFolderId: driveFolderId || client.driveFolderId || "",
        deletedDriveFolderName: driveFolderName || client.driveFolderName || "",
        driveFolderId: "",
        weeklyReportFolderId: "",
        invoiceReceiptFolderId: "",
        serviceStatus: "paused",
        agencyStatus: "archived",
        archivedAt: deletedAt,
        serviceStoppedAt: client.serviceStoppedAt || deletedAt,
      }),
      code: target,
      drive_folder_id: "",
      weekly_report_folder_id: "",
      invoice_receipt_folder_id: "",
      service_status: "paused",
      agency_status: "archived",
      archived_at: deletedAt,
    }],
  });
  return rowToClient(rows?.[0] || {});
}

function settingsToRow(settings) {
  return {
    id: "default",
    name: settings.name || "",
    registration_number: settings.registrationNumber || settings.regNo || "",
    email: settings.email || "",
    phone: settings.phone || "",
    address: settings.address || "",
    payment_details: settings.paymentDetails || "",
    bank_name: settings.bankName || "",
    bank_account_number: settings.bankAccountNumber || "",
    bank_account_name: settings.bankAccountName || "",
    payment_link: settings.paymentLink || "",
    logo_path: settings.logoPath || "",
    logo_image_name: settings.logoImageName || settings.logo_image_name || "",
    logo_image_mime: settings.logoImageMime || settings.logo_image_mime || "",
    logo_image_size: Number(settings.logoImageSize || settings.logo_image_size || 0),
    logo_image_updated_at: settings.logoImageUpdatedAt || settings.logo_image_updated_at || null,
  };
}

function rowToSettings(row) {
  return {
    name: row.name || "",
    registrationNumber: row.registration_number || "",
    email: row.email || "",
    phone: row.phone || "",
    address: row.address || "",
    paymentDetails: row.payment_details || "",
    bankName: row.bank_name || "",
    bankAccountNumber: row.bank_account_number || "",
    bankAccountName: row.bank_account_name || "",
    paymentLink: row.payment_link || "",
    logoPath: row.logo_path || "",
    logoImageName: row.logo_image_name || "",
    logoImageMime: row.logo_image_mime || "",
    logoImageSize: Number(row.logo_image_size || 0),
    logoImageUpdatedAt: row.logo_image_updated_at || "",
    hasLogoImage: Boolean(row.logo_path),
  };
}

async function getSupabaseBusinessSettings() {
  const rows = await supabaseRequest("business_settings?id=eq.default&select=*");
  return rows?.[0] ? rowToSettings(rows[0]) : null;
}

async function upsertSupabaseBusinessSettings(settings) {
  const current = await getSupabaseBusinessSettings();
  const merged = current
    ? {
      ...settings,
      logoPath: settings.logoPath || current.logoPath || "",
      logoImageName: settings.logoImageName || current.logoImageName || "",
      logoImageMime: settings.logoImageMime || current.logoImageMime || "",
      logoImageSize: settings.logoImageSize || current.logoImageSize || 0,
      logoImageUpdatedAt: settings.logoImageUpdatedAt || current.logoImageUpdatedAt || null,
    }
    : settings;
  const rows = await supabaseRequest("business_settings?on_conflict=id", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=representation",
    body: [settingsToRow(merged)],
  });
  return rowToSettings(rows?.[0] || settingsToRow(merged));
}

function bankAccountToRow(account) {
  return {
    label: cleanText(account.label),
    bank_name: cleanText(account.bankName || account.bank_name),
    account_name: cleanText(account.accountName || account.account_name),
    account_number: cleanText(account.accountNumber || account.account_number),
    is_default: Boolean(account.isDefault || account.is_default),
    is_active: Object.prototype.hasOwnProperty.call(account, "isActive")
      ? Boolean(account.isActive)
      : Object.prototype.hasOwnProperty.call(account, "is_active")
        ? Boolean(account.is_active)
        : true,
  };
}

function rowToBankAccount(row) {
  return {
    id: row.id,
    label: row.label || "",
    bankName: row.bank_name || "",
    accountName: row.account_name || "",
    accountNumber: row.account_number || "",
    qrImagePath: row.qr_image_path || "",
    qrImageName: row.qr_image_name || "",
    qrImageMime: row.qr_image_mime || "",
    qrImageSize: Number(row.qr_image_size || 0),
    qrImageUpdatedAt: row.qr_image_updated_at || "",
    hasQrImage: Boolean(row.qr_image_path),
    isDefault: Boolean(row.is_default),
    isActive: Boolean(row.is_active),
    deletedAt: row.deleted_at || "",
    createdAt: row.created_at || "",
    updatedAt: row.updated_at || "",
  };
}

function validateBankAccount(account) {
  const clean = bankAccountToRow(account);
  if (!clean.label) throw new Error("Nama akaun bank wajib diisi.");
  if (!clean.bank_name) throw new Error("Nama bank wajib diisi.");
  if (!clean.account_name) throw new Error("Nama pemilik akaun wajib diisi.");
  if (!clean.account_number) throw new Error("No akaun wajib diisi.");
  return clean;
}

async function listBankAccounts() {
  const rows = await supabaseRequest("bank_accounts?select=*&is_active=eq.true&deleted_at=is.null&order=is_default.desc,label.asc");
  return (rows || []).map(rowToBankAccount);
}

async function getDefaultBankAccount() {
  const rows = await supabaseRequest("bank_accounts?select=*&is_default=eq.true&is_active=eq.true&deleted_at=is.null&limit=1");
  return rows?.[0] ? rowToBankAccount(rows[0]) : null;
}

async function getBankAccountById(id) {
  if (!id) throw new Error("ID akaun bank wajib ada.");
  const rows = await supabaseRequest(`bank_accounts?id=eq.${eq(id)}&deleted_at=is.null&select=*`);
  if (!rows?.[0]) throw new Error("Akaun bank tidak dijumpai.");
  return rowToBankAccount(rows[0]);
}

async function clearDefaultBankAccounts(exceptId = "") {
  const filter = exceptId ? `&id=neq.${eq(exceptId)}` : "";
  await supabaseRequest(`bank_accounts?is_default=eq.true${filter}`, {
    method: "PATCH",
    prefer: "return=minimal",
    body: { is_default: false },
  });
}

async function ensureOneDefaultBankAccount(preferredId = "") {
  const active = await listBankAccounts();
  if (!active.length) return null;
  const current = active.find((account) => account.isDefault);
  if (current) return current;
  const next = active.find((account) => account.id === preferredId) || active[0];
  await clearDefaultBankAccounts(next.id);
  const rows = await supabaseRequest(`bank_accounts?id=eq.${eq(next.id)}`, {
    method: "PATCH",
    prefer: "return=representation",
    body: { is_default: true },
  });
  return rowToBankAccount(rows?.[0] || next);
}

async function createBankAccount(account) {
  const clean = validateBankAccount(account);
  if (clean.is_default) await clearDefaultBankAccounts();
  const rows = await supabaseRequest("bank_accounts", {
    method: "POST",
    prefer: "return=representation",
    body: [clean],
  });
  const saved = rowToBankAccount(rows?.[0]);
  if (saved.isDefault) return saved;
  return (await ensureOneDefaultBankAccount(saved.id)) || saved;
}

async function updateBankAccount(id, account) {
  if (!id) throw new Error("ID akaun bank wajib ada.");
  const clean = validateBankAccount(account);
  if (clean.is_default) await clearDefaultBankAccounts(id);
  const rows = await supabaseRequest(`bank_accounts?id=eq.${eq(id)}&deleted_at=is.null`, {
    method: "PATCH",
    prefer: "return=representation",
    body: clean,
  });
  if (!rows?.[0]) throw new Error("Akaun bank tidak dijumpai.");
  const saved = rowToBankAccount(rows[0]);
  if (saved.isDefault) return saved;
  return (await ensureOneDefaultBankAccount()) || saved;
}

async function deleteBankAccount(id) {
  if (!id) throw new Error("ID akaun bank wajib ada.");
  const existingRows = await supabaseRequest(`bank_accounts?id=eq.${eq(id)}&deleted_at=is.null&select=*`);
  const existing = existingRows?.[0] ? rowToBankAccount(existingRows[0]) : null;
  if (!existing) throw new Error("Akaun bank tidak dijumpai.");

  const rows = await supabaseRequest(`bank_accounts?id=eq.${eq(id)}`, {
    method: "PATCH",
    prefer: "return=representation",
    body: {
      is_active: false,
      is_default: false,
      deleted_at: new Date().toISOString(),
    },
  });
  const deleted = rowToBankAccount(rows?.[0] || existingRows[0]);
  const defaultAccount = existing.isDefault ? await ensureOneDefaultBankAccount() : await getDefaultBankAccount();
  return { deleted, defaultAccount };
}

function qrExtension(file) {
  const mime = String(file.contentType || "").toLowerCase();
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/jpeg") return "jpg";
  const lowerName = String(file.filename || "").toLowerCase();
  if (lowerName.endsWith(".png")) return "png";
  if (lowerName.endsWith(".webp")) return "webp";
  if (lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg")) return "jpg";
  return "";
}

function validateBankQrFile(file) {
  if (!file || !file.data?.length) throw new Error("Gambar QR wajib diupload.");
  const mime = String(file.contentType || "").toLowerCase();
  if (!IMAGE_ASSET_MIME_TYPES.has(mime)) throw new Error("Format QR tidak disokong. Guna JPG, PNG atau WEBP.");
  if (file.data.length > IMAGE_ASSET_MAX_BYTES) throw new Error("Gambar QR terlalu besar. Limit 2MB.");
  const extension = qrExtension(file);
  if (!extension) throw new Error("Nama/format file QR tidak sah.");
  return { mime, extension };
}

async function deleteBankQrObject(path) {
  if (!path) return;
  try {
    await supabaseStorageRequest(`object/${encodeURIComponent(BANK_QR_BUCKET)}`, {
      method: "DELETE",
      contentType: "application/json",
      body: JSON.stringify({ prefixes: [path] }),
    });
  } catch (error) {
    if (!/not found/i.test(error?.message || "")) throw error;
  }
}

async function uploadBankQrImage(id, file) {
  const account = await getBankAccountById(id);
  const { mime, extension } = validateBankQrFile(file);
  await ensureBankQrBucket();
  if (account.qrImagePath) await deleteBankQrObject(account.qrImagePath);

  const path = `${account.id}/qr-${Date.now()}.${extension}`;
  await supabaseStorageRequest(storageObjectPath(BANK_QR_BUCKET, path), {
    method: "POST",
    contentType: mime,
    headers: { "x-upsert": "false" },
    body: file.data,
  });

  const rows = await supabaseRequest(`bank_accounts?id=eq.${eq(account.id)}&deleted_at=is.null`, {
    method: "PATCH",
    prefer: "return=representation",
    body: {
      qr_image_path: path,
      qr_image_name: cleanText(file.filename),
      qr_image_mime: mime,
      qr_image_size: file.data.length,
      qr_image_updated_at: new Date().toISOString(),
    },
  });
  return rowToBankAccount(rows?.[0]);
}

async function clearBankQrImage(id) {
  const account = await getBankAccountById(id);
  if (account.qrImagePath) await deleteBankQrObject(account.qrImagePath);
  const rows = await supabaseRequest(`bank_accounts?id=eq.${eq(account.id)}&deleted_at=is.null`, {
    method: "PATCH",
    prefer: "return=representation",
    body: {
      qr_image_path: "",
      qr_image_name: "",
      qr_image_mime: "",
      qr_image_size: 0,
      qr_image_updated_at: null,
    },
  });
  return rowToBankAccount(rows?.[0]);
}

async function downloadBankQrImage(id) {
  const account = await getBankAccountById(id);
  if (!account.qrImagePath) throw new Error("Akaun bank ini belum ada gambar QR.");
  const response = await supabaseStorageRequest(storageObjectPath(BANK_QR_BUCKET, account.qrImagePath));
  return {
    account,
    buffer: Buffer.from(await response.arrayBuffer()),
    contentType: response.headers.get("content-type") || account.qrImageMime || "application/octet-stream",
  };
}

function validateLogoFile(file) {
  if (!file || !file.data?.length) throw new Error("Logo wajib diupload.");
  const mime = String(file.contentType || "").toLowerCase();
  if (!IMAGE_ASSET_MIME_TYPES.has(mime)) throw new Error("Format logo tidak disokong. Guna JPG, PNG atau WEBP.");
  if (file.data.length > IMAGE_ASSET_MAX_BYTES) throw new Error("Logo terlalu besar. Limit 2MB.");
  const extension = qrExtension(file);
  if (!extension) throw new Error("Nama/format file logo tidak sah.");
  return { mime, extension };
}











































async function uploadBusinessLogo(file) {
  const current = await getSupabaseBusinessSettings();
  const { mime, extension } = validateLogoFile(file);
  await ensureBusinessAssetsBucket();
  if (current?.logoPath) await deleteStorageObject(BUSINESS_ASSETS_BUCKET, current.logoPath);

  const path = `logo/logo-${Date.now()}.${extension}`;
  await supabaseStorageRequest(storageObjectPath(BUSINESS_ASSETS_BUCKET, path), {
    method: "POST",
    contentType: mime,
    headers: { "x-upsert": "false" },
    body: file.data,
  });

  const rows = await supabaseRequest("business_settings?on_conflict=id", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=representation",
    body: [{
      ...(current ? settingsToRow(current) : settingsToRow({})),
      id: "default",
      logo_path: path,
      logo_image_name: cleanText(file.filename),
      logo_image_mime: mime,
      logo_image_size: file.data.length,
      logo_image_updated_at: new Date().toISOString(),
    }],
  });
  return rowToSettings(rows?.[0]);
}

async function clearBusinessLogo() {
  const current = await getSupabaseBusinessSettings();
  if (current?.logoPath) await deleteStorageObject(BUSINESS_ASSETS_BUCKET, current.logoPath);
  const rows = await supabaseRequest("business_settings?on_conflict=id", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=representation",
    body: [{
      ...(current ? settingsToRow(current) : settingsToRow({})),
      id: "default",
      logo_path: "",
      logo_image_name: "",
      logo_image_mime: "",
      logo_image_size: 0,
      logo_image_updated_at: null,
    }],
  });
  return rowToSettings(rows?.[0]);
}

async function downloadBusinessLogo() {
  const settings = await getSupabaseBusinessSettings();
  if (!settings?.logoPath) throw new Error("Logo syarikat belum diupload.");
  const response = await supabaseStorageRequest(storageObjectPath(BUSINESS_ASSETS_BUCKET, settings.logoPath));
  return {
    settings,
    buffer: Buffer.from(await response.arrayBuffer()),
    contentType: response.headers.get("content-type") || settings.logoImageMime || "application/octet-stream",
  };
}

async function deleteStorageObject(bucket, path) {
  if (!path) return;
  try {
    await supabaseStorageRequest(`object/${encodeURIComponent(bucket)}`, {
      method: "DELETE",
      contentType: "application/json",
      body: JSON.stringify({ prefixes: [path] }),
    });
  } catch (error) {
    if (!/not found/i.test(error?.message || "")) throw error;
  }
}

function activityToRow(activity) {
  return {
    activity_type: cleanText(activity.type || activity.activityType || "info"),
    title: cleanText(activity.title),
    description: cleanText(activity.description),
    entity_type: cleanText(activity.entityType || activity.entity_type),
    entity_id: cleanText(activity.entityId || activity.entity_id),
    metadata: activity.metadata || {},
  };
}

function rowToActivity(row) {
  return {
    id: row.id,
    type: row.activity_type,
    title: row.title,
    description: row.description,
    entityType: row.entity_type || "",
    entityId: row.entity_id || "",
    metadata: row.metadata || {},
    createdAt: row.created_at || "",
  };
}

async function recordActivity(activity) {
  if (!isSupabaseConfigured()) return null;
  const clean = activityToRow(activity);
  if (!clean.title) return null;
  const rows = await supabaseRequest("app_activity", {
    method: "POST",
    prefer: "return=representation",
    body: [clean],
  });
  return rows?.[0] ? rowToActivity(rows[0]) : null;
}

async function listActivity(limit = 30) {
  const safeLimit = Math.max(1, Math.min(Number(limit || 30), 50));
  const rows = await supabaseRequest(`app_activity?select=*&order=created_at.desc&limit=${safeLimit}`);
  return (rows || []).map(rowToActivity);
}

// Activity of the given types since an ISO time, newest first (for queues).
async function listActivityByTypes(types = [], since = "") {
  const list = types.map((item) => cleanText(item)).filter((item) => /^[a-z_]+$/.test(item));
  if (!list.length) return [];
  const sinceFilter = since ? `&created_at=gte.${eq(since)}` : "";
  const rows = await supabaseRequest(`app_activity?select=*&activity_type=in.(${list.join(",")})${sinceFilter}&order=created_at.desc&limit=1000`);
  return (rows || []).map(rowToActivity);
}

async function saveOperationsHealth({ serviceName, status, detail = "", latencyMs = null, metadata = {}, checkedAt = new Date().toISOString() }) {
  if (!isSupabaseConfigured()) return null;
  const service = cleanText(serviceName).toLowerCase();
  const normalizedStatus = ["healthy", "warning", "down", "setup"].includes(status) ? status : "warning";
  if (!service) throw new Error("Operations health service wajib ada.");
  const rows = await supabaseRequest("operations_health?on_conflict=service_name", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=representation",
    body: [{
      service_name: service,
      status: normalizedStatus,
      detail: cleanText(detail).slice(0, 1000),
      latency_ms: Number.isFinite(Number(latencyMs)) ? Math.max(0, Math.round(Number(latencyMs))) : null,
      consecutive_failures: normalizedStatus === "healthy" || normalizedStatus === "setup" ? 0 : 1,
      last_checked_at: checkedAt,
      ...(normalizedStatus === "healthy" ? { last_healthy_at: checkedAt } : {}),
      metadata: metadata || {},
    }],
  });
  return rows?.[0] || null;
}

async function listOperationsHealth() {
  if (!isSupabaseConfigured()) return [];
  return await supabaseRequest("operations_health?service_name=neq.copy_pilot_secret&select=*&order=service_name.asc") || [];
}

async function openOperationsIncident(input = {}) {
  if (!isSupabaseConfigured()) return null;
  const fingerprint = cleanText(input.fingerprint).slice(0, 240);
  if (!fingerprint) throw new Error("Operations incident fingerprint wajib ada.");
  const rows = await supabaseRequest("operations_incidents?on_conflict=fingerprint", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=representation",
    body: [{
      fingerprint,
      severity: input.severity === "critical" ? "critical" : "warning",
      status: "open",
      service_name: cleanText(input.serviceName).toLowerCase(),
      entity_type: cleanText(input.entityType),
      entity_id: cleanText(input.entityId),
      client_code: cleanText(input.clientCode).toUpperCase(),
      title: cleanText(input.title).slice(0, 240),
      detail: cleanText(input.detail).slice(0, 1200),
      action: input.action || {},
      metadata: input.metadata || {},
      last_seen_at: new Date().toISOString(),
      resolved_at: null,
    }],
  });
  return rows?.[0] || null;
}

async function resolveOperationsIncident(fingerprint) {
  if (!isSupabaseConfigured()) return null;
  const value = cleanText(fingerprint);
  if (!value) return null;
  const rows = await supabaseRequest(`operations_incidents?fingerprint=eq.${eq(value)}&status=eq.open`, {
    method: "PATCH",
    prefer: "return=representation",
    body: { status: "resolved", resolved_at: new Date().toISOString() },
  });
  return rows?.[0] || null;
}

async function resolveOperationsIncidents(fingerprints) {
  if (!isSupabaseConfigured()) return [];
  const values = [...new Set(fingerprints.map(cleanText).filter(Boolean))];
  if (!values.length) return [];
  const filter = encodeURIComponent(`(${values.map((value) => JSON.stringify(value)).join(",")})`);
  return await supabaseRequest(`operations_incidents?fingerprint=in.${filter}&status=eq.open`, {
    method: "PATCH",
    prefer: "return=minimal",
    body: { status: "resolved", resolved_at: new Date().toISOString() },
  });
}

async function markOperationsIncidentNotified(fingerprint, notifiedAt = new Date().toISOString()) {
  if (!isSupabaseConfigured()) return null;
  const rows = await supabaseRequest(`operations_incidents?fingerprint=eq.${eq(cleanText(fingerprint))}`, {
    method: "PATCH",
    prefer: "return=representation",
    body: { last_notified_at: notifiedAt },
  });
  return rows?.[0] || null;
}

async function listOpenOperationsIncidents(limit = 30) {
  if (!isSupabaseConfigured()) return [];
  const safeLimit = Math.max(1, Math.min(Number(limit || 30), 100));
  return await supabaseRequest(`operations_incidents?status=eq.open&select=*&order=severity.asc,last_seen_at.desc&limit=${safeLimit}`) || [];
}

async function listDismissedOperationsIncidents(fingerprints = []) {
  if (!isSupabaseConfigured() || !fingerprints.length) return [];
  const filter = encodeURIComponent(`in.(${fingerprints.map((value) => JSON.stringify(value)).join(",")})`);
  return await supabaseRequest(`operations_incidents?fingerprint=${filter}&status=eq.resolved&select=fingerprint,metadata`) || [];
}

async function dismissOperationsIncident(item) {
  if (!isSupabaseConfigured()) throw new Error("Database belum dikonfigurasi.");
  const fingerprint = cleanText(item.fingerprint);
  const existing = await supabaseRequest(`operations_incidents?fingerprint=eq.${eq(fingerprint)}&select=*`);
  const now = new Date().toISOString();
  const previous = existing?.[0];
  const rows = await supabaseRequest("operations_incidents?on_conflict=fingerprint", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=representation",
    body: [{
      fingerprint, status: "resolved", resolved_at: now,
      severity: item.severity, service_name: item.service,
      title: item.title, detail: item.detail, client_code: item.clientCode,
      action: item.action || {},
      last_seen_at: item.lastSeenAt || now,
      metadata: { ...(previous?.metadata || {}), dismissedAt: now, dismissedFailureAt: item.lastSeenAt || "" },
    }],
  });
  return rows?.[0];
}

async function listRecentDailyReportDeliveries(limit = 30) {
  if (!isSupabaseConfigured()) return [];
  const safeLimit = Math.max(1, Math.min(Number(limit || 30), 100));
  return await supabaseRequest(`telegram_daily_deliveries?select=*&order=updated_at.desc&limit=${safeLimit}`) || [];
}

async function getDailyReportDelivery(clientCode, reportDate) {
  if (!isSupabaseConfigured()) return null;
  const rows = await supabaseRequest(
    `telegram_daily_deliveries?select=*&client_code=eq.${eq(cleanText(clientCode).toUpperCase())}&report_date=eq.${eq(reportDate)}&limit=1`
  );
  return rows?.[0] || null;
}

async function claimDailyReportDelivery({ clientCode, reportDate, force = false }) {
  if (!isSupabaseConfigured()) return { claimed: true, delivery: null };
  const targetCode = cleanText(clientCode).toUpperCase();
  const existing = await getDailyReportDelivery(targetCode, reportDate);
  if (existing?.status === "sent" && !force) return { claimed: false, delivery: existing, reason: "already_sent" };
  if (existing) {
    if (!force) return { claimed: false, delivery: existing, reason: existing.status };
    const rows = await supabaseRequest(
      `telegram_daily_deliveries?client_code=eq.${eq(targetCode)}&report_date=eq.${eq(reportDate)}`,
      {
        method: "PATCH",
        prefer: "return=representation",
        body: { status: "processing", error_message: "" },
      }
    );
    return { claimed: true, delivery: rows?.[0] || existing };
  }
  const rows = await supabaseRequest("telegram_daily_deliveries?on_conflict=client_code,report_date", {
    method: "POST",
    prefer: "resolution=ignore-duplicates,return=representation",
    body: [{ client_code: targetCode, report_date: reportDate, status: "processing" }],
  });
  if (!rows?.[0]) return { claimed: false, delivery: await getDailyReportDelivery(targetCode, reportDate), reason: "duplicate" };
  return { claimed: true, delivery: rows[0] };
}

async function finishDailyReportDelivery({ clientCode, reportDate, status, messageId = "", error = "", metadata = {} }) {
  if (!isSupabaseConfigured()) return null;
  const rows = await supabaseRequest(
    `telegram_daily_deliveries?client_code=eq.${eq(cleanText(clientCode).toUpperCase())}&report_date=eq.${eq(reportDate)}`,
    {
      method: "PATCH",
      prefer: "return=representation",
      body: {
        status: status === "sent" ? "sent" : "failed",
        telegram_message_id: cleanText(messageId),
        error_message: cleanText(error).slice(0, 1000),
        metadata: metadata || {},
      },
    }
  );
  return rows?.[0] || null;
}

async function recordSupabaseInvoiceUpload({ invoice, upload, replaced }) {
  if (!isSupabaseConfigured()) return null;

  // Re-uploading an invoice must not forget that it was already paid.
  let payment = null;
  if (String(invoice.invoiceNumber || "").startsWith("INV-")) {
    try {
      const existing = await supabaseRequest(`invoice_uploads?select=metadata&invoice_number=eq.${eq(invoice.invoiceNumber)}&limit=1`);
      payment = existing?.[0]?.metadata?.payment || null;
    } catch {
      payment = null;
    }
  }

  const rows = await supabaseRequest("invoice_uploads?on_conflict=invoice_number", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=representation",
    body: [{
      invoice_number: invoice.invoiceNumber,
      period: invoice.period,
      client_code: invoice.client.code,
      client_name: invoice.client.name,
      invoice_date: invoice.invoiceDate,
      service_price: amount(invoice.subtotal),
      discount: amount(invoice.discount),
      total: amount(invoice.total),
      currency: invoice.currency,
      drive_file_id: upload.id || "",
      drive_file_name: invoice.fileName,
      drive_file_url: upload.webViewLink || "",
      invoice_receipt_folder_id: upload.invoicesFolderId || "",
      replaced: Boolean(replaced),
      metadata: {
        billingName: invoice.client.billingName,
        terms: invoice.terms,
        ...(payment ? { payment } : {}),
      },
    }],
  });
  const saved = rows?.[0] || null;
  await recordActivity({
    type: invoice.documentType === "receipt" ? "receipt_uploaded" : "invoice_uploaded",
    title: `${invoice.invoiceNumber} uploaded`,
    description: `${invoice.client.name} - ${invoice.currency} ${Number(invoice.total || 0).toFixed(2)}`,
    entityType: invoice.documentType === "receipt" ? "receipt" : "invoice",
    entityId: invoice.invoiceNumber,
    metadata: {
      clientCode: invoice.client.code,
      fileId: upload.id || "",
      replaced: Boolean(replaced),
    },
  });
  return saved;
}

async function findInvoiceUpload({ clientCode, period, prefix }) {
  if (!isSupabaseConfigured()) return null;
  const targetCode = cleanText(clientCode).toUpperCase();
  const targetPeriod = cleanText(period);
  const targetPrefix = cleanText(prefix);
  const rows = await supabaseRequest(
    `invoice_uploads?select=*&client_code=eq.${eq(targetCode)}&period=eq.${eq(targetPeriod)}&invoice_number=like.${eq(`${targetPrefix}*`)}&order=updated_at.desc&limit=1`
  );
  return rows?.[0] || null;
}

async function listInvoiceUploadsForPeriod(period) {
  const results = [];
  for (let offset = 0; ; offset += 1000) {
    const rows = await supabaseRequest(`invoice_uploads?select=client_code,drive_file_id,drive_file_url&period=eq.${eq(period)}&invoice_number=like.INV-*&order=invoice_number.asc&limit=1000&offset=${offset}`) || [];
    results.push(...rows);
    if (rows.length < 1000) return results;
  }
}

async function claimMonthlyInvoiceJob(kind, period) {
  const rows = await supabaseRequest("rpc/claim_monthly_invoice_job", {
    method: "POST", body: { p_kind: kind, p_period: period },
  });
  return rows?.[0] || null;
}

async function finishMonthlyInvoiceJob(job, result, error = "") {
  const rows = await supabaseRequest(`monthly_invoice_jobs?kind=eq.${eq(job.kind)}&period=eq.${eq(job.period)}&claim_token=eq.${eq(job.claim_token)}&status=eq.processing`, {
    method: "PATCH", prefer: "return=representation",
    body: { status: error ? "failed" : "completed", result, error_message: String(error).slice(0, 1200), completed_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  });
  if (!rows?.[0]) throw new Error("Monthly invoice job lease no longer belongs to this run.");
  return rows[0];
}

async function claimWeeklyReportJob(clientCode, weekStart) {
  const rows = await supabaseRequest("rpc/claim_weekly_report_job", { method: "POST", body: { p_client_code: clientCode, p_week_start: weekStart } });
  return rows?.[0] || null;
}

async function finishWeeklyReportJob(job, result, error = "") {
  const rows = await supabaseRequest(`weekly_report_jobs?client_code=eq.${eq(job.client_code)}&week_start=eq.${eq(job.week_start)}&claim_token=eq.${eq(job.claim_token)}&status=eq.processing`, { method: "PATCH", prefer: "return=representation", body: { status: error ? "failed" : "completed", result, error_message: String(error).slice(0, 1200), completed_at: new Date().toISOString() } });
  if (!rows?.[0]) throw new Error("Weekly report lease no longer belongs to this run.");
  return rows[0];
}

module.exports = {
  saveClientAdsMonitorPlatform,
  saveClientMetadataKey,
  listActivityByTypes,
  claimWeeklyReportJob,
  finishWeeklyReportJob,
  listInvoiceUploadsForPeriod,
  claimMonthlyInvoiceJob,
  finishMonthlyInvoiceJob,
  clearMetaMcpConnection,
  clearBankQrImage,
  clearBusinessLogo,
  clearTikTokMcpConnection,
  deletePushSubscription,
  createBankAccount,
  deleteBankAccount,
  downloadBankQrImage,
  downloadBusinessLogo,
  getBankAccountById,
  getDefaultBankAccount,
  getMetaMcpConnection,
  getTikTokMcpConnection,
  getPersonalAdsAccount,
  getPersonalAdsReport,
  getPersonalAdsReportRun,
  listPushSubscriptions,
  listEnabledPersonalAdsAccounts,
  listPersonalAdsAccounts,
  listPersonalAdsReportDates,
  listOpenOperationsIncidents,
  listOperationsHealth,
  listRecentDailyReportDeliveries,
  markPushSubscriptionNotified,
  markOperationsIncidentNotified,
  getSupabaseBusinessSettings,
  findInvoiceUpload,
  finishDailyReportDelivery,
  getDailyReportDelivery,
  isSupabaseConfigured,
  listActivity,
  listBankAccounts,
  listSupabaseClients,
  claimDailyReportDelivery,
  recordActivity,
  openOperationsIncident,
  recordSupabaseInvoiceUpload,
  resolveOperationsIncident,
  resolveOperationsIncidents,
  listDismissedOperationsIncidents,
  dismissOperationsIncident,
  saveOperationsHealth,
  saveMetaMcpConnection,
  saveTikTokMcpConnection,
  savePushSubscription,
  savePersonalAdsAccount,
  savePersonalAdsReport,
  savePersonalAdsReportRun,
  supabaseRequest,
  setSupabaseClientServiceStatus,
  assertSupabaseClientDeleteReady,
  tombstoneSupabaseClient,
  updateBankAccount,
  uploadBankQrImage,
  uploadBusinessLogo,
  deleteSupabaseOnboardingDraft,
  upsertSupabaseBusinessSettings,
  upsertSupabaseClient,
};
