const test = require("node:test");
const assert = require("node:assert/strict");
const { buildOperationsOverview, serviceContext, STALE_MS } = require("../lib/operations-center");

test("removed Facebook Page integration does not affect dashboard health", () => {
  const overview = buildOperationsOverview({
    healthRows: [{ service_name: "facebook_page", status: "down" }],
    incidentRows: [{ fingerprint: "service:facebook_page", service_name: "facebook_page", severity: "critical", status: "open" }],
  });
  assert.equal(overview.health.some((item) => item.id === "facebook_page"), false);
  assert.equal(overview.incidents.some((item) => item.service === "facebook_page"), false);
  assert.equal(serviceContext().facebook_page, undefined);
});

test("archived failures stay in history but not attention; new failures reappear", () => {
  const delivery = { id: "d1", status: "failed", client_code: "TEST", report_date: "2026-10-01", updated_at: "2026-10-02T01:00:00Z" };
  const dismissedRows = ["telegram-delivery:TEST:2026-10-01"].map((fingerprint) => ({ fingerprint, metadata: { dismissedAt: "2026-10-02T02:00:00Z" } }));
  const overview = buildOperationsOverview({ deliveries: [delivery], dismissedRows });
  assert.equal(overview.incidents.length, 0);
  assert.equal(overview.summary.failed, 0);
  assert.equal(overview.recentOperations.filter((item) => item.status === "failed").length, 1);
  assert.equal(delivery.status, "failed");
  const fresh = buildOperationsOverview({ deliveries: [{ ...delivery, updated_at: "2026-10-02T03:00:00Z" }], dismissedRows });
  assert.equal(fresh.incidents.length, 1);
});

test("archive does not conceal current required service problems", () => {
  const overview = buildOperationsOverview({
    databaseRead: { ok: false, error: "Unavailable" },
    dismissedRows: [{ fingerprint: "service:supabase", metadata: { dismissedAt: "2026-10-03T00:00:00Z" } }],
  });
  assert.equal(overview.overall, "critical");
  assert.equal(overview.summary.attention, 1);
});

test("failed database reads cannot appear healthy", () => {
  const overview = buildOperationsOverview({ databaseRead: { ok: false, error: "Project unavailable" } });
  assert.equal(overview.health.find((item) => item.id === "supabase").status, "down");
  assert.equal(overview.overall, "critical");
});

test("healthy Telegram bot does not hide failed client deliveries", () => {
  const overview = buildOperationsOverview({
    deliveries: [{ id: "failed-report", client_code: "TEST", status: "failed", report_date: "2026-10-01" }],
    healthRows: [{ service_name: "telegram", status: "healthy", last_checked_at: "2026-10-02T00:00:00Z" }],
    now: new Date("2026-10-02T00:01:00Z"),
  });
  assert.equal(overview.incidents.length, 1);
  assert.equal(overview.overall, "critical");
});

test("unused integrations stay setup without affecting overall health", () => {
  const overview = buildOperationsOverview({
    clients: [],
    tiktok: { status: "disconnected", connected: false },
    now: new Date("2026-07-22T04:00:00.000Z"),
  });
  assert.equal(overview.overall, "operational");
  assert.equal(overview.health.find((item) => item.id === "tiktok").status, "setup");
  assert.equal(overview.health.some((item) => item.id === "mac_extension"), false);
});

test("required stale service needs attention but is not critical", () => {
  const now = new Date("2026-07-22T04:00:00.000Z");
  const overview = buildOperationsOverview({
    clients: [{ code: "A", serviceStatus: "active", metadata: {} }],
    tiktok: { status: "disconnected", connected: false },
    healthRows: [{ service_name: "google_drive", status: "healthy", detail: "Connected", last_checked_at: new Date(now.getTime() - STALE_MS - 1).toISOString() }],
    now,
  });
  assert.equal(overview.health.find((item) => item.id === "google_drive").status, "stale");
  assert.equal(overview.overall, "attention");
});

test("service context only requires ad platforms used by active clients", () => {
  const context = serviceContext([
    { code: "META", serviceStatus: "active", metadata: { adsReportConfig: { platform: "meta", accountId: "1" } } },
    { code: "TT", serviceStatus: "paused", metadata: { adsReportConfig: { platform: "tiktok", accountId: "2" } } },
  ], {});
  assert.equal(context.meta_mcp.required, true);
  assert.equal(context.tiktok.required, false);
});
