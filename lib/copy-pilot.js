function clean(value, max = 30000) {
  return String(value || "").trim().slice(0, max);
}

async function openaiResponse(instructions, input, apiKey) {
  if (!apiKey) throw new Error("OPENAI_API_KEY belum diset dalam Vercel.");
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: process.env.COPY_PILOT_MODEL || "gpt-5-mini",
      instructions,
      input,
      store: false,
    }),
  });
  const json = await response.json();
  if (!response.ok) throw new Error(json?.error?.message || "OpenAI request gagal.");
  return clean(json.output_text, 50000);
}

async function loadOpenaiKey() {
  if (clean(process.env.OPENAI_API_KEY, 500)) return clean(process.env.OPENAI_API_KEY, 500);
  try {
    const row = await getCopyPilotSettings();
    return row?.encrypted_openai_key ? clean(decryptState(row.encrypted_openai_key)?.openaiKey, 500) : "";
  } catch {
    return "";
  }
}

async function saveOpenaiKey(value) {
  const key = clean(value, 500);
  if (!/^sk-[A-Za-z0-9_-]{20,}$/.test(key)) throw new Error("Format OpenAI API key tidak sah.");
  await saveCopyPilotSettings({ encryptedOpenaiKey: encryptState({ openaiKey: key }), keyHint: `••••${key.slice(-4)}` });
  return { configured: true, hint: `••••${key.slice(-4)}` };
}

async function openaiKeyStatus() {
  if (clean(process.env.OPENAI_API_KEY, 500)) return { configured: true, hint: "Vercel environment" };
  try {
    const row = await getCopyPilotSettings();
    return { configured: Boolean(row?.encrypted_openai_key), hint: clean(row?.key_hint, 50) };
  } catch {
    return { configured: false, hint: "" };
  }
}

function parseJson(value) {
  const match = String(value || "").match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Intent Analyzer tidak memulangkan JSON yang sah.");
  return JSON.parse(match[0]);
}

function commonContext(body) {
  return {
    title: clean(body.title, 500),
    raw: clean(body.raw),
    audience: clean(body.audience, 500),
    cta: clean(body.cta, 500),
    product: clean(body.product, 500),
    link: clean(body.link, 1000),
    length: Math.max(500, Math.min(30000, Number(body.length || 3000))),
    tones: Array.isArray(body.tones) ? body.tones.map((item) => clean(item, 50)).filter(Boolean) : [],
    dna: clean(body.dna, 5000),
  };
}

function localCopyPilot(context) {
  const paragraphs = context.raw
    .replace(/[—–]/g, ",")
    .replace(/\r/g, "")
    .split(/\n{2,}|(?<=[.!?])\s+(?=[A-Z0-9])/)
    .map((item) => item.trim().replace(/\s+/g, " "))
    .filter(Boolean);
  const parts = [];
  if (context.title && !paragraphs[0]?.toLowerCase().includes(context.title.toLowerCase())) parts.push(context.title);
  parts.push(...paragraphs);
  if (context.product && !parts.join(" ").toLowerCase().includes(context.product.toLowerCase())) parts.push(context.product);
  if (context.link && !parts.join(" ").includes(context.link)) parts.push(context.link);
  if (context.cta && !parts.join(" ").toLowerCase().includes(context.cta.toLowerCase())) parts.push(context.cta);
  return {
    post: parts.join("\n\n").slice(0, context.length),
    intent: {
      topic: context.title || paragraphs[0]?.slice(0, 120) || "",
      coreMessage: paragraphs[0] || "",
      targetAudience: context.audience,
      desiredCta: context.cta,
    },
    warnings: ["Mode lokal digunakan. Tambah OPENAI_API_KEY untuk aktifkan semakan multi-agent."],
    repaired: false,
    localMode: true,
  };
}

async function generateCopyPilot(body = {}) {
  const context = commonContext(body);
  if (context.raw.length < 20) throw new Error("Tulisan kasar terlalu pendek untuk difahami.");
  const apiKey = await loadOpenaiKey();
  if (!apiKey) return localCopyPilot(context);

  const intent = parseJson(await openaiResponse(
    "Anda Intent Analyzer. Jangan rewrite. Ekstrak intent penulis tanpa menambah fakta. Pulangkan JSON sahaja dengan keys topic, coreMessage, personalContext, opinion, facts, targetAudience, desiredEmotion, desiredCta, mustKeep, claimsToVerify, missingContext.",
    JSON.stringify(context),
    apiKey
  ));

  const post = await openaiResponse(
    `Anda Facebook Writer peribadi Abdussomad. Preserve idea, belief, pengalaman, fakta dan intent asal sepenuhnya. Jangan cipta pengalaman, result, data atau claim. Guna Malaysian Malay campur English secara natural, aku dan korang, perenggan pendek, banyak whitespace, tiada emoji, dash atau bahasa Indonesia. Technical terms kekal English. Sasaran maksimum ${context.length} karakter. Tone: ${context.tones.join(", ") || "Personal"}. Writing DNA:\n${context.dna}\nOutput posting sahaja.`,
    JSON.stringify({ context, intent }),
    apiKey
  );

  const quality = parseJson(await openaiResponse(
    "Anda Quality Checker. Bandingkan tulisan asal, intent dan output. Pulangkan JSON sahaja dengan keys pass(boolean), meaningChanged(boolean), inventedInformation(boolean), missingIdeas(array), tooFormal(boolean), indonesianWords(array), forbiddenDash(boolean), ctaPreserved(boolean), warnings(array).",
    JSON.stringify({ original: context.raw, intent, output: post }),
    apiKey
  ));

  let finalPost = post;
  if (!quality.pass) {
    finalPost = await openaiResponse(
      "Anda Auto Repair. Baiki hanya bahagian yang gagal dalam quality report. Jangan ubah bahagian lain, jangan tambah idea atau fakta. Kekalkan gaya Malaysian conversational, aku dan korang, tanpa emoji atau dash. Output posting sahaja.",
      JSON.stringify({ original: context.raw, intent, failedOutput: post, quality }),
      apiKey
    );
  }

  return {
    post: finalPost.slice(0, context.length),
    intent,
    warnings: [...(intent.claimsToVerify || []), ...(intent.missingContext || []), ...(quality.warnings || [])].map(String).slice(0, 12),
    repaired: !quality.pass,
  };
}

module.exports = { generateCopyPilot, openaiKeyStatus, saveOpenaiKey };
const { decryptState, encryptState } = require("./tiktok-ads");
const { getCopyPilotSettings, saveCopyPilotSettings } = require("./supabase-db");
