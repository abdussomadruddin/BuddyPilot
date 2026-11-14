const test = require("node:test");
const assert = require("node:assert/strict");
const { buildPaymentList, cancelStopMonthInvoices, restoreStopMonthInvoices } = require("../lib/invoice-payments");
const { composeQueue } = require("../lib/whatsapp-queue");
const { composeTodo } = require("../lib/today-todo");
const { composeMonthlySummary } = require("../lib/monthly-summary");

const now = new Date("2026-11-20T04:00:00Z");

// A tiny invoice_uploads table that answers the two query shapes used here.
function fakeTable(rows) {
  const patches = [];
  const request = async (path, options = {}) => {
    if (options.method === "PATCH") {
      const number = decodeURIComponent(path.match(/invoice_number=eq\.([^&]+)/)[1]);
      const row = rows.find((item) => item.invoice_number === number);
      Object.assign(row, options.body);
      patches.push(number);
      return [];
    }
    const code = decodeURIComponent(path.match(/client_code=eq\.([^&]+)/)[1]);
    const period = path.match(/period=eq\.([^&]+)/)[1];
    const onlyInvoices = path.includes("invoice_number=like.INV-*");
    return rows.filter((row) => row.client_code === code && row.period === period && (!onlyInvoices || row.invoice_number.startsWith("INV-")));
  };
  return { rows, patches, request };
}

const inv = (code, period, extra = {}) => ({ invoice_number: `INV-${period.replace("-", "")}-${code}`, client_code: code, client_name: code, period, invoice_date: `${period}-01`, total: 1500, currency: "MYR", drive_file_url: `https://drive.example/${code}`, metadata: {}, ...extra });

test("Stop Service cancels this month's unpaid invoice; Recover in the same month restores it", async () => {
  const table = fakeTable([inv("ACME", "2026-11", { metadata: { note: "keep me" } }), inv("ACME", "2026-10")]);
  const stopped = await cancelStopMonthInvoices({ clientCode: "acme", now, request: table.request });
  assert.equal(stopped.period, "2026-11");
  assert.deepEqual(stopped.cancelled.map((item) => item.invoiceNumber), ["INV-202611-ACME"]);
  assert.deepEqual(table.patches, ["INV-202611-ACME"], "last month's debt is untouched");
  assert.equal(table.rows[0].metadata.payment.status, "cancelled");
  assert.equal(table.rows[0].metadata.note, "keep me", "other metadata survives");

  const again = await cancelStopMonthInvoices({ clientCode: "ACME", now, request: table.request });
  assert.deepEqual(again.cancelled, [], "pressing Stop twice changes nothing");

  const recovered = await restoreStopMonthInvoices({ clientCode: "ACME", now, request: table.request });
  assert.deepEqual(recovered.restored, ["INV-202611-ACME"]);
  assert.equal(table.rows[0].metadata.payment.status, undefined, "back to unpaid, as before the stop");
  assert.equal(buildPaymentList(table.rows, { now }).invoices.find((item) => item.period === "2026-11").status, "overdue");
});

test("an invoice already paid, or with a receipt, is never cancelled", async () => {
  const paid = fakeTable([inv("PAID", "2026-11", { metadata: { payment: { status: "paid", paidAt: "2026-11-05T00:00:00Z" } } })]);
  const result = await cancelStopMonthInvoices({ clientCode: "PAID", now, request: paid.request });
  assert.deepEqual([result.cancelled, result.kept], [[], ["INV-202611-PAID"]]);
  const receipted = fakeTable([inv("REC", "2026-11"), { invoice_number: "REC-202611-REC", client_code: "REC", period: "2026-11" }]);
  assert.deepEqual((await cancelStopMonthInvoices({ clientCode: "REC", now, request: receipted.request })).kept, ["INV-202611-REC"]);
  assert.deepEqual(receipted.patches, []);
});

test("a cancelled invoice leaves overdue counts, reminders and the monthly summary", () => {
  const cancelled = inv("STOP", "2026-11", { metadata: { payment: { status: "cancelled", reason: "service_stopped", cancelledAt: "2026-11-12T00:00:00Z" } } });
  const rows = [cancelled, inv("LATE", "2026-11")];
  const list = buildPaymentList(rows, { now });
  assert.equal(list.invoices.find((item) => item.clientCode === "STOP").status, "cancelled");
  assert.deepEqual([list.summary.unpaidCount, list.summary.overdueCount, list.summary.unpaidTotal, list.summary.cancelledCount], [1, 1, 1500, 1]);

  const clients = [{ code: "STOP", brandClient: "Stop", phone: "+601", serviceStatus: "paused" }, { code: "LATE", brandClient: "Late", phone: "+602", serviceStatus: "active" }];
  assert.deepEqual(composeQueue({ clients, uploads: rows, activities: [], type: "reminder", now }).items.map((item) => item.clientCode), ["LATE"]);

  const summary = composeMonthlySummary(rows, { now });
  assert.deepEqual([summary.current.invoiced, summary.current.outstanding, summary.current.invoiceCount], [1500, 1500, 1]);
  assert.deepEqual(summary.lateClients.map((entry) => entry.clientCode), ["LATE"]);
});

test("the Today list hides tasks of a stopped client", () => {
  const clients = [{ code: "STOP", serviceStatus: "paused" }, { code: "GO", serviceStatus: "active", agencyStatus: "active", phone: "+60" }];
  const tasks = [
    { id: "1", title: "Tukar creative STOP", due_date: "2026-11-19", status: "todo", client_code: "STOP" },
    { id: "2", title: "Semak budget GO", due_date: "2026-11-20", status: "todo", client_code: "GO" },
    { id: "3", title: "Admin", due_date: "2026-11-20", status: "todo", client_code: "" },
  ];
  const entry = composeTodo({ clients, tasks, now }).items.find((item) => item.id === "tasks:due");
  assert.equal(entry.count, 2);
  assert.doesNotMatch(entry.detail, /STOP/);
});
