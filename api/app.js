const routes = {
  activity: require("../api_handlers/activity"),
  app: require("../api_handlers/app"),
  "bank-accounts": require("../api_handlers/bank-accounts"),
  "bank-accounts/qr": require("../api_handlers/bank-accounts/qr"),
  clients: require("../api_handlers/clients"),
  "copy-pilot/generate": require("../api_handlers/copy-pilot-generate"),
  "clients/onboarding": require("../api_handlers/clients/onboarding"),
  "dashboard/today": require("../api_handlers/dashboard/today"),
  "operations/overview": require("../api_handlers/operations/overview"),
  "operations/health-check": require("../api_handlers/operations/health-check"),
  "clients/delete-permanent": require("../api_handlers/clients/delete-permanent"),
  "clients/share-link": require("../api_handlers/clients/share-link"),
  "clients/whatsapp": require("../api_handlers/clients/whatsapp"),
  "google/oauth-callback": require("../api_handlers/google/oauth-callback"),
  "google/drive-health": require("../api_handlers/google/drive-health"),
  "google/oauth-start": require("../api_handlers/google/oauth-start"),
  "invoices/pdf": require("../api_handlers/invoices/pdf"),
  "invoices/preview": require("../api_handlers/invoices/preview"),
  "invoices/upload": require("../api_handlers/invoices/upload"),
  "login-page": require("../api_handlers/login-page"),
  login: require("../api_handlers/login"),
  logout: require("../api_handlers/logout"),
  post: require("../api_handlers/post"),
  "preview-metadata": require("../api_handlers/preview-metadata"),
  preview: require("../api_handlers/preview"),
  "receipts/pdf": require("../api_handlers/receipts/pdf"),
  "receipts/preview": require("../api_handlers/receipts/preview"),
  "receipts/upload": require("../api_handlers/receipts/upload"),
  regenerate: require("../api_handlers/regenerate"),
  "reports/pdf": require("../api_handlers/reports/pdf"),
  "reports/upload": require("../api_handlers/reports/upload"),
  "reports/accounts": require("../api_handlers/reports/accounts"),
  "reports/draft": require("../api_handlers/reports/draft"),
  settings: require("../api_handlers/settings"),
  "settings/logo": require("../api_handlers/settings/logo"),
  "telegram/action": require("../api_handlers/telegram/action"),
  "telegram/connect-link": require("../api_handlers/telegram/connect-link"),
  "telegram/setup-webhook": require("../api_handlers/telegram/setup-webhook"),
  "telegram/webhook": require("../api_handlers/telegram/webhook"),
  "tiktok/oauth-start": require("../api_handlers/tiktok/oauth-start"),
  "tiktok/oauth-callback": require("../api_handlers/tiktok/oauth-callback"),
  "tiktok/status": require("../api_handlers/tiktok/status"),
  "tiktok/accounts": require("../api_handlers/tiktok/accounts"),
  "tiktok/disconnect": require("../api_handlers/tiktok/disconnect"),
  "push/config": require("../api_handlers/push/config"),
  "push/subscription": require("../api_handlers/push/subscription"),
  "cron/daily-ads-report": require("../api_handlers/cron/daily-ads-report"),
  "cron/tiktok-authorization-alert": require("../api_handlers/cron/tiktok-authorization-alert"),
  "personal-post-draft": require("../api_handlers/personal-post-draft"),
  "personal-post-hook-image": require("../api_handlers/personal-post-hook-image"),
  "personal-post-hook-images": require("../api_handlers/personal-post-hook-images"),
  "personal-post-products": require("../api_handlers/personal-post-products"),
  "personal-post-batch": require("../api_handlers/personal-post-batch"),
  "personal-post-preview": require("../api_handlers/personal-post-preview"),
  "personal-post-regenerate": require("../api_handlers/personal-post-regenerate"),
  "threads-general": require("../api_handlers/threads-general"),
  "postpilot-copy-history": require("../api_handlers/postpilot-copy-history"),
  "postpilot-voice-profile": require("../api_handlers/postpilot-voice-profile"),
  "postpilot-remote/pair-code": require("../api_handlers/postpilot-remote/pair-code"),
  "postpilot-remote/device": require("../api_handlers/postpilot-remote/device"),
  "postpilot-remote/jobs": require("../api_handlers/postpilot-remote/jobs"),
  "postpilot-remote/jobs/action": require("../api_handlers/postpilot-remote/jobs-action"),
  "postpilot-extension/pair": require("../api_handlers/postpilot-extension/pair"),
  "postpilot-extension/claim": require("../api_handlers/postpilot-extension/claim"),
  "postpilot-extension/progress": require("../api_handlers/postpilot-extension/progress"),
  "postpilot-extension/complete": require("../api_handlers/postpilot-extension/complete"),
  "postpilot-extension/fail": require("../api_handlers/postpilot-extension/fail"),
  "postpilot-extension/image": require("../api_handlers/postpilot-extension/image"),
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

  return target(req, res);
};
