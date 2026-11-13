const test = require("node:test");
const assert = require("node:assert/strict");
const { weeklyReportFolderUrl, whatsappMessageForUpload } = require("../lib/invoices");

test("weekly report WhatsApp links the whole Weekly Report folder", () => {
  const url = weeklyReportFolderUrl("abc123");
  assert.equal(url, "https://drive.google.com/drive/folders/abc123?usp=sharing");
  const message = whatsappMessageForUpload("report", url);
  assert.match(message, /semua report sebelum ni/);
  assert.ok(message.endsWith(`klik sini (folder Weekly Report): ${url}`));
});

test("no folder id gives no folder link, so the caller can fall back", () => {
  assert.equal(weeklyReportFolderUrl(""), "");
  assert.equal(weeklyReportFolderUrl(undefined), "");
});
