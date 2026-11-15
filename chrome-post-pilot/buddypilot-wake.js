function wakePostPilot() {
  chrome.runtime.sendMessage({ action: "wake" }).catch(() => {});
}
window.addEventListener("buddypilot-post-queued", wakePostPilot);
wakePostPilot();
