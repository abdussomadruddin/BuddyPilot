// WhatsApp send queue: which active clients still need this month's invoice,
// receipt, or this week's report sent. "Sent" means a client_whatsapp_opened
// activity exists, which the WhatsApp endpoint records; BuddyPilot never sends
// on its own, it only opens WhatsApp with the message ready.
const TYPES = ["invoice", "receipt", "report"];
const REPORT_WINDOW_DAYS = 7;
const DAY_MS = 86400000;

function clean(value) {
  return String(value ?? "").trim();
}

function activeClient(client) {
  const status = clean(client.agencyStatus).toLowerCase();
  return !client.deletedAt
    && !client.archivedAt
    && client.serviceStatus !== "paused"
    && client.onboardingStatus !== "in_progress"
    && !["paused", "completed", "archived", "onboarding"].includes(status);
}

// Pure: one queue entry per active client, in send order.
function composeQueue({ clients = [], uploads = [], activities = [], type, period, now = new Date() }) {
  if (!TYPES.includes(type)) throw Object.assign(new Error("Pilih Invoice, Resit atau Report."), { statusCode: 400 });
  const prefix = type === "invoice" ? "INV-" : "REC-";
  const documents = new Map();
  if (type === "report") {
    for (const item of activities) {
      if (item.type !== "report_uploaded") continue;
      if (now.getTime() - Date.parse(item.createdAt || "") > REPORT_WINDOW_DAYS * DAY_MS) continue;
      const code = clean(item.metadata?.clientCode).toUpperCase();
      if (code && !documents.has(code)) documents.set(code, clean(item.metadata?.documentUrl || item.metadata?.webViewLink));
    }
  } else {
    for (const row of uploads) {
      if (!clean(row.invoice_number).startsWith(prefix) || clean(row.period) !== period) continue;
      documents.set(clean(row.client_code).toUpperCase(), clean(row.drive_file_url));
    }
  }
  const sent = new Map();
  for (const item of activities) {
    if (item.type !== "client_whatsapp_opened" || item.metadata?.type !== type) continue;
    if (type === "report") {
      if (now.getTime() - Date.parse(item.createdAt || "") > REPORT_WINDOW_DAYS * DAY_MS) continue;
    } else if (clean(item.metadata?.period) !== period) {
      continue;
    }
    const code = clean(item.metadata?.clientCode || item.entityId).toUpperCase();
    if (code && !sent.has(code)) sent.set(code, item.createdAt || "");
  }
  const items = clients.filter(activeClient).map((client) => {
    const code = clean(client.code).toUpperCase();
    const hasDocument = documents.has(code);
    let status = "ready";
    if (sent.has(code)) status = "sent";
    else if (!clean(client.phone)) status = "no_phone";
    else if (!hasDocument) status = "no_document";
    return {
      clientCode: code,
      clientName: clean(client.brandClient || client.name) || code,
      contactName: clean(client.contactName),
      hasPhone: Boolean(clean(client.phone)),
      hasDocument,
      status,
      sentAt: sent.get(code) || "",
    };
  });
  const order = { ready: 0, no_document: 1, no_phone: 2, sent: 3 };
  items.sort((a, b) => order[a.status] - order[b.status] || a.clientName.localeCompare(b.clientName));
  return {
    type,
    period,
    items,
    summary: {
      total: items.length,
      ready: items.filter((item) => item.status === "ready").length,
      sent: items.filter((item) => item.status === "sent").length,
      blocked: items.filter((item) => item.status === "no_phone" || item.status === "no_document").length,
    },
  };
}

async function buildWhatsappQueue({ type, period, now = new Date(), deps } = {}) {
  const resolved = deps || defaultDeps();
  const since = new Date(now.getTime() - 62 * DAY_MS).toISOString();
  const [clients, uploads, activities] = await Promise.all([
    resolved.clients(),
    type === "report" ? [] : resolved.uploads(period),
    resolved.activities(["client_whatsapp_opened", "report_uploaded"], since),
  ]);
  return composeQueue({ clients, uploads, activities, type, period, now });
}

function defaultDeps() {
  const { getMergedClientsWithStatus } = require("./invoices");
  const { listActivityByTypes, supabaseRequest } = require("./supabase-db");
  return {
    clients: async () => (await getMergedClientsWithStatus()).clients || [],
    uploads: (period) => supabaseRequest(`invoice_uploads?select=invoice_number,client_code,period,drive_file_url&period=eq.${encodeURIComponent(period)}&limit=1000`).then((rows) => rows || []),
    activities: listActivityByTypes,
  };
}

module.exports = { TYPES, activeClient, buildWhatsappQueue, composeQueue };
