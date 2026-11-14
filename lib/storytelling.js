// Facebook Storytelling: Writing DNA, prompts, local editorial checks and
// storage. Everything lives in one table, storytelling_items, keyed by kind.
// Nothing here publishes to Facebook, and no model is fine-tuned: the voice
// comes from the DNA profile plus a few of the writer's own posts in the prompt.
const { AiError, aiConfig, generateText, parseJson } = require("./storytelling-ai");

const OWNER = "default"; // BuddyPilot has one signed-in account.
const TABLE = "storytelling_items";
const KINDS = ["sample", "dna", "draft", "revision", "feedback", "usage"];
const STATUSES = ["draft", "approved", "published"];
const HOURLY_LIMIT = 20;
const DAILY_LIMIT = 120;
const LIMITS = { topic: 300, field: 1500, sample: 12000, post: 12000, note: 1000 };

const STYLES = {
  personal: { label: "Personal Storytelling", guide: "Cerita dari sudut pandang penulis sendiri, macam berbual dengan kawan yang juga berniaga." },
  sharp: { label: "Sharp Opinion", guide: "Pendirian yang jelas dari ayat pertama. Hujah padat, tak berlapik." },
  controversial: { label: "Controversial Insight", guide: "Cabar kepercayaan ramai dengan sudut yang orang tak selesa dengar, tetapi boleh dipertahankan dengan hujah." },
  educational: { label: "Educational Storytelling", guide: "Ajar satu perkara melalui situasi, bukan syarahan. Pembaca faham sebab ia berlaku." },
  business: { label: "Business Experience", guide: "Pemerhatian dari lapangan perniagaan: keputusan, kos, kesilapan dan akibatnya." },
  soft: { label: "Soft Selling Storytelling", guide: "Nilai dulu. Tawaran hanya disentuh sekali di hujung, secara bersahaja." },
  hard: { label: "Hard Selling Storytelling", guide: "Masalah, akibat dan penyelesaian dinyatakan terus, dengan ajakan bertindak yang jelas, tanpa janji berlebihan." },
};

const LENGTHS = [1500, 3000, 4500, 6000];
const DEFAULT_LENGTH = 4500;

const REWRITES = {
  hook: { label: "Improve Hook", scope: "opening", instruction: "Tulis semula PEMBUKA sahaja supaya lebih kuat: cabar kepercayaan biasa, dedahkan kesilapan atau tunjuk percanggahan. Jangan guna soalan klise." },
  closing: { label: "Improve Closing", scope: "closing", instruction: "Tulis semula PENUTUP sahaja: satu takeaway yang spesifik, kemudian ajakan bersahaja untuk share post ini kalau bermanfaat. Jangan ulang isi sebelumnya." },
  controversial: { label: "Make More Controversial", scope: "full", instruction: "Jadikan lebih tajam dan mencabar. Kuatkan pendirian dan kontras, tanpa menuduh sesiapa, tanpa fakta baru yang tidak disokong." },
  natural: { label: "Make More Natural", scope: "full", instruction: "Jadikan lebih natural macam orang Malaysia bercakap. Buang ayat yang berbunyi AI, terlalu formal atau terlalu kemas. Kekalkan isi." },
  storytelling: { label: "Add More Storytelling", scope: "full", instruction: "Tambah elemen cerita: situasi yang pembaca boleh bayangkan, konflik dan akibat. Jangan reka pengalaman peribadi; guna situasi ilustrasi yang jelas dibingkai sebagai contoh." },
  depth: { label: "Add More Depth", scope: "full", instruction: "Tambah kedalaman: terangkan KENAPA perkara ini berlaku, dengan sebab-akibat dan contoh praktikal. Jangan tambah angka atau fakta yang tidak diberi." },
  shorten: { label: "Shorten", scope: "full", instruction: "Pendekkan kira-kira 30 peratus. Buang ulangan dan filler, kekalkan hook, hujah utama dan penutup." },
  expand: { label: "Expand", scope: "full", instruction: "Panjangkan kira-kira 30 peratus dengan mengembangkan hujah sedia ada, bukan menambah topik baru." },
  improve: { label: "Improve Draft", scope: "full", instruction: "Baiki draf berdasarkan maklum balas editorial yang diberi. Jangan tambah fakta baru." },
};

const FEEDBACK_TAGS = {
  too_ai: "Terlalu berbunyi AI",
  too_formal: "Terlalu formal",
  too_soft: "Terlalu lembut",
  too_repetitive: "Terlalu berulang",
  not_my_style: "Bukan gaya saya",
  too_much_english: "Terlalu banyak English",
  too_much_malay: "Terlalu banyak Melayu",
  weak_hook: "Hook tak cukup kuat",
  shallow_story: "Cerita tak cukup mendalam",
  perfect: "Perfect, simpan gaya ini",
};

const DNA_FIELDS = [
  ["personality", "Personaliti penulisan"],
  ["languageMix", "Campuran Melayu-English"],
  ["rhythm", "Ritma ayat dan panjang perenggan"],
  ["hooks", "Corak pembinaan hook"],
  ["storytelling", "Teknik storytelling"],
  ["emotion", "Intensiti emosi"],
  ["argument", "Struktur pendapat dan hujah"],
  ["vocabulary", "Perbendaharaan kata biasa"],
  ["expressions", "Ungkapan peribadi"],
  ["controversy", "Corak framing kontroversi"],
  ["transitions", "Peralihan antara idea"],
  ["closing", "Corak penutup dan engagement"],
];

const WRITING_RULES = [
  "Tulis dalam bahasa Melayu Malaysia harian yang bercampur English secara natural, macam pemilik bisnes Malaysia bercakap.",
  "Jangan guna perkataan atau struktur ayat Indonesia (contoh: kalian, banget, nggak, bisa, butuh, bikin, gimana).",
  "Tiada emoji.",
  "Tiada garis pemisah hiasan.",
  "Tiada bullet point, heading atau hashtag melainkan diminta.",
  "Tiada pembuka generik AI dan tiada kesimpulan yang mengulang isi.",
  "Tiada petikan motivasi tiruan dan tiada janji berlebihan.",
  "Jangan reka pengalaman peribadi, testimoni, angka atau hasil bisnes.",
  "Jangan buat tuduhan atau dakwaan sensasi yang tidak disokong.",
  "Akhiri dengan ajakan bersahaja supaya pembaca share post ini.",
];

const PRESET_DNA = {
  name: "Abdussomad — Facebook Personal Storytelling",
  language: "Natural Malaysian Malay-English",
  personality: "Direct dan yakin. Berbual, relatable. Berpendirian tetapi berpijak pada fakta. Berfikiran bisnes, analitikal dan praktikal. Tajam, provokatif dan kadang-kadang kontroversi. Berbunyi macam pemilik bisnes Malaysia sebenar, bukan penceramah motivasi dan bukan bahasa korporat.",
  languageMix: "Asas bahasa Melayu harian Malaysia. Istilah bisnes dan marketing kekal dalam English (ads, budget, creative, sales, lead, scale). Tukar bahasa di tengah ayat bila itu cara orang bercakap, bukan untuk nampak pandai.",
  rhythm: "Ayat pendek bercampur ayat sederhana. Perenggan satu hingga tiga ayat. Kadang-kadang satu ayat berdiri sendiri untuk tekanan.",
  hooks: "Mula dengan kenyataan yang mencabar kepercayaan ramai, kesilapan yang orang tak sedar, atau percanggahan yang nyata. Terus ke isi, tanpa salam dan tanpa soalan klise.",
  storytelling: "Bawa pembaca masuk situasi yang mereka kenal, tunjuk konflik, kemudian buka sebab sebenar. Guna kontras antara apa yang orang sangka dengan apa yang berlaku.",
  emotion: "Tegas dan berterus terang. Ada rasa geram yang terkawal pada kesilapan yang berulang, tanpa menghina sesiapa.",
  argument: "Nyatakan pendirian awal, sokong dengan logik sebab-akibat dan pemerhatian industri, tangani bantahan yang biasa, kemudian tutup dengan pendirian yang lebih tajam.",
  vocabulary: "Perkataan harian: sebenarnya, masalahnya, ramai orang, yang peliknya, realitinya, bukan sebab, tapi sebab. Istilah bisnes dalam English.",
  expressions: "Belum dianalisis. Tambah contoh post sebenar supaya ungkapan peribadi dapat dikenal pasti.",
  controversy: "Cabar amalan yang ramai ikut tanpa soal. Serang idea dan amalan, bukan individu. Setiap provokasi mesti boleh dipertahankan dengan hujah.",
  transitions: "Peralihan pendek dan bersahaja: Tapi. Masalahnya. Yang ramai tak nampak. Sebab itu. Jadi.",
  closing: "Satu takeaway yang spesifik dan boleh dibuat, kemudian ajakan bersahaja untuk share kalau bermanfaat. Tiada rumusan panjang.",
  rules: WRITING_RULES,
};

// ---------- text helpers ----------

function clean(value, max) {
  const text = String(value ?? "").replace(/\r\n?/g, "\n").trim();
  return max ? text.slice(0, max) : text;
}

function fail(message, statusCode = 400, code = "invalid") {
  return Object.assign(new Error(message), { statusCode, code });
}

function clamp(value, min, max, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, Math.round(number))) : fallback;
}

function paragraphs(text) {
  return clean(text).split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
}

const EMOJI = /[\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{1F3FB}-\u{1F3FF}]/gu;
const SEPARATOR_LINE = /^\s*(?:[-–—_=*~•·━─═▬▪■◆⸻]\s*){3,}\s*$/u;

// Remove what the house rules forbid and models add anyway: emojis, decorative
// separator lines, markdown marks and a trailing block of hashtags.
function cleanPost(text) {
  const lines = clean(text)
    .replace(/^```[a-z]*\n?|```$/g, "")
    .replace(EMOJI, "")
    .split("\n")
    .filter((line) => !SEPARATOR_LINE.test(line))
    .map((line) => line.replace(/^\s{0,3}#{1,6}\s+/, "").replace(/\*\*(.+?)\*\*/g, "$1").replace(/[ \t]+$/g, ""));
  while (lines.length && /^\s*(#[\p{L}\p{N}_]+\s*)+$/u.test(lines[lines.length - 1] || "")) lines.pop();
  return lines.join("\n").replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

const AI_PHRASES = [
  "dalam dunia yang serba", "di era digital", "dalam era digital", "tidak dapat dinafikan", "kesimpulannya", "secara keseluruhannya",
  "sebagai kesimpulan", "perlu diingat bahawa", "adalah penting untuk", "mari kita", "jom kita terokai", "tahukah anda",
  "in today's fast-paced", "in today's digital", "let's dive", "game changer", "game-changer", "unlock the", "at the end of the day",
  "it's important to note", "in conclusion", "bukan sekadar", "lebih daripada sekadar",
];
const INDONESIAN = ["kalian", "banget", "nggak", "enggak", "gak", "butuh", "bikin", "gimana", "udah", "bisa", "kamu", "dong", "sih", "banyak banget", "mereka pada", "enggak ada"];

// Checks that need no AI call, so they run on every draft for free.
function localReview(text, { targetLength = DEFAULT_LENGTH } = {}) {
  const body = clean(text);
  const lower = body.toLowerCase();
  const issues = [];
  const add = (code, message) => issues.push({ code, message });
  const length = body.length;
  const deviation = targetLength ? (length - targetLength) / targetLength : 0;
  if (Math.abs(deviation) > 0.1) add("length", `Panjang ${length} aksara, sasaran ${targetLength} (${deviation > 0 ? "+" : ""}${Math.round(deviation * 100)}%).`);
  if (EMOJI.test(body)) add("emoji", "Ada emoji.");
  EMOJI.lastIndex = 0;
  if (body.split("\n").some((line) => SEPARATOR_LINE.test(line))) add("separator", "Ada garis pemisah hiasan.");
  if (body.split("\n").filter((line) => /^\s*(?:[-*•]|\d+[.)])\s+/.test(line)).length >= 3) add("bullets", "Ada senarai bullet; gaya ini biasanya perenggan.");
  if (/(^|\s)#[\p{L}\p{N}_]+/u.test(body)) add("hashtag", "Ada hashtag.");
  const phrases = AI_PHRASES.filter((phrase) => lower.includes(phrase));
  if (phrases.length) add("ai_phrases", `Frasa berbunyi AI: ${phrases.slice(0, 5).join(", ")}.`);
  const indo = INDONESIAN.filter((word) => new RegExp(`(^|[^\\p{L}])${word}([^\\p{L}]|$)`, "iu").test(body));
  if (indo.length) add("indonesian", `Perkataan Indonesia: ${[...new Set(indo)].slice(0, 5).join(", ")}.`);
  if (!/\b(share|kongsi|kongsikan|sebarkan|forward)\b/i.test(body.slice(-420))) add("cta", "Penutup tiada ajakan untuk share.");
  const parts = paragraphs(body);
  const openings = parts.map((part) => part.split(/\s+/).slice(0, 3).join(" ").toLowerCase());
  const repeated = openings.filter((opening, index) => opening && openings.indexOf(opening) !== index);
  if (repeated.length >= 2) add("repetition", `Beberapa perenggan bermula sama: "${repeated[0]}".`);
  const words = body.split(/\s+/).filter(Boolean).length;
  return { issues, stats: { characters: length, words, paragraphs: parts.length, readingMinutes: Math.max(1, Math.round(words / 200)), targetLength, deviationPercent: Math.round(deviation * 100) } };
}

// ---------- prompts ----------

function normalizeDna(value = {}) {
  const profile = { name: clean(value.name, 120) || PRESET_DNA.name, language: clean(value.language, 200) || PRESET_DNA.language };
  for (const [key] of DNA_FIELDS) profile[key] = clean(value[key], 1500) || PRESET_DNA[key];
  const rules = Array.isArray(value.rules) ? value.rules.map((rule) => clean(rule, 300)).filter(Boolean).slice(0, 30) : [];
  profile.rules = rules.length ? rules : [...WRITING_RULES];
  return profile;
}

function dnaBlock(dna) {
  return DNA_FIELDS.map(([key, label]) => `${label}: ${dna[key]}`).join("\n");
}

function intensityGuide(level) {
  if (level <= 2) return "Tenang dan mendidik. Terangkan, jangan menyerang.";
  if (level <= 4) return "Jelas dan berpendirian, nada masih mesra.";
  if (level <= 6) return "Direct dan analitikal. Sebut kesilapan dengan terus terang.";
  if (level <= 8) return "Tajam, mencabar dan provokatif. Lawan kepercayaan biasa secara terbuka.";
  return "Sangat berani dan kontroversi, tetapi jujur: tiada fitnah, tiada penghinaan, tiada dakwaan tanpa asas.";
}

// The posts most related to the topic lead; the rest fill by recency.
function pickSamples(samples, topic, voiceStrength) {
  const count = voiceStrength >= 8 ? 3 : voiceStrength >= 4 ? 2 : voiceStrength >= 2 ? 1 : 0;
  const words = new Set(clean(topic).toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((word) => word.length > 3));
  return samples
    .filter((sample) => sample.selected !== false && clean(sample.content))
    .map((sample, index) => {
      const lower = sample.content.toLowerCase();
      let score = 0;
      for (const word of words) if (lower.includes(word)) score += 1;
      return { sample, score, index };
    })
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, count)
    .map(({ sample }) => sample);
}

function buildGenerationPrompt({ topic, context = {}, style = "personal", length = DEFAULT_LENGTH, intensity = 8, voiceStrength = 10, dna, samples = [], feedbackNotes = [] }) {
  const styleInfo = STYLES[style] || STYLES.personal;
  const words = Math.round(length / 6.1);
  const system = [
    "Kau ialah penulis hantu untuk seorang pemilik bisnes Malaysia. Tugas kau menulis post Facebook storytelling yang berbunyi seperti dia sendiri yang tulis, bukan AI.",
    "",
    "WRITING DNA PENULIS",
    dnaBlock(dna),
    "",
    "PERATURAN WAJIB",
    ...dna.rules.map((rule, index) => `${index + 1}. ${rule}`),
    "",
    "PANDUAN NARATIF (dalaman sahaja, jangan tunjuk label atau struktur ini dalam post)",
    "Hook yang mencabar kepercayaan biasa. Situasi yang pembaca kenal. Konflik atau salah faham di sebaliknya. Sebab sebenar ia berlaku. Kembangkan hujah dengan contoh, kontras dan akibat. Satu anjakan perspektif. Takeaway yang spesifik. Ajakan share yang bersahaja.",
    "Susunan boleh berubah ikut topik. Post tidak boleh berbunyi seperti templat lapan bahagian.",
    "",
    "CARA KERJA (dalaman)",
    "Fahami topik dan fakta yang ada. Kenal pasti ketegangan paling relevan untuk audiens. Fikirkan beberapa hook dan pilih yang paling kuat. Tulis cerita penuh. Semak bahasa, suara peribadi, frasa berbunyi AI, had fakta dan panjang sebelum beri jawapan.",
    "",
    "INTEGRITI FAKTA",
    "Guna hanya pengalaman peribadi dan fakta yang diberi oleh penulis. Jika tiada pengalaman peribadi diberi, jangan tulis seolah-olah ia berlaku kepada penulis; guna situasi ilustrasi yang jelas dibingkai sebagai contoh (\"katakan\", \"bayangkan\", \"ramai yang\") atau hujah berasaskan logik. Jangan reka angka, nama, testimoni atau hasil. Jika tidak pasti tentang butiran teknikal topik, tulis secara umum dan jangan buat dakwaan spesifik.",
    "",
    "OUTPUT",
    "Beri teks post sahaja. Tiada tajuk, tiada penjelasan, tiada pilihan alternatif, tiada markdown.",
  ].join("\n");

  const optional = [
    ["Pendapat atau hujah utama", context.opinion],
    ["Pengalaman peribadi (benar, boleh diguna)", context.experience],
    ["Fakta atau bukti sokongan", context.facts],
    ["Audiens sasaran", context.audience],
    ["Nada emosi", context.tone],
    ["Takeaway utama", context.takeaway],
    ["Call to action", context.cta],
  ].filter(([, value]) => clean(value)).map(([label, value]) => `${label}: ${clean(value, LIMITS.field)}`);

  const chosen = pickSamples(samples, topic, voiceStrength);
  const prompt = [
    `TOPIK: ${clean(topic, LIMITS.topic)}`,
    ...(optional.length ? ["", "KONTEKS DARI PENULIS", ...optional] : ["", "Tiada pengalaman peribadi diberi. Jangan reka pengalaman peribadi."]),
    "",
    `GAYA: ${styleInfo.label}. ${styleInfo.guide}`,
    `INTENSITI ${intensity}/10: ${intensityGuide(intensity)}`,
    `KEKUATAN SUARA PERIBADI ${voiceStrength}/10: ${voiceStrength >= 8 ? "Ikut rapat ritma, pilihan kata dan cara berhujah dalam contoh. Jangan salin ayat." : voiceStrength >= 4 ? "Ikut nada dan ritma contoh secara sederhana." : "Guna DNA sebagai panduan umum sahaja."}`,
    `PANJANG: sasar ${length} aksara termasuk ruang (lebih kurang ${words} patah perkataan). Jangan kurang daripada ${Math.round(length * 0.93)} aksara dan jangan lebih daripada ${Math.round(length * 1.07)}.`,
    ...(feedbackNotes.length ? ["", "MAKLUM BALAS TERKINI PENULIS (ambil kira)", ...feedbackNotes.map((note) => `- ${note}`)] : []),
    ...(chosen.length ? ["", "CONTOH POST SEBENAR PENULIS (untuk suara sahaja; jangan salin ayat atau topik)", ...chosen.map((sample, index) => `--- Contoh ${index + 1} ---\n${sample.content.slice(0, 1800)}`)] : []),
    "",
    "Tulis post sekarang.",
  ].join("\n");
  return { system, prompt, sampleIds: chosen.map((sample) => sample.id) };
}

function buildLengthFixPrompt(text, length) {
  const now = text.length;
  return {
    system: "Kau editor. Laras panjang teks tanpa mengubah suara, hujah, susunan atau fakta. Jangan tambah fakta baru. Tiada emoji, tiada heading, tiada bullet. Beri teks post sahaja.",
    prompt: `Teks ini ${now} aksara. Sasaran ${length} aksara termasuk ruang (${Math.round(length * 0.95)} hingga ${Math.round(length * 1.05)}). ${now > length ? "Pendekkan dengan membuang ulangan dan filler." : "Panjangkan dengan mengembangkan hujah dan contoh sedia ada."} Kekalkan pembuka dan ajakan share di penutup.\n\nTEKS:\n${text}`,
  };
}

function buildAnalysisPrompt(samples) {
  const fields = DNA_FIELDS.map(([key, label]) => `"${key}": "${label}"`).join(", ");
  return {
    system: "Kau penganalisis gaya penulisan. Kau kaji post Facebook sebenar seorang penulis Malaysia dan huraikan corak penulisannya dengan tepat dan spesifik, supaya penulis lain boleh meniru suaranya tanpa menyalin ayat. Tulis dalam bahasa Melayu Malaysia. Jawab JSON sahaja.",
    prompt: [
      `Kaji ${samples.length} post di bawah. Pulangkan satu objek JSON dengan kunci berikut, setiap satu rentetan 1 hingga 4 ayat yang spesifik (beri contoh perkataan atau corak sebenar yang kau jumpa, bukan pujian umum): {${fields}}.`,
      "Untuk \"vocabulary\" dan \"expressions\", senaraikan perkataan dan ungkapan yang benar-benar muncul dalam post.",
      "",
      ...samples.map((sample, index) => `--- Post ${index + 1}${sample.category ? ` (${sample.category})` : ""} ---\n${sample.content.slice(0, 2500)}`),
    ].join("\n"),
  };
}

function buildLearnPrompt(dna, feedback, approved) {
  const fields = DNA_FIELDS.map(([key]) => `"${key}"`).join(", ");
  return {
    system: "Kau menyelenggara profil gaya penulisan. Kemas kini profil berdasarkan maklum balas penulis dan post yang dia luluskan. Ubah hanya bahagian yang maklum balas itu sentuh; kekalkan yang lain perkataan demi perkataan. Tulis dalam bahasa Melayu Malaysia. Jawab JSON sahaja.",
    prompt: [
      "PROFIL SEMASA", dnaBlock(dna), "",
      "MAKLUM BALAS PENULIS", ...feedback.map((item) => `- ${item}`), "",
      ...(approved.length ? ["POST YANG DILULUSKAN PENULIS (gaya yang dia mahu)", ...approved.map((text, index) => `--- Diluluskan ${index + 1} ---\n${text.slice(0, 2200)}`), ""] : []),
      `Pulangkan objek JSON dengan kunci ${fields} dan satu kunci "changes" (senarai ringkas apa yang kau ubah).`,
    ].join("\n"),
  };
}

function buildRewritePrompt({ action, text, dna, feedback = "" }) {
  const rewrite = REWRITES[action];
  if (!rewrite) throw fail("Tindakan rewrite tidak sah.");
  const parts = paragraphs(text);
  const base = [
    "Kau editor untuk seorang penulis Malaysia. Kekalkan mesej teras, fakta dan suntingan penulis. Jangan tambah fakta, angka atau pengalaman peribadi baru.",
    "", "WRITING DNA", dnaBlock(dna), "", "PERATURAN", ...dna.rules.map((rule) => `- ${rule}`),
  ].join("\n");
  if (rewrite.scope === "opening" || rewrite.scope === "closing") {
    const target = rewrite.scope === "opening" ? parts[0] : parts[parts.length - 1];
    return {
      scope: rewrite.scope,
      system: `${base}\n\nBeri HANYA perenggan pengganti, tanpa penjelasan dan tanpa mengulang bahagian lain.`,
      prompt: `${rewrite.instruction}\n\nPOST PENUH (untuk konteks sahaja)\n${text}\n\nPERENGGAN YANG PERLU DITULIS SEMULA\n${target}`,
    };
  }
  return {
    scope: "full",
    system: `${base}\n\nBeri teks post penuh yang telah disunting sahaja, tanpa penjelasan.`,
    prompt: `${rewrite.instruction}${feedback ? `\n\nMAKLUM BALAS EDITORIAL\n${clean(feedback, 3000)}` : ""}\n\nPOST\n${text}`,
  };
}

// Section rewrites replace only that paragraph, so the rest stays as the writer left it.
function applyRewrite(text, scope, output) {
  const cleaned = cleanPost(output);
  if (scope === "full") return cleaned;
  const parts = paragraphs(text);
  const replacement = paragraphs(cleaned);
  if (!replacement.length) return text;
  if (scope === "opening") return [...replacement.slice(0, 3), ...parts.slice(1)].join("\n\n");
  return [...parts.slice(0, -1), ...replacement.slice(-3)].join("\n\n");
}

const QUALITY_KEYS = [
  ["hook", "Kekuatan hook"], ["voice", "Persamaan suara peribadi"], ["language", "Bahasa Malaysia natural"], ["flow", "Aliran storytelling"],
  ["depth", "Kedalaman insight"], ["originality", "Keaslian"], ["emotion", "Impak emosi"], ["clarity", "Kejelasan hujah"],
  ["shareability", "Shareability"], ["integrity", "Integriti fakta"],
];

function buildQualityPrompt(text, dna) {
  return {
    system: "Kau editor kanan yang tegas dan jujur. Nilai post Facebook ini berbanding Writing DNA penulis. Jangan memuji tanpa sebab. Jangan cadangkan menambah fakta yang tidak diberi. Tulis dalam bahasa Melayu Malaysia. Jawab JSON sahaja.",
    prompt: [
      "WRITING DNA", dnaBlock(dna), "",
      `Pulangkan objek JSON: {"scores": {${QUALITY_KEYS.map(([key]) => `"${key}": 1-10`).join(", ")}}, "strengths": [maksimum 3 ayat pendek], "issues": [maksimum 6, setiap satu {"type": "repetition|ai_phrase|artificial_pattern|filler|unsupported_claim|missing_development|weak_ending|language_mix|other", "detail": "apa dan di mana", "fix": "cara baiki"}], "summary": "satu ayat"}.`,
      "Tandakan sebagai unsupported_claim sebarang angka, statistik, nama atau dakwaan yang kelihatan direka.",
      "", "POST", text,
    ].join("\n"),
  };
}

function normalizeQuality(raw = {}) {
  const scores = {};
  for (const [key, label] of QUALITY_KEYS) scores[key] = { label, score: clamp(raw.scores?.[key], 1, 10, null) };
  const rated = Object.values(scores).map((item) => item.score).filter((score) => score != null);
  return {
    scores,
    average: rated.length ? Math.round((rated.reduce((sum, score) => sum + score, 0) / rated.length) * 10) / 10 : null,
    strengths: (Array.isArray(raw.strengths) ? raw.strengths : []).map((item) => clean(item, 300)).filter(Boolean).slice(0, 3),
    issues: (Array.isArray(raw.issues) ? raw.issues : []).map((item) => ({ type: clean(item?.type, 40) || "other", detail: clean(item?.detail, 400), fix: clean(item?.fix, 400) })).filter((item) => item.detail).slice(0, 6),
    summary: clean(raw.summary, 400),
    disclaimer: "Skor ini anggaran editorial AI, bukan ukuran objektif.",
  };
}

// ---------- storage ----------

function defaultRequest() {
  return require("./supabase-db").supabaseRequest;
}

function setupError(error) {
  const text = `${error?.message || ""} ${error?.code || ""}`;
  return /storytelling_items|PGRST205|42P01|schema cache|table belum setup/i.test(text)
    ? fail("Jadual Facebook Storytelling belum wujud. Jalankan migration supabase/migrations/20261114000100_facebook_storytelling.sql dahulu.", 503, "setup_required")
    : error;
}

function rowToItem(row) {
  return { id: row.id, kind: row.kind, parentId: row.parent_id || "", title: row.title || "", status: row.status || "", createdAt: row.created_at, updatedAt: row.updated_at, ...(row.data || {}) };
}

function uuid(value) {
  const id = clean(value);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw fail("ID tidak sah.");
  return id;
}

function createStore(request = defaultRequest()) {
  const run = async (path, options) => {
    try { return await request(path, options); } catch (error) { throw setupError(error); }
  };
  const scope = `owner_key=eq.${OWNER}`;
  return {
    async list(kind, { limit = 200, parentId = "", select = "*" } = {}) {
      const parent = parentId ? `&parent_id=eq.${uuid(parentId)}` : "";
      return (await run(`${TABLE}?select=${select}&${scope}&kind=eq.${kind}${parent}&order=created_at.desc&limit=${limit}`) || []).map(rowToItem);
    },
    async get(kind, id) {
      const rows = await run(`${TABLE}?select=*&${scope}&kind=eq.${kind}&id=eq.${uuid(id)}&limit=1`);
      if (!rows?.[0]) throw fail("Rekod tidak dijumpai.", 404, "not_found");
      return rowToItem(rows[0]);
    },
    async insert(kind, { title = "", status = "", parentId = "", data = {} }) {
      if (!KINDS.includes(kind)) throw fail("Jenis rekod tidak sah.");
      const rows = await run(TABLE, { method: "POST", prefer: "return=representation", body: { owner_key: OWNER, kind, title: clean(title, 300), status, parent_id: parentId ? uuid(parentId) : null, data } });
      return rowToItem(rows?.[0] || {});
    },
    async update(kind, id, { title, status, data }) {
      const body = { updated_at: new Date().toISOString() };
      if (title !== undefined) body.title = clean(title, 300);
      if (status !== undefined) body.status = status;
      if (data !== undefined) body.data = data;
      const rows = await run(`${TABLE}?${scope}&kind=eq.${kind}&id=eq.${uuid(id)}`, { method: "PATCH", prefer: "return=representation", body });
      if (!rows?.[0]) throw fail("Rekod tidak dijumpai.", 404, "not_found");
      return rowToItem(rows[0]);
    },
    async remove(kind, id) {
      await run(`${TABLE}?${scope}&kind=eq.${kind}&id=eq.${uuid(id)}`, { method: "DELETE" });
    },
    async countSince(kind, sinceIso) {
      const rows = await run(`${TABLE}?select=id&${scope}&kind=eq.${kind}&created_at=gte.${encodeURIComponent(sinceIso)}&limit=${DAILY_LIMIT + 1}`);
      return (rows || []).length;
    },
  };
}

// ---------- operations ----------

function sampleInput(value = {}) {
  const content = clean(value.content, LIMITS.sample);
  if (content.length < 80) throw fail("Contoh post terlalu pendek. Tampal post penuh (sekurang-kurangnya 80 aksara).");
  return { content, category: clean(value.category, 60), selected: value.selected !== false, characters: content.length };
}

// Bulk import: posts separated by a line of ---, ===, *** or a markdown heading;
// without any separator, by two or more blank lines.
function splitImport(text) {
  const body = clean(text, 400000);
  const marked = body.split(/\n\s*(?:-{3,}|={3,}|\*{3,}|#{1,3} [^\n]*)\s*(?=\n|$)/).map((part) => part.trim()).filter(Boolean);
  const blocks = marked.length > 1 ? marked : body.split(/\n\s*\n\s*\n+/).map((part) => part.trim()).filter(Boolean);
  return blocks.filter((block) => block.length >= 80).slice(0, 60);
}

async function activeDna(store) {
  const rows = await store.list("dna", { limit: 1 });
  if (rows[0]) return { id: rows[0].id, version: rows[0].version || 1, source: rows[0].source || "manual", createdAt: rows[0].createdAt, profile: normalizeDna(rows[0].profile) };
  return { id: "", version: 0, source: "preset", createdAt: "", profile: normalizeDna(PRESET_DNA) };
}

async function saveDna(store, profile, source, note = "") {
  const current = await activeDna(store);
  const row = await store.insert("dna", { title: clean(profile.name, 120), data: { version: current.version + 1, source, note: clean(note, 500), profile: normalizeDna(profile) } });
  return { id: row.id, version: row.version, source: row.source, createdAt: row.createdAt, profile: row.profile };
}

async function enforceRateLimit(store, now = new Date()) {
  const hour = await store.countSince("usage", new Date(now.getTime() - 3600000).toISOString());
  if (hour >= HOURLY_LIMIT) throw fail(`Had ${HOURLY_LIMIT} permintaan AI sejam dicapai. Cuba semula sebentar lagi.`, 429, "app_rate_limit");
  const day = await store.countSince("usage", new Date(now.getTime() - 86400000).toISOString());
  if (day >= DAILY_LIMIT) throw fail(`Had ${DAILY_LIMIT} permintaan AI sehari dicapai. Cuba semula esok.`, 429, "app_rate_limit");
}

// One usage row per AI request: the action and sizes only, never the text.
async function callAi(store, action, request, ai = generateText) {
  await enforceRateLimit(store);
  const result = await ai(request);
  await store.insert("usage", { title: action, data: { action, model: result.model, characters: result.text.length } }).catch(() => {});
  return result;
}

function feedbackNotes(feedback) {
  const seen = new Set();
  const notes = [];
  for (const item of feedback) {
    for (const tag of item.tags || []) {
      if (tag === "perfect" || seen.has(tag) || !FEEDBACK_TAGS[tag]) continue;
      seen.add(tag);
      notes.push(`Draf sebelum ini: ${FEEDBACK_TAGS[tag].toLowerCase()}.`);
    }
    if (clean(item.note) && notes.length < 8) notes.push(clean(item.note, 300));
  }
  return notes.slice(0, 8);
}

function generationInput(value = {}) {
  const topic = clean(value.topic, LIMITS.topic);
  if (topic.length < 3) throw fail("Masukkan topik.");
  const context = {};
  for (const key of ["opinion", "experience", "facts", "audience", "tone", "takeaway", "cta"]) context[key] = clean(value.context?.[key] ?? value[key], LIMITS.field);
  return {
    topic,
    context,
    style: STYLES[value.style] ? value.style : "personal",
    length: clamp(value.length, 500, 8000, DEFAULT_LENGTH),
    intensity: clamp(value.intensity, 1, 10, 8),
    voiceStrength: clamp(value.voiceStrength, 1, 10, 10),
  };
}

async function generatePost(store, value, { ai = generateText } = {}) {
  const input = generationInput(value);
  const [dna, samples, feedback] = await Promise.all([activeDna(store), store.list("sample", { limit: 60 }), store.list("feedback", { limit: 12 })]);
  const { system, prompt, sampleIds } = buildGenerationPrompt({ ...input, dna: dna.profile, samples, feedbackNotes: feedbackNotes(feedback) });
  const first = await callAi(store, "generate", { system, prompt, temperature: 0.95 }, ai);
  let text = cleanPost(first.text);
  let calls = 1;
  const warnings = [];
  if (first.incomplete) warnings.push("Jawapan AI terpotong sebelum siap. Semak penutup atau jana semula.");
  // One optional revision, only when the length misses by more than 10%.
  if (!first.incomplete && Math.abs(text.length - input.length) / input.length > 0.1) {
    try {
      const fixed = await callAi(store, "length_fix", { ...buildLengthFixPrompt(text, input.length), temperature: 0.5 }, ai);
      const candidate = cleanPost(fixed.text);
      if (!fixed.incomplete && Math.abs(candidate.length - input.length) < Math.abs(text.length - input.length)) text = candidate;
      calls += 1;
    } catch (error) {
      warnings.push(`Panjang tidak dapat dilaraskan: ${error.message}`);
    }
  }
  return { text, input, model: first.model, provider: first.provider, dnaVersion: dna.version, sampleIds, calls, warnings, review: localReview(text, { targetLength: input.length }) };
}

async function rewritePost(store, { action, text, feedback, targetLength }, { ai = generateText } = {}) {
  const body = clean(text, LIMITS.post);
  if (body.length < 80) throw fail("Tiada draf untuk disunting.");
  const dna = await activeDna(store);
  const { scope, system, prompt } = buildRewritePrompt({ action, text: body, dna: dna.profile, feedback });
  const result = await callAi(store, `rewrite:${action}`, { system, prompt, temperature: 0.8 }, ai);
  if (result.incomplete && scope === "full") throw new AiError("incomplete", "Jawapan AI terpotong. Draf asal dikekalkan; cuba semula.", 502);
  const next = applyRewrite(body, scope, result.text);
  return { text: next, scope, action, model: result.model, review: localReview(next, { targetLength: clamp(targetLength, 500, 8000, next.length) }) };
}

async function reviewPost(store, { text, targetLength }, { ai = generateText } = {}) {
  const body = clean(text, LIMITS.post);
  if (body.length < 80) throw fail("Tiada draf untuk disemak.");
  const dna = await activeDna(store);
  const result = await callAi(store, "quality", { ...buildQualityPrompt(body, dna.profile), json: true, temperature: 0.3, maxOutputTokens: 4096 }, ai);
  return { quality: normalizeQuality(parseJson(result.text)), review: localReview(body, { targetLength: clamp(targetLength, 500, 8000, body.length) }), model: result.model };
}

async function analyzeDna(store, { ai = generateText } = {}) {
  const samples = (await store.list("sample", { limit: 60 })).filter((sample) => sample.selected !== false);
  if (samples.length < 3) throw fail("Tambah sekurang-kurangnya 3 contoh post yang dipilih sebelum analisis.");
  // Longest posts carry the most voice; cap the prompt at 12 of them.
  const chosen = [...samples].sort((a, b) => b.content.length - a.content.length).slice(0, 12);
  const current = await activeDna(store);
  const result = await callAi(store, "dna_analyze", { ...buildAnalysisPrompt(chosen), json: true, temperature: 0.4 }, ai);
  const parsed = parseJson(result.text);
  return saveDna(store, { ...current.profile, ...Object.fromEntries(DNA_FIELDS.map(([key]) => [key, clean(parsed[key], 1500) || current.profile[key]])) }, "analysis", `Dianalisis daripada ${chosen.length} contoh post.`);
}

async function learnFromFeedback(store, { ai = generateText } = {}) {
  const feedback = await store.list("feedback", { limit: 20 });
  const notes = feedbackNotes(feedback);
  const approved = feedback.filter((item) => (item.tags || []).includes("perfect") && clean(item.text)).slice(0, 2).map((item) => item.text);
  if (!notes.length && !approved.length) throw fail("Belum ada maklum balas untuk dipelajari.");
  const current = await activeDna(store);
  const result = await callAi(store, "dna_learn", { ...buildLearnPrompt(current.profile, notes, approved), json: true, temperature: 0.3 }, ai);
  const parsed = parseJson(result.text);
  const changes = (Array.isArray(parsed.changes) ? parsed.changes : []).map((item) => clean(item, 200)).filter(Boolean).slice(0, 8);
  const dna = await saveDna(store, { ...current.profile, ...Object.fromEntries(DNA_FIELDS.map(([key]) => [key, clean(parsed[key], 1500) || current.profile[key]])) }, "feedback", changes.join(" ") || "Dikemas kini daripada maklum balas.");
  return { dna, changes };
}

function draftData(value = {}, previous = {}) {
  const content = clean(value.content, LIMITS.post);
  if (!content) throw fail("Draf kosong.");
  return {
    topic: clean(value.topic ?? previous.topic, LIMITS.topic),
    context: value.context ?? previous.context ?? {},
    generated: clean(value.generated ?? previous.generated, LIMITS.post),
    content,
    style: STYLES[value.style] ? value.style : previous.style || "personal",
    length: clamp(value.length ?? previous.length, 500, 8000, DEFAULT_LENGTH),
    intensity: clamp(value.intensity ?? previous.intensity, 1, 10, 8),
    voiceStrength: clamp(value.voiceStrength ?? previous.voiceStrength, 1, 10, 10),
    dnaVersion: Number(value.dnaVersion ?? previous.dnaVersion) || 0,
    model: clean(value.model ?? previous.model, 80),
    characters: content.length,
  };
}

async function saveDraft(store, value = {}) {
  const status = STATUSES.includes(value.status) ? value.status : undefined;
  if (!value.id) {
    const data = draftData(value);
    return store.insert("draft", { title: data.topic || content(data.content), status: status || "draft", data });
  }
  const previous = await store.get("draft", value.id);
  const data = draftData(value, previous);
  // Keep what was there before an edit, so it can be restored.
  if (previous.content && previous.content !== data.content) {
    await store.insert("revision", { parentId: previous.id, title: clean(value.reason, 80) || "Suntingan", data: { content: previous.content, characters: previous.content.length } });
  }
  return store.update("draft", value.id, { title: data.topic || content(data.content), ...(status ? { status } : {}), data });
}

function content(text) {
  return clean(text).split("\n")[0].slice(0, 80);
}

function draftSummary(draft) {
  return { id: draft.id, topic: draft.topic || draft.title, status: draft.status || "draft", style: draft.style, characters: draft.characters || 0, dnaVersion: draft.dnaVersion || 0, model: draft.model || "", createdAt: draft.createdAt, updatedAt: draft.updatedAt, excerpt: clean(draft.content).slice(0, 180) };
}

async function listDrafts(store, { q = "", status = "" } = {}) {
  const drafts = await store.list("draft", { limit: 200 });
  const needle = clean(q, 100).toLowerCase();
  return drafts
    .filter((draft) => (!status || draft.status === status) && (!needle || `${draft.topic} ${draft.title} ${draft.content}`.toLowerCase().includes(needle)))
    .map(draftSummary);
}

async function saveFeedback(store, value = {}) {
  const tags = (Array.isArray(value.tags) ? value.tags : []).filter((tag) => FEEDBACK_TAGS[tag]);
  const note = clean(value.note, LIMITS.note);
  if (!tags.length && !note) throw fail("Pilih sekurang-kurangnya satu maklum balas.");
  const text = clean(value.text, LIMITS.post);
  const row = await store.insert("feedback", { parentId: value.draftId || "", title: tags.join(","), data: { tags, note, text: tags.includes("perfect") ? text : "", topic: clean(value.topic, LIMITS.topic) } });
  let sample = null;
  // An approved post becomes a writing example, so it steers the next drafts.
  if (tags.includes("perfect") && text.length >= 80) {
    sample = await store.insert("sample", { title: content(text), data: { ...sampleInput({ content: text, category: "Diluluskan" }), source: "approved" } });
  }
  return { feedback: row, sample };
}

function publicConfig() {
  const config = aiConfig();
  return {
    ...config,
    styles: Object.entries(STYLES).map(([id, style]) => ({ id, label: style.label })),
    lengths: LENGTHS,
    defaultLength: DEFAULT_LENGTH,
    rewrites: Object.entries(REWRITES).filter(([id]) => id !== "improve").map(([id, rewrite]) => ({ id, label: rewrite.label })),
    feedbackTags: Object.entries(FEEDBACK_TAGS).map(([id, label]) => ({ id, label })),
    dnaFields: DNA_FIELDS.map(([id, label]) => ({ id, label })),
    limits: { hourly: HOURLY_LIMIT, daily: DAILY_LIMIT, ...LIMITS },
    dataNotice: "Topik, konteks, Writing DNA dan contoh post yang dipilih dihantar ke Google Gemini untuk menjana teks. Pada free tier, Google boleh menggunakan kandungan ini untuk menambah baik produknya dan ia mungkin disemak oleh manusia. Jangan masukkan maklumat sulit client.",
  };
}

module.exports = {
  DNA_FIELDS, FEEDBACK_TAGS, PRESET_DNA, REWRITES, STYLES, STATUSES, WRITING_RULES,
  activeDna, analyzeDna, applyRewrite, buildGenerationPrompt, buildRewritePrompt, cleanPost, createStore, draftSummary,
  generatePost, learnFromFeedback, listDrafts, localReview, normalizeDna, pickSamples, publicConfig, reviewPost, rewritePost,
  sampleInput, saveDna, saveDraft, saveFeedback, splitImport,
};
