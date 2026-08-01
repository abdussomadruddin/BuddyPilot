const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const root = path.join(__dirname, "..");
const appSource = fs.readFileSync(path.join(root, "api_handlers", "app.js"), "utf8");
const clientApiSource = fs.readFileSync(path.join(root, "api_handlers", "clients.js"), "utf8");
const schemaSource = fs.readFileSync(path.join(root, "supabase", "schema.sql"), "utf8");

test("Agency foundation is assimilated into Client Pilot", () => {
  assert.match(appSource, />Agency Clients<\/button>/);
  assert.match(appSource, />Add Agency Client<\/button>/);
  assert.match(appSource, /id="client-detail-panel"/);
  assert.doesNotMatch(appSource, /data-tab-target="agencypilot"/);
});

test("Agency Client form contains all Phase 1 fields and statuses", () => {
  for (const name of [
    "brandClient", "contactName", "phone", "email", "serviceType",
    "monthlyRetainer", "monthlyAdBudget", "startDate", "agencyStatus", "notes",
  ]) {
    assert.match(appSource, new RegExp('name="' + name + '"'));
  }
  for (const status of ["onboarding", "active", "paused", "completed", "archived"]) {
    assert.match(appSource, new RegExp('<option value="' + status + '">'));
  }
});

test("Agency Client API stays behind existing auth and uses soft archive", () => {
  assert.match(clientApiSource, /requireAuth\(req\)/);
  assert.match(clientApiSource, /agencyStatus === "archived"/);
  assert.match(appSource, /agencyStatus: "archived"/);
  assert.match(appSource, /Data, history dan folder Drive akan dikekalkan/);
});

test("Agency migration is additive and service-only", () => {
  for (const column of ["service_type", "monthly_ad_budget", "start_date", "agency_status", "notes", "archived_at"]) {
    assert.match(schemaSource, new RegExp('add column if not exists ' + column));
  }
  assert.match(schemaSource, /agency_status in \('onboarding', 'active', 'paused', 'completed', 'archived'\)/);
  assert.match(schemaSource, /alter table public\.invoice_clients enable row level security/);
  assert.match(schemaSource, /grant select, insert, update, delete on public\.invoice_clients to service_role/);
  assert.match(schemaSource, /revoke all on public\.invoice_clients from anon, authenticated/);
  assert.doesNotMatch(schemaSource, /drop table public\.invoice_clients/);
});
