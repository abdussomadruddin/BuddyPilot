#!/usr/bin/env node
// Local HTTP adapter for Vercel routes. Never starts jobs or cloud migrations.
const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const root = path.join(__dirname, "..");
const handler = require("../api/app");
const types = {
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
};
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    if (
      url.pathname === "/" ||
      url.pathname === "/login" ||
      url.pathname.startsWith("/api/")
    ) {
      const route =
        url.pathname === "/"
          ? "app"
          : url.pathname === "/login"
            ? "login-page"
            : url.pathname.slice(5);
      url.searchParams.set("route", route);
      req.url = "/api/app?" + url.searchParams.toString();
      await handler(req, res);
      return;
    }
    const publicRoot = path.join(root, "public");
    const file = path.resolve(
      publicRoot,
      "." + decodeURIComponent(url.pathname),
    );
    if (!file.startsWith(publicRoot + path.sep)) {
      res.writeHead(403);
      res.end();
      return;
    }
    const data = await fs.readFile(file);
    res.setHeader(
      "content-type",
      types[path.extname(file)] || "application/octet-stream",
    );
    res.end(data);
  } catch (error) {
    res.statusCode = error.code === "ENOENT" ? 404 : 500;
    res.end(res.statusCode === 404 ? "Not found." : "Request failed.");
    if (res.statusCode === 500) console.error(error.message);
  }
});
server.listen(Number(process.env.PORT || 3000), "127.0.0.1", () =>
  console.log("BuddyPilot local server listening"),
);
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => server.close(() => process.exit(0)));
