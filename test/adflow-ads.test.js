const test = require("node:test");
const assert = require("node:assert/strict");
const { aggregateAdflowData, buildReportDraft, presetDateRange, validateCustomWeek } = require("../lib/adflow-ads");

const config = {
  accountId: "123",
  resultMetric: "conversions",
  prospectingKeywords: "prospecting,cold",
  retargetingKeywords: "retargeting,warm",
};

test("AdFlow presets calculate completed ranges across boundaries", () => {
  const now = new Date("2026-01-03T04:00:00Z");
  assert.deepEqual(presetDateRange("last_7d", now), { startDate: "2025-12-27", endDate: "2026-01-02" });
  assert.deepEqual(presetDateRange("last_month", now), { startDate: "2025-12-01", endDate: "2025-12-31" });
  assert.throws(() => presetDateRange("custom", now), /tidak sah/);
});

test("manual report week must be exactly seven completed days", () => {
  const now = new Date("2026-07-21T04:00:00Z");
  assert.deepEqual(validateCustomWeek("2026-07-06", "2026-07-12", now), { startDate: "2026-07-06", endDate: "2026-07-12" });
  assert.throws(() => validateCustomWeek("2026-07-06", "2026-07-11", now), /tepat 7 hari/);
  assert.throws(() => validateCustomWeek("2026-07-20", "2026-07-26", now), /sudah lengkap/);
});

test("aggregates conversions by campaign category", () => {
  const analytics = aggregateAdflowData({
    insights: { currency: "MYR", spend: 175, conversions: 12, impressions: 17500, clicks: 270 },
    campaigns: [
      { id: "c1", name: "Cold Prospecting", spend: 100, conversions: 10, impressions: 10000, clicks: 200 },
      { id: "c2", name: "Warm Retargeting", spend: 50, conversions: 2, leads: 3, messaging_conversations: 1, impressions: 5000, clicks: 50 },
      { id: "c3", name: "Experimental", spend: 25, conversions: 0, impressions: 2500, clicks: 20 },
    ],
    ads: [{ id: "a1", name: "Video Hook", campaignName: "Cold Prospecting", spend: 100 }],
  }, config);

  assert.equal(analytics.total.spend, 175);
  assert.equal(analytics.total.results, 12);
  assert.equal(analytics.total.cpr, 14.58);
  assert.equal(analytics.categories.prospecting.cpr, 10);
  assert.equal(analytics.categories.retargeting.cpr, 25);
  assert.equal(analytics.categories.retargeting.purchases, 2);
  assert.equal(analytics.categories.retargeting.messaging, 1);
  assert.equal(analytics.categories.retargeting.leads, 3);
  assert.equal(analytics.categories.other.spend, 25);
  assert.match(analytics.warnings.join(" "), /Other \/ Unmapped/);
});

test("TikTok TOP is prospecting while MID and BOT are retargeting", () => {
  const tiktokConfig = { ...config, platform: "tiktok", resultMetric: "leads" };
  const analytics = aggregateAdflowData({
    insights: { currency: "MYR", spend: 300, leads: 12 },
    campaigns: [
      { id: "top", name: "TOP - Lead Gen", spend: 150, leads: 4 },
      { id: "mid", name: "MID - Traffic Whatsapp", spend: 80, leads: 3 },
      { id: "bot", name: "BOT - Traffic Whatsapp", spend: 40, leads: 3 },
      { id: "bots", name: "BOT S+ - Traffic Whatsapp", spend: 30, leads: 2 },
    ],
    ads: [
      { id: "top-ad", name: "Lead Creative", campaignName: "TOP - Lead Gen", spend: 150, leads: 4 },
      { id: "bot-ad", name: "WhatsApp Creative", campaignName: "BOT - Traffic Whatsapp", spend: 40, clicks: 100, leads: 3 },
    ],
  }, tiktokConfig);
  assert.equal(analytics.categories.prospecting.spend, 150);
  assert.equal(analytics.categories.prospecting.results, 4);
  assert.equal(analytics.categories.retargeting.spend, 150);
  assert.equal(analytics.categories.retargeting.results, 8);
  assert.equal(analytics.categories.other.spend, 0);
  const draft = buildReportDraft(analytics, tiktokConfig);
  assert.equal(draft.adSpend, 300);
  assert.equal(draft.leadsGenerated, 4);
  assert.equal(draft.costPerLead, 37.5);
  assert.match(draft.whatWeProved, /TOP - Prospecting Lead Gen/);
  assert.match(draft.whatWeProved, /MID\/BOT - Retargeting Traffic WhatsApp/);
  assert.match(draft.retargetingBestPerformance, /100 clicks.*RM\s?0\.40 CPC/);
  assert.doesNotMatch(draft.retargetingBestPerformance, /lead|CPL/i);
});

test("TikTok weekly PDF falls back to overall clicks and CPC when TOP has no leads", () => {
  const tiktokConfig = { ...config, platform: "tiktok", resultMetric: "leads" };
  const analytics = aggregateAdflowData({
    insights: { currency: "MYR", spend: 120, clicks: 60, leads: 0 },
    campaigns: [
      { id: "top", name: "TOP - Lead Gen", spend: 50, clicks: 20, leads: 0 },
      { id: "mid", name: "MID - Traffic Whatsapp", spend: 40, clicks: 24, leads: 0 },
      { id: "bot", name: "BOT - Traffic Whatsapp", spend: 30, clicks: 16, leads: 0 },
    ],
  }, tiktokConfig);
  const draft = buildReportDraft(analytics, tiktokConfig);
  assert.equal(draft.adSpend, 120);
  assert.equal(draft.resultLabel, "Clicks");
  assert.equal(draft.leadsGenerated, 60);
  assert.equal(draft.costPerLead, 2);
  assert.match(draft.whatWeProved, /TOP - Prospecting Lead Gen:.*20 clicks.*CPC/);
  assert.match(draft.recommendation, /Overall delivery: 60 clicks.*CPC/);
  assert.doesNotMatch(`${draft.whatWeProved}\n${draft.recommendation}`, /\b0 leads\b|CPL/);
});

test("messaging conversations use campaign and ad conversation fields", () => {
  const messagingConfig = { ...config, resultMetric: "messaging_conversations" };
  const analytics = aggregateAdflowData({
    insights: { currency: "MYR", spend: 90 },
    campaigns: [{ id: "c1", name: "Cold", spend: 90, messaging_conversations: 9 }],
    ads: [{ id: "a1", name: "Message Ad", campaignName: "Cold", spend: 90, conversations: 9 }],
  }, messagingConfig);
  assert.equal(analytics.total.results, 9);
  assert.equal(analytics.total.cpr, 10);
  assert.equal(analytics.ads[0].results, 9);
  const draft = buildReportDraft(analytics, messagingConfig);
  assert.match(draft.whatWeProved, /messaging conversations/);
  assert.doesNotMatch(draft.whatWeProved, /purchases|leads/);
});

test("lead form results use the Meta lead event", () => {
  const leadConfig = { ...config, resultMetric: "leads" };
  const analytics = aggregateAdflowData({
    insights: { currency: "MYR", spend: 120, leads: 6 },
    campaigns: [{ id: "c1", name: "Cold Lead Form", spend: 120, leads: 6 }],
  }, leadConfig);
  const draft = buildReportDraft(analytics, leadConfig);
  assert.equal(analytics.resultLabel, "Leads");
  assert.equal(analytics.total.results, 6);
  assert.equal(analytics.total.cpr, 20);
  assert.equal(draft.leadsGenerated, 6);
  assert.match(draft.whatWeProved, /leads/);
  assert.doesNotMatch(draft.whatWeProved, /purchases|messaging conversations/);
  assert.match(draft.recommendation, /Result: 6 leads.*CPL RM.*20\.00/);
  assert.match(draft.recommendation, /Fokus:/);
  assert.match(draft.next7Days, /pain-led.*benefit\/proof-led/);
});

test("best performer uses the ad title instead of campaign title", () => {
  const leadConfig = { ...config, resultMetric: "leads" };
  const analytics = aggregateAdflowData({
    insights: { currency: "MYR", spend: 100, leads: 5 },
    campaigns: [{ id: "c1", name: "Cold Campaign", spend: 100, leads: 5 }],
    ads: [{ id: "a1", name: "UGC Hook A", campaignName: "Cold Campaign", spend: 40, leads: 4 }],
  }, leadConfig);
  assert.equal(buildReportDraft(analytics, leadConfig).winningCreative, "UGC Hook A");
});

test("selects separate prospecting and retargeting ads with CPM fallback", () => {
  const leadConfig = { ...config, resultMetric: "leads" };
  const analytics = aggregateAdflowData({
    insights: { currency: "MYR", spend: 150, leads: 5 },
    campaigns: [
      { id: "c1", name: "Cold Campaign", spend: 100, leads: 5 },
      { id: "c2", name: "Warm Retargeting", spend: 50, leads: 0 },
    ],
    ads: [
      { id: "a1", name: "Prospecting Winner", campaignName: "Cold Campaign", spend: 100, leads: 5, cpm: 40 },
      { id: "a2", name: "Warm Low CPM", campaignName: "Warm Retargeting", spend: 30, leads: 0, cpm: 12, cpc: 3 },
      { id: "a3", name: "Warm High CPM", campaignName: "Warm Retargeting", spend: 20, leads: 0, cpm: 25, cpc: 1 },
    ],
  }, leadConfig);
  const draft = buildReportDraft(analytics, leadConfig);
  assert.equal(draft.winningCreative, "Prospecting Winner");
  assert.equal(draft.retargetingWinningCreative, "Warm Low CPM");
  assert.match(draft.retargetingBestPerformance, /CPM.*CPC.*secondary fallback/);
});

test("zero results produces N/A cost and a customer-angle recommendation", () => {
  const analytics = aggregateAdflowData({
    insights: { currency: "MYR", spend: 80, conversions: 0 },
    campaigns: [{ id: "c1", name: "Cold Prospecting", spend: 80, conversions: 0 }],
  }, config);
  const draft = buildReportDraft(analytics, config);
  assert.equal(analytics.total.cpr, null);
  assert.equal(draft.costPerLead, null);
  assert.match(draft.whatWeProved, /N\/A/);
  assert.match(draft.recommendation, /Fokus: Refresh/);
  assert.match(draft.recommendation, /pain, desired outcome dan proof\/offer/);
  assert.match(draft.next7Days, /masalah pelanggan, hasil yang diingini dan bukti\/offer/);
  assert.match(draft.leadLeaks, /Idea:.*Sebab:/);
  assert.match(draft.leadLeaks, /RM.*80\.00 spend tanpa purchases/);
  assert.doesNotMatch(`${draft.next7Days} ${draft.recommendation}`, /tracking|billing|setup/i);
});

test("results produce campaign and creative-led recommendations", () => {
  const leadConfig = { ...config, resultMetric: "leads" };
  const analytics = aggregateAdflowData({
    insights: { currency: "MYR", spend: 40, leads: 5 },
    campaigns: [{ id: "c1", name: "Cold Lead Form", spend: 40, leads: 5 }],
    ads: [{ id: "a1", name: "Lead Winner", campaignName: "Cold Lead Form", spend: 40, leads: 5 }],
  }, leadConfig);
  const draft = buildReportDraft(analytics, leadConfig);
  assert.match(draft.recommendation, /Result: 5 leads.*CPL RM.*8\.00/);
  assert.match(draft.recommendation, /Lead Winner/);
  assert.match(draft.recommendation, /pain \+ benefit\/proof/);
  assert.match(draft.next7Days, /Cold Lead Form/);
  assert.match(draft.next7Days, /dua variasi hook daripada angle “Lead Winner”/);
  assert.equal(draft.recommendationHeadline, "BUILD ON WINNING ANGLES");
});

test("performance leaks explain the idea and the metric-based reason", () => {
  const leadConfig = { ...config, resultMetric: "leads" };
  const analytics = aggregateAdflowData({
    insights: { currency: "MYR", spend: 150, leads: 10 },
    campaigns: [
      { id: "c1", name: "Cold Winner", spend: 50, leads: 5 },
      { id: "c2", name: "Warm Retargeting", spend: 100, leads: 5 },
    ],
    ads: [
      { id: "a1", name: "Proof Winner", campaignName: "Cold Winner", spend: 50, leads: 5 },
      { id: "a2", name: "Warm Ad", campaignName: "Warm Retargeting", spend: 100, leads: 5 },
    ],
  }, leadConfig);
  const draft = buildReportDraft(analytics, leadConfig);
  assert.equal(draft.leadLeaks.split("\n").length, 1);
  assert.match(draft.leadLeaks, /Idea: Adapt angle “Proof Winner” untuk Retargeting/);
  assert.match(draft.leadLeaks, /Sebab: cost Retargeting CPL RM.*20\.00 vs CPL RM.*10\.00/);
});

test("performance leaks handle a week with no spend without claiming wasted cost", () => {
  const analytics = aggregateAdflowData({ insights: { currency: "MYR", spend: 0, conversions: 0 } }, config);
  const draft = buildReportDraft(analytics, config);
  assert.match(draft.leadLeaks, /Idea: Sediakan tiga angle/);
  assert.match(draft.leadLeaks, /Sebab: belum ada spend atau result/);
  assert.doesNotMatch(draft.leadLeaks, /RM.*0.*spend tanpa/);
});

test("does not mislabel an ad title as the customer audience", () => {
  const leadConfig = { ...config, resultMetric: "leads", prospectingKeywords: "prospecting,cold,bonus" };
  const analytics = aggregateAdflowData({
    insights: { currency: "MYR", spend: 30, leads: 3 },
    campaigns: [{ id: "c1", name: "Bonus Hook", spend: 30, leads: 3 }],
    ads: [{ id: "a1", name: "Bonus Hook", campaignName: "Bonus Hook", adSetName: "Bonus Hook", spend: 30, leads: 3 }],
  }, leadConfig);
  const draft = buildReportDraft(analytics, leadConfig);
  assert.match(draft.next7Days, /cold audience semasa/);
  assert.doesNotMatch(draft.next7Days, /profil pelanggan dalam “Bonus Hook”/);
});
