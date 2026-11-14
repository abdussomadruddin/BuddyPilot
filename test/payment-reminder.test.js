const test = require("node:test");
const assert = require("node:assert/strict");
const { composeQueue, reminderTier } = require("../lib/whatsapp-queue");
const { composeTodo } = require("../lib/today-todo");
const { whatsappPaymentReminder } = require("../lib/invoices");

const now = new Date("2026-11-20T04:00:00Z");
const clients = [
  { code: "ACME", brandClient: "Acme", phone: "+60111", serviceStatus: "active" },
  { code: "BETA", brandClient: "Beta", phone: "+60122", serviceStatus: "active" },
  { code: "GAMMA", brandClient: "Gamma", phone: "", serviceStatus: "active" },
  { code: "PAUSED", brandClient: "Paused", phone: "+60155", serviceStatus: "paused" },
  { code: "FRESH", brandClient: "Fresh", phone: "+60177", serviceStatus: "active" },
  { code: "PAID", brandClient: "Paid", phone: "+60188", serviceStatus: "active" },
];
const inv = (code, period, date, extra = {}) => ({ invoice_number: `INV-${period.replace("-", "")}-${code}`, client_code: code, client_name: code, period, invoice_date: date, total: 1500, currency: "MYR", drive_file_url: `https://drive.example/${code}`, ...extra });
const uploads = [
  inv("ACME", "2026-11", "2026-11-01"), // 19 days: final
  inv("ACME", "2026-10", "2026-10-01"), // older debt for the same client wins
  inv("BETA", "2026-11", "2026-11-10"), // 10 days: overdue
  inv("GAMMA", "2026-11", "2026-11-15"), // 5 days: friendly, no phone
  inv("PAUSED", "2026-11", "2026-11-05"), // paused clients still owe
  inv("FRESH", "2026-11", "2026-11-18"), // 2 days: too early
  inv("PAID", "2026-11", "2026-11-01", { metadata: { payment: { status: "paid" } } }),
];

test("reminder levels follow the invoice's age", () => {
  assert.deepEqual([0, 3, 4, 7, 8, 14, 15, 60].map(reminderTier), [0, 0, 1, 1, 2, 2, 3, 3]);
});

test("reminder queue: one entry per client with an unpaid invoice old enough", () => {
  const queue = composeQueue({ clients, uploads, activities: [], type: "reminder", now });
  assert.deepEqual(queue.items.map((item) => [item.clientCode, item.period, item.tier, item.status]), [
    ["ACME", "2026-10", 3, "ready"],
    ["PAUSED", "2026-11", 3, "ready"],
    ["BETA", "2026-11", 2, "ready"],
    ["GAMMA", "2026-11", 1, "no_phone"],
  ]);
  assert.deepEqual(queue.summary, { total: 4, ready: 3, sent: 0, blocked: 1 });
});

test("each reminder level is sent once; a later level is due again", () => {
  const sentFriendly = [{ type: "client_whatsapp_opened", createdAt: "2026-11-15T02:00:00Z", metadata: { clientCode: "BETA", type: "reminder", period: "2026-11", tier: 1 } }];
  assert.equal(composeQueue({ clients, uploads, activities: sentFriendly, type: "reminder", now }).items.find((item) => item.clientCode === "BETA").status, "ready");
  const sentOverdue = [{ type: "client_whatsapp_opened", createdAt: "2026-11-19T02:00:00Z", metadata: { clientCode: "BETA", type: "reminder", period: "2026-11", tier: 2 } }];
  assert.equal(composeQueue({ clients, uploads, activities: sentOverdue, type: "reminder", now }).items.find((item) => item.clientCode === "BETA").status, "sent");
});

test("Today list offers the reminder queue when someone is due", () => {
  const todo = composeTodo({ clients, uploads, paymentRows: uploads, activities: [], now });
  const entry = todo.items.find((item) => item.id === "whatsapp:reminder");
  assert.equal(entry.tone, "warning");
  assert.deepEqual(entry.action, { type: "whatsapp", queue: "reminder", label: "Mula giliran" });
  assert.equal(entry.count, 3);
});

test("reminder wording gets firmer and always carries the amount", () => {
  const base = { invoiceNumber: "INV-202611-ACME", total: 1500, currency: "MYR", daysOutstanding: 19, documentUrl: "https://drive.example/acme" };
  assert.match(whatsappPaymentReminder({ ...base, tier: 1 }), /^Sekadar peringatan mesra, invoice INV-202611-ACME berjumlah MYR 1500\.00/);
  assert.match(whatsappPaymentReminder({ ...base, tier: 2 }), /dah lewat 19 hari/);
  assert.match(whatsappPaymentReminder({ ...base, tier: 3 }), /^Peringatan akhir/);
  assert.match(whatsappPaymentReminder({ ...base, tier: 3 }), /Klik sini \(Invoice\): https:\/\/drive\.example\/acme$/);
});
