const assert = require("node:assert/strict");
const test = require("node:test");

const { normalizeAdsReportConfig } = require("../lib/meta-ads");
const { _test, decryptState, encryptState } = require("../lib/tiktok-ads");

test("TikTok OAuth state is encrypted and can be restored", () => {
  const previous = process.env.TIKTOK_TOKEN_ENCRYPTION_KEY;
  process.env.TIKTOK_TOKEN_ENCRYPTION_KEY = "test-only-key-with-at-least-thirty-two-characters";
  try {
    const state = { tokens: { access_token: "private-token" }, verifier: "abc" };
    const encrypted = encryptState(state);
    assert.notEqual(encrypted.includes("private-token"), true);
    assert.deepEqual(decryptState(encrypted), state);
  } finally {
    if (previous == null) delete process.env.TIKTOK_TOKEN_ENCRYPTION_KEY;
    else process.env.TIKTOK_TOKEN_ENCRYPTION_KEY = previous;
  }
});

test("ads report config defaults to Meta and preserves TikTok platform", () => {
  assert.equal(normalizeAdsReportConfig({}).platform, "meta");
  assert.equal(normalizeAdsReportConfig({ platform: "tiktok", accountId: "123" }).platform, "tiktok");
  assert.equal(normalizeAdsReportConfig({ platform: "unknown" }).platform, "meta");
});

test("TikTok MCP rows parser handles nested and text-wrapped payloads", () => {
  const rows = [{ dimensions: { campaign_id: "1" }, metrics: { spend: "12.50" } }];
  assert.deepEqual(_test.rowsFromPayload({ result: { data: { list: rows } } }), rows);
  assert.deepEqual(_test.rowsFromPayload({ content: [{ type: "text", text: JSON.stringify({ data: { list: rows } }) }] }), rows);
});

test("TikTok MCP payload errors are surfaced instead of looking empty", () => {
  assert.equal(_test.payloadError({ code: 40002, message: "Invalid metrics" }), "Invalid metrics");
  assert.equal(_test.payloadError({ data: { code: 0, list: [] } }), "");
});

test("TikTok campaign rows can provide a real account total", () => {
  const total = _test.sumTikTokRows([
    { spend: 10, impressions: 1000, clicks: 20, reach: 800, conversions: 2 },
    { spend: 15, impressions: 2000, clicks: 30, reach: 1200, conversions: 3 },
  ], { currency: "MYR" });
  assert.equal(total.spend, 25);
  assert.equal(total.conversions, 5);
  assert.equal(total.ctr, 50 / 3000 * 100);
  assert.equal(total.currency, "MYR");
});

test("TikTok onsite form submissions are normalized as leads", () => {
  const row = _test.normalizeTikTokRow({
    dimensions: { campaign_id: "campaign-1" },
    metrics: { spend: "150", onsite_form: "10", form: "2", result: "99" },
  }, "campaign", { currency: "MYR", resultMetric: "leads" });
  assert.equal(row.leads, 12);
  assert.equal(row.conversions, 0);
  assert.equal(row.spend, 150);
});
