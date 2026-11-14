// Post Pilot > Facebook Storytelling. Talks only to /api/storytelling; the AI
// key never reaches this file. Nothing here posts to Facebook.
(() => {
  "use strict";
  const root = document.getElementById("tab-postpilot");
  if (!root) return;
  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  const toast = (message, tone) => (typeof window.showToast === "function" ? window.showToast(message, tone) : undefined);
  const WORKING_KEY = "buddypilot-storytelling-working-v1";
  const CONTEXT_FIELDS = ["opinion", "experience", "facts", "audience", "tone", "takeaway", "cta"];

  const state = { loaded: false, loading: false, busy: false, config: null, dna: null, dnaVersions: [], samples: [], drafts: [], current: { id: "", generated: "", model: "", dnaVersion: 0, status: "draft" }, history: [], savedText: "", editingSample: "", revisions: [] };
  const editor = $("stEditor");

  // ---------- transport ----------
  async function request(method, body, query = "") {
    const response = await fetch("/api/storytelling" + query, { method, cache: "no-store", headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
    let json = {};
    try { json = await response.json(); } catch { json = {}; }
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
  }

  // Runs one AI action with loading, quota and retry handling in one place.
  async function runAi(statusNode, label, work) {
    if (state.busy) return null;
    setBusy(true, label);
    setStatus(statusNode, "info", label + " Ini boleh ambil 10 hingga 40 saat.");
    try {
      const result = await work();
      setStatus(statusNode, "", "");
      return result;
    } catch (error) {
      // Retry only what a second try can fix; quota and input errors need something else.
      const transient = ["rate_limit", "unavailable", "network", "empty", "bad_output", "incomplete"].includes(error.code);
      setStatus(statusNode, "err", error.message, transient ? () => runAi(statusNode, label, work) : null);
      return null;
    } finally {
      setBusy(false);
    }
  }

  // ---------- views ----------
  function showView(name) {
    root.querySelectorAll("[data-st-view]").forEach((button) => {
      const active = button.dataset.stView === name;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", String(active));
    });
    root.querySelectorAll("[data-st-panel]").forEach((panel) => { panel.hidden = panel.dataset.stPanel !== name; });
    try { localStorage.setItem("buddypilot-storytelling-view", name); } catch {}
  }

  // ---------- write ----------
  function targetLength() {
    const value = $("stLength").value;
    const custom = Number($("stLengthCustom").value);
    return value === "custom" ? Math.min(8000, Math.max(500, custom || 4500)) : Number(value) || 4500;
  }

  function inputs() {
    const context = {};
    for (const key of CONTEXT_FIELDS) context[key] = $("stCtx-" + key).value.trim();
    return { topic: $("stTopic").value.trim(), context, style: $("stStyle").value, length: targetLength(), intensity: Number($("stIntensity").value), voiceStrength: Number($("stVoice").value) };
  }

  function fillInputs(value = {}) {
    $("stTopic").value = value.topic || "";
    for (const key of CONTEXT_FIELDS) $("stCtx-" + key).value = value.context?.[key] || "";
    if (value.style) $("stStyle").value = value.style;
    if (value.length) {
      const preset = [...$("stLength").options].some((option) => option.value === String(value.length));
      $("stLength").value = preset ? String(value.length) : "custom";
      $("stLengthCustom").value = preset ? "" : value.length;
    }
    if (value.intensity) $("stIntensity").value = value.intensity;
    if (value.voiceStrength) $("stVoice").value = value.voiceStrength;
    syncControls();
  }

  function syncControls() {
    $("stLengthCustom").hidden = $("stLength").value !== "custom";
    $("stIntensityValue").textContent = $("stIntensity").value;
    $("stVoiceValue").textContent = $("stVoice").value;
  }

  function isDirty() {
    return editor.value.trim() !== state.savedText.trim();
  }

  function updateMeter() {
    const text = editor.value;
    const characters = text.length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const target = targetLength();
    const deviation = characters ? Math.round(((characters - target) / target) * 100) : 0;
    $("stCount").textContent = characters.toLocaleString("en-MY") + " aksara";
    $("stCount").dataset.tone = !characters ? "" : Math.abs(deviation) <= 5 ? "ok" : Math.abs(deviation) <= 12 ? "warn" : "off";
    $("stTarget").textContent = characters ? "sasaran " + target.toLocaleString("en-MY") + " (" + (deviation > 0 ? "+" : "") + deviation + "%)" : "sasaran " + target.toLocaleString("en-MY");
    $("stReading").textContent = words ? words + " patah perkataan · " + Math.max(1, Math.round(words / 200)) + " min baca" : "";
    $("stSaveState").textContent = !characters ? "" : isDirty() ? "Belum disimpan" : state.current.id ? "Disimpan" : "";
    $("stUndo").disabled = !state.history.length;
    root.querySelectorAll("[data-st-needs-text]").forEach((button) => { button.disabled = state.busy || characters < 80; });
    renderPreview();
  }

  function renderPreview() {
    const body = $("stPreviewBody");
    if ($("stPreview").hidden) return;
    const text = editor.value.trim();
    const expanded = body.dataset.expanded === "true";
    const cut = !expanded && text.length > 480;
    body.textContent = cut ? text.slice(0, 480).replace(/\s+\S*$/, "") + "... " : text || "Draf akan dipaparkan di sini.";
    if (cut) {
      const more = document.createElement("button");
      more.type = "button";
      more.className = "st-see-more";
      more.textContent = "See more";
      more.addEventListener("click", () => { body.dataset.expanded = "true"; renderPreview(); });
      body.append(more);
    }
  }

  function remember() {
    try { localStorage.setItem(WORKING_KEY, JSON.stringify({ inputs: inputs(), text: editor.value, current: state.current, savedText: state.savedText })); } catch {}
  }

  function setEditor(text, { keepHistory = true } = {}) {
    if (keepHistory && editor.value.trim() && editor.value !== text) {
      state.history.push(editor.value);
      if (state.history.length > 30) state.history.shift();
    }
    editor.value = text;
    updateMeter();
    remember();
    // A brief highlight shows the text changed, since a rewrite may touch one paragraph only.
    if (text) {
      editor.classList.remove("st-fresh");
      void editor.offsetWidth;
      editor.classList.add("st-fresh");
    }
  }

  function renderLocalReview(review, warnings = []) {
    const list = [...warnings.map((message) => ({ message })), ...(review?.issues || [])];
    $("stLocalReview").innerHTML = list.length
      ? '<strong>Semakan automatik</strong><ul>' + list.map((issue) => "<li>" + esc(issue.message) + "</li>").join("") + "</ul>"
      : review ? '<strong>Semakan automatik</strong><p class="note">Tiada emoji, garis pemisah, hashtag atau frasa berbunyi AI dikesan. Panjang dalam sasaran.</p>' : "";
  }

  async function generate() {
    const value = inputs();
    if (value.topic.length < 3) { setStatus($("stWriteStatus"), "err", "Masukkan topik dahulu."); $("stTopic").focus(); return; }
    if (editor.value.trim() && isDirty() && !window.confirm("Draf semasa belum disimpan. Jana yang baru? Draf lama masih boleh dipulihkan dengan Undo.")) return;
    const result = await runAi($("stWriteStatus"), "Menjana post...", () => post("generate", value));
    if (!result) return;
    if (state.current.id) state.history = [];
    state.current = { id: "", generated: result.text, model: result.model, dnaVersion: result.dnaVersion, status: "draft" };
    state.savedText = "";
    state.revisions = [];
    renderRevisions();
    $("stQuality").innerHTML = "";
    setEditor(result.text);
    renderLocalReview(result.review, result.warnings);
    $("stEditorCard").scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  async function rewrite(action, feedback) {
    const result = await runAi($("stEditStatus"), "Menyunting...", () => post("rewrite", { mode: action, text: editor.value, feedback, targetLength: targetLength() }));
    if (!result) return;
    setEditor(result.text);
    renderLocalReview(result.review);
    toast(result.scope === "full" ? "Draf disunting. Undo untuk kembali." : "Hanya " + (result.scope === "opening" ? "pembuka" : "penutup") + " yang ditukar.");
  }

  async function checkQuality() {
    const result = await runAi($("stEditStatus"), "Menyemak kualiti...", () => post("quality", { text: editor.value, targetLength: targetLength() }));
    if (!result) return;
    const quality = result.quality;
    renderLocalReview(result.review);
    $("stQuality").innerHTML = '<div class="st-quality-head"><strong>Semakan editorial AI' + (quality.average != null ? " · " + quality.average + "/10" : "") + '</strong><small>' + esc(quality.disclaimer) + "</small></div>"
      + (quality.summary ? "<p>" + esc(quality.summary) + "</p>" : "")
      + '<div class="st-scores">' + Object.values(quality.scores).map((item) => '<div><span>' + esc(item.label) + '</span><b data-score="' + (item.score >= 8 ? "high" : item.score >= 6 ? "mid" : "low") + '">' + (item.score ?? "-") + "</b></div>").join("") + "</div>"
      + (quality.strengths.length ? '<p class="st-quality-label">Yang kuat</p><ul>' + quality.strengths.map((item) => "<li>" + esc(item) + "</li>").join("") + "</ul>" : "")
      + (quality.issues.length ? '<p class="st-quality-label">Perlu dibaiki</p><ul>' + quality.issues.map((item) => "<li><strong>" + esc(item.detail) + "</strong>" + (item.fix ? "<br><span>" + esc(item.fix) + "</span>" : "") + "</li>").join("") + '</ul><button type="button" id="stImprove" data-st-ai>Improve Draft</button>' : '<p class="note">Tiada isu besar dikesan.</p>');
    const improve = $("stImprove");
    if (improve) improve.addEventListener("click", () => rewrite("improve", quality.issues.map((item) => "- " + item.detail + (item.fix ? " Baiki: " + item.fix : "")).join("\n")));
  }

  async function saveDraft(status) {
    const text = editor.value.trim();
    if (!text) return;
    const value = inputs();
    try {
      const json = await post("draft.save", { id: state.current.id, ...value, topic: value.topic || text.split("\n")[0].slice(0, 80), content: text, generated: state.current.generated, model: state.current.model, dnaVersion: state.current.dnaVersion, status: status || undefined });
      state.current.id = json.draft.id;
      state.current.status = json.draft.status;
      state.savedText = text;
      updateMeter();
      remember();
      toast(status === "approved" ? "Draf ditanda Approved." : "Draf disimpan.");
      await loadDrafts();
    } catch (error) {
      setStatus($("stEditStatus"), "err", error.message);
    }
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      toast("Disalin. Tampal di Facebook bila sedia.");
    } catch {
      editor.focus();
      editor.select();
      toast("Tidak dapat salin automatik. Teks dipilih; tekan Cmd+C.", "err");
    }
  }

  function renderRevisions() {
    $("stRevisions").hidden = !state.revisions.length;
    $("stRevisionList").innerHTML = state.revisions.map((revision, index) => '<li><span>' + esc(new Date(revision.createdAt).toLocaleString("en-MY", { dateStyle: "medium", timeStyle: "short" })) + " · " + (revision.characters || 0) + ' aksara</span><button type="button" class="secondary" data-st-revision="' + index + '">Pulihkan</button></li>').join("");
  }

  // ---------- feedback ----------
  async function sendFeedback() {
    const tags = [...root.querySelectorAll("[data-st-tag].active")].map((chip) => chip.dataset.stTag);
    const note = $("stFeedbackNote").value.trim();
    if (!tags.length && !note) { setStatus($("stFeedbackStatus"), "err", "Pilih sekurang-kurangnya satu maklum balas."); return; }
    try {
      const json = await post("feedback.save", { tags, note, text: editor.value, topic: $("stTopic").value, draftId: state.current.id });
      root.querySelectorAll("[data-st-tag].active").forEach((chip) => chip.classList.remove("active"));
      $("stFeedbackNote").value = "";
      if (json.sample) { state.samples.unshift(json.sample); renderSamples(); }
      setStatus($("stFeedbackStatus"), "ok", json.sample ? "Disimpan. Post ini kini jadi contoh gaya kau." : "Disimpan. Draf seterusnya akan ambil kira maklum balas ini.");
    } catch (error) {
      setStatus($("stFeedbackStatus"), "err", error.message);
    }
  }

  // ---------- DNA ----------
  function renderDna() {
    const dna = state.dna;
    if (!dna) return;
    $("stDnaName").value = dna.profile.name || "";
    $("stDnaMeta").textContent = dna.version ? "Versi " + dna.version + " · " + ({ analysis: "analisis AI", manual: "suntingan manual", feedback: "dipelajari daripada maklum balas", preset: "preset", restore: "dipulihkan" }[dna.source] || dna.source) : "Preset asal (belum disimpan)";
    $("stDnaFields").innerHTML = state.config.dnaFields.map((field) => '<label>' + esc(field.label) + '<textarea data-st-dna="' + esc(field.id) + '" rows="3">' + esc(dna.profile[field.id] || "") + "</textarea></label>").join("");
    $("stDnaRules").value = (dna.profile.rules || []).join("\n");
    $("stDnaVersions").innerHTML = state.dnaVersions.length
      ? state.dnaVersions.map((version, index) => "<li><span><strong>Versi " + esc(version.version) + "</strong> · " + esc(new Date(version.createdAt).toLocaleDateString("en-MY", { dateStyle: "medium" })) + (version.note ? "<br><small>" + esc(version.note) + "</small>" : "") + "</span>" + (index ? '<button type="button" class="secondary" data-st-dna-restore="' + esc(version.id) + '">Pulihkan</button>' : "<em>Aktif</em>") + "</li>").join("")
      : '<li class="note">Belum ada versi disimpan.</li>';
  }

  function dnaFromForm() {
    const profile = { ...state.dna.profile, name: $("stDnaName").value.trim(), rules: $("stDnaRules").value.split("\n").map((rule) => rule.trim()).filter(Boolean) };
    root.querySelectorAll("[data-st-dna]").forEach((field) => { profile[field.dataset.stDna] = field.value.trim(); });
    return profile;
  }

  async function applyDna(json, message) {
    state.dna = json.dna;
    state.dnaVersions.unshift({ id: json.dna.id, version: json.dna.version, source: json.dna.source, note: (json.changes || []).join(" "), createdAt: json.dna.createdAt });
    renderDna();
    setStatus($("stDnaStatus"), "ok", message);
  }

  function renderSamples() {
    const selected = state.samples.filter((sample) => sample.selected !== false).length;
    $("stSampleMeta").textContent = state.samples.length + " contoh · " + selected + " dipilih untuk penjanaan" + (state.samples.length < 10 ? " · 10 hingga 20 contoh beri padanan suara yang lebih baik" : "");
    $("stSampleList").innerHTML = state.samples.length
      ? state.samples.map((sample) => '<li><label class="st-check"><input type="checkbox" data-st-sample-select="' + esc(sample.id) + '"' + (sample.selected !== false ? " checked" : "") + '><span>Guna</span></label><div><p>' + esc(sample.content.slice(0, 220)) + (sample.content.length > 220 ? "..." : "") + "</p><small>" + (sample.category ? esc(sample.category) + " · " : "") + (sample.characters || sample.content.length) + ' aksara</small></div><div class="st-row-actions"><button type="button" class="secondary" data-st-sample-edit="' + esc(sample.id) + '">Edit</button><button type="button" class="secondary danger" data-st-sample-delete="' + esc(sample.id) + '">Padam</button></div></li>').join("")
      : '<li class="note">Belum ada contoh. Tampal post Facebook sebenar kau di atas.</li>';
  }

  // ---------- drafts ----------
  async function loadDrafts() {
    const query = "?view=drafts&q=" + encodeURIComponent($("stDraftSearch").value.trim()) + "&status=" + encodeURIComponent($("stDraftFilter").value);
    try {
      state.drafts = (await request("GET", null, query)).drafts;
      renderDrafts();
    } catch (error) {
      setStatus($("stDraftStatus"), "err", error.message);
    }
  }

  function renderDrafts() {
    const labels = { draft: "Draft", approved: "Approved", published: "Published" };
    $("stDraftList").innerHTML = state.drafts.length
      ? state.drafts.map((draft) => '<li><div><strong>' + esc(draft.topic || "Tanpa topik") + '</strong><p>' + esc(draft.excerpt) + "</p><small>" + esc(new Date(draft.updatedAt || draft.createdAt).toLocaleString("en-MY", { dateStyle: "medium", timeStyle: "short" })) + " · " + draft.characters + " aksara" + (draft.dnaVersion ? " · DNA v" + draft.dnaVersion : "") + (draft.model ? " · " + esc(draft.model) : "") + '</small></div><div class="st-row-actions"><select data-st-draft-status="' + esc(draft.id) + '" aria-label="Status draf">' + Object.entries(labels).map(([id, label]) => '<option value="' + id + '"' + (draft.status === id ? " selected" : "") + ">" + label + "</option>").join("") + '</select><button type="button" data-st-draft-open="' + esc(draft.id) + '">Buka</button><button type="button" class="secondary" data-st-draft-copy="' + esc(draft.id) + '">Salin</button><button type="button" class="secondary" data-st-draft-duplicate="' + esc(draft.id) + '">Duplicate</button><button type="button" class="secondary danger" data-st-draft-delete="' + esc(draft.id) + '">Padam</button></div></li>').join("")
      : '<li class="note">Tiada draf dijumpai.</li>';
  }

  async function openDraft(id) {
    if (editor.value.trim() && isDirty() && !window.confirm("Draf semasa belum disimpan. Buka draf lain?")) return;
    try {
      const json = await request("GET", null, "?view=draft&id=" + encodeURIComponent(id));
      const draft = json.draft;
      fillInputs(draft);
      state.current = { id: draft.id, generated: draft.generated || "", model: draft.model || "", dnaVersion: draft.dnaVersion || 0, status: draft.status || "draft" };
      state.history = [];
      state.savedText = draft.content || "";
      state.revisions = json.revisions || [];
      renderRevisions();
      $("stQuality").innerHTML = "";
      $("stLocalReview").innerHTML = "";
      setEditor(draft.content || "", { keepHistory: false });
      showView("write");
    } catch (error) {
      setStatus($("stDraftStatus"), "err", error.message);
    }
  }

  // ---------- settings ----------
  function renderSettings() {
    const config = state.config;
    $("stSettingsInfo").innerHTML = "<dt>Provider</dt><dd>" + esc({gemini:"Google Gemini",openrouter:"OpenRouter",openai:"OpenAI",deepseek:"DeepSeek"}[config.provider] || config.provider) + "</dd><dt>Model</dt><dd>" + esc(config.model) + "</dd><dt>API key</dt><dd>" + (config.keyConfigured ? "Ditetapkan pada server" : "Belum ditetapkan: Tetapan > AI API Key") + "</dd><dt>Had BuddyPilot</dt><dd>" + config.limits.hourly + " permintaan AI sejam, " + config.limits.daily + " sehari</dd>";
    $("stDataNotice").textContent = config.dataNotice;
  }

  window.addEventListener("buddypilot-ai-settings-saved", (event) => {
    if (!state.config) return;
    Object.assign(state.config, event.detail);
    state.config.dataNotice = "Topik, konteks, Writing DNA dan contoh post yang dipilih dihantar kepada provider AI yang dipilih. Penggunaan API tertakluk pada caj dan polisi provider. Jangan masukkan maklumat sulit client.";
    renderSettings();
  });

  // ---------- load ----------
  async function load() {
    if (state.loaded || state.loading) return;
    state.loading = true;
    setStatus($("stWriteStatus"), "info", "Memuatkan...");
    try {
      const json = await request("GET", null, "?view=bootstrap");
      Object.assign(state, { config: json.config, dna: json.dna, dnaVersions: json.dnaVersions, samples: json.samples, drafts: json.drafts, loaded: true });
      $("stStyle").innerHTML = json.config.styles.map((style) => '<option value="' + esc(style.id) + '">' + esc(style.label) + "</option>").join("");
      $("stLength").innerHTML = json.config.lengths.map((length) => '<option value="' + length + '"' + (length === json.config.defaultLength ? " selected" : "") + ">" + length.toLocaleString("en-MY") + " aksara" + (length === json.config.defaultLength ? " (default)" : "") + "</option>").join("") + '<option value="custom">Custom</option>';
      $("stRewrites").innerHTML = json.config.rewrites.map((item) => '<button type="button" class="secondary" data-st-ai data-st-needs-text data-st-rewrite="' + esc(item.id) + '">' + esc(item.label) + "</button>").join("");
      $("stFeedbackTags").innerHTML = json.config.feedbackTags.map((tag) => '<button type="button" class="st-chip" data-st-tag="' + esc(tag.id) + '">' + esc(tag.label) + "</button>").join("");
      const notices = [];
      if (json.setupRequired) notices.push(json.setupMessage);
      if (!json.config.keyConfigured) notices.push("API key belum ditetapkan. Buka Tetapan > AI API Key sebelum menjana post.");
      $("stNotice").hidden = !notices.length;
      $("stNotice").textContent = notices.join(" ");
      try {
        const working = JSON.parse(localStorage.getItem(WORKING_KEY) || "null");
        if (working) {
          fillInputs(working.inputs);
          state.current = { ...state.current, ...(working.current || {}) };
          state.savedText = working.savedText || "";
          editor.value = working.text || "";
        }
      } catch {}
      syncControls();
      renderDna();
      renderSamples();
      renderDrafts();
      renderSettings();
      updateMeter();
      setStatus($("stWriteStatus"), "", "");
    } catch (error) {
      setStatus($("stWriteStatus"), "err", error.message, () => { state.loading = false; load(); });
    } finally {
      state.loading = false;
    }
  }

  // ---------- events ----------
  root.addEventListener("click", async (event) => {
    const target = event.target.closest("button, [data-st-view]");
    if (!target || !root.contains(target)) return;
    const data = target.dataset;
    if (data.stView) return showView(data.stView);
    if (data.stRewrite) return rewrite(data.stRewrite);
    if (data.stTag) return target.classList.toggle("active");
    if (data.stRevision) {
      const revision = state.revisions[Number(data.stRevision)];
      if (revision) { setEditor(revision.content); toast("Versi terdahulu dipulihkan ke editor. Simpan untuk kekalkan."); }
      return;
    }
    if (data.stDnaRestore) {
      try { await applyDna(await post("dna.restore", { id: data.stDnaRestore }), "Versi dipulihkan sebagai versi baru."); } catch (error) { setStatus($("stDnaStatus"), "err", error.message); }
      return;
    }
    if (data.stSampleEdit) {
      const sample = state.samples.find((item) => item.id === data.stSampleEdit);
      if (!sample) return;
      state.editingSample = sample.id;
      $("stSampleText").value = sample.content;
      $("stSampleCategory").value = sample.category || "";
      $("stSampleSave").textContent = "Simpan perubahan";
      $("stSampleCancel").hidden = false;
      $("stSampleText").focus();
      return;
    }
    if (data.stSampleDelete) {
      if (!window.confirm("Padam contoh post ini?")) return;
      try { await post("sample.delete", { id: data.stSampleDelete }); state.samples = state.samples.filter((item) => item.id !== data.stSampleDelete); renderSamples(); } catch (error) { setStatus($("stSampleStatus"), "err", error.message); }
      return;
    }
    if (data.stDraftOpen) return openDraft(data.stDraftOpen);
    if (data.stDraftCopy) {
      try { await copyText((await request("GET", null, "?view=draft&id=" + encodeURIComponent(data.stDraftCopy))).draft.content); } catch (error) { setStatus($("stDraftStatus"), "err", error.message); }
      return;
    }
    if (data.stDraftDuplicate) {
      try { await post("draft.duplicate", { id: data.stDraftDuplicate }); toast("Draf diduplikasi."); await loadDrafts(); } catch (error) { setStatus($("stDraftStatus"), "err", error.message); }
      return;
    }
    if (data.stDraftDelete) {
      if (!window.confirm("Padam draf ini? Tindakan ini tidak boleh diundur.")) return;
      try {
        await post("draft.delete", { id: data.stDraftDelete });
        if (state.current.id === data.stDraftDelete) { state.current.id = ""; state.savedText = ""; updateMeter(); remember(); }
        await loadDrafts();
      } catch (error) { setStatus($("stDraftStatus"), "err", error.message); }
    }
  });

  root.addEventListener("change", async (event) => {
    const data = event.target.dataset;
    if (data.stSampleSelect) {
      try {
        const json = await post("sample.select", { id: data.stSampleSelect, selected: event.target.checked });
        state.samples = state.samples.map((item) => (item.id === json.sample.id ? json.sample : item));
        renderSamples();
      } catch (error) { event.target.checked = !event.target.checked; setStatus($("stSampleStatus"), "err", error.message); }
    }
    if (data.stDraftStatus) {
      try { await post("draft.status", { id: data.stDraftStatus, status: event.target.value }); toast("Status draf dikemas kini."); } catch (error) { setStatus($("stDraftStatus"), "err", error.message); loadDrafts(); }
    }
  });

  $("stGenerate").addEventListener("click", generate);
  $("stRegenerate").addEventListener("click", generate);
  $("stQualityButton").addEventListener("click", checkQuality);
  $("stSave").addEventListener("click", () => saveDraft());
  $("stApprove").addEventListener("click", () => saveDraft("approved"));
  $("stCopy").addEventListener("click", () => copyText(editor.value));
  $("stUndo").addEventListener("click", () => {
    const previous = state.history.pop();
    if (previous == null) return;
    editor.value = previous;
    updateMeter();
    remember();
  });
  $("stNew").addEventListener("click", () => {
    if (editor.value.trim() && isDirty() && !window.confirm("Draf semasa belum disimpan. Mula yang baru?")) return;
    state.current = { id: "", generated: "", model: "", dnaVersion: 0, status: "draft" };
    state.history = [];
    state.savedText = "";
    state.revisions = [];
    renderRevisions();
    fillInputs({ topic: "", context: {} });
    $("stQuality").innerHTML = "";
    $("stLocalReview").innerHTML = "";
    setEditor("", { keepHistory: false });
    $("stTopic").focus();
  });
  $("stPreviewToggle").addEventListener("click", () => {
    $("stPreview").hidden = !$("stPreview").hidden;
    $("stPreviewToggle").textContent = $("stPreview").hidden ? "Preview Facebook" : "Tutup preview";
    $("stPreviewBody").dataset.expanded = "false";
    renderPreview();
  });
  $("stFeedbackSend").addEventListener("click", sendFeedback);
  let typing = 0;
  editor.addEventListener("input", () => { updateMeter(); clearTimeout(typing); typing = setTimeout(remember, 600); });
  for (const id of ["stLength", "stLengthCustom", "stIntensity", "stVoice"]) $(id).addEventListener("input", () => { syncControls(); updateMeter(); });

  $("stDnaSave").addEventListener("click", async () => {
    try { await applyDna(await post("dna.save", { profile: dnaFromForm() }), "Writing DNA disimpan sebagai versi baru."); } catch (error) { setStatus($("stDnaStatus"), "err", error.message); }
  });
  $("stDnaAnalyze").addEventListener("click", async () => {
    const json = await runAi($("stDnaStatus"), "Menganalisis contoh post...", () => post("dna.analyze"));
    if (json) applyDna(json, "Writing DNA dijana daripada contoh post. Semak dan sunting jika perlu.");
  });
  $("stDnaLearn").addEventListener("click", async () => {
    const json = await runAi($("stDnaStatus"), "Mempelajari maklum balas...", () => post("dna.learn"));
    if (json) applyDna(json, json.changes?.length ? "Dikemas kini: " + json.changes.join(" ") : "Writing DNA dikemas kini daripada maklum balas.");
  });
  $("stDnaReset").addEventListener("click", async () => {
    if (!window.confirm("Kembali ke preset asal? Versi semasa kekal dalam sejarah.")) return;
    try { await applyDna(await post("dna.reset"), "Preset asal dipulihkan."); } catch (error) { setStatus($("stDnaStatus"), "err", error.message); }
  });

  function resetSampleForm() {
    state.editingSample = "";
    $("stSampleText").value = "";
    $("stSampleSave").textContent = "Tambah contoh";
    $("stSampleCancel").hidden = true;
  }
  $("stSampleCancel").addEventListener("click", resetSampleForm);
  $("stSampleSave").addEventListener("click", async () => {
    try {
      const json = await post("sample.save", { id: state.editingSample, content: $("stSampleText").value, category: $("stSampleCategory").value });
      state.samples = state.editingSample ? state.samples.map((item) => (item.id === json.sample.id ? json.sample : item)) : [json.sample, ...state.samples];
      resetSampleForm();
      renderSamples();
      setStatus($("stSampleStatus"), "ok", "Contoh disimpan.");
    } catch (error) { setStatus($("stSampleStatus"), "err", error.message); }
  });
  $("stImportFile").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 400000) { setStatus($("stSampleStatus"), "err", "Fail terlalu besar (maksimum 400 KB)."); return; }
    $("stImportText").value = await file.text();
    event.target.value = "";
  });
  $("stImport").addEventListener("click", async () => {
    try {
      const json = await post("sample.import", { text: $("stImportText").value, category: $("stSampleCategory").value });
      state.samples = [...json.samples.reverse(), ...state.samples];
      $("stImportText").value = "";
      renderSamples();
      setStatus($("stSampleStatus"), "ok", json.samples.length + " contoh diimport.");
    } catch (error) { setStatus($("stSampleStatus"), "err", error.message); }
  });

  let searching = 0;
  $("stDraftSearch").addEventListener("input", () => { clearTimeout(searching); searching = setTimeout(loadDrafts, 300); });
  $("stDraftFilter").addEventListener("change", loadDrafts);
  $("stVerify").addEventListener("click", async () => {
    setStatus($("stSettingsStatus"), "info", "Menyemak akses model...");
    try {
      const info = (await post("ai.verify")).verification;
      setStatus($("stSettingsStatus"), info.canGenerate ? "ok" : "err", info.canGenerate ? "Model " + info.model + " boleh diakses dengan key ini" + (info.outputTokenLimit ? " (output sehingga " + info.outputTokenLimit + " token)." : ".") : "Model " + info.model + " dijumpai tetapi tidak menyokong penjanaan teks.");
    } catch (error) { setStatus($("stSettingsStatus"), "err", error.message); }
  });

  window.addEventListener("beforeunload", () => {
    remember();
  });

  // Load on first visit to the tab, not at startup.
  document.addEventListener("click", (event) => {
    if (event.target.closest('[data-tab-target="postpilot"]')) load();
  });
  try { showView(localStorage.getItem("buddypilot-storytelling-view") || "write"); } catch { showView("write"); }
  if (root.classList.contains("active")) load();
  new MutationObserver(() => { if (root.classList.contains("active")) load(); }).observe(root, { attributes: true, attributeFilter: ["class"] });
})();
