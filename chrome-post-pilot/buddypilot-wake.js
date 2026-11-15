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

  window.addEventListener(event, wakePostPilot);
  void wakePostPilot();
})();
