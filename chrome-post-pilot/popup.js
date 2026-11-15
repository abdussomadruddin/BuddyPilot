const status = document.getElementById("status");
const toggle = document.getElementById("toggle");
const check = document.getElementById("check");

async function update(action) {
  toggle.disabled = true;
  check.disabled = true;
  if (action !== "status") status.textContent = "Menyemak...";
  try {
    const result = await chrome.runtime.sendMessage({ action });
    if (!result || result.error) throw new Error();
    toggle.textContent = result.enabled ? "Nyahaktifkan" : "Aktifkan";
    status.textContent = result.enabled ? (result.status || "Aktif") : "Giliran dimatikan.";
    check.disabled = !result.enabled;
  } catch {
    status.textContent = "Extension tidak dapat dihubungi. Muat semula di chrome://extensions.";
  } finally {
    toggle.disabled = false;
  }
}

toggle.addEventListener("click", () => update("toggle"));
check.addEventListener("click", () => update("check"));
void update("status");
