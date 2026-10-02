const test = require("node:test");
const assert = require("node:assert/strict");
const { buildOperationsOverview, serviceContext, STALE_MS } = require("../lib/operations-center");

test("archived failures stay in history but not attention; new failures reappear", () => {
  const delivery = { id: "d1", status: "failed", client_code: "TEST", report_date: "2026-10-01", updated_at: "2026-10-02T01:00:00Z" };
  const job = { id: "j1", status: "failed", error: "Missing image", updatedAt: "2026-10-02T01:00:00Z" };
  const dismissedRows = ["telegram-delivery:TEST:2026-10-01", "postpilot-job:j1"].map((fingerprint) => ({ fingerprint, metadata: { dismissedAt: "2026-10-02T02:00:00Z" } }));
  const overview = buildOperationsOverview({ deliveries: [delivery], remote: { jobs: [job] }, dismissedRows });
  assert.equal(overview.incidents.length, 0);
  assert.equal(overview.summary.failed, 0);
  assert.equal(overview.recentOperations.filter((item) => item.status === "failed").length, 2);
  assert.equal(delivery.status, "failed");
  assert.equal(job.status, "failed");
  const fresh = buildOperationsOverview({ deliveries: [{ ...delivery, updated_at: "2026-10-02T03:00:00Z" }], remote: { jobs: [job] }, dismissedRows });
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
    remote: {},
    tiktok: { status: "disconnected", connected: false },
    now: new Date("2026-07-22T04:00:00.000Z"),
  });
  assert.equal(overview.overall, "operational");
  assert.equal(overview.health.find((item) => item.id === "tiktok").status, "setup");
  assert.equal(overview.health.find((item) => item.id === "mac_extension").status, "setup");
});

test("required stale service needs attention but is not critical", () => {
  const now = new Date("2026-07-22T04:00:00.000Z");
  const overview = buildOperationsOverview({
    clients: [{ code: "A", serviceStatus: "active", metadata: {} }],
    remote: {},
    tiktok: { status: "disconnected", connected: false },
    healthRows: [{ service_name: "google_drive", status: "healthy", detail: "Connected", last_checked_at: new Date(now.getTime() - STALE_MS - 1).toISOString() }],
    now,
  });
  assert.equal(overview.health.find((item) => item.id === "google_drive").status, "stale");
  assert.equal(overview.overall, "attention");
});

test("failed automation becomes a critical client-safe incident", () => {
  const overview = buildOperationsOverview({
    remote: {
      device: { id: "mac", status: "offline" },
      jobs: [{ id: "job-1", type: "threads_text", status: "failed", error: "Composer missing", createdAt: "2026-07-22T03:00:00.000Z" }],
    },
    tiktok: { status: "disconnected", connected: false },
  });
  assert.equal(overview.overall, "critical");
  assert.equal(overview.incidents[0].fingerprint, "postpilot-job:job-1");
  assert.equal(overview.incidents[0].action.operation, "retry");
});

test("service context only requires ad platforms used by active clients", () => {
  const context = serviceContext([
    { code: "META", serviceStatus: "active", metadata: { adsReportConfig: { platform: "meta", accountId: "1" } } },
    { code: "TT", serviceStatus: "paused", metadata: { adsReportConfig: { platform: "tiktok", accountId: "2" } } },
  ], {});
  assert.equal(context.meta_mcp.required, true);
  assert.equal(context.tiktok.required, false);
});

test("active automation exposes persisted recovery progress", () => {
  const overview = buildOperationsOverview({
    remote: {
      activeJob: {
        id: "job-recovery",
        type: "threads_text",
        status: "running",
        progress: {
          recoveryAttempt: 1,
          failureClass: "transient",
          nextRetryAt: "2026-07-22T15:00:00.000Z",
          message: "Auto recovery 1/2 dijadualkan.",
        },
      },
      jobs: [],
    },
    now: new Date("2026-07-22T14:59:00.000Z"),
  });
  assert.equal(overview.activeOperations[0].recovery.attempt, 1);
  assert.equal(overview.activeOperations[0].recovery.maxAttempts, 2);
  assert.equal(overview.activeOperations[0].recovery.failureClass, "transient");
});

test("Mac extension health and incident count as one attention item", () => {
  const overview = buildOperationsOverview({
    remote: { device: { id: "mac", status: "offline", lastSeenAt: "2026-07-22T01:00:00.000Z" }, jobs: [] },
    healthRows: [{ service_name: "mac_extension", status: "warning", detail: "Chrome Mac offline.", last_checked_at: "2026-07-22T01:00:00.000Z" }],
    incidentRows: [{ fingerprint: "service:mac_extension", service_name: "mac_extension", severity: "warning", status: "open", title: "mac_extension perlukan perhatian" }],
    now: new Date("2026-07-22T02:00:00.000Z"),
  });
  assert.equal(overview.summary.attention, 1);
  assert.equal(overview.incidents.length, 1);
});

test("healthy Mac extension suppresses a stale offline incident", () => {
  const overview = buildOperationsOverview({
    remote: { device: { id: "mac", status: "online", lastSeenAt: "2026-07-22T01:59:00.000Z" }, jobs: [] },
    healthRows: [{ service_name: "mac_extension", status: "healthy", detail: "Online", last_checked_at: "2026-07-22T01:59:00.000Z" }],
    incidentRows: [{ fingerprint: "service:mac_extension", service_name: "mac_extension", severity: "warning", status: "open", title: "mac_extension perlukan perhatian" }],
    now: new Date("2026-07-22T02:00:00.000Z"),
  });
  assert.equal(overview.overall, "operational");
  assert.equal(overview.summary.attention, 0);
  assert.equal(overview.incidents.length, 0);
});
