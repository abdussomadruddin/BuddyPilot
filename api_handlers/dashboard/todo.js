const { requireAuth } = require("../../lib/auth");
const { getMergedClientsWithStatus } = require("../../lib/invoices");
const { earliestPeriod } = require("../../lib/invoice-payments");
const { listActivityByTypes, listOpenOperationsIncidents, supabaseRequest } = require("../../lib/supabase-db");
const { tikTokConnectionStatus } = require("../../lib/tiktok-ads");
const { composeTodo } = require("../../lib/today-todo");

async function settled(promise, fallback, warnings, label) {
  try {
    return await promise;
  } catch (error) {
    warnings.push(`${label}: ${error?.message || error}`);
    return fallback;
  }
}

module.exports = async function handler(req, res) {
  res.setHeader("content-type", "application/json; charset=utf-8");
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.end(JSON.stringify({ ok: false, error: "Method not allowed." }));
    return;
  }
  try {
    requireAuth(req);
    const now = new Date();
    const today = now.toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" });
    const fields = "invoice_number,period,client_code,client_name,invoice_date,total,currency,drive_file_url,metadata,created_at";
    const warnings = [];
    const [clientResult, uploads, activities, incidents, tasks, tiktok] = await Promise.all([
      settled(getMergedClientsWithStatus(), { clients: [] }, warnings, "Pelanggan"),
      settled(supabaseRequest(`invoice_uploads?select=${fields}&period=gte.${earliestPeriod(now, 3)}&order=period.desc&limit=1000`), [], warnings, "Invoice"),
      settled(listActivityByTypes(["client_whatsapp_opened", "report_uploaded"], new Date(now.getTime() - 62 * 86400000).toISOString()), [], warnings, "Aktiviti"),
      settled(listOpenOperationsIncidents(100), [], warnings, "Amaran"),
      settled(supabaseRequest(`agency_tasks?select=id,title,due_date,status,client_code&status=in.(todo,in_progress)&due_date=lte.${today}&order=due_date.asc&limit=200`), [], warnings, "Tugasan"),
      settled(tikTokConnectionStatus(), {}, warnings, "TikTok"),
    ]);
    const todo = composeTodo({ clients: clientResult.clients || [], uploads: uploads || [], paymentRows: uploads || [], activities, incidents: incidents || [], tasks: tasks || [], tiktok, now });
    res.end(JSON.stringify({ ok: true, ...todo, warnings }));
  } catch (error) {
    res.statusCode = error.statusCode || 500;
    res.end(JSON.stringify({ ok: false, error: error?.message || String(error) }));
  }
};
