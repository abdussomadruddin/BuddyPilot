const APP = "https://buddypilot.vercel.app";
const PLATFORMS = { facebook: "https://www.facebook.com/", threads: "https://www.threads.com/" };
const ALARM = "post-pilot";
let busy = false;

async function badge(text, title) {
  await chrome.action.setBadgeText({ text });
  await chrome.action.setTitle({ title: "Post Pilot: " + title });
  await chrome.storage.local.set({ status: title });
}

async function syncAlarm() {
  const { enabled } = await chrome.storage.local.get("enabled");
  if (enabled) {
    if (!await chrome.alarms.get(ALARM)) await chrome.alarms.create(ALARM, { periodInMinutes: 2 });
    await badge("ON", "menunggu draf");
  } else {
    await chrome.alarms.clear(ALARM);
    await badge("", "tidak aktif");
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

async function prepare(tabId, platform, text) {
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId }, args: [platform, text, new URL(PLATFORMS[platform]).origin],
    func: async (site, content, origin) => {
      if (location.origin !== origin) return "failed";
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
      info.textContent = filled ? "Draf BuddyPilot diisi. Semak profil dan teks sebelum tekan Publish." : "Composer tidak dapat disahkan. Semak profil yang betul, kemudian salin draf secara manual.";
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
        try { await navigator.clipboard.writeText(content); copy.textContent = "Disalin"; }
        catch { draft.focus(); draft.select(); }
      };
      panel.append(info, draft, copy, close);
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

async function poll() {
  if (busy) return;
  busy = true;
  try {
    const { enabled, reviewTabId } = await chrome.storage.local.get(["enabled", "reviewTabId"]);
    if (!enabled) return;
    if (reviewTabId && await chrome.tabs.get(reviewTabId).catch(() => null)) return await badge("1", "Semak draf dan tutup tab untuk draf seterusnya");
    const tabs = await chrome.tabs.query({ url: APP + "/*" });
    const app = tabs.find((tab) => new URL(tab.url).pathname === "/" && tab.status === "complete");
    if (!app) return await badge("!", "buka BuddyPilot dan log masuk");
    const claimed = await queue(app.id, { action: "claim" });
    if (!claimed?.ok) return await badge("!", claimed?.status === 503 ? "Giliran Supabase belum tersedia" : "Semak sesi atau sambungan BuddyPilot");
    if (!claimed.job) return await badge("ON", "menunggu draf");
    const { id, platform, content } = claimed.job;
    let state = "failed";
    try {
      if (!Object.hasOwn(PLATFORMS, platform)) throw new Error("Unknown platform");
      const tab = await chrome.tabs.create({ url: PLATFORMS[platform] });
      await chrome.storage.local.set({ reviewTabId: tab.id });
      await waitForTab(tab.id);
      state = await prepare(tab.id, platform, content);
    } finally {
      await queue(app.id, { action: "finish", id, state });
      await badge(state === "failed" ? "!" : "1", state === "failed" ? "draf gagal disediakan" : "semak draf, kemudian tutup tab untuk draf seterusnya");
    }
  } catch {
    await badge("!", "tidak dapat menyediakan draf");
  } finally {
    busy = false;
  }
}

chrome.runtime.onInstalled.addListener(syncAlarm);
chrome.runtime.onStartup.addListener(syncAlarm);
chrome.alarms.onAlarm.addListener((alarm) => { if (alarm.name === ALARM) void poll(); });
chrome.runtime.onMessage.addListener((message, sender, respond) => {
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
    respond(await chrome.storage.local.get(["enabled", "status"]));
  })().catch(() => respond({ error: "Chrome tidak dapat menyemak extension." }));
  return true;
});
