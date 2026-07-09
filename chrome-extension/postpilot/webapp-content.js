window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  const data = event.data;
  const supportedTypes = ["POSTPILOT_SAVE_DRAFT", "POSTPILOT_THREADS_TEXT_ONLY_DRAFT"];
  if (!data || data.source !== "postpilot-webapp" || !supportedTypes.includes(data.type)) return;

  const runtime = globalThis.chrome?.runtime;
  if (!runtime?.sendMessage) {
    window.postMessage({
      source: "postpilot-extension",
      type: "POSTPILOT_DRAFT_STATUS",
      ok: false,
      error: "Post Pilot extension runtime belum ready. Reload extension dan refresh BuddyPilot.",
    }, window.location.origin);
    return;
  }

  const sendStatus = (ok, error = "", message = "") => {
    window.postMessage({
      source: "postpilot-extension",
      type: "POSTPILOT_DRAFT_STATUS",
      ok,
      error,
      message,
    }, window.location.origin);
  };

  try {
    runtime.sendMessage({
      type: data.type === "POSTPILOT_THREADS_TEXT_ONLY_DRAFT"
        ? "SAVE_THREADS_TEXT_ONLY_AND_OPEN_THREADS"
        : "SAVE_DRAFT_AND_OPEN_FACEBOOK",
      draft: data.draft,
    }, (response) => {
      const runtimeError = runtime.lastError?.message || "";
      sendStatus(!runtimeError && Boolean(response?.ok), runtimeError || response?.error || "", response?.message || "");
    });
  } catch (error) {
    sendStatus(false, error?.message || String(error));
  }
});
