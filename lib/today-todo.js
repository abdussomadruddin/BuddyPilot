// "Perlu buat hari ini": one ranked list of the work waiting today, built from
// invoices, payments, the WhatsApp queues, ads alerts and agency tasks.
const { buildPaymentList } = require("./invoice-payments");
const { composeQueue, activeClient } = require("./whatsapp-queue");

const TIMEZONE = "Asia/Kuala_Lumpur";
const DAY_MS = 86400000;
const TONE_ORDER = { danger: 0, warning: 1, info: 2 };

function localParts(now) {
  const iso = now.toLocaleDateString("en-CA", { timeZone: TIMEZONE });
  const weekday = now.toLocaleDateString("en-US", { timeZone: TIMEZONE, weekday: "short" });
  return { iso, period: iso.slice(0, 7), day: Number(iso.slice(8, 10)), weekday };
}

function names(list, limit = 3) {
  const shown = list.slice(0, limit).join(", ");
  return list.length > limit ? `${shown} +${list.length - limit} lagi` : shown;
}

function item(id, tone, title, detail, action, count = 1) {
  return { id, tone, title, detail, action, count };
}

const NAV = {
  invoices: { type: "navigate", tab: "clientpilot", subtab: "client-invoice-panel", innerSubtab: "invoice-panel", label: "Buka Invoice" },
  receipts: { type: "navigate", tab: "clientpilot", subtab: "client-receipt-panel", label: "Buka Resit" },
  reports: { type: "navigate", tab: "clientpilot", subtab: "client-report-panel", label: "Buka Report" },
  clients: { type: "navigate", tab: "clientpilot", subtab: "client-list-panel", label: "Buka Client" },
  adscmo: { type: "navigate", tab: "adscmo", label: "Buka Ads CMO" },
  tiktok: { type: "navigate", tab: "clientpilot", subtab: "client-invoice-panel", innerSubtab: "settings-panel", label: "Reauthorize" },
};

// Pure: everything already fetched goes in, a sorted list comes out.
function composeTodo({ clients = [], uploads = [], paymentRows = [], activities = [], incidents = [], tasks = [], tiktok = {}, now = new Date() } = {}) {
  const today = localParts(now);
  const active = clients.filter(activeClient);
  const items = [];

  // Ads alerts that are still open.
  for (const incident of incidents.filter((row) => row.status !== "resolved" && (row.service_name === "ads_alerts" || String(row.fingerprint || "").startsWith("ads-alert:")))) {
    items.push(item(`alert:${incident.fingerprint}`, "danger", incident.title || "Amaran iklan", incident.detail || "", NAV.adscmo));
  }

  // Overdue payments, then paid invoices still missing a receipt.
  const payments = buildPaymentList(paymentRows, { now });
  const overdue = payments.invoices.filter((entry) => entry.status === "overdue");
  if (overdue.length) {
    items.push(item("payments:overdue", "danger", `${overdue.length} invoice lewat bayar`, names(overdue.map((entry) => `${entry.clientName} (${entry.daysOutstanding} hari)`)), { ...NAV.invoices, label: "Semak bayaran" }, overdue.length));
  }
  const needReceipt = payments.invoices.filter((entry) => entry.markedPaid && !entry.receiptNumber);
  if (needReceipt.length) {
    items.push(item("payments:receipt", "warning", `${needReceipt.length} bayaran belum ada resit`, names(needReceipt.map((entry) => entry.clientName)), { ...NAV.invoices, label: "Jana resit" }, needReceipt.length));
  }

  // This month's invoices not uploaded yet (first week of the month).
  const invoiced = new Set(uploads.filter((row) => String(row.invoice_number || "").startsWith("INV-") && row.period === today.period).map((row) => String(row.client_code || "").toUpperCase()));
  const notInvoiced = active.filter((client) => !invoiced.has(String(client.code || "").toUpperCase()));
  if (today.day <= 7 && active.length && notInvoiced.length) {
    items.push(item("invoices:upload", "warning", `Upload invoice ${today.period}`, `${notInvoiced.length} daripada ${active.length} client belum ada invoice bulan ini.`, NAV.invoices, notInvoiced.length));
  }

  // WhatsApp queues with someone ready to receive a document.
  for (const [type, label] of [["reminder", "reminder bayaran"], ["invoice", "invoice"], ["receipt", "resit"], ["report", "report"]]) {
    const queue = composeQueue({ clients, uploads: type === "reminder" ? paymentRows : uploads, activities, type, period: today.period, now });
    if (queue.summary.ready) {
      items.push(item(`whatsapp:${type}`, type === "reminder" ? "warning" : "info", `Hantar ${label} melalui WhatsApp`, `${queue.summary.ready} client sedia · ${queue.summary.sent} dah dihantar.`, { type: "whatsapp", queue: type, label: "Mula giliran" }, queue.summary.ready));
    }
  }

  // Weekly report: nothing uploaded in the last seven days.
  const reportRecently = activities.some((entry) => entry.type === "report_uploaded" && now.getTime() - Date.parse(entry.createdAt || "") <= 7 * DAY_MS);
  if (active.length && !reportRecently) {
    items.push(item("reports:weekly", today.weekday === "Mon" ? "warning" : "info", "Siapkan weekly report", `${active.length} client aktif belum ada report minggu ini.`, NAV.reports));
  }

  // Agency tasks due today or overdue.
  // A stopped client's tasks wait until the service is recovered.
  const stopped = new Set(clients.filter((client) => client.deletedAt || client.serviceStatus === "paused").map((client) => String(client.code || "").toUpperCase()));
  const due = tasks.filter((task) => ["todo", "in_progress"].includes(task.status) && task.due_date && task.due_date <= today.iso && !stopped.has(String(task.client_code || "").toUpperCase()));
  if (due.length) {
    const late = due.filter((task) => task.due_date < today.iso);
    items.push(item("tasks:due", late.length ? "danger" : "warning", `${due.length} tugasan agensi ${late.length ? `(${late.length} lewat)` : "hari ini"}`, names(due.map((task) => task.title)), { ...NAV.clients, subtab: "client-overview-panel", label: "Buka tugasan" }, due.length));
  }

  // Onboarding left half-way and TikTok authorization about to expire.
  const onboarding = clients.filter((client) => !client.deletedAt && client.onboardingStatus === "in_progress");
  if (onboarding.length) {
    items.push(item("clients:onboarding", "warning", "Sambung onboarding client", names(onboarding.map((client) => client.brandClient || client.name || client.code)), NAV.clients, onboarding.length));
  }
  const tiktokMs = tiktok.expiresAt ? Date.parse(tiktok.expiresAt) - now.getTime() : Infinity;
  if (tiktok.connected && Number.isFinite(tiktokMs) && tiktokMs <= 7 * DAY_MS) {
    items.push(item("tiktok:expiry", "danger", "Reauthorize TikTok Ads", `Kebenaran tamat dalam ${Math.max(0, Math.ceil(tiktokMs / DAY_MS))} hari.`, NAV.tiktok));
  }

  items.sort((a, b) => TONE_ORDER[a.tone] - TONE_ORDER[b.tone]);
  return {
    generatedAt: now.toISOString(),
    date: today.iso,
    items,
    summary: {
      total: items.length,
      urgent: items.filter((entry) => entry.tone === "danger").length,
      unpaidTotal: payments.summary.unpaidTotal,
    },
  };
}

module.exports = { composeTodo };
