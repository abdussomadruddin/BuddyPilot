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
    const { enabled, threadsUsername, facebookName } = await chrome.storage.local.get(["enabled", "threadsUsername", "facebookName"]);
    if (!enabled) return;
    if (!threadsUsername && !facebookName) return await badge("!", "Tetapkan akaun untuk auto-post");
    const tabs = await chrome.tabs.query({ url: APP + "/*" });
    const app = tabs.find((tab) => new URL(tab.url).pathname === "/" && tab.status === "complete");
    if (!app) return await badge("!", "buka BuddyPilot dan log masuk");
    const claimed = await queue(app.id, { action: "claim", autoThreads: Boolean(threadsUsername), threadsImages: true, autoFacebook: Boolean(facebookName), autoOnly: true });
    if (!claimed?.ok) return await badge("!", claimed?.status === 503 ? "Giliran Supabase belum tersedia" : "Semak sesi atau sambungan BuddyPilot");
    if (!claimed.job) return;
    const { id, platform, content, parts, autoPost, image } = claimed.job;
    let state = "failed";
    let reason = "tab";
    try {
      reason = "profile";
      if (!autoPost || !Object.hasOwn(PLATFORMS, platform) || !(platform === "threads" ? threadsUsername : facebookName)) return;
      reason = image ? "image" : "tab";
      const photo = image ? await fetchThreadsPhoto(image) : null;
      reason = "tab";
      const tab = await chrome.tabs.create({ url: PLATFORMS[platform] });
      await waitForTab(tab.id);
      // Injection failures can occur after clicking Post; never retry them.
      state = "uncertain";
      const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: platform === "threads" ? publishThreadsInChrome : publishFacebookInChrome,
        args: platform === "threads" ? [parts, threadsUsername, photo] : [content, facebookName],
      });
      if (typeof result === "string" && result.startsWith("failed:")) {
        state = "failed";
        reason = result.slice(7);
      } else if (result === "posted") state = "posted";
    } catch {
      // Keep the last known stage, with no automatic retries.
    } finally {
      await queue(app.id, { action: "finish", id, state, ...(state === "failed" ? { reason } : {}) });
      const labels = {
        posted: "Post sudah diterbitkan",
        uncertain: "Status publish tidak pasti. Jangan hantar semula sebelum semak.",
        failed: "Tidak dipost. Peringkat: " + ({
          tab: "buka tab", profile: "semak profil", composer: "buka ruang tulis", text: "isi teks",
          thread_part: "tambah bahagian thread", image: "lampirkan gambar", next: "langkah Next", post_button: "butang Post",
        }[reason] || "tidak diketahui"),
      };
      await badge(state === "posted" ? "OK" : "!", labels[state]);
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
