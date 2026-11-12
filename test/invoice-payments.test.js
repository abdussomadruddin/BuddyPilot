const test = require("node:test");
const assert = require("node:assert/strict");
const { buildPaymentList, earliestPeriod, listInvoicePayments, setInvoicePayment } = require("../lib/invoice-payments");

const now = new Date("2026-11-12T04:00:00Z"); // 12 Nov 2026, Kuala Lumpur

const rows = [
  { invoice_number: "INV-202611-ACME", period: "2026-11", client_code: "ACME", client_name: "Acme", invoice_date: "2026-11-01", total: 1500, currency: "MYR", metadata: {} },
  { invoice_number: "INV-202611-BETA", period: "2026-11", client_code: "BETA", client_name: "Beta", invoice_date: "2026-11-08", total: 800, metadata: {} },
  { invoice_number: "INV-202611-GAMMA", period: "2026-11", client_code: "GAMMA", client_name: "Gamma", invoice_date: "2026-11-01", total: 900, metadata: { payment: { status: "paid", paidAt: "2026-11-03T02:00:00Z" } } },
  { invoice_number: "INV-202610-DELTA", period: "2026-10", client_code: "DELTA", client_name: "Delta", invoice_date: "2026-10-01", total: 700, metadata: {} },
  { invoice_number: "REC-202610-DELTA", period: "2026-10", client_code: "DELTA", client_name: "Delta", total: 700, drive_file_url: "https://drive.example/rec", created_at: "2026-10-05T03:00:00Z" },
];

test("payment status: marked paid or receipted counts as paid; unpaid past seven days is overdue", () => {
  const result = buildPaymentList(rows, { now });
  const byNumber = Object.fromEntries(result.invoices.map((item) => [item.invoiceNumber, item]));
  assert.equal(byNumber["INV-202611-ACME"].status, "overdue");
  assert.equal(byNumber["INV-202611-ACME"].daysOutstanding, 11);
  assert.equal(byNumber["INV-202611-BETA"].status, "unpaid");
  assert.equal(byNumber["INV-202611-BETA"].daysOutstanding, 4);
  assert.equal(byNumber["INV-202611-GAMMA"].status, "paid");
  assert.equal(byNumber["INV-202611-GAMMA"].receiptNumber, "");
  assert.equal(byNumber["INV-202610-DELTA"].status, "paid");
  assert.equal(byNumber["INV-202610-DELTA"].receiptNumber, "REC-202610-DELTA");
  assert.equal(result.invoices.length, 4, "receipts are not listed as invoices");
  assert.deepEqual(result.invoices.map((item) => item.status), ["overdue", "unpaid", "paid", "paid"]);
  assert.deepEqual(result.summary, { unpaidCount: 2, overdueCount: 1, unpaidTotal: 2300, paidWithoutReceipt: 1 });
});

test("the payment window counts back whole months in Kuala Lumpur time", () => {
  assert.equal(earliestPeriod(now, 3), "2026-09");
  assert.equal(earliestPeriod(new Date("2026-01-31T20:00:00Z"), 3), "2025-12");
});

test("listing reads only the recent window", async () => {
  const urls = [];
  const result = await listInvoicePayments({ now, request: async (url) => { urls.push(url); return rows; } });
  assert.match(urls[0], /period=gte\.2026-09/);
  assert.equal(result.summary.overdueCount, 1);
});

test("marking paid keeps existing metadata and records activity; unknown invoices are refused", async () => {
  const calls = [];
  const activity = [];
  const request = async (url, options) => {
    calls.push({ url, options });
    if (!options) return [{ invoice_number: "INV-202611-ACME", client_code: "acme", client_name: "Acme", period: "2026-11", total: 1500, metadata: { terms: "Net 7" } }];
    return [];
  };
  const result = await setInvoicePayment({ invoiceNumber: "inv-202611-acme", paid: true, now, request, record: async (item) => activity.push(item) });
  assert.equal(result.payment.status, "paid");
  assert.equal(calls[1].options.method, "PATCH");
  assert.deepEqual(calls[1].options.body.metadata, { terms: "Net 7", payment: { status: "paid", paidAt: now.toISOString() } });
  assert.equal(activity[0].type, "invoice_paid");
  await assert.rejects(setInvoicePayment({ invoiceNumber: "INV-1", paid: true, request: async () => [], record: async () => {} }), /belum di-upload/);
  await assert.rejects(setInvoicePayment({ invoiceNumber: "drop table", paid: true, request, record: async () => {} }), /tidak sah/);
});

test("re-uploading an invoice keeps its payment status", async (t) => {
  const previous = { url: process.env.SUPABASE_URL, key: process.env.SUPABASE_SERVICE_ROLE_KEY, fetch: global.fetch };
  process.env.SUPABASE_URL = "https://fixture.invalid";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "fixture-only";
  const requests = [];
  global.fetch = async (url, options = {}) => {
    requests.push({ url: String(url), method: options.method || "GET", body: options.body ? JSON.parse(options.body) : null });
    const rows = String(url).includes("select=metadata") ? [{ metadata: { payment: { status: "paid", paidAt: "2026-11-03T02:00:00Z" } } }] : [{}];
    return { ok: true, status: 200, json: async () => rows, text: async () => JSON.stringify(rows) };
  };
  t.after(() => {
    global.fetch = previous.fetch;
    if (previous.url === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = previous.url;
    if (previous.key === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = previous.key;
  });
  const { recordSupabaseInvoiceUpload } = require("../lib/supabase-db");
  await recordSupabaseInvoiceUpload({
    invoice: { invoiceNumber: "INV-202611-ACME", period: "2026-11", client: { code: "ACME", name: "Acme", billingName: "Acme Sdn Bhd" }, invoiceDate: "2026-11-01", subtotal: 1500, discount: 0, total: 1500, currency: "MYR", fileName: "a.pdf", terms: "Net 7" },
    upload: { id: "file", webViewLink: "https://drive.example/a" },
    replaced: true,
  });
  const upsert = requests.find((item) => item.method === "POST" && item.url.includes("invoice_uploads?on_conflict"));
  assert.deepEqual(upsert.body[0].metadata.payment, { status: "paid", paidAt: "2026-11-03T02:00:00Z" });
  assert.equal(upsert.body[0].metadata.terms, "Net 7");
});
