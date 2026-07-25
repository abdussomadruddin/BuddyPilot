const CATEGORY_SUBTOPICS = Object.freeze({
  business: ["cash flow", "customer trust", "daily operation", "pricing", "repeat customer", "business system", "team communication", "decision making"],
  marketing: ["customer attention", "content angle", "offer clarity", "positioning", "market research", "brand message", "content consistency", "customer journey"],
  sales: ["follow up", "closing", "customer objection", "sales script", "lead quality", "customer trust", "sales target", "asking the right question"],
  food: ["menu pricing", "food quality", "repeat customer", "portion", "delivery order", "customer review", "kitchen workflow", "peak hour"],
  "local brand": ["brand trust", "local customer", "packaging", "repeat order", "founder story", "product quality", "community support", "brand consistency"],
  travel: ["travel budget", "packing", "flight timing", "hotel choice", "local food", "travel planning", "hidden cost", "slow travel"],
  work: ["workload", "office communication", "meeting", "deep work", "career boundary", "work pressure", "teamwork", "daily priority"],
  salary: ["salary negotiation", "career value", "monthly commitment", "income growth", "job offer", "salary expectation", "skill value", "career move"],
  wfh: ["home routine", "focus at home", "online meeting", "work boundary", "family interruption", "workspace", "daily schedule", "remote communication"],
  parenting: ["daily routine", "parent guilt", "screen time", "family time", "child behaviour", "school preparation", "parent energy", "small family moments"],
  fitness: ["workout consistency", "rest day", "food habit", "daily steps", "strength training", "gym anxiety", "fitness progress", "sleep quality"],
  "personal growth": ["self confidence", "small progress", "personal boundary", "overthinking", "learning from mistakes", "self comparison", "daily discipline", "starting again"],
  relationship: ["communication", "expectation", "emotional space", "trust", "small effort", "listening", "conflict", "growing together"],
  money: ["monthly budget", "spending habit", "emergency fund", "financial boundary", "money anxiety", "saving goal", "hidden expense", "lifestyle cost"],
  "side income": ["first customer", "time after work", "small offer", "consistent action", "extra income target", "learning a new skill", "selling online", "weekend project"],
  education: ["learning habit", "student focus", "exam pressure", "teacher communication", "practical learning", "online class", "study routine", "curiosity"],
  automotive: ["car loan", "test drive", "trade in", "car maintenance", "fuel cost", "used car condition", "car insurance", "buying decision"],
  "real estate": ["home loan", "property viewing", "rental yield", "location", "down payment", "tenant quality", "property price", "buying timeline"],
  "ai automation": ["repetitive task", "automation workflow", "prompt quality", "human review", "tool overload", "time saving", "data quality", "simple automation"],
  "tiktok ads": ["creative hook", "video retention", "campaign testing", "audience signal", "lead form", "ad fatigue", "cost per result", "landing experience"],
  "facebook ads": ["creative fatigue", "campaign structure", "retargeting", "cost per lead", "audience testing", "offer clarity", "landing page", "ad learning phase"],
  "content creation": ["content idea", "posting consistency", "first draft", "content hook", "editing", "creative block", "content feedback", "publishing"],
  "personal branding": ["personal voice", "online trust", "sharing experience", "content consistency", "public perception", "expert positioning", "showing personality", "building credibility"],
  entrepreneurship: ["business uncertainty", "founder energy", "customer feedback", "small team", "business risk", "daily decision", "early revenue", "long-term patience"],
  startup: ["first user", "product feedback", "small team", "runway", "early product", "fast experiment", "founder focus", "market fit"],
  freelancing: ["client scope", "project deadline", "pricing", "revision", "finding clients", "portfolio", "payment term", "work schedule"],
  career: ["career direction", "new responsibility", "job interview", "skill growth", "career switch", "work reputation", "promotion", "professional network"],
  productivity: ["daily priority", "to-do list", "deep focus", "small task", "calendar", "energy management", "phone distraction", "finishing work"],
  "mental health": ["mental rest", "emotional load", "asking for help", "daily pressure", "quiet time", "self compassion", "burnout signal", "healthy boundary"],
  lifestyle: ["daily routine", "simple living", "personal time", "home habit", "weekend plan", "digital balance", "small comfort", "life priority"],
  finance: ["cash flow", "financial planning", "debt management", "monthly commitment", "risk", "insurance", "financial goal", "money decision"],
  investment: ["risk tolerance", "long-term return", "market noise", "investment discipline", "portfolio", "starting small", "research", "emotional decision"],
  ecommerce: ["product page", "cart abandonment", "delivery", "customer review", "checkout", "product demand", "online trust", "repeat purchase"],
  "online business": ["digital offer", "online customer", "simple funnel", "content traffic", "payment flow", "customer support", "business system", "repeat sales"],
  "customer service": ["response time", "customer complaint", "clear explanation", "service recovery", "customer expectation", "follow up", "listening", "small gesture"],
  leadership: ["team trust", "clear direction", "difficult conversation", "delegation", "decision", "team energy", "leading by example", "giving feedback"],
  management: ["team workflow", "priority", "meeting", "delegation", "performance review", "process", "deadline", "communication"],
  technology: ["new tool", "digital habit", "privacy", "software update", "user experience", "tech learning", "device choice", "online safety"],
  gadgets: ["device value", "battery life", "daily use", "upgrade decision", "useful feature", "device price", "accessory", "buying hype"],
  gaming: ["game balance", "team play", "rank pressure", "practice", "gaming community", "new release", "in-game decision", "playing for fun"],
  entertainment: ["storytelling", "audience taste", "new release", "local talent", "streaming choice", "public reaction", "creative risk", "fan community"],
  fashion: ["personal style", "clothing quality", "outfit comfort", "trend", "local designer", "wardrobe choice", "price", "confidence"],
  beauty: ["skin routine", "product expectation", "self confidence", "beauty trend", "simple routine", "product review", "consistency", "personal comfort"],
  health: ["daily movement", "sleep", "food choice", "health check", "stress", "small symptom", "healthy routine", "recovery"],
  "home living": ["home organisation", "small space", "cleaning routine", "family comfort", "home budget", "storage", "quiet corner", "daily maintenance"],
  wedding: ["wedding budget", "vendor choice", "family expectation", "guest list", "planning timeline", "small detail", "couple decision", "wedding pressure"],
  pets: ["pet routine", "animal behaviour", "vet cost", "pet food", "daily care", "pet trust", "training", "small companionship"],
  community: ["local support", "shared responsibility", "neighbourhood", "volunteer work", "community trust", "small contribution", "public space", "helping each other"],
  malaysia: ["local habit", "daily commute", "mamak culture", "family expectation", "cost of living", "local business", "community humour", "Malaysian timing"],
  "current issues": ["public reaction", "online discussion", "different perspective", "daily impact", "community concern", "information overload", "public trust", "responsible sharing"],
});

const LOCAL_CONTEXTS = Object.freeze([
  "dekat Malaysia, benda practical memang lagi cepat orang faham",
  "bila hidup dah penuh dengan kerja dan family, benda kecil pun boleh rasa berat",
  "kadang sembang dekat group WhatsApp lagi jujur daripada post yang cantik",
  "orang kita cepat nampak kalau ayat terlalu cuba menjual",
  "bila kos hidup naik, keputusan kecil pun orang fikir dua kali",
  "contoh yang dekat dengan hidup harian biasanya lagi senang masuk",
]);

function normalizeCategory(value) {
  const key = String(value || "business").trim().toLowerCase();
  return CATEGORY_SUBTOPICS[key] ? key : "business";
}

function createIdeaPack(category) {
  const key = normalizeCategory(category);
  const subtopics = CATEGORY_SUBTOPICS[key];
  return {
    category: key,
    subtopics,
    pains: [
      "{topic} jadi berat bila semua benda nak dibuat serentak",
      "ramai berhenti dekat {topic} sebelum sempat nampak apa yang sebenarnya tak kena",
      "part paling penat dalam {topic} selalunya benda kecil yang berulang",
      "bila {topic} tak jelas, keputusan mudah pun boleh ambil masa",
      "kita cepat compare {topic} sendiri dengan hasil orang yang dah lama mula",
      "terlalu banyak pilihan buat {topic} nampak lagi susah daripada keadaan sebenar",
    ],
    observations: [
      "makin ramai sembang pasal {topic}, tapi proses sebenar jarang orang tunjuk",
      "bila orang dah jumpa cara urus {topic}, selalunya dia tak banyak tukar benda",
      "{topic} dekat luar nampak mudah, dekat belakang banyak benda kena test",
      "bila {topic} dibuat lebih simple, orang lebih senang nak ikut",
      "yang paling bising pasal {topic} tak semestinya yang paling lama buat",
      "benda kecil dalam {topic} selalu nampak remeh sampai ia mula terkumpul",
    ],
    opinions: [
      "{topic} tak perlu nampak hebat untuk bagi kesan",
      "aku lagi percaya cara yang boleh diulang daripada benda yang cantik sekali",
      "banyak advice pasal {topic} cuma buat orang tambah serabut",
      "untuk {topic}, jelas lagi penting daripada laju",
      "aku rasa kita terlalu cepat cari shortcut untuk {topic}",
      "cara yang boring kadang paling senang nak kekal",
    ],
    dilemmas: [
      "nak cepat atau nak buat {topic} dengan cara yang boleh tahan",
      "nak tambah idea baru atau beri {topic} yang lama peluang",
      "nak ikut cara orang atau cari rentak sendiri untuk {topic}",
      "nak tunggu yakin atau belajar melalui {topic} yang sedang dibuat",
    ],
    localContexts: LOCAL_CONTEXTS,
  };
}

module.exports = {
  CATEGORY_SUBTOPICS,
  LOCAL_CONTEXTS,
  createIdeaPack,
  normalizeCategory,
};
