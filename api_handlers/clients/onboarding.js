const { requireAuth } = require("../../lib/auth");
const { readJsonBody } = require("../../lib/postpilot");
const {
  activateClientOnboarding,
  discardClientOnboarding,
  getMergedClientsWithStatus,
  markClientOnboardingError,
  onboardingChecks,
  provisionClientOnboardingDrive,
  saveClientOnboardingAds,
  saveClientOnboardingDetails,
  startClientOnboarding,
  updateClientOnboardingTelegram,
} = require("../../lib/invoices");
const { openOperationsIncident, recordActivity, resolveOperationsIncident } = require("../../lib/supabase-db");

function publicOnboarding(client) {
  return {
    clientCode: client.code,
    status: client.onboardingStatus || "completed",
    step: client.onboardingStep || "",
    state: client.onboardingState || {},
    completedAt: client.onboardingCompletedAt || "",
    checks: onboardingChecks(client),
    drive: {
      folderId: client.driveFolderId || "",
      folderName: client.driveFolderName || "",
      weeklyReportFolderId: client.weeklyReportFolderId || "",
      invoiceReceiptFolderId: client.invoiceReceiptFolderId || "",
    },
  };
}

function labelFor(client) {
  return client.brandClient || client.name || client.code;
}

async function logStep(client, action) {
  const titles = {
    start: "Onboarding client dimulakan",
    details: "Maklumat onboarding disimpan",
    ads: "Akaun Ads onboarding disimpan",
    drive: "Folder onboarding disediakan",
    telegram: "Langkah Telegram onboarding selesai",
    activate: "Onboarding client selesai",
    discard: "Draft onboarding dibuang",
  };
  await recordActivity({
    type: `client_onboarding_${action}`,
    title: `${titles[action] || "Onboarding dikemaskini"}: ${labelFor(client)}`,
    description: action === "activate" ? "Client kini aktif untuk invoice, report dan automation." : "Progress onboarding disimpan.",
    entityType: "client",
    entityId: client.code,
  });
}

async function autoProvisionDrive(client) {
  try {
    const provisioned = await provisionClientOnboardingDrive({ clientCode: client.code });
    try {
      await logStep(provisioned, "drive");
      await resolveOperationsIncident(`client-onboarding:${client.code}:drive`);
    } catch {}
    return provisioned;
  } catch (error) {
    const failed = await markClientOnboardingError({ clientCode: client.code }, "drive", error);
    try {
      await openOperationsIncident({
        fingerprint: `client-onboarding:${client.code}:drive`,
        severity: "warning",
        serviceName: "google-drive",
        entityType: "client",
        entityId: client.code,
        clientCode: client.code,
        title: `Folder onboarding gagal untuk ${client.code}`,
        detail: error?.message || String(error),
        action: { kind: "navigate", label: "Continue Setup", tab: "clientpilot", subtab: "client-add-panel", clientCode: client.code },
      });
    } catch {}
    return failed;
  }
}

module.exports = async function handler(req, res) {
  res.setHeader("content-type", "application/json; charset=utf-8");
  let body = {};
  try {
    requireAuth(req);

    if (req.method === "GET") {
      const url = new URL(req.url || "/", "http://localhost");
      const code = String(url.searchParams.get("clientCode") || "").trim().toUpperCase();
      const { clients } = await getMergedClientsWithStatus();
      const client = clients.find((item) => item.code === code && !item.deletedAt);
      if (!client) throw new Error(`Client ${code || "-"} tidak dijumpai.`);
      res.end(JSON.stringify({ ok: true, onboarding: publicOnboarding(client) }));
      return;
    }

    body = await readJsonBody(req);
    let client;
    let action = String(body.action || "").trim().toLowerCase();

    if (req.method === "POST") {
      action = action || "start";
      if (action !== "start") throw new Error("Action onboarding tidak sah.");
      client = await startClientOnboarding(body);
      client = await autoProvisionDrive(client);
    } else if (req.method === "PATCH") {
      if (action === "details") {
        client = await saveClientOnboardingDetails(body);
        client = await autoProvisionDrive(client);
      }
      else if (action === "ads") client = await saveClientOnboardingAds(body);
      else if (action === "drive") client = await provisionClientOnboardingDrive(body);
      else if (action === "telegram") client = await updateClientOnboardingTelegram(body);
      else if (action === "activate") client = await activateClientOnboarding(body);
      else throw new Error("Action onboarding tidak sah.");
    } else if (req.method === "DELETE") {
      action = "discard";
      const result = await discardClientOnboarding(body);
      client = result.client;
    } else {
      res.statusCode = 405;
      res.end(JSON.stringify({ ok: false, error: "Method not allowed." }));
      return;
    }

    await logStep(client, action);
    if (["ads", "drive", "activate"].includes(action)) {
      await resolveOperationsIncident(`client-onboarding:${client.code}:${action}`);
    }
    res.end(JSON.stringify({ ok: true, onboarding: publicOnboarding(client), clientCode: client.code }));
  } catch (error) {
    const action = String(body.action || "unknown").trim().toLowerCase();
    const clientCode = String(body.clientCode || body.code || "").trim().toUpperCase();
    if (["ads", "drive", "activate"].includes(action) && clientCode) {
      try {
        await markClientOnboardingError(body, action === "activate" ? "review" : action, error);
        await openOperationsIncident({
          fingerprint: `client-onboarding:${clientCode}:${action}`,
          severity: "warning",
          serviceName: action === "drive" ? "google-drive" : "client-onboarding",
          entityType: "client",
          entityId: clientCode,
          clientCode,
          title: `Onboarding ${action} gagal untuk ${clientCode}`,
          detail: error?.message || String(error),
          action: { kind: "navigate", label: "Continue Setup", tab: "clientpilot", subtab: "client-add-panel", clientCode },
        });
      } catch {}
    }
    res.statusCode = error.statusCode || 400;
    res.end(JSON.stringify({ ok: false, error: error?.message || String(error) }));
  }
};
