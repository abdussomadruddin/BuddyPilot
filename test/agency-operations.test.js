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

test("Phase 4 adds agency profitability and team capacity", () => {
  for (const id of ["agencyGrossProfit", "agencyGrossMargin", "agencyCompletionRate", "agencyOverdueTasks", "agencyClientProfitability", "agencyTeamCapacity"]) {
    assert.match(appSource, new RegExp(`id="${id}"`));
  }
  assert.match(appSource, /Agency Performance/);
  assert.match(appSource, /Team capacity/);
  assert.match(dataSource, /calculateAgencyInsights/);
  assert.match(dataSource, /completionRate/);
  assert.match(dataSource, /overdueTaskCount/);
});

test("Phase 4 stores optional internal cost and task effort safely", () => {
  assert.match(schemaSource, /internal_monthly_cost numeric\(12, 2\)/);
  assert.match(schemaSource, /estimated_minutes integer not null default 0/);
  assert.match(schemaSource, /agency_services_internal_cost_check/);
  assert.match(schemaSource, /agency_tasks_estimated_minutes_check/);
  assert.match(schemaSource, /agency_task_templates_estimated_minutes_check/);
  assert.match(dataSource, /internal_monthly_cost: optionalMoney/);
  assert.match(dataSource, /estimated_minutes: integer/);
  assert.doesNotMatch(appSource, /setInterval\([^)]*agency/i);
});

test("Phase 5 adds client health and retention controls", () => {
  for (const id of ["agencyHealthyClients", "agencyWatchClients", "agencyRiskClients", "agencyCheckInsDue", "agencyHealthBoard", "agencyHealthForm"]) {
    assert.match(appSource, new RegExp(`id="${id}"`));
  }
  assert.match(appSource, /Client Health & Retention/);
  assert.match(appSource, /Save Health Check-in/);
  assert.match(apiSource, /resource === "health"/);
  assert.match(dataSource, /calculateClientHealth/);
  assert.match(dataSource, /saveAgencyHealth/);
});

test("Phase 5 health storage is additive and service-role only", () => {
  assert.match(schemaSource, /create table if not exists public\.agency_client_health/);
  assert.match(schemaSource, /relationship_status in \('strong', 'stable', 'watch', 'risk'\)/);
  assert.match(schemaSource, /renewal_stage in \('none', 'upcoming', 'proposed', 'renewed', 'churn_risk'\)/);
  assert.match(schemaSource, /alter table public\.agency_client_health enable row level security/);
  assert.match(schemaSource, /grant select, insert, update, delete on public\.agency_client_health to service_role/);
  assert.match(schemaSource, /revoke all on public\.agency_client_health from anon, authenticated/);
  assert.doesNotMatch(schemaSource, /drop table (if exists )?public\.agency_client_health/);
});

test("Phase 5 health scoring has no background polling", () => {
  assert.match(dataSource, /Health check belum diset/);
  assert.match(dataSource, /Check-in overdue/);
  assert.match(dataSource, /Renewal belum dimulakan/);
  assert.doesNotMatch(appSource, /setInterval\([^)]*health/i);
});

test("Phase 6 adds renewal forecast and growth opportunity controls", () => {
  for (const id of ["agencyRenewalValue", "agencyPipelineValue", "agencyWeightedForecast", "agencyAtRiskRevenue", "agencyGrowthForecast", "agencyOpportunityForm", "agencyOpportunityList"]) {
    assert.match(appSource, new RegExp(`id="${id}"`));
  }
  assert.match(appSource, /Renewal & Growth Pipeline/);
  assert.match(appSource, /saveAgencyOperation\("opportunity"/);
  assert.match(apiSource, /resource === "opportunity"/);
  assert.match(dataSource, /calculateGrowthPipeline/);
  assert.match(dataSource, /weightedForecast/);
});

test("Phase 6 growth pipeline is additive and service-role only", () => {
  assert.match(schemaSource, /create table if not exists public\.agency_opportunities/);
  assert.match(schemaSource, /opportunity_type in \('upsell', 'cross_sell', 'renewal', 'expansion'\)/);
  assert.match(schemaSource, /stage in \('idea', 'discovery', 'proposal', 'won', 'lost'\)/);
  assert.match(schemaSource, /alter table public\.agency_opportunities enable row level security/);
  assert.match(schemaSource, /grant select, insert, update, delete on public\.agency_opportunities to service_role/);
  assert.match(schemaSource, /revoke all on public\.agency_opportunities from anon, authenticated/);
  assert.doesNotMatch(schemaSource, /drop table (if exists )?public\.agency_opportunities/);
});

test("Phase 6 forecast is request-driven without new polling", () => {
  assert.match(dataSource, /setUTCDate\(horizon\.getUTCDate\(\) \+ 90\)/);
  assert.match(dataSource, /const weights = \{ idea: 0\.1, discovery: 0\.3, proposal: 0\.6 \}/);
  assert.doesNotMatch(appSource, /setInterval\([^)]*(growth|opportunity|forecast)/i);
});
