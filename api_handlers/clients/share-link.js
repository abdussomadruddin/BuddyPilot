const { requireAuth } = require("../../lib/auth");
const { getClientDriveShareLink } = require("../../lib/invoices");
const { recordActivity } = require("../../lib/supabase-db");
const { readJsonBody } = require("../../lib/postpilot");

module.exports = async function handler(req, res) {
  res.setHeader("content-type", "application/json; charset=utf-8");

  try {
    requireAuth(req);

    if (req.method !== "POST") {
      res.statusCode = 405;
      res.end(JSON.stringify({ ok: false, error: "Method not allowed." }));
      return;
    }

    const body = await readJsonBody(req);
    const result = await getClientDriveShareLink(body);
    await recordActivity({
      type: "client_drive_link_shared",
      title: `Drive link dicopy: ${result.client.brandClient || result.client.name || result.client.code}`,
      description: "Folder client diset kepada Anyone with link = Editor.",
      entityType: "client",
      entityId: result.client.code,
    });

    res.statusCode = 200;
    res.end(JSON.stringify({
      ok: true,
      clientCode: result.client.code,
      clientName: result.client.brandClient || result.client.name,
      driveFolderId: result.driveFolderId,
      driveFolderName: result.driveFolderName,
      driveFolderUrl: result.driveFolderUrl,
      whatsappText: result.whatsappText,
    }));
  } catch (error) {
    res.statusCode = error.statusCode || 400;
    res.end(JSON.stringify({ ok: false, error: error?.message || String(error) }));
  }
};
