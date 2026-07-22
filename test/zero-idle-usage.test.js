const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");

test("Post Pilot has no periodic Vercel queue polling", () => {
  const background = fs.readFileSync(path.join(root, "chrome-extension/postpilot/background.js"), "utf8");
  assert.doesNotMatch(background, /periodInMinutes\s*:\s*0\.5/);
  assert.doesNotMatch(background, /alarm\.name\s*===\s*REMOTE_POLL_ALARM/);
  assert.match(background, /message\.event === "broadcast"/);
  assert.match(background, /processRemoteQueue\(\)\.catch/);
});

test("Vercel uses one combined daily cron", () => {
  const config = JSON.parse(fs.readFileSync(path.join(root, "vercel.json"), "utf8"));
  assert.deepEqual(config.crons, [{ path: "/api/cron/daily-ads-report", schedule: "0 22 * * *" }]);
});
