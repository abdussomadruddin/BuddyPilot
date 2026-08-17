const test = require("node:test");
const assert = require("node:assert/strict");
const { aggregateMetaDailyRaw } = require("../lib/meta-ads");
const { buildDailyTelegramMessage, telegramConfig, yesterdayDate } = require("../lib/telegram-reports");

const config = {
  currency: "MYR",
  resultMetric: "leads",
  prospectingKeywords: ["prospecting"],
  retargetingKeywords: ["retargeting"],
};

function dailyRaw() {
  return {
    account: {
      spend: 100,
      impressions: 10000,
      reach: 8000,
      frequency: 1.25,
      clicks: 200,
      cpm: 10,
      cpc: 0.5,
      leads: 5,
      messaging_conversations: 10,
    },
    campaigns: [
      {
        id: "1", name: "Prospecting Main", spend: 70, impressions: 7000, reach: 6000,
        frequency: 1.17, clicks: 150, cpm: 10, cpc: 0.47, leads: 4, messaging_conversations: 8,
      },
      {
        id: "2", name: "Retargeting Warm", spend: 30, impressions: 3000, reach: 2000,
        frequency: 1.5, clicks: 50, cpm: 10, cpc: 0.6, leads: 1, messaging_conversations: 2,
      },
    ],
  };
}

test("daily Telegram message contains conversations, leads, and category breakdowns", () => {
  const analytics = aggregateMetaDailyRaw(dailyRaw(), config);
  const message = buildDailyTelegramMessage({ brandClient: "DD1" }, analytics, "2026-07-20");
  assert.match(message, /OVERALL/);
  assert.match(message, /PROSPECTING/);
  assert.match(message, /RETARGETING/);
  assert.match(message, /Conversations: 10 \| Cost: RM\s?10\.00/);
  assert.match(message, /Leads: 5 \| CPL: RM\s?20\.00/);
  assert.doesNotMatch(message, /Purchases/);
});

test("TikTok daily report keeps TOP leads separate from MID and BOT delivery", () => {
  const tiktokConfig = { ...config, platform: "tiktok" };
  const analytics = aggregateMetaDailyRaw({
    account: { ...dailyRaw().account, spend: 100, leads: 5 },
    campaigns: [
      { id: "top", name: "TOP - Lead Gen", spend: 70, impressions: 7000, reach: 6000, clicks: 150, leads: 5 },
      { id: "mid", name: "MID - Traffic Whatsapp", spend: 20, impressions: 2000, reach: 1200, clicks: 40, leads: 0 },
      { id: "bot", name: "BOT S+ - Traffic Whatsapp", spend: 10, impressions: 1000, reach: 800, clicks: 20, leads: 0 },
    ],
  }, tiktokConfig);
  const client = { brandClient: "MUIZ", metadata: { adsReportConfig: tiktokConfig } };
  const message = buildDailyTelegramMessage(client, analytics, "2026-07-20");
  assert.match(message, /TOP - PROSPECTING LEAD GEN[\s\S]*Form submissions \/ Leads: 5 \| CPL: RM\s?14\.00/);
  assert.match(message, /MID \+ BOT - RETARGETING TRAFFIC WHATSAPP[\s\S]*Spend: RM\s?30\.00/);
  assert.doesNotMatch(message, /OVERALL/);
  const retargeting = message.split("MID + BOT - RETARGETING TRAFFIC WHATSAPP")[1];
  assert.doesNotMatch(retargeting, /Leads:|CPL:/);
});

test("zero primary results show N\/A instead of zero cost", () => {
  const raw = dailyRaw();
  raw.account.leads = 0;
  raw.account.messaging_conversations = 0;
  raw.campaigns.forEach((row) => {
    row.leads = 0;
    row.messaging_conversations = 0;
  });
  const message = buildDailyTelegramMessage({ brandClient: "DD1" }, aggregateMetaDailyRaw(raw, config), "2026-07-20");
  assert.match(message, /Conversations: 0 \| Cost: N\/A/);
  assert.match(message, /Leads: 0 \| CPL: N\/A/);
});

test("daily report sends missing insights as zero values", () => {
  const analytics = aggregateMetaDailyRaw({ account: null, campaigns: [] }, config);
  const message = buildDailyTelegramMessage({ brandClient: "DD1" }, analytics, "2026-07-20");
  assert.match(message, /Spend: RM\s?0\.00/);
  assert.match(message, /Leads: 0 \| CPL: N\/A/);
  assert.doesNotMatch(message, /Data note:|Meta tidak memulangkan insights/);
});

test("TikTok daily report can send an empty day as zero values", () => {
  const tiktokConfig = { ...config, platform: "tiktok" };
  const analytics = aggregateMetaDailyRaw({ account: null, campaigns: [] }, tiktokConfig);
  analytics.warnings = ["TikTok Ads tidak memulangkan insights untuk tarikh ini. Semua angka dilaporkan sebagai 0."];
  const client = { brandClient: "MUIZ", metadata: { adsReportConfig: tiktokConfig } };
  const message = buildDailyTelegramMessage(client, analytics, "2026-07-20");
  assert.match(message, /DAILY TIKTOK ADS REPORT/);
  assert.match(message, /Form submissions \/ Leads: 0 \| CPL: N\/A/);
  assert.match(message, /Clicks: 0/);
  assert.doesNotMatch(message, /Data note:|Semua angka dilaporkan sebagai 0/);
});

test("yesterday uses Asia Kuala Lumpur across year boundary", () => {
  assert.equal(yesterdayDate(new Date("2025-12-31T16:30:00.000Z")), "2025-12-31");
});

test("legacy Telegram connection becomes recipient 1 without disconnecting it", () => {
  const config = telegramConfig({
    metadata: {
      telegramReportConfig: {
        chatId: "111",
        autoEnabled: true,
        displayName: "Owner",
      },
    },
  });
  assert.equal(config.recipients.length, 2);
  assert.equal(config.recipients[0].chatId, "111");
  assert.equal(config.recipients[0].displayName, "Owner");
  assert.equal(config.recipients[1].chatId, "");
  assert.equal(config.connectedCount, 1);
});

test("Telegram config exposes two independent recipients", () => {
  const config = telegramConfig({
    metadata: {
      telegramReportConfig: {
        recipients: [
          { slot: 1, chatId: "111", autoEnabled: true, displayName: "Owner" },
          { slot: 2, chatId: "222", autoEnabled: false, displayName: "Manager" },
        ],
      },
    },
  });
  assert.equal(config.connectedCount, 2);
  assert.equal(config.recipients[0].autoEnabled, true);
  assert.equal(config.recipients[1].autoEnabled, false);
  assert.equal(config.recipients[1].displayName, "Manager");
});
