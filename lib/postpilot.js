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
      "user-agent": "PostPilot/1.0 (+https://post-pilot-taupe.vercel.app)",
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

function variationStyle(variation) {
  const styles = [
    {
      label: "strategic-opinion",
      hook: "trust me.",
    },
    {
      label: "market-shift",
      hook: "aku rasa ramai belum nampak benda ni.",
    },
    {
      label: "hidden-cost",
      hook: "ini bukan sekadar pasal produk.",
    },
    {
      label: "direct-strategy",
      hook: "kalau kau serius nak bergerak, baca ni dulu.",
    },
  ];
  return styles[Math.abs(Number(variation || 0)) % styles.length];
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
  };
}

function buildStory({ hook, productName, promise, productContext, creativeType, angle }) {
  const frame = buildStrategicFrame(productContext);
  const label = productLabel(productName, productContext);
  const creativeLine = angle
    ? [
      "lagi satu sebab yang ramai belum nampak...",
      `${creativeType} ni bawa angle yang jelas: ${angle}.`,
      "",
    ]
    : [];

  return [
    hook,
    "",
    `${label} ni, pada pandangan aku, ${frame.potential}`,
    "",
    "kenapa aku cakap macam tu?",
    "",
    "bukan sebab hype.",
    "bukan sebab nama.",
    "",
    `tapi sebab ${frame.reason}.`,
    "",
    ...creativeLine,
    "aku rasa ramai masih belum faham apa yang sedang berlaku sekarang.",
    "",
    ...frame.market,
    "",
    "jadi benda ni bagus ke?",
    "",
    "jawapan aku...",
    "bagus.",
    "",
    "tapi dengan satu syarat.",
    "kena ada strategi.",
    "",
    "kalau tak ada strategi, lagi banyak effort yang dibuat, lagi banyak masa dan duit boleh bocor dekat tempat yang salah.",
    "",
    frame.problem,
    "",
    "kat situ strategi main peranan.",
    "",
    `sebab tu bila aku tengok salespage ${productName}, mesej utama dia jelas:`,
    promise,
    "",
    "pada aku, benda paling mahal bukan sekadar template.",
    "bukan sekadar tools.",
    "bukan sekadar step-by-step.",
    "",
    "tapi cara berfikir.",
    "",
    ...frame.strategy,
    "",
    "sebab tools akan berubah.",
    "AI akan berubah.",
    "platform akan berubah.",
    "",
    "tapi cara berfikir yang betul akan kekal lama.",
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
  const hook = style.hook;
  const story = buildStory({
    hook,
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

async function buildPreview({ file, salespageLink, creativeAngle, customCaption, firstComment, variation = 0 }) {
  const safeSalespageLink = validateUrl(salespageLink);
  const media = fileToPreviewMedia(file);
  const salespageContext = await fetchSalespageContext(safeSalespageLink);
  const generated = generateCopy({
    salespageLink: safeSalespageLink,
    creativeAngle,
    mediaType: media.mediaType,
    salespageContext,
    variation,
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
    variation,
    style: generated.style,
  };

  return { preview };
}

function regeneratePreview({ salespageLink, creativeAngle, mediaType, salespageContext, variation = 0 }) {
  const nextVariation = Number(variation || 0) + 1;
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

async function fetchPermalink(postId, pageAccessToken) {
  if (!postId) return "";
  const url = new URL(`https://graph.facebook.com/v21.0/${postId}`);
  url.searchParams.set("fields", "id,permalink_url");
  url.searchParams.set("access_token", pageAccessToken);
  const response = await fetch(url);
  const json = await response.json();
  return json.permalink_url || "";
}

async function publishToFacebook({ file, caption, firstComment }) {
  const { pageId, pageAccessToken } = requireFacebookEnv();
  const mediaType = inferMediaType(file.filename, file.contentType);
  if (mediaType === "unsupported") {
    throw new Error("Format tidak disokong. Guna image atau video mp4/mov/webm.");
  }

  const form = new FormData();
  form.append("access_token", pageAccessToken);
  form.append("published", "true");
  form.append("source", new Blob([file.data], { type: file.contentType }), file.filename || "creative");

  let mediaResponse;
  if (mediaType === "video") {
    form.append("description", caption);
    mediaResponse = await graphJson(`https://graph.facebook.com/v21.0/${pageId}/videos`, form);
  } else {
    form.append("caption", caption);
    mediaResponse = await graphJson(`https://graph.facebook.com/v21.0/${pageId}/photos`, form);
  }

  const postId = mediaResponse.post_id || mediaResponse.id || "";
  let commentResponse = null;
  if (firstComment && postId) {
    const commentForm = new FormData();
    commentForm.append("access_token", pageAccessToken);
    commentForm.append("message", firstComment);
    commentResponse = await graphJson(`https://graph.facebook.com/v21.0/${postId}/comments`, commentForm);
  }

  return {
    media_type: mediaType,
    post_id: postId,
    permalink_url: await fetchPermalink(postId, pageAccessToken),
    comment_id: commentResponse?.id || "",
    media_response: mediaResponse,
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
