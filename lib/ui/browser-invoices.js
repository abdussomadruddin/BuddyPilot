module.exports = function render() {
  return `    function invoiceTotal(servicePrice, discount) {
      return Math.max(0, numericValue(servicePrice) - numericValue(discount));
    }

    function updateInvoiceRowTotal(row) {
      const serviceInput = row.querySelector(".service-price-input");
      const discountInput = row.querySelector(".discount-input");
      if (discountInput && numericValue(discountInput.value) > numericValue(serviceInput?.value)) {
        discountInput.value = String(numericValue(serviceInput?.value));
      }
      const total = invoiceTotal(serviceInput?.value, discountInput?.value);
      const totalNode = row.querySelector(".total-payment");
      if (totalNode) {
        totalNode.textContent = formatMoneyValue(total);
        totalNode.dataset.total = String(total);
      }
    }

    function updateAllInvoiceTotals() {
      invoiceList.querySelectorAll(".invoice-row[data-client-code]").forEach(updateInvoiceRowTotal);
    }

    function collectInvoiceDrafts() {
      return [...invoiceList.querySelectorAll(".invoice-row[data-client-code]")].map((row) => ({
        clientCode: row.dataset.clientCode,
        servicePrice: numericValue(row.querySelector(".service-price-input")?.value),
        discount: numericValue(row.querySelector(".discount-input")?.value),
        selected: Boolean(row.querySelector(".invoice-upload-input")?.checked)
      }));
    }

    function selectedInvoiceDrafts() {
      return collectInvoiceDrafts().filter((draft) => draft.selected);
    }

    function selectedInvoiceHasMissingDrive(drafts = selectedInvoiceDrafts()) {
      const selectedCodes = new Set(drafts.map((draft) => draft.clientCode));
      return currentInvoices.some((invoice) => selectedCodes.has(invoice.clientCode) && !invoice.hasDriveFolder);
    }

    function updateUploadInvoicesButtonState() {
      const bankMissing = currentBankStatus && currentBankStatus.source === "supabase" && !currentBankStatus.loaded;
      const selected = selectedInvoiceDrafts();
      uploadInvoicesButton.disabled = bankMissing || !selected.length || selectedInvoiceHasMissingDrive(selected);
    }

    function collectReceiptDrafts() {
      return [...receiptList.querySelectorAll(".invoice-row[data-client-code]")].map((row) => ({
        clientCode: row.dataset.clientCode,
        servicePrice: numericValue(row.dataset.servicePrice),
        discount: numericValue(row.dataset.discount),
        canGenerateReceipt: row.dataset.canGenerateReceipt === "true",
        paid: Boolean(row.querySelector(".receipt-paid-input")?.checked)
      }));
    }

    function updateUploadReceiptsButtonState() {
      const bankMissing = currentBankStatus && currentBankStatus.source === "supabase" && !currentBankStatus.loaded;
      uploadReceiptsButton.disabled = bankMissing || !collectReceiptDrafts().some((draft) => draft.paid && draft.canGenerateReceipt);
    }

    function renderReceiptList(receipts) {
      currentReceipts = receipts;
      if (!receipts.length) {
        receiptList.className = "invoice-list";
        receiptList.innerHTML = "";
        uploadReceiptsButton.disabled = true;
        receiptResult.className = "result err";
        receiptResult.textContent = "Belum ada client. Tambah pelanggan dahulu di Client Pilot.";
        return;
      }

      const rows = receipts.map((receipt) => {
        const folderNote = receipt.hasDriveFolder ? "" : "<span class=\\"invoice-muted\\">Folder Drive belum diset</span>";
        const servicePrice = Number(receipt.servicePrice || receipt.amount || 0).toFixed(2);
        const discount = Number(receipt.discount || 0).toFixed(2);
        const total = invoiceTotal(servicePrice, discount);
        const canGenerateReceipt = Boolean(receipt.canGenerateReceipt);
        const totalText = canGenerateReceipt ? formatMoneyValue(total) : "Upload invoice dahulu";
        const statusNote = receipt.receiptStatusNote || (canGenerateReceipt ? "" : "Upload invoice dahulu");
        return \`
          <div class="invoice-row" data-client-code="\${escapeHtml(receipt.clientCode)}" data-service-price="\${escapeHtml(servicePrice)}" data-discount="\${escapeHtml(discount)}" data-can-generate-receipt="\${escapeHtml(String(canGenerateReceipt))}">
            <div>
              <label class="check-row">
                <input class="receipt-paid-input" type="checkbox" \${canGenerateReceipt ? "" : "disabled"}>
                Telah dibayar
              </label>
            </div>
            <div>
              <span class="invoice-client">\${escapeHtml(receipt.clientName)}</span>
              <span class="invoice-muted">\${escapeHtml(receipt.billingName || receipt.clientCode)}</span>
            </div>
            <div>
              \${escapeHtml(receipt.invoiceNumber)}
              <span class="invoice-muted">\${escapeHtml(receipt.fileName)}</span>
              <span class="invoice-muted">\${escapeHtml(statusNote)}</span>
            </div>
            <div class="total-payment" data-total="\${escapeHtml(String(total))}">\${escapeHtml(totalText)}</div>
            <div>
              <button class="link-button review-receipt-button" type="button" data-client-code="\${escapeHtml(receipt.clientCode)}" \${canGenerateReceipt ? "" : "disabled"}>Review Resit</button>
              \${folderNote}
            </div>
          </div>
        \`;
      }).join("");

      receiptList.innerHTML = \`
        <div class="invoice-row header">
          <div>Paid</div>
          <div>Client</div>
          <div>Receipt</div>
          <div>Total Payment</div>
          <div>Review</div>
        </div>
        \${rows}
      \`;
      receiptList.className = "invoice-list show receipt-list";
      const bankMissing = currentBankStatus && currentBankStatus.source === "supabase" && !currentBankStatus.loaded;
      uploadReceiptsButton.disabled = true;
      receiptResult.className = "result ok";
      receiptResult.textContent = bankMissing
        ? "Receipt draft siap. Tambah atau set default akaun bank dahulu sebelum review/upload PDF."
        : receipts.every((receipt) => !receipt.canGenerateReceipt)
        ? "Upload invoice bulan ini dahulu. Receipt akan ikut harga dan diskaun invoice yang sudah di-upload."
        : "Tick invoice yang sudah dibayar, review resit, kemudian upload selected receipts.";
    }

    function renderInvoiceList(invoices) {
      currentInvoices = invoices;
      setTextIfPresent(dashboardInvoiceCount, String(invoices.length));
      if (!invoices.length) {
        invoiceList.className = "invoice-list";
        invoiceList.innerHTML = "";
        uploadInvoicesButton.disabled = true;
        invoiceResult.className = "result err";
        invoiceResult.textContent = "Belum ada client. Tambah pelanggan dahulu di Client Pilot.";
        return;
      }

      const rows = invoices.map((invoice) => {
        const folderNote = invoice.hasDriveFolder ? "" : "<span class=\\"invoice-muted\\">Folder Drive belum diset</span>";
        const servicePrice = Number(invoice.servicePrice || invoice.amount || 0).toFixed(2);
        const discount = Number(invoice.discount || 0).toFixed(2);
        const total = invoiceTotal(servicePrice, discount);
        return \`
          <div class="invoice-row" data-client-code="\${escapeHtml(invoice.clientCode)}">
            <div>
              <label class="check-row">
                <input class="invoice-upload-input" type="checkbox">
                Upload
              </label>
            </div>
            <div>
              <span class="invoice-client">\${escapeHtml(invoice.clientName)}</span>
              <span class="invoice-muted">\${escapeHtml(invoice.billingName || invoice.clientCode)}</span>
            </div>
            <div>
              \${escapeHtml(invoice.invoiceNumber)}
              <span class="invoice-muted">\${escapeHtml(invoice.fileName)}</span>
            </div>
            <div>
              <input class="money-input service-price-input" type="number" min="0" step="0.01" inputmode="decimal" aria-label="Harga Service \${escapeHtml(invoice.clientName)}" value="\${escapeHtml(servicePrice)}">
            </div>
            <div>
              <input class="money-input discount-input" type="number" min="0" step="0.01" inputmode="decimal" aria-label="Diskaun \${escapeHtml(invoice.clientName)}" value="\${escapeHtml(discount)}">
            </div>
            <div class="total-payment" data-total="\${escapeHtml(String(total))}">\${escapeHtml(formatMoneyValue(total))}</div>
            <div>
              <button class="link-button review-pdf-button" type="button" data-client-code="\${escapeHtml(invoice.clientCode)}">Review PDF</button>
              \${folderNote}
            </div>
          </div>
        \`;
      }).join("");

      invoiceList.innerHTML = \`
        <div class="invoice-row header">
          <div>Pilih</div>
          <div>Client</div>
          <div>Invoice</div>
          <div>Harga Service</div>
          <div>Diskaun</div>
          <div>Total Payment</div>
          <div>Review</div>
        </div>
        \${rows}
      \`;
      invoiceList.className = "invoice-list show";
      const bankMissing = currentBankStatus && currentBankStatus.source === "supabase" && !currentBankStatus.loaded;
      updateUploadInvoicesButtonState();
      invoiceResult.className = "result ok";
      invoiceResult.textContent = bankMissing
        ? "Invoice draft siap. Tambah atau set default akaun bank dahulu sebelum review/upload PDF."
        : invoices.some((invoice) => !invoice.hasDriveFolder)
        ? "Invoice siap untuk review, tapi ada client yang belum ada Drive folder ID."
        : "Invoice siap untuk review. Tick client yang mahu diupload, edit harga/diskaun jika perlu, kemudian upload selected invoices.";
    }

    async function generateInvoices() {
      invoiceResult.className = "result";
      invoiceResult.textContent = "";
      invoiceList.className = "invoice-list";
      generateInvoicesButton.disabled = true;
      uploadInvoicesButton.disabled = true;
      generateInvoicesButton.textContent = "Generating...";

      try {
        const response = await fetch("/api/invoices/preview", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ period: invoicePeriod.value })
        });
        const json = await readApiJson(response);
        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }
        if (!response.ok || !json.ok) throw new Error(json.error || "Generate invoice failed.");
        invoicePeriod.value = json.period;
        currentBankStatus = json.bankStatus || null;
        renderInvoiceList(json.invoices || []);
      } catch (error) {
        showInvoiceError(error);
      } finally {
        generateInvoicesButton.disabled = false;
        generateInvoicesButton.textContent = "Generate Invoices";
      }
    }

    async function generateReceipts() {
      receiptResult.className = "result";
      receiptResult.textContent = "";
      receiptList.className = "invoice-list";
      generateReceiptsButton.disabled = true;
      uploadReceiptsButton.disabled = true;
      generateReceiptsButton.textContent = "Generating...";

      try {
        const response = await fetch("/api/receipts/preview", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ period: receiptPeriod.value })
        });
        const json = await readApiJson(response);
        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }
        if (!response.ok || !json.ok) throw new Error(json.error || "Generate receipt failed.");
        receiptPeriod.value = json.period;
        currentBankStatus = json.bankStatus || null;
        renderReceiptList(json.receipts || []);
      } catch (error) {
        showReceiptError(error);
      } finally {
        generateReceiptsButton.disabled = false;
        generateReceiptsButton.textContent = "Generate Receipts";
      }
    }

    async function saveClient(event) {
      event.preventDefault();
      const isActivation = clientForm.dataset.mode !== "edit" && currentClientOnboardingStep === "review";
      const onboardingWhatsappWindow = isActivation ? window.open("", "_blank") : null;
      let onboardingWhatsappOpened = false;
      if (onboardingWhatsappWindow) onboardingWhatsappWindow.document.title = "Preparing WhatsApp...";
      setMessage(clientResult, "", "");
      saveClientButton.disabled = true;
      saveClientButton.textContent = "Saving...";

      try {
        const isEditMode = clientForm.dataset.mode === "edit";
        const payload = Object.fromEntries(new FormData(clientForm).entries());
        if (isEditMode) {
          const response = await fetch("/api/clients", {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(payload)
          });
          const json = await readApiJson(response);
          if (response.status === 401) {
            window.location.href = "/login";
            return;
          }
          if (!response.ok || !json.ok) throw new Error(json.error || "Save client failed.");
          const savedMessage = [
            \`Client updated: \${json.client?.brandClient || "-"}\`,
            "Detail pelanggan sudah disimpan dalam database."
          ].join("\\n");
          resetClientFormMode();
          await loadClients();
          await loadActivity();
          if (currentInvoices.length) await generateInvoices();
          setMessage(clientResult, "ok", savedMessage + "\\nSenarai pelanggan sudah dikemas kini.");
          activateSubtab("client", "client-list-panel");
          return;
        }

        const step = currentClientOnboardingStep;
        const existingCode = String(payload.clientCode || "").trim();
        let method = "PATCH";
        let action = step;
        if (step === "details" && !existingCode) {
          method = "POST";
          action = "start";
        }
        if (step === "telegram") {
          const client = currentClients.find((item) => item.code === existingCode);
          const connected = (client?.telegramReportConfig?.recipients || []).some((item) => item.connected);
          payload.status = connected ? "complete" : "skipped";
        }
        payload.action = step === "review" ? "activate" : action;
        const response = await fetch("/api/clients/onboarding", {
          method,
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload)
        });
        const json = await readApiJson(response);
        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }
        if (!response.ok || !json.ok) throw new Error(json.error || "Onboarding client gagal.");
        currentClientOnboarding = json.onboarding;
        clientForm.elements.clientCode.value = json.clientCode || existingCode;
        await loadClients();
        await loadActivity();
        if (step === "review") {
          const label = currentClients.find((item) => item.code === json.clientCode)?.brandClient || json.clientCode;
          let whatsappNote = "WhatsApp onboarding dibuka untuk client.";
          try {
            await openClientOnboardingWelcome(json.clientCode, onboardingWhatsappWindow);
            onboardingWhatsappOpened = true;
          } catch (welcomeError) {
            if (onboardingWhatsappWindow && !onboardingWhatsappWindow.closed) onboardingWhatsappWindow.close();
            whatsappNote = "Client sudah aktif, tetapi WhatsApp gagal dibuka: " + (welcomeError.message || String(welcomeError));
          }
          resetClientFormMode();
          setMessage(clientResult, "ok", \`Onboarding \${label} selesai. Client kini aktif untuk invoice, report dan automation.\\n\${whatsappNote}\`);
          activateSubtab("client", "client-list-panel");
          loadTodayDashboard({ silent: true, force: true });
          return;
        }
        const nextStep = step === "ads" && json.onboarding?.checks?.drive
          ? "telegram"
          : ({ details: "ads", ads: "drive", drive: "telegram", telegram: "review" }[step] || json.onboarding.step);
        showClientOnboardingStep(nextStep);
        setMessage(clientResult, "ok", "Progress onboarding disimpan.");
      } catch (error) {
        if (onboardingWhatsappWindow && !onboardingWhatsappWindow.closed) onboardingWhatsappWindow.close();
        showClientError(error);
      } finally {
        if (onboardingWhatsappWindow && !onboardingWhatsappOpened && !onboardingWhatsappWindow.closed) onboardingWhatsappWindow.close();
        saveClientButton.disabled = false;
        if (clientForm.dataset.mode === "edit") saveClientButton.textContent = "Update Client";
        else if (clientForm.dataset.mode === "onboarding") showClientOnboardingStep(currentClientOnboardingStep);
      }
    }

    async function discardCurrentClientOnboarding() {
      const clientCode = clientForm.elements.clientCode.value;
      if (!clientCode || !window.confirm("Discard onboarding ini? Draft client dan folder yang sudah dibuat akan dibuang.")) return;
      const finishButton = setButtonBusy(discardClientOnboardingButton, "Discarding...");
      try {
        const response = await fetch("/api/clients/onboarding", {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ clientCode })
        });
        const json = await readApiJson(response);
        if (!response.ok || !json.ok) throw new Error(json.error || "Discard onboarding gagal.");
        finishButton("Discarded");
        resetClientFormMode();
        await loadClients();
        await loadActivity();
        setMessage(clientResult, "ok", "Draft onboarding sudah dibuang.");
        activateSubtab("client", "client-list-panel");
      } catch (error) {
        finishButton();
        showClientError(error);
      }
    }

    async function reviewInvoicePdf(clientCode) {
      const draft = collectInvoiceDrafts().find((item) => item.clientCode === clientCode);
      if (!draft) throw new Error("Draft invoice tidak dijumpai.");

      invoiceResult.className = "result";
      invoiceResult.textContent = "";
      const params = new URLSearchParams({
        client: draft.clientCode,
        period: invoicePeriod.value,
        servicePrice: String(draft.servicePrice),
        discount: String(draft.discount)
      });
      const url = \`/api/invoices/pdf?\${params.toString()}\`;
      const opened = window.open(url, "_blank");
      if (!opened) window.location.href = url;
    }

    async function reviewReceiptPdf(clientCode) {
      const draft = collectReceiptDrafts().find((item) => item.clientCode === clientCode);
      if (!draft) throw new Error("Draft receipt tidak dijumpai.");

      receiptResult.className = "result";
      receiptResult.textContent = "";
      const params = new URLSearchParams({
        client: draft.clientCode,
        period: receiptPeriod.value,
        servicePrice: String(draft.servicePrice),
        discount: String(draft.discount)
      });
      const url = \`/api/receipts/pdf?\${params.toString()}\`;
      const opened = window.open(url, "_blank");
      if (!opened) window.location.href = url;
    }

    async function uploadInvoices() {
      invoiceResult.className = "result";
      invoiceResult.textContent = "";
      const drafts = collectInvoiceDrafts().filter((draft) => draft.selected);
      if (!drafts.length) {
        showInvoiceError(new Error("Tick sekurang-kurangnya satu invoice untuk upload ke Google Drive."));
        return;
      }
      if (selectedInvoiceHasMissingDrive(drafts)) {
        showInvoiceError(new Error("Invoice yang dipilih ada client tanpa folder Drive. Pilih client yang foldernya sudah siap."));
        return;
      }
      uploadInvoicesButton.disabled = true;
      generateInvoicesButton.disabled = true;
      uploadInvoicesButton.textContent = "Uploading...";

      try {
        const response = await fetch("/api/invoices/upload", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            period: invoicePeriod.value,
            drafts
          })
        });
        const json = await readApiJson(response);
        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }
        if (!response.ok || !json.ok) throw new Error(json.error || "Upload invoice failed.");

        const lines = (json.uploads || []).map((upload) => {
          const action = upload.replaced ? "replaced" : "uploaded";
          return \`\${upload.invoiceNumber} - \${upload.clientName}: \${action} (\${upload.webViewLink || upload.fileId})\`;
        });
        invoiceResult.className = "result ok";
        invoiceResult.textContent = ["Upload selesai.", ...lines].join("\\n");
        showToast(String((json.uploads || []).length) + " invois selesai diupload.");
        loadTodayDashboard({ silent: true, force: true });
        await loadActivity();
      } catch (error) {
        showInvoiceError(error);
      } finally {
        generateInvoicesButton.disabled = false;
        uploadInvoicesButton.textContent = "Upload Selected Invoices";
        updateUploadInvoicesButtonState();
      }
    }

    async function uploadReceipts() {
      receiptResult.className = "result";
      receiptResult.textContent = "";
      const drafts = collectReceiptDrafts();
      if (!drafts.some((draft) => draft.paid && draft.canGenerateReceipt)) {
        showReceiptError(new Error("Tick sekurang-kurangnya satu invoice yang telah dibayar."));
        return;
      }
      uploadReceiptsButton.disabled = true;
      generateReceiptsButton.disabled = true;
      uploadReceiptsButton.textContent = "Uploading...";

      try {
        const response = await fetch("/api/receipts/upload", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            period: receiptPeriod.value,
            drafts
          })
        });
        const json = await readApiJson(response);
        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }
        if (!response.ok || !json.ok) throw new Error(json.error || "Upload receipt failed.");

        const lines = (json.uploads || []).map((upload) => {
          const action = upload.replaced ? "replaced" : "uploaded";
          return \`\${upload.invoiceNumber} - \${upload.clientName}: \${action} (\${upload.webViewLink || upload.fileId})\`;
        });
        receiptResult.className = "result ok";
        receiptResult.textContent = ["Upload resit selesai.", ...lines].join("\\n");
        showToast(String((json.uploads || []).length) + " resit selesai diupload.");
        loadTodayDashboard({ silent: true, force: true });
        await loadActivity();
      } catch (error) {
        showReceiptError(error);
      } finally {
        generateReceiptsButton.disabled = false;
        uploadReceiptsButton.textContent = "Upload Selected Receipts";
        updateUploadReceiptsButtonState();
      }
    }

`;
};
