const test = require("node:test");
const assert = require("node:assert/strict");
const { composeQueue, buildWhatsappQueue } = require("../lib/whatsapp-queue");

const now = new Date("2026-11-12T04:00:00Z");
const clients = [
  { code: "ACME", brandClient: "Acme", phone: "+60111", serviceStatus: "active", agencyStatus: "active" },
  { code: "BETA", brandClient: "Beta", phone: "+60122", serviceStatus: "active", agencyStatus: "active" },
  { code: "GAMMA", brandClient: "Gamma", phone: "", serviceStatus: "active", agencyStatus: "active" },
  { code: "DELTA", brandClient: "Delta", phone: "+60144", serviceStatus: "active", agencyStatus: "active" },
  { code: "PAUSED", brandClient: "Paused", phone: "+60155", serviceStatus: "paused" },
  { code: "OLD", brandClient: "Old", phone: "+60166", agencyStatus: "archived", archivedAt: "2026-01-01" },
];
const uploads = [
  { invoice_number: "INV-202611-ACME", client_code: "ACME", period: "2026-11", drive_file_url: "https://drive.example/acme" },
  { invoice_number: "INV-202611-BETA", client_code: "BETA", period: "2026-11", drive_file_url: "https://drive.example/beta" },
  { invoice_number: "INV-202611-GAMMA", client_code: "GAMMA", period: "2026-11" },
  { invoice_number: "INV-202610-DELTA", client_code: "DELTA", period: "2026-10" },
  { invoice_number: "REC-202611-ACME", client_code: "ACME", period: "2026-11" },
];
const activities = [
  { type: "client_whatsapp_opened", createdAt: "2026-11-05T02:00:00Z", metadata: { clientCode: "BETA", type: "invoice", period: "2026-11" } },
  { type: "client_whatsapp_opened", createdAt: "2026-10-05T02:00:00Z", metadata: { clientCode: "ACME", type: "invoice", period: "2026-10" } },
  { type: "report_uploaded", createdAt: "2026-11-10T22:00:00Z", metadata: { clientCode: "ACME", webViewLink: "https://drive.example/report" } },
  { type: "report_uploaded", createdAt: "2026-10-20T22:00:00Z", metadata: { clientCode: "BETA" } },
  { type: "client_whatsapp_opened", createdAt: "2026-11-11T01:00:00Z", metadata: { clientCode: "DELTA", type: "report" } },
];

test("invoice queue: ready first, then blocked, then sent; only this month counts", () => {
  const queue = composeQueue({ clients, uploads, activities, type: "invoice", period: "2026-11", now });
  assert.deepEqual(queue.items.map((item) => [item.clientCode, item.status]), [
    ["ACME", "ready"],
    ["DELTA", "no_document"],
    ["GAMMA", "no_phone"],
    ["BETA", "sent"],
  ]);
  assert.deepEqual(queue.summary, { total: 4, ready: 1, sent: 1, blocked: 2 });
});

test("receipt queue uses receipts, not invoices", () => {
  const queue = composeQueue({ clients, uploads, activities, type: "receipt", period: "2026-11", now });
  assert.equal(queue.items.find((item) => item.clientCode === "ACME").status, "ready");
  assert.equal(queue.items.find((item) => item.clientCode === "BETA").status, "no_document");
});

test("report queue looks at the last seven days of uploads and sends", () => {
  const queue = composeQueue({ clients, uploads, activities, type: "report", period: "2026-11", now });
  const status = Object.fromEntries(queue.items.map((item) => [item.clientCode, item.status]));
  assert.deepEqual(status, { ACME: "ready", BETA: "no_document", GAMMA: "no_phone", DELTA: "sent" });
});

test("unknown types are refused and report queues skip the invoice lookup", async () => {
  assert.throws(() => composeQueue({ clients, type: "custom", period: "2026-11" }), /Invoice, Resit atau Report/);
  let uploadsRead = false;
  await buildWhatsappQueue({
    type: "report",
    period: "2026-11",
    now,
    deps: { clients: async () => clients, uploads: async () => { uploadsRead = true; return []; }, activities: async () => activities },
  });
  assert.equal(uploadsRead, false);
});
