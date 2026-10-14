const { requireAuth } = require("../lib/auth");
const { readJsonBody } = require("../lib/postpilot");
const { createService } = require("../lib/client-ads-monitor");

module.exports = async (req, res) => {
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  try {
    requireAuth(req);
    const service = createService();
    if (req.method === "PUT") {
      const body = await readJsonBody(req);
      res.end(JSON.stringify({ ok: true, config: await service.save(body) }));
      return;
    }
    if (req.method !== "GET") throw Object.assign(new Error("Method not allowed."), { statusCode: 405 });
    const input = Object.fromEntries(new URL(req.url, "http://localhost").searchParams);
    let data;
    if (input.action === "clients") data = { clients: await service.list(input.all === "true") };
    else if (input.action === "settings") data = await service.settings(input);
    else if (["data", "campaigns"].includes(input.action)) data = { [input.action === "data" ? "snapshot" : "catalog"]: await service.data(input, input.action === "campaigns") };
    else throw new Error("Action tidak sah.");
    res.end(JSON.stringify({ ok: true, ...data }));
  } catch (error) {
    res.statusCode = error.statusCode || 400;
    res.end(JSON.stringify({ ok: false, error: error.message || "Monitor tidak tersedia." }));
  }
};
