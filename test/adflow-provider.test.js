const test = require("node:test");
const assert = require("node:assert/strict");
const { listMetaAdAccounts, fetchMetaDailyRaw } = require("../lib/meta-ads");

test("configured AdFlow handles account listing and daily insights", async (t) => {
  const prior = process.env.ADFLOW_MCP_TOKEN;
  process.env.ADFLOW_MCP_TOKEN = "test-only";
  t.after(() => {
    if (prior === undefined) delete process.env.ADFLOW_MCP_TOKEN;
    else process.env.ADFLOW_MCP_TOKEN = prior;
  });
  const fetch = t.mock.method(global, "fetch", async (url, options) => {
    assert.equal(url, "https://adflowapps.com/api/mcp");
    const { name, arguments: args } = JSON.parse(options.body).params;
    const data = name === "list_ad_accounts"
      ? { accounts: [{ account_id: "act_123", name: "Example" }] }
      : { data: [{ campaign_id: "456", spend: "12", actions: [{ action_type: "purchase", value: "2" }] }] };
    if (name !== "list_ad_accounts") {
      assert.equal(name, "meta_api_get");
      assert.equal(args.path, "act_123/insights");
      assert.match(args.params.fields, /action_values/);
    }
    return Response.json({ result: { content: [{ type: "text", text: JSON.stringify(data) }] } });
  });
  assert.deepEqual(await listMetaAdAccounts(), [{ id: "123", name: "Example", currency: "MYR", platform: "meta" }]);
  const report = await fetchMetaDailyRaw("123", "2026-11-19");
  assert.equal(report.campaigns[0].spend, 12);
  assert.equal(fetch.mock.callCount(), 3);
});
