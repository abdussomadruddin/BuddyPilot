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
  assert.match(source, /const NAV_ITEMS = \["dashboard", "personalpostpilot", "copypilot", "clientpilot"\]/);
});

test("legacy report and invoice routes migrate to Client Pilot", () => {
  assert.match(source, /savedMainTab === "reportpilot" \|\| savedMainTab === "invoicepilot"/);
  assert.match(source, /value\?\.tab === "reportpilot" \|\| value\?\.tab === "invoicepilot"/);
  assert.match(source, /activateSubtab\("client-modules", "client-invoice-panel"\)/);
});
