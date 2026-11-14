const routes = {
  "client-ads-monitor": () => require("../api_handlers/client-ads-monitor"),
  activity: () => require("../api_handlers/activity"),
  app: () => require("../api_handlers/app"),
  "bank-accounts": () => require("../api_handlers/bank-accounts"),
  "bank-accounts/qr": () => require("../api_handlers/bank-accounts/qr"),
  clients: () => require("../api_handlers/clients"),
  "clients/agency-operations": () => require("../api_handlers/clients/agency-operations"),
  "clients/onboarding": () => require("../api_handlers/clients/onboarding"),
  "clients/intake": () => require("../api_handlers/clients/intake"),
  "onboarding-form": () => require("../api_handlers/onboarding-form"),
  "dashboard/today": () => require("../api_handlers/dashboard/today"),
  "dashboard/todo": () => require("../api_handlers/dashboard/todo"),
  "dashboard/monthly-summary": () => require("../api_handlers/dashboard/monthly-summary"),
  "operations/overview": () => require("../api_handlers/operations/overview"),
  "operations/health-check": () => require("../api_handlers/operations/health-check"),
  "operations/dismiss": () => require("../api_handlers/operations/dismiss"),
  "clients/delete-permanent": () => require("../api_handlers/clients/delete-permanent"),
  "clients/share-link": () => require("../api_handlers/clients/share-link"),
  "clients/whatsapp": () => require("../api_handlers/clients/whatsapp"),
  "clients/ads-alerts": () => require("../api_handlers/clients/ads-alerts"),
  "clients/whatsapp-queue": () => require("../api_handlers/clients/whatsapp-queue"),
  "google/oauth-callback": () => require("../api_handlers/google/oauth-callback"),
  "google/drive-health": () => require("../api_handlers/google/drive-health"),
  "google/oauth-start": () => require("../api_handlers/google/oauth-start"),
  "invoices/pdf": () => require("../api_handlers/invoices/pdf"),
  "invoices/preview": () => require("../api_handlers/invoices/preview"),
  "invoices/upload": () => require("../api_handlers/invoices/upload"),
  "invoices/payments": () => require("../api_handlers/invoices/payments"),
  "login-page": () => require("../api_handlers/login-page"),
  login: () => require("../api_handlers/login"),
  logout: () => require("../api_handlers/logout"),
  "receipts/pdf": () => require("../api_handlers/receipts/pdf"),
  "receipts/preview": () => require("../api_handlers/receipts/preview"),
  "receipts/upload": () => require("../api_handlers/receipts/upload"),
  "reports/pdf": () => require("../api_handlers/reports/pdf"),
  "reports/upload": () => require("../api_handlers/reports/upload"),
  "reports/accounts": () => require("../api_handlers/reports/accounts"),
  "reports/draft": () => require("../api_handlers/reports/draft"),
  storytelling: () => require("../api_handlers/storytelling"),
  settings: () => require("../api_handlers/settings"),
  "settings/logo": () => require("../api_handlers/settings/logo"),
  "telegram/action": () => require("../api_handlers/telegram/action"),
  "telegram/connect-link": () => require("../api_handlers/telegram/connect-link"),
  "telegram/setup-webhook": () => require("../api_handlers/telegram/setup-webhook"),
  "telegram/webhook": () => require("../api_handlers/telegram/webhook"),
  "tiktok/oauth-start": () => require("../api_handlers/tiktok/oauth-start"),
  "tiktok/oauth-callback": () => require("../api_handlers/tiktok/oauth-callback"),
  "tiktok/status": () => require("../api_handlers/tiktok/status"),
  "tiktok/accounts": () => require("../api_handlers/tiktok/accounts"),
  "tiktok/disconnect": () => require("../api_handlers/tiktok/disconnect"),
  "meta/oauth-start": () => require("../api_handlers/meta/oauth-start"),
  "meta/oauth-callback": () => require("../api_handlers/meta/oauth-callback"),
  "meta/status": () => require("../api_handlers/meta/status"),
  "meta/accounts": () => require("../api_handlers/meta/accounts"),
  "meta/disconnect": () => require("../api_handlers/meta/disconnect"),
  "push/config": () => require("../api_handlers/push/config"),
  "push/subscription": () => require("../api_handlers/push/subscription"),
  "cron/daily-ads-report": () => require("../api_handlers/cron/daily-ads-report"),
  "cron/tiktok-authorization-alert": () => require("../api_handlers/cron/tiktok-authorization-alert"),
  "personal-ads/accounts": () => require("../api_handlers/personal-ads/accounts"),
  "personal-ads/settings": () => require("../api_handlers/personal-ads/settings"),
  "personal-ads/reports": () => require("../api_handlers/personal-ads/reports"),
  "personal-ads/live": () => require("../api_handlers/personal-ads/live"),
  "personal-ads/generate": () => require("../api_handlers/personal-ads/generate"),
  "cron/personal-ads-report": () => require("../api_handlers/cron/personal-ads-report"),
  "cron/weekly-report-reminder": () => require("../api_handlers/cron/weekly-report-reminder"),
  "cron/weekly-reports": () => require("../api_handlers/cron/weekly-reports"),
  "cron/monthly-invoices": () => require("../api_handlers/cron/monthly-invoices"),
  "cron/monthly-invoice-reminder": () => require("../api_handlers/cron/monthly-invoice-reminder"),
};

function routeKeyFromRequest(req) {
  const parsed = new URL(req.url || "/", "http://localhost");
  const route = parsed.searchParams.get("route");
  if (route) return route.replace(/^\/+|\/+$/g, "");

  const path = parsed.pathname.replace(/^\/api\/?/, "").replace(/^\/+|\/+$/g, "");
  if (path && path !== "app") return path;
  if (parsed.pathname === "/login") return "login-page";
  return "app";
}

module.exports = async function handler(req, res) {
  const key = routeKeyFromRequest(req);
  const target = routes[key];

  if (!target) {
    res.statusCode = 404;
    res.setHeader("content-type", "text/plain; charset=utf-8");
    res.end("Not found.");
    return;
  }

  return target()(req, res);
};
