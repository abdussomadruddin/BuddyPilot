const crypto = require("crypto");
const {
  aggregateAdflowDailyRaw,
  fetchAdflowDailyRaw,
  normalizeAdsReportConfig,
  presetDateRange,
} = require("./adflow-ads");
const { fetchTikTokDailyReport } = require("./tiktok-ads");
const { getMergedClientsWithStatus, updateClientDetails } = require("./invoices");
const {
  claimDailyReportDelivery,
  finishDailyReportDelivery,
  recordActivity,
} = require("./supabase-db");
const { reportOperationalFailure, reportOperationalSuccess } = require("./operations-events");
const { withTransientRetry } = require("./retry-policy");

const TELEGRAM_API = "https://api.telegram.org";
const CONNECT_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

function cleanText(value) {
  return String(value || "").trim();
}

function telegramToken() {
  const token = cleanText(process.env.TELEGRAM_BOT_TOKEN);
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN belum diset dalam Vercel.");
  return token;
}

function telegramConfig(client) {
  const value = client?.metadata?.telegramReportConfig || {};
  const storedRecipients = Array.isArray(value.recipients) ? value.recipients : [];
  const legacyRecipient = {
    slot: 1,
    chatId: cleanText(value.chatId),
    autoEnabled: Boolean(value.autoEnabled),
    username: cleanText(value.username),
    displayName: cleanText(value.displayName),
    linkedAt: cleanText(value.linkedAt),
    connectTokenHash: cleanText(value.connectTokenHash),
    connectTokenExpiresAt: cleanText(value.connectTokenExpiresAt),
    lastSentAt: cleanText(value.lastSentAt),
    lastSentDate: cleanText(value.lastSentDate),
    lastError: cleanText(value.lastError),
  };
  const recipients = [1, 2].map((slot) => {
    const stored = storedRecipients.find((item) => Number(item?.slot) === slot) || {};
    const source = slot === 1 ? { ...legacyRecipient, ...stored } : stored;
    return {
      slot,
      chatId: cleanText(source.chatId),
      autoEnabled: Boolean(source.autoEnabled),
      username: cleanText(source.username),
      displayName: cleanText(source.displayName),
      linkedAt: cleanText(source.linkedAt),
      connectTokenHash: cleanText(source.connectTokenHash),
      connectTokenExpiresAt: cleanText(source.connectTokenExpiresAt),
      lastSentAt: cleanText(source.lastSentAt),
      lastSentDate: cleanText(source.lastSentDate),
      lastError: cleanText(source.lastError),
    };
  });
  const primary = recipients[0];
  return {
    ...primary,
    recipients,
    connectedCount: recipients.filter((item) => item.chatId).length,
    autoEnabled: recipients.some((item) => item.autoEnabled && item.chatId),
  };
}

function recipientSlot(value) {
  const slot = Number(value || 1);
  if (![1, 2].includes(slot)) throw new Error("Slot penerima Telegram tidak sah.");
  return slot;
}

function telegramRecipient(client, slot = 1) {
  return telegramConfig(client).recipients.find((item) => item.slot === recipientSlot(slot));
}

async function updateTelegramRecipient(client, slot, patch) {
  const targetSlot = recipientSlot(slot);
  const { clients } = await getMergedClientsWithStatus();
  const latestClient = clients.find((item) => item.code === client.code && !item.deletedAt) || client;
  const recipients = telegramConfig(latestClient).recipients.map((item) => (
    item.slot === targetSlot ? { ...item, ...patch, slot: targetSlot } : item
  ));
  const primary = recipients[0];
  return updateClientDetails({
    clientCode: latestClient.code,
    telegramReportConfig: {
      recipients,
      // Keep slot 1 mirrored for backwards compatibility with existing clients.
      chatId: primary.chatId,
      autoEnabled: primary.autoEnabled,
      username: primary.username,
      displayName: primary.displayName,
      linkedAt: primary.linkedAt,
      connectTokenHash: primary.connectTokenHash,
      connectTokenExpiresAt: primary.connectTokenExpiresAt,
      lastSentAt: primary.lastSentAt,
      lastSentDate: primary.lastSentDate,
      lastError: primary.lastError,
    },
  });
}

async function telegramApi(method, body = {}, { retry = method !== "sendMessage" } = {}) {
  const request = async () => {
    const response = await fetch(`${TELEGRAM_API}/bot${telegramToken()}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(12000),
    });
    const json = await response.json().catch(() => null);
    if (!response.ok || !json?.ok) {
      const error = new Error(`Telegram gagal: ${json?.description || `HTTP ${response.status}`}`);
      error.statusCode = response.status;
      throw error;
    }
    return json.result;
  };
  return retry ? withTransientRetry(request) : request();
}

async function sendTelegramMessage(chatId, text) {
  return telegramApi("sendMessage", {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
  }, { retry: false });
}

function tokenHash(value) {
  return crypto.createHash("sha256").update(cleanText(value)).digest("hex");
}

async function generateTelegramConnectLink(clientCode, slot = 1) {
  const { clients } = await getMergedClientsWithStatus();
  const client = clients.find((item) => item.code === cleanText(clientCode).toUpperCase() && !item.deletedAt);
  if (!client) throw new Error("Client tidak dijumpai.");
  const bot = await telegramApi("getMe");
  if (!bot?.username) throw new Error("Username Telegram bot tidak tersedia.");
  const rawToken = crypto.randomBytes(18).toString("base64url");
  const expiresAt = new Date(Date.now() + CONNECT_TOKEN_TTL_MS).toISOString();
  const targetSlot = recipientSlot(slot);
  await updateTelegramRecipient(client, targetSlot, {
    connectTokenHash: tokenHash(rawToken),
    connectTokenExpiresAt: expiresAt,
  });
  return {
    clientCode: client.code,
    recipientSlot: targetSlot,
    botUsername: bot.username,
    expiresAt,
    connectUrl: `https://t.me/${bot.username}?start=${rawToken}`,
  };
}

async function connectTelegramClient(startToken, chat, from = {}) {
  if (!startToken) throw new Error("Token sambungan Telegram tidak tersedia.");
  if (chat?.type !== "private") throw new Error("Sambungan ini hanya untuk Telegram peribadi client.");
  const hash = tokenHash(startToken);
  const { clients } = await getMergedClientsWithStatus();
  let match = null;
  for (const client of clients) {
    const recipient = telegramConfig(client).recipients.find((item) => (
      item.connectTokenHash === hash && new Date(item.connectTokenExpiresAt).getTime() > Date.now()
    ));
    if (recipient) {
      match = { client, recipient };
      break;
    }
  }
  if (!match) throw new Error("Link sambungan sudah tamat tempoh atau telah digunakan.");
  const { client, recipient } = match;
  const displayName = [from.first_name, from.last_name].filter(Boolean).join(" ").trim() || cleanText(chat.first_name);
  await updateTelegramRecipient(client, recipient.slot, {
    chatId: cleanText(chat.id),
    autoEnabled: true,
    username: cleanText(from.username || chat.username),
    displayName,
    linkedAt: new Date().toISOString(),
    connectTokenHash: "",
    connectTokenExpiresAt: "",
    lastError: "",
  });
  await sendTelegramMessage(chat.id, [
    `BuddyPilot sudah disambungkan untuk ${client.brandClient || client.name} (Penerima ${recipient.slot}).`,
    "Daily Meta Ads Report akan dihantar antara 6:00–6:59 pagi (waktu Malaysia).",
  ].join("\n"));
  await recordActivity({
    type: "telegram_connected",
    title: `Telegram connected: ${client.brandClient || client.name}`,
    description: `Penerima ${recipient.slot}: ${displayName || cleanText(from.username) || "Client Telegram connected"}`,
    entityType: "client",
    entityId: client.code,
  });
  return { clientCode: client.code, clientName: client.brandClient || client.name, recipientSlot: recipient.slot };
}

function number(value, digits = 2) {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) ? numeric.toLocaleString("en-MY", { maximumFractionDigits: digits }) : "0";
}

function money(value, currency) {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: currency || "MYR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function cost(spend, result, currency) {
  return Number(result || 0) > 0 ? money(Number(spend || 0) / Number(result), currency) : "N/A";
}

function reportSection(label, metrics, currency) {
  return [
    label,
    `Spend: ${money(metrics.spend, currency)}`,
    `Conversations: ${number(metrics.messaging, 0)} | Cost: ${cost(metrics.spend, metrics.messaging, currency)}`,
    `Leads: ${number(metrics.leads, 0)} | CPL: ${cost(metrics.spend, metrics.leads, currency)}`,
    `CPM: ${metrics.cpm == null ? "N/A" : money(metrics.cpm, currency)} | CPC: ${metrics.cpc == null ? "N/A" : money(metrics.cpc, currency)}`,
    `Impressions: ${number(metrics.impressions, 0)} | Reach: ${number(metrics.reach, 0)}`,
    `Frequency: ${metrics.frequency == null ? "N/A" : number(metrics.frequency)} | Clicks: ${number(metrics.clicks, 0)}`,
  ].join("\n");
}

function tikTokLeadSection(metrics, currency) {
  return [
    "TOP - PROSPECTING LEAD GEN",
    `Spend: ${money(metrics.spend, currency)}`,
    `Form submissions / Leads: ${number(metrics.leads, 0)} | CPL: ${cost(metrics.spend, metrics.leads, currency)}`,
    `CPM: ${metrics.cpm == null ? "N/A" : money(metrics.cpm, currency)} | CPC: ${metrics.cpc == null ? "N/A" : money(metrics.cpc, currency)}`,
    `Impressions: ${number(metrics.impressions, 0)} | Reach: ${number(metrics.reach, 0)}`,
    `Frequency: ${metrics.frequency == null ? "N/A" : number(metrics.frequency)} | Clicks: ${number(metrics.clicks, 0)}`,
  ].join("\n");
}

function tikTokRetargetingSection(metrics, currency) {
  return [
    "MID + BOT - RETARGETING TRAFFIC WHATSAPP",
    `Spend: ${money(metrics.spend, currency)}`,
    `CPM: ${metrics.cpm == null ? "N/A" : money(metrics.cpm, currency)} | CPC: ${metrics.cpc == null ? "N/A" : money(metrics.cpc, currency)}`,
    `Impressions: ${number(metrics.impressions, 0)} | Reach: ${number(metrics.reach, 0)}`,
    `Frequency: ${metrics.frequency == null ? "N/A" : number(metrics.frequency)} | Clicks: ${number(metrics.clicks, 0)}`,
  ].join("\n");
}

function buildDailyTelegramMessage(client, analytics, reportDate) {
  const adsConfig = normalizeAdsReportConfig(client.metadata?.adsReportConfig || {});
  const reportAnalytics = analytics || aggregateAdflowDailyRaw({ account: null, campaigns: [] }, adsConfig);
  const currency = reportAnalytics.currency || "MYR";
  const dateLabel = new Intl.DateTimeFormat("en-MY", {
    timeZone: "Asia/Kuala_Lumpur",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${reportDate}T12:00:00+08:00`));
  const platform = adsConfig.platform;
  const sections = [
    `DAILY ${platform === "tiktok" ? "TIKTOK" : "META"} ADS REPORT\n${client.brandClient || client.name}\nCompleted yesterday: ${dateLabel}`,
  ];
  if (platform === "tiktok") {
    sections.push(tikTokLeadSection(reportAnalytics.categories.prospecting, currency));
    sections.push(tikTokRetargetingSection(reportAnalytics.categories.retargeting, currency));
  } else {
    sections.push(reportSection("OVERALL", reportAnalytics.total, currency));
    sections.push(reportSection("PROSPECTING", reportAnalytics.categories.prospecting, currency));
    sections.push(reportSection("RETARGETING", reportAnalytics.categories.retargeting, currency));
  }
  if (reportAnalytics.categories.other.spend > 0) {
    sections.push(reportSection("OTHER / UNMAPPED", reportAnalytics.categories.other, currency));
  }
  return sections.join("\n\n");
}

function yesterdayDate(now = new Date()) {
  return presetDateRange("yesterday", now).startDate;
}

function deliveryClientCode(clientCode, slot) {
  return recipientSlot(slot) === 1 ? cleanText(clientCode).toUpperCase() : `${cleanText(clientCode).toUpperCase()}#TG2`;
}

async function deliverClientDailyReport({ client, recipientSlot: slot = 1, reportDate, raw, analytics: suppliedAnalytics, force = false }) {
  const recipient = telegramRecipient(client, slot);
  if (!recipient.chatId) throw new Error(`Telegram Penerima ${recipient.slot} belum connected.`);
  const deliveryCode = deliveryClientCode(client.code, recipient.slot);
  const claim = await claimDailyReportDelivery({ clientCode: deliveryCode, reportDate, force });
  if (!claim.claimed) return { clientCode: client.code, recipientSlot: recipient.slot, status: "skipped", reason: claim.reason || "duplicate" };
  try {
    const adsConfig = normalizeAdsReportConfig(client.metadata?.adsReportConfig || {});
    const analytics = suppliedAnalytics || aggregateAdflowDailyRaw(raw, adsConfig);
    const message = buildDailyTelegramMessage(client, analytics, reportDate);
    const sent = await sendTelegramMessage(recipient.chatId, message);
    const sentAt = new Date().toISOString();
    await finishDailyReportDelivery({
      clientCode: deliveryCode,
      reportDate,
      status: "sent",
      messageId: sent.message_id,
      metadata: { accountId: adsConfig.accountId, platform: adsConfig.platform, currency: analytics.currency, clientCode: client.code, recipientSlot: recipient.slot },
    });
    await updateTelegramRecipient(client, recipient.slot, { lastSentAt: sentAt, lastSentDate: reportDate, lastError: "" });
    await recordActivity({
      type: "telegram_daily_report_sent",
      title: `Daily ads report sent: ${client.brandClient || client.name}`,
      description: `${reportDate} · Penerima ${recipient.slot}`,
      entityType: "client",
      entityId: client.code,
      metadata: { reportDate, telegramMessageId: sent.message_id, recipientSlot: recipient.slot },
    });
    await reportOperationalSuccess({
      fingerprint: `telegram-delivery:${deliveryCode}:${reportDate}`,
      serviceName: "telegram",
      detail: "Telegram Bot berjaya menghantar daily report.",
      metadata: { clientCode: client.code, recipientSlot: recipient.slot, reportDate },
    });
    return { clientCode: client.code, recipientSlot: recipient.slot, status: "sent", messageId: sent.message_id };
  } catch (error) {
    const message = error?.message || String(error);
    await finishDailyReportDelivery({ clientCode: deliveryCode, reportDate, status: "failed", error: message, metadata: { clientCode: client.code, recipientSlot: recipient.slot } });
    await updateTelegramRecipient(client, recipient.slot, { lastError: message });
    await recordActivity({
      type: "telegram_daily_report_failed",
      title: `Daily ads report failed: ${client.brandClient || client.name}`,
      description: `Penerima ${recipient.slot}: ${message}`,
      entityType: "client",
      entityId: client.code,
      metadata: { reportDate, recipientSlot: recipient.slot },
    });
    await reportOperationalFailure({
      fingerprint: `telegram-delivery:${deliveryCode}:${reportDate}`,
      serviceName: "telegram",
      entityType: "client",
      entityId: client.code,
      clientCode: client.code,
      title: `Telegram report gagal · ${client.brandClient || client.name}`,
      detail: message,
      action: { kind: "telegram", label: "Resend", clientCode: client.code, recipientSlot: recipient.slot, tab: "clientpilot" },
      metadata: { reportDate, recipientSlot: recipient.slot },
    });
    return { clientCode: client.code, recipientSlot: recipient.slot, status: "failed", error: message };
  }
}

async function sendYesterdayReport(clientCode, { force = true, now = new Date(), recipientSlot: slot = 1 } = {}) {
  const { clients } = await getMergedClientsWithStatus();
  const client = clients.find((item) => item.code === cleanText(clientCode).toUpperCase() && !item.deletedAt && item.serviceStatus !== "paused");
  if (!client) throw new Error("Client tidak dijumpai atau tidak aktif.");
  const adsConfig = normalizeAdsReportConfig(client.metadata?.adsReportConfig || {});
  if (!adsConfig.accountId) throw new Error(`${adsConfig.platform === "tiktok" ? "TikTok advertiser" : "AdFlow ad account"} belum dipadankan.`);
  const reportDate = yesterdayDate(now);
  if (adsConfig.platform === "tiktok") {
    const analytics = await fetchTikTokDailyReport(adsConfig, reportDate);
    return deliverClientDailyReport({ client, recipientSlot: slot, reportDate, analytics, force });
  }
  const raw = await fetchAdflowDailyRaw(adsConfig.accountId, reportDate);
  return deliverClientDailyReport({ client, recipientSlot: slot, reportDate, raw, force });
}

async function runDailyAdsReports(now = new Date()) {
  const reportDate = yesterdayDate(now);
  const { clients } = await getMergedClientsWithStatus();
  const eligible = clients.filter((client) => {
    const telegram = telegramConfig(client);
    const ads = normalizeAdsReportConfig(client.metadata?.adsReportConfig || {});
    return !client.deletedAt && client.serviceStatus !== "paused" && telegram.recipients.some((item) => item.autoEnabled && item.chatId) && ads.accountId;
  });
  const sourceKeys = [...new Set(eligible.map((client) => {
    const config = normalizeAdsReportConfig(client.metadata?.adsReportConfig || {});
    return `${config.platform}:${config.accountId}`;
  }))];
  const rawEntries = await Promise.all(sourceKeys.map(async (sourceKey) => {
    const [platform, accountId] = sourceKey.split(":");
    try {
      if (platform === "tiktok") {
        const client = eligible.find((item) => {
          const config = normalizeAdsReportConfig(item.metadata?.adsReportConfig || {});
          return config.platform === platform && config.accountId === accountId;
        });
        const config = normalizeAdsReportConfig(client.metadata?.adsReportConfig || {});
        return [sourceKey, { ok: true, analytics: await fetchTikTokDailyReport(config, reportDate) }];
      }
      return [sourceKey, { ok: true, raw: await fetchAdflowDailyRaw(accountId, reportDate) }];
    } catch (error) {
      return [sourceKey, { ok: false, error: error?.message || String(error) }];
    }
  }));
  const rawByAccount = new Map(rawEntries);
  const eligibleRecipientCount = eligible.reduce((total, client) => (
    total + telegramConfig(client).recipients.filter((item) => item.autoEnabled && item.chatId).length
  ), 0);
  const groupedResults = await Promise.all(eligible.map(async (client) => {
    const config = normalizeAdsReportConfig(client.metadata?.adsReportConfig || {});
    const source = rawByAccount.get(`${config.platform}:${config.accountId}`);
    const clientResults = [];
    for (const recipient of telegramConfig(client).recipients.filter((item) => item.autoEnabled && item.chatId)) {
      if (!source?.ok) {
        const deliveryCode = deliveryClientCode(client.code, recipient.slot);
        const claim = await claimDailyReportDelivery({ clientCode: deliveryCode, reportDate });
        if (!claim.claimed) {
          clientResults.push({ clientCode: client.code, recipientSlot: recipient.slot, status: "skipped", reason: claim.reason });
          continue;
        }
        const message = source?.error || "AdFlow data gagal dimuat.";
        await finishDailyReportDelivery({ clientCode: deliveryCode, reportDate, status: "failed", error: message, metadata: { clientCode: client.code, recipientSlot: recipient.slot } });
        await updateTelegramRecipient(client, recipient.slot, { lastError: message });
        clientResults.push({ clientCode: client.code, recipientSlot: recipient.slot, status: "failed", error: message });
        continue;
      }
      clientResults.push(await deliverClientDailyReport({ client, recipientSlot: recipient.slot, reportDate, raw: source.raw, analytics: source.analytics, force: false }));
    }
    return clientResults;
  }));
  const results = groupedResults.flat();
  return {
    reportDate,
    eligible: eligibleRecipientCount,
    sent: results.filter((item) => item.status === "sent").length,
    failed: results.filter((item) => item.status === "failed").length,
    skipped: results.filter((item) => item.status === "skipped").length,
    results,
  };
}

async function setTelegramAutoEnabled(clientCode, enabled, slot = 1) {
  const { clients } = await getMergedClientsWithStatus();
  const client = clients.find((item) => item.code === cleanText(clientCode).toUpperCase() && !item.deletedAt);
  if (!client) throw new Error("Client tidak dijumpai.");
  const current = telegramRecipient(client, slot);
  if (enabled && !current.chatId) throw new Error(`Connect Telegram Penerima ${current.slot} dahulu.`);
  const saved = await updateTelegramRecipient(client, current.slot, { autoEnabled: Boolean(enabled) });
  return telegramConfig(saved.client);
}

async function disconnectTelegram(clientCode, slot = 1) {
  const { clients } = await getMergedClientsWithStatus();
  const client = clients.find((item) => item.code === cleanText(clientCode).toUpperCase() && !item.deletedAt);
  if (!client) throw new Error("Client tidak dijumpai.");
  const current = telegramRecipient(client, slot);
  await updateTelegramRecipient(client, current.slot, {
    chatId: "",
    autoEnabled: false,
    username: "",
    displayName: "",
    linkedAt: "",
    connectTokenHash: "",
    connectTokenExpiresAt: "",
    lastError: "",
  });
  return { disconnected: true, recipientSlot: current.slot };
}

async function sendTelegramTest(clientCode, slot = 1) {
  const { clients } = await getMergedClientsWithStatus();
  const client = clients.find((item) => item.code === cleanText(clientCode).toUpperCase() && !item.deletedAt);
  if (!client) throw new Error("Client tidak dijumpai.");
  const recipient = telegramRecipient(client, slot);
  if (!recipient.chatId) throw new Error(`Telegram Penerima ${recipient.slot} belum connected.`);
  const sent = await sendTelegramMessage(recipient.chatId, `BuddyPilot test berjaya untuk ${client.brandClient || client.name} (Penerima ${recipient.slot}).`);
  return { sent: true, recipientSlot: recipient.slot, messageId: sent.message_id };
}

module.exports = {
  buildDailyTelegramMessage,
  connectTelegramClient,
  disconnectTelegram,
  generateTelegramConnectLink,
  runDailyAdsReports,
  sendTelegramTest,
  sendYesterdayReport,
  setTelegramAutoEnabled,
  telegramApi,
  telegramConfig,
  yesterdayDate,
};
