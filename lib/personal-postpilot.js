const PERSONAL_POST_ANGLE_COUNT = 120;

function cleanText(value) {
  return String(value || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function pickMatch(html, regex) {
  const match = String(html || "").match(regex);
  return cleanText(match?.[1] || "");
}

function pickMeta(html, nameOrProperty) {
  const escaped = nameOrProperty.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return pickMatch(html, new RegExp(`<meta[^>]+(?:name|property)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"))
    || pickMatch(html, new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${escaped}["'][^>]*>`, "i"));
}

function validateOptionalUrl(raw, label) {
  const value = String(raw || "").trim();
  if (!value) return "";
  const parsed = new URL(value);
  if (!["http:", "https:"].includes(parsed.protocol)) throw new Error(`${label} mesti URL http/https.`);
  return parsed.toString();
}

async function fetchProductContext(productLink) {
  const safeProductLink = validateOptionalUrl(productLink, "Product/salespage link");
  if (!safeProductLink) {
    return {
      ok: false,
      productName: "produk ini",
      summary: "",
      finalUrl: "",
    };
  }

  try {
    const response = await fetch(safeProductLink, {
      headers: {
        "user-agent": "PostPilot/1.0 (+https://post-pilot-taupe.vercel.app)",
        accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const html = await response.text();
    const title = pickMeta(html, "og:title") || pickMeta(html, "twitter:title") || pickMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
    const description = pickMeta(html, "description") || pickMeta(html, "og:description") || pickMeta(html, "twitter:description");
    const headings = [...html.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi)]
      .map((match) => cleanText(match[1]))
      .filter(Boolean)
      .slice(0, 4);

    return {
      ok: true,
      finalUrl: response.url || safeProductLink,
      productName: title || "produk ini",
      title,
      description,
      headings,
      summary: [description, ...headings].filter(Boolean).join(" ").slice(0, 460),
    };
  } catch (error) {
    return {
      ok: false,
      finalUrl: safeProductLink,
      productName: "produk ini",
      summary: "",
      error: error?.message || String(error),
    };
  }
}

function stripProductName(value) {
  return String(value || "produk ini")
    .replace(/\s*[-|–—]\s*.*/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 70) || "produk ini";
}

function removeUrls(value) {
  return String(value || "")
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/\s+\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function limitLines(value, maxLines = 6) {
  const lines = String(value || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, maxLines);
  return lines.join("\n\n");
}

function randomVariation(exclude = []) {
  const blocked = new Set((exclude || []).map((item) => Number(item)).filter(Number.isFinite));
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const next = Math.floor(Math.random() * PERSONAL_POST_ANGLE_COUNT);
    if (!blocked.has(next)) return next;
  }
  return Math.floor(Math.random() * PERSONAL_POST_ANGLE_COUNT);
}

const HOOKS = {
  soft: [
    "aku baru perasan satu benda pasal peluang online.",
    "dulu aku ingat benda ni cuma hype.",
    "makin lama aku tengok, makin jelas satu pattern.",
    "aku suka bila satu offer tak paksa orang percaya kosong-kosong.",
  ],
  hard: [
    "straight sikit: bukan semua peluang patut dikejar.",
    "kalau kau tengah cari sistem yang lebih jelas, baca ni.",
    "aku tak nak overhype benda ni, tapi offer ni memang patut difahami.",
    "ini antara offer yang aku rasa logik untuk orang baru tengok dulu.",
  ],
  proof: [
    "screenshot/proof selalu buat aku berhenti scroll.",
    "aku lebih percaya benda yang ada bukti daripada ayat cantik.",
    "yang buat aku pandang dua kali bukan claim, tapi proof.",
    "kalau ada bukti, baru aku sanggup baca sampai habis.",
  ],
  engagement: [
    "jujur jawab satu soalan ni.",
    "aku nak tahu orang lain fikir macam mana.",
    "soalan simple, tapi jawapan dia boleh buka mata.",
    "korang rasa benda ni normal atau kita je yang selalu tangguh?",
  ],
  objection: [
    "aku faham kalau orang skeptikal dengan benda macam ni.",
    "takut kena scam tu normal.",
    "aku pun dulu banyak fikir sebelum percaya benda macam ni.",
    "objection paling besar biasanya bukan duit, tapi trust.",
  ],
};

const QUESTIONS = {
  soft: [
    "kau pernah rasa macam ni juga?",
    "aku curious, kau nampak benda ni sebagai peluang atau noise?",
    "kalau kau dekat tempat aku, kau akan tengok dulu tak?",
  ],
  hard: [
    "kalau detail penuh ada, kau nak aku share dekat komen/DM?",
    "kau nak tengok offer dia dulu atau masih nak tunggu?",
    "kalau risiko dia rendah, kau sanggup belajar tak?",
  ],
  proof: [
    "kalau nampak proof macam ni, kau lebih yakin atau masih skeptikal?",
    "kau jenis percaya proof dulu atau baca detail dulu?",
    "proof macam ni cukup kuat untuk buat kau tanya lanjut tak?",
  ],
  engagement: [
    "komen satu word: sanggup atau belum?",
    "kalau pilih satu, apa halangan terbesar kau sekarang?",
    "kau team start kecil dulu atau tunggu ready?",
  ],
  objection: [
    "apa objection paling besar yang buat kau tak mula lagi?",
    "kalau aku jawab satu keraguan kau, apa yang kau nak tanya?",
    "kau lebih takut rugi duit atau rugi masa?",
  ],
};

const BODY_LINES = {
  soft: [
    "bukan sebab semua orang kena jual benda sama.",
    "tapi sebab ramai orang stuck bukan sebab malas, cuma tak ada sistem yang jelas.",
    "bila flow dia nampak simple, barulah rasa boleh mula tanpa serabut.",
  ],
  hard: [
    "yang aku suka, dia bukan suruh mula dari kosong.",
    "ada bahan, ada struktur, dan ada next step yang senang faham.",
    "untuk orang baru, benda macam ni boleh pendekkan banyak trial and error.",
  ],
  proof: [
    "aku bukan cari janji besar.",
    "aku cari tanda yang benda tu pernah jalan untuk orang sebenar.",
    "bila proof + sistem duduk sekali, baru offer tu nampak lebih waras.",
  ],
  engagement: [
    "ramai orang nak income kedua, tapi tersekat dekat langkah pertama.",
    "kadang bukan tak mampu, cuma tak tahu nak mula dekat mana.",
    "sebab tu aku suka tanya soalan dulu sebelum promote apa-apa.",
  ],
  objection: [
    "bukan semua benda online tu betul, memang kena tapis.",
    "tapi jangan sampai takut buat kita reject semua benda sebelum faham.",
    "baca detail, tengok proof, baru decide dengan kepala sejuk.",
  ],
};

function pick(list, variation, offset = 0) {
  return list[Math.abs(Number(variation || 0) + offset) % list.length];
}

function generatePersonalPostCopy({ productContext, personalBackground, angleNote, postMode, variation }) {
  const mode = HOOKS[postMode] ? postMode : "soft";
  const productName = stripProductName(productContext.productName);
  const personal = String(personalBackground || "").trim();
  const angle = String(angleNote || "").trim();

  const opener = personal
    ? `${personal.replace(/[.!?]+$/g, "")}, aku baru perasan benda ni.`
    : pick(HOOKS[mode], variation);
  const contextLine = angle
    ? angle.replace(/[.!?]+$/g, "") + "."
    : pick(BODY_LINES[mode], variation, 1);
  const productLine = productName === "produk ini"
    ? pick(BODY_LINES[mode], variation, 2)
    : `bila aku tengok ${productName}, yang menarik bukan sekadar produk dia.`;
  const bridgeLine = pick(BODY_LINES[mode], variation, 3);
  const question = pick(QUESTIONS[mode], variation, 4);

  return limitLines([
    opener,
    contextLine,
    productLine,
    bridgeLine,
    question,
  ].filter(Boolean).join("\n\n"));
}

function buildCommentCta({ affiliateLink, productLink, productContext, customComment }) {
  const cleanCustom = String(customComment || "").trim();
  if (cleanCustom) return cleanCustom;

  const link = validateOptionalUrl(affiliateLink, "Affiliate/comment link") || validateOptionalUrl(productLink, "Product/salespage link");
  const productName = stripProductName(productContext.productName);
  if (link) {
    return `Nak tengok detail ${productName}? Aku letak sini: ${link}\n\nKalau nak tanya dulu, komen/DM "INFO".`;
  }
  return `Kalau nak detail penuh, komen/DM "INFO". Aku share link dan explain ringkas.`;
}

async function buildPersonalPostPreview({
  productLink,
  affiliateLink,
  personalBackground,
  angleNote,
  postMode = "soft",
  customPost,
  customComment,
  variation = null,
}) {
  const safeProductLink = validateOptionalUrl(productLink, "Product/salespage link");
  const safeAffiliateLink = validateOptionalUrl(affiliateLink, "Affiliate/comment link");
  const productContext = await fetchProductContext(safeProductLink);
  const requestedVariation = Number(variation);
  const previewVariation = variation !== null && variation !== undefined && String(variation).trim() !== "" && Number.isFinite(requestedVariation)
    ? Math.abs(requestedVariation) % PERSONAL_POST_ANGLE_COUNT
    : randomVariation();
  const generatedPost = generatePersonalPostCopy({
    productContext,
    personalBackground,
    angleNote,
    postMode,
    variation: previewVariation,
  });
  const customPostText = customPost ? limitLines(removeUrls(customPost)) : "";
  const postText = customPostText || generatedPost;
  const commentCta = buildCommentCta({
    affiliateLink: safeAffiliateLink,
    productLink: safeProductLink,
    productContext,
    customComment,
  });

  return {
    preview: {
      created_at: new Date().toISOString(),
      product_link: safeProductLink,
      affiliate_link: safeAffiliateLink,
      personal_background: String(personalBackground || ""),
      angle_note: String(angleNote || ""),
      post_mode: HOOKS[postMode] ? postMode : "soft",
      post_text: postText,
      comment_cta: commentCta,
      product_context: productContext,
      variation: previewVariation,
      style: `${HOOKS[postMode] ? postMode : "soft"}-${(previewVariation % 12) + 1}`,
    },
  };
}

function regeneratePersonalPostPreview({
  productLink,
  affiliateLink,
  personalBackground,
  angleNote,
  postMode = "soft",
  productContext,
  customComment,
  variation = 0,
  seenVariations = [],
}) {
  const nextVariation = randomVariation([...seenVariations, variation]);
  const context = productContext || { productName: "produk ini" };
  const postText = generatePersonalPostCopy({
    productContext: context,
    personalBackground,
    angleNote,
    postMode,
    variation: nextVariation,
  });
  const commentCta = buildCommentCta({
    affiliateLink,
    productLink,
    productContext: context,
    customComment,
  });

  return {
    created_at: new Date().toISOString(),
    post_text: postText,
    comment_cta: commentCta,
    variation: nextVariation,
    style: `${HOOKS[postMode] ? postMode : "soft"}-${(nextVariation % 12) + 1}`,
  };
}

module.exports = {
  PERSONAL_POST_ANGLE_COUNT,
  buildPersonalPostPreview,
  regeneratePersonalPostPreview,
};
