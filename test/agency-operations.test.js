const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const root = path.join(__dirname, "..");
const appSource = fs.readFileSync(path.join(root, "api_handlers", "app.js"), "utf8");
const apiSource = fs.readFileSync(path.join(root, "api_handlers", "clients", "agency-operations.js"), "utf8");
const dataSource = fs.readFileSync(path.join(root, "lib", "agency-operations.js"), "utf8");
const schemaSource = fs.readFileSync(path.join(root, "supabase", "schema.sql"), "utf8");

test("Phase 2 agency overview stays inside Client Pilot", () => {
  assert.match(appSource, /data-subtab-target="agency-overview-panel">Agency Overview/);
  assert.match(appSource, /id="agencyActiveClients"/);
  assert.match(appSource, /id="agencyMonthlyRevenue"/);
  assert.match(appSource, /id="agencyManagedBudget"/);
  assert.match(appSource, /id="agencyOpenTasks"/);
  assert.doesNotMatch(appSource, /data-tab-target="agencypilot"/);
});

test("Service management and task tracker provide functional controls", () => {
  for (const id of ["agencyServiceForm", "agencyTaskForm", "agencyWorkspaceClient", "agencyServiceList", "agencyTaskList"]) {
    assert.match(appSource, new RegExp('id="' + id + '"'));
  }
  assert.match(appSource, /saveAgencyOperation\("service"/);
  assert.match(appSource, /saveAgencyOperation\("task"/);
  assert.match(appSource, /updateAgencyTaskStatus/);
});

test("Agency operations API uses existing authentication and validates enums", () => {
  assert.match(apiSource, /requireAuth\(req\)/);
  assert.match(apiSource, /resource === "service"/);
  assert.match(apiSource, /resource === "task"/);
  assert.match(dataSource, /SERVICE_STATUSES = new Set\(\["active", "paused", "completed"\]\)/);
  assert.match(dataSource, /TASK_STATUSES = new Set\(\["todo", "in_progress", "done", "cancelled"\]\)/);
  assert.match(dataSource, /TASK_PRIORITIES = new Set\(\["low", "normal", "high", "urgent"\]\)/);
});

test("Agency operation tables are additive and service-role only", () => {
  assert.match(schemaSource, /create table if not exists public\.agency_services/);
  assert.match(schemaSource, /create table if not exists public\.agency_tasks/);
  assert.match(schemaSource, /alter table public\.agency_services enable row level security/);
  assert.match(schemaSource, /alter table public\.agency_tasks enable row level security/);
  assert.match(schemaSource, /grant select, insert, update, delete on public\.agency_services to service_role/);
  assert.match(schemaSource, /grant select, insert, update, delete on public\.agency_tasks to service_role/);
  assert.match(schemaSource, /revoke all on public\.agency_services from anon, authenticated/);
  assert.match(schemaSource, /revoke all on public\.agency_tasks from anon, authenticated/);
  assert.doesNotMatch(schemaSource, /drop table (if exists )?public\.agency_(services|tasks)/);
});

test("Phase 3 adds recurring delivery templates and a 14 day calendar", () => {
  for (const id of ["agencyDeliveryCalendar", "agencyTemplateForm", "agencyTemplateList", "generateAgencyRecurringButton"]) {
    assert.match(appSource, new RegExp(`id="${id}"`));
  }
  assert.match(appSource, /Delivery Calendar/);
  assert.match(appSource, /Recurring Deliveries/);
  assert.match(appSource, /Sync Recurring Tasks/);
  assert.match(appSource, /openAgencyWorkModule/);
});

test("recurring delivery generation is lazy, idempotent and has no new polling", () => {
  assert.match(dataSource, /generateDueAgencyTasks/);
  assert.match(dataSource, /on_conflict=template_id,due_date/);
  assert.match(dataSource, /resolution=ignore-duplicates/);
  assert.match(dataSource, /Asia\/Kuala_Lumpur/);
  assert.doesNotMatch(appSource, /setInterval\([^)]*agency/i);
});

test("Phase 3 migration protects templates and links generated tasks", () => {
  assert.match(schemaSource, /create table if not exists public\.agency_task_templates/);
  assert.match(schemaSource, /template_id uuid references public\.agency_task_templates/);
  assert.match(schemaSource, /agency_tasks_template_due_uidx/);
  assert.match(schemaSource, /alter table public\.agency_task_templates enable row level security/);
  assert.match(schemaSource, /grant select, insert, update, delete on public\.agency_task_templates to service_role/);
  assert.match(schemaSource, /revoke all on public\.agency_task_templates from anon, authenticated/);
});
