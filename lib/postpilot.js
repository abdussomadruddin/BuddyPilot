const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_MB || 20) * 1024 * 1024;

function parseContentDisposition(header) {
  const result = {};
  for (const part of String(header || "").split(";")) {
    const [rawKey, ...rawValue] = part.trim().split("=");
    if (!rawValue.length) continue;
    const key = rawKey.trim().toLowerCase();
    let value = rawValue.join("=").trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    result[key] = value;
  }
  return result;
}

async function readRequestBody(req) {
  const chunks = [];
  let total = 0;

  for await (const chunk of req) {
    total += chunk.length;
    if (total > MAX_UPLOAD_BYTES) {
      throw new Error(`Upload terlalu besar. Limit ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB.`);
    }
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

function parseMultipart(req, body) {
  const contentType = req.headers["content-type"] || "";
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  if (!boundaryMatch) throw new Error("Invalid multipart form.");

  const boundary = Buffer.from(`--${boundaryMatch[1] || boundaryMatch[2]}`);
  const values = {};
  const files = {};
  let start = body.indexOf(boundary);

  while (start !== -1) {
    start += boundary.length;
    if (body.slice(start, start + 2).toString() === "--") break;
    if (body.slice(start, start + 2).toString() === "\r\n") start += 2;

    const headerEnd = body.indexOf(Buffer.from("\r\n\r\n"), start);
    if (headerEnd === -1) break;
    const headersRaw = body.slice(start, headerEnd).toString("utf8");
    const dataStart = headerEnd + 4;
    let next = body.indexOf(boundary, dataStart);
    if (next === -1) break;
    let dataEnd = next;
    if (body.slice(dataEnd - 2, dataEnd).toString() === "\r\n") dataEnd -= 2;

    const headers = {};
    for (const line of headersRaw.split("\r\n")) {
      const idx = line.indexOf(":");
      if (idx !== -1) headers[line.slice(0, idx).toLowerCase()] = line.slice(idx + 1).trim();
    }

    const disposition = parseContentDisposition(headers["content-disposition"]);
    if (disposition.name) {
      const data = body.slice(dataStart, dataEnd);
      if (disposition.filename) {
        files[disposition.name] = {
          filename: disposition.filename,
          contentType: headers["content-type"] || "application/octet-stream",
          data,
        };
      } else {
        values[disposition.name] = data.toString("utf8");
      }
    }

    start = next;
  }

  return { values, files };
}

async function readJsonBody(req) {
  const body = await readRequestBody(req);
  if (!body.length) return {};
  return JSON.parse(body.toString("utf8"));
}

function inferMediaType(fileName, contentType) {
  const lowerName = String(fileName || "").toLowerCase();
  if (String(contentType || "").startsWith("image/") || /\.(jpg|jpeg|png|webp|gif)$/.test(lowerName)) return "image";
  if (String(contentType || "").startsWith("video/") || /\.(mp4|mov|m4v|webm)$/.test(lowerName)) return "video";
  return "unsupported";
}

function validateUrl(raw) {
  const value = String(raw || "").trim();
  const parsed = new URL(value);
  if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("Salespage link mesti URL http/https.");
  return parsed.toString();
}

function cleanText(value) {
  return String(value || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;|&apos;/gi, "'")
    .replace(/&mdash;/gi, "—")
    .replace(/&ndash;/gi, "–")
    .replace(/&rsquo;/gi, "'")
    .replace(/&lsquo;/gi, "'")
    .replace(/&rdquo;/gi, '"')
    .replace(/&ldquo;/gi, '"')
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/Redirecting to https?:\/\/\S+/gi, " ")
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

function findClientRedirect(html, baseUrl) {
  const rawTarget = pickMatch(html, /window\.location(?:\.href)?\s*=\s*["']([^"']+)["']/i)
    || pickMatch(html, /<meta[^>]+http-equiv=["']refresh["'][^>]+content=["'][^"']*url=([^"']+)["'][^>]*>/i);
  if (!rawTarget) return "";
  try {
    return new URL(rawTarget, baseUrl).toString();
  } catch {
    return "";
  }
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "BuddyPilot/1.0 (+https://post-pilot-taupe.vercel.app)",
      accept: "text/html,application/xhtml+xml",
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return {
    finalUrl: response.url || url,
    html: await response.text(),
  };
}

async function fetchSalespageContext(salespageLink) {
  try {
    let { finalUrl, html } = await fetchHtml(salespageLink);
    const clientRedirect = findClientRedirect(html, finalUrl);
    if (clientRedirect && clientRedirect !== finalUrl) {
      const redirected = await fetchHtml(clientRedirect);
      finalUrl = redirected.finalUrl;
      html = redirected.html;
    }

    const title = pickMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
    const description = pickMeta(html, "description") || pickMeta(html, "og:description") || pickMeta(html, "twitter:description");
    const ogTitle = pickMeta(html, "og:title") || pickMeta(html, "twitter:title");
    const headings = [...html.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi)]
      .map((match) => cleanText(match[1]))
      .filter(Boolean)
      .slice(0, 8);
    const bodySnippet = cleanText(html)
      .replace(/\b(function|window|document|script|noscript|iframe|PageView|TiktokAnalyticsObject)\b/gi, " ")
      .replace(/\s+/g, " ")
      .slice(0, 900);

    return {
      ok: true,
      finalUrl,
      productName: ogTitle || title || "produk ini",
      title,
      description,
      headings,
      bodySnippet,
    };
  } catch (error) {
    return {
      ok: false,
      productName: "produk ini",
      error: error?.message || String(error),
    };
  }
}

function summarizeContext(context) {
  const headings = (context.headings || [])
    .filter(Boolean)
    .slice(0, 4);
  const parts = [
    context.description,
    ...headings,
  ].filter(Boolean);

  const summary = parts.join(" ");
  return (summary || context.bodySnippet || "").slice(0, 520);
}

const HOOK_VARIANTS = [
  "trust me.",
  "aku rasa ramai belum nampak benda ni.",
  "ini bukan sekadar pasal produk.",
  "kalau kau serius nak bergerak, baca ni dulu.",
  "aku tak mudah impressed dengan claim besar.",
  "kadang-kadang timing lagi mahal daripada idea.",
  "aku tengok benda ni dari angle yang sikit lain.",
  "jangan tengok benda ni pada permukaan sahaja.",
  "game sekarang dah berubah.",
  "ini yang ramai orang selalu undervalue.",
  "benda ni nampak simple, tapi effect dia besar.",
  "aku nak cakap benda ni straight.",
  "ramai orang stuck bukan sebab tak ada peluang.",
  "kalau kau nampak benda ni awal, kau ada advantage.",
  "aku rasa ini bukan masa untuk tunggu sempurna.",
  "ada beza antara tahu peluang dengan faham peluang.",
  "ini antara benda yang ramai orang lambat sedar.",
  "kalau tengok sekali lalu, memang nampak biasa.",
  "aku suka offer yang ada logic macam ni.",
  "jangan underestimate benda yang nampak kecil.",
  "market tak tunggu orang yang masih blur.",
  "benda paling mahal sekarang ialah kejelasan.",
  "aku bukan nak hypekan benda ni.",
  "kalau kau pernah rasa stuck, point ni penting.",
  "ini bukan ayat motivasi kosong.",
  "aku tengok benda ni sebagai leverage.",
  "ramai orang cari produk, tapi lupa strategy.",
  "kalau semua orang boleh mula, siapa yang akan menang?",
  "ini soalan yang ramai tak tanya.",
  "aku rasa timing offer ni menarik.",
  "bukan semua peluang patut dikejar, tapi yang ni patut difahami.",
  "kalau kau masih tunggu masa sesuai, baca ni.",
  "ini bukan tentang cepat kaya.",
  "ini tentang cara fikir yang betul.",
  "ramai orang nampak result, tapi tak nampak process.",
  "aku lebih tertarik pada mechanism daripada headline.",
  "kalau offer tak ada strategy, susah nak sustain.",
  "aku rasa ramai akan salah baca benda ni.",
  "ini bukan sekadar nak mula.",
  "ini tentang masuk market dengan kepala yang betul.",
  "kalau kau nak compete, jangan masuk kosong.",
  "ada sebab kenapa offer macam ni boleh jalan.",
  "aku nak highlight satu benda yang penting.",
  "ramai orang terlalu fokus pada tools.",
  "tools bukan masalah paling besar sekarang.",
  "masalah sebenar biasanya lebih dalam.",
  "kalau kau faham angle ni, kau akan nampak lain.",
  "aku rasa ini peluang untuk orang yang cepat belajar.",
  "benda ni bukan untuk orang yang cuma nak scroll.",
  "ini untuk orang yang nak faham game.",
  "aku pernah tengok pattern macam ni sebelum ni.",
  "bila market berubah, cara main pun kena berubah.",
  "orang yang lambat adjust biasanya rasa semua benda susah.",
  "kalau kau fikir market dah tepu, mungkin kau tengok angle salah.",
  "aku bukan tengok offer ni dari permukaan.",
  "ada hidden value dekat sini.",
  "kalau kau pandang benda ni sebagai strategy, ia jadi lain.",
  "ini bukan sekadar beli dan berharap.",
  "ini tentang faham jalan sebelum jalan.",
  "ramai orang nak shortcut, tapi lupa framework.",
  "framework lebih mahal daripada tips.",
  "kalau kau hanya cari tips, kau akan cepat penat.",
  "aku suka benda yang boleh susun kepala.",
  "bila kepala jelas, action jadi lain.",
  "ini point yang ramai orang skip.",
  "jangan masuk market hanya sebab orang lain masuk.",
  "masuk sebab kau faham kenapa ia masuk akal.",
  "kalau kau masih ragu-ragu, itu normal.",
  "ragu-ragu hilang bila logic jadi jelas.",
  "aku nak kau tengok benda ni dari sudut buyer.",
  "buyer tak bergerak sebab CTA semata-mata.",
  "buyer bergerak bila belief dia cukup.",
  "kalau offer boleh bina belief, itu kuat.",
  "ini bukan soal siapa paling kuat menjual.",
  "ini soal siapa paling jelas explain value.",
  "ramai orang gagal bukan sebab produk lemah.",
  "ramai orang gagal sebab positioning kabur.",
  "kalau positioning jelas, offer nampak lain.",
  "aku rasa ini antara angle yang patut diuji.",
  "copywriting yang kuat bermula sebelum ayat ditulis.",
  "ia bermula dari cara kita baca market.",
  "kalau baca market salah, copy pun lari.",
  "ini sebab aku tak suka copy yang generic.",
  "generic copy tak cukup dalam market sekarang.",
  "orang perlukan reason yang lebih kuat untuk percaya.",
  "offer yang bagus perlu buat orang rasa faham.",
  "faham dulu, baru trust.",
  "trust dulu, baru tindakan.",
  "itu sequence yang ramai orang terbalikkan.",
  "jangan terus jual sebelum bina konteks.",
  "konteks yang betul boleh ubah cara orang menilai offer.",
  "aku tengok benda ni sebagai konteks baru.",
  "kalau context kena, CTA jadi lebih natural.",
  "ini bukan magic, ini structure.",
  "structure yang betul boleh buat offer lebih senang hadam.",
  "kalau orang faham cepat, decision jadi cepat.",
  "kalau orang blur, dia tangguh.",
  "sebab tu clarity selalu menang.",
  "dan clarity inilah yang ramai orang masih kurang.",
  "aku rasa angle ni boleh jadi strong.",
];

const OPENING_CONTEXTS = [
  {
    label: "trust-me",
    question: "kenapa aku cakap macam tu?",
    skepticism: ["bukan sebab hype.", "bukan sebab nama."],
  },
  {
    label: "ramai-belum-nampak",
    question: "apa benda yang ramai tak nampak?",
    skepticism: ["bukan sebab orang tak pandai.", "bukan sebab market dah mati."],
  },
  {
    label: "bukan-sekadar-produk",
    question: "kenapa aku cakap macam ni?",
    skepticism: ["bukan sebab produk nampak menarik sahaja.", "bukan sebab ayat salespage dia sedap baca."],
  },
  {
    label: "serius-nak-bergerak",
    question: "aku bukan tulis ni untuk orang yang cuma suka scroll.",
    skepticism: ["bukan sebab nak bagi kau rasa semangat sekejap.", "bukan sebab nak tambah satu lagi benda dalam wishlist."],
  },
  {
    label: "claim-besar",
    question: "claim besar memang senang tulis.",
    skepticism: ["bukan sebab nombor besar terus jadi benar.", "bukan sebab headline nampak power."],
  },
  {
    label: "timing-mahal",
    question: "idea yang sama boleh jadi biasa kalau timing salah.",
    skepticism: ["bukan sebab semua benda kena kejar cepat.", "bukan sebab takut tertinggal semata-mata."],
  },
  {
    label: "aku-tengok-lain",
    question: "ramai tengok offer, aku tengok game di belakang offer.",
    skepticism: ["bukan sebab packaging dia.", "bukan sebab orang lain sedang bercakap pasal benda ni."],
  },
  {
    label: "jangan-tengok-permukaan",
    question: "kalau tengok permukaan, semua offer nampak lebih kurang sama.",
    skepticism: ["bukan sebab poster dia.", "bukan sebab promise dia sahaja."],
  },
  {
    label: "game-berubah",
    question: "yang lambat faham benda ni biasanya akan rasa market makin susah.",
    skepticism: ["bukan sebab orang tak ada peluang.", "bukan sebab semua niche dah tepu."],
  },
  {
    label: "ini-yang-mahal",
    question: "orang nampak produk, tapi tak nampak leverage.",
    skepticism: ["bukan sebab nak kumpul ilmu lagi.", "bukan sebab nak beli benda baru semata-mata."],
  },
];

const ANGLE_LENSES = [
  {
    label: "strategic-opinion",
    lineKey: "market",
    thesisPrefix: "pada pandangan aku",
    transition: "aku rasa ramai masih belum faham apa yang sedang berlaku sekarang.",
    positiveQuestion: "jadi benda ni bagus ke?",
    positiveAnswer: ["jawapan aku...", "bagus."],
    condition: "tapi dengan satu syarat.",
    conditionValue: "kena ada strategi.",
    lossLine: "kalau tak ada strategi, lagi banyak effort yang dibuat, lagi banyak masa dan duit boleh bocor dekat tempat yang salah.",
    valueLead: "pada aku, benda paling mahal bukan sekadar template.",
    valuePoint: "tapi cara berfikir.",
    ending: ["sebab tools akan berubah.", "AI akan berubah.", "platform akan berubah.", "", "tapi cara berfikir yang betul akan kekal lama."],
  },
  {
    label: "market-shift",
    lineKey: "marketShift",
    thesisPrefix: "pada bacaan aku",
    transition: "market sedang bergerak lebih laju daripada yang ramai orang sangka.",
    positiveQuestion: "perubahan ni bahaya ke?",
    positiveAnswer: ["bahaya kalau tak bersedia.", "tapi peluang besar kalau tahu main game dia."],
    condition: "syarat dia satu.",
    conditionValue: "kena faham arah market sebelum masuk.",
    lossLine: "kalau masuk tanpa faham arah, kita cuma jadi orang yang buat bising dalam market yang makin sesak.",
    valueLead: "benda yang mahal sekarang bukan sekadar tahu produk apa nak promote.",
    valuePoint: "tapi tahu kenapa market patut peduli.",
    ending: ["offer boleh berubah.", "platform boleh berubah.", "trend boleh berubah.", "", "tapi orang yang faham pergerakan market akan lebih cepat adjust."],
  },
  {
    label: "hidden-cost",
    lineKey: "hiddenCost",
    thesisPrefix: "pada aku",
    transition: "kos yang paling ramai orang tak kira ialah kos tertangguh.",
    positiveQuestion: "nampak kecil ke?",
    positiveAnswer: ["memang nampak kecil.", "sampai kita kira balik berapa banyak peluang yang dah lepas."],
    condition: "sebab tu aku tengok benda ni dari sudut lain.",
    conditionValue: "bukan sekadar beli produk, tapi beli kejelasan.",
    lossLine: "kalau tak ada kejelasan, orang boleh habiskan masa berbulan-bulan buat benda yang nampak sibuk tapi tak bergerak.",
    valueLead: "yang mahal bukan semata-mata info.",
    valuePoint: "yang mahal ialah shortcut untuk faham apa yang patut dibuat dan apa yang patut dielakkan.",
    ending: ["masa akan jalan juga.", "market akan makin bising juga.", "orang lain akan launch juga.", "", "soalan dia, kita nak terus tunggu atau mula faham game dengan lebih jelas?"],
  },
  {
    label: "direct-strategy",
    lineKey: "market",
    thesisPrefix: "secara jujur",
    transition: "ada beza antara orang yang cari motivasi dengan orang yang cari strategi.",
    positiveQuestion: "kau nak rasa semangat atau nak ada plan?",
    positiveAnswer: ["dua-dua penting.", "tapi semangat tanpa plan biasanya mati cepat."],
    condition: "kalau nak bergerak, kena tahu susunan.",
    conditionValue: "apa nak buat dulu, apa jangan buat dulu, dan apa yang patut difokuskan.",
    lossLine: "tanpa susunan, orang mudah lompat dari satu idea ke idea lain sampai tak ada satu pun yang betul-betul jalan.",
    valueLead: "yang aku cari dalam satu offer bukan sekadar apa yang dia bagi.",
    valuePoint: "aku cari sama ada dia boleh bantu orang fikir dan bergerak dengan lebih tersusun.",
    ending: ["sebab orang yang ada plan lebih susah panik.", "lebih cepat adjust.", "lebih jelas bila nak teruskan dan bila nak berhenti.", "", "itu beza besar."],
  },
  {
    label: "proof-mechanism",
    lineKey: "proof",
    thesisPrefix: "kalau tengok dari sudut mekanisme",
    transition: "yang aku tengok bukan sekadar nombor atau headline.",
    positiveQuestion: "apa yang aku tengok?",
    positiveAnswer: ["aku tengok mekanisme.", "aku tengok logic di belakang offer."],
    condition: "kalau mekanisme dia masuk akal, baru claim itu ada konteks.",
    conditionValue: "sebab orang bukan perlukan janji kosong, orang perlukan jalan yang boleh difahami.",
    lossLine: "tanpa mekanisme yang jelas, claim besar cuma jadi ayat sedap baca tapi susah nak percaya.",
    valueLead: "benda yang buat satu offer kuat bukan sekadar result.",
    valuePoint: "tapi penjelasan kenapa result itu boleh berlaku dan macam mana orang lain boleh ikut secara realistik.",
    ending: ["result boleh tarik perhatian.", "tapi mekanisme yang buat orang stay.", "", "dan kalau mekanisme itu jelas, baru orang boleh buat keputusan dengan lebih waras."],
  },
  {
    label: "timing-window",
    lineKey: "timing",
    thesisPrefix: "pada timing sekarang",
    transition: "ramai orang sedang cari cara yang lebih cepat, lebih ringan, dan lebih jelas untuk mula.",
    positiveQuestion: "itu peluang atau noise?",
    positiveAnswer: ["dua-dua.", "bergantung pada siapa yang masuk dengan strategi."],
    condition: "kalau masuk waktu market sedang panas, jangan masuk kosong.",
    conditionValue: "kena ada offer, positioning dan cara explain yang orang boleh faham cepat.",
    lossLine: "kalau lambat sangat, orang lain dah capture attention, trust dan momentum dulu.",
    valueLead: "nilai sebenar bukan semata-mata pada produk.",
    valuePoint: "nilai sebenar ada pada timing, positioning dan keberanian untuk execute waktu market sedang bergerak.",
    ending: ["momentum bukan datang hari-hari.", "bila datang, orang yang ready akan nampak macam laju.", "", "padahal dia cuma bergerak waktu orang lain masih fikir nak mula atau tidak."],
  },
  {
    label: "competition-gap",
    lineKey: "competition",
    thesisPrefix: "kalau tengok dari sudut competition",
    transition: "bila lebih ramai orang boleh masuk market, beza kecil boleh jadi sangat mahal.",
    positiveQuestion: "market makin sesak tu masalah ke?",
    positiveAnswer: ["masalah kalau kita masuk tanpa beza.", "peluang kalau kita tahu susun angle dan trust."],
    condition: "dalam market sesak, orang tak menang sebab paling kuat menjerit.",
    conditionValue: "orang menang bila mesej dia paling jelas dan paling kena dengan masalah prospek.",
    lossLine: "kalau mesej kabur, prospek boleh faham offer kita tapi beli dengan orang lain.",
    valueLead: "yang mahal bukan sekadar produk apa yang dijual.",
    valuePoint: "yang mahal ialah cara produk itu diposisikan dalam kepala prospek.",
    ending: ["competition akan sentiasa ada.", "tapi positioning yang jelas boleh buat offer nampak berbeza.", "", "itu game yang ramai orang belum main betul-betul."],
  },
  {
    label: "simplicity-leverage",
    lineKey: "simplicity",
    thesisPrefix: "dari sudut simplicity",
    transition: "kadang-kadang yang buat orang stuck bukan benda susah, tapi terlalu banyak pilihan.",
    positiveQuestion: "simple tu cukup ke?",
    positiveAnswer: ["simple bukan bermaksud cetek.", "simple bermaksud senang nampak next step."],
    condition: "kalau satu offer boleh buat langkah seterusnya nampak jelas, itu advantage.",
    conditionValue: "sebab orang yang jelas lebih cepat bertindak.",
    lossLine: "bila semuanya nampak rumit, orang biasanya tangguh walaupun dia sebenarnya berminat.",
    valueLead: "yang mahal bukan semata-mata jumlah modul atau panjang content.",
    valuePoint: "yang mahal ialah kejelasan yang buat orang tahu apa perlu dibuat selepas ini.",
    ending: ["ramai orang bukan perlukan lebih banyak noise.", "ramai orang perlukan susunan yang boleh diikuti.", "", "itu beza antara tahu dan bergerak."],
  },
  {
    label: "belief-gap",
    lineKey: "belief",
    thesisPrefix: "kalau tengok dari sudut belief",
    transition: "ramai orang bukan tak nak beli atau tak nak mula, dia belum cukup percaya.",
    positiveQuestion: "percaya pada siapa?",
    positiveAnswer: ["percaya pada offer.", "dan paling penting, percaya dia boleh ikut jalan itu."],
    condition: "sebab tu copywriting tak boleh sekadar tekan CTA.",
    conditionValue: "kena bina belief sebelum minta orang buat keputusan.",
    lossLine: "kalau belief tak siap, CTA paling kuat pun akan rasa macam tekanan.",
    valueLead: "yang mahal bukan sekadar ayat menjual.",
    valuePoint: "yang mahal ialah ability untuk ubah ragu-ragu jadi rasa mungkin boleh buat.",
    ending: ["orang beli bila dia nampak value.", "tapi orang bertindak bila dia rasa jalan itu logik untuk dirinya.", "", "dekat situ belief main peranan."],
  },
  {
    label: "execution-gap",
    lineKey: "execution",
    thesisPrefix: "dari sudut execution",
    transition: "ramai orang dah tahu apa yang patut dibuat, tapi masih tak buat.",
    positiveQuestion: "kenapa?",
    positiveAnswer: ["sebab tahu tak sama dengan boleh execute.", "dan faham tak sama dengan ada momentum."],
    condition: "offer yang bagus patut kecilkan gap antara tahu dan buat.",
    conditionValue: "bukan sekadar tambah ilmu, tapi bantu orang bergerak.",
    lossLine: "kalau execution tak jalan, ilmu banyak pun akhirnya jadi simpanan sahaja.",
    valueLead: "yang mahal bukan hanya content.",
    valuePoint: "yang mahal ialah sistem yang tolak orang daripada faham kepada tindakan.",
    ending: ["ramai orang kalah bukan sebab tak cukup idea.", "ramai orang kalah sebab tak execute cukup lama dan cukup jelas.", "", "jadi angle execution ni penting."],
  },
];

const CONCEPT_PERSPECTIVES = [
  {
    label: "operator",
    transitionPrefix: "kalau tengok sebagai operator,",
    conditionPrefix: "dari sudut execution sebenar,",
    valueLeadPrefix: "untuk orang yang nak buat benda ni secara praktikal,",
    endingPrefix: "operator tak boleh fikir cantik sahaja.",
  },
  {
    label: "strategist",
    transitionPrefix: "kalau tengok sebagai strategist,",
    conditionPrefix: "dari sudut strategy,",
    valueLeadPrefix: "untuk orang yang fikir jangka panjang,",
    endingPrefix: "strategist tak kejar noise semata-mata.",
  },
  {
    label: "buyer-psychology",
    transitionPrefix: "kalau tengok dari psikologi buyer,",
    conditionPrefix: "dari sudut belief dan trust,",
    valueLeadPrefix: "untuk prospek yang masih ragu-ragu,",
    endingPrefix: "buyer bukan bergerak sebab kita suruh.",
  },
  {
    label: "market-timing",
    transitionPrefix: "kalau tengok ikut timing market,",
    conditionPrefix: "dari sudut momentum,",
    valueLeadPrefix: "untuk orang yang tak nak tunggu market terlalu sesak,",
    endingPrefix: "timing tak tunggu kita ready.",
  },
  {
    label: "risk-control",
    transitionPrefix: "kalau tengok dari sudut risiko,",
    conditionPrefix: "dari sudut kawal rugi,",
    valueLeadPrefix: "untuk orang yang tak nak buang masa dan budget ikut rasa,",
    endingPrefix: "risiko paling mahal biasanya datang daripada keputusan yang kabur.",
  },
  {
    label: "positioning",
    transitionPrefix: "kalau tengok dari sudut positioning,",
    conditionPrefix: "dari sudut beza dalam market,",
    valueLeadPrefix: "untuk orang yang tak nak offer dia nampak sama macam semua orang,",
    endingPrefix: "positioning yang jelas buat offer lebih senang diingati.",
  },
  {
    label: "clarity",
    transitionPrefix: "kalau tengok dari sudut clarity,",
    conditionPrefix: "dari sudut buat prospek cepat faham,",
    valueLeadPrefix: "untuk orang yang nak mesej dia sampai tanpa banyak explain berulang,",
    endingPrefix: "clarity selalu nampak simple, tapi effect dia besar.",
  },
  {
    label: "momentum",
    transitionPrefix: "kalau tengok dari sudut momentum,",
    conditionPrefix: "dari sudut jangan hilang rentak,",
    valueLeadPrefix: "untuk orang yang dah lama tangguh dan nak mula bergerak,",
    endingPrefix: "momentum kecil yang konsisten boleh jadi advantage besar.",
  },
  {
    label: "trust-building",
    transitionPrefix: "kalau tengok dari sudut bina trust,",
    conditionPrefix: "dari sudut buat orang rasa selamat untuk percaya,",
    valueLeadPrefix: "untuk prospek yang skeptikal tapi masih berminat,",
    endingPrefix: "trust bukan dibina dengan jerit kuat, tapi dengan logic yang jelas.",
  },
  {
    label: "offer-design",
    transitionPrefix: "kalau tengok dari sudut offer design,",
    conditionPrefix: "dari sudut susun value supaya nampak berbaloi,",
    valueLeadPrefix: "untuk orang yang nak offer dia lebih senang dinilai,",
    endingPrefix: "offer yang kuat buat orang faham kenapa dia patut peduli.",
  },
  {
    label: "attention",
    transitionPrefix: "kalau tengok dari sudut attention,",
    conditionPrefix: "dari sudut menang perhatian dalam feed yang bising,",
    valueLeadPrefix: "untuk orang yang tahu perhatian makin mahal,",
    endingPrefix: "attention hanya pintu masuk; yang menang ialah mesej selepas attention itu.",
  },
  {
    label: "conversion",
    transitionPrefix: "kalau tengok dari sudut conversion,",
    conditionPrefix: "dari sudut tukar minat kepada tindakan,",
    valueLeadPrefix: "untuk orang yang tak nak prospek sekadar baca dan hilang,",
    endingPrefix: "conversion berlaku bila orang faham, percaya dan nampak next step.",
  },
  {
    label: "speed",
    transitionPrefix: "kalau tengok dari sudut speed,",
    conditionPrefix: "dari sudut bergerak sebelum momentum hilang,",
    valueLeadPrefix: "untuk orang yang nak mula tanpa tunggu semua benda sempurna,",
    endingPrefix: "speed bukan gopoh; speed ialah jelas apa yang patut dibuat dulu.",
  },
  {
    label: "leverage",
    transitionPrefix: "kalau tengok dari sudut leverage,",
    conditionPrefix: "dari sudut hasil lebih besar daripada effort mentah,",
    valueLeadPrefix: "untuk orang yang nak kerja lebih smart, bukan sekadar lebih kuat,",
    endingPrefix: "leverage datang bila strategy, offer dan execution duduk dalam satu flow.",
  },
  {
    label: "decision",
    transitionPrefix: "kalau tengok dari sudut decision making,",
    conditionPrefix: "dari sudut bantu prospek decide dengan lebih waras,",
    valueLeadPrefix: "untuk orang yang nak prospek buat keputusan tanpa rasa dipaksa,",
    endingPrefix: "decision yang baik lahir daripada konteks yang cukup.",
  },
  {
    label: "objection",
    transitionPrefix: "kalau tengok dari sudut objection,",
    conditionPrefix: "dari sudut jawab keraguan sebelum prospek lari,",
    valueLeadPrefix: "untuk prospek yang ada minat tapi masih banyak soalan dalam kepala,",
    endingPrefix: "objection bukan musuh; objection ialah signal apa yang belum jelas.",
  },
  {
    label: "category-creation",
    transitionPrefix: "kalau tengok dari sudut category,",
    conditionPrefix: "dari sudut buat offer nampak berada dalam kelas tersendiri,",
    valueLeadPrefix: "untuk orang yang tak nak berlawan hanya pada harga atau bonus,",
    endingPrefix: "category yang jelas buat orang compare dengan cara yang lebih adil.",
  },
  {
    label: "authority",
    transitionPrefix: "kalau tengok dari sudut authority,",
    conditionPrefix: "dari sudut kenapa orang patut dengar,",
    valueLeadPrefix: "untuk prospek yang perlukan sebab sebelum percaya,",
    endingPrefix: "authority yang kuat datang daripada clarity, proof dan consistency.",
  },
  {
    label: "educational",
    transitionPrefix: "kalau tengok dari sudut education,",
    conditionPrefix: "dari sudut educate sebelum menjual,",
    valueLeadPrefix: "untuk market yang belum cukup faham kenapa benda ini penting,",
    endingPrefix: "bila market faham, selling jadi lebih natural.",
  },
  {
    label: "pain-aware",
    transitionPrefix: "kalau tengok dari sudut pain awareness,",
    conditionPrefix: "dari sudut buat orang sedar kos masalah itu,",
    valueLeadPrefix: "untuk orang yang rasa masalah dia kecil padahal ia sedang bocor perlahan-lahan,",
    endingPrefix: "pain yang difahami dengan jelas lebih mudah ditukar jadi tindakan.",
  },
  {
    label: "solution-aware",
    transitionPrefix: "kalau tengok dari sudut solution awareness,",
    conditionPrefix: "dari sudut bantu orang nampak jalan keluar,",
    valueLeadPrefix: "untuk prospek yang dah sedar masalah tapi belum nampak solusi paling sesuai,",
    endingPrefix: "solution yang jelas buat prospek rasa next step itu logik.",
  },
  {
    label: "desire",
    transitionPrefix: "kalau tengok dari sudut desire,",
    conditionPrefix: "dari sudut buat orang nampak outcome yang dia mahu,",
    valueLeadPrefix: "untuk prospek yang perlukan sebab emosi dan logic untuk bergerak,",
    endingPrefix: "desire yang kuat perlu disambung dengan jalan yang nampak boleh dicapai.",
  },
  {
    label: "identity",
    transitionPrefix: "kalau tengok dari sudut identity,",
    conditionPrefix: "dari sudut siapa yang prospek mahu jadi,",
    valueLeadPrefix: "untuk orang yang tak sekadar nak beli, tapi nak berubah cara bergerak,",
    endingPrefix: "identity shift selalu lebih kuat daripada sekadar feature.",
  },
  {
    label: "future-cost",
    transitionPrefix: "kalau tengok dari sudut kos masa depan,",
    conditionPrefix: "dari sudut apa jadi kalau terus tangguh,",
    valueLeadPrefix: "untuk orang yang perlu nampak akibat lambat bertindak,",
    endingPrefix: "kos tangguh biasanya nampak kecil sampai ia jadi terlalu mahal.",
  },
  {
    label: "social-proof",
    transitionPrefix: "kalau tengok dari sudut social proof,",
    conditionPrefix: "dari sudut kenapa orang lain mula ambil serius,",
    valueLeadPrefix: "untuk prospek yang perlukan signal sebelum percaya,",
    endingPrefix: "social proof bukan sekadar ramai orang bercakap, tapi kenapa mereka peduli.",
  },
  {
    label: "contrast",
    transitionPrefix: "kalau tengok dari sudut contrast,",
    conditionPrefix: "dari sudut bezakan cara lama dengan cara baru,",
    valueLeadPrefix: "untuk orang yang masih guna approach lama dan rasa semua benda berat,",
    endingPrefix: "contrast buat orang nampak kenapa cara lama tak lagi cukup.",
  },
  {
    label: "belief-reset",
    transitionPrefix: "kalau tengok dari sudut reset belief,",
    conditionPrefix: "dari sudut cabar assumption lama,",
    valueLeadPrefix: "untuk orang yang masih pegang belief yang buat dia lambat mula,",
    endingPrefix: "kadang-kadang yang perlu diubah dulu bukan tools, tapi belief.",
  },
  {
    label: "framework",
    transitionPrefix: "kalau tengok dari sudut framework,",
    conditionPrefix: "dari sudut susun cara fikir,",
    valueLeadPrefix: "untuk orang yang tak nak bergantung pada tips random,",
    endingPrefix: "framework buat kita tahu apa nak buat walaupun platform berubah.",
  },
  {
    label: "micro-commitment",
    transitionPrefix: "kalau tengok dari sudut micro commitment,",
    conditionPrefix: "dari sudut bantu prospek mula dengan langkah kecil,",
    valueLeadPrefix: "untuk orang yang rasa overwhelmed bila kena buat keputusan besar,",
    endingPrefix: "langkah kecil yang jelas lebih baik daripada niat besar yang tertangguh.",
  },
  {
    label: "readiness",
    transitionPrefix: "kalau tengok dari sudut readiness,",
    conditionPrefix: "dari sudut siapa yang sudah cukup ready untuk bertindak,",
    valueLeadPrefix: "untuk prospek yang dah lama observe dan cuma perlukan trigger yang tepat,",
    endingPrefix: "orang yang ready tak perlu dipaksa, dia perlu dijelaskan.",
  },
  {
    label: "market-education",
    transitionPrefix: "kalau tengok dari sudut educate market,",
    conditionPrefix: "dari sudut naikkan tahap faham sebelum pitch,",
    valueLeadPrefix: "untuk market yang perlukan context sebelum nampak value sebenar,",
    endingPrefix: "market yang lebih educated biasanya buat decision dengan lebih cepat.",
  },
  {
    label: "retention-thinking",
    transitionPrefix: "kalau tengok dari sudut retention thinking,",
    conditionPrefix: "dari sudut bina value yang tahan lama,",
    valueLeadPrefix: "untuk orang yang tak nak result sekejap tapi hilang arah semula,",
    endingPrefix: "value sebenar ialah bila cara fikir itu masih berguna selepas trend berubah.",
  },
  {
    label: "scaling",
    transitionPrefix: "kalau tengok dari sudut scaling,",
    conditionPrefix: "dari sudut apa yang boleh dibesarkan nanti,",
    valueLeadPrefix: "untuk orang yang nak mula kecil tapi fikir macam mana nak grow,",
    endingPrefix: "scale tanpa structure cuma membesarkan masalah yang sama.",
  },
  {
    label: "personal-journey",
    transitionPrefix: "kalau tengok dari sudut perjalanan individu,",
    conditionPrefix: "dari sudut orang yang sedang cuba keluar daripada stuck,",
    valueLeadPrefix: "untuk orang yang perlukan jalan yang terasa realistik dengan situasi dia,",
    endingPrefix: "journey yang jelas buat orang rasa dia tidak berjalan dalam gelap.",
  },
  {
    label: "ecosystem",
    transitionPrefix: "kalau tengok dari sudut ecosystem,",
    conditionPrefix: "dari sudut semua komponen perlu saling support,",
    valueLeadPrefix: "untuk orang yang tak nak buat satu benda bagus tapi flow lain bocor,",
    endingPrefix: "ecosystem yang kemas buat setiap effort jadi lebih bernilai.",
  },
];

const ACTIVE_PERSPECTIVE_COUNT = 30;
const COPY_ANGLE_COUNT = HOOK_VARIANTS.length * ACTIVE_PERSPECTIVE_COUNT;

function variationStyle(variation) {
  const index = Math.abs(Number(variation || 0)) % COPY_ANGLE_COUNT;
  const hookIndex = index % HOOK_VARIANTS.length;
  const opening = OPENING_CONTEXTS[hookIndex % OPENING_CONTEXTS.length];
  const perspectiveIndex = Math.floor(index / HOOK_VARIANTS.length) % ACTIVE_PERSPECTIVE_COUNT;
  const lensIndex = perspectiveIndex % ANGLE_LENSES.length;
  const lens = ANGLE_LENSES[lensIndex];
  const perspective = CONCEPT_PERSPECTIVES[perspectiveIndex];
  return {
    ...lens,
    perspective,
    hook: HOOK_VARIANTS[hookIndex],
    question: opening.question,
    skepticism: opening.skepticism,
    label: `h${String(hookIndex + 1).padStart(3, "0")}-${perspective.label}-${lens.label}-${opening.label}`,
    concept_index: index,
  };
}

function randomVariation(excludeVariations = []) {
  if (COPY_ANGLE_COUNT <= 1) return 0;
  const excluded = new Set(
    (Array.isArray(excludeVariations) ? excludeVariations : [excludeVariations])
      .map((value) => Number(value))
      .filter(Number.isFinite)
      .map((value) => Math.abs(value) % COPY_ANGLE_COUNT)
  );
  if (excluded.size >= COPY_ANGLE_COUNT) return Math.floor(Math.random() * COPY_ANGLE_COUNT);

  let next = Math.floor(Math.random() * COPY_ANGLE_COUNT);
  while (excluded.has(next)) {
    next = Math.floor(Math.random() * COPY_ANGLE_COUNT);
  }
  return next;
}

function stripProductName(productName) {
  const cleaned = cleanText(productName);
  return cleaned
    .split(/\s+[—–|]\s+|\s+-\s+/)[0]
    .trim()
    .slice(0, 90) || "produk ini";
}

function firstUsefulSentence(text) {
  const cleaned = cleanText(text);
  const sentence = cleaned.split(/(?<=[.!?])\s+/)[0] || cleaned;
  return sentence.slice(0, 260);
}

function mainPromise(context) {
  return firstUsefulSentence(context.description)
    || firstUsefulSentence((context.headings || [])[0])
    || firstUsefulSentence(context.bodySnippet)
    || "salespage ini menerangkan masalah, solusi dan tawaran produk dengan lebih jelas";
}

function productLabel(productName, productContext) {
  const lower = productContext.toLowerCase();
  if (lower.includes("program") || lower.includes("course") || lower.includes("kelas") || lower.includes("belajar")) {
    return `program ${productName}`;
  }
  if (lower.includes("produk digital") || lower.includes("tanpa produk sendiri")) {
    return `program ${productName}`;
  }
  return productName;
}

function buildStrategicFrame(productContext) {
  const lower = productContext.toLowerCase();

  if (lower.includes("tanpa produk sendiri") || lower.includes("produk digital")) {
    return {
      potential: "sangat berpotensi untuk orang yang nak mula buat duit dengan produk digital, tapi masih sangkut sebab fikir kena ada produk sendiri dulu.",
      reason: "business model dia sendiri",
      market: [
        "ramai orang nak mula.",
        "ramai orang dah tahu produk digital boleh jadi income.",
        "tapi ramai masih berhenti di tempat yang sama.",
        "dia tunggu idea produk sendiri.",
        "dia tunggu rasa cukup yakin.",
        "dia tunggu semua benda nampak sempurna.",
        "sekali tengok-tengok, orang lain dah jalan dulu.",
      ],
      problem: "masalah sebenar bukan sekadar tak ada produk.",
      strategy: [
        "strategi macam mana nak pilih produk yang betul.",
        "strategi macam mana nak susun offer.",
        "strategi macam mana nak bawa orang daripada curious kepada percaya.",
        "strategi macam mana nak jual tanpa nampak macam desperate menjual.",
        "strategi macam mana nak mula walaupun belum ada produk sendiri.",
      ],
      marketShift: [
        "produk digital dah bukan benda asing.",
        "affiliate dah bukan benda baru.",
        "AI pula buat proses research, content dan execution jadi lebih cepat.",
        "maksudnya lebih ramai orang boleh masuk market yang sama.",
        "bila lebih ramai orang masuk, attention jadi makin mahal.",
      ],
      hiddenCost: [
        "orang selalu kira kos beli produk.",
        "tapi jarang kira kos tunggu.",
        "kos 3 bulan tak mula.",
        "kos 6 bulan tengok orang lain jalan dulu.",
        "kos peluang yang terlepas sebab terlalu lama tunggu idea sempurna.",
      ],
      proof: [
        "claim hasil memang boleh tarik perhatian.",
        "tapi yang lebih penting ialah apa mekanisme di belakang hasil itu.",
        "kalau salespage boleh terangkan kenapa model itu berfungsi, itu lebih bernilai daripada sekadar headline besar.",
      ],
      timing: [
        "sekarang ramai orang nak income digital.",
        "sekarang ramai orang sedang cari model yang lebih ringan untuk mula.",
        "dan sekarang tools makin mudah diakses.",
        "timing macam ini boleh jadi peluang kalau masuk dengan strategi, bukan sekadar ikut hype.",
      ],
    };
  }

  if (lower.includes("ads") || lower.includes("funnel") || lower.includes("whatsapp")) {
    return {
      potential: "sangat berpotensi bantu orang yang dah ada traffic, tapi belum cukup pandai tukarkan traffic tu jadi duit.",
      reason: "sistem selepas orang klik",
      market: [
        "sekarang ramai orang boleh run ads.",
        "ramai orang boleh dapat leads.",
        "ramai orang boleh buat content dan launch offer.",
        "AI dah buat banyak benda jadi lebih mudah.",
        "jadi traffic bukan lagi masalah paling besar untuk semua orang.",
      ],
      problem: "masalah sebenar sekarang ialah macam mana nak convert perhatian tu jadi jualan.",
      strategy: [
        "strategi macam mana nak susun funnel.",
        "strategi macam mana nak tapis prospek.",
        "strategi macam mana nak follow up tanpa nampak memaksa.",
        "strategi macam mana nak bagi orang faham value sebelum dia decide.",
        "strategi macam mana nak scale tanpa bakar budget.",
      ],
      marketShift: [
        "ads makin mudah diakses.",
        "AI makin bantu orang tulis copy dan buat creative.",
        "lebih ramai orang boleh launch campaign.",
        "bila semua orang boleh dapat attention, conversion jadi medan perang sebenar.",
      ],
      hiddenCost: [
        "orang selalu nampak kos iklan.",
        "tapi tak nampak kos funnel yang bocor.",
        "leads masuk tapi tak follow up.",
        "prospek berminat tapi tak cukup trust.",
        "traffic ada, duit tetap tak keluar.",
      ],
      proof: [
        "aku tak tengok sekadar janji result.",
        "aku tengok sama ada dia explain flow selepas orang klik.",
        "sebab dekat situlah banyak campaign menang atau kalah.",
      ],
      timing: [
        "sekarang semua orang boleh buat iklan lebih cepat.",
        "jadi kelebihan bukan lagi pada siapa yang paling awal tekan launch.",
        "kelebihan ada pada siapa yang lebih cepat susun sistem conversion.",
      ],
    };
  }

  if (lower.includes("course") || lower.includes("kelas") || lower.includes("belajar")) {
    return {
      potential: "sangat berpotensi untuk orang yang dah lama nak belajar, tapi asyik tersangkut sebab terlalu banyak maklumat bercampur.",
      reason: "susunan belajar dia",
      market: [
        "sekarang ilmu bukan susah nak cari.",
        "tutorial ada banyak.",
        "content percuma pun berlambak.",
        "tapi terlalu banyak maklumat kadang-kadang buat orang makin blur.",
        "bukan sebab malas.",
        "tapi sebab tak nampak urutan yang patut dibuat dulu.",
      ],
      problem: "masalah sebenar bukan tiada ilmu, tapi tiada susunan yang jelas.",
      strategy: [
        "strategi macam mana nak faham asas dulu.",
        "strategi macam mana nak buat ikut turutan.",
        "strategi macam mana nak elak lompat-lompat sampai tak siap apa-apa.",
        "strategi macam mana nak tukar ilmu jadi tindakan.",
      ],
      marketShift: [
        "ilmu makin mudah dicari.",
        "content percuma makin banyak.",
        "AI pun boleh jawab macam-macam soalan.",
        "tapi bila maklumat terlalu banyak, orang makin perlukan susunan.",
      ],
      hiddenCost: [
        "orang ingat belajar secara random itu jimat.",
        "kadang-kadang memang jimat duit.",
        "tapi mahal dari sudut masa, fokus dan momentum.",
      ],
      proof: [
        "aku tak nilai satu kelas hanya daripada topik.",
        "aku tengok sama ada dia bantu orang faham turutan dan buat tindakan.",
      ],
      timing: [
        "bila market bergerak cepat, belajar pun tak boleh terlalu random.",
        "orang yang ada susunan biasanya lebih cepat nampak progress.",
      ],
    };
  }

  return {
    potential: "sangat berpotensi untuk orang yang sedang cari solusi yang lebih jelas dan tersusun.",
    reason: "cara dia susun masalah, solusi dan next step",
    market: [
      "ramai orang sebenarnya tahu ada masalah.",
      "cuma masalah tu selalu nampak kecil pada awal.",
      "lama-lama dia ambil masa.",
      "dia kacau fokus.",
      "dia buat keputusan jadi lambat.",
      "dan bila dibiarkan, kos dia makin besar.",
    ],
    problem: "masalah sebenar bukan sekadar masalah itu wujud, tapi bila kita tak ada cara yang jelas untuk selesaikan.",
    strategy: [
      "strategi macam mana nak faham masalah sebenar.",
      "strategi macam mana nak pilih solusi yang sesuai.",
      "strategi macam mana nak bergerak tanpa buang terlalu banyak masa.",
    ],
    marketShift: [
      "market sekarang bergerak cepat.",
      "orang ada terlalu banyak pilihan.",
      "attention mudah hilang.",
      "jadi mesej yang jelas makin penting.",
    ],
    hiddenCost: [
      "kos paling besar kadang-kadang bukan duit.",
      "tapi masa yang hilang sebab terus tangguh keputusan.",
      "lagi lama tunggu, lagi berat nak mula.",
    ],
    proof: [
      "aku tak tengok hanya pada headline.",
      "aku tengok sama ada salespage itu boleh terangkan masalah, solusi dan next step dengan jelas.",
    ],
    timing: [
      "bila masalah sudah jelas, timing untuk bertindak jadi penting.",
      "kalau tunggu semua benda sempurna, biasanya kita cuma tangguh benda yang patut diselesaikan.",
    ],
  };
}

function angleLines(style, frame) {
  if (style.lineKey === "marketShift") return frame.marketShift || frame.market;
  if (style.lineKey === "hiddenCost") return frame.hiddenCost || frame.market;
  if (style.lineKey === "proof") return frame.proof || frame.market;
  if (style.lineKey === "timing") return frame.timing || frame.market;
  if (style.lineKey === "competition") {
    return [
      "ramai orang akan nampak offer yang lebih kurang sama.",
      "ramai orang akan compare sebelum buat keputusan.",
      "jadi siapa yang paling jelas, biasanya dia lebih mudah diingati.",
      "bukan semestinya yang paling murah.",
      "bukan semestinya yang paling bising.",
    ];
  }
  if (style.lineKey === "simplicity") {
    return [
      "orang selalu sangka lagi banyak benda, lagi tinggi value.",
      "kadang-kadang betul.",
      "tapi kadang-kadang yang orang perlukan ialah next step yang jelas.",
      "bila semua benda terlalu berserabut, orang tangguh.",
      "bila flow dia simple, orang lebih mudah bergerak.",
    ];
  }
  if (style.lineKey === "belief") {
    return [
      "orang bukan sekadar perlu nampak offer.",
      "orang perlu percaya offer itu masuk akal.",
      "orang perlu percaya dia boleh ikut.",
      "orang perlu rasa risiko dia terkawal.",
      "barulah CTA tak rasa macam paksaan.",
    ];
  }
  if (style.lineKey === "execution") {
    return [
      "ramai orang dah tahu benda yang patut dibuat.",
      "tapi bila nak execute, dia sangkut.",
      "bukan sebab tak ada idea.",
      "tapi sebab tak ada susunan yang buat dia bergerak.",
      "dekat situ offer yang jelas boleh bantu.",
    ];
  }
  return frame.market;
}

function buildStory({ style, productName, promise, productContext, creativeType, angle }) {
  const frame = buildStrategicFrame(productContext);
  const label = productLabel(productName, productContext);
  const creativeLine = angle
    ? [
      "lagi satu sebab yang ramai belum nampak...",
      `${creativeType} ni bawa angle yang jelas: ${angle}.`,
      "",
    ]
    : [];
  const marketLines = angleLines(style, frame);

  return [
    style.hook,
    "",
    `${label} ni, ${style.thesisPrefix}, ${frame.potential}`,
    "",
    style.question,
    "",
    ...style.skepticism,
    "",
    `tapi sebab ${frame.reason}.`,
    "",
    ...creativeLine,
    `${style.perspective.transitionPrefix} ${style.transition}`,
    "",
    ...marketLines,
    "",
    style.positiveQuestion,
    "",
    ...style.positiveAnswer,
    "",
    `${style.perspective.conditionPrefix} ${style.condition}`,
    style.conditionValue,
    "",
    style.lossLine,
    "",
    frame.problem,
    "",
    "kat situ strategi main peranan.",
    "",
    `sebab tu bila aku tengok salespage ${productName}, mesej utama dia jelas:`,
    promise,
    "",
    `${style.perspective.valueLeadPrefix} ${style.valueLead}`,
    "bukan sekadar tools.",
    "bukan sekadar step-by-step.",
    "",
    style.valuePoint,
    "",
    ...frame.strategy,
    "",
    style.perspective.endingPrefix,
    ...style.ending,
  ].join("\n");
}

function generateCopy({ salespageLink, creativeAngle, mediaType, salespageContext, variation = 0 }) {
  const productName = stripProductName(salespageContext.productName || "produk ini");
  const productContext = summarizeContext(salespageContext);
  const angle = String(creativeAngle || "").trim();
  const style = variationStyle(variation);
  const creativeType = mediaType === "video" ? "video" : "poster";
  const promise = mainPromise(salespageContext);
  const storyContext = productContext || promise;
  const story = buildStory({
    style,
    productName,
    promise,
    productContext: storyContext,
    creativeType,
    angle,
  });

  const caption = `${story}

kalau offer ini masih dibuka, jangan tunggu sampai momentum hilang.

kalau memang nak mula atau nak selesaikan benda ni, langkah paling dekat ialah fahamkan salespage hari ini.

jangan decide daripada ${creativeType} sahaja.

baca apa yang disediakan.
semak offer dia.
tengok modul, bonus, harga atau syarat kalau ada dipaparkan.
pastikan ia sesuai dengan situasi kau sekarang.

kalau rasa ngam, baru jalan.
kalau tak ngam, sekurang-kurangnya kau jelas kenapa.

baca salespage penuh dekat sini:
${salespageLink}

kalau rasa posting ni bermanfaat,
share posting ni.`;

  const commentCta = variation % 2 === 0
    ? `Baca salespage penuh ${productName} di sini: ${salespageLink}`
    : `Nak tengok offer dan detail ${productName}? Klik sini: ${salespageLink}`;

  return {
    caption,
    comment_cta: commentCta,
    variation,
    style: style.label,
  };
}

function fileToPreviewMedia(file) {
  const mediaType = inferMediaType(file.filename, file.contentType);
  if (mediaType === "unsupported") {
    throw new Error("Format tidak disokong. Guna image atau video mp4/mov/webm.");
  }

  return {
    filename: file.filename || "creative",
    contentType: file.contentType || "application/octet-stream",
    mediaType,
  };
}

async function buildPreview({ file, salespageLink, creativeAngle, customCaption, firstComment, variation = null }) {
  const safeSalespageLink = validateUrl(salespageLink);
  const media = fileToPreviewMedia(file);
  const salespageContext = await fetchSalespageContext(safeSalespageLink);
  const hasVariation = variation !== null && variation !== undefined && String(variation).trim() !== "";
  const previewVariation = hasVariation && Number.isFinite(Number(variation))
    ? Math.abs(Number(variation)) % COPY_ANGLE_COUNT
    : randomVariation();
  const generated = generateCopy({
    salespageLink: safeSalespageLink,
    creativeAngle,
    mediaType: media.mediaType,
    salespageContext,
    variation: previewVariation,
  });

  const preview = {
    created_at: new Date().toISOString(),
    salespage_link: safeSalespageLink,
    creative_angle: String(creativeAngle || ""),
    media,
    salespage_context: {
      ok: salespageContext.ok,
      finalUrl: salespageContext.finalUrl,
      productName: salespageContext.productName,
      title: salespageContext.title,
      description: salespageContext.description,
      headings: salespageContext.headings,
      bodySnippet: salespageContext.bodySnippet,
      error: salespageContext.error,
    },
    caption: String(customCaption || "").trim() || generated.caption,
    comment_cta: String(firstComment || "").trim() || generated.comment_cta,
    variation: previewVariation,
    style: generated.style,
  };

  return { preview };
}

function regeneratePreview({ salespageLink, creativeAngle, mediaType, salespageContext, variation = 0, seenVariations = [] }) {
  const nextVariation = randomVariation([...seenVariations, variation]);
  const generated = generateCopy({
    salespageLink,
    creativeAngle,
    mediaType,
    salespageContext,
    variation: nextVariation,
  });

  return {
    created_at: new Date().toISOString(),
    caption: generated.caption,
    comment_cta: generated.comment_cta,
    variation: nextVariation,
    style: generated.style,
  };
}

function requireFacebookEnv() {
  const pageId = process.env.FACEBOOK_PAGE_ID;
  const pageAccessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

  if (!pageId || !pageAccessToken) {
    throw new Error("Vercel env belum lengkap. Set FACEBOOK_PAGE_ID dan FACEBOOK_PAGE_ACCESS_TOKEN.");
  }

  return { pageId, pageAccessToken };
}

async function graphJson(url, formData) {
  const response = await fetch(url, {
    method: "POST",
    body: formData,
  });
  const json = await response.json();
  if (!response.ok || json.error) {
    throw new Error(json.error?.message || `Facebook Graph error: HTTP ${response.status}`);
  }
  return json;
}

async function graphGetJson(url) {
  const response = await fetch(url);
  const json = await response.json();
  if (!response.ok || json.error) {
    throw new Error(json.error?.message || `Facebook Graph error: HTTP ${response.status}`);
  }
  return json;
}

async function fetchPermalink(postId, pageAccessToken) {
  if (!postId) return "";
  const url = new URL(`https://graph.facebook.com/v21.0/${postId}`);
  url.searchParams.set("fields", "id,permalink_url");
  url.searchParams.set("access_token", pageAccessToken);
  const json = await graphGetJson(url);
  return json.permalink_url || "";
}

async function fetchPermalinkSafe(postId, pageAccessToken) {
  try {
    return await fetchPermalink(postId, pageAccessToken);
  } catch {
    return "";
  }
}

function normalizeFacebookUrl(url) {
  const value = String(url || "").trim();
  if (!value) return "";
  if (value.startsWith("/")) return `https://www.facebook.com${value}`;
  return value;
}

function pagePostId(pageId, rawPostId) {
  const value = String(rawPostId || "").trim();
  if (!value) return "";
  if (value.includes("_")) return value;
  return `${pageId}_${value}`;
}

function facebookPostUrl(pageId, postId) {
  const value = String(postId || "").trim();
  if (!value) return "";
  const storyFbid = value.includes("_") ? value.split("_").pop() : value;
  return `https://www.facebook.com/permalink.php?story_fbid=${encodeURIComponent(storyFbid)}&id=${encodeURIComponent(pageId)}`;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchVideoPostDetails(videoId, pageAccessToken) {
  if (!videoId) return {};
  const fieldSets = [
    "id,post_id,permalink_url,created_time",
    "id,permalink_url,created_time",
  ];

  for (const fields of fieldSets) {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      try {
        const url = new URL(`https://graph.facebook.com/v21.0/${videoId}`);
        url.searchParams.set("fields", fields);
        url.searchParams.set("access_token", pageAccessToken);
        const json = await graphGetJson(url);
        if (json.post_id || json.permalink_url) return json;
      } catch {
        break;
      }
      await wait(1500);
    }
  }

  return {};
}

function shouldRetryComment(error) {
  const message = String(error?.message || error || "").toLowerCase();
  return message.includes("does not exist")
    || message.includes("cannot be loaded")
    || message.includes("unsupported post request")
    || message.includes("missing permissions")
    || message.includes("temporarily unavailable");
}

async function postCommentWithRetry({ postId, pageAccessToken, message, attempts = 10, delayMs = 3000 }) {
  let lastError = null;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const commentForm = new FormData();
    commentForm.append("access_token", pageAccessToken);
    commentForm.append("message", message);

    try {
      return await graphJson(`https://graph.facebook.com/v21.0/${postId}/comments`, commentForm);
    } catch (error) {
      lastError = error;
      if (!shouldRetryComment(error) || attempt === attempts - 1) break;
      await wait(delayMs);
    }
  }

  throw lastError;
}

async function publishToFacebook({ file, caption, firstComment }) {
  const { pageId, pageAccessToken } = requireFacebookEnv();
  const mediaType = inferMediaType(file.filename, file.contentType);
  if (mediaType === "unsupported") {
    throw new Error("Format tidak disokong. Guna image atau video mp4/mov/webm.");
  }

  let mediaResponse;
  let feedResponse = null;
  if (mediaType === "video") {
    const form = new FormData();
    form.append("access_token", pageAccessToken);
    form.append("published", "true");
    form.append("source", new Blob([file.data], { type: file.contentType }), file.filename || "creative");
    form.append("description", caption);
    mediaResponse = await graphJson(`https://graph.facebook.com/v21.0/${pageId}/videos`, form);
  } else {
    const photoForm = new FormData();
    photoForm.append("access_token", pageAccessToken);
    photoForm.append("published", "false");
    photoForm.append("source", new Blob([file.data], { type: file.contentType }), file.filename || "creative");
    mediaResponse = await graphJson(`https://graph.facebook.com/v21.0/${pageId}/photos`, photoForm);

    const feedForm = new FormData();
    feedForm.append("access_token", pageAccessToken);
    feedForm.append("published", "true");
    feedForm.append("message", caption);
    feedForm.append("attached_media[0]", JSON.stringify({ media_fbid: mediaResponse.id }));
    feedResponse = await graphJson(`https://graph.facebook.com/v21.0/${pageId}/feed`, feedForm);
  }

  const videoDetails = mediaType === "video"
    ? await fetchVideoPostDetails(mediaResponse.id, pageAccessToken)
    : {};
  const rawVideoPostId = mediaResponse.post_id || videoDetails.post_id || "";
  const postId = mediaType === "video"
    ? pagePostId(pageId, rawVideoPostId)
    : feedResponse?.id || mediaResponse.post_id || mediaResponse.id || "";
  const fallbackVideoUrl = mediaType === "video" && mediaResponse.id
    ? `https://www.facebook.com/${pageId}/videos/${mediaResponse.id}/`
    : "";
  const mediaPermalinkUrl = normalizeFacebookUrl(videoDetails.permalink_url || fallbackVideoUrl);
  const stablePostUrl = facebookPostUrl(pageId, postId);
  const permalinkUrl = stablePostUrl || normalizeFacebookUrl(await fetchPermalinkSafe(postId, pageAccessToken) || mediaPermalinkUrl);
  let commentResponse = null;
  let commentNote = "";
  if (firstComment && postId) {
    try {
      commentResponse = await postCommentWithRetry({
        postId,
        pageAccessToken,
        message: firstComment,
        attempts: mediaType === "video" ? 10 : 3,
        delayMs: mediaType === "video" ? 3000 : 1000,
      });
    } catch (error) {
      commentNote = `First comment belum berjaya ditambah: ${error?.message || String(error)}`;
    }
  } else if (firstComment && mediaType === "video") {
    commentNote = "First comment belum ditambah kerana Facebook belum expose feed post_id untuk video ini.";
  }
  const processingNote = [
    mediaType === "video" && !rawVideoPostId
      ? "Facebook video may still be processing. If the link says content is unavailable, reload after a few minutes."
      : "",
    commentNote,
  ].filter(Boolean).join(" ");

  return {
    media_type: mediaType,
    post_id: postId,
    media_id: mediaResponse.id || "",
    permalink_url: permalinkUrl,
    media_permalink_url: mediaPermalinkUrl,
    processing_note: processingNote,
    comment_id: commentResponse?.id || "",
    media_response: mediaResponse,
    feed_response: feedResponse,
    media_details: videoDetails,
    comment_response: commentResponse,
  };
}

module.exports = {
  buildPreview,
  parseMultipart,
  publishToFacebook,
  readJsonBody,
  readRequestBody,
  regeneratePreview,
};
