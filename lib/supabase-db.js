const SUPABASE_TABLES_ERROR = "Supabase table belum setup. Run SQL dalam supabase/schema.sql dahulu.";
const BANK_QR_BUCKET = "bank-qr";
const BUSINESS_ASSETS_BUCKET = "business-assets";
const POSTPILOT_ASSETS_BUCKET = "postpilot-assets";
const POSTPILOT_HOOK_IMAGE_LIMIT = 20;
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

async function supabaseRequest(path, options = {}) {
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
  });

  if (!response.ok) {
    let detail = "";
    try {
      const error = await response.json();
      detail = error.message || error.details || JSON.stringify(error);
    } catch (parseError) {
      detail = await response.text();
    }
    if (response.status === 404 || /relation .* does not exist/i.test(detail)) {
      throw new Error(SUPABASE_TABLES_ERROR);
    }
    throw new Error(detail || `Supabase request failed (${response.status}).`);
  }

  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
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

async function ensurePostPilotAssetsBucket() {
  await ensureStorageBucket(POSTPILOT_ASSETS_BUCKET);
}

async function ensureStorageBucket(bucket) {
  try {
    await supabaseStorageRequest("bucket", {
      method: "POST",
      contentType: "application/json",
      body: JSON.stringify({
        id: bucket,
        name: bucket,
        public: false,
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
    drive_folder_id: client.driveFolderId || "",
    drive_folder_name: client.driveFolderName || "",
    weekly_report_folder_id: client.weeklyReportFolderId || "",
    invoice_receipt_folder_id: client.invoiceReceiptFolderId || "",
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
    driveFolderId: row.drive_folder_id || "",
    driveFolderName: row.drive_folder_name || "",
    weeklyReportFolderId: row.weekly_report_folder_id || "",
    invoiceReceiptFolderId: row.invoice_receipt_folder_id || "",
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

async function upsertSupabaseClient(client) {
  const rows = await supabaseRequest("invoice_clients?on_conflict=code", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=representation",
    body: [clientToRow(client)],
  });
  return rowToClient(rows?.[0] || clientToRow(client));
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
        serviceStoppedAt: client.serviceStoppedAt || deletedAt,
      }),
      code: target,
      drive_folder_id: "",
      weekly_report_folder_id: "",
      invoice_receipt_folder_id: "",
      service_status: "paused",
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

function postPilotDraftToRow(draft = {}) {
  const variations = Array.isArray(draft.recentVariations || draft.recent_variations)
    ? (draft.recentVariations || draft.recent_variations).slice(-120)
    : [];
  const galleryImages = Array.isArray(draft.hookGalleryImages || draft.hook_gallery_images)
    ? (draft.hookGalleryImages || draft.hook_gallery_images).map(normalizeManifestHookImage).filter((image) => image.storagePath)
    : [];
  return {
    id: "default",
    product_name: cleanText(draft.productName || draft.product_name || "K-Method") || "K-Method",
    affiliate_link: cleanText(draft.affiliateLink || draft.affiliate_link || "https://swiy.co/kmethod") || "https://swiy.co/kmethod",
    post_mode: cleanText(draft.postMode || draft.post_mode || "soft") || "soft",
    hook_image_path: cleanText(draft.hookImagePath || draft.hook_image_path || ""),
    hook_image_name: cleanText(draft.hookImageName || draft.hook_image_name || ""),
    hook_image_mime: cleanText(draft.hookImageMime || draft.hook_image_mime || ""),
    hook_image_size: Number(draft.hookImageSize || draft.hook_image_size || 0),
    hook_image_updated_at: draft.hookImageUpdatedAt || draft.hook_image_updated_at || null,
    // Older installs only have this JSON column. Keep the gallery metadata here
    // until the optional postpilot_hook_images table is available.
    recent_variations: { variations, hookGalleryImages: galleryImages },
  };
}

function rowToPostPilotDraft(row = {}) {
  const stored = row.recent_variations;
  const recentVariations = Array.isArray(stored)
    ? stored
    : Array.isArray(stored?.variations) ? stored.variations : [];
  const hookGalleryImages = Array.isArray(stored?.hookGalleryImages)
    ? stored.hookGalleryImages.map(normalizeManifestHookImage).filter((image) => image.storagePath)
    : [];
  return {
    productName: row.product_name || "K-Method",
    affiliateLink: row.affiliate_link || "https://swiy.co/kmethod",
    postMode: row.post_mode || "soft",
    hookImagePath: row.hook_image_path || "",
    hookImageName: row.hook_image_name || "",
    hookImageMime: row.hook_image_mime || "",
    hookImageSize: Number(row.hook_image_size || 0),
    hookImageUpdatedAt: row.hook_image_updated_at || "",
    recentVariations,
    hookGalleryImages,
    hasHookImage: Boolean(row.hook_image_path),
    createdAt: row.created_at || "",
    updatedAt: row.updated_at || "",
  };
}

function rowToPostPilotHookImage(row = {}) {
  return {
    id: row.id || "",
    storagePath: row.storage_path || "",
    name: row.image_name || "post-hook.jpg",
    type: row.image_mime || "image/jpeg",
    size: Number(row.image_size || 0),
    useCount: Number(row.use_count || 0),
    lastUsedAt: row.last_used_at || "",
    createdAt: row.created_at || "",
  };
}

function isMissingSupabaseTableError(error) {
  return /Supabase table belum setup|relation .* does not exist/i.test(error?.message || "");
}

function normalizeManifestHookImage(image = {}) {
  return {
    id: cleanText(image.id) || `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    storagePath: cleanText(image.storagePath || image.storage_path),
    name: cleanText(image.name || image.image_name) || "post-hook.jpg",
    type: cleanText(image.type || image.image_mime) || "image/jpeg",
    size: Number(image.size || image.image_size || 0),
    useCount: Number(image.useCount || image.use_count || 0),
    lastUsedAt: image.lastUsedAt || image.last_used_at || "",
    createdAt: image.createdAt || image.created_at || new Date().toISOString(),
  };
}

function postPilotStorageImageId(storagePath) {
  return `storage-${Buffer.from(storagePath).toString("base64url")}`;
}

function storagePathFromPostPilotImageId(id) {
  if (!String(id || "").startsWith("storage-")) return "";
  try {
    const path = Buffer.from(String(id).slice("storage-".length), "base64url").toString("utf8");
    return path.startsWith("gallery/") ? path : "";
  } catch {
    return "";
  }
}

function imageTypeFromName(name) {
  const extension = String(name || "").toLowerCase().split(".").pop();
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  return "image/jpeg";
}

async function listPostPilotHookImagesFromStorage() {
  await ensurePostPilotAssetsBucket();
  const response = await supabaseStorageRequest(`object/list/${encodeURIComponent(POSTPILOT_ASSETS_BUCKET)}`, {
    method: "POST",
    contentType: "application/json",
    body: Buffer.from(JSON.stringify({
      prefix: "gallery",
      limit: POSTPILOT_HOOK_IMAGE_LIMIT,
      offset: 0,
      sortBy: { column: "created_at", order: "asc" },
    })),
  });
  const objects = await response.json();
  return (Array.isArray(objects) ? objects : [])
    .filter((object) => object?.name && !/\.json$/i.test(object.name))
    .map((object) => {
      const storagePath = `gallery/${object.name}`;
      return normalizeManifestHookImage({
        id: postPilotStorageImageId(storagePath),
        storagePath,
        name: object.name,
        type: object.metadata?.mimetype || imageTypeFromName(object.name),
        size: object.metadata?.size || 0,
        createdAt: object.created_at || object.updated_at,
      });
    })
    .sort((a, b) => Number(new Date(a.createdAt)) - Number(new Date(b.createdAt)));
}

async function listPostPilotHookImagesFromManifest() {
  const images = await listPostPilotHookImagesFromStorage();
  return images.sort((a, b) => a.useCount - b.useCount
    || Number(new Date(a.lastUsedAt || a.createdAt)) - Number(new Date(b.lastUsedAt || b.createdAt)));
}

async function getPostPilotDraft() {
  try {
    const rows = await supabaseRequest("postpilot_drafts?id=eq.default&select=*");
    return rows?.[0] ? rowToPostPilotDraft(rows[0]) : rowToPostPilotDraft();
  } catch (error) {
    if (isMissingSupabaseTableError(error)) return rowToPostPilotDraft();
    throw error;
  }
}

async function upsertPostPilotDraft(draft) {
  const current = await getPostPilotDraft().catch(() => rowToPostPilotDraft());
  const next = {
    ...current,
    productName: draft.productName || draft.product_name || current.productName,
    affiliateLink: draft.affiliateLink || draft.affiliate_link || current.affiliateLink,
    postMode: draft.postMode || draft.post_mode || current.postMode,
    recentVariations: Array.isArray(draft.recentVariations || draft.recent_variations)
      ? (draft.recentVariations || draft.recent_variations).slice(-120)
      : current.recentVariations,
    hookGalleryImages: Array.isArray(draft.hookGalleryImages || draft.hook_gallery_images)
      ? (draft.hookGalleryImages || draft.hook_gallery_images)
      : current.hookGalleryImages,
  };
  try {
    const rows = await supabaseRequest("postpilot_drafts?on_conflict=id", {
      method: "POST",
      prefer: "resolution=merge-duplicates,return=representation",
      body: [postPilotDraftToRow(next)],
    });
    return rowToPostPilotDraft(rows?.[0] || postPilotDraftToRow(next));
  } catch (error) {
    if (isMissingSupabaseTableError(error)) return rowToPostPilotDraft(postPilotDraftToRow(next));
    throw error;
  }
}

async function listPostPilotHookImages() {
  try {
    const rows = await supabaseRequest("postpilot_hook_images?select=*&order=use_count.asc,last_used_at.asc.nullsfirst,created_at.asc");
    return (rows || []).map(rowToPostPilotHookImage);
  } catch (error) {
    if (isMissingSupabaseTableError(error)) return listPostPilotHookImagesFromManifest();
    throw error;
  }
}

async function uploadPostPilotHookGalleryImage(file) {
  const current = await listPostPilotHookImages();
  if (current.length >= POSTPILOT_HOOK_IMAGE_LIMIT) {
    throw new Error(`Galeri gambar hook sudah penuh (${POSTPILOT_HOOK_IMAGE_LIMIT}). Delete satu gambar dahulu.`);
  }
  const { mime, extension } = validatePostPilotHookImage(file);
  await ensurePostPilotAssetsBucket();
  const path = `gallery/hook-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
  await supabaseStorageRequest(storageObjectPath(POSTPILOT_ASSETS_BUCKET, path), {
    method: "POST",
    contentType: mime,
    headers: { "x-upsert": "false" },
    body: file.data,
  });
  try {
    const rows = await supabaseRequest("postpilot_hook_images", {
      method: "POST",
      prefer: "return=representation",
      body: [{ storage_path: path, image_name: cleanText(file.filename), image_mime: mime, image_size: file.data.length }],
    });
    return rowToPostPilotHookImage(rows?.[0]);
  } catch (error) {
    if (isMissingSupabaseTableError(error)) {
      const image = normalizeManifestHookImage({
        id: postPilotStorageImageId(path),
        storagePath: path,
        name: file.filename,
        type: mime,
        size: file.data.length,
        createdAt: new Date().toISOString(),
      });
      return image;
    }
    await deleteStorageObject(POSTPILOT_ASSETS_BUCKET, path).catch(() => {});
    throw error;
  }
}

async function getPostPilotHookImage(id) {
  if (!id) throw new Error("ID gambar hook wajib ada.");
  let image = null;
  try {
    const rows = await supabaseRequest(`postpilot_hook_images?id=eq.${eq(id)}&select=*&limit=1`);
    image = rows?.[0] ? rowToPostPilotHookImage(rows[0]) : null;
  } catch (error) {
    if (!isMissingSupabaseTableError(error)) throw error;
    const storagePath = storagePathFromPostPilotImageId(id);
    image = storagePath ? normalizeManifestHookImage({
      id,
      storagePath,
      name: storagePath.split("/").pop(),
      type: imageTypeFromName(storagePath),
    }) : null;
  }
  if (!image) throw new Error("Gambar hook tidak dijumpai.");
  return image;
}

async function downloadPostPilotHookGalleryImage(id) {
  const image = await getPostPilotHookImage(id);
  const response = await supabaseStorageRequest(storageObjectPath(POSTPILOT_ASSETS_BUCKET, image.storagePath));
  return { image, buffer: Buffer.from(await response.arrayBuffer()), contentType: response.headers.get("content-type") || image.type };
}

async function deletePostPilotHookGalleryImage(id) {
  const image = await getPostPilotHookImage(id);
  await deleteStorageObject(POSTPILOT_ASSETS_BUCKET, image.storagePath);
  try {
    await supabaseRequest(`postpilot_hook_images?id=eq.${eq(id)}`, { method: "DELETE" });
  } catch (error) {
    if (!isMissingSupabaseTableError(error)) throw error;
    // The storage object was already deleted above. No table metadata exists.
  }
  return image;
}

async function reservePostPilotHookImages(count) {
  const safeCount = Math.max(1, Math.min(Number(count || 1), 5));
  const all = await listPostPilotHookImages();
  if (all.length < safeCount) throw new Error(`Perlu sekurang-kurangnya ${safeCount} gambar hook dalam galeri.`);
  const ordered = [...all].sort((a, b) => a.useCount - b.useCount
    || Number(new Date(a.lastUsedAt || a.createdAt)) - Number(new Date(b.lastUsedAt || b.createdAt))
    || Math.random() - 0.5);
  const selected = ordered.slice(0, safeCount);
  const usedAt = new Date().toISOString();
  if (selected.every((image) => storagePathFromPostPilotImageId(image.id))) {
    const randomized = [...all].sort(() => Math.random() - 0.5).slice(0, safeCount);
    return randomized.map((image) => ({ ...image, useCount: image.useCount + 1, lastUsedAt: usedAt }));
  }
  try {
    await Promise.all(selected.map((image) => supabaseRequest(`postpilot_hook_images?id=eq.${eq(image.id)}`, {
      method: "PATCH",
      prefer: "return=representation",
      body: { use_count: image.useCount + 1, last_used_at: usedAt },
    })));
  } catch (error) {
    if (!isMissingSupabaseTableError(error)) throw error;
    return selected.map((image) => ({ ...image, useCount: image.useCount + 1, lastUsedAt: usedAt }));
  }
  return selected.map((image) => ({ ...image, useCount: image.useCount + 1, lastUsedAt: usedAt }));
}

function validatePostPilotHookImage(file) {
  if (!file || !file.data?.length) throw new Error("Gambar hook wajib diupload.");
  const mime = String(file.contentType || "").toLowerCase();
  if (!IMAGE_ASSET_MIME_TYPES.has(mime)) throw new Error("Format gambar hook tidak disokong. Guna JPG, PNG atau WEBP.");
  if (file.data.length > IMAGE_ASSET_MAX_BYTES) throw new Error("Gambar hook terlalu besar. Limit 2MB.");
  const extension = qrExtension(file);
  if (!extension) throw new Error("Nama/format gambar hook tidak sah.");
  return { mime, extension };
}

async function uploadPostPilotHookImage(file) {
  const current = await getPostPilotDraft().catch(() => rowToPostPilotDraft());
  const { mime, extension } = validatePostPilotHookImage(file);
  await ensurePostPilotAssetsBucket();
  if (current.hookImagePath) await deleteStorageObject(POSTPILOT_ASSETS_BUCKET, current.hookImagePath);

  const path = `hook/hook-${Date.now()}.${extension}`;
  await supabaseStorageRequest(storageObjectPath(POSTPILOT_ASSETS_BUCKET, path), {
    method: "POST",
    contentType: mime,
    headers: { "x-upsert": "false" },
    body: file.data,
  });

  const rows = await supabaseRequest("postpilot_drafts?on_conflict=id", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=representation",
    body: [{
      ...postPilotDraftToRow(current),
      hook_image_path: path,
      hook_image_name: cleanText(file.filename),
      hook_image_mime: mime,
      hook_image_size: file.data.length,
      hook_image_updated_at: new Date().toISOString(),
    }],
  });
  return rowToPostPilotDraft(rows?.[0]);
}

async function downloadPostPilotHookImage() {
  const draft = await getPostPilotDraft();
  if (!draft.hookImagePath) throw new Error("Gambar hook Post Pilot belum diupload.");
  const response = await supabaseStorageRequest(storageObjectPath(POSTPILOT_ASSETS_BUCKET, draft.hookImagePath));
  return {
    draft,
    buffer: Buffer.from(await response.arrayBuffer()),
    contentType: response.headers.get("content-type") || draft.hookImageMime || "application/octet-stream",
  };
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

async function recordSupabaseInvoiceUpload({ invoice, upload, replaced }) {
  if (!isSupabaseConfigured()) return null;

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

module.exports = {
  clearBankQrImage,
  clearBusinessLogo,
  createBankAccount,
  deleteBankAccount,
  downloadBankQrImage,
  downloadBusinessLogo,
  downloadPostPilotHookImage,
  getBankAccountById,
  getDefaultBankAccount,
  getPostPilotDraft,
  getSupabaseBusinessSettings,
  findInvoiceUpload,
  isSupabaseConfigured,
  listActivity,
  listBankAccounts,
  listSupabaseClients,
  recordActivity,
  recordSupabaseInvoiceUpload,
  setSupabaseClientServiceStatus,
  assertSupabaseClientDeleteReady,
  tombstoneSupabaseClient,
  updateBankAccount,
  uploadBankQrImage,
  uploadBusinessLogo,
  uploadPostPilotHookImage,
  deletePostPilotHookGalleryImage,
  downloadPostPilotHookGalleryImage,
  getPostPilotHookImage,
  listPostPilotHookImages,
  reservePostPilotHookImages,
  uploadPostPilotHookGalleryImage,
  upsertPostPilotDraft,
  upsertSupabaseBusinessSettings,
  upsertSupabaseClient,
};
