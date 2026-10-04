module.exports = function render() {
  const threadsViralTemplatesJson = JSON.stringify(require("../threads-viral-templates")).replace(/</g, "\\u003c");
  const threadsGeneralCopySource = require("../threads-general-copy").buildThreadsGeneralText.toString().replace(/</g, "\\u003c");
  return `  <script>
    const form = document.getElementById("postForm");
    const result = document.getElementById("result");
    const button = form.querySelector("button");
    const previewPanel = document.getElementById("previewPanel");
    const previewMeta = document.getElementById("previewMeta");
    const captionPreview = document.getElementById("captionPreview");
    const commentPreview = document.getElementById("commentPreview");
    const approveButton = document.getElementById("approveButton");
    const regenerateButton = document.getElementById("regenerateButton");
    const creativeInput = document.getElementById("creative");
    const threadsForm = document.getElementById("threadsForm");
    const threadsProductSelect = document.getElementById("threadsProductSelect");
    const showAddProductButton = document.getElementById("showAddProductButton");
    const deleteProductButton = document.getElementById("deleteProductButton");
    const addProductPanel = document.getElementById("addProductPanel");
    const newProductName = document.getElementById("newProductName");
    const newProductLink = document.getElementById("newProductLink");
    const saveNewProductButton = document.getElementById("saveNewProductButton");
    const cancelNewProductButton = document.getElementById("cancelNewProductButton");
    const threadsPreviewButton = document.getElementById("threadsPreviewButton");
    const threadsPreviewPanel = document.getElementById("threadsPreviewPanel");
    const threadsPreviewMeta = document.getElementById("threadsPreviewMeta");
    const threadsPostPreview = document.getElementById("threadsPostPreview");
    const sendThreadsExtensionButton = document.getElementById("sendThreadsExtensionButton");
    const regenerateThreadsButton = document.getElementById("regenerateThreadsButton");
    const threadsHookImage = document.getElementById("threadsHookImage");
    const threadsHookImagePreview = document.getElementById("threadsHookImagePreview");
    const threadsHookImageStatus = document.getElementById("threadsHookImageStatus");
    const threadsHookGallery = document.getElementById("threadsHookGallery");
    const threadsBatchPostButton = document.getElementById("threadsBatchPostButton");
    const postPilotVoiceSlang = document.getElementById("postPilotVoiceSlang");
    const postPilotVoiceEnglish = document.getElementById("postPilotVoiceEnglish");
    const postPilotVoicePreferred = document.getElementById("postPilotVoicePreferred");
    const postPilotVoiceBanned = document.getElementById("postPilotVoiceBanned");
    const savePostPilotVoiceButton = document.getElementById("savePostPilotVoiceButton");
    const threadsResult = document.getElementById("threadsResult");
    const remoteDeviceDot = document.getElementById("remoteDeviceDot");
    const remoteDeviceStatus = document.getElementById("remoteDeviceStatus");
    const remoteJobStatus = document.getElementById("remoteJobStatus");
    const remotePairCode = document.getElementById("remotePairCode");
    const remotePairButton = document.getElementById("remotePairButton");
    const remoteRefreshButton = document.getElementById("remoteRefreshButton");
    const remoteCancelButton = document.getElementById("remoteCancelButton");
    const remoteRetryButton = document.getElementById("remoteRetryButton");
    const viralTemplates = ${threadsViralTemplatesJson};
    const buildThreadsGeneralText = ${threadsGeneralCopySource};
    const viralPattern = document.getElementById("viralPattern");
    const viralCategory = document.getElementById("viralCategory");
    const viralTone = document.getElementById("viralTone");
    const viralAudience = document.getElementById("viralAudience");
    const viralHashtags = document.getElementById("viralHashtags");
    const generateViralOneButton = document.getElementById("generateViralOneButton");
    const generateViralTenButton = document.getElementById("generateViralTenButton");
    const generateViralFiftyButton = document.getElementById("generateViralFiftyButton");
    const autoPostViralTenButton = document.getElementById("autoPostViralTenButton");
    const autoPostViralFiftyButton = document.getElementById("autoPostViralFiftyButton");
    const exportViralCsvButton = document.getElementById("exportViralCsvButton");
    const viralResult = document.getElementById("viralResult");
    const viralOutput = document.getElementById("viralOutput");
    const viralSavedSearch = document.getElementById("viralSavedSearch");
    const viralSavedCategoryFilter = document.getElementById("viralSavedCategoryFilter");
    const viralSavedToneFilter = document.getElementById("viralSavedToneFilter");
    const exportSavedViralButton = document.getElementById("exportSavedViralButton");
    const clearSavedViralButton = document.getElementById("clearSavedViralButton");
    const viralSavedOutput = document.getElementById("viralSavedOutput");
    const viralHistoryOutput = document.getElementById("viralHistoryOutput");
    const refreshViralHistoryButton = document.getElementById("refreshViralHistoryButton");
    const invoicePeriod = document.getElementById("invoicePeriod");
    const generateInvoicesButton = document.getElementById("generateInvoicesButton");
    const uploadInvoicesButton = document.getElementById("uploadInvoicesButton");
    const invoiceList = document.getElementById("invoiceList");
    const invoiceResult = document.getElementById("invoiceResult");
    const receiptPeriod = document.getElementById("receiptPeriod");
    const generateReceiptsButton = document.getElementById("generateReceiptsButton");
    const uploadReceiptsButton = document.getElementById("uploadReceiptsButton");
    const receiptList = document.getElementById("receiptList");
    const receiptResult = document.getElementById("receiptResult");
    const clientForm = document.getElementById("clientForm");
    const saveClientButton = document.getElementById("saveClientButton");
    const cancelClientEditButton = document.getElementById("cancelClientEditButton");
    const clientOnboardingProgress = document.getElementById("clientOnboardingProgress");
    const clientOnboardingBackButton = document.getElementById("clientOnboardingBackButton");
    const copyClientOnboardingTemplateButton = document.getElementById("copyClientOnboardingTemplateButton");
    const discardClientOnboardingButton = document.getElementById("discardClientOnboardingButton");
    const refreshOnboardingTelegramButton = document.getElementById("refreshOnboardingTelegramButton");
    const clientOnboardingDriveState = document.getElementById("clientOnboardingDriveState");
    const clientOnboardingTelegramState = document.getElementById("clientOnboardingTelegramState");
    const clientOnboardingChecklist = document.getElementById("clientOnboardingChecklist");
    const clientList = document.getElementById("clientList");
    const clientResult = document.getElementById("clientResult");
    const refreshClientsButton = document.getElementById("refreshClientsButton");
    const clientDetailLoading = document.getElementById("clientDetailLoading");
    const clientDetailContent = document.getElementById("clientDetailContent");
    const clientDetailStatus = document.getElementById("clientDetailStatus");
    const clientDetailName = document.getElementById("clientDetailName");
    const clientDetailService = document.getElementById("clientDetailService");
    const clientDetailGrid = document.getElementById("clientDetailGrid");
    const clientDetailNotes = document.getElementById("clientDetailNotes");
    const clientDetailError = document.getElementById("clientDetailError");
    const editAgencyClientButton = document.getElementById("editAgencyClientButton");
    const archiveAgencyClientButton = document.getElementById("archiveAgencyClientButton");
    const backToAgencyClientsButton = document.getElementById("backToAgencyClientsButton");
    const refreshAgencyOperationsButton = document.getElementById("refreshAgencyOperationsButton");
    const agencyWorkspaceClient = document.getElementById("agencyWorkspaceClient");
    const agencyActiveClients = document.getElementById("agencyActiveClients");
    const agencyMonthlyRevenue = document.getElementById("agencyMonthlyRevenue");
    const agencyManagedBudget = document.getElementById("agencyManagedBudget");
    const agencyOpenTasks = document.getElementById("agencyOpenTasks");
    const agencyGrossProfit = document.getElementById("agencyGrossProfit");
    const agencyInternalCost = document.getElementById("agencyInternalCost");
    const agencyGrossMargin = document.getElementById("agencyGrossMargin");
    const agencyCompletionRate = document.getElementById("agencyCompletionRate");
    const agencyCompletionSample = document.getElementById("agencyCompletionSample");
    const agencyOverdueTasks = document.getElementById("agencyOverdueTasks");
    const agencyClientProfitability = document.getElementById("agencyClientProfitability");
    const agencyTeamCapacity = document.getElementById("agencyTeamCapacity");
    const agencyHealthyClients = document.getElementById("agencyHealthyClients");
    const agencyWatchClients = document.getElementById("agencyWatchClients");
    const agencyRiskClients = document.getElementById("agencyRiskClients");
    const agencyCheckInsDue = document.getElementById("agencyCheckInsDue");
    const agencyHealthBoard = document.getElementById("agencyHealthBoard");
    const agencyHealthForm = document.getElementById("agencyHealthForm");
    const agencyRenewalValue = document.getElementById("agencyRenewalValue");
    const agencyRenewalCount = document.getElementById("agencyRenewalCount");
    const agencyPipelineValue = document.getElementById("agencyPipelineValue");
    const agencyPipelineCount = document.getElementById("agencyPipelineCount");
    const agencyWeightedForecast = document.getElementById("agencyWeightedForecast");
    const agencyAtRiskRevenue = document.getElementById("agencyAtRiskRevenue");
    const agencyGrowthForecast = document.getElementById("agencyGrowthForecast");
    const agencyOpportunityForm = document.getElementById("agencyOpportunityForm");
    const agencyOpportunityList = document.getElementById("agencyOpportunityList");
    const cancelAgencyOpportunityEdit = document.getElementById("cancelAgencyOpportunityEdit");
    const agencyAttentionList = document.getElementById("agencyAttentionList");
    const agencyDeliveryCalendar = document.getElementById("agencyDeliveryCalendar");
    const generateAgencyRecurringButton = document.getElementById("generateAgencyRecurringButton");
    const agencyServiceForm = document.getElementById("agencyServiceForm");
    const agencyTaskForm = document.getElementById("agencyTaskForm");
    const agencyTemplateForm = document.getElementById("agencyTemplateForm");
    const agencyServiceList = document.getElementById("agencyServiceList");
    const agencyTaskList = document.getElementById("agencyTaskList");
    const agencyTemplateList = document.getElementById("agencyTemplateList");
    const agencyOperationsResult = document.getElementById("agencyOperationsResult");
    const cancelAgencyServiceEdit = document.getElementById("cancelAgencyServiceEdit");
    const cancelAgencyTaskEdit = document.getElementById("cancelAgencyTaskEdit");
    const cancelAgencyTemplateEdit = document.getElementById("cancelAgencyTemplateEdit");
    const dashboardClientCount = document.getElementById("dashboardClientCount");
    const dashboardInvoiceCount = document.getElementById("dashboardInvoiceCount");
    const dashboardRegistryStatus = document.getElementById("dashboardRegistryStatus");
    const dashboardBankStatus = document.getElementById("dashboardBankStatus");
    const activityFeed = document.getElementById("activityFeed");
    const activityResult = document.getElementById("activityResult");
    const refreshActivityButton = document.getElementById("refreshActivityButton");
    const settingsForm = document.getElementById("settingsForm");
    const saveSettingsButton = document.getElementById("saveSettingsButton");
    const settingsResult = document.getElementById("settingsResult");
    const businessLogoImage = document.getElementById("businessLogoImage");
    const businessLogoPreview = document.getElementById("businessLogoPreview");
    const removeBusinessLogoButton = document.getElementById("removeBusinessLogoButton");
    const bankForm = document.getElementById("bankForm");
    const saveBankButton = document.getElementById("saveBankButton");
    const removeBankQrButton = document.getElementById("removeBankQrButton");
    const cancelBankEditButton = document.getElementById("cancelBankEditButton");
    const bankList = document.getElementById("bankList");
    const bankResult = document.getElementById("bankResult");
    const refreshBankButton = document.getElementById("refreshBankButton");
    const bankQrImage = document.getElementById("bankQrImage");
    const bankQrPreview = document.getElementById("bankQrPreview");
    const reportForm = document.getElementById("reportForm");
    const reportClient = document.getElementById("reportClient");
    const reportAdAccount = document.getElementById("reportAdAccount");
    const reportAdAccountLabel = document.getElementById("reportAdAccountLabel");
    const reportPlatform = document.getElementById("reportPlatform");
    const reportResultMetric = document.getElementById("reportResultMetric");
    const reportResultLabel = document.getElementById("reportResultLabel");
    const reportResultsLabel = document.getElementById("reportResultsLabel");
    const reportCostLabel = document.getElementById("reportCostLabel");
    const reportStartDate = document.getElementById("reportStartDate");
    const reportEndDate = document.getElementById("reportEndDate");
    const reportFileName = document.getElementById("reportFileName");
    const reportCurrency = document.getElementById("reportCurrency");
    const loadAdsReportButton = document.getElementById("loadAdsReportButton");
    const reportBreakdown = document.getElementById("reportBreakdown");
    const previewReportButton = document.getElementById("previewReportButton");
    const uploadReportButton = document.getElementById("uploadReportButton");
    const reportResult = document.getElementById("reportResult");
    const clientAdsAccount = document.getElementById("clientAdsAccount");
    const clientAdsPlatform = document.getElementById("clientAdsPlatform");
    const clientAdsAccountLabel = document.getElementById("clientAdsAccountLabel");
    const clientAdsAccountName = document.getElementById("clientAdsAccountName");
    const clientAdsCurrency = document.getElementById("clientAdsCurrency");
    const tiktokConnectionText = document.getElementById("tiktokConnectionText");
    const tiktokAuthorizationWarning = document.getElementById("tiktokAuthorizationWarning");
    const connectTikTokButton = document.getElementById("connectTikTokButton");
    const metaConnectionText = document.getElementById("metaConnectionText");
    const metaAuthorizationWarning = document.getElementById("metaAuthorizationWarning");
    const connectMetaButton = document.getElementById("connectMetaButton");
    const disconnectMetaButton = document.getElementById("disconnectMetaButton");
    const enablePushNotificationsButton = document.getElementById("enablePushNotificationsButton");
    const pushNotificationNote = document.getElementById("pushNotificationNote");
    const adsCmoAccount = document.getElementById("adsCmoAccount");
    const adsCmoLiveViewButton = document.getElementById("adsCmoLiveViewButton");
    const adsCmoReportViewButton = document.getElementById("adsCmoReportViewButton");
    const adsCmoReportDateField = document.getElementById("adsCmoReportDateField");
    const adsCmoReportDate = document.getElementById("adsCmoReportDate");
    const adsCmoLiveButton = document.getElementById("adsCmoLiveButton");
    const adsCmoLoadButton = document.getElementById("adsCmoLoadButton");
    const adsCmoRetryButton = document.getElementById("adsCmoRetryButton");
    const adsCmoStatus = document.getElementById("adsCmoStatus");
    const adsCmoAutoEnabled = document.getElementById("adsCmoAutoEnabled");
    const adsCmoProspectingKeywords = document.getElementById("adsCmoProspectingKeywords");
    const adsCmoRetargetingKeywords = document.getElementById("adsCmoRetargetingKeywords");
    const adsCmoProductRules = document.getElementById("adsCmoProductRules");
    const adsCmoAddProductButton = document.getElementById("adsCmoAddProductButton");
    const adsCmoSaveSettingsButton = document.getElementById("adsCmoSaveSettingsButton");
    const adsCmoPushButton = document.getElementById("adsCmoPushButton");
    const weeklyReportPushButton = document.getElementById("weeklyReportPushButton");
    const weeklyReportPushNote = document.getElementById("weeklyReportPushNote");
    const monthlyInvoicePushButton = document.getElementById("monthlyInvoicePushButton");
    const monthlyInvoicePushNote = document.getElementById("monthlyInvoicePushNote");
    const adsCmoPushNote = document.getElementById("adsCmoPushNote");
    const adsCmoResult = document.getElementById("adsCmoResult");
    const adsCmoReport = document.getElementById("adsCmoReport");
    const adsCmoEmpty = document.getElementById("adsCmoEmpty");
    const adsCmoKpis = document.getElementById("adsCmoKpis");
    const adsCmoProducts = document.getElementById("adsCmoProducts");
    const adsCmoExecutive = document.getElementById("adsCmoExecutive");
    const adsCmoScorecard = document.getElementById("adsCmoScorecard");
    const adsCmoWorking = document.getElementById("adsCmoWorking");
    const adsCmoLeaks = document.getElementById("adsCmoLeaks");
    const adsCmoEvidence = document.getElementById("adsCmoEvidence");
    const adsCmoHypotheses = document.getElementById("adsCmoHypotheses");
    const adsCmoActions = document.getElementById("adsCmoActions");
    const adsCmoWarnings = document.getElementById("adsCmoWarnings");
    const adsCmoLive = document.getElementById("adsCmoLive");
    const adsCmoLiveTimestamp = document.getElementById("adsCmoLiveTimestamp");
    const adsCmoLiveSpend = document.getElementById("adsCmoLiveSpend");
    const adsCmoLivePrimary = document.getElementById("adsCmoLivePrimary");
    const adsCmoLiveSecondary = document.getElementById("adsCmoLiveSecondary");
    const adsCmoLiveProducts = document.getElementById("adsCmoLiveProducts");
    const adsCmoLiveCampaigns = document.getElementById("adsCmoLiveCampaigns");
    const adsCmoLiveCampaignCards = document.getElementById("adsCmoLiveCampaignCards");
    const adsCmoLiveWarnings = document.getElementById("adsCmoLiveWarnings");
    const disconnectTikTokButton = document.getElementById("disconnectTikTokButton");
    const mobileContextTitle = document.getElementById("mobileContextTitle");
    const mobileNavigation = document.querySelector(".topbar-tabs");
    const appToast = document.getElementById("appToast");
    const topbarMenu = document.querySelector(".topbar-menu");
    const menuBackdrop = document.getElementById("menuBackdrop");
    const todayDate = document.getElementById("todayDate");
    const todayImpact = document.getElementById("todayImpact");
    const todaySkeleton = document.getElementById("todaySkeleton");
    const todayContent = document.getElementById("todayContent");
    const todayRunning = document.getElementById("todayRunning");
    const todayAttention = document.getElementById("todayAttention");
    const operationsFailed = document.getElementById("operationsFailed");
    const operationsHealthy = document.getElementById("operationsHealthy");
    const operationsOverall = document.getElementById("operationsOverall");
    const operationsOverallTitle = document.getElementById("operationsOverallTitle");
    const operationsOverallDetail = document.getElementById("operationsOverallDetail");
    const operationsAttentionSection = document.getElementById("operationsAttentionSection");
    const operationsAttentionCount = document.getElementById("operationsAttentionCount");
    const operationsIncidents = document.getElementById("operationsIncidents");
    const operationsActiveSection = document.getElementById("operationsActiveSection");
    const operationsActiveList = document.getElementById("operationsActiveList");
    const operationsHealth = document.getElementById("operationsHealth");
    const operationsRecent = document.getElementById("operationsRecent");
    const refreshTodayButton = document.getElementById("refreshTodayButton");
    const checkAllHealthButton = document.getElementById("checkAllHealthButton");
    const resumeWorkButton = document.getElementById("resumeWorkButton");
    const resumeWorkTitle = document.getElementById("resumeWorkTitle");
    const clientSearchInput = document.getElementById("clientSearchInput");
    const clientFilterChips = document.querySelector(".client-filter-chips");
    const MAX_DIRECT_UPLOAD_BYTES = 4 * 1024 * 1024;
    const TARGET_UPLOAD_BYTES = Math.floor(3.75 * 1024 * 1024);
    const POSTPILOT_INPUT_STORAGE_KEY = "postpilot-last-input-v1";
    const POSTPILOT_IMAGE_STORAGE_KEY = "postpilot-last-hook-image-v1";
    const POSTPILOT_SAVED_IMAGE_MAX_BYTES = 900 * 1024;
    const LAST_WORK_STORAGE_KEY = "buddypilot-last-work-v1";
    const QUICK_ACTION_STORAGE_KEY = "buddypilot-quick-actions-v1";
    const LAST_REPORT_CLIENT_KEY = "buddypilot-last-report-client-v1";
    const TODAY_CACHE_KEY = "buddypilot-operations-cache-v1";
    const OPERATIONS_CACHE_MS = 5 * 60 * 1000;
    const NAV_ITEMS = ["dashboard", "adscmo", "personalpostpilot", "clientpilot"];
    const NAV_TITLES = { dashboard: "Hari Ini", adscmo: "Ads CMO", personalpostpilot: "Post Pilot", clientpilot: "Client Pilot" };
    let currentPreview = null;
    let seenVariations = [];
    let preparedCreativeFile = null;
    let preparedCreativeNotice = "";
    let currentThreadsPreview = null;
    let seenThreadsVariations = [];
    let preparedThreadsImageFile = null;
    let preparedThreadsImageNotice = "";
    let savedThreadsImage = null;
    let postPilotSaveTimer = null;
    let currentThreadsImagePreviewUrl = "";
    let postPilotGalleryImages = [];
    let postPilotProducts = [];
    let activePostPilotProductId = "";
    let currentRemoteJob = null;
    let suppressTabClickUntil = 0;
    let remoteStatusLoading = false;
    let viralGeneratedPosts = [];
    let viralSavedPosts = [];
    const VIRAL_SAVED_STORAGE_KEY = "postpilot-threads-viral-saved-v1";
    const VIRAL_BANNED_WORDS = [...(viralTemplates.bannedWords || [])];
    const VIRAL_PROMO_PHRASES = [...(viralTemplates.promotionalPhrases || [])];
    const VIRAL_ROBOTIC_PHRASES = [
      "yang menarik bukan sekadar produk dia",
      "sangat berpotensi",
      "harus diingat",
      "kesimpulannya",
      "dalam era digital",
      "adalah penting untuk",
      "membuka mata",
    ];
    let currentInvoices = [];
    let currentReceipts = [];
    let currentClients = [];
    let currentAgencyServices = [];
    let currentAgencyTasks = [];
    let currentAgencyTemplates = [];
    let currentAgencyInsights = {};
    let currentAgencyHealth = { records: [], clients: [], summary: {} };
    let currentAgencyGrowth = { summary: {}, renewals: [], opportunities: [] };
    let currentAgencyClientCode = "";
    let currentClientOnboarding = null;
    let currentClientOnboardingStep = "details";
    let currentMetaAccounts = [];
    let currentTikTokAccounts = [];
    let currentAdsCmoAccounts = [];
    let adsCmoAccountsLoading = false;
    let currentBankAccounts = [];
    let currentBankStatus = null;
    let reportFileNameTouched = false;
    let operationsActionMap = new Map();
    let activeClientFilter = "all";
    let toastTimer = null;

    creativeInput.addEventListener("change", () => {
      currentPreview = null;
      seenVariations = [];
      preparedCreativeFile = null;
      preparedCreativeNotice = "";
      previewPanel.className = "preview";
      result.className = "result";
      result.textContent = "";
    });

    if (threadsHookImagePreview) {
      threadsHookImagePreview.addEventListener("error", () => {
        threadsHookImagePreview.hidden = true;
      });
    }

    threadsHookImage.addEventListener("change", () => {
      preparedThreadsImageFile = null;
      preparedThreadsImageNotice = "";
      threadsResult.className = "result";
      threadsResult.textContent = "";
      const files = [...(threadsHookImage.files || [])];
      const file = files[0];
      if (currentThreadsImagePreviewUrl) URL.revokeObjectURL(currentThreadsImagePreviewUrl);
      currentThreadsImagePreviewUrl = file ? URL.createObjectURL(file) : "";
      updatePostPilotHookImageStatus();
      if (files.length) {
        uploadPostPilotGalleryFiles(files).catch(showThreadsError);
      }
    });

    threadsProductSelect.addEventListener("change", () => {
      setPostWorkflowStep(1);
      activatePostPilotProduct(threadsProductSelect.value).catch(showThreadsError);
    });

    showAddProductButton.addEventListener("click", () => {
      addProductPanel.hidden = false;
      newProductName.focus();
    });

    cancelNewProductButton.addEventListener("click", () => {
      addProductPanel.hidden = true;
      newProductName.value = "";
      newProductLink.value = "";
    });

    saveNewProductButton.addEventListener("click", () => {
      createPostPilotProductFromForm().catch(showThreadsError);
    });

    deleteProductButton.addEventListener("click", () => {
      deleteActivePostPilotProduct().catch(showThreadsError);
    });

    savePostPilotVoiceButton.addEventListener("click", () => {
      savePostPilotVoiceProfile().catch(showThreadsError);
    });

    function showError(error) {
      result.className = "result err";
      result.textContent = error.message || String(error);
    }

    function showThreadsError(error) {
      threadsResult.className = "result err";
      threadsResult.textContent = error.message || String(error);
    }

    function remoteJobDescription(job) {
      if (!job) return "Tiada automation aktif.";
      const progress = job.progress || {};
      const total = Number(progress.total || 0);
      const index = Number(progress.index || 0);
      const counter = total ? Math.min(Math.max(index, 0), total) + "/" + total + " · " : "";
      const status = String(job.status || "").replace(/_/g, " ");
      return counter + (progress.message || progress.phase || status) + (job.error ? " · " + job.error : "");
    }

    function renderRemoteAutomation(overview) {
      const device = overview?.device || null;
      const activeJob = overview?.activeJob || null;
      const latestJob = activeJob || overview?.jobs?.[0] || null;
      currentRemoteJob = latestJob;
      remoteDeviceDot.className = "remote-status-dot " + (device?.status || "");
      remoteDeviceStatus.textContent = device
        ? device.name + " · " + (device.status === "busy" ? "Busy" : device.status === "online" ? "Online" : "Offline") + (device.lastSeenAt ? " · last seen " + new Date(device.lastSeenAt).toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" }) : "")
        : "Not Paired · generate code dan masukkan dalam popup extension Mac.";
      remoteJobStatus.textContent = remoteJobDescription(latestJob);
      remotePairButton.textContent = device ? "Pair semula" : "Pair Mac";
      remoteCancelButton.hidden = !activeJob;
      remoteRetryButton.hidden = !latestJob || !["failed", "cancelled", "expired"].includes(latestJob.status);
    }

    async function loadRemoteAutomationStatus({ silent = true } = {}) {
      if (remoteStatusLoading) return;
      remoteStatusLoading = true;
      try {
        const response = await fetch("/api/postpilot-remote/device", { cache: "no-store" });
        const json = await readApiJson(response);
        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }
        if (!response.ok || !json.ok) throw new Error(json.error || "Gagal semak Mac automation.");
        renderRemoteAutomation(json);
      } catch (error) {
        if (!silent) showThreadsError(error);
        remoteDeviceDot.className = "remote-status-dot offline";
        remoteDeviceStatus.textContent = error.message || String(error);
      } finally {
        remoteStatusLoading = false;
      }
    }

    async function createRemoteAutomationJob(body, target = threadsResult) {
      const response = await fetch("/api/postpilot-remote/jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await readApiJson(response);
      if (response.status === 401) {
        window.location.href = "/login";
        return null;
      }
      if (!response.ok || !json.ok) throw new Error(json.error || "Gagal hantar arahan ke Chrome Mac.");
      currentRemoteJob = json.job;
      target.className = "result ok";
      target.textContent = "Arahan diterima. Chrome Mac akan mula auto post apabila online.";
      await loadRemoteAutomationStatus({ silent: true });
      return json.job;
    }

    async function runRemoteJobAction(action) {
      if (!currentRemoteJob?.id) return;
      const response = await fetch("/api/postpilot-remote/jobs/action", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ job_id: currentRemoteJob.id, action }),
      });
      const json = await readApiJson(response);
      if (!response.ok || !json.ok) throw new Error(json.error || "Gagal " + action + " automation.");
      currentRemoteJob = json.job;
      await loadRemoteAutomationStatus({ silent: false });
    }

    remotePairButton.addEventListener("click", async () => {
      remotePairButton.disabled = true;
      try {
        const response = await fetch("/api/postpilot-remote/pair-code", { method: "POST" });
        const json = await readApiJson(response);
        if (!response.ok || !json.ok) throw new Error(json.error || "Gagal jana pairing code.");
        remotePairCode.hidden = false;
        remotePairCode.textContent = json.pairing.code;
        remoteJobStatus.textContent = "Masukkan code ini dalam popup extension Mac. Sah sehingga " + new Date(json.pairing.expiresAt).toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" }) + ".";
      } catch (error) {
        showThreadsError(error);
      } finally {
        remotePairButton.disabled = false;
      }
    });

    remoteCancelButton.addEventListener("click", () => runRemoteJobAction("cancel").catch(showThreadsError));
    remoteRetryButton.addEventListener("click", () => runRemoteJobAction("retry").catch(showThreadsError));
    remoteRefreshButton.addEventListener("click", () => loadRemoteAutomationStatus({ silent: false }));

    window.addEventListener("message", (event) => {
      if (event.source !== window) return;
      const data = event.data;
      if (!data || data.source !== "postpilot-extension" || data.type !== "POSTPILOT_DRAFT_STATUS") return;
      const statusTarget = document.getElementById("threads-viral-panel")?.classList.contains("active") ? viralResult : threadsResult;
      statusTarget.className = data.ok ? "result ok" : "result err";
      statusTarget.textContent = data.ok
        ? (data.message || "Post Pilot extension sudah start. Facebook dibuka dahulu, kemudian Threads.")
        : (data.error || "Post Pilot extension tidak respond. Reload extension dan refresh webapp.");
    });

    function showInvoiceError(error) {
      invoiceResult.className = "result err";
      invoiceResult.textContent = error.message || String(error);
    }

    function showReceiptError(error) {
      receiptResult.className = "result err";
      receiptResult.textContent = error.message || String(error);
    }

    function showReportError(error) {
      reportResult.className = "result err";
      reportResult.textContent = error.message || String(error);
    }

`;
};
