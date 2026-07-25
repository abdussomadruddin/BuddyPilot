const crypto = require("node:crypto");

const CONTENT_MIX = Object.freeze({
  story: 25,
  quote: 20,
  insight: 20,
  opinion: 15,
  list: 10,
  recommendation: 10,
});

const FAMILY_ORDER = Object.keys(CONTENT_MIX);
const RATING_WEIGHTS = Object.freeze({ winner: 1.8, average: 1, weak: 0.35 });
const DEFAULT_VOICE_PROFILE = Object.freeze({
  pronouns: "aku_kau",
  slang: "moderate",
  englishMix: "light",
  emoji: false,
  preferredPhrases: [],
  bannedPhrases: [],
});

const OPENERS = {
  story: [
    "tadi aku teringat satu benda pasal {topic}",
    "mula-mula aku ingat {topic} ni susah sangat",
    "aku pernah tangguh benda ni lama juga",
    "semalam masa tengah scroll, aku terfikir pasal {topic}",
    "aku baru perasan satu benda yang aku selalu buat",
    "dulu aku jenis tunggu semua ready dulu",
  ],
  quote: [
    "benda yang nampak perlahan kadang sebenarnya sedang bina momentum",
    "tak semua progress perlu bising untuk jadi real",
    "bila jalan dah jelas, berani tu datang sendiri",
    "simple bukan bermaksud senang, simple bermaksud kita dah faham",
    "orang tak selalu perlukan motivasi, kadang dia cuma perlukan arah",
    "mula kecil masih dikira mula",
  ],
  insight: [
    "aku makin sedar ramai bukan tak rajin",
    "benda paling underrated pasal {topic} ialah consistency",
    "kadang masalah sebenar bukan kurang ilmu",
    "aku perasan kita selalu cari jawapan yang jauh",
    "lagi lama aku buat benda ni, lagi jelas aku rasa",
    "ramai fokus dekat hasil, tapi terlepas bahagian paling penting",
  ],
  opinion: [
    "jujur aku rasa {topic} tak perlu dibuat complicated",
    "aku mungkin tak sependapat dengan ramai orang pasal ni",
    "bagi aku, tunggu perfect tu perangkap",
    "hot take sikit, sibuk tak semestinya bergerak",
    "aku dah tak percaya semua benda kena mula besar",
    "pendapat aku simple je",
  ],
  list: [
    "kalau aku kena mula balik, aku pegang tiga benda ni",
    "tiga benda kecil yang banyak selamatkan masa aku",
    "aku simplify {topic} jadi tiga benda je",
    "sekarang aku check tiga benda ni dulu",
  ],
  recommendation: [
    "kalau tengah stuck, cuba kecilkan next step dulu",
    "satu benda yang aku rasa berbaloi cuba",
    "kalau baru nak mula, jangan tambah benda dulu",
    "aku lebih suka test kecil-kecil macam ni",
    "cuba tengok benda ni dari sudut paling simple",
  ],
};

const MIDDLES = [
  "bila semua benda masuk sekali, memang kepala terus rasa berat",
  "lepas pecahkan satu-satu, baru nampak mana yang betul-betul penting",
  "rupanya kita bukan tak boleh, kita cuma cuba fikir terlalu banyak benda serentak",
  "bila first step jelas, badan sendiri rasa lebih ringan nak bergerak",
  "progress kecil tu yang bagi keyakinan untuk sambung",
  "aku tak perlukan plan cantik, aku perlukan langkah yang boleh dibuat hari ni",
  "kadang satu keputusan kecil dah cukup ubah momentum satu hari",
  "yang susah bukan buat, yang susah nak pilih benda pertama",
  "bila berhenti compare dengan orang, flow sendiri terus nampak",
  "tak semua benda kena jadi content besar untuk bagi kesan",
  "aku lagi percaya benda yang boleh ulang daripada benda yang nampak hebat sekali",
  "benda ni nampak basic, tapi benda ni lah yang buat jalan tu nampak",
];

const ENDINGS = {
  promote: [
    "kau jenis terus test atau tengok dulu?",
    "kalau kau dekat tempat aku, kau akan cuba tak?",
    "kau pun pernah stuck dekat benda yang sama?",
    "benda apa paling selalu buat kau tangguh?",
    "kau suka flow simple atau detail terus?",
    "",
    "",
  ],
  general: ["", "", "", "", ""],
};

const PRODUCT_LINES = [
  "sebab tu bila aku tengok {product}, aku terus cari bahagian yang boleh dibuat dulu",
  "aku belek {product} dari sudut tu, bukan sebab nak percaya terus",
  "{product} masuk radar aku masa aku tengah cari jalan yang lebih senang nak ikut",
  "dekat {product}, aku nampak satu starting point yang tak rasa terlalu berat",
  "aku tengok {product} pelan-pelan, lepas tu baru nampak flow dia",
  "masa jumpa {product}, aku terus check sama ada benda ni praktikal untuk orang biasa",
];

const LIST_ITEMS = [
  ["jelaskan benda pertama", "buat versi paling kecil", "ulang sampai nampak flow"],
  ["buang benda tak perlu", "pilih satu target", "habiskan sebelum tambah kerja"],
  ["mula walaupun belum confident", "catat apa yang jalan", "kemaskan sambil bergerak"],
  ["tengok masalah sebenar", "buat satu keputusan", "jangan tukar plan terlalu cepat"],
];

const TONE_PREFIX = {
  Bold: ["aku cakap terus je", "straight to the point"],
  Emotional: ["jujur benda ni memang kena dekat aku", "ada masa benda ni rasa berat"],
  Funny: ["kelakar juga bila fikir balik", "otak kita ni kadang pandai tambah kerja"],
  Professional: ["kalau tengok secara praktikal", "daripada pengalaman aku"],
  Controversial: ["mungkin ramai tak setuju", "aku tahu ni unpopular opinion"],
  Soft: ["aku rasa pelan-pelan pun tak apa", "aku cuma nak share benda kecil ni"],
  Direct: ["senang cerita", "aku terus pergi point dia"],
  Storytelling: ["cerita dia macam ni", "aku pernah lalu situasi ni"],
  Educational: ["cara paling senang aku faham benda ni", "kalau pecahkan proses dia"],
  Casual: ["aku baru perasan", "random thought hari ni"],
};

function hashNumber(value) {
  const digest = crypto.createHash("sha256").update(String(value)).digest();
  return digest.readUInt32BE(0);
}

function createRng(seed = `${Date.now()}-${Math.random()}`) {
  let state = hashNumber(seed) || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}

function pick(list, rng) {
  return list[Math.floor(rng() * list.length)] || list[0] || "";
}

function shuffle(list, rng) {
  const output = [...list];
  for (let index = output.length - 1; index > 0; index -= 1) {
    const target = Math.floor(rng() * (index + 1));
    [output[index], output[target]] = [output[target], output[index]];
  }
  return output;
}

function cleanText(value) {
  return String(value || "")
    .replace(/\*\*/g, "")
    .replace(/:/g, ",")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.!?])/g, "$1")
    .trim();
}

function sentence(value, ending = ".") {
  const text = cleanText(value).replace(/[.!?]+$/g, "");
  return text ? `${text}${ending}` : "";
}

function normalizeVoiceProfile(profile = {}) {
  const preferredPhrases = Array.isArray(profile.preferredPhrases)
    ? profile.preferredPhrases
    : String(profile.preferredPhrases || "").split(",");
  const bannedPhrases = Array.isArray(profile.bannedPhrases)
    ? profile.bannedPhrases
    : String(profile.bannedPhrases || "").split(",");
  return {
    ...DEFAULT_VOICE_PROFILE,
    ...profile,
    emoji: Boolean(profile.emoji),
    preferredPhrases: preferredPhrases.map(cleanText).filter(Boolean).slice(0, 20),
    bannedPhrases: bannedPhrases.map(cleanText).filter(Boolean).slice(0, 30),
  };
}

function normalizedWords(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2);
}

function shingles(value, size = 3) {
  const words = normalizedWords(value);
  if (words.length <= size) return new Set([words.join(" ")].filter(Boolean));
  return new Set(words.slice(0, words.length - size + 1).map((_, index) => words.slice(index, index + size).join(" ")));
}

function semanticSimilarity(left, right) {
  const a = shingles(left);
  const b = shingles(right);
  if (!a.size || !b.size) return 0;
  let hits = 0;
  a.forEach((value) => {
    if (b.has(value)) hits += 1;
  });
  return hits / Math.max(a.size, b.size);
}

function textHash(value) {
  return crypto.createHash("sha256").update(cleanText(value).toLowerCase()).digest("hex");
}

function structuralFingerprint(value) {
  const paragraphs = String(value || "").split(/\n{2,}/).filter(Boolean);
  const lengths = paragraphs.map((part) => {
    if (part.length < 55) return "s";
    if (part.length < 110) return "m";
    return "l";
  });
  return `${paragraphs.length}:${lengths.join("")}:${/\n\d[.)]/.test(value) ? "list" : "plain"}:${/\?$/.test(value.trim()) ? "q" : "nq"}`;
}

function familyDeck(count, rng) {
  const deck = [];
  const remainders = [];
  Object.entries(CONTENT_MIX).forEach(([family, percent]) => {
    const exact = (count * percent) / 100;
    const slots = Math.floor(exact);
    for (let index = 0; index < slots; index += 1) deck.push(family);
    remainders.push({ family, remainder: exact - slots, weight: percent });
  });
  const ranked = shuffle(remainders, rng).sort((left, right) => right.remainder - left.remainder || right.weight - left.weight);
  let remainderIndex = 0;
  while (deck.length < count) {
    deck.push(ranked[remainderIndex % ranked.length].family);
    remainderIndex += 1;
  }
  return shuffle(deck.slice(0, count), rng);
}

function ratingCounts(history = []) {
  return history.reduce((result, item) => {
    const family = item.patternFamily || item.pattern_family;
    const rating = item.rating;
    if (!family || !RATING_WEIGHTS[rating]) return result;
    result.total += 1;
    result[family] = result[family] || [];
    result[family].push(RATING_WEIGHTS[rating]);
    return result;
  }, { total: 0 });
}

function selectFamily({ rng, history = [], forcedFamily = "" }) {
  if (forcedFamily && FAMILY_ORDER.includes(forcedFamily)) return forcedFamily;
  const recent = history.slice(0, 8).map((item) => item.patternFamily || item.pattern_family);
  const ratings = ratingCounts(history);
  const explore = ratings.total < 5 || rng() < 0.3;
  const candidates = FAMILY_ORDER.filter((family) => !recent.slice(0, 3).includes(family));
  const source = candidates.length ? candidates : FAMILY_ORDER;
  const weighted = source.flatMap((family) => {
    const base = CONTENT_MIX[family];
    const learned = explore || !ratings[family]?.length
      ? 1
      : ratings[family].reduce((sum, value) => sum + value, 0) / ratings[family].length;
    return Array(Math.max(1, Math.round((base * learned) / 5))).fill(family);
  });
  return pick(weighted, rng);
}

function applyTemplate(value, data) {
  return String(value || "")
    .replace(/\{topic\}/g, data.topic)
    .replace(/\{product\}/g, data.product);
}

function preferredPhrase(profile, rng) {
  if (!profile.preferredPhrases.length || rng() > 0.22) return "";
  return sentence(pick(profile.preferredPhrases, rng));
}

function audienceContext(value) {
  const audience = cleanText(value).toLowerCase();
  if (!audience) return "";
  if (/(startup|founder baru|fresh graduate|student)/.test(audience)) return "baru start";
  if (/(parent|ibu bekerja|bapa muda|suri rumah|working adult)/.test(audience)) {
    return "tengah cuba bahagi masa dengan macam-macam benda";
  }
  if (/(seller|sales|ejen|agent|dealer|affiliate|dropship|insurance|financial planner)/.test(audience)) {
    return "tengah cuba buat orang faham apa yang kau jual";
  }
  if (/(creator|designer|video editor|photographer|personal brand|social media|marketer)/.test(audience)) {
    return "selalu kena fikir idea baru";
  }
  if (/(owner|founder|solopreneur|entrepreneur|vendor|baker|saas|b2b)/.test(audience)) {
    return "tengah urus banyak benda serentak";
  }
  if (/(freelancer|consultant|coach|trainer|tutor|educator)/.test(audience)) {
    return "buat kerja sendiri sambil jaga client";
  }
  return "tengah cari rentak sendiri";
}

function buildLines({ family, platform, product, topic, tone, audience, personalBackground, angleNote, profile, rng }) {
  const opener = applyTemplate(pick(OPENERS[family], rng), { product, topic });
  const middle = angleNote ? sentence(`yang aku nampak, ${angleNote}`) : sentence(pick(MIDDLES, rng));
  const personal = cleanText(personalBackground);
  const tonePrefix = pick(TONE_PREFIX[tone] || TONE_PREFIX.Casual, rng);
  const productLine = sentence(applyTemplate(pick(PRODUCT_LINES, rng), { product, topic }));
  const audiencePhrase = audienceContext(audience);
  const audienceLine = audiencePhrase
    ? sentence(`kalau kau ${audiencePhrase}, benda ni memang senang terlepas pandang`)
    : "";
  const preferred = preferredPhrase(profile, rng);

  if (family === "quote") {
    const quote = `"${sentence(opener).replace(/\.$/, "")}."`;
    if (platform === "threads_general") return rng() < 0.5 ? [quote] : [quote, middle];
    return rng() < 0.45 ? [quote, productLine] : [quote, middle, productLine];
  }
  if (family === "list") {
    const items = pick(LIST_ITEMS, rng);
    const list = items.map((item, index) => `${index + 1}. ${item}`).join("\n");
    return platform === "threads_general"
      ? [sentence(opener), list, preferred]
      : [sentence(opener), list, productLine];
  }
  if (family === "story") {
    const start = personal ? sentence(personal) : sentence(opener);
    return platform === "facebook"
      ? [start, middle, productLine, preferred]
      : platform === "threads"
        ? [start, productLine, middle]
        : [start, middle, preferred];
  }
  if (family === "opinion") {
    return platform === "threads_general"
      ? [sentence(`${tonePrefix}, ${opener}`), middle]
      : [sentence(`${tonePrefix}, ${opener}`), productLine, middle];
  }
  if (family === "recommendation") {
    return platform === "threads_general"
      ? [sentence(opener), middle, audienceLine]
      : [sentence(opener), productLine, middle];
  }
  return platform === "threads_general"
    ? [sentence(opener), audienceLine || middle, middle]
    : [sentence(opener), middle, productLine];
}

function trimTo(value, maxChars) {
  const text = String(value || "").trim();
  if (text.length <= maxChars) return text;
  const shortened = text.slice(0, maxChars - 1);
  const boundary = Math.max(shortened.lastIndexOf(". "), shortened.lastIndexOf("\n\n"));
  return `${(boundary > maxChars * 0.55 ? shortened.slice(0, boundary + 1) : shortened).trim()}`;
}

function applyVoice(value, profile) {
  let text = String(value || "");
  if (profile.englishMix === "off") {
    const replacements = {
      ready: "bersedia",
      flow: "cara",
      content: "post",
      progress: "kemajuan",
      compare: "banding",
      consistency: "konsisten",
      complicated: "rumit",
      practical: "praktikal",
    };
    Object.entries(replacements).forEach(([from, to]) => {
      text = text.replace(new RegExp(`\\b${from}\\b`, "gi"), to);
    });
  }
  if (profile.slang === "light") {
    text = text
      .replace(/\bje\b/gi, "saja")
      .replace(/\bnak\b/gi, "mahu");
  }
  return text;
}

function validateGenerated(text, { maxChars, profile, link = "", history = [] }) {
  if (!text || text.length > maxChars || /\*\*|:/.test(text.replace(/https?:\/\/\S+/g, ""))) return false;
  if (profile.bannedPhrases.some((phrase) => text.toLowerCase().includes(phrase.toLowerCase()))) return false;
  if (link && (text.match(new RegExp(link.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length !== 1) return false;
  return !history.slice(0, 120).some((item) => semanticSimilarity(text, item.postText || item.post_text || "") > 0.68);
}

function generateAdaptivePost(options = {}) {
  const seed = String(options.seed || `${Date.now()}-${Math.random()}`);
  const rng = createRng(seed);
  const profile = normalizeVoiceProfile(options.voiceProfile);
  const platform = options.platform || "threads_general";
  const product = cleanText(options.productName) || "produk ni";
  const topic = cleanText(options.topic) || cleanText(options.category) || "benda";
  const maxChars = platform === "facebook" ? 460 : 500;
  const link = platform === "threads_general" ? "" : String(options.link || "").trim();
  const history = Array.isArray(options.history) ? options.history : [];

  for (let attempt = 0; attempt < 80; attempt += 1) {
    const family = selectFamily({ rng, history, forcedFamily: options.forcedFamily });
    let lines = buildLines({
      family,
      platform,
      product,
      topic,
      tone: options.tone || "Casual",
      audience: options.audience || "",
      personalBackground: options.personalBackground || "",
      angleNote: options.angleNote || "",
      profile,
      rng,
    }).filter(Boolean);
    if (platform !== "threads_general") {
      const question = pick(ENDINGS.promote, rng);
      if (question) lines.push(sentence(question, "?"));
    }
    lines = lines.filter(Boolean);
    let text = applyVoice(lines.join("\n\n"), profile);
    if (link) text = `${trimTo(text, maxChars - link.length - 16)}\n\nklik sini, ${link}`;
    text = trimTo(text, maxChars);
    if (!validateGenerated(text, { maxChars, profile, link, history })) continue;
    return {
      postText: text,
      seed,
      patternFamily: family,
      patternId: `${family}-${hashNumber(`${seed}:${attempt}`) % 1000}`,
      openingId: `${family}-${OPENERS[family].indexOf(applyTemplate(OPENERS[family].find((item) => applyTemplate(item, { product, topic }) === cleanText(lines[0]).replace(/[.!?]+$/, "")) || "", { product, topic }))}`,
      lengthBucket: text.length < 150 ? "short" : text.length < 300 ? "medium" : "long",
      paragraphShape: structuralFingerprint(text),
      textHash: textHash(text),
      semanticFingerprint: [...shingles(text)].slice(0, 12).join("|"),
    };
  }

  const fallback = platform === "threads_general"
    ? `aku rasa ${topic} tak perlu complicated.\n\nmula dengan benda yang boleh dibuat hari ni.`
    : `aku tengah tengok ${product} dari sudut paling simple.\n\nkadang kita cuma perlukan langkah pertama yang jelas.\n\nklik sini, ${link}`;
  return {
    postText: trimTo(fallback, maxChars),
    seed,
    patternFamily: "recommendation",
    patternId: "recommendation-fallback",
    openingId: "fallback",
    lengthBucket: "short",
    paragraphShape: structuralFingerprint(fallback),
    textHash: textHash(fallback),
    semanticFingerprint: [...shingles(fallback)].join("|"),
  };
}

module.exports = {
  CONTENT_MIX,
  DEFAULT_VOICE_PROFILE,
  FAMILY_ORDER,
  RATING_WEIGHTS,
  familyDeck,
  generateAdaptivePost,
  normalizeVoiceProfile,
  semanticSimilarity,
  structuralFingerprint,
  textHash,
};
