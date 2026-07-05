#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const appDir = path.dirname(fileURLToPath(import.meta.url));
const facebookDir = path.resolve(appDir, "..");
const uploadsDir = path.join(appDir, "uploads");
const postsDir = path.join(appDir, "posts");
const facebookEnvPath = process.env.FACEBOOK_ENV_FILE || path.join(facebookDir, "facebook.env");
const postScript = process.env.FACEBOOK_POST_SCRIPT || path.join(facebookDir, "post_to_facebook.sh");
const host = process.env.WEBAPP_HOST || "127.0.0.1";
const port = Number(process.env.WEBAPP_PORT || 8787);
const uploadPassword = process.env.WEBAPP_UPLOAD_PASSWORD || "";
const maxUploadBytes = Number(process.env.WEBAPP_MAX_UPLOAD_MB || 200) * 1024 * 1024;

fs.mkdirSync(uploadsDir, { recursive: true });
fs.mkdirSync(postsDir, { recursive: true });

function readEnv(filePath) {
  const env = {};
  if (!fs.existsSync(filePath)) return env;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const idx = trimmed.indexOf("=");
    env[trimmed.slice(0, idx)] = trimmed.slice(idx + 1);
  }
  return env;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function slug(value) {
  return String(value || "facebook-post")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "facebook-post";
}

function nowStamp() {
  const date = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    "-",
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join("");
}

function inferMediaType(fileName, contentType) {
  const ext = path.extname(fileName).toLowerCase();
  if (contentType.startsWith("image/") || [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext)) {
    return "image";
  }
  if (contentType.startsWith("video/") || [".mp4", ".mov", ".m4v", ".webm"].includes(ext)) {
    return "video";
  }
  return "unsupported";
}

function validateUrl(raw) {
  const value = String(raw || "").trim();
  const parsed = new URL(value);
  if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("Salespage link mesti URL http/https.");
  return parsed.toString();
}

function generateCaption({ salespageLink, note, mediaType }) {
  const hook = mediaType === "video"
    ? "Kalau video ni terasa macam situasi bisnes sendiri, itu tanda funnel perlu disemak."
    : "Kalau poster ni buat kau terfikir pasal iklan sendiri, itu tanda funnel perlu disemak.";

  const noteLine = note
    ? `\n\nNota penting: ${note.trim()}`
    : "";

  return `${hook}

Ramai owner bisnes sangka masalah utama ialah iklan tidak cukup laju. Tapi selalunya duit ads bocor sebab flow selepas orang nampak iklan tidak jelas.

Leads masuk, orang tanya harga, follow up dibuat, tapi sales masih perlahan. Di situlah strategi funnel, content, WhatsApp follow up dan setup ads kena nampak sebagai satu sistem.

Ads Funnel Mastery bantu kau faham cara susun TikTok Ads dan funnel supaya bajet ads tidak sekadar jalan tanpa arah.${noteLine}

Nak tengok salespage:
${salespageLink}`;
}

function generateFirstComment(salespageLink) {
  return `Nak belajar susun TikTok Ads + funnel dengan lebih jelas? Boleh tengok sini: ${salespageLink}`;
}

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
    if (total > maxUploadBytes) throw new Error(`Upload terlalu besar. Limit ${Math.round(maxUploadBytes / 1024 / 1024)}MB.`);
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
          filename: path.basename(disposition.filename),
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

function parsePostResponses(stdout) {
  const jsonLines = String(stdout || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  const mediaResponse = jsonLines[0] || {};
  const commentResponse = jsonLines[1] || null;
  return {
    mediaResponse,
    commentResponse,
    postId: mediaResponse.post_id || mediaResponse.id || "",
    commentId: commentResponse?.id || "",
  };
}

async function fetchPermalink(postId, env) {
  if (!postId || !env.FACEBOOK_PAGE_ACCESS_TOKEN) return "";
  const url = new URL(`https://graph.facebook.com/v21.0/${postId}`);
  url.searchParams.set("fields", "id,permalink_url");
  url.searchParams.set("access_token", env.FACEBOOK_PAGE_ACCESS_TOKEN);
  const response = await fetch(url);
  const json = await response.json();
  return json.permalink_url || "";
}

function renderPage(result) {
  return `<!doctype html>
<html lang="ms">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Facebook Creative Uploader</title>
  <style>
    :root { color-scheme: light; font-family: Arial, sans-serif; }
    body { margin: 0; background: #f5f5f5; color: #171717; }
    main { width: min(840px, calc(100% - 32px)); margin: 40px auto; }
    .card { background: #fff; border: 1px solid #ddd; border-radius: 16px; padding: 24px; box-shadow: 0 10px 28px rgba(0,0,0,.06); }
    h1 { margin: 0 0 8px; font-size: 28px; }
    p { line-height: 1.5; }
    label { display: block; margin: 18px 0 8px; font-weight: 700; }
    input, textarea { width: 100%; box-sizing: border-box; border: 1px solid #bbb; border-radius: 10px; padding: 12px; font: inherit; }
    textarea { min-height: 120px; resize: vertical; }
    .row { display: flex; align-items: center; gap: 10px; margin-top: 18px; }
    .row input { width: auto; }
    button { margin-top: 18px; border: 0; border-radius: 999px; padding: 13px 20px; background: #0f172a; color: white; font-weight: 700; cursor: pointer; }
    button:hover { background: #1e293b; }
    .note { color: #555; font-size: 14px; }
    .result { margin-bottom: 18px; padding: 14px; border-radius: 12px; white-space: pre-wrap; }
    .ok { background: #eaf7ee; border: 1px solid #a7dfb5; }
    .err { background: #fff0f0; border: 1px solid #ffb6b6; }
    code { background: #eee; padding: 2px 5px; border-radius: 5px; }
  </style>
</head>
<body>
  <main>
    ${result ? `<div class="result ${result.ok ? "ok" : "err"}">${escapeHtml(result.message)}</div>` : ""}
    <section class="card">
      <h1>Facebook Creative Uploader</h1>
      <p class="note">Upload gambar/video, masukkan salespage link, kemudian sistem akan post terus ke Facebook Page menggunakan <code>facebook.env</code>. Server ini bind ke localhost secara default.</p>
      <form method="post" action="/post" enctype="multipart/form-data">
        ${uploadPassword ? `<label>Password</label><input type="password" name="password" required autocomplete="current-password">` : ""}
        <label>Creative gambar/video</label>
        <input type="file" name="creative" accept="image/*,video/mp4,video/quicktime,video/webm" required>

        <label>Salespage link</label>
        <input type="url" name="salespage_link" value="https://digitaldominate.com/" required>

        <label>Nota caption / angle (optional)</label>
        <textarea name="caption_note" placeholder="Contoh: Tekankan masalah leads masuk tapi tak close."></textarea>

        <label>Custom caption penuh (optional, override auto-caption)</label>
        <textarea name="custom_caption" placeholder="Kalau isi bahagian ini, sistem guna caption ini terus. Pastikan letak salespage link."></textarea>

        <label>First comment CTA (optional)</label>
        <textarea name="first_comment" placeholder="Kosongkan untuk auto-generate first comment."></textarea>

        <div class="row">
          <input type="checkbox" id="dry_run" name="dry_run" value="1">
          <label for="dry_run" style="margin:0;font-weight:400;">Dry run sahaja, jangan publish</label>
        </div>

        <button type="submit">Post ke Facebook Page</button>
      </form>
    </section>
  </main>
</body>
</html>`;
}

async function handlePost(req, res) {
  const body = await readRequestBody(req);
  const { values, files } = parseMultipart(req, body);

  if (uploadPassword && values.password !== uploadPassword) {
    throw new Error("Password salah.");
  }

  const creative = files.creative;
  if (!creative || !creative.data.length) throw new Error("Creative file wajib diupload.");

  const salespageLink = validateUrl(values.salespage_link);
  const mediaType = inferMediaType(creative.filename, creative.contentType);
  if (mediaType === "unsupported") {
    throw new Error("Format tidak disokong. Guna image atau video mp4/mov/webm.");
  }

  const id = `${nowStamp()}-${slug(path.basename(creative.filename, path.extname(creative.filename)))}`;
  const ext = path.extname(creative.filename).toLowerCase() || (mediaType === "video" ? ".mp4" : ".jpg");
  const mediaPath = path.join(uploadsDir, `${id}${ext}`);
  const captionPath = path.join(postsDir, `${id}-caption.txt`);
  const metadataPath = path.join(postsDir, `${id}.json`);
  const firstComment = String(values.first_comment || "").trim() || generateFirstComment(salespageLink);
  const caption = String(values.custom_caption || "").trim()
    || generateCaption({ salespageLink, note: values.caption_note, mediaType });
  const dryRun = values.dry_run === "1";

  fs.writeFileSync(mediaPath, creative.data);
  fs.writeFileSync(captionPath, caption);

  const metadata = {
    id,
    source: "webapp",
    status: dryRun ? "dry_run" : "pending_post",
    created_at: new Date().toISOString(),
    salespage_link: salespageLink,
    media_type: mediaType,
    media_file: path.relative(facebookDir, mediaPath),
    caption_file: path.relative(facebookDir, captionPath),
    first_comment: firstComment,
  };

  if (dryRun) {
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    return {
      ok: true,
      message: `Dry run siap.\nCaption file: ${captionPath}\nMetadata: ${metadataPath}`,
    };
  }

  const env = readEnv(facebookEnvPath);
  const result = spawnSync(postScript, [captionPath, mediaPath, firstComment], {
    cwd: facebookDir,
    encoding: "utf8",
    env: { ...process.env, FACEBOOK_ENV_FILE: facebookEnvPath },
  });

  const parsed = parsePostResponses(result.stdout);
  const permalink = parsed.postId ? await fetchPermalink(parsed.postId, env) : "";
  const postedMetadata = {
    ...metadata,
    status: result.status === 0 ? "posted" : "failed",
    posted_at: result.status === 0 ? new Date().toISOString() : null,
    post_id: parsed.postId,
    permalink_url: permalink,
    comment_id: parsed.commentId,
    post_response: parsed.mediaResponse,
    comment_response: parsed.commentResponse,
    stderr: result.stderr,
    exit_code: result.status,
  };
  fs.writeFileSync(metadataPath, JSON.stringify(postedMetadata, null, 2));

  if (result.status !== 0) {
    throw new Error(`Facebook post failed.\n${result.stderr || result.stdout}`);
  }

  return {
    ok: true,
    message: `Posted ke Facebook.\nPost ID: ${parsed.postId || "-"}\nLink: ${permalink || "-"}\nComment ID: ${parsed.commentId || "-"}\nMetadata: ${metadataPath}`,
  };
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "GET" && req.url === "/") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(renderPage());
      return;
    }

    if (req.method === "POST" && req.url === "/post") {
      const result = await handlePost(req, res);
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(renderPage(result));
      return;
    }

    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Not found");
  } catch (error) {
    res.writeHead(400, { "content-type": "text/html; charset=utf-8" });
    res.end(renderPage({ ok: false, message: error?.message || String(error) }));
  }
});

server.listen(port, host, () => {
  const passwordMode = uploadPassword ? "password enabled" : "no password; localhost only";
  console.log(`Facebook Creative Uploader running at http://${host}:${port} (${passwordMode})`);
});
