const { Readable } = require("node:stream");
const fs = require("node:fs");
const PDFDocument = require("pdfkit");
const { google } = require("googleapis");
const { getInvoiceConfig } = require("./invoice-config");

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";
const CLIENT_REGISTRY_FILE = "client-registry.json";
const BUSINESS_SETTINGS_FILE = "business-settings.json";
const CLIENT_FOLDER_PREFIX = "LBM x ";
const WEEKLY_REPORT_FOLDER = "Weekly Report";
const INVOICE_RECEIPT_FOLDER = "Invoice & Receipt";

function currentPeriod(timezone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  return `${year}-${month}`;
}

function validatePeriod(rawPeriod, timezone) {
  const period = String(rawPeriod || "").trim() || currentPeriod(timezone);
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) {
    throw new Error("Period mesti format YYYY-MM.");
  }
  return period;
}

function periodParts(period) {
  const [year, month] = period.split("-").map(Number);
  return { year, month };
}

function periodKey(period) {
  return period.replace("-", "");
}

function periodLabel(period) {
  const { year, month } = periodParts(period);
  return new Intl.DateTimeFormat("en-MY", {
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function todayIso(timezone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return `${year}-${month}-${day}`;
}

function money(amount, currency = "MYR") {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(Number(amount || 0));
}

function parseAmount(value, fieldName) {
  const clean = String(value ?? "")
    .replace(/,/g, "")
    .trim();
  const amount = clean === "" ? 0 : Number(clean);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error(`${fieldName} mesti nombor 0 atau lebih.`);
  }
  return Math.round(amount * 100) / 100;
}

function cleanClientCode(code) {
  const clean = String(code || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "");
  if (!clean) throw new Error("Client code wajib ada.");
  return clean;
}

function clientCodeFromBrand(brandClient) {
  return cleanClientCode(
    String(brandClient || "")
      .replace(/&/g, " and ")
      .replace(/\([^)]*\)/g, " ")
  );
}

function safeFilePart(value) {
  return String(value || "")
    .replace(/[\\/:*?"<>|#%{}~&]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 90);
}

function normalizeClient(client) {
  const code = cleanClientCode(client.code || clientCodeFromBrand(client.brandClient || client.name));
  const amount = Number(client.monthlyRetainer || 0);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error(`Monthly retainer tidak sah untuk ${code}.`);
  }

  return {
    ...client,
    code,
    brandClient: String(client.brandClient || client.name || client.billingName || code).trim(),
    contactName: String(client.contactName || client.nama || "").trim(),
    companyName: String(client.companyName || client.namaSyarikat || "").trim(),
    registrationNumber: String(client.registrationNumber || client.noPendaftaran || client.ssm || "").trim(),
    email: String(client.email || client.emel || "").trim(),
    phone: String(client.phone || client.noTelefon || "").trim(),
    name: String(client.name || client.brandClient || client.billingName || code).trim(),
    billingName: String(client.billingName || client.companyName || client.namaSyarikat || client.name || client.brandClient || code).trim(),
    billingAddress: String(client.billingAddress || "").trim(),
    monthlyRetainer: amount,
    driveFolderId: String(client.driveFolderId || "").trim(),
    driveFolderName: String(client.driveFolderName || client.name || client.billingName || code).trim(),
    weeklyReportFolderId: String(client.weeklyReportFolderId || "").trim(),
    invoiceReceiptFolderId: String(client.invoiceReceiptFolderId || "").trim(),
  };
}

function getClients(config = getInvoiceConfig()) {
  return (config.clients || []).map(normalizeClient);
}

function findClient(code, config = getInvoiceConfig()) {
  const target = cleanClientCode(code);
  const client = getClients(config).find((item) => item.code === target);
  if (!client) throw new Error(`Client ${target} tidak dijumpai dalam invoice config.`);
  return client;
}

function buildInvoice({ client, period, config = getInvoiceConfig(), overrides = {} }) {
  const cleanClient = normalizeClient(client);
  const cleanPeriod = validatePeriod(period, config.timezone);
  const subtotal = Object.prototype.hasOwnProperty.call(overrides, "servicePrice")
    ? parseAmount(overrides.servicePrice, "Harga Service")
    : cleanClient.monthlyRetainer;
  const discount = Object.prototype.hasOwnProperty.call(overrides, "discount")
    ? parseAmount(overrides.discount, "Diskaun")
    : parseAmount(cleanClient.discount || 0, "Diskaun");
  if (discount > subtotal) throw new Error(`Diskaun tidak boleh lebih tinggi daripada Harga Service untuk ${cleanClient.code}.`);
  const taxRate = Number(config.defaults.taxRate || 0);
  const tax = 0;
  const total = subtotal - discount + tax;
  const invoiceNumber = `INV-${periodKey(cleanPeriod)}-${cleanClient.code}`;
  const label = periodLabel(cleanPeriod);

  return {
    invoiceNumber,
    period: cleanPeriod,
    periodLabel: label,
    invoiceDate: todayIso(config.timezone),
    dueDate: todayIso(config.timezone),
    currency: config.defaults.currency || "MYR",
    terms: config.defaults.terms || "due_on_receipt",
    client: cleanClient,
    business: config.business,
    lineItems: [
      {
        description: `Monthly Ads Management Retainer - ${label}`,
        quantity: 1,
        unitPrice: subtotal,
        amount: subtotal,
      },
    ],
    subtotal,
    discount,
    taxRate,
    tax,
    total,
    fileName: `${invoiceNumber} - ${safeFilePart(cleanClient.name)}.pdf`,
  };
}

function buildInvoiceList(period) {
  const config = getInvoiceConfig();
  const cleanPeriod = validatePeriod(period, config.timezone);
  return buildInvoiceListFromClients(cleanPeriod, getClients(config), config);
}

function buildInvoiceListFromClients(period, clients, config = getInvoiceConfig()) {
  const cleanPeriod = validatePeriod(period, config.timezone);
  return clients.map((client) => {
    const invoice = buildInvoice({ client, period: cleanPeriod, config });
    const canResolveDriveFolder = Boolean(client.driveFolderId || (config.driveMasterFolderId && client.driveFolderName));
    return {
      clientCode: client.code,
      clientName: client.name,
      billingName: client.billingName,
      invoiceNumber: invoice.invoiceNumber,
      period: invoice.period,
      periodLabel: invoice.periodLabel,
      servicePrice: invoice.subtotal,
      servicePriceFormatted: money(invoice.subtotal, invoice.currency),
      discount: invoice.discount,
      discountFormatted: money(invoice.discount, invoice.currency),
      amount: invoice.total,
      amountFormatted: money(invoice.total, invoice.currency),
      fileName: invoice.fileName,
      hasDriveFolder: canResolveDriveFolder,
      pdfUrl: `/api/invoices/pdf?client=${encodeURIComponent(client.code)}&period=${encodeURIComponent(cleanPeriod)}`,
    };
  });
}

function writeAddress(doc, text, options = {}) {
  const lines = String(text || "")
    .split(/\r?\n|,\s*/)
    .map((line) => line.trim())
    .filter(Boolean);
  for (const line of lines) doc.text(line, options);
}

function compactContact(parts) {
  return parts
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join("  |  ");
}

function uniqueLines(lines) {
  const seen = new Set();
  return lines.filter((line) => {
    const clean = String(line || "").trim();
    if (!clean) return false;
    const key = clean.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function splitLines(value) {
  return String(value || "")
    .replace(/\\n/g, "\n")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function formatDateDmy(iso) {
  const [year, month, day] = String(iso || "").split("-");
  if (!year || !month || !day) return iso;
  return `${day}-${month}-${year}`;
}

function malayPeriodLabel(period) {
  const { year, month } = periodParts(period);
  return new Intl.DateTimeFormat("ms-MY", {
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function drawLogo(doc, invoice, x, y) {
  const logoPath = invoice.business.logoPath;
  if (logoPath && fs.existsSync(logoPath)) {
    doc.image(logoPath, x, y, { fit: [54, 54] });
    return;
  }

  doc.rect(x, y, 54, 54).fill("#f3f4f6");
  doc
    .font("Helvetica-Bold")
    .fontSize(26)
    .fillColor("#9b111e")
    .text(String(invoice.business.name || "LB").slice(0, 2).toUpperCase(), x, y + 13, {
      width: 54,
      align: "center",
    });
}

function drawInfoBlock(doc, { x, y, label, lines, labelHeight = 62, contentWidth = 290 }) {
  doc.rect(x, y, 54, labelHeight).fill("#dfeae4");
  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor("#111827")
    .text(label, x + 5, y + 8, { width: 44 });

  doc.rect(x + 58, y, contentWidth, labelHeight).fill("#f3f6f5");
  let cursorY = y + 7;
  lines.forEach((line, index) => {
    doc
      .font(index === 0 ? "Helvetica-Bold" : "Helvetica")
      .fontSize(9)
      .fillColor("#111827")
      .text(line, x + 63, cursorY, { width: contentWidth - 10 });
    cursorY += index === 0 ? 11 : 10;
  });
}

function drawWrappedText(doc, text, x, y, width, options = {}) {
  doc
    .font(options.font || "Helvetica")
    .fontSize(options.size || 9)
    .fillColor(options.color || "#111827")
    .text(text, x, y, {
      width,
      lineGap: options.lineGap ?? 1,
      align: options.align || "left",
    });
  return doc.y;
}

function renderInvoicePdf(invoice) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 22 });
    const chunks = [];
    const green = "#3f8f73";
    const pale = "#dfeae4";
    const light = "#f3f6f5";
    const border = "#d6ddd9";
    const pageWidth = doc.page.width;
    const left = 22;
    const right = pageWidth - 22;
    const contentWidth = right - left;
    const leftContentW = 290;
    const rightPanelX = 380;
    const rightPanelW = right - rightPanelX;
    const rightValueX = 498;
    const rightValueW = right - rightValueX;

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("error", reject);
    doc.on("end", () => resolve(Buffer.concat(chunks)));

    drawLogo(doc, invoice, left, 22);
    doc
      .font("Helvetica-Bold")
      .fontSize(30)
      .fillColor(green)
      .text("INVOIS", 380, 44, { width: 172, align: "right" });

    doc.moveTo(left, 85).lineTo(right, 85).lineWidth(0.8).strokeColor("#b9c3be").stroke();

    const businessLines = [
      `${invoice.business.name}${invoice.business.registrationNumber ? ` (${invoice.business.registrationNumber})` : ""}`,
      ...splitLines(invoice.business.address),
      compactContact([invoice.business.email, invoice.business.phone]),
    ].filter(Boolean);
    drawInfoBlock(doc, {
      x: left,
      y: 92,
      label: "Dari:",
      labelHeight: 64,
      contentWidth: leftContentW,
      lines: businessLines,
    });

    const companyLine = invoice.client.registrationNumber
      ? `${invoice.client.companyName || invoice.client.billingName} (${invoice.client.registrationNumber})`
      : invoice.client.companyName || invoice.client.billingName;
    const clientLines = uniqueLines([
      invoice.client.contactName,
      ...splitLines(companyLine),
      ...splitLines(invoice.client.billingAddress),
      compactContact([invoice.client.email, invoice.client.phone]),
    ]);
    drawInfoBlock(doc, {
      x: left,
      y: 170,
      label: "Invois\nkepada:",
      labelHeight: 74,
      contentWidth: leftContentW,
      lines: clientLines,
    });

    doc.rect(rightPanelX, 92, rightPanelW, 35).fill(pale);
    doc
      .font("Helvetica-Bold")
      .fontSize(13)
      .fillColor("#000000")
      .text(`#${invoice.invoiceNumber}`, rightPanelX + 5, 108, { width: rightPanelW - 10, align: "center" });

    doc.font("Helvetica").fontSize(9).fillColor("#000000");
    doc.text("Tarikh Invois:", rightPanelX, 138, { width: rightValueX - rightPanelX - 4, align: "right" });
    doc.rect(rightValueX, 127, rightValueW, 24).fill(green);
    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor("#ffffff")
      .text(formatDateDmy(invoice.invoiceDate), rightValueX + 3, 136, { width: rightValueW - 6, align: "center" });
    doc.font("Helvetica").fontSize(9).fillColor("#000000");
    doc.text("Bayar Sebelum:", rightPanelX, 162, { width: rightValueX - rightPanelX - 4, align: "right" });
    doc.rect(rightValueX, 151, rightValueW, 24).fill(green);
    doc.fillColor("#000000").text("Status:", rightPanelX, 186, { width: rightValueX - rightPanelX - 4, align: "right" });
    doc.rect(rightValueX, 175, rightValueW, 25).strokeColor(green).stroke();
    doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .fillColor("#c59b24")
      .text("Baharu", rightValueX + 3, 183, { width: rightValueW - 6, align: "center" });

    if (invoice.business.paymentLink) {
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor("#000000")
        .text("Bayar melalui FPX Online di sini", rightPanelX + 3, 212, { width: rightPanelW - 6, align: "center" });
      doc
        .fillColor(green)
        .text(invoice.business.paymentLink, rightPanelX + 3, 225, { width: rightPanelW - 6, align: "center", underline: true });
    }

    const serviceTitle = invoice.business.serviceTitle || invoice.serviceTitle || "Lead Generation Ads & Funnelling";
    const defaults = getInvoiceConfig().defaults;
    const itemTitle = defaults.serviceTitle || serviceTitle;
    const serviceDescription = defaults.serviceDescription || invoice.lineItems[0].description;
    const serviceScope = defaults.serviceScope || "";
    const serviceNote = defaults.serviceNote || "";

    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .fillColor("#000000")
      .text(`PERKHIDMATAN: ${String(itemTitle).toUpperCase()}`, left, 308, { width: contentWidth });

	    const tableTop = 332;
	    const tablePad = 8;
	    const col = {
	      no: { x: left, w: 22 },
	      item: { x: left + 22, w: 310 },
	      unit: { x: left + 332, w: 68 },
	      qty: { x: left + 400, w: 66 },
	      amount: { x: left + 466, w: right - (left + 466) },
	    };
	    const cell = (column, pad = tablePad) => ({
	      x: column.x + pad,
	      w: Math.max(1, column.w - pad * 2),
	    });
	    doc.rect(left, tableTop, contentWidth, 21).fill(green);
	    doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#ffffff");
	    doc.text("#", cell(col.no, 5).x, tableTop + 7, { width: cell(col.no, 5).w, align: "center" });
	    doc.text("Item/Keterangan", cell(col.item).x, tableTop + 7, { width: cell(col.item).w });
	    doc.text("Harga/Unit", cell(col.unit).x, tableTop + 7, { width: cell(col.unit).w, align: "right" });
	    doc.text("Kuantiti/Unit", cell(col.qty, 6).x, tableTop + 7, { width: cell(col.qty, 6).w, align: "right" });
	    doc.text("Jumlah (MYR)", cell(col.amount).x, tableTop + 7, { width: cell(col.amount).w, align: "right" });

	    const bodyTop = tableTop + 21;
	    const bodyHeight = 248;
	    doc.rect(left, bodyTop, contentWidth, bodyHeight).fill(light).strokeColor(border).stroke();
	    [col.item.x, col.unit.x, col.qty.x, col.amount.x].forEach((x) => {
	      doc.moveTo(x, bodyTop).lineTo(x, bodyTop + bodyHeight).strokeColor(border).stroke();
	    });

	    doc.font("Helvetica").fontSize(8.5).fillColor("#000000").text("1", cell(col.no, 5).x, bodyTop + 13, {
	      width: cell(col.no, 5).w,
	      align: "center",
	    });
	    let itemY = bodyTop + 13;
	    doc
	      .font("Helvetica")
	      .fontSize(8.5)
	      .fillColor("#000000")
	      .text(`Perkhidmatan: ${itemTitle}`, cell(col.item).x, itemY, { width: cell(col.item).w });
	    itemY += 22;
	    itemY = drawWrappedText(doc, serviceDescription, cell(col.item).x, itemY, cell(col.item).w, { size: 8.5 });
	    itemY += 12;
	    doc.font("Helvetica").fontSize(8.5).fillColor("#000000").text("Skop Perkhidmatan", cell(col.item).x, itemY);
	    itemY += 11;
	    const scopeLines = String(serviceScope || "")
	      .split(/\r?\n/)
	      .map((line) => line.trim())
	      .filter(Boolean);
	    scopeLines.forEach((line) => {
	      doc.text(`- ${line.replace(/^[-•]\s*/, "")}`, cell(col.item).x, itemY, { width: cell(col.item).w });
	      itemY += 10;
	    });
	    itemY += 6;
	    doc.text("Nota", cell(col.item).x, itemY);
	    itemY += 11;
	    drawWrappedText(doc, serviceNote, cell(col.item).x, itemY, cell(col.item).w, { size: 8.5 });

	    doc
	      .font("Helvetica-Bold")
	      .fontSize(8.5)
	      .fillColor("#000000")
	      .text(Number(invoice.subtotal).toLocaleString("en-MY", { minimumFractionDigits: 2 }), cell(col.unit).x, bodyTop + 13, {
	        width: cell(col.unit).w,
	        align: "right",
	      })
	      .text("1 Unit", cell(col.qty).x, bodyTop + 13, { width: cell(col.qty).w, align: "right" })
	      .text(Number(invoice.subtotal).toLocaleString("en-MY", { minimumFractionDigits: 2 }), cell(col.amount).x, bodyTop + 13, {
	        width: cell(col.amount).w,
	        align: "right",
	      });

    const afterTable = bodyTop + bodyHeight + 12;
    doc
      .font("Helvetica-Bold")
      .fontSize(8.5)
      .fillColor("#000000")
      .text("Catatan/Nota:", left + 3, afterTable);
    doc
      .font("Helvetica")
      .fontSize(8.5)
      .text(`Untuk Bulan ${malayPeriodLabel(invoice.period)}`, left + 3, afterTable + 11);
    doc
      .font("Helvetica")
      .fontSize(8.5)
      .fillColor("#888888")
      .text("Invois ini dijana secara automatik, tandatangan tidak diperlukan", left + 3, afterTable + 42);

	    const totalsX = col.unit.x + tablePad;
	    const totalsValueX = col.amount.x;
	    const totalsValueW = right - totalsValueX;
    const totalsTop = bodyTop + bodyHeight;
    const totals = [
      ["Sub-Jumlah (MYR):", Number(invoice.subtotal).toLocaleString("en-MY", { minimumFractionDigits: 2 })],
      ["Diskaun (MYR):", Number(invoice.discount || 0).toLocaleString("en-MY", { minimumFractionDigits: 2 })],
      ["Cukai (MYR):", Number(invoice.tax).toLocaleString("en-MY", { minimumFractionDigits: 2 })],
      ["Penghantaran (MYR):", "0.00"],
    ];
    totals.forEach(([label, value], index) => {
      const rowY = totalsTop + index * 21;
	      doc.font("Helvetica").fontSize(8.5).fillColor("#000000").text(label, totalsX, rowY + 7, {
	        width: totalsValueX - totalsX - tablePad,
	        align: "right",
	      });
	      doc.rect(totalsValueX, rowY, totalsValueW, 21).fill(pale);
	      doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#000000").text(value, totalsValueX + tablePad, rowY + 7, {
	        width: totalsValueW - tablePad * 2,
	        align: "right",
	      });
	    });
	    doc.font("Helvetica").fontSize(8.5).fillColor("#000000").text("Jumlah Akhir (MYR):", totalsX, totalsTop + 91, {
	      width: totalsValueX - totalsX - tablePad,
	      align: "right",
	    });
	    doc.rect(totalsValueX, totalsTop + 84, totalsValueW, 21).fill(green);
    doc
	      .font("Helvetica-Bold")
	      .fontSize(8.5)
	      .fillColor("#ffffff")
	      .text(Number(invoice.total).toLocaleString("en-MY", { minimumFractionDigits: 2 }), totalsValueX + tablePad, totalsTop + 91, {
	        width: totalsValueW - tablePad * 2,
	        align: "right",
	      });

	    const paymentTop = 712;
	    doc.rect(left, paymentTop, contentWidth, 20).fill(pale).strokeColor(border).stroke();
	    doc.font("Helvetica").fontSize(9).fillColor("#000000").text("Sila buat pembayaran ke akaun berikut", left + 10, paymentTop + 6, {
	      width: contentWidth - 20,
	    });
	    doc.rect(left, paymentTop + 20, contentWidth, 48).fill(light).strokeColor(border).stroke();
	    doc
	      .font("Helvetica-Bold")
	      .fontSize(9)
	      .fillColor("#111827")
	      .text(invoice.business.bankName || "Bank", left + 52, paymentTop + 30, { width: contentWidth - 104 });
    const bankLine = compactContact([
      invoice.business.bankAccountNumber,
      invoice.business.bankAccountName && `(${invoice.business.bankAccountName})`,
    ]) || invoice.business.paymentDetails || "-";
	    doc.font("Helvetica-Bold").fontSize(9).text(bankLine, left + 52, paymentTop + 45, { width: contentWidth - 104 });

	    doc.end();
  });
}

async function generateInvoicePdf({ clientCode, period, overrides = {} }) {
  const { config, clients } = await getMergedClientsWithStatus();
  const cleanPeriod = validatePeriod(period, config.timezone);
  const target = cleanClientCode(clientCode);
  const client = clients.find((item) => item.code === target);
  if (!client) throw new Error(`Client ${target} tidak dijumpai dalam invoice config/registry.`);
  const invoice = buildInvoice({ client, period: cleanPeriod, config, overrides });
  const buffer = await renderInvoicePdf(invoice);
  return { invoice, buffer };
}

function getGoogleOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET dan GOOGLE_REDIRECT_URI dahulu.");
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

function googleAuthUrl() {
  const oauth2Client = getGoogleOAuthClient();
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [DRIVE_SCOPE],
  });
}

async function exchangeGoogleCode(code) {
  const oauth2Client = getGoogleOAuthClient();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

function getDriveClient() {
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  if (!refreshToken) throw new Error("Set GOOGLE_REFRESH_TOKEN dahulu selepas OAuth setup.");

  const auth = getGoogleOAuthClient();
  auth.setCredentials({ refresh_token: refreshToken });
  return google.drive({ version: "v3", auth });
}

function configuredDriveClient() {
  try {
    return getDriveClient();
  } catch (error) {
    return null;
  }
}

function driveQueryValue(value) {
  return String(value || "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function normalizeFolderName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeBusinessSettings(input = {}, fallback = getInvoiceConfig().business) {
  return {
    name: String(input.name || fallback.name || "").trim(),
    registrationNumber: String(input.registrationNumber || input.regNo || fallback.registrationNumber || "").trim(),
    email: String(input.email || fallback.email || "").trim(),
    phone: String(input.phone || fallback.phone || "").trim(),
    address: String(input.address || fallback.address || "").trim(),
    paymentDetails: String(input.paymentDetails || fallback.paymentDetails || "").trim(),
    bankName: String(input.bankName || fallback.bankName || "").trim(),
    bankAccountNumber: String(input.bankAccountNumber || fallback.bankAccountNumber || "").trim(),
    bankAccountName: String(input.bankAccountName || fallback.bankAccountName || "").trim(),
    paymentLink: String(input.paymentLink || fallback.paymentLink || "").trim(),
    logoPath: String(input.logoPath || fallback.logoPath || "").trim(),
  };
}

async function listDriveFolders(drive, parentFolderId) {
  const folders = [];
  let pageToken;

  do {
    const response = await drive.files.list({
      q: [
        `'${driveQueryValue(parentFolderId)}' in parents`,
        "mimeType = 'application/vnd.google-apps.folder'",
        "trashed = false",
      ].join(" and "),
      fields: "nextPageToken, files(id, name)",
      pageSize: 100,
      pageToken,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    folders.push(...(response.data.files || []));
    pageToken = response.data.nextPageToken;
  } while (pageToken);

  return folders;
}

async function findClientFolderInMaster(drive, masterFolderId, folderName) {
  const exact = await drive.files.list({
    q: [
      `'${driveQueryValue(masterFolderId)}' in parents`,
      "mimeType = 'application/vnd.google-apps.folder'",
      `name = '${driveQueryValue(folderName)}'`,
      "trashed = false",
    ].join(" and "),
    fields: "files(id, name)",
    pageSize: 2,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  if ((exact.data.files || []).length === 1) return exact.data.files[0];
  if ((exact.data.files || []).length > 1) {
    throw new Error(`Ada lebih dari satu folder bernama ${folderName} dalam master folder.`);
  }

  const target = normalizeFolderName(folderName);
  const folders = await listDriveFolders(drive, masterFolderId);
  const matches = folders.filter((folder) => normalizeFolderName(folder.name) === target);
  if (matches.length === 1) return matches[0];
  if (matches.length > 1) {
    throw new Error(`Ada lebih dari satu folder yang match ${folderName} dalam master folder.`);
  }
  return null;
}

async function ensureDriveFolder(drive, parentFolderId, folderName) {
  const existing = await findClientFolderInMaster(drive, parentFolderId, folderName);
  if (existing?.id) return existing;

  const created = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentFolderId],
    },
    fields: "id, name",
    supportsAllDrives: true,
  });

  return created.data;
}

async function findRegistryFile(drive, masterFolderId) {
  return findDriveFileByName(drive, masterFolderId, CLIENT_REGISTRY_FILE);
}

async function readClientRegistry(drive, masterFolderId) {
  const file = await findRegistryFile(drive, masterFolderId);
  if (!file?.id) {
    return {
      fileId: "",
      clients: [],
      createdAt: new Date().toISOString(),
      updatedAt: "",
    };
  }

  const response = await drive.files.get(
    { fileId: file.id, alt: "media", supportsAllDrives: true },
    { responseType: "text" }
  );
  const registry = JSON.parse(response.data || "{}");
  return {
    fileId: file.id,
    clients: Array.isArray(registry.clients) ? registry.clients : [],
    createdAt: registry.createdAt || "",
    updatedAt: registry.updatedAt || "",
  };
}

async function writeClientRegistry(drive, masterFolderId, registry) {
  const payload = {
    version: 1,
    createdAt: registry.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    clients: registry.clients || [],
  };
  const body = Readable.from(Buffer.from(JSON.stringify(payload, null, 2)));
  const media = {
    mimeType: "application/json",
    body,
  };

  if (registry.fileId) {
    const updated = await drive.files.update({
      fileId: registry.fileId,
      media,
      fields: "id, name, webViewLink",
      supportsAllDrives: true,
    });
    return updated.data;
  }

  const created = await drive.files.create({
    requestBody: {
      name: CLIENT_REGISTRY_FILE,
      mimeType: "application/json",
      parents: [masterFolderId],
    },
    media,
    fields: "id, name, webViewLink",
    supportsAllDrives: true,
  });
  return created.data;
}

async function findBusinessSettingsFile(drive, masterFolderId) {
  return findDriveFileByName(drive, masterFolderId, BUSINESS_SETTINGS_FILE);
}

async function readBusinessSettings(drive, masterFolderId, fallback = getInvoiceConfig().business) {
  const file = await findBusinessSettingsFile(drive, masterFolderId);
  if (!file?.id) {
    return {
      fileId: "",
      settings: normalizeBusinessSettings({}, fallback),
      createdAt: new Date().toISOString(),
      updatedAt: "",
    };
  }

  const response = await drive.files.get(
    { fileId: file.id, alt: "media", supportsAllDrives: true },
    { responseType: "text" }
  );
  const saved = JSON.parse(response.data || "{}");
  return {
    fileId: file.id,
    settings: normalizeBusinessSettings(saved.settings || saved.business || saved, fallback),
    createdAt: saved.createdAt || "",
    updatedAt: saved.updatedAt || "",
  };
}

async function writeBusinessSettings(drive, masterFolderId, data, fallback = getInvoiceConfig().business) {
  const existing = await readBusinessSettings(drive, masterFolderId, fallback);
  const payload = {
    version: 1,
    createdAt: existing.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    settings: normalizeBusinessSettings(data, fallback),
  };
  const media = {
    mimeType: "application/json",
    body: Readable.from(Buffer.from(JSON.stringify(payload, null, 2))),
  };

  if (existing.fileId) {
    const updated = await drive.files.update({
      fileId: existing.fileId,
      media,
      fields: "id, name, webViewLink",
      supportsAllDrives: true,
    });
    return { settings: payload.settings, file: updated.data };
  }

  const created = await drive.files.create({
    requestBody: {
      name: BUSINESS_SETTINGS_FILE,
      mimeType: "application/json",
      parents: [masterFolderId],
    },
    media,
    fields: "id, name, webViewLink",
    supportsAllDrives: true,
  });
  return { settings: payload.settings, file: created.data };
}

async function getBusinessSettingsWithStatus() {
  const config = getInvoiceConfig();
  const masterFolderId = String(config.driveMasterFolderId || "").trim();
  const drive = configuredDriveClient();
  const fallback = normalizeBusinessSettings({}, config.business);

  if (!drive || !masterFolderId) {
    return {
      settings: fallback,
      status: {
        ok: false,
        loaded: false,
        error: !masterFolderId ? "INVOICE_DRIVE_MASTER_FOLDER_ID belum diset." : "Google OAuth belum diset.",
      },
    };
  }

  try {
    const saved = await readBusinessSettings(drive, masterFolderId, config.business);
    return {
      settings: saved.settings,
      status: {
        ok: true,
        loaded: Boolean(saved.fileId),
        fileId: saved.fileId,
      },
    };
  } catch (error) {
    return {
      settings: fallback,
      status: {
        ok: false,
        loaded: false,
        error: error?.message || String(error),
      },
    };
  }
}

async function saveBusinessSettings(data) {
  const config = getInvoiceConfig();
  const masterFolderId = String(config.driveMasterFolderId || "").trim();
  if (!masterFolderId) throw new Error("INVOICE_DRIVE_MASTER_FOLDER_ID belum diset.");

  const drive = getDriveClient();
  return writeBusinessSettings(drive, masterFolderId, data, config.business);
}

async function getInvoiceRuntimeConfig() {
  const config = getInvoiceConfig();
  const { settings, status } = await getBusinessSettingsWithStatus();
  return {
    ...config,
    business: settings,
    settingsStatus: status,
  };
}

function mergeClients(configClients, registryClients) {
  const byCode = new Map();
  for (const client of configClients) {
    const normalized = normalizeClient(client);
    byCode.set(normalized.code, normalized);
  }
  for (const client of registryClients || []) {
    const normalized = normalizeClient(client);
    byCode.set(normalized.code, normalized);
  }
  return [...byCode.values()];
}

async function getMergedClientsWithStatus() {
  const config = await getInvoiceRuntimeConfig();
  const configClients = getClients(config);
  const masterFolderId = String(config.driveMasterFolderId || "").trim();
  const drive = configuredDriveClient();

  if (!drive || !masterFolderId) {
    return {
      config,
      clients: configClients,
      settingsStatus: config.settingsStatus,
      registryStatus: {
        ok: false,
        loaded: false,
        error: !masterFolderId ? "INVOICE_DRIVE_MASTER_FOLDER_ID belum diset." : "Google OAuth belum diset.",
      },
    };
  }

  try {
    const registry = await readClientRegistry(drive, masterFolderId);
    return {
      config,
      clients: mergeClients(configClients, registry.clients),
      settingsStatus: config.settingsStatus,
      registryStatus: {
        ok: true,
        loaded: true,
        fileId: registry.fileId,
        count: registry.clients.length,
      },
    };
  } catch (error) {
    return {
      config,
      clients: configClients,
      settingsStatus: config.settingsStatus,
      registryStatus: {
        ok: false,
        loaded: false,
        error: error?.message || String(error),
      },
    };
  }
}

function normalizeNewClientPayload(body) {
  const brandClient = String(body.brandClient || body.brand_client || "").trim();
  if (!brandClient) throw new Error("Brand client wajib diisi.");
  const code = clientCodeFromBrand(brandClient);
  const monthlyRetainer = parseAmount(body.monthlyRetainer || body.servicePrice || 0, "Harga Service");

  return normalizeClient({
    brandClient,
    name: brandClient,
    code,
    contactName: body.contactName || body.nama,
    email: body.email || body.emel,
    phone: body.phone || body.noTelefon,
    companyName: body.companyName || body.namaSyarikat,
    registrationNumber: body.registrationNumber || body.noPendaftaran,
    billingName: body.companyName || body.namaSyarikat || brandClient,
    billingAddress: body.billingAddress || body.alamat,
    monthlyRetainer,
    driveFolderName: `${CLIENT_FOLDER_PREFIX}${brandClient}`,
  });
}

function clientEditPatch(body, existingClient) {
  const patch = {};

  if (Object.prototype.hasOwnProperty.call(body, "brandClient") || Object.prototype.hasOwnProperty.call(body, "brand_client")) {
    const brandClient = String(body.brandClient || body.brand_client || "").trim();
    if (!brandClient) throw new Error("Brand client wajib diisi.");
    patch.brandClient = brandClient;
    patch.name = brandClient;
  }

  if (Object.prototype.hasOwnProperty.call(body, "contactName") || Object.prototype.hasOwnProperty.call(body, "nama")) {
    patch.contactName = String(body.contactName || body.nama || "").trim();
  }
  if (Object.prototype.hasOwnProperty.call(body, "email") || Object.prototype.hasOwnProperty.call(body, "emel")) {
    patch.email = String(body.email || body.emel || "").trim();
  }
  if (Object.prototype.hasOwnProperty.call(body, "phone") || Object.prototype.hasOwnProperty.call(body, "noTelefon")) {
    patch.phone = String(body.phone || body.noTelefon || "").trim();
  }
  if (Object.prototype.hasOwnProperty.call(body, "companyName") || Object.prototype.hasOwnProperty.call(body, "namaSyarikat")) {
    const companyName = String(body.companyName || body.namaSyarikat || "").trim();
    patch.companyName = companyName;
    patch.billingName = companyName || patch.brandClient || existingClient.billingName || existingClient.brandClient;
  }
  if (Object.prototype.hasOwnProperty.call(body, "registrationNumber") || Object.prototype.hasOwnProperty.call(body, "noPendaftaran")) {
    patch.registrationNumber = String(body.registrationNumber || body.noPendaftaran || "").trim();
  }
  if (Object.prototype.hasOwnProperty.call(body, "billingAddress") || Object.prototype.hasOwnProperty.call(body, "alamat")) {
    patch.billingAddress = String(body.billingAddress || body.alamat || "").trim();
  }
  if (Object.prototype.hasOwnProperty.call(body, "monthlyRetainer") || Object.prototype.hasOwnProperty.call(body, "servicePrice")) {
    patch.monthlyRetainer = parseAmount(body.monthlyRetainer || body.servicePrice || 0, "Harga Service");
  }

  return patch;
}

async function updateClientDetails(body) {
  const config = getInvoiceConfig();
  const masterFolderId = String(config.driveMasterFolderId || "").trim();
  if (!masterFolderId) throw new Error("INVOICE_DRIVE_MASTER_FOLDER_ID belum diset.");

  const code = cleanClientCode(body.clientCode || body.code);
  const drive = getDriveClient();
  const registry = await readClientRegistry(drive, masterFolderId);
  registry.clients = registry.clients || [];

  const configClients = getClients(config);
  const allExisting = mergeClients(configClients, registry.clients);
  const existingClient = allExisting.find((client) => client.code === code);
  if (!existingClient) throw new Error(`Client ${code} tidak dijumpai.`);

  const patch = clientEditPatch(body, existingClient);
  const nextBrand = patch.brandClient || existingClient.brandClient || existingClient.name;
  const duplicate = allExisting.find((client) => (
    client.code !== code
    && normalizeFolderName(client.brandClient || client.name) === normalizeFolderName(nextBrand)
  ));
  if (duplicate) throw new Error(`Client ${nextBrand} sudah wujud.`);

  const registryIndex = registry.clients.findIndex((client) => {
    const registryCode = cleanClientCode(client.code || clientCodeFromBrand(client.brandClient || client.name));
    return registryCode === code;
  });
  const registryClient = registryIndex >= 0
    ? normalizeClient(registry.clients[registryIndex])
    : existingClient;
  const now = new Date().toISOString();
  const updatedClient = normalizeClient({
    ...registryClient,
    ...patch,
    code,
    source: "drive-registry",
    driveFolderId: registryClient.driveFolderId || existingClient.driveFolderId,
    driveFolderName: registryClient.driveFolderName || existingClient.driveFolderName,
    weeklyReportFolderId: registryClient.weeklyReportFolderId || existingClient.weeklyReportFolderId,
    invoiceReceiptFolderId: registryClient.invoiceReceiptFolderId || existingClient.invoiceReceiptFolderId,
    createdAt: registryClient.createdAt || existingClient.createdAt || now,
    updatedAt: now,
  });

  if (registryIndex >= 0) {
    registry.clients[registryIndex] = updatedClient;
  } else {
    registry.clients.push(updatedClient);
  }

  const registryFile = await writeClientRegistry(drive, masterFolderId, registry);
  return { client: updatedClient, registryFile };
}

async function createClientWithDriveFolders(body) {
  const config = getInvoiceConfig();
  const masterFolderId = String(config.driveMasterFolderId || "").trim();
  if (!masterFolderId) throw new Error("INVOICE_DRIVE_MASTER_FOLDER_ID belum diset.");

  const drive = getDriveClient();
  const registry = await readClientRegistry(drive, masterFolderId);
  const newClient = normalizeNewClientPayload(body);
  const allExisting = mergeClients(getClients(config), registry.clients);
  const targetBrand = normalizeFolderName(newClient.brandClient);
  const duplicate = allExisting.find((client) => (
    client.code === newClient.code
    || normalizeFolderName(client.brandClient || client.name) === targetBrand
  ));
  if (duplicate) throw new Error(`Client ${newClient.brandClient} sudah wujud.`);

  const clientFolder = await ensureDriveFolder(drive, masterFolderId, newClient.driveFolderName);
  const weeklyFolder = await ensureDriveFolder(drive, clientFolder.id, WEEKLY_REPORT_FOLDER);
  const invoiceFolder = await ensureDriveFolder(drive, clientFolder.id, INVOICE_RECEIPT_FOLDER);

  const savedClient = {
    ...newClient,
    source: "drive-registry",
    driveFolderId: clientFolder.id,
    driveFolderName: clientFolder.name,
    weeklyReportFolderId: weeklyFolder.id,
    invoiceReceiptFolderId: invoiceFolder.id,
    createdAt: new Date().toISOString(),
  };
  registry.clients.push(savedClient);
  const registryFile = await writeClientRegistry(drive, masterFolderId, registry);

  return {
    client: savedClient,
    folders: {
      client: clientFolder,
      weeklyReport: weeklyFolder,
      invoiceReceipt: invoiceFolder,
    },
    registryFile,
  };
}

async function resolveClientDriveFolder(drive, client, config) {
  if (client.driveFolderId) return client.driveFolderId;

  const masterFolderId = String(config.driveMasterFolderId || "").trim();
  if (!masterFolderId) {
    throw new Error(`Folder Drive belum diset untuk ${client.code}.`);
  }

  const folderName = client.driveFolderName || client.name;
  const folder = await findClientFolderInMaster(drive, masterFolderId, folderName);
  if (!folder?.id) {
    throw new Error(`Folder client ${folderName} tidak dijumpai dalam master folder Drive.`);
  }

  return folder.id;
}

async function ensureNamedSubfolder(drive, parentFolderId, folderName) {
  const response = await drive.files.list({
    q: [
      `'${driveQueryValue(parentFolderId)}' in parents`,
      "mimeType = 'application/vnd.google-apps.folder'",
      `name = '${driveQueryValue(folderName)}'`,
      "trashed = false",
    ].join(" and "),
    fields: "files(id, name)",
    pageSize: 1,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  const existing = response.data.files?.[0];
  if (existing?.id) return existing.id;

  const created = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentFolderId],
    },
    fields: "id",
    supportsAllDrives: true,
  });

  return created.data.id;
}

async function ensureInvoicesFolder(drive, parentFolderId) {
  return ensureNamedSubfolder(drive, parentFolderId, INVOICE_RECEIPT_FOLDER);
}

async function findDriveFileByName(drive, folderId, fileName) {
  const response = await drive.files.list({
    q: [
      `'${driveQueryValue(folderId)}' in parents`,
      `name = '${driveQueryValue(fileName)}'`,
      "trashed = false",
    ].join(" and "),
    fields: "files(id, name, webViewLink)",
    pageSize: 1,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  return response.data.files?.[0] || null;
}

async function uploadInvoiceToDrive({ drive, invoice, buffer, config }) {
  const clientFolderId = await resolveClientDriveFolder(drive, invoice.client, config);
  const invoicesFolderId = invoice.client.invoiceReceiptFolderId || await ensureInvoicesFolder(drive, clientFolderId);
  const existing = await findDriveFileByName(drive, invoicesFolderId, invoice.fileName);
  const media = {
    mimeType: "application/pdf",
    body: Readable.from(buffer),
  };

  if (existing?.id) {
    const updated = await drive.files.update({
      fileId: existing.id,
      media,
      fields: "id, name, webViewLink",
      supportsAllDrives: true,
    });
    return { ...updated.data, replaced: true, invoicesFolderId };
  }

  const created = await drive.files.create({
    requestBody: {
      name: invoice.fileName,
      mimeType: "application/pdf",
      parents: [invoicesFolderId],
    },
    media,
    fields: "id, name, webViewLink",
    supportsAllDrives: true,
  });

  return { ...created.data, replaced: false, invoicesFolderId };
}

function draftOverridesByClient(drafts = []) {
  const result = new Map();
  for (const draft of Array.isArray(drafts) ? drafts : []) {
    const clientCode = cleanClientCode(draft.clientCode || draft.code);
    result.set(clientCode, {
      servicePrice: draft.servicePrice,
      discount: draft.discount,
    });
  }
  return result;
}

async function uploadInvoices({ period, drafts = [] }) {
  const { config, clients } = await getMergedClientsWithStatus();
  const cleanPeriod = validatePeriod(period, config.timezone);
  const drive = getDriveClient();
  const overridesByClient = draftOverridesByClient(drafts);
  const results = [];

  for (const client of clients) {
    const invoice = buildInvoice({
      client,
      period: cleanPeriod,
      config,
      overrides: overridesByClient.get(client.code) || {},
    });
    const buffer = await renderInvoicePdf(invoice);
    const upload = await uploadInvoiceToDrive({ drive, invoice, buffer, config });
    results.push({
      clientCode: client.code,
      clientName: client.name,
      invoiceNumber: invoice.invoiceNumber,
      fileName: invoice.fileName,
      fileId: upload.id,
      webViewLink: upload.webViewLink,
      replaced: upload.replaced,
      invoicesFolderId: upload.invoicesFolderId,
    });
  }

  return results;
}

module.exports = {
  buildInvoiceList,
  buildInvoiceListFromClients,
  createClientWithDriveFolders,
  currentPeriod,
  exchangeGoogleCode,
  generateInvoicePdf,
  getBusinessSettingsWithStatus,
  getMergedClientsWithStatus,
  googleAuthUrl,
  money,
  saveBusinessSettings,
  updateClientDetails,
  uploadInvoices,
  validatePeriod,
};
