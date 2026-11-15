const test = require("node:test");
const assert = require("node:assert/strict");
const { buildInvoice, renderInvoicePdf, buildInvoiceListFromClients, buildEditableInvoiceList, buildReceiptListFromClients } = require("../lib/invoices");

const config = { timezone: "Asia/Kuala_Lumpur", business: {}, defaults: { currency: "MYR" } };
const client = { code: "TEST", name: "Test Client", monthlyRetainer: 100, serviceStatus: "active" };
const period = "2026-11";

test("extra items are priced separately and included in the subtotal and discount calculation", () => {
  const overrides = { servicePrice: 100, discount: 5.25, extraItems: [{ description: " Creative package ", amount: "14.35" }, { description: "Setup", amount: "0.10" }] };
  const invoice = buildInvoice({ client, period, config, overrides });
  assert.deepEqual(invoice.lineItems.map((item) => item.amount), [100, 14.35, 0.1]);
  assert.equal(invoice.lineItems[1].description, "Creative package");
  assert.equal(invoice.subtotal, 114.45);
  assert.equal(invoice.total, 109.2);
  const [draft] = buildInvoiceListFromClients(period, [client], config, new Map([[client.code, overrides]]));
  assert.equal(draft.servicePrice, 100);
  assert.equal(draft.amount, invoice.total);
  assert.deepEqual(draft.extraItems, invoice.lineItems.slice(1));
});

test("invalid additional items are rejected server-side", () => {
  for (const extraItems of [null, {}, [{ description: " ", amount: 12 }], [{ description: "Item", amount: -1 }], [{ description: "x".repeat(161), amount: 12 }], Array(11).fill({ description: "Item", amount: 12 })]) {
    assert.throws(() => buildInvoice({ client, period, config, overrides: { extraItems } }));
  }
});

test("saved invoice items reload; receipts inherit them until separately edited", async (t) => {
  const previous = { ...process.env };
  t.after(() => { process.env = previous; });
  process.env.SUPABASE_URL = "https://billing-fixture.invalid";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "fixture";
  const extraItems = [{ description: "Creative", amount: 40 }];
  let savedReceipt;
  t.mock.method(global, "fetch", async (url) => {
    const request = new URL(url);
    assert.equal(request.hostname, "billing-fixture.invalid");
    assert.equal(request.searchParams.get("period"), "eq." + period);
    const receipt = request.searchParams.get("invoice_number").startsWith("like.REC-");
    return Response.json(receipt ? (savedReceipt ? [savedReceipt] : []) : [{
      invoice_number: "INV-202611-TEST", service_price: 100, discount: 5, total: 135,
      metadata: { extraItems },
    }]);
  });
  const [invoice] = await buildEditableInvoiceList(period, [client], config);
  const [initialReceipt] = await buildReceiptListFromClients(period, [client], config);
  assert.equal(invoice.amount, 135);
  assert.equal(initialReceipt.amount, 135);
  assert.equal(initialReceipt.extraItems[0].description, "Creative");
  savedReceipt = { metadata: { extraItems: [] } };
  const [editedReceipt] = await buildReceiptListFromClients(period, [client], config);
  assert.equal(editedReceipt.amount, 95);
  assert.deepEqual(editedReceipt.extraItems, []);
});

test("invoice and paid receipt render an item breakdown page without changing legacy page count", async () => {
  const base = buildInvoice({ client, period, config });
  const detailed = buildInvoice({ client, period, config, overrides: {
    extraItems: Array.from({ length: 10 }, (_, i) => ({ description: String(i) + " W".repeat(78), amount: 999999 })),
  } });
  for (const [invoice, expected] of [[base, 1], [detailed, 2], [{ ...detailed, documentType: "receipt", documentLabel: "RESIT" }, 2]]) {
    const pdf = await renderInvoicePdf(invoice);
    assert.equal((pdf.toString("latin1").match(/\/Type \/Page\b/g) || []).length, expected);
  }
});
