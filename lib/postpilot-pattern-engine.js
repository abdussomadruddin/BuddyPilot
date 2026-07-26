const crypto = require("node:crypto");

const CONTENT_MIX = Object.freeze({
  story: 25,
  quote: 20,
  insight: 20,
  opinion: 15,
  list: 10,
  recommendation: 10,
});

const THREADS_CONTENT_MIX = Object.freeze({
  story: 18,
  question: 18,
  observation: 14,
  opinion: 14,
  list: 12,
  comparison: 10,
  insight: 8,
  quote: 4,
  recommendation: 2,
});

const FAMILY_ORDER = Object.keys(CONTENT_MIX);
const THREADS_FAMILY_ORDER = Object.keys(THREADS_CONTENT_MIX);
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

const LONG_PROMOTE_FLOW = Object.freeze({
  context: [
    "dulu aku ingat bila benda tak jalan, maksudnya aku kena cari cara baru",
    "mula-mula aku cuba faham semua benda sekali gus sebab takut tertinggal",
    "aku pernah sampai satu tahap yang setiap hari ada benda baru nak dicuba",
    "masa baru mula, aku fikir lagi banyak benda aku buat, lagi cepat result datang",
    "aku dulu suka tunggu sampai semua nampak lengkap baru berani bergerak",
    "ada masa aku rasa aku dah buat banyak, tapi hujung hari masih tak tahu apa yang betul-betul siap",
  ],
  struggle: [
    "last-last kepala makin penuh dan benda paling penting langsung tak bergerak",
    "bila semua benda masuk serentak, benda yang simple pun terus rasa berat",
    "aku sibuk susun plan, tapi langkah pertama masih tak dibuat",
    "makin banyak aku compare, makin susah aku nak nampak cara sendiri",
    "yang penat bukan kerja tu sangat, tapi nak pilih mana satu patut dibuat dulu",
    "aku tukar cara terlalu cepat sampai satu cara pun tak sempat tunjuk apa-apa",
  ],
  shift: [
    "bila aku berhenti sekejap dan pecahkan satu-satu, baru nampak mana yang betul-betul perlu",
    "lepas aku kecilkan target, baru badan rasa ringan nak mula",
    "bila aku pilih satu benda untuk disiapkan dulu, flow dia terus nampak lain",
    "aku mula nampak perubahan bila aku berhenti tambah kerja dan mula buang yang tak perlu",
    "bila aku bagi satu cara masa untuk berjalan, barulah aku boleh nilai dengan kepala sejuk",
    "aku cuba buat versi paling simple dulu, dan dekat situ baru nampak apa yang selama ni sangkut",
  ],
  lesson: [
    "dekat situ aku sedar, kita tak selalu perlukan lebih banyak ilmu. kadang kita cuma perlukan arah yang jelas",
    "baru aku faham kenapa progress kecil penting. dia bagi keyakinan untuk sambung langkah seterusnya",
    "rupanya simple bukan bermaksud kurang. simple buat benda tu senang nak dibuat lagi esok",
    "yang paling banyak membantu bukan plan yang cantik, tapi langkah yang aku boleh ulang",
    "sejak tu aku kurang kejar cara paling laju. aku lebih tengok cara yang masuk akal untuk dibuat lama",
    "benda basic nampak biasa, tapi benda basic yang konsisten tu lah yang mula tunjuk jalan",
  ],
  present: [
    "sekarang bila tengok satu offer, aku cari flow dia dulu sebelum tengok benda lain",
    "sekarang aku lebih suka benda yang terus tunjuk apa nak buat dulu",
    "sebab tu aku tak terus percaya ayat besar. aku tengok sama ada langkah dia boleh difahami",
    "hari ni aku lebih selesa mula kecil, check apa jadi, kemudian baru tambah",
    "aku dah tak tunggu rasa yakin seratus peratus. nampak first step pun dah cukup untuk mula",
    "sekarang aku nilai benda dari sudut paling praktikal, boleh buat atau sekadar sedap dibaca",
  ],
});

const THREADS_FEED_LINES = {
  story: [
    ["semalam aku cuba {topic} cara paling simple", "baru sedar selama ni aku yang buat dia susah"],
    ["aku tangguh {topic} lama juga", "bila mula, rupanya tak seserabut yang aku bayang"],
    ["{topic} ni aku pernah buat separuh jalan", "kali ni aku buang semua benda yang tak perlu"],
    ["tadi aku buka balik benda lama pasal {topic}", "banyak juga benda yang aku fikir penting dulu, sekarang dah tak guna"],
    ["minggu ni aku cuba bagi lebih masa dekat {topic}", "part yang paling kecil tu rupanya paling banyak bagi kesan"],
    ["aku ingat aku perlukan plan baru untuk {topic}", "sekali yang aku perlukan cuma sambung benda yang dah mula"],
    ["aku baru spend masa betul-betul dekat {topic}", "mula-mula semua nampak macam kena buat serentak", "bila pecahkan satu-satu, rupanya ada satu part je yang selama ni tahan progress"],
    ["dulu setiap kali fikir pasal {topic}, aku terus cari cara baru", "sekarang aku buka balik apa yang dah pernah buat", "banyak benda sebenarnya belum sempat diberi peluang pun"],
    ["hari ni aku cuba buat {topic} tanpa fikir nak impress sesiapa", "lega juga bila boleh fokus dekat benda yang memang perlu siap"],
    ["aku pernah berhenti buat benda ni sebab rasa macam tak menjadi", "bila tengok balik, bukan idea tu salah", "aku je letak terlalu banyak benda dalam satu masa"],
  ],
  quote: [
    ["tak semua yang perlahan tu stuck", "kadang tengah susun hidup balik"],
    ["buat sikit-sikit pun tetap bergerak"],
    ["bila dah nampak jalan, takut tu kurang sendiri"],
    ["tak perlu nampak hebat", "cukup jangan berhenti"],
    ["orang nampak hasil", "kita je tahu berapa kali kena mula balik"],
    ["kadang bukan hilang semangat", "cuma penat pegang terlalu banyak benda"],
    ["tak semua benda perlu jawapan hari ni"],
    ["yang jalan perlahan pun masih bergerak"],
    ["kita selalu nampak orang masa dia dah jadi", "part dia hampir give up tu jarang keluar"],
    ["benda kecil yang dibuat selalu", "lama-lama jadi benda besar juga"],
  ],
  insight: [
    ["{topic} nampak senang bila tengok orang buat", "bila pegang sendiri baru tahu part mana makan masa"],
    ["makin lama aku tengok {topic}, makin jelas aku rasa", "orang yang jalan bukan sebab paling ready"],
    ["ramai kejar idea baru untuk {topic}", "yang lama satu pun belum sempat test betul-betul"],
    ["part paling susah dalam {topic} bukan nak mula", "nak kekal buat masa result belum nampak"],
    ["bila {topic} tak jalan, kita cepat salahkan idea", "kadang cara kita buat tu je yang terlalu berat"],
    ["satu benda pasal {topic} yang aku baru nampak", "simple tu bukan kurang, simple tu senang nak ulang"],
    ["bila sembang pasal {topic}, ramai suka cerita hasil", "part yang tak menjadi tu sebenarnya lagi banyak ajar"],
    ["{topic} bukan susah sangat", "yang buat penat bila setiap minggu tukar cara"],
    ["aku baru faham kenapa {topic} nampak laju dekat orang lain", "kita cuma nampak post yang menjadi"],
    ["lagi banyak aku belajar {topic}, lagi banyak benda aku buang", "rupanya bukan semua tips kena pakai"],
  ],
  opinion: [
    ["aku rasa {topic} ni ramai buat susah sangat", "padahal mula satu benda pun dah cukup"],
    ["{topic} tak semestinya perlukan plan besar", "kadang cuma perlukan satu benda siap"],
    ["jujur aku lagi percaya {topic} yang simple tapi jalan"],
    ["mungkin ramai tak setuju", "untuk {topic}, consistency lagi penting daripada nampak busy"],
    ["aku dah tak kejar cara paling cantik untuk {topic}", "aku cari cara yang aku boleh buat lagi esok"],
    ["kalau {topic} nampak terlalu perfect, aku lagi susah nak percaya"],
    ["aku rasa kita terlalu cepat cari hack untuk {topic}", "benda basic pun belum buat sampai habis"],
    ["{topic} yang nampak boring selalunya paling senang nak maintain"],
    ["tak semua advice pasal {topic} kena ikut", "ada benda memang tak ngam dengan cara kita kerja"],
    ["kalau kena pilih, aku ambil {topic} yang boleh jalan hari-hari", "bukan yang viral sehari"],
  ],
  list: [
    ["kalau bab {topic}, aku check tiga benda je", "1. jelas", "2. boleh buat", "3. boleh ulang"],
    ["{topic} versi aku", "buat kecil", "check result", "baru tambah"],
    ["tiga benda aku dah stop buat untuk {topic}", "tunggu ready", "tukar plan selalu", "compare dengan orang"],
    ["kalau {topic} mula serabut", "buang satu benda", "siapkan satu benda", "rehat dulu sebelum tambah"],
    ["cara paling ringkas aku tengok {topic}", "apa masalah dia", "apa boleh test", "apa patut buang"],
    ["bila check {topic}, aku tengok benda ni dulu", "orang faham atau tak", "boleh buat lagi atau tak", "ada result atau cuma nampak busy"],
    ["{topic} tak jalan", "jangan terus tukar semua", "check satu bahagian", "ubah satu benda", "tengok balik"],
    ["tiga benda yang selalu buat {topic} lambat", "terlalu banyak idea", "takut publish", "cepat sangat tukar plan"],
    ["kalau nak ringkaskan {topic}", "satu target", "satu cara", "satu minggu untuk tengok apa jadi"],
  ],
  recommendation: [
    ["kalau baru nak cuba {topic}, buat versi paling kecil dulu", "senang nampak mana yang jalan"],
    ["untuk {topic}, aku akan buang satu benda dulu", "bukan tambah"],
    ["cuba buat {topic} sampai siap sekali", "lepas tu baru fikir nak cantikkan"],
    ["kalau {topic} dah mula berat, kecilkan target hari ni"],
    ["tak payah tunggu yakin sangat untuk {topic}", "buat dulu sampai nampak pattern"],
    ["untuk {topic}, pilih benda yang boleh repeat", "bukan benda yang nampak hebat sekali"],
    ["kalau blur pasal {topic}, jangan cari sepuluh jawapan", "pilih satu dan test sampai dapat feedback"],
    ["untuk {topic}, mula dekat part yang kau boleh control hari ni"],
    ["kalau baru belajar {topic}, simpan dulu idea yang besar", "habiskan versi paling simple"],
    ["cuba bagi {topic} masa sikit sebelum kata tak jalan", "kadang kita stop terlalu awal"],
  ],
  question: [
    ["korang kalau bab {topic}, part mana paling pening sekarang?"],
    ["aku curious", "orang yang tengah buat {topic}, apa benda yang paling banyak makan masa?"],
    ["kalau kena mula {topic} balik dari kosong, korang buat apa dulu?"],
    ["jujur sikit", "{topic} ni memang susah atau kita yang fikir terlalu banyak?"],
    ["siapa dekat sini tengah cuba {topic} sendiri?"],
    ["apa benda pasal {topic} yang orang selalu cakap senang, tapi bila buat lain cerita?"],
    ["korang belajar {topic} dekat mana sampai betul-betul faham?"],
    ["kalau ada satu benda boleh buang daripada proses {topic}, korang buang apa?"],
    ["untuk {topic}, korang team plan dulu atau jalan dulu?"],
    ["ada tak orang yang dulu tak minat {topic}, sekali sekarang buat hari-hari?"],
  ],
  observation: [
    ["aku perasan makin ramai sembang pasal {topic}", "tapi cara setiap orang buat memang jauh beza"],
    ["dekat Malaysia, {topic} cepat sangat jadi sembang besar", "part nak buat tu tetap kena figure out sendiri"],
    ["sekarang semua benda pasal {topic} nampak laju", "yang makan masa selalunya tak masuk post"],
    ["ramai nampak confident bila cakap pasal {topic}", "bila tanya proses, rupanya semua masih test juga"],
    ["{topic} ni pelik sikit", "lagi banyak option, lagi susah orang nak mula"],
    ["bila satu benda pasal {topic} viral, terus semua orang buat cara sama"],
    ["aku tengok orang yang konsisten dengan {topic} tak banyak sembang", "dia buat, check, lepas tu buat lagi"],
    ["aku baru perasan satu benda", "{topic} yang simple selalunya lagi senang orang faham"],
    ["benda paling kelakar pasal {topic}", "kita cari tools baru masa masalah sebenar belum settle"],
    ["makin lama scroll pasal {topic}, makin susah nak beza pengalaman real dengan teori"],
  ],
  comparison: [
    ["dulu aku fikir {topic} kena nampak lengkap", "sekarang aku lagi suka benda yang terus boleh test"],
    ["orang nampak {topic} masa result dah keluar", "kita rasa part dia masa semua masih blur"],
    ["cara lama aku buat {topic}", "tambah benda", "cara sekarang", "buang benda"],
    ["dulu tunggu yakin baru buat {topic}", "sekarang buat dulu sampai keyakinan tu datang"],
    ["{topic} dekat luar nampak kemas", "dekat belakang, banyak juga trial and error"],
    ["plan untuk {topic} boleh nampak cantik", "execution dia tetap kena buat satu-satu"],
    ["masa baru mula {topic}, aku kejar speed", "sekarang aku kejar benda yang boleh repeat"],
    ["orang lain mungkin perlukan lebih banyak idea untuk {topic}", "aku sekarang perlukan lebih banyak benda siap"],
  ],
};

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

const THREADS_CLAUSES = Object.freeze({
  personalOpen: [
    "aku baru perasan satu benda pasal {topic}",
    "lagi lama aku tengok {topic}, lagi banyak benda aku sedar",
    "jujur aku rasa {topic} ni ramai buat susah sangat",
    "aku dulu selalu fikir {topic} kena tunggu masa sesuai",
    "hari ni baru aku nampak apa yang selalu sangkut bila bab {topic}",
    "aku tak tahu orang lain macam mana, tapi {topic} memang ambil masa nak faham",
    "satu benda aku belajar bila buat {topic}",
    "aku pernah buat silap yang sama bila bab {topic}",
  ],
  crowdOpen: [
    "ramai orang bila bab {topic}",
    "sekarang ramai sembang pasal {topic}",
    "dekat Threads, {topic} nampak macam senang",
    "bila {topic} mula viral, semua orang ada cara sendiri",
    "orang yang baru masuk {topic}",
    "kalau tengok dari luar, {topic} memang nampak smooth",
  ],
  tension: [
    "nak terus nampak result",
    "cepat sangat tambah benda baru",
    "tak sempat test satu cara betul-betul",
    "sibuk compare dengan cara orang",
    "tunggu semua ready baru nak gerak",
    "buat banyak benda tapi satu pun tak habis",
    "fikir jauh sangat sampai benda depan mata tak jalan",
    "kejar cara paling laju",
  ],
  realization: [
    "sekali bila buat sendiri, lain cerita",
    "rupanya part paling basic tu yang banyak tahan progress",
    "last-last benda yang simple juga paling senang jalan",
    "bila buang benda tak perlu, baru nampak apa patut buat",
    "kadang masalah dia bukan idea, cara kita susun tu je",
    "benda ni lah yang buat jalan tu mula nampak",
    "yang makan masa sebenarnya part yang orang jarang cerita",
    "baru faham kenapa orang yang konsisten nampak lebih tenang",
  ],
  reaction: [
    "patutlah selama ni rasa serabut",
    "kelakar juga bila fikir balik",
    "baru aku faham",
    "rupa-rupanya macam tu je",
    "yang ni memang kena dekat aku",
    "pelik juga, tapi masuk akal",
  ],
  directQuestion: [
    "korang kalau bab {topic}, mula dekat mana?",
    "siapa tengah buat {topic} sekarang?",
    "{topic} ni memang susah, atau kita yang overthink?",
    "kalau mula {topic} balik, apa benda pertama korang buat?",
    "apa part paling leceh bila buat {topic}?",
    "korang belajar {topic} dari siapa sampai betul-betul faham?",
    "team buat dulu atau plan dulu bila bab {topic}?",
    "ada siapa pernah give up satu cara untuk {topic}, lepas tu cuba balik?",
  ],
  softClose: [
    "aku sekarang buat je dulu",
    "tak cantik pun tak apa, janji bergerak",
    "pelan-pelan pun masih jalan",
    "at least sekarang dah tahu nak check apa",
    "yang penting boleh buat lagi esok",
    "aku bagi benda ni masa sikit",
  ],
});

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

function buildFamilyDeck(mix, count, rng) {
  const deck = [];
  const remainders = [];
  Object.entries(mix).forEach(([family, percent]) => {
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

function familyDeck(count, rng) {
  return buildFamilyDeck(CONTENT_MIX, count, rng);
}

function threadsFamilyDeck(count, rng) {
  return buildFamilyDeck(THREADS_CONTENT_MIX, count, rng);
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

function selectFamily({ rng, history = [], forcedFamily = "", mix = CONTENT_MIX, order = FAMILY_ORDER }) {
  if (forcedFamily && order.includes(forcedFamily)) return forcedFamily;
  const recent = history.slice(0, 8).map((item) => item.patternFamily || item.pattern_family);
  const ratings = ratingCounts(history);
  const explore = ratings.total < 5 || rng() < 0.3;
  const candidates = order.filter((family) => !recent.slice(0, 3).includes(family));
  const source = candidates.length ? candidates : order;
  const weighted = source.flatMap((family) => {
    const base = mix[family];
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

function audienceSituation(value, rng) {
  const audience = cleanText(value).toLowerCase();
  if (!audience) return "";
  let situations;

  if (/(startup|founder baru|fresh graduate|student)/.test(audience)) {
    situations = [
      "bila baru nak mula, semua benda nampak sama penting",
      "masa masih belajar dari kosong, benda simple pun boleh rasa berat",
      "bila first step belum jelas, memang senang habiskan masa dekat benda lain",
      "orang yang baru start selalunya bukan kurang rajin, cuma terlalu banyak pilihan",
    ];
  } else if (/(parent|ibu bekerja|bapa muda|suri rumah|working adult)/.test(audience)) {
    situations = [
      "bila masa kena bahagi antara kerja dengan rumah, benda kecil pun cepat tertangguh",
      "masa kosong tak banyak, jadi benda yang simple lagi senang nak ulang",
      "bila kepala dah penuh dengan kerja dan hal rumah, keputusan kecil pun rasa berat",
      "kadang bukan tak nak buat, cuma tenaga dah habis dekat benda lain",
    ];
  } else if (/(seller|sales|ejen|agent|dealer|affiliate|dropship|insurance|financial planner)/.test(audience)) {
    situations = [
      "bila hari-hari kena follow up orang, benda yang tak ada sistem memang cepat tercicir",
      "bila selalu kena explain benda sama, ayat yang simple biasanya lagi mudah sampai",
      "kejar target sambil layan banyak perangai orang memang ajar kita pilih benda penting",
      "kadang orang tak beli bukan sebab tak minat, dia cuma belum betul-betul faham",
    ];
  } else if (/(creator|designer|video editor|photographer|personal brand|social media|marketer)/.test(audience)) {
    situations = [
      "bila selalu kena fikir idea baru, kita mudah lupa idea lama pun belum habis test",
      "buat content sambil jaga kerja lain memang buat kita belajar pilih apa yang penting",
      "bila idea tak datang, benda yang boleh repeat tu lah paling banyak membantu",
      "nak konsisten bukan susah sebab tak ada idea, kadang sebab terlalu banyak idea",
    ];
  } else if (/(owner|founder|solopreneur|entrepreneur|vendor|baker|saas|b2b|gym|beauty|food)/.test(audience)) {
    situations = [
      "bila semua keputusan lalu dekat tangan sendiri, benda kecil pun boleh makan satu hari",
      "jaga sales sambil urus operasi memang buat fokus cepat pecah",
      "bila tengah urus banyak benda serentak, sistem yang simple lagi senang bertahan",
      "buat bisnes sendiri ni kadang bukan kerja yang berat, tapi terlalu banyak benda kecil",
    ];
  } else if (/(freelancer|consultant|coach|trainer|tutor|educator)/.test(audience)) {
    situations = [
      "bila buat kerja sendiri sambil jaga client, masa untuk benda sendiri selalu jadi baki",
      "deliver kerja sambil cari job seterusnya memang buat fokus senang lari",
      "bila calendar penuh dengan kerja client, benda kecil yang tersusun banyak membantu",
      "buat semua sendiri memang bebas, tapi semua benda pun tunggu tangan sendiri",
    ];
  } else {
    situations = [
      "bila tengah cari rentak sendiri, kita memang akan cuba banyak benda dulu",
      "kadang kita bukan tak tahu nak buat apa, cuma belum jumpa cara yang ngam",
      "bila hidup tengah banyak benda, progress kecil pun dah cukup bagi ruang bernafas",
      "tak semua orang bergerak dengan pace yang sama, dan itu normal",
    ];
  }

  return pick(situations, rng);
}

function audienceCue(value) {
  const audience = cleanText(value).toLowerCase();
  if (!audience) return "";
  if (/(startup|founder baru|fresh graduate|student)/.test(audience)) return "yang baru start";
  if (/(parent|ibu bekerja|bapa muda|suri rumah|working adult)/.test(audience)) return "yang selalu busy";
  if (/(seller|sales|ejen|agent|dealer|affiliate|dropship|insurance|financial planner)/.test(audience)) return "yang kejar target";
  if (/(creator|designer|video editor|photographer|personal brand|social media|marketer)/.test(audience)) return "yang cari idea";
  if (/(owner|founder|solopreneur|entrepreneur|vendor|baker|saas|b2b|gym|beauty|food)/.test(audience)) return "yang urus bisnes";
  if (/(freelancer|consultant|coach|trainer|tutor|educator)/.test(audience)) return "yang kerja sendiri";
  return "yang cari rentak";
}

function composeThreadsClauses({ family, topic, rng }) {
  const data = { topic, product: "" };
  const from = (name) => applyTemplate(pick(THREADS_CLAUSES[name], rng), data);
  if (family === "question") return [from("directQuestion")];
  if (family === "observation") return [from("crowdOpen"), from("realization")];
  if (family === "comparison") {
    return [
      `dulu bila bab ${topic}, aku ${pick(THREADS_CLAUSES.tension, rng)}`,
      `sekarang ${pick(THREADS_CLAUSES.softClose, rng)}`,
    ];
  }
  if (family === "story") return [from("personalOpen"), `masa buat benda ni, aku ${from("tension")}`, from("realization")];
  if (family === "opinion") return [from("personalOpen"), "benda ni tak perlu dibuat susah sangat", from("realization")];
  if (family === "insight") return [from("crowdOpen"), `ramai terus ${from("tension")}`, from("realization")];
  if (family === "recommendation") return [`kalau baru nak cuba ${topic}, buat satu cara dulu`, from("softClose")];
  if (family === "quote") return [from("reaction"), from("realization")];
  return [];
}

function applyMalaysiaThreadsStyle(text, { family, tone, rng }) {
  let output = String(text || "");
  const replacements = [
    [/\bsahaja\b/gi, "je", 0.8],
    [/\btidak\b/gi, "tak", 0.9],
    [/\bmahu\b/gi, "nak", 0.85],
    [/\bsudah\b/gi, "dah", 0.85],
    [/\bini\b/gi, "ni", 0.7],
    [/\bitulah\b/gi, "tu lah", 0.7],
  ];
  replacements.forEach(([pattern, replacement, chance]) => {
    if (rng() < chance) output = output.replace(pattern, replacement);
  });

  if (!["list", "story"].includes(family) && rng() < 0.58) {
    output = output.replace(/\n+/g, " ");
  }
  if (tone === "Funny" && family !== "question" && rng() < 0.35) {
    output = `${output.replace(/[.]+$/, "")}.\nkelakar juga bila fikir balik`;
  }
  if (rng() < 0.32 && !/[?]$/.test(output.trim())) {
    output = output.replace(/[.]+$/, "");
  } else if (rng() < 0.1 && !/[?]$/.test(output.trim())) {
    output = output.replace(/[.]+$/, "...");
  }
  if (rng() < 0.64 && !/^(?:[A-Z]{2,}|[A-Z0-9]{3,})\b/.test(output)) {
    output = output.charAt(0).toLowerCase() + output.slice(1);
  }
  output = output
    .replace(/\btiktok\b/gi, "TikTok")
    .replace(/\bfacebook\b/gi, "Facebook")
    .replace(/\bwfh\b/gi, "WFH")
    .replace(/\bsaas\b/gi, "SaaS")
    .replace(/\bb2b\b/gi, "B2B")
    .replace(/\bai(?=\s|$)/gi, "AI");
  return output;
}

function buildThreadsFeedLines({ family, topic, tone, audience, rng }) {
  const templates = THREADS_FEED_LINES[family] || THREADS_FEED_LINES.insight;
  const composed = rng() < 0.58 ? composeThreadsClauses({ family, topic, rng }) : [];
  const lines = (composed.length ? composed : pick(templates, rng))
    .map((line) => applyTemplate(line, { topic, product: "" }));
  const audienceLine = audienceSituation(audience, rng);
  const shortAudienceCue = audienceCue(audience);
  const shortAudienceLead = shortAudienceCue.replace(/^yang /, "kalau kau ");
  const tonePrefix = pick(TONE_PREFIX[tone] || TONE_PREFIX.Casual, rng);

  if (audienceLine) {
    if (family === "question") {
      lines[0] = `${shortAudienceCue}, ${lines[0].charAt(0).toLowerCase()}${lines[0].slice(1)}`;
    } else if (family === "quote") lines.push(`ni untuk ${shortAudienceCue}`);
    else if (["story", "insight", "recommendation"].includes(family)) {
      if (rng() < 0.55) lines[0] = `${lines[0]}. ${audienceLine}`;
      else lines.splice(Math.min(1, lines.length), 0, audienceLine);
    } else {
      lines.splice(Math.min(1, lines.length), 0, shortAudienceLead);
    }
  }
  if (
    tonePrefix
    && rng() < 0.18
    && !["quote", "list", "question"].includes(family)
    && !/^aku\b/i.test(lines[0])
  ) {
    lines[0] = `${tonePrefix}, ${lines[0]}`;
  }
  if (rng() < 0.08 && lines[0].length < 48 && family !== "quote") {
    lines[0] = lines[0].toUpperCase();
  }
  return lines.map((line) => sentence(line, /\?$/.test(line) ? "?" : "."));
}

function buildLines({ family, platform, product, topic, tone, audience, personalBackground, angleNote, profile, rng }) {
  if (platform === "threads_general") {
    return buildThreadsFeedLines({ family, topic, tone, audience, rng });
  }

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
    return rng() < 0.45 ? [quote, productLine] : [quote, middle, productLine];
  }
  if (family === "list") {
    const items = pick(LIST_ITEMS, rng);
    const list = items.map((item, index) => `${index + 1}. ${item}`).join("\n");
    return [sentence(opener), list, productLine];
  }
  if (family === "story") {
    const start = personal ? sentence(personal) : sentence(opener);
    return platform === "facebook"
      ? [start, middle, productLine, preferred]
      : [start, productLine, middle];
  }
  if (family === "opinion") {
    return [sentence(`${tonePrefix}, ${opener}`), productLine, middle];
  }
  if (family === "recommendation") {
    return [sentence(opener), productLine, middle];
  }
  return [sentence(opener), middle, productLine];
}

function expandPromoteLines(lines, { personalBackground, product, angleNote, rng }) {
  const first = lines[0];
  const personal = cleanText(personalBackground);
  const personalLine = personal && cleanText(first).toLowerCase() !== personal.toLowerCase()
    ? sentence(personal)
    : "";
  const productLower = cleanText(product).toLowerCase();
  const productLine = lines.find((line) => cleanText(line).toLowerCase().includes(productLower))
    || lines[lines.length - 1];
  const angle = cleanText(angleNote);
  return [
    first,
    personalLine,
    sentence(pick(LONG_PROMOTE_FLOW.context, rng)),
    sentence(pick(LONG_PROMOTE_FLOW.struggle, rng)),
    sentence(pick(LONG_PROMOTE_FLOW.shift, rng)),
    angle ? sentence(`benda yang buat aku berhenti dan tengok balik, ${angle}`) : "",
    sentence(pick(LONG_PROMOTE_FLOW.lesson, rng)),
    sentence(pick(LONG_PROMOTE_FLOW.present, rng)),
    productLine,
  ].filter(Boolean);
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
  const platform = options.platform || "threads_general";
  const baseSeed = String(options.seed || `${Date.now()}-${Math.random()}`);
  const seed = platform === "threads_general" ? baseSeed : `${baseSeed}:${platform}`;
  const rng = createRng(seed);
  const profile = normalizeVoiceProfile(options.voiceProfile);
  const product = cleanText(options.productName) || "produk ni";
  const topic = cleanText(options.topic) || cleanText(options.category) || "benda";
  const maxChars = platform === "threads_general" ? 500 : 1800;
  const link = platform === "threads_general" ? "" : String(options.link || "").trim();
  const history = Array.isArray(options.history) ? options.history : [];

  for (let attempt = 0; attempt < 80; attempt += 1) {
    const threadsGeneral = platform === "threads_general";
    const family = selectFamily({
      rng,
      history,
      forcedFamily: options.forcedFamily,
      mix: threadsGeneral ? THREADS_CONTENT_MIX : CONTENT_MIX,
      order: threadsGeneral ? THREADS_FAMILY_ORDER : FAMILY_ORDER,
    });
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
      lines = expandPromoteLines(lines, {
        personalBackground: options.personalBackground || "",
        product,
        angleNote: options.angleNote || "",
        rng,
      });
      const question = pick(ENDINGS.promote, rng);
      if (question) lines.push(sentence(question, "?"));
    }
    lines = lines.filter(Boolean);
    let text = applyVoice(lines.join(platform === "threads_general" ? "\n" : "\n\n"), profile);
    if (threadsGeneral) text = applyMalaysiaThreadsStyle(text, { family, tone: options.tone || "Casual", rng });
    if (link) text = `${trimTo(text, maxChars - link.length - 16)}\n\nklik sini, ${link}`;
    text = trimTo(text, maxChars);
    if (!validateGenerated(text, { maxChars, profile, link, history })) continue;
    return {
      postText: text,
      seed,
      patternFamily: family,
      patternId: `${family}-${hashNumber(`${seed}:${attempt}`) % 1000}`,
      openingId: threadsGeneral
        ? `threads-${family}-${hashNumber(lines[0]) % 1000}`
        : `${family}-${OPENERS[family].indexOf(applyTemplate(OPENERS[family].find((item) => applyTemplate(item, { product, topic }) === cleanText(lines[0]).replace(/[.!?]+$/, "")) || "", { product, topic }))}`,
      lengthBucket: text.length < 150 ? "short" : text.length < 300 ? "medium" : "long",
      paragraphShape: structuralFingerprint(text),
      textHash: textHash(text),
      semanticFingerprint: [...shingles(text)].slice(0, 12).join("|"),
    };
  }

  const fallback = platform === "threads_general"
    ? `${topic} tak perlu tunggu semua ready.\nmula dekat benda paling senang dulu.`
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
  THREADS_CONTENT_MIX,
  THREADS_FAMILY_ORDER,
  familyDeck,
  generateAdaptivePost,
  normalizeVoiceProfile,
  semanticSimilarity,
  structuralFingerprint,
  textHash,
  threadsFamilyDeck,
};
