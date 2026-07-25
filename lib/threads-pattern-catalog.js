const PATTERN_FORMS = Object.freeze([
  { id: "micro-thought", label: "Micro thought", group: "Micro", rhythmId: "micro-1", lengthBucket: "micro", family: "opinion" },
  { id: "micro-quote", label: "Micro quote", group: "Micro", rhythmId: "micro-2", lengthBucket: "micro", family: "quote" },
  { id: "micro-fragment", label: "Micro fragment", group: "Micro", rhythmId: "micro-3", lengthBucket: "micro", family: "observation" },
  { id: "direct-question", label: "Direct question", group: "Short", rhythmId: "short-1", lengthBucket: "short", family: "question" },
  { id: "random-observation", label: "Random observation", group: "Short", rhythmId: "short-2", lengthBucket: "short", family: "observation" },
  { id: "before-after", label: "Before and after", group: "Short", rhythmId: "short-3", lengthBucket: "short", family: "comparison" },
  { id: "tiny-dialogue", label: "Tiny dialogue", group: "Short", rhythmId: "short-4", lengthBucket: "short", family: "dialogue" },
  { id: "hanging-thought", label: "Hanging thought", group: "Short", rhythmId: "short-5", lengthBucket: "short", family: "hanging" },
  { id: "honest-confession", label: "Honest confession", group: "Medium", rhythmId: "medium-1", lengthBucket: "medium", family: "confession" },
  { id: "mini-rant", label: "Mini rant", group: "Medium", rhythmId: "medium-2", lengthBucket: "medium", family: "rant" },
  { id: "three-part-list", label: "Three-part list", group: "Medium", rhythmId: "medium-3", lengthBucket: "medium", family: "list" },
  { id: "point-of-view", label: "Point of view", group: "Medium", rhythmId: "medium-4", lengthBucket: "medium", family: "pov" },
  { id: "soft-recommendation", label: "Soft recommendation", group: "Medium", rhythmId: "medium-5", lengthBucket: "medium", family: "recommendation" },
  { id: "short-story", label: "Short story", group: "Long", rhythmId: "long-1", lengthBucket: "long", family: "story" },
  { id: "local-story", label: "Local Malaysian story", group: "Long", rhythmId: "long-2", lengthBucket: "long", family: "story" },
]);

const PATTERN_ANGLES = Object.freeze([
  {
    id: "clarity",
    label: "Clarity",
    hook: "bila {topic} dah jelas, kepala pun kurang serabut",
    tension: "ramai sangkut sebab benda pertama pun belum betul-betul jelas",
    turn: "kadang kita bukan perlukan idea baru, cuma arah yang lebih terang",
  },
  {
    id: "consistency",
    label: "Consistency",
    hook: "{topic} yang dibuat selalu nampak biasa, tapi dekat situ result mula terkumpul",
    tension: "kita cepat tukar cara sebelum cara lama sempat tunjuk apa-apa",
    turn: "yang boring tapi boleh ulang selalunya tahan lebih lama",
  },
  {
    id: "simplicity",
    label: "Simplicity",
    hook: "lagi simple {topic}, lagi senang nak buat sekali lagi",
    tension: "bila semua benda nak masuk, langkah pertama terus jadi berat",
    turn: "buang satu benda kadang lagi membantu daripada tambah tiga benda",
  },
  {
    id: "patience",
    label: "Patience",
    hook: "ada benda dalam {topic} yang memang tak boleh dipaksa laju",
    tension: "kita selalu ukur terlalu awal, lepas tu terus rasa cara tu tak jalan",
    turn: "bagi benda yang betul masa sikit sebelum buat keputusan",
  },
  {
    id: "focus",
    label: "Focus",
    hook: "{topic} nampak susah bila perhatian pecah dekat terlalu banyak benda",
    tension: "sibuk bergerak tak semestinya benda penting sedang siap",
    turn: "satu target yang jelas boleh tenangkan satu hari",
  },
  {
    id: "momentum",
    label: "Momentum",
    hook: "progress kecil dalam {topic} selalu nampak remeh sampai momentum dah terbina",
    tension: "tunggu rasa bersemangat dulu memang buat mula tu makin jauh",
    turn: "gerak sikit dulu, mood selalunya ikut belakang",
  },
  {
    id: "trust",
    label: "Trust",
    hook: "{topic} jadi lebih mudah bila orang dah cukup percaya",
    tension: "ayat besar cepat tarik perhatian, tapi trust dibina dekat benda kecil",
    turn: "orang tengok apa yang kita ulang, bukan apa yang kita claim sekali",
  },
  {
    id: "timing",
    label: "Timing",
    hook: "benda betul dalam {topic} pun boleh tak menjadi kalau timing tak kena",
    tension: "kadang kita salahkan idea sedangkan masa dan konteks belum sesuai",
    turn: "bukan semua benda lambat tu gagal",
  },
  {
    id: "effort",
    label: "Effort",
    hook: "{topic} jarang gagal sebab satu usaha besar, selalunya sebab usaha kecil terhenti",
    tension: "kita suka nampak hasil, tapi bahagian mengulang tu yang paling senyap",
    turn: "usaha yang boleh dijaga lagi berguna daripada semangat yang datang sekali",
  },
  {
    id: "boundaries",
    label: "Boundaries",
    hook: "kadang {topic} perlukan had, bukan lebih banyak pilihan",
    tension: "bila semua benda dibenarkan masuk, fokus memang cepat hilang",
    turn: "cakap tidak dekat satu benda boleh selamatkan benda yang lebih penting",
  },
  {
    id: "feedback",
    label: "Feedback",
    hook: "{topic} jadi nyata bila kita mula tengok feedback, bukan andaian",
    tension: "kita boleh fikir lama, tapi satu respon sebenar selalu bagi lebih banyak jawapan",
    turn: "buat kecil, tengok reaksi, baru kemaskan",
  },
  {
    id: "courage",
    label: "Courage",
    hook: "berani dalam {topic} bukan tak takut, cuma tetap buat walaupun belum yakin",
    tension: "ramai tunggu confidence datang sebelum bergerak",
    turn: "kadang confidence muncul lepas kita nampak diri sendiri boleh buat",
  },
  {
    id: "pressure",
    label: "Pressure",
    hook: "{topic} terasa lain bila kita buat sebab mahu, bukan sebab tertekan",
    tension: "bila semua benda jadi urgent, otak susah beza penting dengan bising",
    turn: "kurangkan tekanan dulu, baru keputusan nampak lebih waras",
  },
  {
    id: "expectations",
    label: "Expectations",
    hook: "expectation yang terlalu tinggi boleh buat {topic} nampak gagal terlalu awal",
    tension: "kita banding langkah pertama sendiri dengan hasil akhir orang",
    turn: "ukur ikut tempat kita berdiri, bukan tempat orang dah sampai",
  },
  {
    id: "tradeoff",
    label: "Trade-off",
    hook: "setiap pilihan dalam {topic} datang dengan benda yang kita kena lepaskan",
    tension: "nak semua sekali biasanya buat satu pun tak betul-betul menjadi",
    turn: "pilih apa yang penting untuk fasa sekarang",
  },
  {
    id: "learning",
    label: "Learning",
    hook: "part paling berguna dalam {topic} selalunya datang daripada benda yang tak menjadi",
    tension: "kita malu dekat silap yang sebenarnya sedang ajar banyak benda",
    turn: "silap kecil yang diperiksa lebih bernilai daripada teori yang tak pernah diuji",
  },
  {
    id: "recovery",
    label: "Recovery",
    hook: "berhenti sekejap dalam {topic} tak bermaksud kena mula dari kosong",
    tension: "bila rentak hilang, kita rasa semua progress lama dah tak berguna",
    turn: "sambung dekat benda paling mudah dulu",
  },
  {
    id: "identity",
    label: "Identity",
    hook: "cara kita tengok diri sendiri banyak ubah cara kita buat {topic}",
    tension: "bila satu hasil tak menjadi, kita cepat anggap diri memang tak pandai",
    turn: "result tu feedback, bukan identiti",
  },
  {
    id: "attention",
    label: "Attention",
    hook: "apa yang selalu kita tengok akhirnya membentuk cara kita fikir tentang {topic}",
    tension: "terlalu banyak input buat suara sendiri makin susah nak dengar",
    turn: "kadang kena berhenti scroll untuk nampak apa yang kita sendiri percaya",
  },
  {
    id: "reality",
    label: "Reality",
    hook: "{topic} dekat feed nampak kemas, dekat hidup sebenar banyak trial and error",
    tension: "kita nampak post yang menjadi, bukan semua cubaan sebelum tu",
    turn: "real progress memang jarang nampak cantik sepanjang masa",
  },
]);

const THREADS_PATTERN_CATALOG = Object.freeze(
  PATTERN_FORMS.flatMap((form) => PATTERN_ANGLES.map((angle) => Object.freeze({
    id: `${form.id}-${angle.id}`,
    label: `${form.label} · ${angle.label}`,
    group: form.group,
    family: form.family,
    formId: form.id,
    angleId: angle.id,
    rhythmId: form.rhythmId,
    lengthBucket: form.lengthBucket,
    hook: angle.hook,
    tension: angle.tension,
    turn: angle.turn,
  })))
);

function getThreadsPattern(patternId) {
  return THREADS_PATTERN_CATALOG.find((pattern) => pattern.id === patternId) || null;
}

module.exports = {
  PATTERN_ANGLES,
  PATTERN_FORMS,
  THREADS_PATTERN_CATALOG,
  getThreadsPattern,
};
