// Invoice payment status. Stored on the invoice's own invoice_uploads row in
// metadata.payment, so no schema change is needed. An uploaded receipt for
// the same client and month also counts as paid.
const { recordActivity, supabaseRequest } = require("./supabase-db");

const OVERDUE_DAYS = 7;
const DAY_MS = 86400000;
const TIMEZONE = "Asia/Kuala_Lumpur";

function clean(value) {
  return String(value ?? "").trim();
}

function localDate(value) {
  const date = new Date(value || "");
  if (!Number.isFinite(date.getTime())) return "";
  return date.toLocaleDateString("en-CA", { timeZone: TIMEZONE });
}

function daysBetween(fromIso, toIso) {
  if (!fromIso || !toIso) return 0;
  return Math.max(0, Math.round((Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / DAY_MS));
}

function earliestPeriod(now, months) {
  const [year, month] = localDate(now).split("-").map(Number);
  const index = year * 12 + (month - 1) - (months - 1);
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
}

// Pure: turn invoice_uploads rows (INV and REC) into one entry per invoice.
function buildPaymentList(rows = [], { now = new Date(), overdueDays = OVERDUE_DAYS } = {}) {
  const today = localDate(now);
  const receipts = new Map();
  for (const row of rows) {
    if (!clean(row.invoice_number).startsWith("REC-")) continue;
    receipts.set(`${clean(row.client_code).toUpperCase()}|${clean(row.period)}`, row);
  }
  const invoices = rows
    .filter((row) => clean(row.invoice_number).startsWith("INV-"))
    .map((row) => {
      const clientCode = clean(row.client_code).toUpperCase();
      const receipt = receipts.get(`${clientCode}|${clean(row.period)}`) || null;
      const payment = row.metadata?.payment || {};
      const markedPaid = payment.status === "paid";
      const paid = markedPaid || Boolean(receipt);
      const issued = clean(row.invoice_date) || localDate(row.created_at);
      const daysOutstanding = paid ? 0 : daysBetween(issued, today);
      return {
        invoiceNumber: clean(row.invoice_number),
        clientCode,
        clientName: clean(row.client_name) || clientCode,
        period: clean(row.period),
        invoiceDate: issued,
        total: Number(row.total || 0),
        currency: clean(row.currency) || "MYR",
        invoiceUrl: clean(row.drive_file_url),
        status: paid ? "paid" : daysOutstanding > overdueDays ? "overdue" : "unpaid",
        markedPaid,
        paidAt: markedPaid ? clean(payment.paidAt) : localDate(receipt?.created_at) ? clean(receipt.created_at) : "",
        daysOutstanding,
        receiptNumber: receipt ? clean(receipt.invoice_number) : "",
        receiptUrl: receipt ? clean(receipt.drive_file_url) : "",
      };
    });
  const order = { overdue: 0, unpaid: 1, paid: 2 };
  invoices.sort((a, b) => order[a.status] - order[b.status] || b.daysOutstanding - a.daysOutstanding || b.period.localeCompare(a.period) || a.clientName.localeCompare(b.clientName));
  const open = invoices.filter((item) => item.status !== "paid");
  return {
    invoices,
    summary: {
      unpaidCount: open.length,
      overdueCount: open.filter((item) => item.status === "overdue").length,
      unpaidTotal: Math.round(open.reduce((sum, item) => sum + item.total, 0) * 100) / 100,
      paidWithoutReceipt: invoices.filter((item) => item.markedPaid && !item.receiptNumber).length,
    },
    overdueDays,
  };
}

async function listInvoicePayments({ months = 3, now = new Date(), request = supabaseRequest } = {}) {
  const fromPeriod = earliestPeriod(now, Math.min(Math.max(Number(months) || 3, 1), 12));
  const fields = "invoice_number,period,client_code,client_name,invoice_date,total,currency,drive_file_url,metadata,created_at";
  const rows = await request(`invoice_uploads?select=${fields}&period=gte.${encodeURIComponent(fromPeriod)}&order=period.desc&limit=1000`) || [];
  return { ...buildPaymentList(rows, { now }), fromPeriod };
}

async function setInvoicePayment({ invoiceNumber, paid, now = new Date(), request = supabaseRequest, record = recordActivity } = {}) {
  const number = clean(invoiceNumber).toUpperCase();
  if (!/^INV-[0-9A-Z-]+$/.test(number)) throw Object.assign(new Error("Nombor invoice tidak sah."), { statusCode: 400 });
  const rows = await request(`invoice_uploads?select=invoice_number,client_code,client_name,period,total,currency,metadata&invoice_number=eq.${encodeURIComponent(number)}&limit=1`);
  const row = rows?.[0];
  if (!row) throw Object.assign(new Error("Invoice belum di-upload; upload invoice dahulu."), { statusCode: 404 });
  const stamp = now.toISOString();
  const payment = paid ? { status: "paid", paidAt: stamp } : { status: "unpaid", clearedAt: stamp };
  await request(`invoice_uploads?invoice_number=eq.${encodeURIComponent(number)}`, {
    method: "PATCH",
    body: { metadata: { ...(row.metadata || {}), payment }, updated_at: stamp },
  });
  await record({
    type: paid ? "invoice_paid" : "invoice_payment_cleared",
    title: `${number} ${paid ? "ditanda dibayar" : "ditanda belum bayar"}`,
    description: `${row.client_name || row.client_code} - ${row.currency || "MYR"} ${Number(row.total || 0).toFixed(2)}`,
    entityType: "invoice",
    entityId: number,
    metadata: { clientCode: row.client_code, period: row.period, paid: Boolean(paid) },
  });
  return { invoiceNumber: number, clientCode: clean(row.client_code).toUpperCase(), period: clean(row.period), payment };
}

module.exports = { OVERDUE_DAYS, buildPaymentList, earliestPeriod, listInvoicePayments, setInvoicePayment };
