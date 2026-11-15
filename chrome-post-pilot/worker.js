importScripts("threads-autopost.js", "facebook-autopost.js");

const APP = "https://buddypilot.vercel.app";
const PLATFORMS = { facebook: "https://www.facebook.com/", threads: "https://www.threads.com/" };
const ALARM = "post-pilot";
let busy = false;

async function badge(text, title) {
  await chrome.action.setBadgeText({ text });
  await chrome.action.setTitle({ title: "Post Pilot: " + title });
  await chrome.storage.local.set({ status: title });
}

async function syncAlarm(updateStatus = true) {
  const { enabled } = await chrome.storage.local.get("enabled");
  if (enabled) {
    const alarm = await chrome.alarms.get(ALARM);
    if (alarm?.periodInMinutes !== 0.5) await chrome.alarms.create(ALARM, { periodInMinutes: 0.5 });
    if (updateStatus) await badge("ON", "menunggu draf");
  } else {
    await chrome.alarms.clear(ALARM);
    if (updateStatus) await badge("", "tidak aktif");
  }
}

async function queue(tabId, body) {
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId },
    args: [body, APP],
    func: async (payload, origin) => {
      if (location.origin !== origin || location.pathname === "/login") return null;
      const response = await fetch("/api/post-pilot-queue", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload), signal: AbortSignal.timeout(12000),
      });
      return response.ok ? response.json() : { status: response.status };
    },
  });
  return result;
}

async function prepare(tabId, platform, parts) {
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId }, args: [platform, parts, new URL(PLATFORMS[platform]).origin],
    func: async (site, parts, origin) => {
      if (location.origin !== origin) return "failed";
      const content = parts[0];
      const visible = (element) => Boolean(element.getClientRects().length && getComputedStyle(element).visibility !== "hidden");
      const dialogs = () => [...document.querySelectorAll('[role="dialog"]')].filter(visible);
      const labels = site === "facebook"
        ? /^(what.s on your mind|apa yang anda fikirkan)([?,].*)?$/i
        : /^(start a thread|new thread|what.s new|mulakan thread|thread baharu)[?.]?$/i;
      let openedComposer = false;
      if (!dialogs().length) {
        const candidates = [...document.querySelectorAll('button,[role="button"]')].filter((element) =>
          visible(element) && labels.test((element.getAttribute("aria-label") || element.textContent || "").trim()));
        if (candidates.length === 1) {
          candidates[0].click();
          openedComposer = true;
        }
      }
      let filled = false;
      for (let i = 0; openedComposer && i < 16; i++) {
        const open = dialogs();
        const fields = open.length === 1
          ? [...open[0].querySelectorAll('[contenteditable="true"][role="textbox"], [contenteditable="true"][data-lexical-editor]')].filter(visible)
          : [];
        if (fields.length === 1 && !fields[0].textContent.trim()) {
          fields[0].focus();
          document.execCommand("insertText", false, content);
          filled = (fields[0].innerText || "").trim().replace(/\r\n/g, "\n") === content;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
      const panel = document.createElement("aside");
      Object.assign(panel.style, { position: "fixed", top: "12px", right: "12px", width: "min(380px, calc(100vw - 32px))", zIndex: 2147483647, background: "#fff", color: "#17212a", padding: "12px", border: "1px solid #aab6c2", borderRadius: "8px", boxSizing: "border-box" });
      const info = document.createElement("p");
      info.textContent = parts.length > 1
        ? (filled ? "Bahagian pertama diisi. " : "") + "Salin bahagian seterusnya mengikut turutan ke ruang thread sebelum Publish."
        : filled ? "Draf BuddyPilot diisi. Semak profil dan teks sebelum tekan Publish." : "Composer tidak dapat disahkan. Semak profil yang betul, kemudian salin draf secara manual.";
      const draft = document.createElement("textarea");
      draft.readOnly = true;
      draft.rows = 5;
      draft.value = content;
      draft.setAttribute("aria-label", "Draf BuddyPilot");
      draft.style.width = "100%";
      const close = document.createElement("button");
      close.type = "button";
      close.textContent = "Tutup";
      close.onclick = () => panel.remove();
      const copy = document.createElement("button");
      copy.type = "button";
      copy.textContent = "Salin draf";
      copy.onclick = async () => {
        try { await navigator.clipboard.writeText(draft.value); copy.textContent = "Disalin"; }
        catch { draft.focus(); draft.select(); }
      };
      panel.append(info);
      if (parts.length > 1) {
        const select = document.createElement("select");
        select.setAttribute("aria-label", "Bahagian thread");
        parts.forEach((_, index) => select.add(new Option("Bahagian " + (index + 1) + " / " + parts.length, String(index))));
        select.onchange = () => { draft.value = parts[Number(select.value)]; copy.textContent = "Salin draf"; };
        panel.append(select);
      }
      panel.append(draft, copy, close);
      document.body.append(panel);
      return filled ? "review" : "copy";
    },
  });
  return result || "failed";
}

async function waitForTab(tabId) {
  for (let i = 0; i < 30; i++) {
    if ((await chrome.tabs.get(tabId)).status === "complete") return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Tab load timeout");
}

async function fetchThreadsPhoto(url) {
  if (!/^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\/postpilot\/[A-Za-z0-9._-]+$/.test(url)) throw new Error("Invalid photo URL");
  const response = await fetch(url, { credentials: "omit", redirect: "error", signal: AbortSignal.timeout(12000) });
  const type = (response.headers.get("content-type") || "").split(";")[0].trim();
  const max = 4 * 1024 * 1024;
  if (!response.ok || !response.body || !["image/jpeg", "image/png"].includes(type) ||
      Number(response.headers.get("content-length")) > max) throw new Error("Invalid photo response");
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > max) {
      await reader.cancel();
      throw new Error("Photo exceeds size limit");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  const signature = type === "image/jpeg" ? [255, 216, 255] : [137, 80, 78, 71, 13, 10, 26, 10];
  if (size < 1000 || !signature.every((byte, index) => bytes[index] === byte)) throw new Error("Invalid photo bytes");
  let binary = "";
  for (let i = 0; i < bytes.length; i += 16384) binary += String.fromCharCode(...bytes.subarray(i, i + 16384));
  return { type, base64: btoa(binary) };
}

async function poll() {
  if (busy) return;
  busy = true;
  try {
    const { enabled, reviewTabId, threadsUsername, facebookName } = await chrome.storage.local.get(["enabled", "reviewTabId", "threadsUsername", "facebookName"]);
    if (!enabled) return;
    const reviewOpen = Boolean(reviewTabId && await chrome.tabs.get(reviewTabId).catch(() => null));
    if (reviewOpen && !threadsUsername && !facebookName) return await badge("1", "Semak draf dan tutup tab untuk draf seterusnya");
    const tabs = await chrome.tabs.query({ url: APP + "/*" });
    const app = tabs.find((tab) => new URL(tab.url).pathname === "/" && tab.status === "complete");
    if (!app) return await badge("!", "buka BuddyPilot dan log masuk");
    const claimed = await queue(app.id, { action: "claim", multipart: true, autoThreads: Boolean(threadsUsername), threadsImages: true, autoFacebook: Boolean(facebookName), autoOnly: reviewOpen });
    if (!claimed?.ok) return await badge("!", claimed?.status === 503 ? "Giliran Supabase belum tersedia" : "Semak sesi atau sambungan BuddyPilot");
    if (!claimed.job) return await badge("ON", threadsUsername || facebookName ? "menunggu draf" : "Tetapkan akaun untuk auto-post");
    const { id, platform, content, parts, autoPost, image } = claimed.job;
    let state = "failed";
    try {
      if (!Object.hasOwn(PLATFORMS, platform)) throw new Error("Unknown platform");
      if (autoPost && !(platform === "threads" ? threadsUsername : facebookName)) throw new Error("Profile missing");
      const photo = image ? await fetchThreadsPhoto(image) : null;
      const tab = await chrome.tabs.create({ url: PLATFORMS[platform] });
      if (!autoPost) await chrome.storage.local.set({ reviewTabId: tab.id });
      await waitForTab(tab.id);
      if (autoPost) {
        // Injection failures can occur after clicking Post; never retry them.
        state = "uncertain";
        const [{ result }] = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: platform === "threads" ? publishThreadsInChrome : publishFacebookInChrome,
          args: platform === "threads" ? [parts, threadsUsername, photo] : [content, facebookName],
        });
        state = ["posted", "failed", "uncertain"].includes(result) ? result : "uncertain";
      } else state = await prepare(tab.id, platform, parts || [content]);
    } finally {
      await queue(app.id, { action: "finish", id, state });
      const labels = {
        posted: "Post sudah diterbitkan",
        uncertain: "Status publish tidak pasti. Jangan hantar semula sebelum semak.",
        failed: "Tidak dipost. Semak akaun, ruang tulis atau lampiran di Chrome.",
      };
      await badge(state === "posted" ? "OK" : labels[state] ? "!" : "1", labels[state] || "Semak draf dan tutup tab untuk draf seterusnya");
    }
  } catch {
    await badge("!", "tidak dapat menyediakan draf");
  } finally {
    busy = false;
  }
}

chrome.runtime.onInstalled.addListener(() => { void syncAlarm(); });
chrome.runtime.onStartup.addListener(() => { void syncAlarm(); });
chrome.alarms.onAlarm.addListener((alarm) => { if (alarm.name === ALARM) void poll(); });
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (message?.action === "wake" && sender.frameId === 0 && sender.url && new URL(sender.url).origin === APP) {
    void syncAlarm(false).then(poll).catch(() => {});
    return;
  }
  if (sender.url !== chrome.runtime.getURL("popup.html")) return;
  (async () => {
    if (message.action === "toggle") {
      const { enabled } = await chrome.storage.local.get("enabled");
      await chrome.storage.local.set({ enabled: !enabled });
      await syncAlarm();
      if (!enabled) await poll();
    } else if (message.action === "check") {
      await syncAlarm();
      await poll();
    } else if (message.action === "status") {
      const { enabled } = await chrome.storage.local.get("enabled");
      if (enabled && !await chrome.alarms.get(ALARM)) await syncAlarm();
    }
    if (message.action === "threads-account") {
      const threadsUsername = String(message.username || "").trim().replace(/^@/, "").toLowerCase();
      if (threadsUsername && !/^[\w.]{1,30}$/.test(threadsUsername)) {
        respond({ error: "Username Threads tidak sah." });
        return;
      }
      await chrome.storage.local.set({ threadsUsername });
      await syncAlarm();
    }
    if (message.action === "facebook-account") {
      const facebookName = String(message.name || "").replace(/\s+/gu, " ").trim();
      if (facebookName.length > 100) {
        respond({ error: "Nama profil Facebook terlalu panjang." });
        return;
      }
      await chrome.storage.local.set({ facebookName });
      await syncAlarm();
    }
    respond(await chrome.storage.local.get(["enabled", "status", "threadsUsername", "facebookName"]));
  })().catch(() => respond({ error: "Chrome tidak dapat menyemak extension." }));
  return true;
});
