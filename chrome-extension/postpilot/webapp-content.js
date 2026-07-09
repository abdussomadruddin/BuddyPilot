window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  const data = event.data;
  if (!data || data.source !== "postpilot-webapp" || data.type !== "POSTPILOT_SAVE_DRAFT") return;

  chrome.runtime.sendMessage({
    type: "SAVE_DRAFT_AND_OPEN_FACEBOOK",
    draft: data.draft,
  }, (response) => {
    window.postMessage({
      source: "postpilot-extension",
      type: "POSTPILOT_DRAFT_STATUS",
      ok: Boolean(response?.ok),
      error: response?.error || "",
    }, window.location.origin);
  });
});
