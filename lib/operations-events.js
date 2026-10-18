const {
  markOperationsIncidentNotified,
  openOperationsIncident,
  resolveOperationsIncident,
  resolveOperationsIncidents,
  saveOperationsHealth,
} = require("./supabase-db");
const { sendOperationsCriticalAlert } = require("./push-notifications");

const ALERT_DEDUPE_MS = 24 * 60 * 60 * 1000;

function shouldNotify(incident, now = Date.now()) {
  if (!incident || incident.severity !== "critical") return false;
  const last = new Date(incident.last_notified_at || "").getTime();
  return !Number.isFinite(last) || now - last >= ALERT_DEDUPE_MS;
}

async function notifyIncident(incident) {
  if (!shouldNotify(incident)) return;
  try {
    await sendOperationsCriticalAlert({
      id: incident.id,
      fingerprint: incident.fingerprint,
      title: incident.title,
      detail: incident.detail,
      action: incident.action,
    });
    await markOperationsIncidentNotified(incident.fingerprint);
  } catch (error) {
    console.warn("operations_push_failed", error?.message || String(error));
  }
}

async function reportOperationalFailure(input = {}) {
  try {
    const incident = await openOperationsIncident({ ...input, severity: input.severity || "critical" });
    await notifyIncident(incident);
    return incident;
  } catch (error) {
    console.warn("operations_incident_record_failed", error?.message || String(error));
    return null;
  }
}

async function reportOperationalSuccess({ fingerprint, fingerprints = [], serviceName = "", detail = "", metadata = {}, latencyMs = null } = {}) {
  try {
    if (serviceName) {
      await saveOperationsHealth({ serviceName, status: "healthy", detail, metadata, latencyMs });
    }
    const targets = [...new Set([fingerprint, ...fingerprints].filter(Boolean))];
    await resolveOperationsIncidents(targets);
  } catch (error) {
    console.warn("operations_success_record_failed", error?.message || String(error));
  }
}

async function recordServiceHealth({ serviceName, status, detail = "", metadata = {}, latencyMs = null, required = false, action = {} } = {}) {
  try {
    const saved = await saveOperationsHealth({ serviceName, status, detail, metadata, latencyMs });
    const fingerprint = `service:${serviceName}`;
    if (status === "healthy" || status === "setup") {
      await resolveOperationsIncident(fingerprint);
      return saved;
    }
    const severity = status === "down" && required ? "critical" : "warning";
    const incident = await openOperationsIncident({
      fingerprint,
      severity,
      serviceName,
      entityType: "integration",
      entityId: serviceName,
      title: `${serviceName} ${status === "down" ? "tidak tersedia" : "perlukan perhatian"}`,
      detail,
      action,
      metadata,
    });
    await notifyIncident(incident);
    return saved;
  } catch (error) {
    console.warn("operations_health_record_failed", error?.message || String(error));
    return null;
  }
}

module.exports = {
  ALERT_DEDUPE_MS,
  recordServiceHealth,
  reportOperationalFailure,
  reportOperationalSuccess,
  shouldNotify,
};
