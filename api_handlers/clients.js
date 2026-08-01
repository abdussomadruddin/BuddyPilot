const { requireAuth } = require("../lib/auth");
const {
  createClientWithDriveFolders,
  getMergedClientsWithStatus,
  setClientServiceStatus,
  updateClientDetails,
} = require("../lib/invoices");
const { recordActivity } = require("../lib/supabase-db");
const { readJsonBody } = require("../lib/postpilot");
const { normalizeAdsReportConfig } = require("../lib/adflow-ads");

function publicClient(client) {
  const telegram = client.metadata?.telegramReportConfig || {};
  const legacyRecipient = {
    slot: 1,
    chatId: String(telegram.chatId || ""),
    autoEnabled: Boolean(telegram.autoEnabled),
    username: String(telegram.username || ""),
    displayName: String(telegram.displayName || ""),
    linkedAt: String(telegram.linkedAt || ""),
    lastSentAt: String(telegram.lastSentAt || ""),
    lastSentDate: String(telegram.lastSentDate || ""),
    lastError: String(telegram.lastError || ""),
  };
  const storedRecipients = Array.isArray(telegram.recipients) ? telegram.recipients : [];
  const recipients = [1, 2].map((slot) => {
    const stored = storedRecipients.find((item) => Number(item?.slot) === slot) || {};
    const source = slot === 1 ? { ...legacyRecipient, ...stored } : stored;
    return {
      slot,
      connected: Boolean(source.chatId),
      autoEnabled: Boolean(source.autoEnabled && source.chatId),
      username: String(source.username || ""),
      displayName: String(source.displayName || ""),
      linkedAt: String(source.linkedAt || ""),
      lastSentAt: String(source.lastSentAt || ""),
      lastSentDate: String(source.lastSentDate || ""),
      lastError: String(source.lastError || ""),
    };
  });
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
    serviceType: client.serviceType || "",
    monthlyAdBudget: Number(client.monthlyAdBudget || 0),
    startDate: client.startDate || "",
    agencyStatus: client.agencyStatus || (client.onboardingStatus === "in_progress" ? "onboarding" : (client.serviceStatus === "paused" ? "paused" : "active")),
    notes: client.notes || "",
    archivedAt: client.archivedAt || "",
    driveFolderId: client.driveFolderId,
    driveFolderName: client.driveFolderName,
    weeklyReportFolderId: client.weeklyReportFolderId,
    invoiceReceiptFolderId: client.invoiceReceiptFolderId,
    onboardingStatus: client.onboardingStatus || "completed",
    onboardingStep: client.onboardingStep || "",
    onboardingState: client.onboardingState || {},
    onboardingCompletedAt: client.onboardingCompletedAt || "",
    serviceStatus: client.serviceStatus || "active",
    serviceStoppedAt: client.serviceStoppedAt || "",
    serviceRecoveredAt: client.serviceRecoveredAt || "",
    source: client.source || "config",
    adsReportConfig: normalizeAdsReportConfig(client.metadata?.adsReportConfig || {}),
    telegramReportConfig: {
      recipients,
      connected: recipients.some((item) => item.connected),
      connectedCount: recipients.filter((item) => item.connected).length,
      autoEnabled: recipients.some((item) => item.autoEnabled),
    },
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
      await recordActivity({
        type: "client_created",
        title: `Pelanggan ditambah: ${saved.client.brandClient || saved.client.name}`,
        description: `Folder Drive siap: ${saved.client.driveFolderName || "-"}`,
        entityType: "client",
        entityId: saved.client.code,
      });
      res.statusCode = 200;
      res.end(JSON.stringify({
        ok: true,
        client: publicClient(saved.client),
        folders: saved.folders,
        registryFile: saved.registryFile,
        database: saved.database,
      }));
      return;
    }

    if (req.method === "PUT" || req.method === "PATCH") {
      const body = await readJsonBody(req);
      const saved = await updateClientDetails(body);
      const archived = saved.client.agencyStatus === "archived";
      await recordActivity({
        type: archived ? "client_archived" : "client_updated",
        title: `${archived ? "Agency client diarkibkan" : "Pelanggan dikemaskini"}: ${saved.client.brandClient || saved.client.name}`,
        description: archived ? "Rekod, folder dan sejarah client dikekalkan." : "Detail agency client disimpan.",
        entityType: "client",
        entityId: saved.client.code,
      });
      res.statusCode = 200;
      res.end(JSON.stringify({
        ok: true,
        client: publicClient(saved.client),
        registryFile: saved.registryFile,
        database: saved.database,
      }));
      return;
    }

    if (req.method === "DELETE") {
      const body = await readJsonBody(req);
      const saved = await setClientServiceStatus({ ...body, status: body.status || "paused" });
      const isPaused = saved.client.serviceStatus === "paused";
      await recordActivity({
        type: isPaused ? "client_service_stopped" : "client_service_recovered",
        title: `${isPaused ? "Service dihentikan" : "Service disambung"}: ${saved.client.brandClient || saved.client.name || saved.client.code}`,
        description: isPaused
          ? "Client disimpan untuk recover akan datang dan dikeluarkan dari invoice/receipt aktif."
          : "Client aktif semula untuk invoice/receipt akan datang.",
        entityType: "client",
        entityId: saved.client.code,
      });
      res.statusCode = 200;
      res.end(JSON.stringify({
        ok: true,
        client: publicClient(saved.client),
        registryFile: saved.registryFile,
        database: saved.database,
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
