// Client onboarding form: a public link the owner sends to a new client. The
// client fills in their own details; each submission waits in BuddyPilot until
// the owner uses it to start onboarding or dismisses it. Nothing becomes a
// client without the owner. The price is set by the owner, not asked of the client. Submissions are kept in app_activity, so no new table.
const crypto = require("node:crypto");

const SUBMITTED = "client_intake_submitted";
const REVIEWED = "client_intake_reviewed";
const DAILY_LIMIT = 30;
const KEEP_DAYS = 90;

const FIELDS = [
  { key: "brandClient", label: "Nama brand / bisnes", required: true, max: 120 },
  { key: "contactName", label: "Nama PIC / owner", required: true, max: 120 },
  { key: "phone", label: "No telefon (WhatsApp)", required: true, max: 30, type: "tel" },
  { key: "email", label: "Emel", required: true, max: 160, type: "email" },
  { key: "companyName", label: "Nama syarikat", max: 160 },
  { key: "registrationNumber", label: "No pendaftaran / SSM", max: 60 },
  { key: "billingAddress", label: "Alamat billing penuh", max: 500, multiline: true },
  { key: "notes", label: "Website, page Facebook atau nota lain", max: 1000, multiline: true },
];

function clean(value, max) {
  return String(value ?? "").replace(/\r\n?/g, "\n").trim().slice(0, max);
}

function fail(message, statusCode = 400) {
  return Object.assign(new Error(message), { statusCode });
}

// Stable secret link token, derived from the app password so no setting is needed.
function intakeToken(env = process.env) {
  const secret = String(env.APP_PASSWORD || "");
  if (!secret) return "";
  return crypto.createHmac("sha256", secret).update("onboarding-intake-v1").digest("base64url").slice(0, 24);
}

function validToken(token, env = process.env) {
  const expected = intakeToken(env);
  const given = Buffer.from(String(token || ""));
  return Boolean(expected) && given.length === expected.length && crypto.timingSafeEqual(given, Buffer.from(expected));
}

function validateSubmission(body = {}) {
  // Hidden field: people never see it, form-filling bots usually fill it.
  if (clean(body.website, 200)) throw fail("Borang tidak sah.");
  const data = {};
  for (const field of FIELDS) {
    const value = clean(body[field.key], field.max);
    if (field.required && !value) throw fail(`${field.label} wajib diisi.`);
    data[field.key] = value;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) throw fail("Emel tidak sah.");
  if (!/^\+?[0-9][0-9\s-]{7,18}$/.test(data.phone)) throw fail("No telefon tidak sah.");
  return data;
}

function defaultDeps() {
  const db = require("./supabase-db");
  return {
    record: db.recordActivity,
    list: db.listActivityByTypes,
    push: async (payload) => require("./push-notifications").sendPushPayload(payload),
  };
}

async function submitIntake({ token, body, now = new Date(), env = process.env, deps = defaultDeps() }) {
  if (!validToken(token, env)) throw fail("Link borang tidak sah atau sudah ditukar.", 404);
  const data = validateSubmission(body);
  const recent = await deps.list([SUBMITTED], new Date(now.getTime() - 86400000).toISOString());
  if ((recent || []).length >= DAILY_LIMIT) throw fail("Terlalu banyak borang dihantar hari ini. Cuba lagi esok.", 429);
  const saved = await deps.record({
    type: SUBMITTED,
    title: `Borang onboarding baru: ${data.brandClient}`,
    description: `${data.contactName} · ${data.phone}`,
    entityType: "client_intake",
    metadata: { intake: data, submittedAt: now.toISOString() },
  });
  // The submission is saved either way; a failed phone notification does not lose it.
  try {
    await deps.push({ title: "Client baru isi borang onboarding", body: `${data.brandClient} (${data.contactName}) menunggu semakan anda.`, url: "/?tab=clientpilot&panel=client-add-panel", tag: "client-intake" });
  } catch {}
  return { id: saved?.id || "" };
}

function pendingFrom(submitted = [], reviewed = []) {
  const done = new Set(reviewed.map((item) => String(item.entityId || item.metadata?.intakeId || "")));
  return submitted
    .filter((item) => item.id && !done.has(String(item.id)) && item.metadata?.intake)
    .map((item) => ({ id: item.id, submittedAt: item.metadata.submittedAt || item.createdAt, ...item.metadata.intake }));
}

async function listPendingIntakes({ now = new Date(), deps = defaultDeps() } = {}) {
  const since = new Date(now.getTime() - KEEP_DAYS * 86400000).toISOString();
  const [submitted, reviewed] = await Promise.all([deps.list([SUBMITTED], since), deps.list([REVIEWED], since)]);
  return pendingFrom(submitted || [], reviewed || []);
}

async function reviewIntake({ id, action, deps = defaultDeps() }) {
  const intakeId = clean(id, 80);
  if (!intakeId) throw fail("Borang tidak dijumpai.");
  if (!["used", "dismissed"].includes(action)) throw fail("Tindakan tidak sah.");
  await deps.record({
    type: REVIEWED,
    title: action === "used" ? "Borang onboarding digunakan" : "Borang onboarding dibuang",
    entityType: "client_intake",
    entityId: intakeId,
    metadata: { intakeId, action },
  });
  return { id: intakeId, action };
}

module.exports = { FIELDS, REVIEWED, SUBMITTED, intakeToken, listPendingIntakes, pendingFrom, reviewIntake, submitIntake, validToken, validateSubmission };
