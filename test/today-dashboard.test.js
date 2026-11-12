const test = require("node:test");
const assert = require("node:assert/strict");
const { buildTodayDashboard } = require("../lib/today-dashboard");

const now = new Date("2026-07-22T02:00:00.000Z");

test("Today dashboard prioritizes expiring TikTok authorization", () => {
  const dashboard = buildTodayDashboard({
    now,
    clients: [{ serviceStatus: "active" }],
    tiktok: { connected: true, expiresAt: "2026-07-27T02:00:00.000Z" },
  });
  assert.equal(dashboard.nextAction.id, "tiktok-expiry");
  assert.equal(dashboard.nextAction.subtab, "settings-panel");
  assert.equal(dashboard.summary.attention, 1);
});

test("Today dashboard counts today's completed work in Kuala Lumpur", () => {
  const dashboard = buildTodayDashboard({
    now,
    activities: [
      { type: "invoice_uploaded", createdAt: "2026-07-22T01:00:00.000Z" },
      { type: "settings_updated", createdAt: "2026-07-22T01:30:00.000Z" },
    ],
  });
  assert.equal(dashboard.summary.completedToday, 1);
});

test("Today dashboard keeps working with empty partial data", () => {
  const dashboard = buildTodayDashboard({ now });
  assert.equal(dashboard.nextAction.id, "all-clear");
  assert.deepEqual(dashboard.clients, { total: 0, active: 0 });
});
