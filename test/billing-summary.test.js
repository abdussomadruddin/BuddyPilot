const test = require("node:test");
const assert = require("node:assert/strict");
const { Readable } = require("node:stream");
const { normalizeSummary, buildSummaryPdf } = require("../lib/billing-summary");
const { authCookie } = require("../lib/auth");
const handler = require("../api_handlers/billing-summary");

function fixture(overrides = {}) {
  return { company: "Example Company Sdn Bhd", address: "12 Example Road\nKuala Lumpur\nMalaysia", registration: "SSM 123456", account: "123456789", start: "2026-11-01", end: "2026-11-21", paymentMethod: "Visa", last4: "1234", currency: "MYR", funds: "0.00", vatRate: "0", vat: "0.00",
    transactions: [{ date: "2026-11-20", id: "TEST-001", amount: "0.10", status: "Paid" }, { date: "2026-11-18", id: "TEST-002", amount: "0.20", status: "Paid" }], ...overrides };
}

test("billing summary sums cents exactly and preserves identifiers", () => {
  const data = normalizeSummary(fixture());
  assert.equal(data.total, 30);
  assert.equal(data.account, "123456789");
  assert.equal(data.transactions[0].id, "TEST-001");
  assert.deepEqual(data.address, ["12 Example Road", "Kuala Lumpur", "Malaysia"]);
});

test("billing summary validates company, dates, transactions and money", () => {
  for (const overrides of [{ company: "" }, { account: "act_123" }, { start: "2026-02-30" }, { end: "2026-10-01" }, { currency: "BAD" }, { last4: "1234567812345678" }, { funds: "-1" }, { vat: "NaN" }, { vatRate: "101" }, { transactions: [] }, { transactions: Array(201).fill(fixture().transactions[0]) }, { address: "a\nb\nc\nd\ne" }]) {
    assert.throws(() => normalizeSummary(fixture(overrides)), JSON.stringify(overrides));
  }
  for (const row of [{ date: "2026-10-31" }, { date: "2026-11-31" }, { id: "" }, { amount: "1.001" }, { amount: null }, { amount: "-1" }, { status: "anything" }]) {
    assert.throws(() => normalizeSummary(fixture({ transactions: [{ ...fixture().transactions[0], ...row }] })));
  }
  assert.throws(() => normalizeSummary(fixture({ transactions: Array(2).fill(fixture().transactions[0]) })), /berulang/);
});

test("billing summary supports zero amounts and supplied payment statuses", () => {
  const input = fixture({ transactions: [{ date: "2026-11-01", id: "ZERO", amount: "0", status: "Pending" }] });
  assert.equal(normalizeSummary(input).total, 0);
});

test("billing summary renders a single A4 page and paginates large input", async () => {
  const pdf = await buildSummaryPdf(fixture());
  assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
  assert.equal((pdf.toString("latin1").match(/\/Type \/Page\b/g) || []).length, 1);
  const many = fixture({ company: "Long company ".repeat(7), transactions: Array.from({ length: 200 }, (_, i) => ({ date: "2026-11-20", id: `TEST-${i}-` + "x".repeat(85), amount: "999999999.99", status: "Paid" })) });
  const multipage = await buildSummaryPdf(many);
  assert.ok((multipage.toString("latin1").match(/\/Type \/Page\b/g) || []).length > 2);
});

test("billing PDF endpoint requires auth, POST and valid input; has no persistence", async (t) => {
  const previous = process.env.APP_PASSWORD;
  process.env.APP_PASSWORD = "billing-summary-test-only";
  t.after(() => { if (previous === undefined) delete process.env.APP_PASSWORD; else process.env.APP_PASSWORD = previous; });
  t.mock.method(global, "fetch", () => { throw new Error("Unexpected network request"); });
  async function call({ method = "POST", authed = true, body = fixture() } = {}) {
    const req = Readable.from([Buffer.from(JSON.stringify(body))]);
    req.method = method;
    req.headers = { cookie: authed ? authCookie().split(";")[0] : "" };
    const response = { headers: {}, setHeader(key, value) { this.headers[key] = value; }, end(value) { this.body = value; } };
    await handler(req, response);
    return response;
  }
  assert.equal((await call({ authed: false })).statusCode, 401);
  assert.equal((await call({ method: "GET" })).statusCode, 405);
  assert.equal((await call({ body: {} })).statusCode, 400);
  const response = await call();
  assert.equal(response.statusCode, 200);
  assert.equal(response.headers["content-type"], "application/pdf");
  assert.equal(response.headers["cache-control"], "private, no-store");
  assert.match(response.headers["content-disposition"], /2026-11-01--2026-11-21_Billing_Summary.pdf/);
});

module.exports = { fixture };
