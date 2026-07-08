const { requireAuth } = require("../lib/auth");
const {
  createClientWithDriveFolders,
  getMergedClientsWithStatus,
} = require("../lib/invoices");
const { readJsonBody } = require("../lib/postpilot");

function publicClient(client) {
  return {
    brandClient: client.brandClient,
    code: client.code,
    name: client.name,
    contactName: client.contactName,
    email: client.email,
    phone: client.phone,
    companyName: client.companyName,
    registrationNumber: client.registrationNumber,
    billingName: client.billingName,
    billingAddress: client.billingAddress,
    monthlyRetainer: client.monthlyRetainer,
    driveFolderId: client.driveFolderId,
    driveFolderName: client.driveFolderName,
    weeklyReportFolderId: client.weeklyReportFolderId,
    invoiceReceiptFolderId: client.invoiceReceiptFolderId,
    source: client.source || "config",
  };
}

module.exports = async function handler(req, res) {
  res.setHeader("content-type", "application/json; charset=utf-8");

  try {
    requireAuth(req);

    if (req.method === "GET") {
      const { clients, registryStatus } = await getMergedClientsWithStatus();
      res.statusCode = 200;
      res.end(JSON.stringify({
        ok: true,
        clients: clients.map(publicClient),
        count: clients.length,
        registryStatus,
      }));
      return;
    }

    if (req.method === "POST") {
      const body = await readJsonBody(req);
      const saved = await createClientWithDriveFolders(body);
      res.statusCode = 200;
      res.end(JSON.stringify({
        ok: true,
        client: publicClient(saved.client),
        folders: saved.folders,
        registryFile: saved.registryFile,
      }));
      return;
    }

    res.statusCode = 405;
    res.end(JSON.stringify({ ok: false, error: "Method not allowed." }));
  } catch (error) {
    res.statusCode = error.statusCode || 400;
    res.end(JSON.stringify({ ok: false, error: error?.message || String(error) }));
  }
};
