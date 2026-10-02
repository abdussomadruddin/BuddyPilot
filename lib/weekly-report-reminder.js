const { sendPushPayload } = require("./push-notifications");

const DAY_MS = 86400000;
const MYT_OFFSET_MS = 8 * 60 * 60 * 1000;

function weeklyReportReminder(now = new Date()) {
  const local = new Date(new Date(now).getTime() + MYT_OFFSET_MS);
  if (!Number.isFinite(local.getTime())) throw new Error("Invalid reminder date.");
  const monday = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()));
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  const end = new Date(monday.getTime() - DAY_MS);
  const start = new Date(end.getTime() - 6 * DAY_MS);
  const date = (value) => value.toISOString().slice(0, 10);
  return {
    due: local.getUTCDay() === 1 && local.getUTCHours() === 10,
    startDate: date(start),
    endDate: date(end),
    payload: {
      title: "Hantar weekly report client",
      body: `Semak report ${date(start)} hingga ${date(end)}, kemudian WhatsApp kepada client aktif.`,
      icon: "/icons/app-icon-192x192.png",
      badge: "/icons/app-icon-96x96.png",
      tag: `weekly-report-reminder-${date(monday)}`,
      url: "/?tab=clientpilot&panel=client-list-panel",
    },
  };
}

async function sendWeeklyReportReminder({ now = new Date(), send = sendPushPayload } = {}) {
  const reminder = weeklyReportReminder(now);
  if (!reminder.due) return { skipped: true, reason: "Outside Monday 10am Malaysia reminder window." };
  return { skipped: false, startDate: reminder.startDate, endDate: reminder.endDate, ...await send(reminder.payload) };
}

module.exports = { weeklyReportReminder, sendWeeklyReportReminder };
