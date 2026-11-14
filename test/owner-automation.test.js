const test = require("node:test");
const assert = require("node:assert/strict");
const { alertCulprit } = require("../lib/ads-alerts");
const { ensureReceiptForPayment } = require("../lib/invoice-payments");
const { composeMonthlySummary } = require("../lib/monthly-summary");

test("marking paid makes the receipt once, and a failure does not throw", async () => {
  const calls = [];
  const created = await ensureReceiptForPayment({ clientCode: "ACME", period: "2026-11" }, {
    find: async (query) => { calls.push(query.prefix); return null; },
    upload: async ({ period, drafts }) => [{ invoiceNumber: `REC-${period.replace("-", "")}-${drafts[0].clientCode}`, webViewLink: "https://drive.example/rec" }],
  });
  assert.deepEqual(created, { status: "created", receiptNumber: "REC-202611-ACME", receiptUrl: "https://drive.example/rec" });
  assert.deepEqual(calls, ["REC-202611-"]);

  const exists = await ensureReceiptForPayment({ clientCode: "ACME", period: "2026-11" }, {
    find: async () => ({ invoice_number: "REC-202611-ACME", drive_file_url: "https://drive.example/old" }),
    upload: async () => { throw new Error("must not upload twice"); },
  });
  assert.equal(exists.status, "exists");

  const failed = await ensureReceiptForPayment({ clientCode: "ACME", period: "2026-11" }, { find: async () => null, upload: async () => { throw new Error("Drive offline"); } });
  assert.deepEqual(failed, { status: "failed", error: "Drive offline" });
  const skipped = await ensureReceiptForPayment({ clientCode: "ACME", period: "2026-11" }, { find: async () => null, upload: async () => [] });
  assert.equal(skipped.status, "skipped");
});

test("an alert names the campaign behind it", () => {
  const campaigns = [
    { id: "1", name: "[Meta] Prospecting", spend: 120, results: 12 },
    { id: "2", name: "[Meta] Retargeting", spend: 200, results: 0 },
    { id: "3", name: "[TikTok] Spark", spend: 90, results: 2, revenue: 60 },
  ];
  const cost = alertCulprit("cost_per_result", campaigns, { maxCostPerResult: 20 }, { resultMetric: "leads" });
  assert.equal(cost.campaignName, "[Meta] Retargeting");
  assert.match(cost.text, /^Punca utama: \[Meta\] Retargeting - RM\s?200\.00 spend, 0 lead\. Pause atau tukar creative/);
  assert.equal(alertCulprit("spend", campaigns, { maxDailySpend: 100 }).campaignId, "2");
  assert.equal(alertCulprit("roas", campaigns, { minRoas: 2 }).campaignId, "2");
  assert.equal(alertCulprit("cost_per_result", [{ id: "1", name: "Ok", spend: 100, results: 10 }], { maxCostPerResult: 20 }), null);
  assert.equal(alertCulprit("spend", [], { maxDailySpend: 1 }), null);
});

test("monthly summary: collected, outstanding and late payers", () => {
  const now = new Date("2026-11-20T04:00:00Z");
  const inv = (code, period, date, total, extra = {}) => ({ invoice_number: `INV-${period.replace("-", "")}-${code}`, client_code: code, client_name: code, period, invoice_date: date, total, ...extra });
  const rows = [
    inv("ACME", "2026-11", "2026-11-01", 1500, { metadata: { payment: { status: "paid", paidAt: "2026-11-03T02:00:00Z" } } }),
    inv("BETA", "2026-11", "2026-11-01", 1000),
    inv("BETA", "2026-10", "2026-10-01", 1000, { metadata: { payment: { status: "paid", paidAt: "2026-10-25T02:00:00Z" } } }),
    inv("OLD", "2025-01", "2025-01-01", 999),
  ];
  const summary = composeMonthlySummary(rows, { now, months: 6 });
  assert.deepEqual(summary.months.map((month) => month.period), ["2026-06", "2026-07", "2026-08", "2026-09", "2026-10", "2026-11"]);
  assert.deepEqual(summary.current, { period: "2026-11", invoiced: 2500, collected: 1500, outstanding: 1000, invoiceCount: 2, paidCount: 1 });
  assert.equal(summary.totalOutstanding, 1000);
  assert.deepEqual(summary.lateClients, [{ clientCode: "BETA", clientName: "BETA", invoices: 2, lateCount: 2, outstanding: 1000 }]);
});
