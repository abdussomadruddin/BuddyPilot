// Owner's monthly summary: what was invoiced, collected and is still owed per
// month, plus the clients who pay late. Built only from invoice_uploads rows.
const { buildPaymentList, earliestPeriod, OVERDUE_DAYS } = require("./invoice-payments");

const DAY_MS = 86400000;
const round = (value) => Math.round((Number(value) || 0) * 100) / 100;

function daysToPay(invoice) {
  const issued = Date.parse(`${invoice.invoiceDate}T00:00:00Z`);
  const paid = Date.parse(invoice.paidAt || "");
  if (!Number.isFinite(issued) || !Number.isFinite(paid)) return null;
  return Math.max(0, Math.round((paid - issued) / DAY_MS));
}

// Pure.
function composeMonthlySummary(rows = [], { now = new Date(), months = 6 } = {}) {
  const { invoices } = buildPaymentList(rows, { now });
  const first = earliestPeriod(now, months);
  const periods = [];
  for (let [year, month] = first.split("-").map(Number), index = 0; index < months; index += 1) {
    periods.push(`${year}-${String(month).padStart(2, "0")}`);
    month += 1;
    if (month > 12) { month = 1; year += 1; }
  }
  const byPeriod = new Map(periods.map((period) => [period, { period, invoiced: 0, collected: 0, outstanding: 0, invoiceCount: 0, paidCount: 0 }]));
  const clients = new Map();
  for (const invoice of invoices) {
    const month = byPeriod.get(invoice.period);
    if (!month || invoice.status === "cancelled") continue;
    const paid = invoice.status === "paid";
    month.invoiced += invoice.total;
    month.invoiceCount += 1;
    if (paid) { month.collected += invoice.total; month.paidCount += 1; } else month.outstanding += invoice.total;
    const days = paid ? daysToPay(invoice) : invoice.daysOutstanding;
    const late = paid ? days != null && days > OVERDUE_DAYS : invoice.status === "overdue";
    const entry = clients.get(invoice.clientCode) || { clientCode: invoice.clientCode, clientName: invoice.clientName, invoices: 0, lateCount: 0, outstanding: 0 };
    entry.invoices += 1;
    if (late) entry.lateCount += 1;
    if (!paid) entry.outstanding += invoice.total;
    clients.set(invoice.clientCode, entry);
  }
  const list = [...byPeriod.values()].map((month) => ({ ...month, invoiced: round(month.invoiced), collected: round(month.collected), outstanding: round(month.outstanding) }));
  const lateClients = [...clients.values()]
    .filter((entry) => entry.lateCount > 0 || entry.outstanding > 0)
    .map((entry) => ({ ...entry, outstanding: round(entry.outstanding) }))
    .sort((a, b) => b.lateCount - a.lateCount || b.outstanding - a.outstanding || a.clientName.localeCompare(b.clientName));
  return {
    current: list[list.length - 1],
    months: list,
    lateClients,
    totalOutstanding: round(list.reduce((sum, month) => sum + month.outstanding, 0)),
    overdueDays: OVERDUE_DAYS,
  };
}

async function loadMonthlySummary({ now = new Date(), months = 6, request } = {}) {
  const run = request || require("./supabase-db").supabaseRequest;
  const fields = "invoice_number,period,client_code,client_name,invoice_date,total,currency,drive_file_url,metadata,created_at";
  const rows = await run(`invoice_uploads?select=${fields}&period=gte.${encodeURIComponent(earliestPeriod(now, months))}&order=period.desc&limit=2000`) || [];
  return composeMonthlySummary(rows, { now, months });
}

module.exports = { composeMonthlySummary, loadMonthlySummary };
