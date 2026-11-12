const test = require("node:test");
const assert = require("node:assert/strict");
const { evaluateAlerts, normalizeAlerts, runAdsAlerts, alertFingerprint } = require("../lib/ads-alerts");
const { buildOperationsOverview } = require("../lib/operations-center");

test("limits are validated; blank means no limit", () => {
  assert.deepEqual(normalizeAlerts({ maxCostPerResult: "20", minRoas: "", maxDailySpend: null }), { maxCostPerResult: 20, minRoas: null, maxDailySpend: null });
  assert.throws(() => normalizeAlerts({ maxCostPerResult: "-5" }), /lebih daripada 0/);
  assert.throws(() => normalizeAlerts({ minRoas: "abc" }), /ROAS minimum/);
});

test("cost per result, spend and ROAS are judged against their limits", () => {
  const alerts = { maxCostPerResult: 20, minRoas: 2, maxDailySpend: 300 };
  const bad = evaluateAlerts({ spend: 321, results: 10, revenue: 500, purchases: 10 }, alerts, { resultMetric: "conversions" });
  assert.deepEqual(bad.map((item) => [item.metric, item.breached]), [["spend", true], ["cost_per_result", true], ["roas", true]]);
  assert.match(bad[1].detail, /RM\s?32\.10/);
  const good = evaluateAlerts({ spend: 100, results: 10, revenue: 400, purchases: 10 }, alerts, { resultMetric: "conversions" });
  assert.ok(good.every((item) => !item.breached));
});

test("spend with no results breaches the cost limit; untracked revenue does not fake a ROAS alert", () => {
  const noLeads = evaluateAlerts({ spend: 45, results: 0 }, { maxCostPerResult: 20 }, { resultMetric: "leads" });
  assert.equal(noLeads[0].breached, true);
  assert.match(noLeads[0].detail, /tanpa sebarang lead/);
  const untracked = evaluateAlerts({ spend: 100, results: 5, purchases: 5, revenue: 0 }, { minRoas: 2 }, { resultMetric: "conversions" });
  assert.equal(untracked.length, 0);
  const paused = evaluateAlerts({ spend: 0, results: 0 }, { maxCostPerResult: 20, minRoas: 2 }, { resultMetric: "conversions" });
  assert.equal(paused.length, 0);
  const leadsRoas = evaluateAlerts({ spend: 100, results: 5 }, { minRoas: 2 }, { resultMetric: "leads" });
  assert.equal(leadsRoas.length, 0, "ROAS only applies to purchase campaigns");
});

function fixture({ fail = false } = {}) {
  const opened = [];
  const resolved = [];
  const fetches = [];
  const clients = [
    { code: "ACME", brandClient: "Acme", serviceStatus: "active", metadata: { adsAlerts: { maxCostPerResult: 20 }, adsReportConfig: { accountId: "111", resultMetric: "leads" } } },
    { code: "BETA", brandClient: "Beta", serviceStatus: "active", metadata: { adsAlerts: { maxCostPerResult: 50 }, adsReportConfig: { accountId: "111", resultMetric: "leads" } } },
    { code: "OFF", brandClient: "Off", serviceStatus: "paused", metadata: { adsAlerts: { maxCostPerResult: 1 }, adsReportConfig: { accountId: "222" } } },
    { code: "NONE", brandClient: "None", serviceStatus: "active", metadata: { adsReportConfig: { accountId: "333" } } },
  ];
  const deps = {
    clients: async () => clients,
    normalizeAdsReportConfig: (value) => ({ platform: "meta", accountId: value.accountId || "", resultMetric: value.resultMetric || "conversions", currency: "MYR" }),
    yesterday: () => "2026-11-11",
    fetchDaily: async (config) => {
      fetches.push(config.accountId);
      if (fail) throw new Error("Meta down");
      return { currency: "MYR", total: { spend: 300, results: 10 } };
    },
    open: async (input) => opened.push(input),
    resolve: async (items) => resolved.push(...items),
  };
  return { deps, opened, resolved, fetches };
}

test("the daily run alerts breached clients, clears healthy ones and fetches each account once", async () => {
  const { deps, opened, resolved, fetches } = fixture();
  const result = await runAdsAlerts({ deps });
  assert.deepEqual(fetches, ["111"], "two clients on one account share one fetch; paused and limit-less clients are skipped");
  assert.equal(opened.length, 1);
  assert.equal(opened[0].fingerprint, alertFingerprint("ACME", "cost_per_result"));
  assert.equal(opened[0].severity, "critical");
  assert.equal(opened[0].action.tab, "adscmo");
  assert.ok(resolved.includes(alertFingerprint("BETA", "cost_per_result")));
  assert.ok(!resolved.includes(alertFingerprint("ACME", "cost_per_result")));
  assert.deepEqual({ checked: result.checked, alerts: result.alerts, failed: result.failed }, { checked: 2, alerts: 1, failed: 0 });
});

test("a failed data fetch neither opens nor clears alerts", async () => {
  const { deps, opened, resolved } = fixture({ fail: true });
  const result = await runAdsAlerts({ deps });
  assert.equal(opened.length, 0);
  assert.equal(resolved.length, 0);
  assert.equal(result.failed, 2);
});

test("Dashboard hides incidents left behind by removed Post Pilot and Chrome Mac services", () => {
  const overview = buildOperationsOverview({
    incidentRows: [
      { fingerprint: "service:mac_extension", service_name: "mac_extension", severity: "warning", status: "open" },
      { fingerprint: "mac-offline-queue:abc", service_name: "mac_extension", severity: "critical", status: "open" },
      { fingerprint: "postpilot-job:j1", service_name: "", severity: "critical", status: "open" },
      { fingerprint: "ads-alert:ACME:cost_per_result", service_name: "ads_alerts", severity: "critical", status: "open", client_code: "ACME", title: "CPL melebihi had · Acme" },
    ],
  });
  assert.deepEqual(overview.incidents.map((item) => item.fingerprint), ["ads-alert:ACME:cost_per_result"]);
});
