const test = require("node:test");
const assert = require("node:assert/strict");
const { weeklyReportSchedule, runWeeklyReports } = require("../lib/weekly-reports");

test("weekly upload is Monday 6am KL and uses the previous complete week", () => {
  assert.deepEqual(weeklyReportSchedule("2026-10-04T22:30:00Z"), { due: true, startDate: "2026-09-28", endDate: "2026-10-04" });
  assert.equal(weeklyReportSchedule("2026-10-05T02:00:00Z").due, false);
});

test("outside schedule does no work and failed registry stops all clients", async () => {
  const load = async () => { throw new Error("must not load"); };
  assert.equal((await runWeeklyReports({ now: "2026-10-03T00:00:00Z", load })).skipped, true);
  await assert.rejects(runWeeklyReports({ now: "2026-10-04T22:00:00Z", load: async () => ({ registryStatus: { ok: false } }) }), /registry unavailable/);
});

test("weekly jobs isolate failures, skip claimed jobs, use both platforms and preserve Drive files", async () => {
  const uploaded = [], saved = [];
  const client = (code, platform) => ({ code, onboardingStatus: "completed", serviceStatus: "active", metadata: { adsReportConfig: { platform, accountId: "123" } } });
  const result = await runWeeklyReports({
    now: "2026-10-04T22:00:00Z",
    load: async () => ({ registryStatus: { ok: true }, clients: [client("META", "meta"), client("TT", "tiktok"), client("DONE", "meta"), { ...client("PAUSED", "meta"), serviceStatus: "paused" }] }),
    claim: async (code) => code === "DONE" ? null : { client_code: code },
    meta: async () => ({ source: "meta" }), tiktok: async () => { throw new Error("authorization failed"); },
    draft: (data) => ({ adSpend: 0, leadsGenerated: 0, source: data.source }),
    upload: async (body, options) => { uploaded.push({ body, options }); return { fileId: "drive-id" }; },
    finish: async (job, data, error) => saved.push({ job, data, error }), failure: async () => {}, success: async () => {},
  });
  assert.equal(result.ok, false);
  assert.equal(uploaded.length, 1);
  assert.equal(uploaded[0].options.preserveExisting, true);
  assert.equal(uploaded[0].body.startDate, "2026-09-28");
  assert.deepEqual(result.results.map((item) => item.status), ["uploaded", "failed", "skipped"]);
  assert.equal(saved.length, 2);
});
