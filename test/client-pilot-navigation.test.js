const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const source = fs.readFileSync(path.join(__dirname, "..", "api_handlers", "app.js"), "utf8");

test("Report Pilot and Invoice Pilot are Client Pilot modules", () => {
  assert.match(source, /data-subtab-target="client-report-panel">Report Pilot/);
  assert.match(source, /data-subtab-target="client-invoice-panel">Invoice Pilot/);
  assert.doesNotMatch(source, /data-tab-target="reportpilot"/);
  assert.doesNotMatch(source, /data-tab-target="invoicepilot"/);
  assert.match(source, /const NAV_ITEMS = \["dashboard", "adscmo", "personalpostpilot", "clientpilot"\]/);
  assert.match(source, /data-tab-target="adscmo"[\s\S]*?<span>Ads CMO<\/span>/);
  assert.doesNotMatch(source, /data-tab-target="copypilot"/);
  assert.match(source, /savedMainTab === "copypilot"[\s\S]*savedMainTab = "dashboard"/);
});

test("legacy report and invoice routes migrate to Client Pilot", () => {
  assert.match(source, /savedMainTab === "reportpilot" \|\| savedMainTab === "invoicepilot"/);
  assert.match(source, /value\?\.tab === "reportpilot" \|\| value\?\.tab === "invoicepilot"/);
  assert.match(source, /activateSubtab\("client-modules", "client-invoice-panel"\)/);
});

test("Ads CMO keyword separators stay valid inside the generated page script", () => {
  assert.doesNotMatch(source, /split\(\/\[,\\n\]\//);
  assert.match(source, /split\(\/\[,\\\\n\]\//);
});

test("Ads CMO exposes a manual live snapshot with primary and secondary data", () => {
  assert.match(source, /id="adsCmoLiveButton"[^>]*>Live Data/);
  assert.match(source, /<h3>Primary Data<\/h3>/);
  assert.match(source, /<h3>Secondary Data<\/h3>/);
  assert.match(source, /\/api\/personal-ads\/live\?accountId=/);
  assert.match(source, /Overall Performance/);
  assert.match(source, /Performance by Product/);
  assert.match(source, /\["CPP",/);
  assert.match(source, /\["ROAS",/);
});

test("Ads CMO separates live data from stored reports", () => {
  assert.match(source, /id="adsCmoLiveViewButton"[^>]*>Live Data/);
  assert.match(source, /id="adsCmoReportViewButton"[^>]*>Load Report/);
  assert.match(source, /function setAdsCmoView\(view\)/);
  assert.match(source, /adsCmoReportDateField\.hidden = liveActive/);
  assert.match(source, /adsCmoLive\.hidden = !liveActive/);
  assert.match(source, /adsCmoReport\.hidden = liveActive/);
});

test("Ads CMO keeps live metrics in two columns on iPhone", () => {
  assert.match(source, /\.ads-cmo-live-metrics, \.ads-cmo-live-groups > section:first-child \.ads-cmo-live-metrics \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\); \}/);
  assert.doesNotMatch(source, /@media \(max-width: 420px\)[\s\S]{0,300}\.ads-cmo-live-metrics[\s\S]{0,120}grid-template-columns: 1fr/);
});

test("Ads CMO campaign breakdown uses expandable cards on mobile", () => {
  assert.match(source, /id="adsCmoLiveCampaignCards" class="ads-cmo-campaign-cards"/);
  assert.match(source, /\.ads-cmo-live-campaigns \.ads-cmo-table-scroll \{ display: none; \}/);
  assert.match(source, /<details class="ads-cmo-campaign-card">/);
  for (const label of ["CPP", "ROAS", "Est. Profit", "Purchases", "Leads", "Conversations", "Impressions", "Reach", "Clicks", "Link clicks", "CTR", "CPC", "CPM", "Frequency"]) {
    assert.match(source, new RegExp('\\["' + label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + '",'));
  }
});

test("Ads CMO defaults to DD1 variants unless an account is requested", () => {
  assert.ok(source.includes('toUpperCase().replace(/[^A-Z0-9]/g, "") === "DD1"'));
  assert.match(source, /if \(requestedAccount[\s\S]*?adsCmoAccount\.value = requestedAccount;[\s\S]*?else if \(defaultAccount\) adsCmoAccount\.value = defaultAccount\.accountId;/);
});
