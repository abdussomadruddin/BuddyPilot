const routes = {
  app: require("../api_handlers/app"),
  clients: require("../api_handlers/clients"),
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
  regenerate: require("../api_handlers/regenerate"),
  settings: require("../api_handlers/settings"),
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
