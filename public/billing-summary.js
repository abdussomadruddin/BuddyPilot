(() => {
  const form = document.getElementById("billingSummaryForm");
  if (!form) return;
  const rows = document.getElementById("billingTransactionRows");
  const add = document.getElementById("billingAddRow");
  const generate = document.getElementById("billingGenerate");
  const status = document.getElementById("billingStatus");
  const download = document.getElementById("billingDownload");
  const open = document.getElementById("billingOpen");
  const preview = document.getElementById("billingPreview");
  let currentUrl = null;
  let request = null;
  let sequence = 0;
  const initialButton = generate.innerHTML;
  function clearPreview() {
    preview.hidden = true;
    preview.querySelector("iframe").removeAttribute("src");
    download.hidden = open.hidden = true;
    download.removeAttribute("href");
    open.removeAttribute("href");
    if (currentUrl) URL.revokeObjectURL(currentUrl);
    currentUrl = null;
  }
  function updateTotal() {
    const total = [...rows.querySelectorAll('[data-field="amount"]')].reduce((sum, field) => sum + (Number.isFinite(field.valueAsNumber) ? Math.round(field.valueAsNumber * 100) : 0), 0);
    document.getElementById("billingTotal").textContent = form.elements.currency.value + (total / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    add.disabled = rows.children.length >= 200;
    [...rows.children].forEach((row, index) => {
      row.querySelector("legend").textContent = "Transaksi " + (index + 1);
      row.querySelector("button").disabled = rows.children.length === 1;
    });
  }
  function invalidate() {
    sequence++;
    request?.abort();
    request = null;
    generate.disabled = false;
    generate.innerHTML = initialButton;
    generate.removeAttribute("aria-busy");
    status.textContent = "";
    clearPreview();
    updateTotal();
  }
  function addRow() {
    if (rows.children.length >= 200) return;
    const row = document.createElement("fieldset");
    row.className = "billing-transaction";
    row.innerHTML = '<legend></legend><label>Tarikh<input type="date" data-field="date" required></label><label class="billing-id">Transaction ID<input data-field="id" maxlength="100" required></label><label>Amaun<input type="number" data-field="amount" min="0" max="999999999.99" step="0.01" required></label><label>Status<select data-field="status"><option>Paid</option><option>Pending</option><option>Failed</option><option>Refunded</option></select></label><button type="button" class="secondary" aria-label="Buang transaksi" title="Buang transaksi"><svg class="icon" aria-hidden="true"><use href="/icons.svg?v=billing1#trash"></use></svg></button>';
    row.querySelector("button").addEventListener("click", () => { row.remove(); invalidate(); });
    rows.append(row);
    invalidate();
  }
  add.addEventListener("click", addRow);
  form.addEventListener("input", invalidate);
  form.addEventListener("change", invalidate);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (request || !form.reportValidity()) return;
    const input = Object.fromEntries(new FormData(form));
    input.transactions = [...rows.children].map((row) => Object.fromEntries([...row.querySelectorAll("[data-field]")].map((field) => [field.dataset.field, field.value])));
    const id = ++sequence;
    request = new AbortController();
    const timer = setTimeout(() => { if (sequence === id) request?.abort(); }, 60000);
    clearPreview();
    generate.disabled = true;
    generate.setAttribute("aria-busy", "true");
    generate.textContent = "Menjana PDF...";
    status.textContent = "Menjana PDF...";
    try {
      const response = await fetch("/api/billing-summary", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input), signal: request.signal });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(response.status === 401 ? "Sesi tamat. Log masuk semula." : error.error || "PDF gagal dijana.");
      }
      if (!response.headers.get("content-type")?.includes("application/pdf")) throw new Error("Respons PDF tidak sah.");
      const blob = await response.blob();
      if (sequence !== id) return;
      currentUrl = URL.createObjectURL(blob);
      download.href = open.href = currentUrl;
      download.download = input.start + "--" + input.end + "_Billing_Summary.pdf";
      download.hidden = open.hidden = false;
      preview.querySelector("iframe").src = currentUrl;
      preview.hidden = false;
      status.textContent = "PDF siap.";
    } catch (error) {
      if (sequence === id) status.textContent = error.name === "AbortError" ? "Permintaan tamat masa. Cuba semula." : error.message;
    } finally {
      clearTimeout(timer);
      if (sequence === id) {
        request = null;
        generate.disabled = false;
        generate.innerHTML = initialButton;
        generate.removeAttribute("aria-busy");
      }
    }
  });
  window.addEventListener("pagehide", () => { request?.abort(); clearPreview(); });
  addRow();
})();
