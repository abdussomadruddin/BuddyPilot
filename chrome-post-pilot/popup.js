const status = document.getElementById("status");
const toggle = document.getElementById("toggle");
const check = document.getElementById("check");
const username = document.getElementById("threads-username");

async function update(action, data = {}) {
  toggle.disabled = true;
  check.disabled = true;
  if (action !== "status") status.textContent = "Menyemak...";
  try {
    const result = await chrome.runtime.sendMessage({ action, ...data });
    if (!result || result.error) throw new Error(result?.error);
    if (action === "status" || action === "threads-account") username.value = result.threadsUsername || "";
    toggle.textContent = result.enabled ? "Nyahaktifkan" : "Aktifkan";
    status.textContent = action === "threads-account"
      ? (result.threadsUsername ? "Akaun Threads disimpan." : "Auto-post Threads dimatikan.")
      : result.enabled ? (result.status || "Aktif") : "Giliran dimatikan.";
    check.disabled = !result.enabled;
  } catch (error) {
    status.textContent = error.message || "Extension tidak dapat dihubungi. Muat semula di chrome://extensions.";
  } finally {
    toggle.disabled = false;
  }
}

toggle.addEventListener("click", () => update("toggle"));
check.addEventListener("click", () => update("check"));
document.getElementById("threads-account").addEventListener("submit", (event) => {
  event.preventDefault();
  void update("threads-account", { username: username.value });
});
void update("status");
