const DAY_MS = 86400000;

const COMPLETION_TYPES = new Set([
  "report_uploaded",
  "invoice_uploaded",
  "receipt_uploaded",
  "telegram_daily_report_sent",
  "client_created",
]);

function sameLocalDay(value, now = new Date()) {
  const date = new Date(value || "");
  return Number.isFinite(date.getTime())
    && date.toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" })
      === now.toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" });
}

function withinDays(value, days, now = new Date()) {
  const time = new Date(value || "").getTime();
  return Number.isFinite(time) && now.getTime() - time <= days * DAY_MS;
}

function action(id, title, detail, tone, tab, subtab = "", panel = "") {
  return { id, title, detail, tone, tab, subtab, panel };
}

function buildTodayDashboard({ clients = [], tiktok = {}, activities = [], now = new Date() } = {}) {
  const activeClients = clients.filter((client) => client.serviceStatus !== "paused" && client.onboardingStatus !== "in_progress");
  const setupClients = clients.filter((client) => client.serviceStatus !== "paused" && client.onboardingStatus === "in_progress");
  const tiktokExpiryMs = tiktok.expiresAt ? new Date(tiktok.expiresAt).getTime() - now.getTime() : Infinity;
  const tiktokDays = Number.isFinite(tiktokExpiryMs) ? Math.max(0, Math.ceil(tiktokExpiryMs / DAY_MS)) : null;
  const tiktokAttention = Boolean(tiktok.connected && tiktokDays !== null && tiktokDays <= 7);
  const reportRecentlySent = activities.some((item) => item.type === "report_uploaded" && withinDays(item.createdAt, 7, now));
  const currentMonth = now.toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur", year: "numeric", month: "2-digit" }).slice(0, 7);
  const invoiceThisMonth = activities.some((item) => item.type === "invoice_uploaded" && String(item.createdAt || "").slice(0, 7) === currentMonth);
  const dayOfMonth = Number(now.toLocaleDateString("en-US", { timeZone: "Asia/Kuala_Lumpur", day: "numeric" }));
  let nextAction;

  if (tiktokAttention) {
    nextAction = action("tiktok-expiry", "Reauthorize TikTok Ads", `Authorization tamat dalam ${tiktokDays} hari.`, "danger", "invoicepilot", "settings-panel", "tiktokAdsSettings");
  } else if (setupClients.length) {
    nextAction = action("client-onboarding", "Sambung onboarding client", `${setupClients.length} client masih dalam Setup.`, "warning", "clientpilot", "client-list-panel");
  } else if (activeClients.length && !reportRecentlySent) {
    nextAction = action("weekly-report", "Siapkan weekly report", `${activeClients.length} pelanggan aktif menunggu semakan minggu ini.`, "warning", "reportpilot");
  } else if (activeClients.length && dayOfMonth <= 7 && !invoiceThisMonth) {
    nextAction = action("monthly-invoice", "Sediakan invois bulan ini", `${activeClients.length} pelanggan aktif tersedia.`, "warning", "invoicepilot", "invoice-panel");
  } else {
    nextAction = action("all-clear", "Semua kerja utama selesai", "Tiada tindakan mendesak buat masa ini.", "ready", "dashboard");
  }

  const completedToday = activities.filter((item) => COMPLETION_TYPES.has(item.type) && sameLocalDay(item.createdAt, now)).length;
  const attention = Number(tiktokAttention) + Number(setupClients.length > 0);
  return {
    generatedAt: now.toISOString(),
    greetingDate: now.toLocaleDateString("ms-MY", { timeZone: "Asia/Kuala_Lumpur", weekday: "long", day: "numeric", month: "long" }),
    summary: { completedToday, inProgress: 0, attention },
    nextAction,
    clients: { total: clients.length, active: activeClients.length },
    tiktok: { status: tiktok.status || "disconnected", expiresAt: tiktok.expiresAt || "", remainingDays: tiktokDays },
    recentActivity: activities.slice(0, 5),
  };
}

module.exports = { buildTodayDashboard, sameLocalDay, withinDays };
