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
      label: "story",
      hook: "Ramai orang nak hasil cepat, tapi tersekat sebab tak tahu langkah pertama yang betul.",
      storyLead: "Bila saya baca salespage ini, mesej yang kuat ialah:",
    },
    {
      label: "problem",
      hook: "Kalau masalah ini nampak kecil, selalunya sebab kita belum kira kos masa, duit dan peluang yang terlepas.",
      storyLead: "Creative ini bawa orang masuk kepada satu cerita yang jelas:",
    },
    {
      label: "curiosity",
      hook: "Ada sebab kenapa orang berhenti pada creative macam ini.",
      storyLead: "Bila disambungkan dengan salespage, point besarnya ialah:",
    },
    {
      label: "direct",
      hook: "Kalau kau memang sedang cari solusi, jangan berhenti setakat tengok poster.",
      storyLead: "Salespage ini menerangkan satu tawaran yang fokus kepada:",
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

function buildUsp({ productName, productContext }) {
  const lower = productContext.toLowerCase();
  if (lower.includes("tanpa produk sendiri")) {
    return `${productName} fokus bantu orang mula dengan produk digital tanpa perlu ada produk sendiri dari awal.`;
  }
  if (lower.includes("produk digital")) {
    return `${productName} fokus pada peluang produk digital dan cara mula dengan lebih tersusun.`;
  }
  if (lower.includes("whatsapp") || lower.includes("ads") || lower.includes("funnel")) {
    return `${productName} bantu susun proses marketing supaya prospek tidak sekadar datang dan hilang.`;
  }
  return `${productName} bukan sekadar bagi idea, tapi bawa pembaca kepada satu solusi yang lebih spesifik.`;
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

function inferHook({ productContext, productName }) {
  const lower = productContext.toLowerCase();
  if (lower.includes("tanpa produk sendiri") || lower.includes("produk digital")) {
    return "Ramai orang nak mula buat duit dengan produk digital, tapi tersekat sebab fikir kena ada produk sendiri dulu.";
  }
  if (lower.includes("ads") || lower.includes("funnel") || lower.includes("whatsapp")) {
    return "Ramai orang rasa masalahnya pada iklan, padahal selalunya masalah sebenar ada pada sistem selepas orang klik.";
  }
  if (lower.includes("course") || lower.includes("kelas") || lower.includes("belajar")) {
    return `Kalau kau sedang cari cara belajar yang lebih tersusun, ${productName} mungkin patut masuk shortlist.`;
  }
  return "Kalau masalah ini sedang berlaku pada kau, jangan tunggu sampai ia jadi makin berat.";
}

function buildStory({ hook, productName, promise, productContext, creativeType, angle }) {
  const lower = productContext.toLowerCase();
  const angleSentence = angle
    ? ` ${creativeType[0].toUpperCase()}${creativeType.slice(1)} itu menguatkan lagi rasa ini: ${angle}.`
    : "";

  if (lower.includes("tanpa produk sendiri") || lower.includes("produk digital")) {
    return [
      `${hook} Biasanya orang bukan malas, cuma terlalu lama duduk dalam fasa tunggu "nanti bila dah ada idea produk sendiri".`,
      "Hari bertukar minggu, minggu bertukar bulan, tapi masih ulang benda yang sama: simpan niat, tengok orang lain jalan dulu, kemudian rasa tertinggal.",
      `Salespage ${productName} masuk tepat pada titik itu dengan mesej utama: ${promise}${angleSentence}`,
    ].join("\n\n");
  }

  if (lower.includes("ads") || lower.includes("funnel") || lower.includes("whatsapp")) {
    return [
      `${hook} Ramai orang nampak masalah di permukaan sahaja: iklan mahal, leads senyap, prospek hilang, atau sales tak naik.`,
      "Tapi bila diteliti, selalunya ada satu proses yang tidak kemas di belakangnya. Iklan jalan, orang datang, kemudian momentum hilang sebab flow selepas itu tidak cukup jelas.",
      `Salespage ${productName} bawa cerita ini dengan mesej utama: ${promise}${angleSentence}`,
    ].join("\n\n");
  }

  if (lower.includes("course") || lower.includes("kelas") || lower.includes("belajar")) {
    return [
      `${hook} Kadang-kadang yang membuatkan orang lambat bergerak bukan sebab tiada minat.`,
      "Masalahnya, terlalu banyak maklumat bercampur sampai susah nak nampak langkah pertama. Bila semua nampak penting, akhirnya satu pun tidak dibuat.",
      `Salespage ${productName} cuba susun semula kekusutan itu dengan mesej utama: ${promise}${angleSentence}`,
    ].join("\n\n");
  }

  return [
    `${hook} Selalunya orang mula ambil serius bila masalah yang sama berulang beberapa kali.`,
    "Mula-mula nampak kecil, kemudian ia ganggu masa, fokus, dan keputusan. Sampai satu tahap, kita tahu benda ini perlu diselesaikan dengan lebih tersusun.",
    `Salespage ${productName} membawa cerita itu kepada satu mesej utama: ${promise}${angleSentence}`,
  ].join("\n\n");
}

function generateCopy({ salespageLink, creativeAngle, mediaType, salespageContext, variation = 0 }) {
  const productName = stripProductName(salespageContext.productName || "produk ini");
  const productContext = summarizeContext(salespageContext);
  const angle = String(creativeAngle || "").trim();
  const style = variationStyle(variation);
  const creativeType = mediaType === "video" ? "video" : "poster";
  const promise = mainPromise(salespageContext);
  const storyContext = productContext || promise;
  const hook = variation === 0
    ? inferHook({ productContext: storyContext, productName })
    : style.hook;
  const story = buildStory({
    hook,
    productName,
    promise,
    productContext: storyContext,
    creativeType,
    angle,
  });
  const usp = buildUsp({ productName, productContext: storyContext });

  const caption = `${story}

${usp}

Detail tawaran ada di salespage. Baca apa yang disediakan, semak modul/bonus/harga jika dipaparkan, dan pastikan ia sesuai dengan situasi kau sekarang.

Kalau offer ini masih dibuka, jangan tunggu sampai kau lupa dan momentum hilang.

Kalau memang nak mula, langkah paling dekat ialah fahamkan salespage hari ini dan decide sama ada nak teruskan atau tidak.

Klik link ini dan baca salespage penuh:
${salespageLink}`;

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
