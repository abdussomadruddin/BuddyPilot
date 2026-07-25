const PERSONAL_POST_ANGLE_COUNT = 120;
const DEFAULT_COMMENT_CTA_LINK = "https://swiy.co/kmethod";
const MAX_MAIN_POST_CHARS = 370;
const { generateAdaptivePost } = require("./postpilot-pattern-engine");
const ROBOTIC_PHRASES = [
  "yang menarik bukan sekadar produk dia",
  "sangat berpotensi",
  "harus diingat",
  "kesimpulannya",
  "dalam era digital",
  "adalah penting untuk",
  "membuka mata",
];

function defaultCommentCta(link = DEFAULT_COMMENT_CTA_LINK) {
  return `klik sini, ${link}`;
}

function validateOptionalUrl(raw, label) {
  const value = String(raw || "").trim();
  if (!value) return "";
  const parsed = new URL(value);
  if (!["http:", "https:"].includes(parsed.protocol)) throw new Error(`${label} mesti URL http/https.`);
  return parsed.toString();
}

function stripProductName(value) {
  return String(value || "produk ini")
    .replace(/\s+[-|–—]\s+.*/g, "")
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

function cleanMainPostText(value) {
  return removeUrls(value)
    .replace(/\*\*/g, "")
    .replace(/:/g, ",")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^klik\s+sini\s*[:,]?/i.test(line))
    .join("\n\n");
}

function limitMainPostLength(value) {
  const lines = String(value || "")
    .split(/\n{2,}/)
    .map((line) => line.trim())
    .filter(Boolean);
  const selected = [];
  let total = 0;
  for (const line of lines) {
    const nextTotal = total + line.length + (selected.length ? 2 : 0);
    if (selected.length >= 4 || nextTotal > MAX_MAIN_POST_CHARS) break;
    selected.push(line);
    total = nextTotal;
  }
  return selected.join("\n\n");
}

function appendMainPostLink(postText, link) {
  const safePost = limitMainPostLength(cleanMainPostText(postText));
  const safeLink = validateOptionalUrl(link, "Affiliate/comment link") || DEFAULT_COMMENT_CTA_LINK;
  return `${safePost}\n\nklik sini, ${safeLink}`.trim();
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
    "dulu aku ingat benda ni kena tunggu sampai betul-betul ready.",
    "mula-mula aku tengok sebab curious je.",
    "semalam aku terfikir pasal benda ni balik.",
    "aku makin suka benda yang senang nak faham.",
    "aku tak terus percaya. aku tengok pelan-pelan dulu.",
  ],
  hard: [
    "aku cakap terus je. kalau benda tu serabut, aku memang skip.",
    "aku dah penat tengok offer yang bunyi lawa tapi tak jelas.",
    "bagi aku mudah je. kalau masuk akal, baru aku tengok lagi.",
    "aku bukan jenis suka pusing jauh-jauh.",
    "kalau point dia tak jelas awal-awal, memang aku tak sambung baca.",
  ],
  proof: [
    "aku memang jenis tengok bukti dulu sebelum layan ayat panjang.",
    "bila nampak result orang sebenar, baru aku berhenti scroll.",
    "aku tak cari nombor besar sangat. aku cuma nak nampak benda tu pernah jalan.",
    "claim semua orang boleh buat. proof tu yang susah nak tipu.",
    "aku lagi senang percaya benda yang boleh nampak depan mata.",
  ],
  engagement: [
    "aku nak sembang jujur sikit pasal benda ni.",
    "aku rasa ramai pernah lalu benda yang sama.",
    "kadang aku tertanya, kita ni betul-betul tak boleh atau banyak sangat fikir.",
    "aku curious nak tahu cara orang lain tengok benda ni.",
    "benda ni nampak kecil, tapi ramai sangkut dekat sini.",
  ],
  objection: [
    "aku faham kalau kau susah nak percaya benda macam ni.",
    "jujur, aku pun banyak fikir sebelum bagi peluang.",
    "takut tersalah pilih tu normal. aku pun sama.",
    "aku bukan terus yakin. banyak benda aku check dulu.",
    "bila dah pernah kecewa, memang kita jadi lebih berhati-hati.",
  ],
};

const QUESTIONS = {
  soft: [
    "kalau kau dekat tempat aku, kau akan tengok dulu tak?",
    "kau pernah rasa nak mula, tapi kepala dah serabut dulu?",
    "kau jenis tengok dulu atau tunggu sampai betul-betul ready?",
    "kalau flow dia senang faham, kau rasa lebih berani nak cuba tak?",
    "kau pun suka benda yang straight forward macam ni ke?",
  ],
  hard: [
    "kalau semua benda dah jelas, apa lagi yang buat kau tunggu?",
    "kau nak benda yang nampak cantik atau benda yang senang nak buat?",
    "kalau kau nampak jalan dia, kau terus jalan atau fikir lagi?",
    "kau jenis terus test kecil-kecil atau tunggu perfect?",
    "jujur, benda apa yang selalu buat kau tak jadi mula?",
  ],
  proof: [
    "kau pun jenis tengok proof dulu baru percaya?",
    "bukti macam ni cukup buat kau berhenti dan tengok lagi tak?",
    "kau lebih percaya result kecil yang real atau claim besar?",
    "kalau nampak benda ni pernah jalan, kau sanggup belek detail dia tak?",
    "apa benda pertama yang kau check sebelum percaya satu offer?",
  ],
  engagement: [
    "kau team mula kecil-kecil atau tunggu semua ready?",
    "sekarang ni benda apa paling buat kau sangkut?",
    "kau rasa kita kurang ilmu atau terlalu banyak fikir?",
    "kalau boleh buang satu halangan, kau nak buang yang mana dulu?",
    "kau pernah tangguh benda baik sebab overthink macam ni?",
  ],
  objection: [
    "apa benda paling buat kau susah nak percaya?",
    "kau lebih risau rugi duit atau buang masa?",
    "kalau boleh tanya satu benda dulu, kau nak tanya apa?",
    "apa red flag pertama yang kau selalu cari?",
    "kau perlukan bukti, detail atau pengalaman orang dulu?",
  ],
};

const BODY_LINES = {
  soft: [
    "bila jalan dia nampak jelas, kepala pun rasa kurang serabut.",
    "kadang kita bukan malas. kita cuma tak tahu nak pegang yang mana dulu.",
    "aku suka bila boleh faham flow dia tanpa kena baca benda berjela.",
    "benda simple macam ni yang selalu buat aku rasa boleh mula.",
    "tak perlu terus besar. nampak first step pun dah cukup.",
  ],
  hard: [
    "aku nak nampak apa nak buat, bukan dengar janji kosong.",
    "bila next step jelas, senang nak decide benda ni sesuai atau tak.",
    "tak payah sembang besar. tunjuk flow, lepas tu biar orang nilai sendiri.",
    "aku lagi suka test kecil-kecil daripada tunggu keyakinan datang sendiri.",
    "kalau sistem dia boleh faham sekali baca, itu dah satu point besar.",
  ],
  proof: [
    "aku tak perlukan cerita hebat. aku nak tengok apa yang betul-betul berlaku.",
    "result kecil yang real lagi senang aku hadam daripada claim besar.",
    "bila ada bukti dan flow yang jelas, barulah aku rasa berbaloi nak tengok.",
    "aku cuma nak tahu benda tu pernah membantu orang yang situasi dia lebih kurang sama.",
    "proof bagi aku bukan untuk impress. dia bagi context.",
  ],
  engagement: [
    "ramai nak mula, tapi masing-masing tersangkut dekat benda yang berbeza.",
    "kadang kita dah tahu nak buat apa. cuma tangan tu tak gerak-gerak.",
    "bila sembang dengan kawan, baru sedar rupanya ramai rasa benda sama.",
    "aku rasa masalah sebenar selalu keluar bila kita cakap jujur.",
    "benda ni bukan pasal rajin semata-mata. kepala pun main peranan.",
  ],
  objection: [
    "memang kena tapis. bukan semua benda online boleh telan bulat-bulat.",
    "aku tengok detail dulu, lepas tu baru decide dengan kepala sejuk.",
    "berhati-hati tu bagus. cuma jangan sampai langsung tak bagi ruang untuk faham.",
    "aku suka check apa yang dapat, macam mana flow dia dan siapa yang dah cuba.",
    "bila benda tu jawab keraguan satu-satu, baru trust datang.",
  ],
};

const PRODUCT_LINES = {
  soft: [
    "bila aku belek {product}, flow dia nampak lebih senang nak hadam.",
    "aku tengah tengok {product}, dan cara dia susun benda tu rasa tak berat sangat.",
    "dekat {product}, aku nampak starting point yang lebih jelas.",
    "aku singgah tengok {product}. rupa-rupanya benda dia lebih straight forward daripada yang aku sangka.",
    "bila baca pasal {product}, baru aku nampak kenapa orang baru selalu perlukan flow.",
  ],
  hard: [
    "aku tengok {product} sebab nak tahu dia betul-betul jelas atau sekadar cakap manis.",
    "dekat {product}, sekurang-kurangnya aku boleh nampak apa yang orang akan buat dulu.",
    "aku belek {product}, dan point dia senang nak tangkap tanpa banyak pusing.",
    "bila tengok {product}, aku terus cari flow dia. itu yang paling penting bagi aku.",
    "{product} buat aku berhenti sekejap sebab penerangan dia tak sembunyi next step.",
  ],
  proof: [
    "aku mula tengok {product} bila nampak ada benda yang boleh aku semak sendiri.",
    "dekat {product}, aku lebih tertarik pada proof daripada ayat jualan dia.",
    "bila belek {product}, aku cari contoh yang real dulu sebelum baca benda lain.",
    "{product} masuk radar aku sebab ada context yang senang nak nilai.",
    "aku tengok {product} dari sudut paling simple, ada bukti atau tak.",
  ],
  engagement: [
    "masa aku tengok {product}, aku terfikir ramai sebenarnya sangkut dekat langkah pertama.",
    "{product} buat aku teringat berapa ramai orang nak mula tapi tak tahu nak pegang apa dulu.",
    "aku belek {product}, lepas tu terfikir benda ni selalu jadi topik bila sembang dengan kawan.",
    "bila nampak flow {product}, aku terus teringat perangai kita yang suka tunggu perfect.",
    "dekat {product}, benda paling obvious bagi aku ialah orang perlukan jalan yang jelas.",
  ],
  objection: [
    "aku tengok {product} dengan banyak soalan, bukan terus percaya.",
    "masa belek {product}, aku check benda yang selalu buat aku ragu dulu.",
    "{product} pun aku tengok pelan-pelan. aku nak faham dulu sebelum nilai.",
    "aku buka {product} dengan mindset skeptikal, sebab itu cara aku tapis benda online.",
    "dekat {product}, aku cari jawapan untuk benda yang biasanya buat orang takut nak mula.",
  ],
};

function pick(list, variation, offset = 0) {
  return list[Math.abs(Number(variation || 0) + offset) % list.length];
}

function lowerFirst(value) {
  const text = String(value || "").trim();
  return text ? text.charAt(0).toLowerCase() + text.slice(1) : "";
}

function socialSentence(value, ending = ".") {
  const text = String(value || "")
    .replace(/\*\*/g, "")
    .replace(/:/g, ",")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.!?])/g, "$1")
    .trim()
    .replace(/[.!?]+$/g, "");
  return text ? `${text}${ending}` : "";
}

function personalOpening(value) {
  const personal = String(value || "").trim().replace(/[.!?]+$/g, "");
  if (!personal) return "";
  if (/^aku\b/i.test(personal)) return socialSentence(personal);
  if (/^sebagai\b/i.test(personal)) return socialSentence(`aku cakap ni ${lowerFirst(personal)}`);
  if (/^(pernah|dulu|masa|bila)\b/i.test(personal)) return socialSentence(`aku ${lowerFirst(personal)}`);
  return socialSentence(`aku cakap ni sebab ${lowerFirst(personal)}`);
}

function angleObservation(value) {
  let angle = String(value || "").trim().replace(/[.!?]+$/g, "");
  if (!angle) return "";
  angle = angle.replace(/^gambar(?:\s+hook)?\s+(?:ni\s+)?/i, "");
  return socialSentence(`dekat gambar ni, ${lowerFirst(angle)}`);
}

function hasRoboticPhrase(value) {
  const lower = String(value || "").toLowerCase();
  return ROBOTIC_PHRASES.some((phrase) => lower.includes(phrase));
}

function generatePersonalPostCopy({
  productContext,
  personalBackground,
  angleNote,
  postMode,
  variation,
  platform = "facebook",
  affiliateLink = "",
  history = [],
  voiceProfile = {},
  forcedFamily = "",
  returnMetadata = false,
}) {
  const generated = generateAdaptivePost({
    platform,
    productName: stripProductName(productContext.productName),
    link: affiliateLink,
    mode: postMode,
    personalBackground,
    angleNote,
    history,
    voiceProfile,
    forcedFamily,
    seed: `${postMode}:${variation}:${platform}:${Date.now()}`,
  });
  if (hasRoboticPhrase(generated.postText)) throw new Error("Ayat generated terlalu skema. Jana semula copywriting.");
  return returnMetadata ? generated : generated.postText;
}

function buildCommentCta({ affiliateLink, productContext, customComment }) {
  const cleanCustom = String(customComment || "").trim();
  if (cleanCustom) return cleanCustom.replace(/\*\*/g, "").replace(/:(?!\/\/)/g, ",");

  const link = validateOptionalUrl(affiliateLink, "Affiliate/comment link")
    || DEFAULT_COMMENT_CTA_LINK;
  return defaultCommentCta(link);
}

async function buildPersonalPostPreview({
  productName,
  affiliateLink,
  personalBackground,
  angleNote,
  postMode = "soft",
  customPost,
  customComment,
  variation = null,
  history = [],
  voiceProfile = {},
  forcedFamily = "",
}) {
  const safeAffiliateLink = validateOptionalUrl(affiliateLink, "Affiliate/comment link");
  const postLink = safeAffiliateLink || DEFAULT_COMMENT_CTA_LINK;
  const safeProductName = String(productName || "").trim() || "produk ini";
  const productContext = {
    ok: true,
    productName: safeProductName,
    summary: "",
    finalUrl: "",
  };
  const requestedVariation = Number(variation);
  const previewVariation = variation !== null && variation !== undefined && String(variation).trim() !== "" && Number.isFinite(requestedVariation)
    ? Math.abs(requestedVariation) % PERSONAL_POST_ANGLE_COUNT
    : randomVariation();
  const facebookGenerated = generatePersonalPostCopy({
    productContext,
    personalBackground,
    angleNote,
    postMode,
    variation: previewVariation,
    platform: "facebook",
    affiliateLink: postLink,
    history: history.filter((item) => (item.channel || "") === "facebook"),
    voiceProfile,
    forcedFamily,
    returnMetadata: true,
  });
  const threadsGenerated = generatePersonalPostCopy({
    productContext,
    personalBackground,
    angleNote,
    postMode,
    variation: previewVariation + 7919,
    platform: "threads",
    affiliateLink: postLink,
    history: history.filter((item) => (item.channel || "") === "threads"),
    voiceProfile,
    forcedFamily: facebookGenerated.patternFamily,
    returnMetadata: true,
  });
  const customPostText = customPost ? appendMainPostLink(limitLines(cleanMainPostText(customPost), 3), postLink) : "";
  const facebookPostText = customPostText || facebookGenerated.postText;
  const threadsPostText = customPostText || threadsGenerated.postText;
  const commentCta = buildCommentCta({
    affiliateLink: safeAffiliateLink,
    productContext,
    customComment,
  });

  return {
    preview: {
      created_at: new Date().toISOString(),
      product_name: safeProductName,
      affiliate_link: safeAffiliateLink,
      personal_background: String(personalBackground || ""),
      angle_note: String(angleNote || ""),
      post_mode: HOOKS[postMode] ? postMode : "soft",
      post_text: facebookPostText,
      facebook_post_text: facebookPostText,
      threads_post_text: threadsPostText,
      comment_cta: commentCta,
      product_context: productContext,
      variation: previewVariation,
      style: `${facebookGenerated.patternFamily}-${(previewVariation % 120) + 1}`,
      pattern: {
        facebook: facebookGenerated,
        threads: threadsGenerated,
      },
    },
  };
}

function regeneratePersonalPostPreview({
  productName,
  affiliateLink,
  personalBackground,
  angleNote,
  postMode = "soft",
  productContext,
  customComment,
  variation = 0,
  seenVariations = [],
  history = [],
  voiceProfile = {},
}) {
  const nextVariation = randomVariation([...seenVariations, variation]);
  const context = productContext || { productName: "produk ini" };
  const postLink = validateOptionalUrl(affiliateLink, "Affiliate/comment link") || DEFAULT_COMMENT_CTA_LINK;
  const facebookGenerated = generatePersonalPostCopy({
    productContext: context,
    personalBackground,
    angleNote,
    postMode,
    variation: nextVariation,
    platform: "facebook",
    affiliateLink: postLink,
    history: history.filter((item) => (item.channel || "") === "facebook"),
    voiceProfile,
    returnMetadata: true,
  });
  const threadsGenerated = generatePersonalPostCopy({
    productContext: context,
    personalBackground,
    angleNote,
    postMode,
    variation: nextVariation + 7919,
    platform: "threads",
    affiliateLink: postLink,
    history: history.filter((item) => (item.channel || "") === "threads"),
    voiceProfile,
    forcedFamily: facebookGenerated.patternFamily,
    returnMetadata: true,
  });
  const commentCta = buildCommentCta({
    affiliateLink,
    productContext: context,
    customComment,
  });

  return {
    created_at: new Date().toISOString(),
    post_text: facebookGenerated.postText,
    facebook_post_text: facebookGenerated.postText,
    threads_post_text: threadsGenerated.postText,
    comment_cta: commentCta,
    variation: nextVariation,
    style: `${facebookGenerated.patternFamily}-${(nextVariation % 120) + 1}`,
    pattern: {
      facebook: facebookGenerated,
      threads: threadsGenerated,
    },
  };
}

module.exports = {
  PERSONAL_POST_ANGLE_COUNT,
  buildPersonalPostPreview,
  defaultCommentCta,
  generatePersonalPostCopy,
  regeneratePersonalPostPreview,
};
