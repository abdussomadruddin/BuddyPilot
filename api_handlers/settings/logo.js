const { requireAuth } = require("../../lib/auth");
const {
  clearBusinessLogo,
  downloadBusinessLogo,
  recordActivity,
  uploadBusinessLogo,
} = require("../../lib/supabase-db");
const { parseMultipart, readJsonBody, readRequestBody } = require("../../lib/postpilot");

module.exports = async function handler(req, res) {
  try {
    requireAuth(req);

    if (req.method === "GET") {
      const { settings, buffer, contentType } = await downloadBusinessLogo();
      res.statusCode = 200;
      res.setHeader("content-type", contentType);
      res.setHeader("content-length", String(buffer.length));
      res.setHeader("cache-control", "private, max-age=60");
      res.setHeader("content-disposition", `inline; filename="${(settings.logoImageName || "logo").replace(/"/g, "")}"`);
      res.end(buffer);
      return;
    }

    if (req.method === "POST") {
      const body = await readRequestBody(req);
      const { files } = parseMultipart(req, body);
      const settings = await uploadBusinessLogo(files.logoImage);
      await recordActivity({
        type: "settings_logo_uploaded",
        title: "Logo syarikat diupload",
        description: settings.logoImageName || "Logo disimpan untuk PDF invoice.",
        entityType: "settings",
        entityId: "business",
      });
      res.statusCode = 200;
      res.setHeader("content-type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ ok: true, settings }));
      return;
    }

    if (req.method === "DELETE") {
      await readJsonBody(req).catch(() => ({}));
      const settings = await clearBusinessLogo();
      await recordActivity({
        type: "settings_logo_deleted",
        title: "Logo syarikat dibuang",
        description: "Logo PDF invoice dibuang daripada settings.",
        entityType: "settings",
        entityId: "business",
      });
      res.statusCode = 200;
      res.setHeader("content-type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ ok: true, settings }));
      return;
    }

    res.statusCode = 405;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ ok: false, error: "Method not allowed." }));
  } catch (error) {
    res.statusCode = error.statusCode || 400;
    res.setHeader("content-type", req.method === "GET" ? "text/plain; charset=utf-8" : "application/json; charset=utf-8");
    res.end(req.method === "GET"
      ? (error?.message || String(error))
      : JSON.stringify({ ok: false, error: error?.message || String(error) }));
  }
};
