const routes = {
  activity: require("../api_handlers/activity"),
  app: require("../api_handlers/app"),
  "bank-accounts": require("../api_handlers/bank-accounts"),
  "bank-accounts/qr": require("../api_handlers/bank-accounts/qr"),
  clients: require("../api_handlers/clients"),
  "clients/delete-permanent": require("../api_handlers/clients/delete-permanent"),
  "clients/share-link": require("../api_handlers/clients/share-link"),
  "clients/whatsapp": require("../api_handlers/clients/whatsapp"),
  "google/oauth-callback": require("../api_handlers/google/oauth-callback"),
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
  settings: require("../api_handlers/settings"),
  "settings/logo": require("../api_handlers/settings/logo"),
  "personal-post-preview": require("../api_handlers/personal-post-preview"),
  "personal-post-regenerate": require("../api_handlers/personal-post-regenerate"),
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
