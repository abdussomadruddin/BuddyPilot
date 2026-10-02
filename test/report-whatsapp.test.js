const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { weeklyReportWhatsappMessage } = require("../lib/report-whatsapp");

test("weekly report WhatsApp template includes client, date range and Drive link", () => {
  const message = weeklyReportWhatsappMessage({
    contactName: "Faidzal",
    clientName: "TEEGA",
    dateRangeLabel: "JULY 13-19, 2026",
    documentUrl: "https://drive.google.com/file/d/report/view",
  });
  assert.match(message, /^Hi Faidzal,/);
  assert.match(message, /Weekly Meta Ads Report/);
  assert.match(message, /JULY 13-19, 2026/);
  assert.match(message, /https:\/\/drive\.google\.com\/file\/d\/report\/view/);
});

test("weekly report WhatsApp template requires the uploaded Drive link", () => {
  assert.throws(() => weeklyReportWhatsappMessage({ clientName: "TEEGA", dateRangeLabel: "JULY 13-19, 2026" }), /Link Google Drive/);
});

test("Generate and Upload only uploads; WhatsApp remains a manual client action", () => {
  const app = fs.readFileSync(require.resolve("../api_handlers/app"), "utf8");
  const upload = app.match(/async function uploadReport\(event\) \{([\s\S]*?)\n    function agencyClientLabel/)[1];
  assert.doesNotMatch(upload, /window\.open|whatsappWindow|upload\.whatsappUrl/);
  assert.match(upload, /WhatsApp tidak dihantar/);
  assert.match(app, /WhatsApp Report/);
});
