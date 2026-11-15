importScripts("threads-autopost.js", "facebook-autopost.js", "profile-learning.js");

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
    // Run as the BuddyPilot page so Chrome sends its SameSite=Strict session.
    world: "MAIN",
    args: [body, APP],
    func: async (payload, origin) => {
      if (location.origin !== origin || location.pathname === "/login") return null;
      const response = await fetch("/api/post-pilot-queue", {
        method: "POST", credentials: "same-origin", redirect: "error",
        headers: { "content-type": "application/json" }, body: JSON.stringify(payload), signal: AbortSignal.timeout(12000),
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

async function fetchPostPhoto(url) {
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
    void dailyLearning(app.id);
    const claimed = await queue(app.id, { action: "claim", autoThreads: Boolean(threadsUsername), threadsImages: true, facebookImages: true, autoFacebook: Boolean(facebookName), autoOnly: true });
    if (!claimed?.ok) {
      const issue = {
        401: "Sesi BuddyPilot tamat. Log masuk semula.",
        403: "BuddyPilot menolak permintaan giliran (403).",
        503: "Giliran Supabase belum tersedia",
      }[claimed?.status];
      return await badge("!", issue || "Semak sesi atau sambungan BuddyPilot");
    }
    if (!claimed.job) return;
    const { id, platform, content, parts, autoPost, image } = claimed.job;
    let state = "failed";
    let reason = "tab";
    try {
      reason = "profile";
      if (!autoPost || !Object.hasOwn(PLATFORMS, platform) || !(platform === "threads" ? threadsUsername : facebookName)) return;
      reason = image ? "image" : "tab";
      const photo = image ? await fetchPostPhoto(image) : null;
      reason = "tab";
      const tab = await chrome.tabs.create({ url: PLATFORMS[platform] });
      await waitForTab(tab.id);
      // Injection failures can occur after clicking Post; never retry them.
      state = "uncertain";
      const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: platform === "threads" ? publishThreadsInChrome : publishFacebookInChrome,
        args: platform === "threads" ? [parts, threadsUsername, photo] : [content, facebookName, photo],
      });
      if (typeof result === "string" && result.startsWith("failed:")) {
        state = "failed";
        reason = result.slice(7);
      } else if (result === "posted") state = "posted";
    } catch {
      // Keep the last known stage, with no automatic retries.
    } finally {
      const finished = await queue(app.id, { action: "finish", id, state, ...(state === "failed" ? { reason } : {}) }).catch(() => null);
      const labels = {
        posted: "Post sudah diterbitkan",
        uncertain: "Status publish tidak pasti. Jangan hantar semula sebelum semak.",
        failed: "Tidak dipost. Peringkat: " + ({
          tab: "buka tab", profile: "semak profil", composer: "buka ruang tulis", text: "isi teks",
          thread_part: "tambah bahagian thread", image: "lampirkan gambar", next: "langkah Next", post_button: "butang Post",
        }[reason] || "tidak diketahui"),
      };
      await badge(finished?.ok && state === "posted" ? "OK" : "!", finished?.ok
        ? labels[state]
        : "Keputusan publish gagal direkod. " + labels[state]);
    }
  } catch {
    await badge("!", "tidak dapat menyediakan draf");
  } finally {
    busy = false;
  }
}

async function collectLearningPosts() {
  const { threadsUsername, facebookName } = await chrome.storage.local.get(["threadsUsername", "facebookName"]);
  const profiles = [
    ["facebook", facebookName, PLATFORMS.facebook + "me"],
    ["threads", threadsUsername, PLATFORMS.threads + "@" + encodeURIComponent(threadsUsername || "")],
  ];
  const cutoff = Date.now() - 30 * 86400000;
  const posts = [];
  const notes = [];
  for (const [platform, owner, url] of profiles) {
    const label = platform === "facebook" ? "Facebook personal" : "Threads";
    if (!owner) { notes.push(label + ": tetapkan profil dalam extension."); continue; }
    let tab;
    try {
      // Facebook lays out its visible timestamp glyphs in the foreground.
      tab = await chrome.tabs.create({ url, active: platform === "facebook" });
      await waitForTab(tab.id);
      const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id }, func: scanLearningProfile, args: [platform, owner, cutoff],
      });
      if (result?.posts?.length) posts.push(...result.posts);
      else notes.push(label + ": " + (result?.error || "Tiada post bertarikh dalam 30 hari dapat dibaca."));
    } catch {
      notes.push(label + ": profil gagal dibaca di Chrome.");
    } finally {
      if (tab) await chrome.tabs.remove(tab.id).catch(() => {});
    }
  }
  return { posts, notes };
}

// Once a day, while Chrome and BuddyPilot are open, read the owner's own
// profiles and send the posts and their engagement to BuddyPilot so Post Pilot
// learns without anyone pressing a button. It only reads; it never posts.
const LEARN_EVERY = 20 * 60 * 60 * 1000;
async function dailyLearning(tabId) {
  const { lastAutoLearn = 0 } = await chrome.storage.local.get("lastAutoLearn");
  if (learningScan || Date.now() - lastAutoLearn < LEARN_EVERY) return;
  await chrome.storage.local.set({ lastAutoLearn: Date.now() });
  try {
    learningScan = collectLearningPosts();
    const { posts } = await learningScan;
    if (!posts.length) return;
    await chrome.scripting.executeScript({
      target: { tabId }, world: "MAIN", args: [posts, APP],
      func: async (items, origin) => {
        if (location.origin !== origin || location.pathname === "/login") return null;
        const response = await fetch("/api/storytelling", {
          method: "POST", credentials: "same-origin", redirect: "error",
          headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "learn.chrome", posts: items, auto: true }),
          signal: AbortSignal.timeout(240000),
        });
        return response.ok;
      },
    });
  } catch {
    // The next day's run tries again.
  } finally {
    learningScan = null;
  }
}

let learningScan;
chrome.runtime.onInstalled.addListener(() => { void syncAlarm(); });
chrome.runtime.onStartup.addListener(() => { void syncAlarm(); });
chrome.alarms.onAlarm.addListener((alarm) => { if (alarm.name === ALARM) void poll(); });
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (message?.action === "learn" && sender.frameId === 0 && sender.url && new URL(sender.url).origin === APP) {
    learningScan ||= collectLearningPosts().finally(() => { learningScan = null; });
    learningScan.then(respond, () => respond({ error: "Chrome gagal menyemak profil." }));
    return true;
  }
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
      await syncAlarm(false);
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
