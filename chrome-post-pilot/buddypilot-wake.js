(() => {
  const event = "buddypilot-post-queued";
  const detach = () => window.removeEventListener(event, wakePostPilot);

  async function wakePostPilot() {
    try {
      if (!chrome.runtime?.id) {
        detach();
        return;
      }
      await chrome.runtime.sendMessage({ action: "wake" });
    } catch (error) {
      // Reloading an unpacked extension leaves the old script in open tabs.
      if (/extension context invalidated/i.test(error?.message || "")) detach();
    }
  }

  window.addEventListener("buddypilot-learn-request", async (request) => {
    const id = request.detail;
    if (typeof id !== "string" || !/^[a-f0-9-]{36}$/.test(id)) return;
    let result;
    try { result = await chrome.runtime.sendMessage({ action: "learn" }); }
    catch { result = { error: "Muat semula tab BuddyPilot selepas reload extension Chrome." }; }
    window.dispatchEvent(new CustomEvent("buddypilot-learn-result", { detail: { id, result } }));
  });

  window.addEventListener(event, wakePostPilot);
  void wakePostPilot();
})();
