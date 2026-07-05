#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceDir = path.resolve(scriptDir, "..", "..");
const telegramEnvPath = process.env.TELEGRAM_ENV_FILE || path.join(scriptDir, "telegram.env");
const facebookEnvPath = process.env.FACEBOOK_ENV_FILE || path.join(workspaceDir, "facebook-posts", "facebook.env");
const statePath = path.join(scriptDir, "telegram-state.json");
const inboxDir = path.join(scriptDir, "inbox");
const mediaDir = path.join(workspaceDir, "facebook-posts", "assets", "telegram-creatives");

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

function readState() {
  if (!fs.existsSync(statePath)) return { offset: 0 };
  return JSON.parse(fs.readFileSync(statePath, "utf8"));
}

function writeState(state) {
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
}

function safeId(value) {
  return String(value || "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

async function telegram(method, body) {
  const url = `https://api.telegram.org/bot${token}/${method}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await response.json();
  if (!json.ok) throw new Error(`${method} failed: ${JSON.stringify(json)}`);
  return json.result;
}

async function telegramGet(method, params) {
  const url = new URL(`https://api.telegram.org/bot${token}/${method}`);
  for (const [key, value] of Object.entries(params || {})) {
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
  }
  const response = await fetch(url);
  const json = await response.json();
  if (!json.ok) throw new Error(`${method} failed: ${JSON.stringify(json)}`);
  return json.result;
}

function extensionFrom(filePath, fallback) {
  const ext = path.extname(String(filePath || "")).toLowerCase();
  if (ext && /^[.][a-z0-9]+$/.test(ext)) return ext;
  return fallback;
}

async function downloadTelegramFile(fileId, localBaseName, fallbackExt) {
  fs.mkdirSync(mediaDir, { recursive: true });
  const fileInfo = await telegramGet("getFile", { file_id: fileId });
  const ext = extensionFrom(fileInfo.file_path, fallbackExt);
  const localPath = path.join(mediaDir, `${localBaseName}${ext}`);
  const fileUrl = `https://api.telegram.org/file/bot${token}/${fileInfo.file_path}`;
  const response = await fetch(fileUrl);
  if (!response.ok) throw new Error(`download file failed: ${response.status} ${response.statusText}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(localPath, bytes);
  return {
    file_id: fileId,
    telegram_file_path: fileInfo.file_path,
    local_file: path.relative(workspaceDir, localPath),
    size: bytes.length,
  };
}

async function answerCallback(callbackId) {
  try {
    await telegram("answerCallbackQuery", { callback_query_id: callbackId });
    return "answered";
  } catch (error) {
    const message = String(error?.message || error);
    if (message.includes("query is too old") || message.includes("query ID is invalid")) {
      return "expired";
    }
    throw error;
  }
}

function draftPaths(draftId) {
  const manifestPath = path.join(workspaceDir, "facebook-posts", "drafts", `${draftId}.json`);
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    return {
      manifestPath,
      manifest,
      status: manifest.status || "pending_approval",
      caption: manifest.caption_file && path.resolve(workspaceDir, manifest.caption_file),
      photo: manifest.photo_file && path.resolve(workspaceDir, manifest.photo_file),
      comment: manifest.comment_cta || "",
    };
  }

  return {
    manifestPath: null,
    manifest: null,
    status: "pending_approval",
    caption: path.join(workspaceDir, "facebook-posts", "drafts", `${draftId}-caption.txt`),
    photo: path.join(workspaceDir, "facebook-posts", "assets", `${draftId}.png`),
    comment: "",
  };
}

function updateManifest(paths, updates) {
  if (!paths.manifestPath || !paths.manifest) return;
  fs.writeFileSync(paths.manifestPath, JSON.stringify({ ...paths.manifest, ...updates }, null, 2));
}

function pickTelegramMedia(message) {
  if (Array.isArray(message?.photo) && message.photo.length) {
    const photo = [...message.photo].sort((a, b) => (b.file_size || 0) - (a.file_size || 0))[0];
    return {
      kind: "photo",
      file_id: photo.file_id,
      fallback_ext: ".jpg",
      width: photo.width,
      height: photo.height,
      file_size: photo.file_size,
    };
  }

  if (message?.video?.file_id) {
    return {
      kind: "video",
      file_id: message.video.file_id,
      fallback_ext: ".mp4",
      width: message.video.width,
      height: message.video.height,
      duration: message.video.duration,
      file_size: message.video.file_size,
      mime_type: message.video.mime_type,
      file_name: message.video.file_name,
    };
  }

  if (message?.document?.file_id) {
    const mime = String(message.document.mime_type || "");
    const name = String(message.document.file_name || "");
    const isImage = mime.startsWith("image/");
    const isVideo = mime.startsWith("video/");
    if (!isImage && !isVideo) return null;
    return {
      kind: isVideo ? "video" : "photo",
      file_id: message.document.file_id,
      fallback_ext: path.extname(name) || (isVideo ? ".mp4" : ".jpg"),
      file_size: message.document.file_size,
      mime_type: message.document.mime_type,
      file_name: message.document.file_name,
    };
  }

  return null;
}

async function saveTelegramInboxMessage(update) {
  const message = update.message || update.edited_message;
  const text = (message?.text || message?.caption || "").trim();
  const media = pickTelegramMedia(message);
  if (!text && !media) return null;
  if (String(message.chat?.id) !== String(chatId)) return null;
  if (message.from?.is_bot) return null;

  fs.mkdirSync(inboxDir, { recursive: true });
  const messageId = message.message_id || "unknown";
  const fileName = `${String(update.update_id).padStart(12, "0")}-${safeId(messageId)}.json`;
  const filePath = path.join(inboxDir, fileName);
  if (fs.existsSync(filePath)) return { filePath, duplicate: true };

  const payload = {
    status: "new",
    source: "telegram",
    update_id: update.update_id,
    message_id: message.message_id,
    chat_id: message.chat?.id,
    from: {
      id: message.from?.id,
      first_name: message.from?.first_name,
      last_name: message.from?.last_name,
      username: message.from?.username,
    },
    text,
    media_type: media?.kind,
    received_at: new Date((message.date || Math.floor(Date.now() / 1000)) * 1000).toISOString(),
    saved_at: new Date().toISOString(),
  };

  if (media) {
    const localBaseName = `${String(update.update_id).padStart(12, "0")}-${safeId(messageId)}-${media.kind}`;
    payload.media = {
      ...media,
      ...(await downloadTelegramFile(media.file_id, localBaseName, media.fallback_ext)),
    };
    payload.posting_instruction = "Publish this Telegram creative directly as one Facebook post after preparing Malay caption, CTA, first comment, and report. Do not create draft approval unless explicitly requested.";
  }

  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
  return { filePath, duplicate: false, payload };
}

async function facebookPostDetails(postId) {
  if (!postId) return {};
  const facebookEnv = readEnv(facebookEnvPath);
  const accessToken = facebookEnv.FACEBOOK_PAGE_ACCESS_TOKEN;
  if (!accessToken) return {};

  const url = new URL(`https://graph.facebook.com/v21.0/${postId}`);
  url.searchParams.set("fields", "id,created_time,permalink_url,is_published,status_type");
  url.searchParams.set("access_token", accessToken);

  try {
    const response = await fetch(url);
    const json = await response.json();
    if (!response.ok || json.error) return { error: json.error?.message || JSON.stringify(json.error || json) };
    return json;
  } catch (error) {
    return { error: String(error?.message || error) };
  }
}

const env = readEnv(telegramEnvPath);
const token = env.TELEGRAM_BOT_TOKEN;
const chatId = env.TELEGRAM_CHAT_ID;

if (!token || !chatId) {
  console.error("Telegram is not configured yet.");
  process.exit(2);
}

const state = readState();
const url = `https://api.telegram.org/bot${token}/getUpdates?timeout=0&offset=${state.offset || 0}`;
const response = await fetch(url);
const updates = await response.json();
if (!updates.ok) throw new Error(JSON.stringify(updates));

let maxUpdateId = state.offset ? state.offset - 1 : 0;

for (const update of updates.result) {
  if (update.update_id > maxUpdateId) maxUpdateId = update.update_id;

  const savedMessage = await saveTelegramInboxMessage(update);
  if (savedMessage && !savedMessage.duplicate) {
    await telegram("sendMessage", {
      chat_id: chatId,
      text: [
        savedMessage.payload.media ? "Creative diterima dan disambungkan ke chat Codex ini." : "Mesej diterima dan disambungkan ke chat Codex ini.",
        "",
        savedMessage.payload.media ? `Media: ${savedMessage.payload.media_type}` : `Arahan/pertanyaan: ${savedMessage.payload.text}`,
        savedMessage.payload.text ? `Nota/caption asal: ${savedMessage.payload.text}` : "",
        "",
        savedMessage.payload.media
          ? "Satu creative = satu post. Aku akan sediakan caption + CTA, publish, kemudian bagi report."
          : "Aku akan proses dalam thread Codex yang sama.",
      ].filter(Boolean).join("\n"),
      reply_to_message_id: savedMessage.payload.message_id,
      disable_web_page_preview: true,
    });
  }

  const callback = update.callback_query;
  if (!callback?.data) continue;

  const [action, draftId] = callback.data.split(":");
  await answerCallback(callback.id);

  if (action === "reject") {
    const paths = draftPaths(draftId);
    if (paths.status !== "pending_approval") {
      await telegram("sendMessage", {
        chat_id: chatId,
        text: `Reject ignored: draft ${draftId} status sekarang ialah ${paths.status}. Aku tak ubah draft ini.`,
      });
      continue;
    }
    updateManifest(paths, {
      status: "rejected",
      rejected_at: new Date().toISOString(),
    });
    await telegram("sendMessage", {
      chat_id: chatId,
      text: [
        "Reject diterima.",
        "",
        `Draft: ${draftId}`,
        "Status: rejected",
        "Apa jadi lepas reject: draft ini tidak akan dipost ke Facebook. Ia disimpan sebagai rekod sahaja.",
      ].join("\n"),
    });
    continue;
  }

  if (action === "edit") {
    const paths = draftPaths(draftId);
    if (paths.status !== "pending_approval") {
      await telegram("sendMessage", {
        chat_id: chatId,
        text: `Edit ignored: draft ${draftId} status sekarang ialah ${paths.status}. Aku tak ubah draft ini.`,
      });
      continue;
    }
    updateManifest(paths, {
      status: "edit_requested",
      edit_requested_at: new Date().toISOString(),
    });
    await telegram("sendMessage", {
      chat_id: chatId,
      text: [
        "Edit diterima.",
        "",
        `Draft: ${draftId}`,
        "Status: edit_requested",
        "Apa jadi lepas edit: draft ini tidak dipost lagi. Reply perubahan yang kau nak, kemudian aku akan buat versi baru untuk approval semula.",
      ].join("\n"),
    });
    continue;
  }

  if (action !== "approve") continue;

  const paths = draftPaths(draftId);
  if (paths.status !== "pending_approval") {
    await telegram("sendMessage", {
      chat_id: chatId,
      text: `Approved, tapi draft ${draftId} status sekarang ialah ${paths.status}. Aku tak post draft ini.`,
    });
    continue;
  }

  if (!paths.caption || !fs.existsSync(paths.caption) || !paths.photo || !fs.existsSync(paths.photo)) {
    await telegram("sendMessage", {
      chat_id: chatId,
      text: [
        "Approve diterima, tapi draft file tak lengkap.",
        "",
        `Draft: ${draftId}`,
        "Status: belum dipost",
        "Apa jadi lepas approve: aku cuba publish, tapi caption/photo file tak cukup. Perlu regenerate draft.",
      ].join("\n"),
    });
    continue;
  }

  await telegram("sendMessage", {
    chat_id: chatId,
    text: [
      "Approve diterima.",
      "",
      `Draft: ${draftId}`,
      "Status: sedang publish ke Facebook Page...",
      "Lepas publish siap, aku akan hantar link post di sini.",
    ].join("\n"),
  });

  const result = spawnSync(
    path.join(workspaceDir, "facebook-posts", "post_to_facebook.sh"),
    [paths.caption, paths.photo, paths.comment],
    { cwd: workspaceDir, encoding: "utf8" },
  );

  if (result.status === 0) {
    let facebookPostId = "";
    let facebookCommentId = "";
    let isFirstJson = true;
    for (const line of result.stdout.split(/\r?\n/)) {
      if (!line.trim().startsWith("{")) continue;
      try {
        const json = JSON.parse(line);
        if (isFirstJson && (json.post_id || json.id)) facebookPostId = json.post_id || json.id;
        if (!isFirstJson && json.id) facebookCommentId = json.id;
        isFirstJson = false;
      } catch {}
    }
    const details = await facebookPostDetails(facebookPostId);
    updateManifest(paths, {
      status: "posted",
      facebook_post_id: facebookPostId || undefined,
      facebook_comment_id: facebookCommentId || undefined,
      facebook_permalink_url: details.permalink_url || undefined,
      facebook_is_published: details.is_published,
      facebook_status_type: details.status_type || undefined,
      posted_at: new Date().toISOString(),
    });

    await telegram("sendMessage", {
      chat_id: chatId,
      text: [
        "Publish berjaya.",
        "",
        `Draft: ${draftId}`,
        `Facebook status: ${details.is_published === false ? "created tapi belum public" : "published"}`,
        facebookPostId ? `Post ID: ${facebookPostId}` : "",
        facebookCommentId ? `Comment ID: ${facebookCommentId}` : "",
        details.permalink_url ? `Link post: ${details.permalink_url}` : "",
        details.error ? `Nota: post berjaya, tapi permalink tak dapat dibaca: ${details.error}` : "",
        "",
        "Apa jadi lepas approve: caption + poster dipost ke Facebook Page, kemudian CTA comment pertama ditambah.",
      ].filter(Boolean).join("\n"),
      disable_web_page_preview: true,
    });
  } else {
    await telegram("sendMessage", {
      chat_id: chatId,
      text: [
        "Approve diterima, tapi publish gagal.",
        "",
        `Draft: ${draftId}`,
        "Status: masih belum dipost",
        "Apa jadi lepas approve: aku cuba publish ke Facebook, tapi Facebook/API reject.",
        "",
        (result.stderr || result.stdout).slice(0, 1000),
      ].join("\n"),
    });
  }
}

writeState({ offset: maxUpdateId + 1 });
