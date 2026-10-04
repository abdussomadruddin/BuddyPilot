const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { weeklyReportReminder, sendWeeklyReportReminder } = require("../lib/weekly-report-reminder");
const handler = require("../api_handlers/cron/weekly-report-reminder");

test("Monday 10am MYT reminder links to clients and covers the previous complete week", () => {
  const reminder = weeklyReportReminder("2026-10-05T02:00:00Z");
  assert.equal(reminder.due, true);
  assert.equal(reminder.startDate, "2026-09-28");
  assert.equal(reminder.endDate, "2026-10-04");
  assert.equal(reminder.payload.url, "/?tab=clientpilot&panel=client-list-panel");
  assert.equal(reminder.payload.tag, "weekly-report-reminder-2026-10-05");
  assert.match(reminder.payload.body, /WhatsApp/);
  assert.equal(weeklyReportReminder("2026-10-05T02:59:00Z").due, true);
});

test("dates remain correct across year boundaries and outside the schedule", () => {
  const reminder = weeklyReportReminder("2027-01-04T02:00:00Z");
  assert.equal(reminder.startDate, "2026-12-28");
  assert.equal(reminder.endDate, "2027-01-03");
  for (const date of ["2026-10-04T02:00:00Z", "2026-10-05T01:59:00Z", "2026-10-05T03:00:00Z"]) {
    assert.equal(weeklyReportReminder(date).due, false);
  }
});

test("sender skips outside schedule, sends on schedule, and propagates failures", async () => {
  let sent = 0;
  const send = async () => { sent++; return { sent: 1, removed: 0 }; };
  assert.equal((await sendWeeklyReportReminder({ now: "2026-10-02T02:00:00Z", send })).skipped, true);
  assert.equal(sent, 0);
  assert.equal((await sendWeeklyReportReminder({ now: "2026-10-05T02:00:00Z", send })).sent, 1);
  assert.equal(sent, 1);
  await assert.rejects(sendWeeklyReportReminder({ now: "2026-10-05T02:00:00Z", send: async () => { throw new Error("Push failed"); } }), /Push failed/);
});

test("cron rejects unauthenticated requests and unsupported methods", async () => {
  for (const [method, statusCode] of [["POST", 405], ["GET", 401]]) {
    const res = { setHeader() {}, end(body) { this.body = JSON.parse(body); } };
    await handler({ method, headers: {} }, res);
    assert.equal(res.statusCode, statusCode);
    assert.equal(res.body.ok, false);
  }
});

test("Vercel schedules only one weekly invocation at 02:00 UTC", () => {
  const config = JSON.parse(fs.readFileSync(require.resolve("../vercel.json"), "utf8"));
  const cron = config.crons.filter((item) => item.path === "/api/cron/weekly-report-reminder");
  assert.deepEqual(cron, [{ path: "/api/cron/weekly-report-reminder", schedule: "0 2 * * 1" }]);
});

test("client reminder overrides previously selected report and invoice panels", () => {
  const app = require("./helpers/ui-source")();
  assert.match(app, /requestedTab === "clientpilot" && requestedPanel === "client-list-panel"/);
  assert.match(app, /if \(group === "client-modules"\) saved = "client-overview-panel"/);
  assert.match(app, /if \(group === "client"\) saved = "client-list-panel"/);
  assert.match(app, /weeklyReportPushButton.addEventListener\("click"/);
});
