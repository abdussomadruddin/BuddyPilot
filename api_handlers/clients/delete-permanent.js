const { requireAuth } = require("../../lib/auth");
const { deleteClientPermanently } = require("../../lib/invoices");
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
    const result = await deleteClientPermanently(body);
    const label = result.client.brandClient || result.client.name || result.client.code;
    await recordActivity({
      type: "client_deleted",
      title: `Pelanggan dipadam: ${label}`,
      description: `Folder Drive dipadam: ${result.deletedFolder?.name || "-"}`,
      entityType: "client",
      entityId: result.client.code,
      metadata: {
        clientCode: result.client.code,
        brandClient: label,
        deletedDriveFolderId: result.deletedFolder?.id || "",
        deletedDriveFolderName: result.deletedFolder?.name || "",
      },
    });

    res.statusCode = 200;
    res.end(JSON.stringify({
      ok: true,
      client: result.client,
      deletedFolder: result.deletedFolder,
      registryFile: result.registryFile,
      database: result.database,
    }));
  } catch (error) {
    res.statusCode = error.statusCode || 400;
    res.end(JSON.stringify({ ok: false, error: error?.message || String(error) }));
  }
};
