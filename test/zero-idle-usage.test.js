const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");

test("Post Pilot uses low-frequency Mac health sync instead of 30-second polling", () => {
  const background = fs.readFileSync(path.join(root, "chrome-extension/postpilot/background.js"), "utf8");
  assert.doesNotMatch(background, /periodInMinutes\s*:\s*0\.5/);
  assert.doesNotMatch(background, /alarm\.name\s*===\s*REMOTE_POLL_ALARM/);
  assert.match(background, /REMOTE_HEALTH_PERIOD_MINUTES = 10/);
  assert.match(background, /alarm\.name === REMOTE_HEALTH_ALARM/);
  assert.match(background, /message\.event === "broadcast"/);
  assert.match(background, /processRemoteQueue\(\)\.catch/);
});

test("Post Pilot extension exposes a safe reset without removing pairing", () => {
  const background = fs.readFileSync(path.join(root, "chrome-extension/postpilot/background.js"), "utf8");
  const popup = fs.readFileSync(path.join(root, "chrome-extension/postpilot/popup.html"), "utf8");
  assert.match(popup, /id="resetAutomationButton"/);
  assert.match(background, /message\?\.type === "RESET_POSTPILOT_AUTOMATION"/);
  assert.match(background, /Pairing Mac dikekalkan/);
});

test("Vercel keeps Telegram and personal Ads CMO on isolated daily crons", () => {
  const config = JSON.parse(fs.readFileSync(path.join(root, "vercel.json"), "utf8"));
  assert.deepEqual(config.crons, [
    { path: "/api/cron/daily-ads-report", schedule: "0 22 * * *" },
    { path: "/api/cron/personal-ads-report", schedule: "0 22 * * *" },
  ]);
});
