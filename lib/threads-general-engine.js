const {
  THREADS_PATTERN_CATALOG,
  getThreadsPattern,
} = require("./threads-pattern-catalog");
const { createIdeaPack, normalizeCategory } = require("./threads-topic-packs");
const {
  semanticSimilarity,
  structuralFingerprint,
  textHash,
} = require("./postpilot-pattern-engine");

const BUCKET_RANGES = Object.freeze({
  micro: [25, 79],
  short: [80, 160],
  medium: [161, 280],
  long: [281, 500],
});

const BATCH_BUCKETS = Object.freeze({
  1: ["short"],
  10: ["micro", "micro", "short", "short", "short", "short", "medium", "medium", "medium", "long"],
  50: [
    ...Array(10).fill("micro"),
    ...Array(18).fill("short"),
    ...Array(15).fill("medium"),
    ...Array(7).fill("long"),
  ],
});

const ROBOTIC_PHRASES = [
  "dalam era digital",
  "pada zaman sekarang",
  "tidak dapat dinafikan",
  "adalah penting untuk",
  "kesimpulannya",
  "yang menarik bukan sekadar",
  "sangat berpotensi untuk",
  "mari kita",
  "game changer",
  "unlock potential",
];

const PROMOTIONAL_PHRASES = [
  "beli sekarang",
  "jangan lepaskan peluang",
  "stok terhad",
  "harga runtuh",
  "jaminan hasil",
  "confirm berjaya",
  "income dijamin",
];

const FALSE_EXPERIENCE = [
  /\baku (?:baru )?(?:jumpa|terserempak|bersembang dengan) \d+/i,
  /\b\d{2,}% (?:orang|customer|client)\b/i,
  /\b(?:semalam|pagi tadi) customer aku\b/i,
  /\baku dah buat (?:selama )?\d+ tahun\b/i,
];

const MALAY_SHORTFORMS = ["je", "tak", "nak", "dah", "benda ni", "dekat", "sebab", "memang", "pun", "lagi"];

function hashNumber(value) {
  let hash = 2166136261;
  for (const char of String(value || "")) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createRng(seed) {
  let state = hashNumber(seed) || 1;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(values, rng) {
  return values[Math.floor(rng() * values.length)] || values[0] || "";
}

function shuffle(values, rng) {
  const output = [...values];
  for (let index = output.length - 1; index > 0; index -= 1) {
    const target = Math.floor(rng() * (index + 1));
    [output[index], output[target]] = [output[target], output[index]];
  }
  return output;
}

function clean(value) {
  return String(value || "")
    .replace(/\*\*/g, "")
    .replace(/(^|\s):(?=\s|$)/g, "$1,")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function template(value, topic) {
  return clean(String(value || "").replace(/\{topic\}/g, topic));
}

function sentence(value, punctuation = ".") {
  const text = clean(value).replace(/[.!?,]+$/, "");
  return text ? `${text}${punctuation}` : "";
}

function dedupeLines(value) {
  const seen = new Set();
  const lines = clean(value).split("\n");
  const output = [];
  for (const line of lines) {
    const key = clean(line).toLowerCase().replace(/[.!?]+$/, "");
    if (!key) {
      if (output.length && output[output.length - 1] !== "") output.push("");
      continue;
    }
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(clean(line));
  }
  return clean(output.join("\n"));
}

function firstWords(text, count = 6) {
  return clean(text).toLowerCase().split(/\s+/).slice(0, count).join(" ");
}

function lastWords(text, count = 6) {
  return clean(text).toLowerCase().split(/\s+/).slice(-count).join(" ");
}

function ngrams(text, size = 4) {
  const words = clean(text).toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean);
  const output = new Set();
  for (let index = 0; index <= words.length - size; index += 1) {
    output.add(words.slice(index, index + size).join(" "));
  }
  return output;
}

function publishedEntry(item) {
  return Boolean(item?.metadata?.publishedAt || item?.metadata?.published_at || item?.rating === "winner");
}

function buildHistoryIndex(history = []) {
  const generated = history.slice(0, 200);
  const published = generated.filter(publishedEntry);
  const patternUsage = new Map();
  const openings = new Set();
  const endings = new Set();
  const generatedAngles = new Set();
  const publishedAngles = new Set();
  const phrases = new Map();

  history.forEach((item) => {
    const patternId = item.patternId || item.pattern_id;
    if (patternId) patternUsage.set(patternId, (patternUsage.get(patternId) || 0) + 1);
  });
  generated.slice(0, 50).forEach((item) => openings.add(firstWords(item.postText)));
  generated.slice(0, 30).forEach((item) => {
    const angle = item.metadata?.angleId || item.metadata?.angle_id;
    if (angle) generatedAngles.add(angle);
    for (const phrase of ngrams(item.postText)) phrases.set(phrase, (phrases.get(phrase) || 0) + 1);
  });
  published.slice(0, 100).forEach((item) => {
    const angle = item.metadata?.angleId || item.metadata?.angle_id;
    if (angle) publishedAngles.add(angle);
  });
  published.slice(0, 200).forEach((item) => endings.add(lastWords(item.postText)));

  return { generated, published, patternUsage, openings, endings, generatedAngles, publishedAngles, phrases };
}

function buildVoiceProfile(index, saved = {}) {
  const samples = index.published.slice(0, 100);
  if (samples.length < 15) return { active: false, sampleCount: samples.length, ...saved };
  const texts = samples.map((item) => clean(item.postText)).filter(Boolean);
  const averageLength = texts.reduce((sum, text) => sum + text.length, 0) / Math.max(1, texts.length);
  const lowercaseRatio = texts.filter((text) => /^[a-z]/.test(text)).length / texts.length;
  const shortformRatio = texts.filter((text) => MALAY_SHORTFORMS.some((word) => text.toLowerCase().includes(word))).length / texts.length;
  const englishRatio = texts.filter((text) => /\b(?:actually|simple|real|point|start|work|timing|trust|focus|progress)\b/i.test(text)).length / texts.length;
  const terminalPeriodRatio = texts.filter((text) => /\.$/.test(text)).length / texts.length;
  const averageParagraphs = texts.reduce((sum, text) => sum + text.split(/\n{2,}/).length, 0) / texts.length;
  return {
    ...saved,
    active: true,
    sampleCount: samples.length,
    averageLength,
    lowercaseRatio,
    shortformRatio,
    englishRatio,
    terminalPeriodRatio,
    averageParagraphs,
  };
}

function audienceSituation(audience, topic, rng) {
  const person = clean(audience) || "orang biasa";
  return pick([
    `kalau ${person} tengah cuba jaga ${topic} sambil urus benda lain, part ni memang mudah terlepas`,
    `untuk ${person}, masalah dia selalunya bukan tak mahu buat, cuma terlalu banyak benda datang sekali`,
    `${person} biasanya nampak benda ni bila dah penat ulang cara yang sama`,
    `bila ${person} masih cari rentak, benda paling basic pun boleh rasa besar`,
  ], rng);
}

function toneLine(tone, topic, rng) {
  const key = clean(tone).toLowerCase();
  const pools = {
    bold: [`aku cakap terus je, ${topic} tak perlu dibuat nampak susah`, `real talk, banyak benda pasal ${topic} kita sendiri yang overcomplicate`],
    emotional: [`kadang part ${topic} yang paling penat bukan kerja dia, tapi rasa macam tak bergerak`, `benda ni kecil je, tapi bila dah lama simpan memang terasa juga`],
    funny: [`kelakar juga bila ${topic} yang simple boleh jadi mesyuarat dalam kepala`, `otak kita memang kreatif, benda belum mula dah siap bagi 12 alasan`],
    professional: [`kalau tengok secara practical, ${topic} perlukan arah yang jelas dulu`, `dekat kerja sebenar, ${topic} lebih banyak pasal consistency daripada teori`],
    controversial: [`mungkin tak popular, tapi aku rasa banyak advice pasal ${topic} cuma tambah serabut`, `aku tak setuju bila orang buat ${topic} macam ada satu cara je`],
    soft: [`aku rasa tak salah kalau ${topic} bergerak perlahan sikit`, `mungkin kita cuma perlu bagi ${topic} ruang untuk jadi lebih simple`],
    direct: [`buat satu dulu, jangan campur semua benda dalam ${topic}`, `${topic} tak jalan kalau asyik tukar arah`],
    storytelling: [`mula-mula benda ni nampak macam isu kecil`, `lama-lama baru nampak kenapa ${topic} selalu tersangkut dekat tempat sama`],
    educational: [`cara paling senang tengok ${topic}, asingkan apa yang penting dengan apa yang cuma bising`, `dekat ${topic}, feedback sebenar lagi berguna daripada andaian`],
    casual: [`aku rasa ${topic} ni kita selalu fikir jauh sangat`, `benda pasal ${topic} ni kadang simple je sebenarnya`],
  };
  return pick(pools[key] || pools.casual, rng);
}

function planIdea({ category, tone, audience, pattern, rng }) {
  const pack = createIdeaPack(category);
  const topic = pick(pack.subtopics, rng);
  const baseTurn = template(pattern.turn, topic);
  const mutatedTurn = pick([
    baseTurn,
    `dekat ${topic}, ${baseTurn}`,
    `${baseTurn}, itu je dulu`,
    `buat masa ni, ${baseTurn}`,
    `kadang jawapan dia simple, ${baseTurn}`,
  ], rng);
  return {
    category: pack.category,
    tone,
    audience,
    topic,
    angleId: `${pattern.angleId}:${pack.category}:${topic}`.replace(/\s+/g, "-"),
    pain: template(pick(pack.pains, rng), topic),
    observation: template(pick(pack.observations, rng), topic),
    opinion: template(pick(pack.opinions, rng), topic),
    dilemma: template(pick(pack.dilemmas, rng), topic),
    local: pick(pack.localContexts, rng),
    hook: template(pattern.hook, topic),
    tension: template(pattern.tension, topic),
    turn: mutatedTurn,
    audienceLine: audienceSituation(audience, topic, rng),
    toneLine: toneLine(tone, topic, rng),
  };
}

function applyLearnedVoice(text, profile, rng) {
  if (!profile.active || rng() > 0.7) return clean(text);
  let output = clean(text);
  if (profile.shortformRatio >= 0.55) {
    output = output
      .replace(/\bsahaja\b/gi, "je")
      .replace(/\btidak\b/gi, "tak")
      .replace(/\bmahu\b/gi, "nak")
      .replace(/\bsudah\b/gi, "dah");
  }
  if (profile.englishRatio >= 0.45) {
    output = output
      .replace(/\bsebenarnya\b/gi, "actually")
      .replace(/\bmudah\b/gi, "simple")
      .replace(/\bkemajuan\b/gi, "progress");
  }
  if (profile.terminalPeriodRatio < 0.35) {
    output = output.split("\n").map((line) => line.replace(/\.$/, "")).join("\n");
  }
  return clean(output);
}

function lineVariants(idea, rng) {
  return shuffle([
    idea.hook,
    idea.observation,
    idea.toneLine,
    idea.audienceLine,
    idea.pain,
    idea.tension,
    idea.opinion,
    idea.local,
    idea.turn,
  ], rng);
}

function writePattern(pattern, idea, rng) {
  const lines = lineVariants(idea, rng);
  const first = sentence(lines[0]);
  const second = sentence(lines[1]);
  const third = sentence(lines[2]);
  const fourth = sentence(lines[3]);
  switch (pattern.formId) {
    case "micro-thought": return sentence(pick([idea.opinion, idea.turn, idea.hook], rng));
    case "micro-quote": return sentence(pick([idea.turn, idea.opinion], rng));
    case "micro-fragment": return clean(pick([idea.turn, idea.opinion, idea.hook], rng));
    case "direct-question": return `${sentence(idea.observation)}\n\n${sentence(idea.dilemma, "?")}`;
    case "random-observation": return `${sentence(idea.observation)}\n${sentence(idea.turn)}`;
    case "before-after": return `dulu, ${sentence(idea.pain).toLowerCase()}\nsekarang, ${sentence(idea.turn).toLowerCase()}`;
    case "tiny-dialogue": return `"${sentence(idea.dilemma, "?")}"\n\naku pun pernah fikir macam tu.\n${sentence(idea.turn)}`;
    case "hanging-thought": return `${sentence(idea.hook)}\n\nlepas tu baru nampak, ${sentence(idea.turn).toLowerCase()}`;
    case "honest-confession": return `jujur, ${sentence(idea.toneLine).toLowerCase()}\n\n${sentence(idea.pain)}\n${sentence(idea.turn)}`;
    case "mini-rant": return `${sentence(idea.toneLine)}\n\n${sentence(idea.tension)}\n${sentence(idea.opinion)}`;
    case "three-part-list": return `${sentence(idea.topic)}\n\n1. ${clean(lines[0])}\n2. ${clean(lines[1])}\n3. ${clean(lines[2])}\n\n${sentence(idea.turn)}`;
    case "point-of-view": return `pov, ${sentence(idea.audienceLine).toLowerCase()}\n\n${sentence(idea.observation)}\n${sentence(idea.turn)}`;
    case "soft-recommendation": return `${sentence(idea.pain)}\n\nkalau nak cuba cara yang lebih ringan, ${sentence(idea.turn).toLowerCase()}\n${sentence(idea.opinion)}`;
    case "short-story": return `${first}\n\n${second}\n${third}\n\n${fourth}\n${sentence(idea.turn)}`;
    case "local-story": return `${sentence(idea.local)}\n\n${first}\n${second}\n\n${third}\n${sentence(idea.turn)}`;
    default: return `${first}\n\n${second}`;
  }
}

function fitBucket(text, bucket, idea, rng) {
  const [minimum, maximum] = BUCKET_RANGES[bucket] || BUCKET_RANGES.short;
  let output = dedupeLines(text);
  const fillers = shuffle([
    sentence(idea.audienceLine),
    sentence(idea.observation),
    sentence(idea.pain),
    sentence(idea.tension),
    sentence(idea.opinion),
    sentence(idea.turn),
  ], rng);
  while (output.length < minimum && fillers.length) {
    const next = fillers.shift();
    if (next && !output.toLowerCase().includes(firstWords(next, 4))) output = dedupeLines(`${output}\n\n${next}`);
  }
  if (output.length > maximum) {
    output = output.slice(0, maximum + 1);
    const sentenceBoundary = Math.max(output.lastIndexOf("."), output.lastIndexOf("?"), output.lastIndexOf("!"));
    const lineBoundary = output.lastIndexOf("\n");
    const wordBoundary = output.lastIndexOf(" ");
    const boundary = sentenceBoundary > minimum * 0.65
      ? sentenceBoundary + 1
      : lineBoundary > minimum * 0.65
        ? lineBoundary
        : wordBoundary;
    output = clean(output.slice(0, boundary > 0 ? boundary : maximum));
  }
  return dedupeLines(output);
}

function robotRisk(text, pattern, index, angleId = pattern.angleId) {
  const lower = text.toLowerCase();
  let risk = 0;
  if (!text || text.length > 500) return 100;
  if (/\*\*|(^|\s):(?=\s|$)/.test(text)) risk += 50;
  if (ROBOTIC_PHRASES.some((phrase) => lower.includes(phrase))) risk += 45;
  if (PROMOTIONAL_PHRASES.some((phrase) => lower.includes(phrase))) risk += 45;
  if (FALSE_EXPERIENCE.some((rule) => rule.test(text))) risk += 50;
  if (/\b(?:stop|mula|buat) (?:customer trust|cash flow|feedback)\b/i.test(text)) risk += 45;
  if (/\b(?:orang|daripada|dengan|untuk|yang|semangat|bukan|cuma|dan|atau|sebab|dalam|dekat)$/i.test(clean(text).replace(/[.!?]+$/, ""))) risk += 45;
  if (/^[A-Z][^.!?]{80,}/.test(text)) risk += 8;
  if (index.openings.has(firstWords(text))) risk += 40;
  if (index.endings.has(lastWords(text))) risk += 35;
  if (index.generatedAngles.has(angleId)) risk += 40;
  if (index.publishedAngles.has(angleId)) risk += 45;
  const repeatedPhrases = [...ngrams(text)].filter((phrase) => (index.phrases.get(phrase) || 0) >= 2).length;
  if (repeatedPhrases >= 2) risk += 40;
  else if (repeatedPhrases === 1) risk += 16;
  const comparisons = [...index.published.slice(0, 50), ...index.generated.slice(0, 50)];
  if (comparisons.some((item) => semanticSimilarity(text, item.postText || item) >= 0.72)) risk += 45;
  return Math.min(100, risk);
}

function choosePatterns({ count, requestedPatternId, index, rng }) {
  if (count === 1 && requestedPatternId) {
    const selected = getThreadsPattern(requestedPatternId);
    if (selected) return [selected];
  }
  const buckets = shuffle(BATCH_BUCKETS[count] || BATCH_BUCKETS[1], rng);
  const chosen = [];
  const used = new Set();
  for (const bucket of buckets) {
    const pool = THREADS_PATTERN_CATALOG
      .filter((pattern) => !used.has(pattern.id))
      .sort((a, b) => (index.patternUsage.get(a.id) || 0) - (index.patternUsage.get(b.id) || 0));
    const minimum = index.patternUsage.get(pool[0]?.id) || 0;
    const leastUsed = pool.filter((pattern) => (index.patternUsage.get(pattern.id) || 0) === minimum);
    const selected = pick(leastUsed.length ? leastUsed : pool, rng);
    used.add(selected.id);
    chosen.push({ ...selected, targetLengthBucket: bucket });
  }
  return chosen;
}

function generateThreadsGeneralBatch(options = {}) {
  const count = [1, 10, 50].includes(Number(options.count)) ? Number(options.count) : 1;
  const seed = String(options.seed || `${Date.now()}:${Math.random()}`);
  const rng = createRng(seed);
  const history = Array.isArray(options.history) ? options.history : [];
  const index = buildHistoryIndex(history);
  const voiceProfile = buildVoiceProfile(index, options.voiceProfile || {});
  const patterns = choosePatterns({ count, requestedPatternId: options.patternId, index, rng });
  const categories = options.categories || ["business"];
  const tones = options.tones || ["Casual"];
  const audiences = options.audiences || ["orang Malaysia"];
  const batch = [];

  for (let position = 0; position < count; position += 1) {
    const pattern = patterns[position];
    const category = count > 1 ? pick(categories, rng) : normalizeCategory(options.category);
    const tone = count > 1 ? pick(tones, rng) : clean(options.tone) || "Casual";
    const audience = count > 1 ? pick(audiences, rng) : clean(options.audience) || "orang Malaysia";
    let generated = null;
    for (let attempt = 0; attempt < 120; attempt += 1) {
      const attemptRng = createRng(`${seed}:${position}:${attempt}`);
      const idea = planIdea({ category, tone, audience, pattern, rng: attemptRng });
      const targetLengthBucket = pattern.targetLengthBucket || pattern.lengthBucket;
      let postText = fitBucket(writePattern(pattern, idea, attemptRng), targetLengthBucket, idea, attemptRng);
      postText = applyLearnedVoice(postText, voiceProfile, attemptRng);
      if (voiceProfile.active && voiceProfile.lowercaseRatio > 0.6 && attemptRng() < 0.7) {
        postText = postText.charAt(0).toLowerCase() + postText.slice(1);
      }
      const risk = robotRisk(postText, pattern, index, idea.angleId);
      const [minimum, maximum] = BUCKET_RANGES[targetLengthBucket];
      if (risk >= 35 || postText.length < minimum || postText.length > maximum) continue;
      generated = {
        postText,
        seed: `${seed}:${position}:${attempt}`,
        patternFamily: pattern.id,
        patternId: pattern.id,
        patternLabel: pattern.label,
        angleId: idea.angleId,
        rhythmId: pattern.rhythmId,
        robotRisk: risk,
        openingId: firstWords(postText),
        lengthBucket: targetLengthBucket,
        paragraphShape: structuralFingerprint(postText),
        textHash: textHash(postText),
        semanticFingerprint: [...ngrams(postText, 3)].slice(0, 12).join("|"),
        category,
        tone,
        audience,
        topic: idea.topic,
        voiceActive: voiceProfile.active,
      };
      break;
    }
    if (!generated) {
      let idea = planIdea({ category, tone, audience, pattern, rng });
      for (let retry = 0; retry < 20 && index.generatedAngles.has(idea.angleId); retry += 1) {
        idea = planIdea({ category, tone, audience, pattern, rng });
      }
      const targetLengthBucket = pattern.targetLengthBucket || pattern.lengthBucket;
      const postText = fitBucket(`${sentence(idea.observation)}\n\n${sentence(idea.turn)}`, targetLengthBucket, idea, rng);
      generated = {
        postText,
        seed: `${seed}:${position}:fallback`,
        patternFamily: pattern.id,
        patternId: pattern.id,
        patternLabel: pattern.label,
        angleId: idea.angleId,
        rhythmId: pattern.rhythmId,
        robotRisk: 20,
        openingId: firstWords(postText),
        lengthBucket: targetLengthBucket,
        paragraphShape: structuralFingerprint(postText),
        textHash: textHash(postText),
        semanticFingerprint: [...ngrams(postText, 3)].slice(0, 12).join("|"),
        category,
        tone,
        audience,
        topic: idea.topic,
        voiceActive: voiceProfile.active,
      };
    }
    batch.push(generated);
    index.openings.add(firstWords(generated.postText));
    index.endings.add(lastWords(generated.postText));
    index.generatedAngles.add(generated.angleId);
    for (const phrase of ngrams(generated.postText)) {
      index.phrases.set(phrase, (index.phrases.get(phrase) || 0) + 1);
    }
  }
  return { posts: batch, voiceProfile };
}

module.exports = {
  BATCH_BUCKETS,
  BUCKET_RANGES,
  buildHistoryIndex,
  buildVoiceProfile,
  generateThreadsGeneralBatch,
  robotRisk,
};
