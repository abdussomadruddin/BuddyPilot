(() => {
  "use strict";
  const byId = (id) => document.getElementById(id);
  const panel = byId("clientAdsPanel");
  if (!panel) return;
  const controls = Object.fromEntries(["Client", "All", "Platform", "Result", "Lead", "Period", "Start", "End", "Load", "Status", "Account", "Save", "CampaignLoad", "AddProduct", "Products", "CampaignChoices", "Output"].map((name) => [name, byId("cam" + name)]));
  let revision = 0, controller = null, settings = null, catalog = [], busy = false, loadingSettings = false;
  let configScope = "", loadedClients = false;
  let dirty = false;
  let clientsRevision = 0;
  const keys = ["purchase", "form", "message"];
  const scope = () => controls.Client.value + ":" + controls.Platform.value;
  const key = () => controls.Result.value === "purchase" ? "purchase" : controls.Lead.value;
  const ready = () => controls.Client.value && controls.Platform.value && controls.Result.value && (controls.Result.value !== "lead" || controls.Lead.value) && (controls.Period.value !== "custom" || (controls.Start.value && controls.End.value));
  const node = (tag, text, className) => { const el = document.createElement(tag); if (text != null) el.textContent = text; if (className) el.className = className; return el; };
  function status(message, error = false) { controls.Status.textContent = message; controls.Status.style.color = error ? "var(--red)" : ""; }
  function sync() {
    const hasSettings = settings && configScope === scope() && !loadingSettings;
    controls.Load.disabled = busy || dirty || !ready() || !hasSettings || !settings.accountId || !settings.selections[key()]?.length;
    controls.Account.disabled = busy || !hasSettings;
    controls.Save.disabled = busy || !hasSettings || !controls.Account.value;
    controls.CampaignLoad.disabled = busy || !ready() || !hasSettings || !settings.accountId;
    controls.AddProduct.disabled = busy || !hasSettings;
    byId("camLeadField").hidden = controls.Result.value !== "lead";
    byId("camStartField").hidden = byId("camEndField").hidden = controls.Period.value !== "custom";
    controls.Lead.querySelector('option[value="message"]').textContent = controls.Platform.value === "tiktok" ? "TikTok Message" : "WhatsApp / Message";
  }
  function invalidate() {
    revision++; controller?.abort(); controller = null; busy = false;
    controls.Load.textContent = "Refresh Data"; controls.CampaignLoad.textContent = "Muatkan Campaign";
    controls.Save.textContent = "Simpan Tetapan";
    controls.Output.replaceChildren(); sync();
  }
  function query(action) { return new URLSearchParams({ action, clientCode: controls.Client.value, platform: controls.Platform.value, result: controls.Result.value, leadType: controls.Lead.value, period: controls.Period.value, startDate: controls.Start.value, endDate: controls.End.value }); }
  async function api(url, options = {}) {
    const response = await fetch(url, { cache: "no-store", ...options });
    if (response.status === 401) { window.location.href = "/login"; throw new Error("Sesi tamat."); }
    const json = await response.json();
    if (!response.ok || !json.ok) throw new Error(json.error || "Monitor tidak tersedia.");
    return json;
  }
  function option(select, value, text) { const el = node("option", text); el.value = value; select.append(el); }
  async function loadClients() {
    invalidate(); settings = null; loadingSettings = false; dirty = false;
    controls.Account.replaceChildren(); option(controls.Account, "", "Pilih akaun");
    controls.Products.replaceChildren(); controls.CampaignChoices.replaceChildren();
    controls.Client.replaceChildren(); option(controls.Client, "", "Pilih client"); sync();
    controls.Client.disabled = true;
    status("Memuatkan client...");
    const current = ++clientsRevision;
    try {
      const json = await api("/api/client-ads-monitor?action=clients&all=" + controls.All.checked);
      if (current !== clientsRevision) return;
      json.clients.forEach((client) => option(controls.Client, client.code, client.name + (controls.All.checked ? " · " + client.status : "")));
      status(json.clients.length ? "Pilih client, platform dan result dahulu." : "Tiada client untuk pilihan ini.");
      loadedClients = true;
    } catch (error) { if (current === clientsRevision) { loadedClients = false; status(error.message, true); } }
    finally { if (current === clientsRevision) { controls.Client.disabled = false; sync(); } }
  }
  async function loadSettings() {
    invalidate(); settings = null; catalog = []; configScope = ""; loadingSettings = false; dirty = false;
    controls.Account.replaceChildren(); option(controls.Account, "", "Pilih akaun");
    controls.Products.replaceChildren(); controls.CampaignChoices.replaceChildren();
    if (!controls.Client.value || !controls.Platform.value) { status("Pilih client dan platform dahulu."); sync(); return; }
    const current = revision;
    loadingSettings = true; sync(); status("Memuatkan pautan akaun...");
    controller = new AbortController();
    try {
      const json = await api("/api/client-ads-monitor?" + query("settings"), { signal: controller.signal });
      if (current !== revision) return;
      settings = json.config; configScope = scope();
      json.accounts.forEach((account) => option(controls.Account, account.id.replace(/^act_/, ""), account.name + " · " + account.id));
      if (settings.accountId && !json.accounts.some((account) => account.id.replace(/^act_/, "") === settings.accountId)) option(controls.Account, settings.accountId, settings.accountName + " · Tidak boleh diakses");
      controls.Account.value = settings.accountId;
      renderEditors(); status(settings.accountId ? "Pilih result dan semak campaign dipautkan." : "Pautkan dan simpan akaun platform ini dahulu.");
    } catch (error) { if (current === revision && error.name !== "AbortError") status(error.message, true); }
    finally { if (current === revision) { loadingSettings = false; sync(); } }
  }
  function choices(container, selected, onChange) {
    const rows = new Map(catalog.map((row) => [row.id, row]));
    selected.forEach((id) => { if (!rows.has(id)) rows.set(id, { id, name: id + " · Tiada data dalam tempoh ini" }); });
    for (const row of rows.values()) {
      const label = node("label", null, "cam-choice"), checkbox = node("input"); checkbox.type = "checkbox"; checkbox.checked = selected.includes(row.id);
      checkbox.addEventListener("change", () => onChange(row.id, checkbox.checked));
      label.append(checkbox, node("span", row.name + (row.metricAvailable === false ? " · Metric tidak tersedia" : ""))); container.append(label);
    }
  }
  function renderEditors() {
    controls.Products.replaceChildren(); controls.CampaignChoices.replaceChildren();
    if (!settings) return;
    if (key()) {
      controls.CampaignChoices.append(node("h3", "Campaign · " + (key() === "purchase" ? "Purchase" : key() === "form" ? "Form Lead" : "Message")));
      choices(controls.CampaignChoices, settings.selections[key()] || [], (id, checked) => {
        const selected = new Set(settings.selections[key()]); checked ? selected.add(id) : selected.delete(id);
        settings.selections[key()] = [...selected]; dirty = true; invalidate(); status("Tetapan berubah. Simpan sebelum refresh data.");
      });
    }
    for (const product of settings.products) {
      const group = node("div", null, "cam-product-editor");
      for (const [field, label, type] of [["name", "Nama produk", "text"], ["sellingPrice", "Selling price", "number"], ["marginPercent", "Gross margin %", "number"]]) {
        const input = node("input"); input.type = type; input.value = product[field] ?? "";
        if (type === "number") { input.min = "0"; input.step = "0.01"; if (field === "marginPercent") input.max = "100"; }
        const wrapping = node("label", label); wrapping.append(input); group.append(wrapping);
        input.addEventListener("input", () => { product[field] = input.value; dirty = true; invalidate(); status("Tetapan berubah. Simpan dahulu."); });
      }
      const remove = node("button", "Buang Produk", "secondary"); remove.type = "button";
      remove.addEventListener("click", () => { settings.products = settings.products.filter((item) => item.id !== product.id); dirty = true; invalidate(); renderEditors(); });
      choices(group, product.campaignIds, (id, checked) => {
        if (checked && settings.products.some((other) => other.id !== product.id && other.campaignIds.includes(id))) { status("Campaign sudah dipautkan kepada produk lain.", true); renderEditors(); return; }
        const ids = new Set(product.campaignIds); checked ? ids.add(id) : ids.delete(id); product.campaignIds = [...ids]; dirty = true; invalidate();
      });
      group.append(remove); controls.Products.append(group);
    }
    sync();
  }
  function metrics(item, currency) {
    const grid = node("div", null, "cam-metrics");
    const money = (value) => value == null ? "N/A" : currency + " " + Number(value).toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const values = [["Spend", money(item.spend)], [controls.Result.value === "purchase" ? "Purchases" : controls.Lead.value === "form" ? "Form Leads" : "Messages", item.results ?? "N/A"],
      [controls.Result.value === "purchase" ? "CPP" : "Cost / Result", money(item.costPerResult)], ["Impressions", item.impressions], ["Clicks", item.clicks], ["Link Clicks", item.linkClicks], ["CTR", item.ctr == null ? "N/A" : item.ctr + "%"], ["CPC", money(item.cpc)], ["CPM", money(item.cpm)]];
    if (controls.Result.value === "purchase") values.splice(3, 0, [item.estimatedRevenue ? "Est. Revenue" : "Revenue", money(item.revenue)], ["ROAS", item.roas ?? "N/A"], ["Est. Profit", money(item.profit)]);
    if (Object.hasOwn(item, "reach")) values.push(["Reach", item.reach], ["Frequency", item.frequency ?? "N/A"]);
    for (const [label, value] of values) { const cell = node("div", null, "cam-metric"); cell.append(node("span", label), node("strong", value ?? "N/A")); grid.append(cell); }
    return grid;
  }
  function render(snapshot) {
    controls.Output.replaceChildren();
    const date = new Intl.DateTimeFormat("ms-MY", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kuala_Lumpur" }).format(new Date(snapshot.capturedAt));
    controls.Output.append(node("h2", snapshot.clientName + " · " + snapshot.accountName), node("p", snapshot.startDate + " – " + snapshot.endDate + " · " + date + " MYT", "note"));
    if (snapshot.partial) controls.Output.append(node("p", "Data separa; semak amaran sebelum membuat keputusan.", "note"));
    controls.Output.append(node("h3", "Overall · Campaign dipilih"), metrics(snapshot.overall, snapshot.currency));
    if (controls.Result.value === "purchase") controls.Output.append(node("p", snapshot.overall.estimatedRevenue ? "Revenue anggaran: purchase × selling price. Profit ialah gross profit selepas ads spend, bukan net business profit." : "Profit memerlukan margin bagi semua produk yang mempunyai purchase. N/A bermaksud data belum lengkap.", "note"));
    const warningList = node("ul"); snapshot.warnings.forEach((warning) => warningList.append(node("li", warning))); controls.Output.append(warningList);
    controls.Output.append(node("h3", "Performance by Product"));
    snapshot.products.forEach((product) => controls.Output.append(node("h3", product.name), metrics(product, snapshot.currency)));
    controls.Output.append(node("h3", "Campaign Breakdown"));
    snapshot.campaigns.forEach((campaign) => {
      const detail = node("details", null, "cam-campaign"); detail.append(node("summary", campaign.name + " · " + (campaign.spend == null ? "N/A" : snapshot.currency + " " + campaign.spend)));
      detail.append(metrics(campaign, snapshot.currency), node("p", campaign.reason, "note")); controls.Output.append(detail);
    });
    if (!snapshot.campaigns.length) controls.Output.append(node("p", "Tiada campaign dipilih yang memulangkan data untuk tempoh ini."));
  }
  async function fetchData(campaignsOnly) {
    if (!ready() || busy || !settings?.accountId) return;
    invalidate(); const current = revision; busy = true; sync(); controller = new AbortController();
    const button = campaignsOnly ? controls.CampaignLoad : controls.Load;
    button.textContent = "Loading..."; status("Memuatkan data " + controls.Platform.value + "...");
    try {
      const json = await api("/api/client-ads-monitor?" + query(campaignsOnly ? "campaigns" : "data"), { signal: controller.signal });
      if (current !== revision) return;
      if (campaignsOnly) { catalog = json.catalog.campaigns; renderEditors(); status(catalog.length ? "Pilih campaign untuk result ini dan simpan tetapan." : "Tiada campaign dalam tempoh ini."); }
      else { render(json.snapshot); status(json.snapshot.partial ? "Data separa." : "Data dikemas kini."); }
    } catch (error) { if (current === revision && error.name !== "AbortError") status(error.message, true); }
    finally { if (current === revision) { busy = false; button.textContent = campaignsOnly ? "Muatkan Campaign" : "Refresh Data"; sync(); } }
  }
  controls.Save.addEventListener("click", async () => {
    if (!settings || !controls.Account.value || busy) return;
    invalidate(); const current = revision; busy = true; sync(); controls.Save.textContent = "Saving...";
    try {
      const json = await api("/api/client-ads-monitor", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ clientCode: controls.Client.value, platform: controls.Platform.value, config: { ...settings, accountId: controls.Account.value } }) });
      if (current !== revision) return;
      settings = json.config; dirty = false; renderEditors(); status("Tetapan monitor disimpan. Weekly report tidak diubah.");
    } catch (error) { if (current === revision) status(error.message, true); }
    finally { if (current === revision) { busy = false; controls.Save.textContent = "Simpan Tetapan"; sync(); } }
  });
  controls.AddProduct.addEventListener("click", () => {
    if (!settings) return;
    settings.products.push({ id: crypto.randomUUID(), name: "", sellingPrice: null, marginPercent: null, campaignIds: [] }); dirty = true; invalidate(); renderEditors();
  });
  controls.Account.addEventListener("change", () => {
    dirty = true; invalidate(); settings.accountId = ""; settings.selections = { purchase: [], form: [], message: [] }; settings.products = []; catalog = []; renderEditors(); status("Simpan pautan akaun dahulu; pilihan campaign dan produk dikosongkan untuk mengelakkan data bercampur.");
  });
  controls.All.addEventListener("change", loadClients);
  controls.Client.addEventListener("change", loadSettings); controls.Platform.addEventListener("change", loadSettings);
  for (const control of [controls.Result, controls.Lead, controls.Period, controls.Start, controls.End]) control.addEventListener("change", () => {
    if (loadingSettings) { loadSettings(); return; }
    invalidate(); renderEditors(); status("Pilihan berubah. Refresh untuk memuatkan data.");
  });
  controls.Load.addEventListener("click", () => fetchData(false)); controls.CampaignLoad.addEventListener("click", () => fetchData(true));
  function mode(client) {
    invalidate(); panel.hidden = !client; byId("adsCmoPersonalPanel").hidden = client;
    for (const [id, selected] of [["adsModePersonal", !client], ["adsModeClient", client]]) { byId(id).classList.toggle("active", selected); byId(id).setAttribute("aria-selected", String(selected)); }
    if (client && !loadedClients) loadClients();
    else if (client && (loadingSettings || !settings)) loadSettings();
  }
  byId("adsModePersonal").addEventListener("click", () => mode(false)); byId("adsModeClient").addEventListener("click", () => mode(true));
  sync();
})();
