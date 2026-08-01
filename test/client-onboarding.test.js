const test = require("node:test");
const assert = require("node:assert/strict");
const { buildInvoiceListFromClients, onboardingChecks } = require("../lib/invoices");
const { serviceContext } = require("../lib/operations-center");
const { buildTodayDashboard } = require("../lib/today-dashboard");

function readyClient(overrides = {}) {
  return {
    code: "ACME",
    brandClient: "ACME",
    name: "ACME",
    contactName: "Ali",
    email: "ali@example.com",
    phone: "+60123456789",
    companyName: "ACME Sdn Bhd",
    billingName: "ACME Sdn Bhd",
    monthlyRetainer: 1500,
    serviceType: "Meta Ads Management",
    monthlyAdBudget: 5000,
    startDate: "2026-07-01",
    agencyStatus: "active",
    driveFolderId: "drive-client",
    weeklyReportFolderId: "drive-report",
    invoiceReceiptFolderId: "drive-invoice",
    serviceStatus: "active",
    onboardingStatus: "completed",
    metadata: {
      adsReportConfig: {
        platform: "meta",
        accountId: "act-1",
        accountName: "ACME Ads",
        currency: "MYR",
        resultMetric: "leads",
      },
    },
    ...overrides,
  };
}

test("onboarding requires billing, an ads account, and all Drive folders", () => {
  assert.deepEqual(onboardingChecks(readyClient()), {
    details: true,
    ads: true,
    drive: true,
    telegram: false,
  });
  assert.equal(onboardingChecks(readyClient({ monthlyRetainer: 0 })).details, false);
  assert.equal(onboardingChecks(readyClient({ phone: "" })).details, false);
  assert.equal(onboardingChecks(readyClient({ weeklyReportFolderId: "" })).drive, false);
});

test("in-progress onboarding clients are excluded from invoices", () => {
  const config = {
    timezone: "Asia/Kuala_Lumpur",
    defaults: { currency: "MYR", taxRate: 0, terms: "due_on_receipt" },
    business: {},
  };
  const invoices = buildInvoiceListFromClients("2026-07", [
    readyClient(),
    readyClient({ code: "DRAFT", name: "Draft", onboardingStatus: "in_progress" }),
  ], config);
  assert.deepEqual(invoices.map((item) => item.clientCode), ["ACME"]);
});

test("setup clients do not make Ads integrations required", () => {
  const context = serviceContext([
    readyClient({ onboardingStatus: "in_progress", metadata: { adsReportConfig: { platform: "meta", accountId: "act-1" } } }),
  ], {});
  assert.equal(context.meta_adflow.required, false);
  assert.equal(context.google_drive.required, false);
});

test("dashboard reports setup clients separately from active work", () => {
  const dashboard = buildTodayDashboard({
    clients: [readyClient(), readyClient({ code: "DRAFT", onboardingStatus: "in_progress" })],
  });
  assert.deepEqual(dashboard.clients, { total: 2, active: 1 });
});
