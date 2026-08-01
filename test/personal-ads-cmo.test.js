const test = require("node:test");
const assert = require("node:assert/strict");

const {
  assessPeriod,
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
