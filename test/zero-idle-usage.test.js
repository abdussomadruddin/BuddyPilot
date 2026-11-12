const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");

test("Vercel isolates reporting and uses sparse weekly/monthly schedules without polling", () => {
  const config = JSON.parse(fs.readFileSync(path.join(root, "vercel.json"), "utf8"));
  assert.deepEqual(config.crons, [
    { path: "/api/cron/weekly-reports", schedule: "0 22 * * 0" },
    { path: "/api/cron/daily-ads-report", schedule: "0 22 * * *" },
    { path: "/api/cron/personal-ads-report", schedule: "0 22 * * *" },
    { path: "/api/cron/weekly-report-reminder", schedule: "0 2 * * 1" },
    { path: "/api/cron/monthly-invoices", schedule: "0 22 28-31 * *" },
    { path: "/api/cron/monthly-invoice-reminder", schedule: "0 2 1 * *" },
  ]);
});
