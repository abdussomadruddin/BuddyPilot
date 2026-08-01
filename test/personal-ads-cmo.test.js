const test = require("node:test");
const assert = require("node:assert/strict");

const {
  assessPeriod,
  buildLiveSnapshot,
  diagnose,
  normalizeAccountSetting,
  yesterdayDate,
} = require("../lib/personal-ads-cmo");

function analytics(campaigns = [], overrides = {}) {
  const total = campaigns.reduce((sum, item) => {
    for (const key of ["spend", "revenue", "purchases", "leads", "messaging", "clicks", "impressions", "reach"]) {
      sum[key] += Number(item[key] || 0);
    }
    return sum;
  }, { spend: 0, revenue: 0, purchases: 0, leads: 0, messaging: 0, clicks: 0, impressions: 0, reach: 0 });
  total.roas = total.spend ? total.revenue / total.spend : 0;
  total.ctr = total.impressions ? total.clicks / total.impressions * 100 : 0;
  total.cpc = total.clicks ? total.spend / total.clicks : 0;
  return { total: { ...total, ...(overrides.total || {}) }, campaigns, ads: overrides.ads || [], warnings: overrides.warnings || [] };
}

const setting = normalizeAccountSetting({
  accountId: "123",
  accountName: "DD1",
  currency: "MYR",
  productRules: [
    { name: "KM", campaignKeywords: ["km"], primaryMetric: "purchase", sellingPrice: 149, grossMarginPercent: 70 },
    { name: "Service", campaignKeywords: ["service"], primaryMetric: "lead", allowableCpa: 20 },
  ],
});

test("yesterday uses Malaysia date across a year boundary", () => {
  assert.equal(yesterdayDate(new Date("2025-12-31T16:30:00.000Z")), "2025-12-31");
});

test("purchase profit uses reported revenue and gross margin", () => {
  const result = assessPeriod(analytics([{ name: "KM Prospecting", spend: 50, revenue: 149, purchases: 1 }]), setting);
  assert.equal(result.campaigns[0].profit, 54.3);
  assert.equal(result.campaigns[0].revenueSource, "meta");
  assert.equal(result.campaigns[0].profitStatus, "profitable");
});

test("missing purchase revenue falls back to selling price with warning", () => {
  const result = assessPeriod(analytics([{ name: "KM Prospecting", spend: 100, purchases: 2 }]), setting);
  assert.equal(result.campaigns[0].revenue, 298);
  assert.equal(result.campaigns[0].profit, 108.6);
  assert.match(result.warnings.join(" "), /revenue Meta tiada/);
});

test("unusual purchase value is a tracking anomaly, not profit", () => {
  const result = assessPeriod(analytics([{ name: "KM Prospecting", spend: 100, revenue: 9000, purchases: 1 }]), setting);
  assert.equal(result.campaigns[0].profit, null);
  assert.equal(result.campaigns[0].profitStatus, "tracking_issue");
  assert.match(result.warnings.join(" "), /tidak sepadan/);
});

test("lead economics use allowable CPA and unmapped spend remains explicit", () => {
  const result = assessPeriod(analytics([
    { name: "Service Leads", spend: 50, leads: 4 },
    { name: "Mystery Campaign", spend: 30 },
  ]), setting);
  assert.equal(result.campaigns[0].profit, 30);
  assert.equal(result.campaigns[0].primaryCpa, 12.5);
  assert.equal(result.profitability.unmappedSpend, 30);
  assert.match(result.warnings.join(" "), /Other \/ Unmapped/);
});

test("reported revenue provides profit when campaign product mapping is incomplete", () => {
  const result = assessPeriod(analytics([{
    name: "All - Retargeting - Purchase", spend: 153.67, revenue: 194, purchases: 2,
  }]), setting);
  assert.equal(result.profitability.contributionProfit, 40.33);
  assert.equal(result.profitability.profitSource, "reported_revenue_less_ads");
  assert.match(result.warnings.join(" "), /reported revenue/);
});

test("report separates overall performance into product-level results", () => {
  const result = assessPeriod(analytics([
    { name: "KM Prospecting", spend: 100, revenue: 298, purchases: 2, clicks: 80 },
    { name: "Service Leads", spend: 60, leads: 3, clicks: 40 },
  ]), setting);
  assert.equal(result.total.spend, 160);
  assert.equal(result.productBreakdown.length, 2);
  const km = result.productBreakdown.find((item) => item.product === "KM");
  const service = result.productBreakdown.find((item) => item.product === "Service");
  assert.equal(km.cpp, 50);
  assert.equal(km.roas, 2.98);
  assert.equal(service.leads, 3);
  assert.equal(service.cpc, 1.5);
});

test("diagnosis stays concise and contains the requested decision sections", () => {
  const current = assessPeriod(analytics([{ name: "KM Prospecting", spend: 350, revenue: 745, purchases: 5, clicks: 100, impressions: 5000 }]), setting);
  const previous = assessPeriod(analytics([{ name: "KM Prospecting", spend: 300, revenue: 596, purchases: 4, clicks: 90, impressions: 4500 }]), setting);
  const yesterday = assessPeriod(analytics([{ name: "KM Prospecting", spend: 50, revenue: 149, purchases: 1 }]), setting);
  const result = diagnose(yesterday, current, previous, setting);
  assert.ok(result.executiveSummary.length <= 5);
  assert.equal(result.scorecard.length, 7);
  assert.ok(result.actions.doNow.length);
  assert.ok(result.actions.monitor.length);
  assert.ok(result.actions.testNext.length);
  assert.ok(result.actions.doNotTouch.length);
});

test("live snapshot returns spend with every primary and secondary metric", () => {
  const source = analytics([{
    id: "campaign-1", name: "KM Prospecting", spend: 120, revenue: 300, purchases: 3,
    leads: 6, messaging: 4, impressions: 12000, reach: 9000, clicks: 240, linkClicks: 180,
    ctr: 2, cpc: 0.5, cpm: 10, frequency: 1.33,
  }], { total: { linkClicks: 180, frequency: 1.33, cpm: 10 } });
  const snapshot = buildLiveSnapshot(source, setting, {
    capturedAt: "2026-08-01T04:00:00.000Z",
    reportDate: "2026-08-01",
  });
  assert.equal(snapshot.spend, 120);
  assert.deepEqual(snapshot.primary, {
    purchases: 3, costPerPurchase: 40,
    leads: 6, costPerLead: 20,
    conversations: 4, costPerConversation: 30,
  });
  assert.equal(snapshot.secondary.impressions, 12000);
  assert.equal(snapshot.secondary.linkClicks, 180);
  assert.equal(snapshot.secondary.cpm, 10);
  assert.equal(snapshot.campaigns[0].leads, 6);
  assert.equal(snapshot.productBreakdown[0].product, "KM");
  assert.equal(snapshot.productBreakdown[0].cpp, 40);
  assert.equal(snapshot.productBreakdown[0].roas, 2.5);
});
