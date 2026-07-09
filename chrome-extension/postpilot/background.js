const FACEBOOK_HOME_URL = "https://www.facebook.com/";

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0] || null;
}

async function sendToActiveFacebookTab(type) {
  const tab = await getActiveTab();
  if (!tab?.id) throw new Error("No active tab found.");
  if (!/^https:\/\/(www\.)?facebook\.com\//.test(tab.url || "")) {
    throw new Error("Open a Facebook tab first.");
  }
  return chrome.tabs.sendMessage(tab.id, { type });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    if (message?.type === "SAVE_DRAFT_AND_OPEN_FACEBOOK") {
      const draft = message.draft;
      if (!draft?.postText || !draft?.commentCta) throw new Error("Draft is missing post or CTA text.");
      await chrome.storage.local.set({ currentDraft: draft });
      await chrome.tabs.create({ url: FACEBOOK_HOME_URL });
      sendResponse({ ok: true });
      return;
    }

    if (message?.type === "GET_CURRENT_DRAFT") {
      const { currentDraft } = await chrome.storage.local.get("currentDraft");
      sendResponse({ ok: true, draft: currentDraft || null });
      return;
    }

    if (message?.type === "OPEN_FACEBOOK") {
      await chrome.tabs.create({ url: FACEBOOK_HOME_URL });
      sendResponse({ ok: true });
      return;
    }

    if (message?.type === "FILL_ACTIVE_POST" || message?.type === "FILL_ACTIVE_COMMENT") {
      const result = await sendToActiveFacebookTab(message.type === "FILL_ACTIVE_POST"
        ? "POSTPILOT_FILL_POST"
        : "POSTPILOT_FILL_COMMENT");
      sendResponse(result || { ok: true });
      return;
    }

    sendResponse({ ok: false, error: "Unknown message." });
  })().catch((error) => {
    sendResponse({ ok: false, error: error?.message || String(error) });
  });

  return true;
});
