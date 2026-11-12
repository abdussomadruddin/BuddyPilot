const test = require("node:test");
const assert = require("node:assert/strict");
const { composeTodo } = require("../lib/today-todo");

const clients = [
  { code: "ACME", brandClient: "Acme", phone: "+60111", serviceStatus: "active", agencyStatus: "active" },
  { code: "BETA", brandClient: "Beta", phone: "+60122", serviceStatus: "active", agencyStatus: "active" },
  { code: "NEW", brandClient: "Baru", onboardingStatus: "in_progress" },
];

test("urgent work comes first: alerts, overdue payments, late tasks, expiring TikTok", () => {
  const now = new Date("2026-11-12T04:00:00Z"); // Thursday
  const todo = composeTodo({
    now,
    clients,
    uploads: [
      { invoice_number: "INV-202611-ACME", client_code: "ACME", period: "2026-11", invoice_date: "2026-11-01", client_name: "Acme", total: 1500, metadata: {} },
      { invoice_number: "INV-202611-BETA", client_code: "BETA", period: "2026-11", invoice_date: "2026-11-10", client_name: "Beta", total: 800, metadata: { payment: { status: "paid" } } },
    ],
    paymentRows: [
      { invoice_number: "INV-202611-ACME", client_code: "ACME", period: "2026-11", invoice_date: "2026-11-01", client_name: "Acme", total: 1500, metadata: {} },
      { invoice_number: "INV-202611-BETA", client_code: "BETA", period: "2026-11", invoice_date: "2026-11-10", client_name: "Beta", total: 800, metadata: { payment: { status: "paid" } } },
    ],
    activities: [{ type: "report_uploaded", createdAt: "2026-11-11T01:00:00Z", metadata: { clientCode: "ACME" } }],
    incidents: [{ fingerprint: "ads-alert:ACME:cost_per_result", service_name: "ads_alerts", status: "open", title: "CPL melebihi had · Acme", detail: "CPL RM 32" }],
    tasks: [{ title: "Semak creative", due_date: "2026-11-10", status: "todo" }],
    tiktok: { connected: true, expiresAt: "2026-11-15T04:00:00Z" },
  });
  const ids = todo.items.map((entry) => entry.id);
  assert.deepEqual(todo.items.filter((entry) => entry.tone === "danger").map((entry) => entry.id).sort(), ["alert:ads-alert:ACME:cost_per_result", "payments:overdue", "tasks:due", "tiktok:expiry"].sort());
  assert.ok(ids.indexOf("payments:receipt") > ids.indexOf("payments:overdue"));
  assert.equal(todo.items.find((entry) => entry.id === "payments:overdue").detail, "Acme (11 hari)");
  assert.equal(todo.items.find((entry) => entry.id === "payments:receipt").action.label, "Jana resit");
  const invoiceQueue = todo.items.find((entry) => entry.id === "whatsapp:invoice");
  assert.deepEqual(invoiceQueue.action, { type: "whatsapp", queue: "invoice", label: "Mula giliran" });
  assert.equal(invoiceQueue.count, 2);
  assert.ok(todo.items.find((entry) => entry.id === "whatsapp:report"), "ACME has a fresh report to send");
  assert.ok(!ids.includes("reports:weekly"), "a report went out this week");
  assert.ok(!ids.includes("invoices:upload"), "outside the first week of the month");
  assert.ok(ids.includes("clients:onboarding"));
  assert.equal(todo.summary.urgent, 4);
});

test("first week of the month asks for missing invoices; Monday raises the weekly report", () => {
  const now = new Date("2026-11-02T01:00:00Z"); // Monday 2 Nov, Kuala Lumpur
  const todo = composeTodo({ now, clients, uploads: [{ invoice_number: "INV-202611-ACME", client_code: "ACME", period: "2026-11" }] });
  const upload = todo.items.find((entry) => entry.id === "invoices:upload");
  assert.match(upload.detail, /1 daripada 2 client/);
  assert.equal(todo.items.find((entry) => entry.id === "reports:weekly").tone, "warning");
});

test("a quiet day gives an empty list rather than an error", () => {
  const todo = composeTodo({ now: new Date("2026-11-12T04:00:00Z") });
  assert.deepEqual(todo.items, []);
  assert.equal(todo.summary.total, 0);
});
