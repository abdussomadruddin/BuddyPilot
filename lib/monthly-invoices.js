const { uploadMissingMonthlyInvoices } = require("./invoices");
const { sendPushPayload } = require("./push-notifications");
const { claimMonthlyInvoiceJob, finishMonthlyInvoiceJob } = require("./supabase-db");
const { reportOperationalFailure, reportOperationalSuccess } = require("./operations-events");

function monthlyInvoiceSchedule(now = new Date()) {
  const local = new Date(new Date(now).getTime() + 8 * 3600000);
  if (!Number.isFinite(local.getTime())) throw new Error("Invalid monthly invoice date.");
  const period = local.toISOString().slice(0, 7);
  return {
    period,
    uploadDue: local.getUTCDate() === 1 && local.getUTCHours() === 6,
    reminderDue: local.getUTCDate() === 1 && local.getUTCHours() === 10,
    payload: {
      title: "Hantar invoice client",
      body: `Semak invoice ${period} dan status upload, kemudian WhatsApp kepada client aktif secara manual.`,
      icon: "/icons/app-icon-192x192.png", badge: "/icons/app-icon-96x96.png",
      tag: `monthly-invoice-reminder-${period}`,
      url: `/?tab=invoicepilot&panel=invoice-panel&period=${period}`,
    },
  };
}

async function runMonthlyInvoiceJob(kind, { now = new Date(), claim = claimMonthlyInvoiceJob, finish = finishMonthlyInvoiceJob, upload = uploadMissingMonthlyInvoices, send = sendPushPayload, failure = reportOperationalFailure, success = reportOperationalSuccess } = {}) {
  if (!["upload", "reminder"].includes(kind)) throw new Error("Invalid monthly invoice job kind.");
  const schedule = monthlyInvoiceSchedule(now);
  if (!(kind === "upload" ? schedule.uploadDue : schedule.reminderDue)) return { skipped: true, reason: "Outside monthly Malaysia schedule." };
  const fingerprint = `monthly-invoice:${kind}:${schedule.period}`;
  let job;
  try {
    job = await claim(kind, schedule.period);
    if (!job) return { skipped: true, period: schedule.period, reason: "already_completed_or_running" };
    const result = kind === "upload"
      ? await upload({ period: schedule.period })
      : await send(schedule.payload);
    if (result.failed) {
      await finish(job, result, `${result.failed} client invoice(s) failed. Successful uploads retained.`);
      await failure({ fingerprint, serviceName: "monthly_invoices", title: "Monthly invoice upload belum lengkap", detail: `${schedule.period}: ${result.uploaded} uploaded, ${result.skipped} existing, ${result.failed} failed.`, entityType: "invoice", metadata: result, action: { kind: "tab", label: "Open Invoice Pilot", tab: "invoicepilot", subtab: "invoice-panel" } });
      return { ...result, ok: false };
    }
    await finish(job, result);
    await success({ fingerprint });
    return { ...result, ok: true, period: schedule.period };
  } catch (error) {
    if (job) {
      try { await finish(job, {}, error?.message || String(error)); } catch (saveError) { console.warn("monthly_invoice_finish_failed", saveError?.message || String(saveError)); }
    }
    await failure({ fingerprint, serviceName: "monthly_invoices", title: kind === "upload" ? "Monthly invoice upload gagal" : "Monthly invoice reminder gagal", detail: error?.message || String(error), entityType: "invoice", action: { kind: "tab", label: "Open Invoice Pilot", tab: "invoicepilot", subtab: "invoice-panel" } });
    throw error;
  }
}

module.exports = { monthlyInvoiceSchedule, runMonthlyInvoiceJob };
