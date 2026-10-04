module.exports = function render() {
  return `    const requestedInvoicePeriod = new URLSearchParams(window.location.search).get("period") || "";
    invoicePeriod.value = /^(?:\\d{4})-(?:0[1-9]|1[0-2])$/.test(requestedInvoicePeriod)
      ? requestedInvoicePeriod : localStorage.getItem("buddypilot-invoice-period") || defaultInvoicePeriod();
    receiptPeriod.value = localStorage.getItem("buddypilot-receipt-period") || invoicePeriod.value;
    const reportWeek = defaultReportWeek();
    reportStartDate.value = reportWeek.start;
    reportEndDate.value = reportWeek.end;
    setupTabs();
    setupMenuIntegrations();
    setupMainTabSwipe();
    setupMainTabScrub();
    setupPanels();
    topbarMenu.addEventListener("toggle", () => {
      const drawerMode = window.matchMedia("(max-width: 600px)").matches;
      document.body.classList.toggle("menu-drawer-open", drawerMode && topbarMenu.open);
      menuBackdrop.hidden = !(drawerMode && topbarMenu.open);
    });
    menuBackdrop.addEventListener("click", () => { topbarMenu.open = false; });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && topbarMenu.open) topbarMenu.open = false;
    });
    setupPostPilotInputStorage();
    sortQuickActions();
    resetClientFormMode();
    resetBankFormMode();
    document.querySelectorAll("[data-go-tab]").forEach((button) => {
      button.addEventListener("click", () => {
        recordQuickAction(button.dataset.actionKey);
        if (button.dataset.actionKey === "onboard-client") resetClientFormMode();
        navigateToWork({
          tab: button.dataset.goTab,
          subtab: button.dataset.goSubtab || "",
          innerSubtab: button.dataset.goInnerSubtab || ""
        });
      });
    });
    refreshTodayButton.addEventListener("click", () => loadTodayDashboard({ force: true }));
    checkAllHealthButton.addEventListener("click", () => checkOperationsHealth("", checkAllHealthButton));
    todayContent.addEventListener("click", (event) => {
      const healthButton = event.target.closest("[data-health-check]");
      if (healthButton) {
        checkOperationsHealth(healthButton.dataset.healthCheck, healthButton);
        return;
      }
      const actionButton = event.target.closest("[data-operation-action]");
      if (actionButton) runOperationsAction(operationsActionMap.get(actionButton.dataset.operationAction), actionButton);
    });
    clientSearchInput.addEventListener("input", applyClientFilters);
    clientFilterChips.addEventListener("click", (event) => {
      const button = event.target.closest("[data-client-filter]");
      if (!button) return;
      activeClientFilter = button.dataset.clientFilter;
      clientFilterChips.querySelectorAll("button").forEach((item) => item.classList.toggle("active", item === button));
      applyClientFilters();
    });
    document.addEventListener("click", (event) => {
      document.querySelectorAll(".action-menu[open]").forEach((menu) => {
        if (event.target === menu || !menu.contains(event.target)) menu.open = false;
      });
    });
    window.addEventListener("pagehide", () => {
      const tab = document.querySelector(".tab-button.active")?.dataset.tabTarget;
      saveLastWork(tab, activeSubtabFor(tab));
    });
    clientForm.addEventListener("submit", saveClient);
    refreshAgencyOperationsButton.addEventListener("click", () => loadAgencyOperations());
    generateAgencyRecurringButton.addEventListener("click", syncAgencyRecurringTasks);
    agencyWorkspaceClient.addEventListener("change", () => {
      resetAgencyOperationForm(agencyServiceForm, cancelAgencyServiceEdit);
      resetAgencyOperationForm(agencyTaskForm, cancelAgencyTaskEdit);
      resetAgencyOperationForm(agencyTemplateForm, cancelAgencyTemplateEdit);
      resetAgencyOperationForm(agencyOpportunityForm, cancelAgencyOpportunityEdit);
      renderAgencyOperations();
    });
    agencyServiceForm.addEventListener("submit", (event) => {
      event.preventDefault();
      saveAgencyOperation("service", agencyServiceForm);
    });
    agencyTaskForm.addEventListener("submit", (event) => {
      event.preventDefault();
      saveAgencyOperation("task", agencyTaskForm);
    });
    agencyTemplateForm.addEventListener("submit", (event) => {
      event.preventDefault();
      saveAgencyOperation("template", agencyTemplateForm);
    });
    agencyHealthForm.addEventListener("submit", saveAgencyHealth);
    agencyOpportunityForm.addEventListener("submit", (event) => {
      event.preventDefault();
      saveAgencyOperation("opportunity", agencyOpportunityForm);
    });
    cancelAgencyServiceEdit.addEventListener("click", () => resetAgencyOperationForm(agencyServiceForm, cancelAgencyServiceEdit));
    cancelAgencyTaskEdit.addEventListener("click", () => resetAgencyOperationForm(agencyTaskForm, cancelAgencyTaskEdit));
    cancelAgencyTemplateEdit.addEventListener("click", () => resetAgencyOperationForm(agencyTemplateForm, cancelAgencyTemplateEdit));
    cancelAgencyOpportunityEdit.addEventListener("click", () => resetAgencyOperationForm(agencyOpportunityForm, cancelAgencyOpportunityEdit));
    agencyServiceList.addEventListener("click", (event) => {
      const button = event.target.closest(".edit-agency-service");
      if (!button) return;
      const service = currentAgencyServices.find((item) => item.id === button.dataset.serviceId);
      if (!service) return;
      agencyWorkspaceClient.value = service.clientCode;
      renderAgencyOperations();
      for (const name of ["id", "name", "monthlyFee", "internalMonthlyCost", "status", "owner", "renewalDate"]) {
        if (agencyServiceForm.elements[name]) agencyServiceForm.elements[name].value = service[name] || "";
      }
      agencyServiceForm.querySelector('button[type="submit"]').textContent = "Update Service";
      cancelAgencyServiceEdit.hidden = false;
      agencyServiceForm.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    agencyTaskList.addEventListener("click", (event) => {
      const moduleButton = event.target.closest(".open-agency-module");
      if (moduleButton) {
        openAgencyWorkModule(moduleButton.dataset.workType, moduleButton.dataset.clientCode);
        return;
      }
      const toggleButton = event.target.closest(".toggle-agency-task");
      if (toggleButton) {
        updateAgencyTaskStatus(toggleButton.dataset.taskId, toggleButton.dataset.nextStatus, toggleButton);
        return;
      }
      const button = event.target.closest(".edit-agency-task");
      if (!button) return;
      const task = currentAgencyTasks.find((item) => item.id === button.dataset.taskId);
      if (!task) return;
      agencyWorkspaceClient.value = task.clientCode;
      renderAgencyOperations();
      for (const name of ["id", "title", "dueDate", "priority", "owner", "status", "workType", "estimatedMinutes"]) {
        if (agencyTaskForm.elements[name]) agencyTaskForm.elements[name].value = task[name] || "";
      }
      agencyTaskForm.querySelector('button[type="submit"]').textContent = "Update Task";
      cancelAgencyTaskEdit.hidden = false;
      agencyTaskForm.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    agencyTemplateList.addEventListener("click", (event) => {
      const toggleButton = event.target.closest(".toggle-agency-template");
      if (toggleButton) {
        updateAgencyTemplateActive(toggleButton.dataset.templateId, toggleButton.dataset.nextActive === "true", toggleButton);
        return;
      }
      const button = event.target.closest(".edit-agency-template");
      if (!button) return;
      const template = currentAgencyTemplates.find((item) => item.id === button.dataset.templateId);
      if (!template) return;
      agencyWorkspaceClient.value = template.clientCode;
      renderAgencyOperations();
      for (const name of ["id", "title", "workType", "serviceId", "cadence", "nextDueDate", "weekday", "monthDay", "priority", "owner", "estimatedMinutes"]) {
        if (agencyTemplateForm.elements[name]) agencyTemplateForm.elements[name].value = template[name] ?? "";
      }
      agencyTemplateForm.elements.isActive.checked = template.isActive;
      agencyTemplateForm.querySelector('button[type="submit"]').textContent = "Update Recurring Delivery";
      cancelAgencyTemplateEdit.hidden = false;
      agencyTemplateForm.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    agencyDeliveryCalendar.addEventListener("click", (event) => {
      const button = event.target.closest(".open-agency-module");
      if (button) openAgencyWorkModule(button.dataset.workType, button.dataset.clientCode);
    });
    agencyHealthBoard.addEventListener("click", (event) => {
      const button = event.target.closest(".review-agency-health");
      if (!button) return;
      agencyWorkspaceClient.value = button.dataset.clientCode;
      renderAgencyOperations();
      agencyHealthForm.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    agencyOpportunityList.addEventListener("click", (event) => {
      const button = event.target.closest(".edit-agency-opportunity");
      if (!button) return;
      const opportunity = (currentAgencyGrowth.opportunities || []).find((item) => item.id === button.dataset.opportunityId);
      if (!opportunity) return;
      agencyWorkspaceClient.value = opportunity.clientCode;
      renderAgencyOperations();
      for (const name of ["id", "title", "opportunityType", "stage", "estimatedMonthlyValue", "targetDate", "owner", "notes"]) {
        if (agencyOpportunityForm.elements[name]) agencyOpportunityForm.elements[name].value = opportunity[name] ?? "";
      }
      agencyOpportunityForm.querySelector('button[type="submit"]').textContent = "Update Opportunity";
      cancelAgencyOpportunityEdit.hidden = false;
      agencyOpportunityForm.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    copyClientOnboardingTemplateButton.addEventListener("click", copyClientOnboardingTemplate);
    clientOnboardingBackButton.addEventListener("click", () => {
      const index = CLIENT_ONBOARDING_STEPS.indexOf(currentClientOnboardingStep);
      if (index > 0) showClientOnboardingStep(CLIENT_ONBOARDING_STEPS[index - 1]);
    });
    discardClientOnboardingButton.addEventListener("click", discardCurrentClientOnboarding);
    clientForm.querySelectorAll(".onboarding-telegram-link").forEach((button) => {
      button.addEventListener("click", () => {
        const clientCode = clientForm.elements.clientCode.value;
        if (!clientCode) return showClientError(new Error("Simpan client dahulu sebelum connect Telegram."));
        generateTelegramLink(clientCode, Number(button.dataset.recipientSlot || 1), button);
      });
    });
    refreshOnboardingTelegramButton.addEventListener("click", async () => {
      const finishButton = setButtonBusy(refreshOnboardingTelegramButton, "Refreshing...");
      try {
        await loadClients();
        renderClientOnboardingSummary();
        finishButton("Refreshed");
      } catch (error) {
        finishButton();
        showClientError(error);
      }
    });
    cancelClientEditButton.addEventListener("click", () => {
      resetClientFormMode();
      setMessage(clientResult, "", "");
      activateSubtab("client", "client-list-panel");
    });
    backToAgencyClientsButton.addEventListener("click", () => {
      currentAgencyClientCode = "";
      activateSubtab("client", "client-list-panel");
    });
    editAgencyClientButton.addEventListener("click", () => editClient(currentAgencyClientCode));
    archiveAgencyClientButton.addEventListener("click", archiveAgencyClient);
    clientList.addEventListener("click", (event) => {
      const detailButton = event.target.closest(".view-agency-client-button");
      if (detailButton) {
        closeActionMenu(detailButton);
        openAgencyClientDetail(detailButton.dataset.clientCode);
        return;
      }
      const continueOnboardingButton = event.target.closest(".continue-onboarding-button");
      if (continueOnboardingButton) {
        closeActionMenu(continueOnboardingButton);
        continueClientOnboarding(continueOnboardingButton.dataset.clientCode).catch(showClientError);
        return;
      }
      const copyDriveButton = event.target.closest(".copy-drive-link-button");
      if (copyDriveButton) {
        copyClientDriveLink(copyDriveButton.dataset.clientCode, copyDriveButton);
        return;
      }
      const whatsappButton = event.target.closest(".whatsapp-client-button");
      if (whatsappButton) {
        sendClientWhatsapp(whatsappButton.dataset.clientCode, whatsappButton.dataset.whatsappType, whatsappButton);
        return;
      }
      const telegramConnectButton = event.target.closest(".telegram-connect-button");
      if (telegramConnectButton) {
        generateTelegramLink(telegramConnectButton.dataset.clientCode, Number(telegramConnectButton.dataset.recipientSlot || 1), telegramConnectButton);
        return;
      }
      const telegramActionButton = event.target.closest(".telegram-action-button");
      if (telegramActionButton) {
        runTelegramAction(telegramActionButton.dataset.clientCode, Number(telegramActionButton.dataset.recipientSlot || 1), telegramActionButton.dataset.telegramAction, telegramActionButton);
        return;
      }
      const editButton = event.target.closest(".edit-client-button");
      if (editButton) {
        markButtonSuccess(editButton, "Open");
        closeActionMenu(editButton);
        editClient(editButton.dataset.clientCode);
        return;
      }
      const deleteButton = event.target.closest(".delete-client-button");
      if (deleteButton) {
        deleteClientPermanently(deleteButton.dataset.clientCode, deleteButton);
        return;
      }
      const serviceButton = event.target.closest(".service-client-button");
      if (serviceButton) {
        setClientService(serviceButton.dataset.clientCode, serviceButton.dataset.nextStatus, serviceButton);
      }
    });
    settingsForm.addEventListener("submit", saveSettings);
    businessLogoImage.addEventListener("change", () => {
      showLocalAssetPreview(businessLogoPreview, businessLogoImage.files?.[0], "Logo syarikat");
    });
    removeBusinessLogoButton.addEventListener("click", removeBusinessLogo);
    bankForm.addEventListener("submit", saveBankAccount);
    bankQrImage.addEventListener("change", () => {
      showLocalAssetPreview(bankQrPreview, bankQrImage.files?.[0], "QR payment");
    });
    removeBankQrButton.addEventListener("click", removeBankQr);
    cancelBankEditButton.addEventListener("click", () => {
      resetBankFormMode();
      setMessage(bankResult, "", "");
    });
    refreshBankButton.addEventListener("click", loadBankAccounts);
    refreshActivityButton?.addEventListener("click", () => {
      Promise.all([loadActivity(), loadClients(), loadBankAccounts()]).catch(showActivityError);
    });
    reportClient.addEventListener("change", () => {
      localStorage.setItem(LAST_REPORT_CLIENT_KEY, reportClient.value);
      updateReportFileName(true);
      applySelectedClientReportDefaults();
    });
    reportStartDate.addEventListener("change", () => {
      const [year, month, day] = reportStartDate.value.split("-").map(Number);
      if (!year || !month || !day) return;
      const end = new Date(year, month - 1, day);
      end.setDate(end.getDate() + 6);
      reportEndDate.value = localIsoDate(end);
      updateReportFileName(true);
      renderReportBreakdown(null);
    });
    reportEndDate.addEventListener("change", () => {
      updateReportFileName(true);
      renderReportBreakdown(null);
    });
    reportAdAccount.addEventListener("change", () => renderReportBreakdown(null));
    reportResultMetric.addEventListener("change", () => {
      reportResultLabel.value = reportResultLabelFor(reportResultMetric.value);
      updateReportMetricLabels();
      renderReportBreakdown(null);
    });
    reportFileName.addEventListener("input", () => {
      reportFileNameTouched = true;
    });
    loadAdsReportButton.addEventListener("click", () => {
      loadAdsReportDraft().catch(showReportError);
    });
    clientAdsPlatform.addEventListener("change", () => {
      clientAdsAccountName.value = "";
      clientAdsCurrency.value = "";
      populateAdsAccountOptions("", clientAdsPlatform.value);
    });
    clientAdsAccount.addEventListener("change", () => {
      const selected = accountOptions(clientAdsPlatform.value).find((account) => account.id === clientAdsAccount.value);
      clientAdsAccountName.value = selected?.name || clientAdsAccount.value || "";
      clientAdsCurrency.value = selected?.currency || "";
    });
    disconnectTikTokButton.addEventListener("click", async () => {
      if (!window.confirm("Disconnect TikTok Ads daripada BuddyPilot?")) return;
      const response = await fetch("/api/tiktok/disconnect", { method: "POST" });
      const json = await readApiJson(response);
      if (!response.ok || !json.ok) throw new Error(json.error || "Disconnect TikTok gagal.");
      await loadTikTokConnection();
    });
    disconnectMetaButton.addEventListener("click", async () => {
      if (!window.confirm("Disconnect Meta Ads daripada BuddyPilot?")) return;
      const response = await fetch("/api/meta/disconnect", { method: "POST" });
      const json = await readApiJson(response);
      if (!response.ok || !json.ok) throw new Error(json.error || "Disconnect Meta gagal.");
      await loadMetaConnection();
    });
    enablePushNotificationsButton.addEventListener("click", () => {
      setupPushNotifications({ requestPermission: true }).catch((error) => {
        pushNotificationNote.textContent = error?.message || String(error);
      });
    });
    adsCmoAccount.addEventListener("change", () => {
      populateAdsCmoSettings();
      adsCmoReport.dataset.loaded = "false";
      adsCmoLive.dataset.loaded = "false";
      setAdsCmoView(activeAdsCmoView);
    });
    adsCmoLiveViewButton.addEventListener("click", () => setAdsCmoView("live"));
    adsCmoReportViewButton.addEventListener("click", () => setAdsCmoView("report"));
    adsCmoLiveButton.addEventListener("click", loadAdsCmoLiveData);
    adsCmoLoadButton.addEventListener("click", loadAdsCmoReport);
    adsCmoReportDate.addEventListener("change", () => {
      adsCmoReport.dataset.loaded = "false";
      setAdsCmoView("report");
    });
    adsCmoRetryButton.addEventListener("click", retryAdsCmoReport);
    adsCmoSaveSettingsButton.addEventListener("click", saveAdsCmoSettings);
    adsCmoAddProductButton.addEventListener("click", () => {
      if (!adsCmoProductRules.querySelector(".ads-cmo-product-rule")) adsCmoProductRules.innerHTML = "";
      adsCmoProductRules.insertAdjacentHTML("beforeend", adsCmoRuleMarkup({}));
    });
    adsCmoProductRules.addEventListener("click", (event) => {
      const button = event.target.closest(".ads-cmo-remove-rule");
      if (button) button.closest(".ads-cmo-product-rule")?.remove();
    });
    adsCmoPushButton.addEventListener("click", () => {
      setupPushNotifications({ requestPermission: true, button: adsCmoPushButton, note: adsCmoPushNote, purpose: "Ads CMO morning report" }).catch((error) => { adsCmoPushNote.textContent = error?.message || String(error); });
    });
    weeklyReportPushButton.addEventListener("click", () => {
      setupPushNotifications({ requestPermission: true, button: weeklyReportPushButton, note: weeklyReportPushNote, purpose: "Reminder weekly report setiap Isnin 10 pagi (Malaysia)" }).catch((error) => { weeklyReportPushNote.textContent = error?.message || String(error); });
    });
    monthlyInvoicePushButton.addEventListener("click", () => {
      setupPushNotifications({ requestPermission: true, button: monthlyInvoicePushButton, note: monthlyInvoicePushNote, purpose: "Reminder invoice setiap 1 haribulan 10 pagi (Malaysia), WhatsApp manual" }).catch((error) => { monthlyInvoicePushNote.textContent = error?.message || String(error); });
    });
    previewReportButton.addEventListener("click", () => {
      previewReportPdf().catch(showReportError);
    });
    reportForm.addEventListener("submit", uploadReport);
    bankList.addEventListener("click", (event) => {
      const editButton = event.target.closest(".edit-bank-button");
      if (editButton) {
        editBankAccount(editButton.dataset.bankId);
        return;
      }
      const deleteButton = event.target.closest(".delete-bank-button");
      if (deleteButton) deleteBankAccount(deleteButton.dataset.bankId);
    });
    refreshClientsButton.addEventListener("click", loadClients);
    generateInvoicesButton.addEventListener("click", generateInvoices);
    generateReceiptsButton.addEventListener("click", generateReceipts);
    invoicePeriod.addEventListener("change", () => localStorage.setItem("buddypilot-invoice-period", invoicePeriod.value));
    receiptPeriod.addEventListener("change", () => localStorage.setItem("buddypilot-receipt-period", receiptPeriod.value));
    invoiceList.addEventListener("input", (event) => {
      if (!event.target.matches(".service-price-input, .discount-input")) return;
      const row = event.target.closest(".invoice-row[data-client-code]");
      if (row) updateInvoiceRowTotal(row);
    });
    invoiceList.addEventListener("change", (event) => {
      if (!event.target.matches(".invoice-upload-input")) return;
      updateUploadInvoicesButtonState();
    });
    invoiceList.addEventListener("click", (event) => {
      const button = event.target.closest(".review-pdf-button");
      if (!button) return;
      reviewInvoicePdf(button.dataset.clientCode).catch(showInvoiceError);
    });
    uploadInvoicesButton.addEventListener("click", uploadInvoices);
    receiptList.addEventListener("change", (event) => {
      if (!event.target.matches(".receipt-paid-input")) return;
      updateUploadReceiptsButtonState();
    });
    receiptList.addEventListener("click", (event) => {
      const button = event.target.closest(".review-receipt-button");
      if (!button) return;
      reviewReceiptPdf(button.dataset.clientCode).catch(showReceiptError);
    });
    uploadReceiptsButton.addEventListener("click", uploadReceipts);
    setupThreadsViralGenerator();
    loadTodayDashboard();
    loadRemoteAutomationStatus({ silent: true });
    loadClients();
    loadAgencyOperations({ silent: true });
    loadMetaConnection();
    loadTikTokConnection();
    setupPushNotifications().catch(() => {});
    setupPushNotifications({ button: adsCmoPushButton, note: adsCmoPushNote, purpose: "Ads CMO morning report" }).catch(() => {});
    setupPushNotifications({ button: weeklyReportPushButton, note: weeklyReportPushNote, purpose: "Reminder weekly report setiap Isnin 10 pagi (Malaysia)" }).catch(() => {});
    setupPushNotifications({ button: monthlyInvoicePushButton, note: monthlyInvoicePushNote, purpose: "Reminder invoice setiap 1 haribulan 10 pagi (Malaysia), WhatsApp manual" }).catch(() => {});
    loadAdsCmoAccounts();
    loadSettings();
    loadBankAccounts();
    loadActivity();
  </script>`;
};
