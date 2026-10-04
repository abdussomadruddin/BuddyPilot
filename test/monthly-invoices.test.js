const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { monthlyInvoiceSchedule, runMonthlyInvoiceJob } = require("../lib/monthly-invoices");
const { uploadMissingMonthlyInvoices } = require("../lib/invoices");
const { claimMonthlyInvoiceJob, finishMonthlyInvoiceJob, listInvoiceUploadsForPeriod } = require("../lib/supabase-db");

const uploadTime = "2026-10-31T22:00:00Z";
const reminderTime = "2026-11-01T02:00:00Z";

test("6am MYT upload covers all month ends, leap years and the year boundary", () => {
  for (const year of [2026, 2027, 2028]) {
    for (let month = 1; month <= 12; month++) {
      const first = new Date(Date.UTC(year, month - 1, 1, -2));
      const schedule = monthlyInvoiceSchedule(first);
      assert.equal(schedule.uploadDue, true, first.toISOString());
      assert.equal(schedule.period, `${year}-${String(month).padStart(2, "0")}`);
      assert.equal(schedule.reminderDue, false);
    }
  }
  for (const value of ["2026-10-28T22:00:00Z", "2026-10-30T22:00:00Z", "2026-10-31T21:59:00Z", "2026-10-31T23:00:00Z"]) {
    assert.equal(monthlyInvoiceSchedule(value).uploadDue, false);
  }
  assert.equal(monthlyInvoiceSchedule("2026-10-31T22:59:00Z").uploadDue, true);
  assert.throws(() => monthlyInvoiceSchedule("invalid"), /Invalid/);
});

test("10am reminder deep-links to the correct invoice month and requires manual WhatsApp", () => {
  const schedule = monthlyInvoiceSchedule(reminderTime);
  assert.equal(schedule.reminderDue, true);
  assert.equal(schedule.uploadDue, false);
  assert.equal(schedule.payload.url, "/?tab=invoicepilot&panel=invoice-panel&period=2026-11");
  assert.match(schedule.payload.body, /WhatsApp.*manual/);
  assert.equal(schedule.payload.tag, "monthly-invoice-reminder-2026-11");
  assert.equal(monthlyInvoiceSchedule("2026-11-01T02:59:00Z").reminderDue, true);
  assert.equal(monthlyInvoiceSchedule("2026-11-02T02:00:00Z").reminderDue, false);
});

function jobDependencies(overrides = {}) {
  return { now: uploadTime, claim: async (kind, period) => ({ kind, period, claim_token: "token" }),
    finish: async () => {}, upload: async () => ({ uploaded: 2, skipped: 1, failed: 0 }),
    send: async () => ({ sent: 1 }), failure: async () => {}, success: async () => {}, ...overrides };
}

test("outside schedule and completed jobs cause no upload or notification", async () => {
  const forbidden = async () => { assert.fail("unexpected side effect"); };
  const skip = await runMonthlyInvoiceJob("upload", jobDependencies({ now: reminderTime, claim: forbidden }));
  assert.equal(skip.skipped, true);
  assert.equal((await runMonthlyInvoiceJob("upload", jobDependencies({ claim: async () => null, upload: forbidden, send: forbidden }))).skipped, true);
});

test("concurrent runs claim only once, and upload never sends a notification", async () => {
  let claimed = false;
  let uploaded = 0;
  const dependencies = jobDependencies({ claim: async (kind, period) => {
    if (claimed) return null;
    claimed = true;
    return { kind, period };
  }, upload: async () => { uploaded++; return { failed: 0 }; }, send: async () => assert.fail("upload must not send") });
  const results = await Promise.all([runMonthlyInvoiceJob("upload", dependencies), runMonthlyInvoiceJob("upload", dependencies)]);
  assert.equal(uploaded, 1);
  assert.equal(results.filter((result) => result.skipped).length, 1);
});

test("reminder is independent of upload and records successful delivery count", async () => {
  let recorded;
  const result = await runMonthlyInvoiceJob("reminder", jobDependencies({ now: reminderTime,
    upload: async () => assert.fail("reminder must not upload"),
    finish: async (job, data) => { recorded = { job, data }; } }));
  assert.equal(result.sent, 1);
  assert.equal(recorded.job.kind, "reminder");
});

test("partial and complete failures retain successes and surface operational incidents", async () => {
  let incident;
  let finished;
  const dependencies = jobDependencies({ upload: async () => ({ uploaded: 1, skipped: 0, failed: 1 }),
    finish: async (job, data, error) => { finished = { data, error }; }, failure: async (value) => { incident = value; } });
  assert.equal((await runMonthlyInvoiceJob("upload", dependencies)).ok, false);
  assert.equal(finished.data.uploaded, 1);
  assert.match(finished.error, /failed/);
  assert.equal(incident.action.tab, "invoicepilot");
  await assert.rejects(runMonthlyInvoiceJob("upload", { ...dependencies, upload: async () => { throw new Error("Drive offline"); } }), /Drive offline/);
  assert.equal(finished.error, "Drive offline");
});

function invoiceDependencies(clients, overrides = {}) {
  return {
    load: async () => ({ registryStatus: { ok: true }, clients, config: { timezone: "Asia/Kuala_Lumpur", defaults: {}, business: {} } }),
    assertReady: () => {}, listUploads: async () => [], drive: {},
    render: async () => Buffer.from("pdf"), upload: async () => ({ id: "drive-id" }), record: async () => {}, ...overrides,
  };
}
const client = (code, extra = {}) => ({ code, name: code, monthlyRetainer: 1500, discount: 100, agencyStatus: "active", onboardingStatus: "completed", ...extra });

test("only active, completed-onboarding clients are invoiced using existing billing rules", async () => {
  let invoice;
  const clients = [client("ACTIVE"), client("PAUSED", { serviceStatus: "paused" }), client("SETUP", { onboardingStatus: "in_progress" }), client("ARCHIVED", { agencyStatus: "archived" }), client("COMPLETED", { agencyStatus: "completed" }), client("DELETED", { deletedAt: "2026-01-01" })];
  const result = await uploadMissingMonthlyInvoices({ period: "2026-11" }, invoiceDependencies(clients, { upload: async (args) => {
    invoice = args.invoice;
    assert.equal(args.preserveExisting, true);
    return { id: "drive-id" };
  } }));
  assert.equal(result.selected, 1);
  assert.equal(result.uploaded, 1);
  assert.equal(invoice.invoiceNumber, "INV-202611-ACTIVE");
  assert.equal(invoice.total, 1400);
});

test("persisted invoices and Drive-existing invoices are preserved without recording inferred values", async () => {
  let uploads = 0;
  const result = await uploadMissingMonthlyInvoices({ period: "2026-11" }, invoiceDependencies([client("DB"), client("DRIVE")], {
    listUploads: async () => [{ client_code: "DB", drive_file_id: "saved" }],
    upload: async () => { uploads++; return { id: "existing", skipped: true }; },
    record: async () => assert.fail("must not overwrite historical invoice"),
  }));
  assert.equal(uploads, 1);
  assert.equal(result.skipped, 2);
});

test("a failed client does not stop other uploads; retry skips completed ones", async () => {
  const stored = [];
  let fail = true;
  const dependencies = invoiceDependencies([client("A"), client("B")], {
    listUploads: async () => stored,
    upload: async ({ invoice }) => { if (fail && invoice.client.code === "A") throw new Error("Drive failed"); return { id: invoice.client.code }; },
    record: async ({ invoice, upload }) => stored.push({ client_code: invoice.client.code, drive_file_id: upload.id }),
  });
  const first = await uploadMissingMonthlyInvoices({ period: "2026-11" }, dependencies);
  assert.equal(first.failed, 1);
  assert.equal(first.uploaded, 1);
  fail = false;
  const retry = await uploadMissingMonthlyInvoices({ period: "2026-11" }, dependencies);
  assert.equal(retry.skipped, 1);
  assert.equal(retry.uploaded, 1);
});

test("automation fails closed on stale registry or bank configuration, and respects execution deadline", async () => {
  const dependencies = invoiceDependencies([client("A")]);
  await assert.rejects(uploadMissingMonthlyInvoices({ period: "2026-11" }, { ...dependencies, load: async () => ({ registryStatus: { ok: false, error: "Registry offline" } }) }), /Registry offline/);
  await assert.rejects(uploadMissingMonthlyInvoices({ period: "2026-11" }, { ...dependencies, assertReady: () => { throw new Error("Bank missing"); } }), /Bank missing/);
  const result = await uploadMissingMonthlyInvoices({ period: "2026-11", deadline: 0 }, { ...dependencies, upload: async () => assert.fail("expired run") });
  assert.equal(result.failed, 1);
  assert.equal((await uploadMissingMonthlyInvoices({ period: "2026-11" }, invoiceDependencies([]))).selected, 0);
});

test("cron endpoints require secret and reject unsupported methods", async () => {
  for (const name of ["monthly-invoices", "monthly-invoice-reminder"]) {
    const handler = require(`../api_handlers/cron/${name}`);
    for (const [method, status] of [["POST", 405], ["GET", 401]]) {
      const res = { setHeader() {}, end(body) { this.body = JSON.parse(body); } };
      await handler({ method, headers: {} }, res);
      assert.equal(res.statusCode, status);
      assert.equal(res.body.ok, false);
    }
  }
});

test("migration restricts access and fences claims; UI retains manual flow and month deep-link", () => {
  const sql = fs.readFileSync(require.resolve("../supabase/migrations/20261002164313_monthly_invoice_jobs.sql"), "utf8");
  assert.match(sql, /enable row level security/);
  assert.match(sql, /security invoker set search_path = ''/);
  assert.match(sql, /job.status = 'failed'.*job.status = 'processing'/);
  assert.match(sql, /grant execute.*service_role/);
  assert.doesNotMatch(sql, /drop table|truncate|delete from/i);
  const app = fs.readFileSync(require.resolve("../api_handlers/app"), "utf8");
  assert.match(app, /monthlyInvoicePushButton.addEventListener\("click"/);
  assert.match(app, /requestedInvoicePeriod : localStorage/);
  assert.match(app, /Tiada WhatsApp dihantar automatik/);
  assert.match(app, /Generate &amp; Upload|Generate & Upload/);
});

test("REST claims are atomic and completion is fenced by the current lease token", async (t) => {
  const previous = { url: process.env.SUPABASE_URL, key: process.env.SUPABASE_SERVICE_ROLE_KEY };
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-only";
  t.after(() => {
    for (const [key, value] of [["SUPABASE_URL", previous.url], ["SUPABASE_SERVICE_ROLE_KEY", previous.key]]) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  });
  const job = { kind: "upload", period: "2026-11", claim_token: "lease-123" };
  let complete = false;
  t.mock.method(global, "fetch", async (url, options) => {
    const target = new URL(url);
    if (target.pathname.endsWith("rpc/claim_monthly_invoice_job")) {
      assert.equal(options.method, "POST");
      assert.deepEqual(JSON.parse(options.body), { p_kind: "upload", p_period: "2026-11" });
      return new Response(JSON.stringify([job]));
    }
    if (target.pathname.endsWith("monthly_invoice_jobs")) {
      assert.equal(target.searchParams.get("claim_token"), "eq.lease-123");
      assert.equal(target.searchParams.get("status"), "eq.processing");
      assert.equal(options.method, "PATCH");
      assert.equal(JSON.parse(options.body).status, "completed");
      return new Response(JSON.stringify(complete ? [] : [job]));
    }
    assert.equal(target.searchParams.get("period"), "eq.2026-11");
    assert.equal(target.searchParams.get("invoice_number"), "like.INV-*");
    assert.equal(target.searchParams.get("offset"), "0");
    return new Response(JSON.stringify([{ client_code: "A", drive_file_id: "a" }]));
  });
  assert.deepEqual(await claimMonthlyInvoiceJob("upload", "2026-11"), job);
  assert.deepEqual(await finishMonthlyInvoiceJob(job, { uploaded: 1 }), job);
  complete = true;
  await assert.rejects(finishMonthlyInvoiceJob(job, {}), /lease no longer belongs/);
  assert.equal((await listInvoiceUploadsForPeriod("2026-11")).length, 1);
});

test("rendered deep-link regex overrides stale month but rejects invalid input", async (t) => {
  const previous = process.env.APP_PASSWORD;
  process.env.APP_PASSWORD = "local-test-only";
  t.after(() => { if (previous === undefined) delete process.env.APP_PASSWORD; else process.env.APP_PASSWORD = previous; });
  let html;
  await require("../api_handlers/app")({ method: "GET", headers: { cookie: require("../lib/auth").authCookie() } }, { setHeader() {}, end(value) { html = value; } });
  const source = html.match(/const requestedInvoicePeriod = ([\s\S]*?)\n    receiptPeriod.value/)[0].replace(/\n    receiptPeriod.value$/, "");
  for (const [period, expected] of [["2026-11", "2026-11"], ["2026-99", "2026-07"], ["bad", "2026-07"]]) {
    const context = vm.createContext({ URLSearchParams, window: { location: { search: `?period=${period}` } }, invoicePeriod: {}, localStorage: { getItem: () => "2026-07" }, defaultInvoicePeriod: () => "2026-10" });
    vm.runInContext(`const requestedInvoicePeriod = ${source.slice("const requestedInvoicePeriod = ".length)}`, context);
    assert.equal(context.invoicePeriod.value, expected);
  }
});
