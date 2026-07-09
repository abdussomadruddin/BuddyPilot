const FACEBOOK_HOME_URL = "https://www.facebook.com/";
const FACEBOOK_URL_PATTERN = /^https:\/\/(www\.)?facebook\.com\//;
const THREADS_HOME_URL = "https://www.threads.com/";
const THREADS_URL_PATTERN = /^https:\/\/(www\.)?threads\.(com|net)\//;
const THREADS_LAUNCH_KEY = "postpilotThreadsLaunchAutomationId";
const THREADS_STARTED_KEY = "postpilotThreadsStartedAutomationId";
const THREADS_COMPLETED_KEY = "postpilotThreadsCompletedAutomationId";
const THREADS_RUN_LOCK_KEY = "postpilotThreadsRunLock";

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0] || null;
}

async function sendToActiveFacebookTab(type) {
  const tab = await getActiveTab();
  if (!tab?.id) throw new Error("No active tab found.");
  if (!FACEBOOK_URL_PATTERN.test(tab.url || "")) {
    throw new Error("Open a Facebook tab first.");
  }
  return chrome.tabs.sendMessage(tab.id, { type });
}

async function sendToTabWithRetry(tabId, type, label) {
  let lastError = "";
  for (let attempt = 0; attempt < 90; attempt += 1) {
    try {
      const response = await chrome.tabs.sendMessage(tabId, { type });
      if (response?.ok) return response;
      if (/sedang jalan|already running/i.test(response?.error || "")) return { ok: true, message: response.error };
      lastError = response?.error || `${label} content script belum ready.`;
    } catch (error) {
      lastError = error?.message || String(error);
    }
    await chrome.storage.local.set({ postpilotAutomationStatus: `Waiting ${label} content script... attempt ${attempt + 1}` });
    await delay(1000);
  }
  throw new Error(lastError || "Post Pilot content script tidak respond.");
}

async function sendToFacebookTabWithRetry(tabId, type) {
  return sendToTabWithRetry(tabId, type, "Facebook");
}

async function sendToThreadsTabWithRetry(tabId, type) {
  return sendToTabWithRetry(tabId, type, "Threads");
}

async function openFacebookAndRunAutomation() {
  await chrome.storage.local.set({ postpilotAutomationStatus: "Opening Facebook..." });
  const tab = await chrome.tabs.create({ url: FACEBOOK_HOME_URL, active: true });
  if (!tab?.id) throw new Error("Gagal buka tab Facebook.");
  await chrome.storage.local.set({ postpilotAutomationStatus: "Facebook opened. Starting auto flow..." });
  await chrome.storage.local.set({ postpilotAutomationStatus: "Starting auto flow in Facebook..." });
  const response = await sendToFacebookTabWithRetry(tab.id, "POSTPILOT_AUTO_POST");
  await chrome.storage.local.set({ postpilotAutomationStatus: "Facebook auto flow started. Threads akan mula selepas Facebook post live." });
  return response;
}

async function openThreadsAndRunAutomation(automationId = "", command = "POSTPILOT_THREADS_AUTO_POST") {
  const state = await chrome.storage.local.get([THREADS_LAUNCH_KEY, THREADS_COMPLETED_KEY]);
  if (automationId && (state[THREADS_LAUNCH_KEY] === automationId || state[THREADS_COMPLETED_KEY] === automationId)) {
    return { ok: true, message: "Threads flow already started or completed." };
  }

  try {
    const isTextOnly = command === "POSTPILOT_THREADS_TEXT_ONLY_POST";
    await chrome.storage.local.set({
      [THREADS_LAUNCH_KEY]: automationId || `threads-${Date.now()}`,
      postpilotAutomationStatus: isTextOnly ? "Opening Threads viral post..." : "Facebook post live. Opening Threads...",
      postpilotLastError: "",
    });
    const tab = await chrome.tabs.create({ url: THREADS_HOME_URL, active: true });
    if (!tab?.id) throw new Error("Gagal buka tab Threads.");
    await chrome.storage.local.set({ postpilotAutomationStatus: isTextOnly ? "Starting Threads text-only flow..." : "Starting auto flow in Threads..." });
    const response = await sendToThreadsTabWithRetry(tab.id, command);
    await chrome.storage.local.set({ postpilotAutomationStatus: isTextOnly ? "Threads text-only flow started." : "Threads auto flow started." });
    return response;
  } catch (error) {
    await chrome.storage.local.remove(THREADS_LAUNCH_KEY).catch(() => {});
    throw error;
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    if (message?.type === "SAVE_DRAFT_AND_OPEN_FACEBOOK") {
      const draft = {
        ...message.draft,
        automationId: message.draft?.automationId || `postpilot-auto-${Date.now()}`,
        autoPublish: true,
      };
      if (!draft?.postText) throw new Error("Draft is missing post text.");
      await chrome.storage.local.set({
        currentDraft: draft,
        postpilotStartedAutomationId: "",
        postpilotCompletedAutomationId: "",
        [THREADS_LAUNCH_KEY]: "",
        [THREADS_STARTED_KEY]: "",
        [THREADS_COMPLETED_KEY]: "",
        postpilotRunLock: null,
        [THREADS_RUN_LOCK_KEY]: null,
        postpilotLastError: "",
        postpilotAutomationStatus: "Draft saved. Preparing Facebook...",
      });
      const response = await openFacebookAndRunAutomation();
      sendResponse(response || { ok: true });
      return;
    }

    if (message?.type === "SAVE_THREADS_TEXT_ONLY_AND_OPEN_THREADS") {
      const draft = {
        ...message.draft,
        automationId: message.draft?.automationId || `postpilot-threads-text-${Date.now()}`,
        autoPublish: true,
        threadsTextOnly: true,
      };
      if (!draft?.postText) throw new Error("Draft is missing Threads post text.");
      await chrome.storage.local.set({
        currentDraft: draft,
        [THREADS_LAUNCH_KEY]: "",
        [THREADS_STARTED_KEY]: "",
        [THREADS_COMPLETED_KEY]: "",
        [THREADS_RUN_LOCK_KEY]: null,
        postpilotLastError: "",
        postpilotAutomationStatus: "Draft saved. Preparing Threads...",
      });
      const response = await openThreadsAndRunAutomation(draft.automationId, "POSTPILOT_THREADS_TEXT_ONLY_POST");
      sendResponse(response || { ok: true });
      return;
    }

    if (message?.type === "POSTPILOT_FACEBOOK_DONE") {
      const response = await openThreadsAndRunAutomation(message.automationId || "");
      sendResponse(response || { ok: true });
      return;
    }

    if (message?.type === "POSTPILOT_THREADS_DONE") {
      await chrome.storage.local.set({
        [THREADS_COMPLETED_KEY]: message.automationId || "",
        postpilotAutomationStatus: message.threadsTextOnly ? "Threads viral post selesai." : "Facebook + Threads flow selesai.",
      });
      sendResponse({ ok: true });
      return;
    }

    if (message?.type === "GET_CURRENT_DRAFT") {
      const { currentDraft, postpilotLastError, postpilotAutomationStatus } = await chrome.storage.local.get([
        "currentDraft",
        "postpilotLastError",
        "postpilotAutomationStatus",
      ]);
      sendResponse({
        ok: true,
        draft: currentDraft || null,
        lastError: postpilotLastError || "",
        automationStatus: postpilotAutomationStatus || "",
      });
      return;
    }

    if (message?.type === "OPEN_FACEBOOK") {
      await chrome.tabs.create({ url: FACEBOOK_HOME_URL });
      sendResponse({ ok: true });
      return;
    }

    if (message?.type === "FILL_ACTIVE_POST" || message?.type === "FILL_ACTIVE_COMMENT" || message?.type === "AUTO_POST_ACTIVE") {
      const result = await sendToActiveFacebookTab(message.type === "FILL_ACTIVE_COMMENT"
        ? "POSTPILOT_FILL_COMMENT"
        : message.type === "AUTO_POST_ACTIVE"
          ? "POSTPILOT_AUTO_POST"
          : "POSTPILOT_FILL_POST");
      sendResponse(result || { ok: true });
      return;
    }

    sendResponse({ ok: false, error: "Unknown message." });
  })().catch(async (error) => {
    await chrome.storage.local.set({
      postpilotLastError: error?.message || String(error),
      postpilotAutomationStatus: "Auto flow failed.",
    }).catch(() => {});
    sendResponse({ ok: false, error: error?.message || String(error) });
  });

  return true;
});
