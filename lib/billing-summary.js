const PDFDocument = require("pdfkit");
const path = require("node:path");

const CURRENCIES = ["MYR", "USD", "SGD", "EUR", "GBP", "AUD", "IDR", "THB"];
const STATUSES = ["Paid", "Pending", "Failed", "Refunded"];

function text(value, label, max, optional = false) {
  if (typeof value !== "string" || (!optional && !value.trim()) || value.length > max || /[\x00-\x08\x0b-\x1f]/.test(value)) {
    throw new Error(`${label} tidak sah (maksimum ${max} aksara).`);
  }
  return value.trim();
}

function date(value, label) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) {
    throw new Error(`${label} tidak sah.`);
  }
  return value;
}

function cents(value, label) {
  if (!/^(0|[1-9]\d{0,8})(\.\d{1,2})?$/.test(String(value))) throw new Error(`${label} mesti nombor positif dengan maksimum 2 tempat perpuluhan.`);
  return Math.round(Number(value) * 100);
}

function normalizeSummary(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Input tidak sah.");
  const company = text(input.company, "Nama syarikat", 100);
  const address = text(input.address || "", "Alamat", 240, true).split(/\r?\n/).filter(Boolean);
  if (address.length > 4) throw new Error("Alamat maksimum 4 baris.");
  const registration = text(input.registration || "", "No. pendaftaran", 80, true);
  const account = text(input.account, "Ad account", 40);
  if (!/^\d+$/.test(account)) throw new Error("Ad account mesti nombor sahaja.");
  const start = date(input.start, "Tarikh mula");
  const end = date(input.end, "Tarikh akhir");
  if (start > end) throw new Error("Tarikh akhir mesti selepas tarikh mula.");
  if (!CURRENCIES.includes(input.currency)) throw new Error("Mata wang tidak disokong.");
  const paymentMethod = text(input.paymentMethod, "Kaedah bayaran", 40);
  const last4 = text(input.last4 || "", "4 digit akhir", 4, true);
  if (last4 && !/^\d{4}$/.test(last4)) throw new Error("Masukkan 4 digit akhir sahaja.");
  if (!Array.isArray(input.transactions) || input.transactions.length < 1 || input.transactions.length > 200) throw new Error("Masukkan 1 hingga 200 transaksi.");
  const ids = new Set();
  const transactions = input.transactions.map((row, index) => {
    if (!row || typeof row !== "object") throw new Error(`Transaksi ${index + 1} tidak sah.`);
    const transactionDate = date(row.date, `Tarikh transaksi ${index + 1}`);
    if (transactionDate < start || transactionDate > end) throw new Error(`Transaksi ${index + 1} di luar tempoh report.`);
    const id = text(row.id, `ID transaksi ${index + 1}`, 100);
    if (ids.has(id)) throw new Error(`ID transaksi berulang: ${id}`);
    ids.add(id);
    if (!STATUSES.includes(row.status)) throw new Error(`Status transaksi ${index + 1} tidak sah.`);
    return { date: transactionDate, id, amount: cents(row.amount, `Amaun transaksi ${index + 1}`), status: row.status };
  });
  const vatRate = Number(input.vatRate);
  if (input.vatRate === "" || input.vatRate == null || !Number.isFinite(vatRate) || vatRate < 0 || vatRate > 100) throw new Error("VAT rate mesti antara 0 dan 100.");
  return { company, address, registration, account, start, end, currency: input.currency, paymentMethod, last4,
    transactions, total: transactions.reduce((sum, row) => sum + row.amount, 0),
    funds: cents(input.funds, "Funds added"), vatRate, vat: cents(input.vat, "VAT amount") };
}

function displayDate(value) {
  const [year, month, day] = value.split("-");
  return `${Number(month)}/${Number(day)}/${year}`;
}

function buildSummaryPdf(input) {
  const data = normalizeSummary(input);
  const doc = new PDFDocument({ size: "A4", margin: 0, info: { Title: "Billing Report", Author: data.company, Subject: "Company-prepared Meta Ads payment summary" } });
  const chunks = [];
  const result = new Promise((resolve, reject) => {
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
  const money = (amount) => data.currency + (amount / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const x = [49.96, 159.55, 326.25, 435.85, 545.31];
  const ink = "#1c2028";
  function write(value, left, top, width, size = 7, bold = false, align = "left") {
    doc.fillColor(ink).font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(size).text(value, left, top, { width, align, lineGap: 2 });
  }
  function header() {
    doc.image(path.join(__dirname, "../assets/meta-billing-logo.png"), 52.8, 56.69, { width: 56.69, height: 11.34 });
    let y = 78;
    const companyLines = [data.company, ...data.address, data.registration].filter(Boolean);
    for (const line of companyLines) {
      write(line, x[0], y, 310);
      y += Math.max(14.17, doc.heightOfString(line, { width: 310 }) + 4);
    }
    write(`Account: ${data.account}`, 365, 78, 201.93, 7, false, "right");
    const titleY = Math.max(158, y - 5);
    write(`Billing Report: ${displayDate(data.start)} - ${displayDate(data.end)}`, x[0], titleY, 495, 14, true);
    write("Ringkasan dalaman", x[0], titleY + 19, 495, 7);
    write("Meta Ads payment", x[0], titleY + 43, 495, 10);
    write(`Payment Method: ${data.paymentMethod}${data.last4 ? " ···· " + data.last4 : ""}`, x[0], titleY + 55.5, 495, 10);
    return titleY + 70;
  }
  function row(values, y, headerRow = false) {
    doc.font(headerRow ? "Helvetica-Bold" : "Helvetica").fontSize(7);
    const height = Math.max(25.71, ...values.map((value, i) => doc.heightOfString(value, { width: x[i + 1] - x[i] - 11.34 }) + 14));
    for (let i = 0; i < 4; i++) {
      doc.lineWidth(0.4).strokeColor("#bdbdbd").rect(x[i], y, x[i + 1] - x[i], height).stroke();
      write(values[i], x[i] + 5.67, y + 9, x[i + 1] - x[i] - 11.34, 7, headerRow, i > 1 ? "right" : "left");
    }
    return height;
  }
  let y = header();
  const titles = ["Date", "Transaction ID", "Amount", "Payment Status"];
  y += row(titles, y, true);
  for (const transaction of data.transactions) {
    doc.font("Helvetica").fontSize(7);
    const height = Math.max(25.71, doc.heightOfString(transaction.id, { width: x[2] - x[1] - 11.34 }) + 14);
    if (y + height > 730) {
      doc.addPage();
      y = header();
      y += row(titles, y, true);
    }
    y += row([displayDate(transaction.date), transaction.id, money(transaction.amount), transaction.status], y);
  }
  if (y + 145 > 770) { doc.addPage(); y = header(); }
  for (const [label, amount] of [["Total Amount Billed", data.total], ["Total Funds Added", data.funds]]) {
    doc.lineWidth(0.4).strokeColor("#bdbdbd").rect(x[0], y, x[4] - x[0], 28.35).stroke();
    write(label, 300, y + 10, 181, 8, true, "right");
    doc.font("Helvetica").fontSize(8);
    const amountSize = Math.min(8, 8 * 56.64 / Math.max(1, doc.widthOfString(money(amount))));
    write(money(amount), 483, y + 10, 56.64, amountSize, false, "right");
    y += 28.35;
  }
  write(`VAT Rate: ${data.vatRate}%`, 55.63, y + 34, 485, 6);
  write(`VAT Amount: ${money(data.vat)}`, 55.63, y + 53, 485, 6);
  doc.end();
  return result;
}

module.exports = { normalizeSummary, buildSummaryPdf, CURRENCIES, STATUSES };
