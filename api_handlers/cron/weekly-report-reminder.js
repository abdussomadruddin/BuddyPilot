const { sendWeeklyReportReminder } = require("../../lib/weekly-report-reminder");

module.exports = async function handler(req, res) {
  res.setHeader("content-type", "application/json; charset=utf-8");
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.end(JSON.stringify({ ok: false, error: "Method not allowed." }));
    return;
  }
  const secret = String(process.env.CRON_SECRET || "");
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) {
    res.statusCode = 401;
    res.end(JSON.stringify({ ok: false, error: "Unauthorized." }));
    return;
  }
  try {
    res.end(JSON.stringify({ ok: true, ...await sendWeeklyReportReminder() }));
  } catch (error) {
    res.statusCode = 500;
    res.end(JSON.stringify({ ok: false, error: error?.message || String(error) }));
  }
};
