// Post Pilot. One box for the title and idea, Generate, check the text, then a
// post button per platform; pressing one is the approval. Talks to /api/storytelling and /api/settings/social;
// keys and tokens never reach this file. Nothing is posted without a click on
// that platform's button.
(() => {
  "use strict";
  const root = document.getElementById("tab-postpilot");
  if (!root) return;
  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  const toast = (message, tone) => (typeof window.showToast === "function" ? window.showToast(message, tone) : undefined);
  const when = (value) => new Date(value).toLocaleString("en-MY", { dateStyle: "medium", timeStyle: "short" });
  const WORKING_KEY = "buddypilot-postpilot-working-v2";
  const BLANK = { id: "", generated: "", model: "", dnaVersion: 0, status: "draft", published: {}, personalQueued: false, image: "" };
  const PLATFORMS = { page: "Facebook Page", threads: "Threads", personal: "Facebook personal" };

  const state = { loaded: false, loading: false, busy: false, config: null, current: { ...BLANK }, savedText: "", social: null };
  const editor = $("stEditor");

  // ---------- transport ----------
  async function request(method, body, query = "", path = "/api/storytelling") {
    let response;
    try {
      response = await fetch(path + query, { method, cache: "no-store", headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
    } catch {
      throw Object.assign(new Error("Sambungan terputus. Pastikan skrin kekal di BuddyPilot dan cuba semula."), { code: "network" });
    }
    let json = {};
    try { json = JSON.parse((await response.text()).trim() || "{}"); } catch { json = {}; }
    if (response.status === 401) { window.location.href = "/login"; throw new Error("Sesi tamat. Log masuk semula."); }
    if (!response.ok || !json.ok) throw Object.assign(new Error(json.error || "Permintaan gagal (" + response.status + ")."), { code: json.code || "" });
    return json;
  }
  const post = (action, body = {}) => request("POST", { action, ...body });

  function setStatus(node, tone, message, retry) {
    node.className = "st-status" + (tone ? " " + tone : "");
    node.textContent = message || "";
    if (retry && message) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "secondary st-retry";
      button.textContent = "Cuba semula";
      button.addEventListener("click", retry);
      node.append(" ", button);
    }
  }

  function setBusy(busy, label) {
    state.busy = busy;
    root.querySelectorAll("[data-st-ai]").forEach((button) => { button.disabled = busy; });
    $("stGenerate").textContent = busy && label ? label : "Generate";
    root.classList.toggle("st-busy", busy);
    render();
  }

  // Runs one AI action with loading and retry handling in one place.
  async function runAi(statusNode, label, work, retry) {
    if (state.busy) return null;
    setBusy(true, label);
    setStatus(statusNode, "info", label);
    try {
      const result = await work();
      setStatus(statusNode, "", "");
      return result;
    } catch (error) {
      const transient = ["rate_limit", "unavailable", "network", "empty", "bad_output", "incomplete"].includes(error.code);
      setStatus(statusNode, "err", error.message, transient ? retry || (() => runAi(statusNode, label, work)) : null);
      return null;
    } finally {
      setBusy(false);
    }
  }

  function showView(name) {
    root.querySelectorAll("[data-st-view]").forEach((button) => {
      const active = button.dataset.stView === name;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", String(active));
    });
    root.querySelectorAll("[data-st-panel]").forEach((panel) => { panel.hidden = panel.dataset.stPanel !== name; });
    try { localStorage.setItem("buddypilot-storytelling-view", name); } catch {}
    if (name === "settings" && state.loaded) loadSettings();
  }

  // ---------- write ----------
  // One box holds the title and the idea: the first line is the topic, the
  // whole text is the idea the AI writes from.
  function inputs() {
    const brief = $("stBrief").value.trim();
    const topic = brief.split("\n")[0].trim().slice(0, 300);
    return { topic, context: { idea: brief.length > topic.length ? brief : "" } };
  }

  const isDirty = () => editor.value.trim() !== state.savedText.trim();

  function remember() {
    try { localStorage.setItem(WORKING_KEY, JSON.stringify({ brief: $("stBrief").value, text: editor.value, current: state.current, savedText: state.savedText })); } catch {}
  }

  function publishState(platform) {
    const done = state.current.published?.[platform];
    if (done) return 'Dah dipost' + (done.at ? " · " + esc(when(done.at)) : "") + (done.url ? ' · <a href="' + esc(done.url) + '" target="_blank" rel="noopener">Lihat</a>' : "");
    if (platform === "personal" && state.current.personalQueued) return "Menunggu dalam extension Chrome. Buka Chrome dan tekan ikon BuddyPilot.";
    return "";
  }

  function render() {
    const characters = editor.value.length;
    $("stEditorCard").hidden = !characters && !state.current.id;
    $("stCount").textContent = characters.toLocaleString("en-MY") + " aksara";
    $("stSaveState").textContent = state.current.status === "published" ? "Dah dipost" : "";
    root.querySelectorAll("[data-st-needs-text]").forEach((button) => { button.disabled = state.busy || characters < 80; });
    $("stPublish").hidden = characters < 80;
    $("stPhotoPreview").hidden = !state.current.image;
    if (state.current.image && $("stPhotoImage").getAttribute("src") !== state.current.image) $("stPhotoImage").src = state.current.image;
    $("stPhoto").textContent = state.current.image ? "Tukar gambar" : "Kamera";
    $("stStateThreads").innerHTML = publishState("threads");
    $("stStatePersonal").innerHTML = publishState("personal");
    $("stPostThreads").disabled = state.busy || Boolean(state.current.published?.threads);
    $("stPostPersonal").disabled = state.busy || Boolean(state.current.published?.personal);
    $("stPostPersonal").textContent = state.current.personalQueued && !state.current.published?.personal ? "Batal giliran FB personal" : "Facebook personal";
  }

  async function saveDraft(status) {
    const text = editor.value.trim();
    if (text.length < 80) return null;
    const value = inputs();
    const json = await post("draft.save", { id: state.current.id, ...value, topic: value.topic || text.split("\n")[0].slice(0, 80), content: text, generated: state.current.generated, model: state.current.model, dnaVersion: state.current.dnaVersion, image: state.current.image || "", status });
    state.current.id = json.draft.id;
    state.current.status = json.draft.status;
    state.savedText = text;
    render();
    remember();
    return json.draft;
  }

  async function generate() {
    const value = inputs();
    if (value.topic.length < 3) { setStatus($("stWriteStatus"), "err", "Tulis tajuk dan idea dahulu."); $("stBrief").focus(); return; }
    if (editor.value.trim() && isDirty() && !window.confirm("Post semasa belum disimpan. Jana yang baru?")) return;
    const result = await runAi($("stWriteStatus"), "Menjana draf...", () => post("generate", { ...value, fast: true }), generate);
    if (!result) return;
    state.current = { ...BLANK, generated: result.text, model: result.model, dnaVersion: result.dnaVersion };
    state.savedText = "";
    editor.value = result.text;
    editor.classList.remove("st-fresh");
    void editor.offsetWidth;
    editor.classList.add("st-fresh");
    render();
    $("stEditorCard").scrollIntoView({ block: "nearest", behavior: "smooth" });
    if (result.warnings?.length) setStatus($("stEditStatus"), "info", result.warnings.join(" "));
    // Saved straight away, so a generated post is never lost.
    try { await saveDraft("draft"); } catch (error) { setStatus($("stEditStatus"), "err", error.message); }
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      toast("Disalin.");
    } catch {
      editor.focus();
      editor.select();
      toast("Tidak dapat salin automatik. Teks dipilih; salin sendiri.", "err");
    }
  }

  // ---------- photo (optional) ----------
  // Phone photos are several megabytes; a 1600px JPEG is plenty for a post and
  // uploads in a moment.
  async function shrink(file) {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.85);
  }

  async function addPhoto(file) {
    if (!file) return;
    setStatus($("stPhotoStatus"), "info", "Memuat naik gambar...");
    try {
      const json = await post("image.upload", { image: await shrink(file) });
      state.current.image = json.image;
      state.imageDirty = true;
      setStatus($("stPhotoStatus"), "", "");
      render();
      remember();
    } catch (error) {
      setStatus($("stPhotoStatus"), "err", error.message || "Gambar tidak dapat dibaca.");
    }
  }

  // ---------- publish ----------
  // Pressing a post button approves the text as it stands in the editor.
  async function approveCurrent() {
    if (!state.current.id || isDirty() || state.imageDirty || !["approved", "published"].includes(state.current.status)) await saveDraft("approved");
    state.imageDirty = false;
  }

  async function postThreads() {
    if (state.busy) return;
    if (!state.social?.threads?.configured) return sendToMac("threads");
    setBusy(true);
    setStatus($("stPublishStatus"), "info", "Menghantar ke Threads...");
    try {
      await approveCurrent();
      const json = await post("publish.threads", { id: state.current.id });
      state.current.status = "published";
      state.current.published = { ...state.current.published, threads: { url: json.publication.url, at: json.publication.postedAt } };
      setStatus($("stPublishStatus"), json.warning ? "err" : "ok", json.warning || "Dah dipost ke Threads.");
      remember();
    } catch (error) {
      setStatus($("stPublishStatus"), "err", error.message);
    } finally {
      setBusy(false);
    }
  }

  async function postPersonal() {
    if (state.busy) return;
    if (!state.current.personalQueued) return sendToMac("facebook");
    setBusy(true);
    try {
      await post("personal.queue", { id: state.current.id, queued: false });
      state.current.personalQueued = false;
      setStatus($("stPublishStatus"), "info", "Giliran lama dibatalkan. Tekan Facebook personal untuk hantar ke Chrome.");
      remember();
    } catch (error) {
      setStatus($("stPublishStatus"), "err", error.message);
    } finally { setBusy(false); }
  }

  // ---------- settings ----------
  function renderLearning(learning) {
    const counts = Object.entries(learning.posts).map(([id, count]) => count + " di " + (PLATFORMS[id] || id)).join(", ");
    $("stLearning").textContent = (learning.total ? "AI sedang jejak " + learning.total + " post (" + counts + "). " : "Belum ada post dijejak. ")
      + (learning.last ? "Kali terakhir belajar: " + when(learning.last.at) + ". " + learning.last.note : "Belum pernah belajar daripada post.");
  }

  async function loadSettings() {
    try {
      const [social, learning] = await Promise.all([request("GET", null, "", "/api/settings/social"), request("GET", null, "?view=learning")]);
      state.social = social.social;
      renderLearning(learning.learning);
    } catch (error) {
      setStatus($("stLearnStatus"), "err", error.message);
    }
  }

  // ---------- load ----------
  async function load() {
    if (state.loaded || state.loading) return;
    state.loading = true;
    setStatus($("stWriteStatus"), "info", "Memuatkan...");
    try {
      const json = await request("GET", null, "?view=bootstrap");
      Object.assign(state, { config: json.config, loaded: true });
      const notices = [];
      if (json.setupRequired) notices.push(json.setupMessage);
      if (!json.config.keyConfigured) notices.push("API key AI belum ditetapkan. Buka tab Tetapan > Urus AI API Key.");
      $("stNotice").hidden = !notices.length;
      $("stNotice").textContent = notices.join(" ");
      $("stAiInfo").textContent = "Model: " + json.config.model + (json.config.keyConfigured ? "." : ". API key belum ditetapkan.");
      try {
        const working = JSON.parse(localStorage.getItem(WORKING_KEY) || "null");
        if (working) {
          $("stBrief").value = working.brief || "";
          state.current = { ...BLANK, ...(working.current || {}) };
          state.savedText = working.savedText || "";
          editor.value = working.text || "";
        }
      } catch {}
      render();
      setStatus($("stWriteStatus"), "", "");
      if (root.querySelector("[data-st-view].active")?.dataset.stView === "settings") loadSettings();
    } catch (error) {
      setStatus($("stWriteStatus"), "err", error.message, () => { state.loading = false; load(); });
    } finally {
      state.loading = false;
    }
  }

  // ---------- events ----------
  root.addEventListener("click", (event) => {
    const tab = event.target.closest("[data-st-view]");
    if (tab && root.contains(tab)) showView(tab.dataset.stView);
  });

  $("stGenerate").addEventListener("click", generate);
  $("stRegenerate").addEventListener("click", generate);
  $("stCopy").addEventListener("click", () => copyText(editor.value));
  let macJobId = "";
  async function macRequest(payload) {
    const response = await fetch("/api/post-pilot-queue", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.error || "Giliran Post Pilot tidak tersedia.");
    return data.job;
  }
  async function sendToMac(platform) {
    const content = editor.value.trim();
    if (state.busy || !content) return;
    setBusy(true);
    setStatus($("stPublishStatus"), "info", "Menghantar draf ke Mac...");
    try {
      const job = await macRequest({ action: "enqueue", platform, content, autoPost: true,
        ...(state.current.image ? { image: state.current.image } : {}) });
      macJobId = job.id;
      window.dispatchEvent(new Event("buddypilot-post-queued"));
      // Learn from what was changed in the AI draft; runs in the background, nothing shown.
      if (!state.current.learnedFrom || state.current.learnedFrom !== content) {
        state.current.learnedFrom = content;
        post("learn.edit", { generated: state.current.generated || "", content, topic: inputs().topic }).catch(() => {});
      }
      $("stMacStatusCheck").hidden = false;
      setStatus($("stPublishStatus"), "ok", platform === "threads"
        ? "Dalam giliran auto-post Threads. Pastikan Chrome di Mac aktif."
        : "Dalam giliran auto-post Facebook personal. Pastikan Chrome di Mac aktif.");
    } catch (error) {
      setStatus($("stPublishStatus"), "err", error.message);
    } finally { setBusy(false); }
  }
  $("stMacStatusCheck").addEventListener("click", async (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    try {
      const { state, reason } = await macRequest({ action: "status", id: macJobId });
      const stages = {
        tab: "buka tab", profile: "sahkan profil", composer: "buka ruang tulis", text: "isi dan semak teks",
        thread_part: "tambah bahagian thread", image: "sahkan lampiran gambar", next: "langkah Next", post_button: "sahkan butang Post",
      };
      const labels = {
        queued: "Menunggu Chrome di Mac.",
        claimed: "Mac mengambil draf. Semak Chrome sebelum menghantar semula.",
        review: "Draf diisi. Semak profil dan tekan Publish di Mac.",
        copy: "Buka tab Chrome di Mac dan salin draf ke composer secara manual.",
        failed: "Tidak dipost. Berhenti pada: " + (stages[reason] || "semakan di Chrome") + ".",
        posted: "Platform mengesahkan post sudah diterbitkan.",
        uncertain: "Status publish tidak pasti. Jangan hantar semula sebelum semak profil.",
        expired: "Draf tamat tempoh. Hantar semula jika masih diperlukan.",
      };
      setStatus($("stPublishStatus"), "info", labels[state] || "Status tidak tersedia.");
    } catch (error) {
      setStatus($("stPublishStatus"), "err", error.message);
    } finally { button.disabled = false; }
  });
  $("stNew").addEventListener("click", () => {
    if (editor.value.trim() && isDirty() && !window.confirm("Post semasa belum disimpan. Mula yang baru?")) return;
    state.current = { ...BLANK };
    state.savedText = "";
    editor.value = "";
    $("stBrief").value = "";
    render();
    remember();
    $("stBrief").focus();
  });
  $("stPhoto").addEventListener("click", () => $("stPhotoInput").click());
  $("stPhotoInput").addEventListener("change", (event) => { addPhoto(event.target.files?.[0]); event.target.value = ""; });
  $("stPhotoRemove").addEventListener("click", () => { state.current.image = ""; state.imageDirty = true; render(); remember(); });
  $("stPostThreads").addEventListener("click", postThreads);
  $("stPostPersonal").addEventListener("click", postPersonal);

  let typing = 0;
  editor.addEventListener("input", () => { render(); clearTimeout(typing); typing = setTimeout(remember, 600); });
  $("stBrief").addEventListener("input", () => { clearTimeout(typing); typing = setTimeout(remember, 600); });

  function scanChrome() {
    return new Promise((resolve, reject) => {
      const id = crypto.randomUUID();
      const event = "buddypilot-learn-result";
      const finish = () => {
        clearTimeout(timer);
        window.removeEventListener(event, receive);
      };
      const receive = ({ detail }) => {
        if (detail?.id !== id) return;
        finish();
        if (detail.result?.error || !Array.isArray(detail.result?.posts)) {
          reject(new Error(detail.result?.error || "Extension Chrome tidak dapat dihubungi."));
        } else resolve(detail.result);
      };
      const timer = setTimeout(() => {
        finish();
        reject(new Error("Semakan tamat masa. Buka BuddyPilot di Chrome yang ada extension Post Pilot dan cuba lagi."));
      }, 85000);
      window.addEventListener(event, receive);
      window.dispatchEvent(new CustomEvent("buddypilot-learn-request", { detail: id }));
    });
  }

  $("stLearnNow").addEventListener("click", async () => {
    const status = $("stLearnStatus");
    const json = await runAi(status, "Chrome sedang membaca post 30 hari terakhir...", async () => {
      const scan = await scanChrome();
      setStatus(status, "info", "AI sedang belajar daripada post yang dibaca...");
      return { ...await post("learn.chrome", { posts: scan.posts }), notes: scan.notes };
    });
    if (!json) return;
    renderLearning(json.learning);
    const cycle = json.cycle;
    const counts = "30 hari: " + json.counts.personal + " Facebook personal, " + json.counts.threads + " Threads.";
    setStatus(status, cycle.learned ? "ok" : "info", [counts, cycle.learned
      ? (cycle.changes?.join(" ") || "Gaya dikemas kini daripada " + cycle.posts + " post.")
      : cycle.reason, ...(json.notes || [])].filter(Boolean).join(" "));
  });

  window.addEventListener("buddypilot-ai-settings-saved", (event) => {
    if (!state.config) return;
    Object.assign(state.config, event.detail);
    $("stAiInfo").textContent = "Model: " + state.config.model + ".";
    $("stNotice").hidden = true;
  });
  window.addEventListener("beforeunload", remember);

  // Load on first visit to the tab, not at startup.
  document.addEventListener("click", (event) => {
    if (event.target.closest('[data-tab-target="postpilot"]')) load();
  });
  let first = "write";
  try { first = localStorage.getItem("buddypilot-storytelling-view") || "write"; } catch {}
  showView(first === "settings" ? "settings" : "write");
  if (root.classList.contains("active")) load();
  new MutationObserver(() => { if (root.classList.contains("active")) load(); }).observe(root, { attributes: true, attributeFilter: ["class"] });
})();
