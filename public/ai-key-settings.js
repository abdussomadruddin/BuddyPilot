(() => {
  const form = document.getElementById("aiKeyForm");
  if (!form) return;
  const provider = document.getElementById("aiKeyProvider");
  const key = document.getElementById("aiKeyValue");
  const model = document.getElementById("aiKeyModel");
  const status = document.getElementById("aiKeyStatus");
  const result = document.getElementById("aiKeyResult");
  const test = document.getElementById("aiKeyTest");
  const save = document.getElementById("aiKeySave");
  let statuses = [];
  let loading = false;
  let generation = 0;
  let activeSettings = { provider: "gemini", model: "gemini-3.8-flash" };
  function renderStatus() {
    const item = statuses.find((row) => row.provider === provider.value);
    status.textContent = !item ? "Status belum tersedia" : !item.configured ? "Belum ada key" : item.source === "app" ? "Key tersimpan: ******** (App)" : "Key tersedia: ******** (Vercel)";
  }
  async function request(options) {
    const response = await fetch("/api/settings/ai-keys", { cache: "no-store", ...options });
    if (response.status === 401) { window.location.href = "/login"; throw new Error("Sesi tamat."); }
    const body = await response.json();
    if (!response.ok || !body.ok) throw new Error(body.error || "Request gagal.");
    return body;
  }
  async function load() {
    const version = ++generation;
    status.textContent = "Memuatkan status...";
    try {
      const body = await request();
      if (version !== generation) return;
      statuses = body.providers;
      activeSettings = body.settings || activeSettings;
      provider.value = activeSettings.provider;
      model.value = activeSettings.model;
      renderStatus();
    } catch (error) {
      if (version === generation) status.textContent = error.message;
    }
  }
  async function run(action) {
    if (loading) return;
    if (action === "save" && !key.value.trim() && !statuses.find((item) => item.provider === provider.value)?.configured) { result.textContent = "Masukkan key baharu dahulu."; key.focus(); return; }
    loading = true;
    generation += 1;
    provider.disabled = model.disabled = key.disabled = test.disabled = save.disabled = true;
    result.textContent = action === "save" ? "Menyimpan..." : "Menguji sambungan...";
    const selected = provider.value;
    try {
      const body = await request({ method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, provider: selected, model: model.value.trim(), apiKey: key.value.trim() }) });
      if (action === "save") {
        key.value = "";
        statuses = statuses.filter((item) => item.provider !== selected).concat(body.result);
        renderStatus();
        activeSettings = { provider: selected, model: body.result.model || model.value.trim() };
        result.textContent = "Disimpan. Post Pilot kini menggunakan provider dan model ini.";
        window.dispatchEvent(new CustomEvent("buddypilot-ai-settings-saved", { detail: { ...activeSettings, keyConfigured: true } }));
      } else result.textContent = body.result.message;
    } catch (error) { result.textContent = error.message; }
    finally { loading = false; provider.disabled = model.disabled = key.disabled = test.disabled = save.disabled = false; }
  }
  provider.addEventListener("change", () => { key.value = ""; model.value = provider.value === activeSettings.provider ? activeSettings.model : { gemini: "gemini-3.8-flash", openai: "gpt-4.1-mini", deepseek: "deepseek-chat" }[provider.value]; result.textContent = ""; renderStatus(); });
  form.addEventListener("submit", (event) => { event.preventDefault(); run("save"); });
  test.addEventListener("click", () => run("test"));
  document.querySelector('[data-menu-section="menuAISettings"]').addEventListener("click", load);
  document.querySelectorAll("[data-open-ai-keys]").forEach((button) => button.addEventListener("click", () => {
    document.querySelector(".topbar-menu").open = true;
    document.querySelectorAll(".menu-settings-panel").forEach((panel) => { panel.hidden = panel.id !== "menuAISettings"; });
    load();
  }));
  document.querySelector(".topbar-menu").addEventListener("toggle", (event) => { if (!event.target.open) key.value = ""; });
})();
