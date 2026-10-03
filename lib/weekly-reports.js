const { activeClients, getMergedClientsWithStatus, uploadReportToDrive } = require("./invoices");
const { normalizeAdsReportConfig, fetchMetaCustomReport, buildReportDraft } = require("./meta-ads");
const { fetchTikTokCustomReport } = require("./tiktok-ads");
const { claimWeeklyReportJob, finishWeeklyReportJob } = require("./supabase-db");
const { reportOperationalFailure, reportOperationalSuccess } = require("./operations-events");

function weeklyReportSchedule(now = new Date()) {
  const local = new Date(new Date(now).getTime() + 8 * 3600000);
  if (!Number.isFinite(local.getTime())) throw new Error("Invalid weekly report date.");
  const monday = new Date(local);
  monday.setUTCHours(0, 0, 0, 0);
  monday.setUTCDate(monday.getUTCDate() - (monday.getUTCDay() + 6) % 7);
  const start = new Date(monday.getTime() - 7 * 86400000);
  const end = new Date(monday.getTime() - 86400000);
  return { due: local.getUTCDay() === 1 && local.getUTCHours() === 6, startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) };
}

async function runWeeklyReports({ now = new Date(), load = getMergedClientsWithStatus, claim = claimWeeklyReportJob, finish = finishWeeklyReportJob, meta = fetchMetaCustomReport, tiktok = fetchTikTokCustomReport, draft = buildReportDraft, upload = uploadReportToDrive, failure = reportOperationalFailure, success = reportOperationalSuccess } = {}) {
  const schedule = weeklyReportSchedule(now);
  if (!schedule.due) return { skipped: true, reason: "Outside Monday 6am Malaysia schedule." };
  const runtime = await load();
  if (!runtime.registryStatus?.ok) throw new Error("Client registry unavailable; automatic weekly reports stopped.");
  // Run independent clients concurrently to fit the serverless execution window.
  const results = await Promise.all(activeClients(runtime.clients).map(async (client) => {
    const fingerprint = `weekly-report:${client.code}:${schedule.startDate}`;
    let job;
    try {
      job = await claim(client.code, schedule.startDate);
      if (!job) return { clientCode: client.code, status: "skipped" };
      const config = normalizeAdsReportConfig(client.metadata?.adsReportConfig || {});
      if (!config.accountId) throw new Error("Client Ads account belum disediakan.");
      const analytics = await (config.platform === "tiktok" ? tiktok : meta)(config, schedule.startDate, schedule.endDate);
      const result = await upload({ ...draft(analytics, config), clientCode: client.code, startDate: schedule.startDate, endDate: schedule.endDate }, { preserveExisting: true });
      if (!result.id && !result.fileId) throw new Error("Drive upload did not return a file ID.");
      await finish(job, result);
      await success({ fingerprint });
      return { clientCode: client.code, status: result.skipped ? "skipped" : "uploaded", fileId: result.id || result.fileId };
    } catch (error) {
      if (job) await finish(job, {}, error.message).catch(() => {});
      await failure({ fingerprint, serviceName: "weekly_reports", entityType: "client", clientCode: client.code, title: "Weekly report gagal", detail: error.message, action: { kind: "tab", label: "Open Report Pilot", tab: "reportpilot" } });
      return { clientCode: client.code, status: "failed", error: error.message };
    }
  }));
  return { ok: !results.some((item) => item.status === "failed"), ...schedule, results };
}

module.exports = { weeklyReportSchedule, runWeeklyReports };
