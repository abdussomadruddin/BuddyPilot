function clean(value, max = 30000) {
  return String(value || "").trim().slice(0, max);
}

async function providerResponse(instructions, input, providerConfig) {
  const { provider, apiKey } = providerConfig;
  if (provider === "deepseek") {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: process.env.DEEPSEEK_MODEL || "deepseek-v4-flash",
        messages: [{ role: "system", content: instructions }, { role: "user", content: input }],
        thinking: { type: "disabled" },
      }),
    });
    const json = await response.json();
    if (!response.ok) throw new Error(json?.error?.message || "DeepSeek request gagal.");
    return clean(json?.choices?.[0]?.message?.content, 50000);
  }
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

async function loadProviderConfig() {
  let state = {};
  try {
    const row = await getCopyPilotSettings();
    state = row?.encrypted_openai_key ? decryptState(row.encrypted_openai_key) : {};
  } catch {}
  if (state.activeProvider === "deepseek" && clean(state.deepseekKey, 500)) {
    return { provider: "deepseek", apiKey: clean(state.deepseekKey, 500) };
  }
  const openaiKey = clean(process.env.OPENAI_API_KEY || state.openaiKey, 500);
  return { provider: "openai", apiKey: openaiKey };
}

async function saveProviderKey(value, requestedProvider) {
  const key = clean(value, 500);
  const provider = requestedProvider === "deepseek" ? "deepseek" : "openai";
  if (!/^[A-Za-z0-9_-]{20,}$/.test(key)) throw new Error("Format API key tidak sah.");
  const current = await getCopyPilotSettings().catch(() => null);
  const state = current?.encrypted_openai_key ? decryptState(current.encrypted_openai_key) : {};
  state[provider === "deepseek" ? "deepseekKey" : "openaiKey"] = key;
  state.activeProvider = provider;
  await saveCopyPilotSettings({ encryptedOpenaiKey: encryptState(state), keyHint: `${provider} ••••${key.slice(-4)}` });
  return { configured: true, provider, hint: `••••${key.slice(-4)}` };
}

async function openaiKeyStatus() {
  const environmentOpenaiKey = clean(process.env.OPENAI_API_KEY, 500);
  try {
    const row = await getCopyPilotSettings();
    const state = row?.encrypted_openai_key ? decryptState(row.encrypted_openai_key) : {};
    const provider = state.activeProvider === "deepseek" && state.deepseekKey ? "deepseek" : "openai";
    return {
      configured: Boolean(environmentOpenaiKey || state.openaiKey || state.deepseekKey),
      provider,
      openaiHint: environmentOpenaiKey ? "Vercel environment" : (state.openaiKey ? `••••${String(state.openaiKey).slice(-4)}` : ""),
      deepseekHint: state.deepseekKey ? `••••${String(state.deepseekKey).slice(-4)}` : "",
    };
  } catch {
    return {
      configured: Boolean(environmentOpenaiKey),
      provider: "openai",
      openaiHint: environmentOpenaiKey ? "Vercel environment" : "",
      deepseekHint: "",
    };
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
    warnings: ["Mode lokal digunakan. Tambah OpenAI atau DeepSeek API key untuk aktifkan semakan multi-agent."],
    repaired: false,
    localMode: true,
  };
}

async function generateCopyPilot(body = {}) {
  const context = commonContext(body);
  if (context.raw.length < 20) throw new Error("Tulisan kasar terlalu pendek untuk difahami.");
  const providerConfig = await loadProviderConfig();
  if (!providerConfig.apiKey) return localCopyPilot(context);

  const intent = parseJson(await providerResponse(
    "Anda Intent Analyzer. Jangan rewrite. Ekstrak intent penulis tanpa menambah fakta. Pulangkan JSON sahaja dengan keys topic, coreMessage, personalContext, opinion, facts, targetAudience, desiredEmotion, desiredCta, mustKeep, claimsToVerify, missingContext.",
    JSON.stringify(context),
    providerConfig
  ));

  const post = await providerResponse(
    `Anda Facebook Writer peribadi Abdussomad. Preserve idea, belief, pengalaman, fakta dan intent asal sepenuhnya. Jangan cipta pengalaman, result, data atau claim. Guna Malaysian Malay campur English secara natural, aku dan korang, perenggan pendek, banyak whitespace, tiada emoji, dash atau bahasa Indonesia. Technical terms kekal English. Sasaran maksimum ${context.length} karakter. Tone: ${context.tones.join(", ") || "Personal"}. Writing DNA:\n${context.dna}\nOutput posting sahaja.`,
    JSON.stringify({ context, intent }),
    providerConfig
  );

  const quality = parseJson(await providerResponse(
    "Anda Quality Checker. Bandingkan tulisan asal, intent dan output. Pulangkan JSON sahaja dengan keys pass(boolean), meaningChanged(boolean), inventedInformation(boolean), missingIdeas(array), tooFormal(boolean), indonesianWords(array), forbiddenDash(boolean), ctaPreserved(boolean), warnings(array).",
    JSON.stringify({ original: context.raw, intent, output: post }),
    providerConfig
  ));

  let finalPost = post;
  if (!quality.pass) {
    finalPost = await providerResponse(
      "Anda Auto Repair. Baiki hanya bahagian yang gagal dalam quality report. Jangan ubah bahagian lain, jangan tambah idea atau fakta. Kekalkan gaya Malaysian conversational, aku dan korang, tanpa emoji atau dash. Output posting sahaja.",
      JSON.stringify({ original: context.raw, intent, failedOutput: post, quality }),
      providerConfig
    );
  }

  return {
    post: finalPost.slice(0, context.length),
    intent,
    warnings: [...(intent.claimsToVerify || []), ...(intent.missingContext || []), ...(quality.warnings || [])].map(String).slice(0, 12),
    repaired: !quality.pass,
  };
}

module.exports = { generateCopyPilot, openaiKeyStatus, providerResponse, saveProviderKey };
const { decryptState, encryptState } = require("./tiktok-ads");
const { getCopyPilotSettings, saveCopyPilotSettings } = require("./supabase-db");
