module.exports = function render() {
  return `    function numericValue(value) {
      const number = Number(String(value || "0").replace(/,/g, ""));
      return Number.isFinite(number) && number >= 0 ? number : 0;
    }

    function formatMoneyValue(value) {
      return new Intl.NumberFormat("en-MY", {
        style: "currency",
        currency: "MYR",
        minimumFractionDigits: 2
      }).format(numericValue(value));
    }

    function localIsoDate(date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return \`\${year}-\${month}-\${day}\`;
    }

    function defaultReportWeek() {
      const today = new Date();
      const day = today.getDay() || 7;
      const start = new Date(today);
      start.setDate(today.getDate() - day - 6);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return { start: localIsoDate(start), end: localIsoDate(end) };
    }

    function reportDateParts(value) {
      const [year, month, day] = String(value || "").split("-").map(Number);
      return { year, month, day };
    }

    function reportMonthName(month) {
      return new Intl.DateTimeFormat("en-MY", { month: "long" }).format(new Date(Date.UTC(2026, month - 1, 1))).replace(/\\s+/g, "");
    }

    function reportFileDateRange(startDate, endDate) {
      const start = reportDateParts(startDate);
      const end = reportDateParts(endDate);
      const startDay = String(start.day || 1).padStart(2, "0");
      const endDay = String(end.day || 1).padStart(2, "0");
      if (start.year === end.year && start.month === end.month) {
        return \`\${reportMonthName(start.month)}\${startDay}-\${endDay}_\${end.year}\`;
      }
      return \`\${reportMonthName(start.month)}\${startDay}-\${reportMonthName(end.month)}\${endDay}_\${end.year}\`;
    }

    function safeReportFilePart(value) {
      return String(value || "")
        .replace(/[\\\\/:*?"<>|#%{}~&]/g, " ")
        .replace(/\\s+/g, " ")
        .trim()
        .slice(0, 90);
    }

    function selectedReportClient() {
      return currentClients.find((client) => client.code === reportClient.value);
    }

    function currencyText(value, currency) {
      try {
        return new Intl.NumberFormat("en-MY", { style: "currency", currency: currency || "MYR", maximumFractionDigits: 2 }).format(Number(value || 0));
      } catch {
        return \`\${currency || "MYR"} \${Number(value || 0).toFixed(2)}\`;
      }
    }

    function reportResultLabelFor(metric) {
      if (metric === "messaging_conversations") return "Messaging Conversations";
      if (metric === "leads") return "Leads";
      return "Purchases";
    }

    function updateReportMetricLabels() {
      const metric = reportResultMetric.value;
      reportResultsLabel.textContent = metric === "leads" ? "Leads / Form submissions" : metric === "messaging_conversations" ? "Messaging conversations" : "Purchases";
      reportCostLabel.textContent = metric === "leads" ? "Cost per lead (CPL)" : metric === "messaging_conversations" ? "Cost per conversation" : "Cost per result";
    }

    function renderReportBreakdown(analytics) {
      if (!analytics) {
        reportBreakdown.innerHTML = "";
        return;
      }
      const prospecting = analytics.categories?.prospecting || {};
      const retargeting = analytics.categories?.retargeting || {};
      const other = analytics.categories?.other || {};
      if (analytics.platform === "tiktok" && analytics.resultMetric === "leads") {
        reportBreakdown.innerHTML = \`
          <h3>TOP - Prospecting / Lead Gen</h3>
          <table>
            <thead><tr><th>Spend</th><th>Form submissions / Leads</th><th>CPL</th><th>CPM</th><th>Reach</th><th>Impressions</th><th>Clicks</th><th>CPC</th><th>Frequency</th></tr></thead>
            <tbody><tr>
              <td>\${escapeHtml(currencyText(prospecting.spend, analytics.currency))}</td>
              <td>\${escapeHtml(String(prospecting.leads || 0))}</td>
              <td>\${escapeHtml(prospecting.cpr == null ? "N/A" : currencyText(prospecting.cpr, analytics.currency))}</td>
              <td>\${escapeHtml(prospecting.cpm == null ? "N/A" : currencyText(prospecting.cpm, analytics.currency))}</td>
              <td>\${escapeHtml(String(prospecting.reach || 0))}</td>
              <td>\${escapeHtml(String(prospecting.impressions || 0))}</td>
              <td>\${escapeHtml(String(prospecting.clicks || 0))}</td>
              <td>\${escapeHtml(prospecting.cpc == null ? "N/A" : currencyText(prospecting.cpc, analytics.currency))}</td>
              <td>\${escapeHtml(prospecting.frequency == null ? "N/A" : String(prospecting.frequency))}</td>
            </tr></tbody>
          </table>
          <h3>MID + BOT - Retargeting / Traffic WhatsApp</h3>
          <table>
            <thead><tr><th>Spend</th><th>CPM</th><th>Reach</th><th>Impressions</th><th>Clicks</th><th>CPC</th><th>Frequency</th></tr></thead>
            <tbody><tr>
              <td>\${escapeHtml(currencyText(retargeting.spend, analytics.currency))}</td>
              <td>\${escapeHtml(retargeting.cpm == null ? "N/A" : currencyText(retargeting.cpm, analytics.currency))}</td>
              <td>\${escapeHtml(String(retargeting.reach || 0))}</td>
              <td>\${escapeHtml(String(retargeting.impressions || 0))}</td>
              <td>\${escapeHtml(String(retargeting.clicks || 0))}</td>
              <td>\${escapeHtml(retargeting.cpc == null ? "N/A" : currencyText(retargeting.cpc, analytics.currency))}</td>
              <td>\${escapeHtml(retargeting.frequency == null ? "N/A" : String(retargeting.frequency))}</td>
            </tr></tbody>
          </table>
          <p class="note">Other / Unmapped spend: \${escapeHtml(currencyText(other.spend, analytics.currency))}</p>
        \`;
        return;
      }
      reportBreakdown.innerHTML = \`
        <h3>Prospecting results</h3>
        <table>
          <thead><tr><th>Spend</th><th>Purchases</th><th>Messaging conversations</th><th>Leads</th></tr></thead>
          <tbody><tr>
            <td>\${escapeHtml(currencyText(prospecting.spend, analytics.currency))}</td>
            <td>\${escapeHtml(String(prospecting.purchases || 0))}</td>
            <td>\${escapeHtml(String(prospecting.messaging || 0))}</td>
            <td>\${escapeHtml(String(prospecting.leads || 0))}</td>
          </tr></tbody>
        </table>
        <h3>Retargeting / Warm Builder primary results</h3>
        <table>
          <thead><tr><th>Purchases</th><th>Messaging conversations</th><th>Leads</th></tr></thead>
          <tbody><tr>
            <td>\${escapeHtml(String(retargeting.purchases || 0))}</td>
            <td>\${escapeHtml(String(retargeting.messaging || 0))}</td>
            <td>\${escapeHtml(String(retargeting.leads || 0))}</td>
          </tr></tbody>
        </table>
        <h3>Retargeting / Warm Builder secondary delivery</h3>
        <table>
          <thead><tr><th>Spend</th><th>CPM</th><th>Reach</th><th>Impressions</th><th>Clicks</th><th>CPC</th><th>Frequency</th></tr></thead>
          <tbody><tr>
            <td>\${escapeHtml(currencyText(retargeting.spend, analytics.currency))}</td>
            <td>\${escapeHtml(retargeting.cpm == null ? "N/A" : currencyText(retargeting.cpm, analytics.currency))}</td>
            <td>\${escapeHtml(String(retargeting.reach || 0))}</td>
            <td>\${escapeHtml(String(retargeting.impressions || 0))}</td>
            <td>\${escapeHtml(String(retargeting.clicks || 0))}</td>
            <td>\${escapeHtml(retargeting.cpc == null ? "N/A" : currencyText(retargeting.cpc, analytics.currency))}</td>
            <td>\${escapeHtml(retargeting.frequency == null ? "N/A" : String(retargeting.frequency))}</td>
          </tr></tbody>
        </table>
        <p class="note">Other / Unmapped spend: \${escapeHtml(currencyText(other.spend, analytics.currency))}</p>
      \`;
    }

    function applyReportDraft(draft) {
      const values = {
        adSpend: draft.adSpend,
        leadsGenerated: draft.leadsGenerated,
        costPerLead: draft.costPerLead == null ? "" : draft.costPerLead,
        currency: draft.currency || "MYR",
        resultLabel: draft.resultLabel || "Results",
        recommendationHeadline: draft.recommendationHeadline,
        whatWeProved: draft.whatWeProved,
        winningCreative: draft.winningCreative,
        bestPerformance: draft.bestPerformance,
        retargetingWinningCreative: draft.retargetingWinningCreative,
        retargetingBestPerformance: draft.retargetingBestPerformance,
        leadLeaks: draft.leadLeaks,
        next7Days: draft.next7Days,
        recommendation: draft.recommendation,
      };
      Object.entries(values).forEach(([name, value]) => {
        if (reportForm.elements[name]) reportForm.elements[name].value = value ?? "";
      });
    }

    async function loadAdsReportDraft() {
      const client = selectedReportClient();
      if (!client) throw new Error("Pilih client dahulu.");
      const platform = client.adsReportConfig?.platform === "tiktok" ? "tiktok" : "meta";
      const accounts = platform === "tiktok" ? currentTikTokAccounts : currentMetaAccounts;
      const savedConfig = client.adsReportConfig || {};
      const selectedAccount = accounts.find((account) => account.id === reportAdAccount.value)
        || (reportAdAccount.value && savedConfig.accountId === reportAdAccount.value ? {
          id: savedConfig.accountId,
          name: savedConfig.accountName || savedConfig.accountId,
          currency: savedConfig.currency || "MYR",
        } : null);
      if (!selectedAccount) throw new Error(\`Pilih \${platform === "tiktok" ? "TikTok advertiser" : "Meta Ads account"} dahulu.\`);
      setMessage(reportResult, "", "");
      loadAdsReportButton.disabled = true;
      previewReportButton.disabled = true;
      uploadReportButton.disabled = true;
      loadAdsReportButton.textContent = \`Loading \${platform === "tiktok" ? "TikTok" : "Meta"}...\`;
      try {
        const response = await fetch("/api/reports/draft", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            clientCode: client.code,
            platform,
            accountId: selectedAccount.id,
            accountName: selectedAccount.name,
            currency: selectedAccount.currency,
            resultMetric: reportResultMetric.value,
            startDate: reportStartDate.value,
            endDate: reportEndDate.value,
          })
        });
        const json = await readApiJson(response);
        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }
        if (!response.ok || !json.ok) throw new Error(json.error || "Gagal tarik data ads.");
        reportStartDate.value = json.startDate || "";
        reportEndDate.value = json.endDate || "";
        applyReportDraft(json.draft || {});
        updateReportFileName(true);
        renderReportBreakdown(json.analytics);
        const warnings = json.draft?.warnings || [];
        setMessage(reportResult, warnings.length ? "err" : "ok", [
          \`Data siap: \${json.account?.name || json.account?.id}\`,
          \`Tempoh: \${json.startDate} hingga \${json.endDate}\`,
          ...warnings,
          "Semak dan edit draf sebelum preview atau upload."
        ].join("\\n"));
      } finally {
        loadAdsReportButton.disabled = false;
        previewReportButton.disabled = false;
        uploadReportButton.disabled = false;
        loadAdsReportButton.textContent = \`Load \${platform === "tiktok" ? "TikTok" : "Meta"} Data\`;
      }
    }

    function accountOptions(platform) {
      return platform === "tiktok" ? currentTikTokAccounts : currentMetaAccounts;
    }

    function populateAdsAccountOptions(selectedId = "", platform = clientAdsPlatform.value || "meta") {
      const current = selectedId || clientAdsAccount.value;
      const accounts = accountOptions(platform);
      const options = accounts.map((account) => (
        \`<option value="\${escapeHtml(account.id)}">\${escapeHtml(account.name)} (\${escapeHtml(account.id)})</option>\`
      )).join("");
      clientAdsAccount.innerHTML = '<option value="">Belum dipadankan</option>' + options;
      clientAdsAccountLabel.textContent = platform === "tiktok" ? "Default TikTok advertiser" : "Default Meta Ads account";
      if (current && !accounts.some((account) => account.id === current)) {
        clientAdsAccount.insertAdjacentHTML("beforeend", \`<option value="\${escapeHtml(current)}">\${escapeHtml(current)} (saved)</option>\`);
      }
      clientAdsAccount.value = current;
      const selected = accounts.find((account) => account.id === current);
      if (selected) {
        clientAdsAccountName.value = selected.name;
        clientAdsCurrency.value = selected.currency || "MYR";
      }
    }

    function populateReportAccountOptions(platform, selectedId = "") {
      const accounts = accountOptions(platform);
      reportPlatform.value = platform;
      reportAdAccountLabel.textContent = platform === "tiktok" ? "TikTok advertiser" : "Meta Ads account";
      reportAdAccount.innerHTML = \`<option value="">Pilih \${platform === "tiktok" ? "TikTok advertiser" : "Meta Ads account"}</option>\` + accounts.map((account) => (
        \`<option value="\${escapeHtml(account.id)}">\${escapeHtml(account.name)} (\${escapeHtml(account.id)})</option>\`
      )).join("");
      if (selectedId && !accounts.some((account) => account.id === selectedId)) {
        reportAdAccount.insertAdjacentHTML("beforeend", \`<option value="\${escapeHtml(selectedId)}">\${escapeHtml(selectedId)} (saved)</option>\`);
      }
      reportAdAccount.value = selectedId || accounts[0]?.id || "";
    }

    async function loadMetaAccounts() {
      try {
        const response = await fetch("/api/meta/accounts");
        const json = await readApiJson(response);
        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }
        if (!response.ok || !json.ok) throw new Error(json.error || "Gagal load Meta Ads accounts.");
        currentMetaAccounts = json.accounts || [];
        populateAdsAccountOptions();
        applySelectedClientReportDefaults();
      } catch (error) {
        currentMetaAccounts = [];
        populateAdsAccountOptions();
        setMessage(clientResult, "err", \`Meta MCP: \${error?.message || error}\`);
      }
    }

    async function loadMetaConnection() {
      try {
        const statusResponse = await fetch("/api/meta/status");
        const statusJson = await readApiJson(statusResponse);
        if (!statusResponse.ok || !statusJson.ok) throw new Error(statusJson.error || "Gagal semak Meta Ads.");
        const connection = statusJson.connection || {};
        const label = connection.status === "connected" ? "Connected"
          : connection.status === "expiring" ? "Expiring soon"
          : connection.status === "expired" ? "Expired"
          : connection.status === "error" ? "Error" : "Not connected";
        metaConnectionText.textContent = connection.expiresAt
          ? \`\${label}. Authorization tamat \${new Date(connection.expiresAt).toLocaleDateString("en-MY")}.\`
          : label;
        const remainingMs = connection.expiresAt ? new Date(connection.expiresAt).getTime() - Date.now() : Number.POSITIVE_INFINITY;
        const remainingDays = Math.max(0, Math.ceil(remainingMs / 86400000));
        const showExpiryWarning = Boolean(connection.connected && remainingDays <= 7);
        metaAuthorizationWarning.hidden = !showExpiryWarning;
        metaAuthorizationWarning.textContent = showExpiryWarning
          ? \`Authorization Meta tamat dalam \${remainingDays} hari. Reauthorize supaya report tidak terhenti.\`
          : "";
        connectMetaButton.textContent = connection.connected ? "Reauthorize" : "Connect Meta Ads";
        disconnectMetaButton.hidden = !connection.connected;
        if (connection.connected) await loadMetaAccounts();
        else {
          currentMetaAccounts = [];
          populateAdsAccountOptions();
        }
      } catch (error) {
        currentMetaAccounts = [];
        metaConnectionText.textContent = error?.message || String(error);
        metaAuthorizationWarning.hidden = true;
        populateAdsAccountOptions();
      }
    }

    async function loadTikTokConnection() {
      try {
        const statusResponse = await fetch("/api/tiktok/status");
        const statusJson = await readApiJson(statusResponse);
        if (!statusResponse.ok || !statusJson.ok) throw new Error(statusJson.error || "Gagal semak TikTok.");
        const connection = statusJson.connection || {};
        const label = connection.status === "connected" ? "Connected"
          : connection.status === "expiring" ? "Expiring soon"
          : connection.status === "expired" ? "Expired"
          : connection.status === "error" ? "Error" : "Not connected";
        tiktokConnectionText.textContent = connection.expiresAt
          ? \`\${label}. Authorization tamat \${new Date(connection.expiresAt).toLocaleDateString("en-MY")}.\`
          : label;
        const remainingMs = connection.expiresAt ? new Date(connection.expiresAt).getTime() - Date.now() : Number.POSITIVE_INFINITY;
        const remainingDays = Math.max(0, Math.ceil(remainingMs / 86400000));
        const showExpiryWarning = Boolean(connection.connected && remainingDays <= 7);
        tiktokAuthorizationWarning.hidden = !showExpiryWarning;
        tiktokAuthorizationWarning.textContent = showExpiryWarning
          ? \`Authorization TikTok tamat dalam \${remainingDays} hari. Reauthorize sekarang supaya report tidak terhenti.\`
          : "";
        document.querySelector(".topbar-menu")?.classList.toggle("tiktok-expiring", showExpiryWarning);
        connectTikTokButton.textContent = connection.connected ? "Reauthorize" : "Connect TikTok Ads";
        disconnectTikTokButton.hidden = !connection.connected;
        currentTikTokAccounts = [];
        if (connection.connected) {
          try {
            const response = await fetch("/api/tiktok/accounts");
            const json = await readApiJson(response);
            if (!response.ok || !json.ok) throw new Error(json.error || "Gagal load TikTok advertisers.");
            currentTikTokAccounts = json.accounts || [];
          } catch (accountError) {
            tiktokConnectionText.textContent += \` Advertiser list belum dapat dimuat: \${accountError?.message || accountError}\`;
          }
        }
        if (clientAdsPlatform.value === "tiktok") populateAdsAccountOptions(clientAdsAccount.value, "tiktok");
        applySelectedClientReportDefaults();
      } catch (error) {
        currentTikTokAccounts = [];
        tiktokConnectionText.textContent = error?.message || String(error);
        tiktokAuthorizationWarning.hidden = true;
        document.querySelector(".topbar-menu")?.classList.remove("tiktok-expiring");
      }
    }

    let activeAdsCmoView = "live";

    function setAdsCmoView(view) {
      activeAdsCmoView = view === "report" ? "report" : "live";
      const liveActive = activeAdsCmoView === "live";
      adsCmoLiveViewButton.classList.toggle("active", liveActive);
      adsCmoReportViewButton.classList.toggle("active", !liveActive);
      adsCmoLiveViewButton.setAttribute("aria-selected", String(liveActive));
      adsCmoReportViewButton.setAttribute("aria-selected", String(!liveActive));
      adsCmoReportDateField.hidden = liveActive;
      adsCmoLiveButton.hidden = !liveActive;
      adsCmoLoadButton.hidden = liveActive;
      adsCmoRetryButton.hidden = liveActive;
      adsCmoLive.hidden = !liveActive || adsCmoLive.dataset.loaded !== "true";
      adsCmoReport.hidden = liveActive || adsCmoReport.dataset.loaded !== "true";
      adsCmoEmpty.hidden = liveActive || adsCmoReport.dataset.loaded === "true";
      if (liveActive && adsCmoLive.dataset.loaded !== "true") adsCmoStatus.textContent = "Live data belum dimuatkan";
      if (!liveActive && adsCmoReport.dataset.loaded !== "true") adsCmoStatus.textContent = "Report belum dimuatkan";
    }

    function selectedAdsCmoAccount() {
      return currentAdsCmoAccounts.find((item) => item.accountId === adsCmoAccount.value) || null;
    }

    function adsCmoRuleMarkup(rule = {}) {
      const metric = rule.primaryMetric || "purchase";
      return '<div class="ads-cmo-product-rule">' +
        '<div><label>Product</label><input data-cmo-field="name" value="' + escapeHtml(rule.name || "") + '" placeholder="KM"></div>' +
        '<div><label>Campaign keywords</label><input data-cmo-field="campaignKeywords" value="' + escapeHtml((rule.campaignKeywords || []).join(", ")) + '" placeholder="KM, K-Method"></div>' +
        '<div><label>Primary result</label><select data-cmo-field="primaryMetric"><option value="purchase"' + (metric === "purchase" ? " selected" : "") + '>Purchase</option><option value="lead"' + (metric === "lead" ? " selected" : "") + '>Lead</option><option value="messaging_conversation"' + (metric === "messaging_conversation" ? " selected" : "") + '>Conversation</option></select></div>' +
        '<div><label>Selling price</label><input data-cmo-field="sellingPrice" type="number" min="0" step="0.01" value="' + Number(rule.sellingPrice || 0) + '"></div>' +
        '<div><label>Gross margin %</label><input data-cmo-field="grossMarginPercent" type="number" min="0" max="100" step="0.1" value="' + Number(rule.grossMarginPercent || 0) + '"></div>' +
        '<div><label>Allowable CPA</label><input data-cmo-field="allowableCpa" type="number" min="0" step="0.01" value="' + Number(rule.allowableCpa || 0) + '"></div>' +
        '<button class="danger ads-cmo-remove-rule" type="button">Remove</button></div>';
    }

    function renderAdsCmoProductRules(rules = []) {
      adsCmoProductRules.innerHTML = rules.length ? rules.map(adsCmoRuleMarkup).join("") : '<p class="note">Belum ada product rule. Profit tidak akan dilabel sehingga rule ditambah.</p>';
    }

    function collectAdsCmoProductRules() {
      return [...adsCmoProductRules.querySelectorAll(".ads-cmo-product-rule")].map((row, index) => {
        const value = (name) => row.querySelector('[data-cmo-field="' + name + '"]').value;
        return {
          id: "product-" + (index + 1), name: value("name").trim(),
          campaignKeywords: value("campaignKeywords").split(/[,\\n]/).map((item) => item.trim()).filter(Boolean),
          primaryMetric: value("primaryMetric"), sellingPrice: Number(value("sellingPrice") || 0),
          grossMarginPercent: Number(value("grossMarginPercent") || 0), allowableCpa: Number(value("allowableCpa") || 0),
        };
      }).filter((rule) => rule.name && rule.campaignKeywords.length);
    }

    function populateAdsCmoSettings() {
      const account = selectedAdsCmoAccount();
      if (!account) return;
      adsCmoAutoEnabled.checked = Boolean(account.autoReportEnabled);
      adsCmoProspectingKeywords.value = (account.prospectingKeywords || []).join(", ");
      adsCmoRetargetingKeywords.value = (account.retargetingKeywords || []).join(", ");
      renderAdsCmoProductRules(account.productRules || []);
    }

    function formatAdsCmoValue(value, format, currency) {
      if (value == null) return "N/A";
      if (format === "money") return new Intl.NumberFormat("en-MY", { style: "currency", currency: currency || "MYR", maximumFractionDigits: 2 }).format(Number(value || 0));
      if (format === "percent") return Number(value || 0).toFixed(2) + "%";
      if (format === "decimal") return Number(value || 0).toFixed(2);
      return new Intl.NumberFormat("en-MY", { maximumFractionDigits: 2 }).format(Number(value || 0));
    }

    function renderAdsCmoList(node, values, emptyText) {
      node.innerHTML = values?.length ? values.map((value) => "<li>" + escapeHtml(value) + "</li>").join("") : "<li>" + escapeHtml(emptyText || "Tiada data.") + "</li>";
    }

    function renderAdsCmoPerformance(items, currency) {
      if (!items?.length) return '<p class="note">Tiada data yang mencukupi.</p>';
      return items.map((item) => '<div style="padding:10px 0;border-bottom:1px solid var(--line)"><strong>' + escapeHtml(item.name || item.campaignName || "N/A") + '</strong><small style="display:block;color:var(--muted);margin-top:4px">' + escapeHtml(item.product || "") + ' · Spend ' + escapeHtml(formatAdsCmoValue(item.spend, "money", currency)) + ' · Result ' + Number(item.primaryResults || 0) + ' · CPA ' + escapeHtml(formatAdsCmoValue(item.primaryCpa, "money", currency)) + (item.profit == null ? "" : ' · Profit ' + escapeHtml(formatAdsCmoValue(item.profit, "money", currency))) + '</small></div>').join("");
    }

    function adsCmoLiveMetric(label, value, detail) {
      return '<div class="ads-cmo-live-metric"><small>' + escapeHtml(label) + '</small><strong>' + escapeHtml(value) + '</strong>' + (detail ? '<span>' + escapeHtml(detail) + '</span>' : '') + '</div>';
    }

    function adsCmoRoas(value) {
      return value == null ? "N/A" : formatAdsCmoValue(value, "decimal", "MYR") + "x";
    }

    function adsCmoProductBreakdown(period = {}) {
      if (period.productBreakdown?.length) return period.productBreakdown;
      const groups = new Map();
      for (const campaign of period.campaigns || []) {
        const product = campaign.product || "Other / Unmapped";
        const current = groups.get(product) || { product, campaignCount: 0, spend: 0, revenue: 0, purchases: 0, leads: 0, conversations: 0, clicks: 0, profit: 0, profitCampaigns: 0 };
        current.campaignCount += 1;
        current.spend += Number(campaign.spend || 0);
        current.revenue += Number(campaign.revenue || 0);
        current.purchases += Number(campaign.purchases || 0);
        current.leads += Number(campaign.leads || 0);
        current.conversations += Number(campaign.messaging || campaign.conversations || 0);
        current.clicks += Number(campaign.clicks || 0);
        if (campaign.profit != null) current.profit += Number(campaign.profit);
        else current.profit += Number(campaign.revenue || 0) - Number(campaign.spend || 0);
        current.profitCampaigns += 1;
        groups.set(product, current);
      }
      return [...groups.values()].map((item) => ({ ...item, profit: item.profit, cpp: item.purchases > 0 ? item.spend / item.purchases : null, roas: item.spend > 0 ? item.revenue / item.spend : null, cpc: item.clicks > 0 ? item.spend / item.clicks : null })).sort((a, b) => b.spend - a.spend);
    }

    function renderAdsCmoProducts(node, products, currency) {
      if (!products?.length) {
        node.innerHTML = '<div class="ads-cmo-empty">Belum ada product data. Semak product rule dan campaign keyword.</div>';
        return;
      }
      node.innerHTML = products.map((item) => '<article class="ads-cmo-product-card"><header><strong>' + escapeHtml(item.product || "Other / Unmapped") + '</strong><small>' + Number(item.campaignCount || 0) + ' campaign' + (item.profitComplete === false ? ' · estimated' : '') + '</small></header><div class="ads-cmo-product-metrics">' + [
        ["Spend", formatAdsCmoValue(item.spend, "money", currency)],
        ["Revenue", formatAdsCmoValue(item.revenue, "money", currency)],
        ["Est. Profit", formatAdsCmoValue(item.profit, "money", currency)],
        ["Purchases", formatAdsCmoValue(item.purchases, "number", currency)],
        ["CPP", formatAdsCmoValue(item.cpp, "money", currency)],
        ["ROAS", adsCmoRoas(item.roas)],
        ["Leads", formatAdsCmoValue(item.leads, "number", currency)],
        ["Conversations", formatAdsCmoValue(item.conversations, "number", currency)],
        ["Clicks", formatAdsCmoValue(item.clicks, "number", currency)],
        ["CPC", formatAdsCmoValue(item.cpc, "money", currency)],
      ].map((metric) => '<div class="ads-cmo-product-metric"><small>' + escapeHtml(metric[0]) + '</small><strong>' + escapeHtml(metric[1]) + '</strong></div>').join("") + '</div></article>').join("");
    }

    function renderAdsCmoLiveData(snapshot) {
      const currency = snapshot.currency || selectedAdsCmoAccount()?.currency || "MYR";
      const primary = snapshot.primary || {};
      const secondary = snapshot.secondary || {};
      const captured = new Intl.DateTimeFormat("ms-MY", { timeZone: "Asia/Kuala_Lumpur", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit" }).format(new Date(snapshot.capturedAt));
      adsCmoLiveTimestamp.textContent = "Data hari ini ditarik daripada Meta pada " + captured + ". Tekan Live Data untuk refresh semula.";
      adsCmoLiveSpend.innerHTML = '<small>Total ads spent hari ini</small><strong>' + escapeHtml(formatAdsCmoValue(snapshot.spend, "money", currency)) + '</strong>';
      adsCmoLivePrimary.innerHTML = [
        adsCmoLiveMetric("Purchases", formatAdsCmoValue(primary.purchases, "number", currency), "CPP " + formatAdsCmoValue(primary.costPerPurchase, "money", currency)),
        adsCmoLiveMetric("Leads", formatAdsCmoValue(primary.leads, "number", currency), "CPL " + formatAdsCmoValue(primary.costPerLead, "money", currency)),
        adsCmoLiveMetric("Conversations", formatAdsCmoValue(primary.conversations, "number", currency), "Cost " + formatAdsCmoValue(primary.costPerConversation, "money", currency)),
      ].join("");
      adsCmoLiveSecondary.innerHTML = [
        adsCmoLiveMetric("Est. profit", formatAdsCmoValue(snapshot.profit, "money", currency)),
        adsCmoLiveMetric("Revenue", formatAdsCmoValue(secondary.revenue, "money", currency)),
        adsCmoLiveMetric("ROAS", adsCmoRoas(secondary.roas)),
        adsCmoLiveMetric("Impressions", formatAdsCmoValue(secondary.impressions, "number", currency)),
        adsCmoLiveMetric("Reach", formatAdsCmoValue(secondary.reach, "number", currency)),
        adsCmoLiveMetric("Frequency", formatAdsCmoValue(secondary.frequency, "decimal", currency)),
        adsCmoLiveMetric("Clicks", formatAdsCmoValue(secondary.clicks, "number", currency)),
        adsCmoLiveMetric("Link clicks", formatAdsCmoValue(secondary.linkClicks, "number", currency)),
        adsCmoLiveMetric("CTR", formatAdsCmoValue(secondary.ctr, "percent", currency)),
        adsCmoLiveMetric("CPC", formatAdsCmoValue(secondary.cpc, "money", currency)),
        adsCmoLiveMetric("CPM", formatAdsCmoValue(secondary.cpm, "money", currency)),
      ].join("");
      renderAdsCmoProducts(adsCmoLiveProducts, snapshot.productBreakdown || [], currency);
      const campaigns = snapshot.campaigns || [];
      adsCmoLiveCampaigns.innerHTML = campaigns.length ? campaigns.map((campaign) => '<tr><td><strong>' + escapeHtml(campaign.name || "N/A") + '</strong><small>' + escapeHtml(campaign.category || "other") + '</small></td><td>' + escapeHtml(formatAdsCmoValue(campaign.spend, "money", currency)) + '</td><td>' + escapeHtml(formatAdsCmoValue(campaign.cpp, "money", currency)) + '</td><td>' + escapeHtml(adsCmoRoas(campaign.roas)) + '</td><td>' + escapeHtml(formatAdsCmoValue(campaign.profit, "money", currency)) + '</td><td>' + escapeHtml(formatAdsCmoValue(campaign.purchases, "number", currency)) + '</td><td>' + escapeHtml(formatAdsCmoValue(campaign.leads, "number", currency)) + '</td><td>' + escapeHtml(formatAdsCmoValue(campaign.conversations, "number", currency)) + '</td><td>' + escapeHtml(formatAdsCmoValue(campaign.impressions, "number", currency)) + '</td><td>' + escapeHtml(formatAdsCmoValue(campaign.reach, "number", currency)) + '</td><td>' + escapeHtml(formatAdsCmoValue(campaign.clicks, "number", currency)) + '</td><td>' + escapeHtml(formatAdsCmoValue(campaign.linkClicks, "number", currency)) + '</td><td>' + escapeHtml(formatAdsCmoValue(campaign.ctr, "percent", currency)) + '</td><td>' + escapeHtml(formatAdsCmoValue(campaign.cpc, "money", currency)) + '</td><td>' + escapeHtml(formatAdsCmoValue(campaign.cpm, "money", currency)) + '</td><td>' + escapeHtml(formatAdsCmoValue(campaign.frequency, "decimal", currency)) + '</td></tr>').join("") : '<tr><td colspan="16">Belum ada campaign data untuk hari ini.</td></tr>';
      adsCmoLiveCampaignCards.innerHTML = campaigns.length ? campaigns.map((campaign) => {
        const metrics = [
          ["CPP", formatAdsCmoValue(campaign.cpp, "money", currency)],
          ["ROAS", adsCmoRoas(campaign.roas)],
          ["Est. Profit", formatAdsCmoValue(campaign.profit, "money", currency)],
          ["Purchases", formatAdsCmoValue(campaign.purchases, "number", currency)],
          ["Leads", formatAdsCmoValue(campaign.leads, "number", currency)],
          ["Conversations", formatAdsCmoValue(campaign.conversations, "number", currency)],
          ["Impressions", formatAdsCmoValue(campaign.impressions, "number", currency)],
          ["Reach", formatAdsCmoValue(campaign.reach, "number", currency)],
          ["Clicks", formatAdsCmoValue(campaign.clicks, "number", currency)],
          ["Link clicks", formatAdsCmoValue(campaign.linkClicks, "number", currency)],
          ["CTR", formatAdsCmoValue(campaign.ctr, "percent", currency)],
          ["CPC", formatAdsCmoValue(campaign.cpc, "money", currency)],
          ["CPM", formatAdsCmoValue(campaign.cpm, "money", currency)],
          ["Frequency", formatAdsCmoValue(campaign.frequency, "decimal", currency)],
        ];
        return '<details class="ads-cmo-campaign-card"><summary><span class="ads-cmo-campaign-title"><strong>' + escapeHtml(campaign.name || "N/A") + '</strong><small>' + escapeHtml(campaign.category || "other") + '</small></span><span class="ads-cmo-campaign-spend">' + escapeHtml(formatAdsCmoValue(campaign.spend, "money", currency)) + '</span></summary><div class="ads-cmo-campaign-detail">' + metrics.map((metric) => '<div><small>' + escapeHtml(metric[0]) + '</small><strong>' + escapeHtml(metric[1]) + '</strong></div>').join("") + '</div></details>';
      }).join("") : '<div class="ads-cmo-empty">Belum ada campaign data untuk hari ini.</div>';
      adsCmoLiveWarnings.innerHTML = (snapshot.warnings || []).map((warning) => '<li>' + escapeHtml(warning) + '</li>').join("");
      adsCmoLiveWarnings.hidden = !(snapshot.warnings || []).length;
      adsCmoLive.dataset.loaded = "true";
      adsCmoStatus.textContent = "Live · " + snapshot.reportDate;
      setAdsCmoView("live");
    }

    async function loadAdsCmoLiveData() {
      const accountId = adsCmoAccount.value;
      if (!accountId) return setMessage(adsCmoResult, "err", "Pilih Ads account dahulu.");
      setAdsCmoView("live");
      const finishButton = setButtonBusy(adsCmoLiveButton, "Fetching...");
      setMessage(adsCmoResult, "", "");
      try {
        const response = await fetch("/api/personal-ads/live?accountId=" + encodeURIComponent(accountId), { cache: "no-store" });
        const json = await readApiJson(response);
        if (!response.ok || !json.ok) throw new Error(json.error || "Live data Ads CMO gagal dimuatkan.");
        renderAdsCmoLiveData(json.snapshot);
        finishButton("Updated");
      } catch (error) {
        finishButton();
        setMessage(adsCmoResult, "err", error.message || String(error));
      }
    }

    function renderAdsCmoReportData(report) {
      const yesterday = report.yesterday;
      const diagnosis = report.diagnosis || {};
      const currency = yesterday.currency || selectedAdsCmoAccount()?.currency || "MYR";
      const hasTrackingAnomaly = (yesterday.campaigns || []).some((campaign) => campaign.profitStatus === "tracking_issue" || campaign.trackingAnomaly);
      const profit = yesterday.profitability?.contributionProfit ?? (!hasTrackingAnomaly && Number(yesterday.total.revenue || 0) > 0 ? Number(yesterday.total.revenue) - Number(yesterday.total.spend || 0) : null);
      const cpp = Number(yesterday.total.purchases || 0) > 0 ? Number(yesterday.total.spend || 0) / Number(yesterday.total.purchases) : null;
      const kpis = [
        ["Spend", formatAdsCmoValue(yesterday.total.spend, "money", currency)],
        ["Revenue", formatAdsCmoValue(yesterday.total.revenue, "money", currency)],
        ["Est. Profit", formatAdsCmoValue(profit, "money", currency)],
        ["Purchases", formatAdsCmoValue(yesterday.total.purchases, "number", currency)],
        ["CPP", formatAdsCmoValue(cpp, "money", currency)],
        ["ROAS", adsCmoRoas(yesterday.total.roas)],
        ["Leads", formatAdsCmoValue(yesterday.total.leads, "number", currency)],
        ["Conversations", formatAdsCmoValue(yesterday.total.messaging, "number", currency)],
      ];
      adsCmoKpis.innerHTML = kpis.map((item) => '<div class="ads-cmo-kpi"><small>' + escapeHtml(item[0]) + '</small><strong>' + escapeHtml(item[1]) + '</strong></div>').join("");
      renderAdsCmoProducts(adsCmoProducts, adsCmoProductBreakdown(yesterday), currency);
      renderAdsCmoList(adsCmoExecutive, diagnosis.executiveSummary, "Belum ada executive summary.");
      adsCmoScorecard.innerHTML = (diagnosis.scorecard || []).map((item) => '<tr><td>' + escapeHtml(item.metric) + '</td><td>' + escapeHtml(formatAdsCmoValue(item.current, item.format, currency)) + '</td><td>' + escapeHtml(formatAdsCmoValue(item.previous, item.format, currency)) + '</td><td>' + (item.differencePercent == null ? "N/A" : (item.differencePercent > 0 ? "+" : "") + item.differencePercent + "%") + '</td></tr>').join("");
      adsCmoWorking.innerHTML = '<h3>Campaigns</h3>' + renderAdsCmoPerformance(diagnosis.working?.campaigns, currency) + '<h3 style="margin-top:16px">Ads</h3>' + renderAdsCmoPerformance(diagnosis.working?.ads, currency);
      adsCmoLeaks.innerHTML = '<h3>Campaigns</h3>' + renderAdsCmoPerformance(diagnosis.leaks?.campaigns, currency) + '<h3 style="margin-top:16px">Ads</h3>' + renderAdsCmoPerformance(diagnosis.leaks?.ads, currency);
      renderAdsCmoList(adsCmoEvidence, diagnosis.confirmedEvidence);
      renderAdsCmoList(adsCmoHypotheses, diagnosis.hypotheses);
      const actions = diagnosis.actions || {};
      adsCmoActions.innerHTML = [["Do now", actions.doNow], ["Monitor", actions.monitor], ["Test next", actions.testNext], ["Do not touch", actions.doNotTouch]].map((group) => '<div><h3>' + group[0] + '</h3><ul>' + (group[1] || []).map((item) => '<li>' + escapeHtml(item) + '</li>').join("") + '</ul></div>').join("");
      renderAdsCmoList(adsCmoWarnings, diagnosis.warnings, "Tiada tracking warning dikesan.");
      adsCmoStatus.textContent = "Ready · " + report.report_date;
      adsCmoReport.dataset.loaded = "true";
      setAdsCmoView("report");
    }

    async function loadAdsCmoReport() {
      const accountId = adsCmoAccount.value;
      const reportDate = adsCmoReportDate.value;
      if (!accountId || !reportDate) return;
      setAdsCmoView("report");
      const finishButton = setButtonBusy(adsCmoLoadButton, "Loading...");
      try {
        const response = await fetch("/api/personal-ads/reports?accountId=" + encodeURIComponent(accountId) + "&reportDate=" + encodeURIComponent(reportDate));
        const json = await readApiJson(response);
        if (!response.ok || !json.ok) throw new Error(json.error || "Report Ads CMO gagal dimuatkan.");
        if (json.report?.status === "ready") renderAdsCmoReportData(json.report);
        else {
          adsCmoReport.dataset.loaded = "false";
          adsCmoStatus.textContent = json.report?.status === "failed" ? "Failed" : "Belum tersedia";
          adsCmoEmpty.textContent = json.report?.error_message || "Snapshot belum tersedia untuk tarikh ini. Tekan Retry Report untuk jana sekarang.";
          setAdsCmoView("report");
        }
        finishButton("Loaded");
      } catch (error) { finishButton(); setMessage(adsCmoResult, "err", error.message || String(error)); }
    }

    async function loadAdsCmoAccounts() {
      if (adsCmoAccountsLoading) return;
      adsCmoAccountsLoading = true;
      try {
        const response = await fetch("/api/personal-ads/accounts");
        const json = await readApiJson(response);
        if (!response.ok || !json.ok) throw new Error(json.error || "Ads CMO accounts gagal dimuatkan.");
        currentAdsCmoAccounts = json.accounts || [];
        const requestedAccount = new URLSearchParams(location.search).get("accountId");
        const defaultAccount = currentAdsCmoAccounts.find((item) => [item.accountId, item.accountName].some((value) => String(value || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "") === "DD1"));
        adsCmoAccount.innerHTML = currentAdsCmoAccounts.map((item) => '<option value="' + escapeHtml(item.accountId) + '">' + escapeHtml(item.accountName) + (item.autoReportEnabled ? " · Auto" : "") + '</option>').join("");
        if (requestedAccount && currentAdsCmoAccounts.some((item) => item.accountId === requestedAccount)) adsCmoAccount.value = requestedAccount;
        else if (defaultAccount) adsCmoAccount.value = defaultAccount.accountId;
        adsCmoReportDate.value = new URLSearchParams(location.search).get("reportDate") || json.defaultReportDate;
        populateAdsCmoSettings();
        if (new URLSearchParams(location.search).get("tab") === "adscmo") {
          setAdsCmoView("report");
          await loadAdsCmoReport();
        } else setAdsCmoView("live");
      } catch (error) { setMessage(adsCmoResult, "err", error.message || String(error)); }
      finally { adsCmoAccountsLoading = false; }
    }

    async function saveAdsCmoSettings() {
      const account = selectedAdsCmoAccount();
      if (!account) return;
      const finishButton = setButtonBusy(adsCmoSaveSettingsButton, "Saving...");
      try {
        const payload = { ...account, autoReportEnabled: adsCmoAutoEnabled.checked, prospectingKeywords: adsCmoProspectingKeywords.value.split(/[,\\n]/).map((item) => item.trim()).filter(Boolean), retargetingKeywords: adsCmoRetargetingKeywords.value.split(/[,\\n]/).map((item) => item.trim()).filter(Boolean), productRules: collectAdsCmoProductRules() };
        const response = await fetch("/api/personal-ads/settings", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
        const json = await readApiJson(response);
        if (!response.ok || !json.ok) throw new Error(json.error || "Settings Ads CMO gagal disimpan.");
        const index = currentAdsCmoAccounts.findIndex((item) => item.accountId === account.accountId);
        currentAdsCmoAccounts[index] = json.setting;
        setMessage(adsCmoResult, "ok", "Settings Ads CMO berjaya disimpan.");
        finishButton("Saved");
        if (adsCmoReportDate.value) await loadAdsCmoReport();
      } catch (error) { finishButton(); setMessage(adsCmoResult, "err", error.message || String(error)); }
    }

    async function retryAdsCmoReport() {
      const finishButton = setButtonBusy(adsCmoRetryButton, "Generating...");
      try {
        const response = await fetch("/api/personal-ads/generate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ accountId: adsCmoAccount.value, reportDate: adsCmoReportDate.value }) });
        const json = await readApiJson(response);
        if (!response.ok || !json.ok) throw new Error(json.error || "Report Ads CMO gagal dijana.");
        renderAdsCmoReportData(json.report);
        finishButton("Ready");
      } catch (error) { finishButton(); setMessage(adsCmoResult, "err", error.message || String(error)); }
    }

    function urlBase64ToUint8Array(value) {
      const padding = "=".repeat((4 - value.length % 4) % 4);
      const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
      return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
    }

    function isIosDevice() {
      return /iphone|ipad|ipod/i.test(navigator.userAgent);
    }

    function isStandaloneApp() {
      return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
    }

    async function setupPushNotifications({ requestPermission = false, button = enablePushNotificationsButton, note = pushNotificationNote, purpose = "Amaran TikTok Ads" } = {}) {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        button.hidden = true;
        note.textContent = "Peranti atau browser ini tidak menyokong Web Push.";
        return;
      }
      if (isIosDevice() && !isStandaloneApp()) {
        note.textContent = "iPhone/iPad: tekan Share > Add to Home Screen, buka BuddyPilot dari Home Screen, kemudian aktifkan notifikasi.";
        button.textContent = "Perlu Home Screen";
        button.disabled = true;
        return;
      }
      const registration = await navigator.serviceWorker.register("/sw.js");
      let subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        button.textContent = "Notifikasi Aktif";
        button.disabled = true;
        note.textContent = purpose + " akan dihantar ke peranti ini.";
        return;
      }
      if (!requestPermission) {
        if (Notification.permission === "denied") {
          button.textContent = "Notifikasi Disekat";
          note.textContent = "Benarkan notification dalam tetapan browser/peranti dahulu.";
        }
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Kebenaran notification tidak diberikan.");
      const configResponse = await fetch("/api/push/config");
      const config = await readApiJson(configResponse);
      if (!configResponse.ok || !config.ok) throw new Error(config.error || "Gagal mendapatkan konfigurasi Web Push.");
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(config.publicKey),
      });
      const response = await fetch("/api/push/subscription", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });
      const json = await readApiJson(response);
      if (!response.ok || !json.ok) throw new Error(json.error || "Gagal menyimpan push subscription.");
      button.textContent = "Notifikasi Aktif";
      button.disabled = true;
      note.textContent = purpose + " akan dihantar ke peranti ini.";
      await registration.showNotification("Notifikasi BuddyPilot aktif", {
        body: "Peranti ini akan menerima " + purpose.toLowerCase() + ".",
        icon: "/icons/app-icon-192x192.png",
        badge: "/icons/app-icon-96x96.png",
        tag: "buddypilot-push-enabled",
      });
    }

    function updateReportFileName(force = false) {
      if (!force && reportFileNameTouched) return;
      const client = selectedReportClient();
      if (!client || !reportStartDate.value || !reportEndDate.value) return;
      const brand = client.name || client.brandClient || client.code;
      reportFileName.value = \`\${safeReportFilePart(brand)} Weekly Report \${reportFileDateRange(reportStartDate.value, reportEndDate.value)}.pdf\`;
    }

    function populateReportClientOptions() {
      if (!reportClient) return;
      const previous = reportClient.value || localStorage.getItem(LAST_REPORT_CLIENT_KEY) || "";
      const activeClients = currentClients.filter((client) => client.serviceStatus !== "paused" && client.onboardingStatus !== "in_progress");
      reportClient.innerHTML = activeClients.length
        ? activeClients.map((client) => \`<option value="\${escapeHtml(client.code)}">\${escapeHtml(client.brandClient || client.name || client.code)}</option>\`).join("")
        : '<option value="">Belum ada client aktif</option>';
      if (activeClients.some((client) => client.code === previous)) reportClient.value = previous;
      updateReportFileName();
    }

    function applySelectedClientReportDefaults() {
      const config = selectedReportClient()?.adsReportConfig;
      const platform = config?.platform === "tiktok" ? "tiktok" : "meta";
      reportResultMetric.value = config?.resultMetric || "conversions";
      reportResultLabel.value = reportResultLabelFor(reportResultMetric.value);
      updateReportMetricLabels();
      const mappedId = config?.accountId || "";
      populateReportAccountOptions(platform, mappedId);
      document.getElementById("reportTitle").value = platform === "tiktok" ? "TIKTOK ADS PERFORMANCE BRIEF" : "META ADS PERFORMANCE BRIEF";
      loadAdsReportButton.textContent = \`Load \${platform === "tiktok" ? "TikTok" : "Meta"} Data\`;
      renderReportBreakdown(null);
    }

    function collectReportPayload() {
      const payload = Object.fromEntries(new FormData(reportForm).entries());
      payload.fileName = String(payload.fileName || "").trim();
      if (!payload.clientCode) throw new Error("Pilih client dahulu.");
      if (!payload.fileName.toLowerCase().endsWith(".pdf")) payload.fileName += ".pdf";
      return payload;
    }

    async function previewReportPdf() {
      setMessage(reportResult, "", "");
      const payload = collectReportPayload();
      previewReportButton.disabled = true;
      uploadReportButton.disabled = true;
      previewReportButton.textContent = "Generating...";

      try {
        const response = await fetch("/api/reports/pdf", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }
        if (!response.ok) throw new Error(await response.text() || "Generate report PDF failed.");
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const opened = window.open(url, "_blank");
        if (!opened) setMessage(reportResult, "ok", "PDF preview siap, tapi popup browser disekat. Benarkan popup untuk buka preview.");
        else setMessage(reportResult, "ok", "Preview PDF dibuka di tab baru.");
      } catch (error) {
        showReportError(error);
      } finally {
        previewReportButton.disabled = false;
        uploadReportButton.disabled = false;
        previewReportButton.textContent = "Preview PDF";
      }
    }

    async function uploadReport(event) {
      event.preventDefault();
      setMessage(reportResult, "", "");
      let payload;
      try {
        payload = collectReportPayload();
      } catch (error) {
        showReportError(error);
        return;
      }

      previewReportButton.disabled = true;
      uploadReportButton.disabled = true;
      uploadReportButton.textContent = "Uploading...";
      try {
        const response = await fetch("/api/reports/upload", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload)
        });
        const json = await readApiJson(response);
        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }
        if (!response.ok || !json.ok) throw new Error(json.error || "Upload report failed.");
        const upload = json.upload || {};
        const action = upload.replaced ? "replaced" : "uploaded";
        reportResult.className = "result ok";
        reportResult.textContent = [
          "Weekly report selesai diupload.",
          \`\${upload.fileName || payload.fileName}: \${action}\`,
          upload.webViewLink || upload.fileId || "",
          "WhatsApp tidak dihantar. Hantar secara manual dari Client Pilot."
        ].filter(Boolean).join("\\n");
        showToast("Weekly report selesai dan sudah diupload.");
        loadTodayDashboard({ silent: true, force: true });
        await loadActivity();
      } catch (error) {
        showReportError(error);
      } finally {
        previewReportButton.disabled = false;
        uploadReportButton.disabled = false;
        uploadReportButton.textContent = "Generate & Upload Report";
      }
    }

    function agencyClientLabel(code) {
      const client = currentClients.find((item) => item.code === code);
      return client?.brandClient || client?.name || code || "Agency client";
    }

    function agencyOperationStatusLabel(status) {
      return ({ active: "Active", paused: "Paused", completed: "Completed", todo: "To do", in_progress: "In progress", done: "Done", cancelled: "Cancelled" })[status] || status;
    }

    function agencyWorkTypeLabel(type) {
      return ({ general: "General", report: "Weekly report", invoice: "Invoice", creative: "Creative", campaign_review: "Campaign review" })[type] || "General";
    }

    function populateAgencyWorkspaceClients() {
      const selected = agencyWorkspaceClient.value;
      const clients = currentClients.filter((client) => !["archived", "completed"].includes(agencyClientStatus(client)));
      agencyWorkspaceClient.innerHTML = '<option value="">Semua agency clients</option>' + clients.map((client) => (
        '<option value="' + escapeHtml(client.code) + '">' + escapeHtml(client.brandClient || client.name || client.code) + '</option>'
      )).join("");
      agencyWorkspaceClient.value = clients.some((client) => client.code === selected) ? selected : "";
    }

    function resetAgencyOperationForm(form, cancelButton) {
      form.reset();
      form.elements.id.value = "";
      cancelButton.hidden = true;
      const submit = form.querySelector('button[type="submit"]');
      submit.textContent = form === agencyServiceForm ? "Save Service" : form === agencyTemplateForm ? "Save Recurring Delivery" : form === agencyOpportunityForm ? "Save Opportunity" : "Save Task";
    }

    function populateAgencyServiceOptions(selectedCode) {
      const select = agencyTemplateForm.elements.serviceId;
      const selected = select.value;
      const services = currentAgencyServices.filter((service) => !selectedCode || service.clientCode === selectedCode);
      select.innerHTML = '<option value="">No linked service</option>' + services.map((service) => '<option value="' + escapeHtml(service.id) + '">' + escapeHtml(service.name) + '</option>').join("");
      select.value = services.some((service) => service.id === selected) ? selected : "";
    }

    function agencyModuleAction(task) {
      if (!task || !["report", "invoice"].includes(task.workType)) return "";
      const label = task.workType === "report" ? "Open Report" : "Open Invoice";
      return '<button class="secondary open-agency-module" type="button" data-work-type="' + task.workType + '" data-client-code="' + escapeHtml(task.clientCode) + '">' + label + '</button>';
    }

    function renderAgencyDeliveryCalendar(tasks, today) {
      const limit = new Date(today + "T12:00:00");
      limit.setDate(limit.getDate() + 13);
      const endDate = localIsoDate(limit);
      const upcoming = tasks.filter((task) => task.dueDate && task.dueDate >= today && task.dueDate <= endDate && ["todo", "in_progress"].includes(task.status));
      const groups = upcoming.reduce((map, task) => {
        if (!map.has(task.dueDate)) map.set(task.dueDate, []);
        map.get(task.dueDate).push(task);
        return map;
      }, new Map());
      agencyDeliveryCalendar.innerHTML = groups.size ? [...groups.entries()].map(([dueDate, items]) => {
        const label = new Date(dueDate + "T12:00:00").toLocaleDateString("en-MY", { weekday: "short", day: "numeric", month: "short" });
        return '<section class="agency-calendar-day"><div class="agency-calendar-date"><strong>' + escapeHtml(label) + '</strong><span>' + items.length + ' task</span></div><div class="agency-calendar-tasks">' + items.map((task) => '<article><div><strong>' + escapeHtml(task.title) + '</strong><span>' + escapeHtml(agencyClientLabel(task.clientCode)) + ' · ' + escapeHtml(agencyWorkTypeLabel(task.workType)) + '</span></div>' + agencyModuleAction(task) + '</article>').join("") + '</div></section>';
      }).join("") : '<div class="empty-state compact"><strong>Tiada delivery dalam 14 hari.</strong><span>Tambah recurring delivery atau task dengan due date.</span></div>';
    }

    function renderAgencyPerformance(selectedCode) {
      const insights = currentAgencyInsights || {};
      const grossProfitReady = insights.costReady && Number.isFinite(insights.grossProfit);
      agencyGrossProfit.textContent = grossProfitReady ? formatMoneyValue(insights.grossProfit) : "Setup costs";
      agencyInternalCost.textContent = grossProfitReady ? "Cost " + formatMoneyValue(insights.internalCost || 0) : "Isi internal cost pada semua service";
      agencyGrossMargin.textContent = Number.isFinite(insights.marginPercent) ? insights.marginPercent.toFixed(1).replace(".0", "") + "%" : "-";
      agencyCompletionRate.textContent = Number(insights.recentTaskCount || 0) ? Number(insights.completionRate || 0).toFixed(1).replace(".0", "") + "%" : "-";
      agencyCompletionSample.textContent = Number(insights.recentTaskCount || 0) ? insights.recentTaskCount + " task created" : "No recent tasks";
      agencyOverdueTasks.textContent = String(insights.overdueTaskCount || 0);

      const clientRows = (insights.clients || []).filter((client) => !selectedCode || client.clientCode === selectedCode);
      agencyClientProfitability.innerHTML = clientRows.length ? clientRows.map((client) => {
        const margin = Number.isFinite(client.marginPercent) ? client.marginPercent.toFixed(1).replace(".0", "") + "% margin" : "Cost not set";
        const profit = Number.isFinite(client.grossProfit) ? formatMoneyValue(client.grossProfit) : formatMoneyValue(client.revenue || 0) + " revenue";
        return '<article><div><strong>' + escapeHtml(agencyClientLabel(client.clientCode)) + '</strong><span>' + escapeHtml(profit) + ' · ' + escapeHtml(margin) + '</span></div><div class="agency-performance-badges"><span>' + client.openTasks + ' open</span><span data-alert="' + (client.overdueTasks ? "true" : "false") + '">' + client.overdueTasks + ' overdue</span></div></article>';
      }).join("") : '<div class="empty-state compact"><strong>Belum ada service aktif.</strong><span>Tambah service untuk mula mengira profitability.</span></div>';

      const owners = insights.owners || [];
      const maxMinutes = Math.max(1, ...owners.map((owner) => Number(owner.estimatedMinutes || 0)));
      agencyTeamCapacity.innerHTML = owners.length ? owners.map((owner) => {
        const minutes = Number(owner.estimatedMinutes || 0);
        const width = minutes ? Math.max(8, Math.round((minutes / maxMinutes) * 100)) : 0;
        const time = minutes ? (minutes / 60).toFixed(minutes % 60 ? 1 : 0) + "h estimated" : "Time not estimated";
        return '<article class="agency-capacity-row"><div><strong>' + escapeHtml(owner.owner) + '</strong><span>' + owner.taskCount + ' open · ' + escapeHtml(time) + (owner.overdueCount ? ' · ' + owner.overdueCount + ' overdue' : '') + '</span></div><div class="agency-capacity-track" aria-hidden="true"><span style="width:' + width + '%"></span></div></article>';
      }).join("") : '<div class="empty-state compact"><strong>Tiada workload terbuka.</strong><span>Task yang mempunyai owner akan muncul di sini.</span></div>';
    }

    function populateAgencyHealthForm(selectedCode) {
      const record = (currentAgencyHealth.records || []).find((item) => item.clientCode === selectedCode);
      agencyHealthForm.elements.relationshipStatus.value = record?.relationshipStatus || "stable";
      agencyHealthForm.elements.renewalStage.value = record?.renewalStage || "none";
      agencyHealthForm.elements.lastCheckIn.value = record?.lastCheckIn || "";
      agencyHealthForm.elements.nextCheckIn.value = record?.nextCheckIn || "";
      agencyHealthForm.elements.notes.value = record?.notes || "";
      [...agencyHealthForm.elements].forEach((element) => { element.disabled = !selectedCode; });
    }

    function renderAgencyHealth(selectedCode) {
      const summary = currentAgencyHealth.summary || {};
      agencyHealthyClients.textContent = String(summary.healthy || 0);
      agencyWatchClients.textContent = String(summary.watch || 0);
      agencyRiskClients.textContent = String(summary.risk || 0);
      agencyCheckInsDue.textContent = String(summary.checkInsDue || 0);
      const clients = (currentAgencyHealth.clients || []).filter((client) => !selectedCode || client.clientCode === selectedCode);
      agencyHealthBoard.innerHTML = clients.length ? clients.map((client) => {
        const label = client.status === "healthy" ? "Healthy" : client.status === "risk" ? "At risk" : "Watch";
        const detail = client.reasons.slice(0, 2).join(" · ");
        return '<article class="agency-health-item" data-health-status="' + client.status + '"><div class="agency-health-score"><strong>' + client.score + '</strong><span>/100</span></div><div class="agency-health-copy"><strong>' + escapeHtml(agencyClientLabel(client.clientCode)) + '</strong><span>' + escapeHtml(detail) + '</span><small>' + escapeHtml(client.nextCheckIn ? "Next check-in " + client.nextCheckIn : "Check-in belum dijadualkan") + (client.renewalDate ? " · Renewal " + escapeHtml(client.renewalDate) : "") + '</small></div><span class="agency-health-status">' + label + '</span><button class="secondary review-agency-health" type="button" data-client-code="' + escapeHtml(client.clientCode) + '">Review</button></article>';
      }).join("") : '<div class="empty-state compact"><strong>Tiada client untuk dinilai.</strong><span>Active dan paused clients akan muncul di sini.</span></div>';
      populateAgencyHealthForm(selectedCode);
    }

    function agencyOpportunityTypeLabel(type) {
      return ({ upsell: "Upsell", cross_sell: "Cross-sell", renewal: "Renewal", expansion: "Expansion" })[type] || type;
    }

    function agencyOpportunityStageLabel(stage) {
      return ({ idea: "Idea", discovery: "Discovery", proposal: "Proposal", won: "Won", lost: "Lost" })[stage] || stage;
    }

    function populateAgencyOpportunityForm(selectedCode) {
      const editing = Boolean(agencyOpportunityForm.elements.id.value);
      [...agencyOpportunityForm.elements].forEach((element) => { element.disabled = !selectedCode; });
      if (!selectedCode && editing) resetAgencyOperationForm(agencyOpportunityForm, cancelAgencyOpportunityEdit);
    }

    function renderAgencyGrowth(selectedCode) {
      const growth = currentAgencyGrowth || { summary: {}, renewals: [], opportunities: [] };
      const opportunities = (growth.opportunities || []).filter((item) => !selectedCode || item.clientCode === selectedCode);
      const renewals = (growth.renewals || []).filter((item) => !selectedCode || item.clientCode === selectedCode);
      const open = opportunities.filter((item) => ["idea", "discovery", "proposal"].includes(item.stage));
      const weights = { idea: 0.1, discovery: 0.3, proposal: 0.6 };
      const atRiskCodes = new Set((currentAgencyHealth.clients || []).filter((item) => item.status === "risk" && (!selectedCode || item.clientCode === selectedCode)).map((item) => item.clientCode));
      const atRiskValue = currentAgencyServices.filter((item) => item.status === "active" && atRiskCodes.has(item.clientCode)).reduce((sum, item) => sum + Number(item.monthlyFee || 0), 0);
      const renewalValue = renewals.reduce((sum, item) => sum + Number(item.monthlyFee || 0), 0);
      const pipelineValue = open.reduce((sum, item) => sum + Number(item.estimatedMonthlyValue || 0), 0);
      const weightedValue = open.reduce((sum, item) => sum + Number(item.estimatedMonthlyValue || 0) * weights[item.stage], 0);

      agencyRenewalValue.textContent = formatMoneyValue(renewalValue);
      agencyRenewalCount.textContent = renewals.length + (renewals.length === 1 ? " renewal" : " renewals");
      agencyPipelineValue.textContent = formatMoneyValue(pipelineValue);
      agencyPipelineCount.textContent = open.length + (open.length === 1 ? " opportunity" : " opportunities");
      agencyWeightedForecast.textContent = formatMoneyValue(weightedValue);
      agencyAtRiskRevenue.textContent = formatMoneyValue(atRiskValue);

      const forecastRows = [
        ...renewals.map((item) => ({ kind: "Renewal", clientCode: item.clientCode, title: item.name, value: item.monthlyFee, date: item.renewalDate, stage: "renewal" })),
        ...open.map((item) => ({ kind: agencyOpportunityTypeLabel(item.opportunityType), clientCode: item.clientCode, title: item.title, value: item.estimatedMonthlyValue, date: item.targetDate, stage: item.stage })),
      ].sort((left, right) => (left.date || "9999-12-31").localeCompare(right.date || "9999-12-31"));
      agencyGrowthForecast.innerHTML = forecastRows.length ? forecastRows.slice(0, 10).map((item) => '<article><div><span>' + escapeHtml(item.kind) + '</span><strong>' + escapeHtml(item.title) + '</strong><small>' + escapeHtml(agencyClientLabel(item.clientCode)) + ' · ' + escapeHtml(item.date || "No target date") + '</small></div><div><strong>' + escapeHtml(formatMoneyValue(item.value || 0)) + '</strong><span class="agency-status-pill" data-status="' + escapeHtml(item.stage) + '">' + escapeHtml(agencyOpportunityStageLabel(item.stage)) + '</span></div></article>').join("") : '<div class="empty-state compact"><strong>Tiada forecast 90 hari.</strong><span>Tambah renewal date atau growth opportunity.</span></div>';

      agencyOpportunityList.innerHTML = opportunities.length ? opportunities.map((item) => '<article class="agency-opportunity-item" data-stage="' + escapeHtml(item.stage) + '"><div><strong>' + escapeHtml(item.title) + '</strong><span>' + escapeHtml(agencyClientLabel(item.clientCode)) + ' · ' + escapeHtml(agencyOpportunityTypeLabel(item.opportunityType)) + ' · ' + escapeHtml(item.owner || "No owner") + '</span></div><div><strong>' + escapeHtml(formatMoneyValue(item.estimatedMonthlyValue || 0)) + '</strong><span>' + escapeHtml(item.targetDate || "No target date") + '</span></div><span class="agency-status-pill" data-status="' + escapeHtml(item.stage) + '">' + escapeHtml(agencyOpportunityStageLabel(item.stage)) + '</span><button class="secondary edit-agency-opportunity" type="button" data-opportunity-id="' + escapeHtml(item.id) + '">Edit</button></article>').join("") : '<div class="empty-state compact"><strong>Belum ada growth opportunity.</strong><span>Pilih client dan simpan peluang pertama.</span></div>';
      populateAgencyOpportunityForm(selectedCode);
    }

    function renderAgencyOperations() {
      populateAgencyWorkspaceClients();
      const activeClients = currentClients.filter((client) => agencyClientStatus(client) === "active");
      const selectedCode = agencyWorkspaceClient.value;
      const services = currentAgencyServices.filter((item) => !selectedCode || item.clientCode === selectedCode);
      const tasks = currentAgencyTasks.filter((item) => !selectedCode || item.clientCode === selectedCode);
      const templates = currentAgencyTemplates.filter((item) => !selectedCode || item.clientCode === selectedCode);
      const openTasks = currentAgencyTasks.filter((item) => ["todo", "in_progress"].includes(item.status));
      populateAgencyServiceOptions(selectedCode);
      agencyActiveClients.textContent = String(activeClients.length);
      agencyMonthlyRevenue.textContent = formatMoneyValue(activeClients.reduce((total, client) => total + Number(client.monthlyRetainer || 0), 0));
      agencyManagedBudget.textContent = formatMoneyValue(activeClients.reduce((total, client) => total + Number(client.monthlyAdBudget || 0), 0));
      agencyOpenTasks.textContent = String(openTasks.length);
      renderAgencyPerformance(selectedCode);
      renderAgencyHealth(selectedCode);
      renderAgencyGrowth(selectedCode);

      const today = localIsoDate(new Date());
      const soon = new Date();
      soon.setDate(soon.getDate() + 30);
      const soonDate = localIsoDate(soon);
      const overdue = openTasks.filter((task) => task.dueDate && task.dueDate < today);
      const renewals = currentAgencyServices.filter((service) => service.status === "active" && service.renewalDate && service.renewalDate >= today && service.renewalDate <= soonDate);
      const attention = [
        ...overdue.map((task) => ({ tone: "danger", title: "Overdue · " + task.title, detail: agencyClientLabel(task.clientCode) + " · " + task.dueDate })),
        ...renewals.map((service) => ({ tone: "warning", title: "Renewal · " + service.name, detail: agencyClientLabel(service.clientCode) + " · " + service.renewalDate })),
      ].slice(0, 6);
      agencyAttentionList.innerHTML = attention.length
        ? '<div class="agency-attention-heading"><strong>Needs attention</strong><span>' + attention.length + '</span></div>' + attention.map((item) => '<div class="agency-attention-item" data-tone="' + item.tone + '"><strong>' + escapeHtml(item.title) + '</strong><span>' + escapeHtml(item.detail) + '</span></div>').join("")
        : '<div class="agency-clear-state"><strong>Everything on track</strong><span>Tiada task overdue atau renewal dalam 30 hari.</span></div>';
      renderAgencyDeliveryCalendar(tasks, today);

      agencyServiceList.innerHTML = services.length ? services.map((service) => \`
        <article class="agency-operation-item">
          <div><strong>\${escapeHtml(service.name)}</strong><span>\${escapeHtml(agencyClientLabel(service.clientCode))} · \${escapeHtml(formatMoneyValue(service.monthlyFee || 0))}\${Number.isFinite(service.internalMonthlyCost) ? " · Cost " + escapeHtml(formatMoneyValue(service.internalMonthlyCost)) : " · Cost not set"}</span></div>
          <div class="agency-operation-meta"><span class="agency-status-pill" data-status="\${escapeHtml(service.status)}">\${escapeHtml(agencyOperationStatusLabel(service.status))}</span><span>\${escapeHtml(service.renewalDate ? "Renew " + service.renewalDate : "No renewal date")}</span></div>
          <button class="secondary edit-agency-service" type="button" data-service-id="\${escapeHtml(service.id)}">Edit</button>
        </article>
      \`).join("") : '<div class="empty-state compact"><strong>Belum ada service.</strong><span>Pilih client dan tambah service pertama.</span></div>';

      agencyTaskList.innerHTML = tasks.length ? tasks.map((task) => \`
        <article class="agency-operation-item" data-priority="\${escapeHtml(task.priority)}">
          <div><strong>\${escapeHtml(task.title)}</strong><span>\${escapeHtml(agencyClientLabel(task.clientCode))} · \${escapeHtml(agencyWorkTypeLabel(task.workType))} · \${escapeHtml(task.owner || "No owner")}\${task.estimatedMinutes ? " · " + escapeHtml(String(task.estimatedMinutes)) + " min" : ""}</span></div>
          <div class="agency-operation-meta"><span class="agency-status-pill" data-status="\${escapeHtml(task.status)}">\${escapeHtml(agencyOperationStatusLabel(task.status))}</span><span>\${escapeHtml(task.dueDate || "No due date")}</span></div>
          <div class="inline-actions">\${agencyModuleAction(task)}<button class="secondary toggle-agency-task" type="button" data-task-id="\${escapeHtml(task.id)}" data-next-status="\${task.status === "done" ? "todo" : "done"}">\${task.status === "done" ? "Reopen" : "Done"}</button><button class="secondary edit-agency-task" type="button" data-task-id="\${escapeHtml(task.id)}">Edit</button></div>
        </article>
      \`).join("") : '<div class="empty-state compact"><strong>Belum ada task.</strong><span>Pilih client dan tambah task pertama.</span></div>';

      agencyTemplateList.innerHTML = templates.length ? templates.map((template) => \`
        <article class="agency-operation-item" data-priority="\${escapeHtml(template.priority)}">
          <div><strong>\${escapeHtml(template.title)}</strong><span>\${escapeHtml(agencyClientLabel(template.clientCode))} · \${escapeHtml(agencyWorkTypeLabel(template.workType))}\${template.estimatedMinutes ? " · " + escapeHtml(String(template.estimatedMinutes)) + " min" : ""}</span></div>
          <div class="agency-operation-meta"><span class="agency-status-pill" data-status="\${template.isActive ? "active" : "paused"}">\${template.isActive ? "Active" : "Paused"}</span><span>\${template.cadence === "weekly" ? "Weekly" : "Monthly"} · Next \${escapeHtml(template.nextDueDate)}</span></div>
          <div class="inline-actions"><button class="secondary toggle-agency-template" type="button" data-template-id="\${escapeHtml(template.id)}" data-next-active="\${template.isActive ? "false" : "true"}">\${template.isActive ? "Pause" : "Resume"}</button><button class="secondary edit-agency-template" type="button" data-template-id="\${escapeHtml(template.id)}">Edit</button></div>
        </article>
      \`).join("") : '<div class="empty-state compact"><strong>Belum ada recurring delivery.</strong><span>Pilih client dan jadualkan kerja berulang pertama.</span></div>';
    }

    async function loadAgencyOperations(options = {}) {
      if (!options.silent) {
        refreshAgencyOperationsButton.disabled = true;
        refreshAgencyOperationsButton.textContent = "Loading...";
      }
      try {
        const response = await fetch("/api/clients/agency-operations");
        const json = await readApiJson(response);
        if (response.status === 401) return void (window.location.href = "/login");
        if (!response.ok || !json.ok) throw new Error(json.error || "Agency operations gagal dimuatkan.");
        currentAgencyServices = json.services || [];
        currentAgencyTasks = json.tasks || [];
        currentAgencyTemplates = json.templates || [];
        currentAgencyInsights = json.insights || {};
        currentAgencyHealth = json.health || { records: [], clients: [], summary: {} };
        currentAgencyGrowth = json.growth || { summary: {}, renewals: [], opportunities: [] };
        renderAgencyOperations();
        setMessage(agencyOperationsResult, "", "");
        if (json.generated) showToast(json.generated + " recurring task dijana.", "ok");
      } catch (error) {
        setMessage(agencyOperationsResult, "err", error.message || String(error));
      } finally {
        refreshAgencyOperationsButton.disabled = false;
        refreshAgencyOperationsButton.textContent = "Refresh";
      }
    }

    async function saveAgencyOperation(resource, form) {
      const clientCode = agencyWorkspaceClient.value;
      if (!clientCode) return setMessage(agencyOperationsResult, "err", "Pilih Working on client dahulu.");
      const values = Object.fromEntries(new FormData(form).entries());
      if (resource === "template") values.isActive = form.elements.isActive.checked;
      const id = values.id || "";
      const submit = form.querySelector('button[type="submit"]');
      const finishButton = setButtonBusy(submit, "Saving...");
      try {
        const response = await fetch("/api/clients/agency-operations", {
          method: id ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ...values, resource, clientCode }),
        });
        const json = await readApiJson(response);
        if (response.status === 401) return void (window.location.href = "/login");
        if (!response.ok || !json.ok) throw new Error(json.error || "Agency operation gagal disimpan.");
        resetAgencyOperationForm(form, resource === "service" ? cancelAgencyServiceEdit : resource === "template" ? cancelAgencyTemplateEdit : resource === "opportunity" ? cancelAgencyOpportunityEdit : cancelAgencyTaskEdit);
        await loadAgencyOperations({ silent: true });
        finishButton("Saved");
        showToast(resource === "service" ? "Service disimpan." : resource === "template" ? "Recurring delivery disimpan." : resource === "opportunity" ? "Growth opportunity disimpan." : "Task disimpan.", "ok");
      } catch (error) {
        finishButton();
        setMessage(agencyOperationsResult, "err", error.message || String(error));
      }
    }

    async function saveAgencyHealth(event) {
      event.preventDefault();
      const clientCode = agencyWorkspaceClient.value;
      if (!clientCode) return setMessage(agencyOperationsResult, "err", "Pilih Working on client dahulu.");
      const submit = agencyHealthForm.querySelector('button[type="submit"]');
      const finishButton = setButtonBusy(submit, "Saving...");
      try {
        const values = Object.fromEntries(new FormData(agencyHealthForm).entries());
        const response = await fetch("/api/clients/agency-operations", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ...values, resource: "health", clientCode }),
        });
        const json = await readApiJson(response);
        if (response.status === 401) return void (window.location.href = "/login");
        if (!response.ok || !json.ok) throw new Error(json.error || "Client health gagal disimpan.");
        await loadAgencyOperations({ silent: true });
        finishButton("Saved");
        showToast("Client health dikemaskini.", "ok");
      } catch (error) {
        finishButton();
        setMessage(agencyOperationsResult, "err", error.message || String(error));
      }
    }

    async function updateAgencyTaskStatus(taskId, status, button) {
      const finishButton = setButtonBusy(button, "Saving...");
      try {
        const response = await fetch("/api/clients/agency-operations", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ resource: "task", id: taskId, status }),
        });
        const json = await readApiJson(response);
        if (!response.ok || !json.ok) throw new Error(json.error || "Status task gagal dikemaskini.");
        await loadAgencyOperations({ silent: true });
        finishButton(status === "done" ? "Done" : "Reopened");
      } catch (error) {
        finishButton();
        setMessage(agencyOperationsResult, "err", error.message || String(error));
      }
    }

    async function updateAgencyTemplateActive(templateId, isActive, button) {
      const finishButton = setButtonBusy(button, "Saving...");
      try {
        const response = await fetch("/api/clients/agency-operations", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ resource: "template", id: templateId, isActive }),
        });
        const json = await readApiJson(response);
        if (!response.ok || !json.ok) throw new Error(json.error || "Recurring delivery gagal dikemaskini.");
        await loadAgencyOperations({ silent: true });
        finishButton(isActive ? "Resumed" : "Paused");
      } catch (error) {
        finishButton();
        setMessage(agencyOperationsResult, "err", error.message || String(error));
      }
    }

    async function syncAgencyRecurringTasks() {
      const finishButton = setButtonBusy(generateAgencyRecurringButton, "Syncing...");
      try {
        const response = await fetch("/api/clients/agency-operations", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "generate_recurring", clientCode: agencyWorkspaceClient.value || "" }),
        });
        const json = await readApiJson(response);
        if (!response.ok || !json.ok) throw new Error(json.error || "Recurring task gagal dijana.");
        currentAgencyServices = json.services || [];
        currentAgencyTasks = json.tasks || [];
        currentAgencyTemplates = json.templates || [];
        currentAgencyInsights = json.insights || {};
        currentAgencyHealth = json.health || { records: [], clients: [], summary: {} };
        currentAgencyGrowth = json.growth || { summary: {}, renewals: [], opportunities: [] };
        renderAgencyOperations();
        finishButton("Synced");
        showToast(json.generated ? json.generated + " recurring task dijana." : "Semua recurring task sudah terkini.", "ok");
      } catch (error) {
        finishButton();
        setMessage(agencyOperationsResult, "err", error.message || String(error));
      }
    }

    function openAgencyWorkModule(workType, clientCode) {
      if (workType === "invoice") {
        openInvoicePilotPanel("invoice-panel");
        return;
      }
      if (workType === "report") {
        activateTab("clientpilot");
        activateSubtab("client-modules", "client-report-panel");
        window.setTimeout(() => {
          if ([...reportClient.options].some((option) => option.value === clientCode)) {
            reportClient.value = clientCode;
            reportClient.dispatchEvent(new Event("change", { bubbles: true }));
          }
          reportClient.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 160);
      }
    }

    function agencyClientStatus(client) {
      const explicit = String(client?.agencyStatus || "").trim().toLowerCase();
      if (["onboarding", "active", "paused", "completed", "archived"].includes(explicit)) return explicit;
      if (client?.archivedAt || client?.deletedAt) return "archived";
      if (client?.onboardingStatus === "in_progress") return "onboarding";
      if (client?.serviceStatus === "paused") return "paused";
      return "active";
    }

    function agencyStatusLabel(status) {
      return ({ onboarding: "Onboarding", active: "Active", paused: "Paused", completed: "Completed", archived: "Archived" })[status] || "Active";
    }

    function renderClientList(clients, registryStatus) {
      clients = [...(clients || [])].sort((left, right) => {
        const ranks = { active: 0, onboarding: 1, paused: 2, completed: 3, archived: 4 };
        const rankDiff = (ranks[agencyClientStatus(left)] ?? 5) - (ranks[agencyClientStatus(right)] ?? 5);
        return rankDiff || String(left.brandClient || left.name || "").localeCompare(String(right.brandClient || right.name || ""));
      });
      currentClients = clients;
      setTextIfPresent(dashboardClientCount, String(clients.filter((client) => agencyClientStatus(client) === "active").length));
      setTextIfPresent(dashboardRegistryStatus, registryStatus?.ok
        ? (registryStatus.source === "supabase" ? "DB OK" : "Drive OK")
        : "Setup");

      if (!clients.length) {
        currentClients = [];
        populateReportClientOptions();
        clientList.innerHTML = '<div class="empty-state"><strong>Belum ada agency client.</strong><span>Gunakan Add Agency Client untuk mula menyimpan client pertama.</span></div>';
        setMessage(clientResult, "", "");
        return;
      }
      populateReportClientOptions();

      const rows = clients.map((client) => {
        const status = agencyClientStatus(client);
        return \`
        <div class="client-row" data-client-code="\${escapeHtml(client.code)}" data-client-status="\${status}" data-client-search="\${escapeHtml([client.brandClient, client.code, client.contactName, client.name, client.companyName, client.email, client.phone, client.serviceType, status].filter(Boolean).join(" ").toLowerCase())}">
          <div class="client-card-brand" data-label="Agency client">
            <span class="invoice-client">\${escapeHtml(client.brandClient || client.name)}</span>
            <span class="invoice-muted">\${escapeHtml(client.code)}</span>
            <span class="agency-status-pill" data-status="\${status}">\${agencyStatusLabel(status)}</span>
          </div>
          <div class="client-card-identity" data-label="Nama / Syarikat">
            \${escapeHtml(client.contactName || "-")}
            <span class="invoice-muted">\${escapeHtml(client.companyName || client.billingName || "-")}</span>
          </div>
          <div class="client-card-contact" data-label="Contact">
            \${escapeHtml(client.email || "-")}
            <span class="invoice-muted">\${escapeHtml(client.phone || "-")}</span>
          </div>
          <div class="client-card-price" data-label="Service">
            \${escapeHtml(formatMoneyValue(client.monthlyRetainer || 0))}
            <span class="invoice-muted">\${escapeHtml(client.serviceType || "Service belum ditetapkan")}</span>
          </div>
          <div class="client-card-telegram" data-label="Telegram Daily Report">
            \${(client.telegramReportConfig?.recipients || [{ slot: 1 }, { slot: 2 }]).map((recipient) => \`
              <span><strong>Penerima \${recipient.slot}</strong> \${recipient.connected ? '<span class="default-pill">Connected</span>' : '<span class="qr-pill">Not Connected</span>'}</span>
              <span class="invoice-muted">\${escapeHtml(recipient.displayName || (recipient.username ? "@" + recipient.username : "Generate link & tekan Start"))}</span>
              <span class="invoice-muted">Auto: \${recipient.autoEnabled ? "On" : "Off"}\${recipient.lastSentDate ? " · Last sent: " + escapeHtml(recipient.lastSentDate) : ""}</span>
              \${recipient.lastError ? '<span class="invoice-muted">Error: ' + escapeHtml(recipient.lastError) + '</span>' : ""}
            \`).join("")}
          </div>
          <div class="client-actions" data-label="Action">
            <details class="action-menu">
              <summary>Actions</summary>
              <div class="action-menu-list">
                <button class="secondary view-agency-client-button" type="button" data-client-code="\${escapeHtml(client.code)}">View Details</button>
                \${client.onboardingStatus === "in_progress" ? '<button class="continue-onboarding-button" type="button" data-client-code="' + escapeHtml(client.code) + '">Continue Setup</button>' : ''}
                <button class="secondary copy-drive-link-button" type="button" data-client-code="\${escapeHtml(client.code)}">Copy Drive Link</button>
                <button class="secondary whatsapp-client-button" type="button" data-client-code="\${escapeHtml(client.code)}" data-whatsapp-type="invoice">WhatsApp Invoice</button>
                <button class="secondary whatsapp-client-button" type="button" data-client-code="\${escapeHtml(client.code)}" data-whatsapp-type="receipt">WhatsApp Receipt</button>
                <button class="secondary whatsapp-client-button" type="button" data-client-code="\${escapeHtml(client.code)}" data-whatsapp-type="report">WhatsApp Report</button>
                <button class="secondary whatsapp-client-button" type="button" data-client-code="\${escapeHtml(client.code)}" data-whatsapp-type="custom">WhatsApp Custom</button>
                \${(client.telegramReportConfig?.recipients || [{ slot: 1 }, { slot: 2 }]).map((recipient) => \`
                  <button class="secondary telegram-connect-button" type="button" data-client-code="\${escapeHtml(client.code)}" data-recipient-slot="\${recipient.slot}">Generate Telegram Link \${recipient.slot}</button>
                  <button class="secondary telegram-action-button" type="button" data-client-code="\${escapeHtml(client.code)}" data-recipient-slot="\${recipient.slot}" data-telegram-action="test" \${recipient.connected ? "" : "hidden"}>Test Penerima \${recipient.slot}</button>
                  <button class="secondary telegram-action-button" type="button" data-client-code="\${escapeHtml(client.code)}" data-recipient-slot="\${recipient.slot}" data-telegram-action="send-yesterday" \${recipient.connected ? "" : "hidden"}>Send Yesterday · Penerima \${recipient.slot}</button>
                  <button class="secondary telegram-action-button" type="button" data-client-code="\${escapeHtml(client.code)}" data-recipient-slot="\${recipient.slot}" data-telegram-action="toggle" data-enabled="\${recipient.autoEnabled ? "false" : "true"}" \${recipient.connected ? "" : "hidden"}>Turn Auto \${recipient.autoEnabled ? "Off" : "On"} · Penerima \${recipient.slot}</button>
                  <button class="danger telegram-action-button" type="button" data-client-code="\${escapeHtml(client.code)}" data-recipient-slot="\${recipient.slot}" data-telegram-action="disconnect" \${recipient.connected ? "" : "hidden"}>Disconnect Penerima \${recipient.slot}</button>
                \`).join("")}
                <button class="secondary edit-client-button" type="button" data-client-code="\${escapeHtml(client.code)}">Edit</button>
                <button class="secondary service-client-button" type="button" data-client-code="\${escapeHtml(client.code)}" data-next-status="\${client.serviceStatus === "paused" ? "active" : "paused"}" \${status === "archived" ? "hidden" : ""}>\${client.serviceStatus === "paused" ? "Recover" : "Stop Service"}</button>
                <button class="danger delete-client-button" type="button" data-client-code="\${escapeHtml(client.code)}">Delete</button>
              </div>
            </details>
          </div>
        </div>
      \`; }).join("");

      clientList.innerHTML = \`
        <div class="client-row header">
          <div>Agency client</div>
          <div>Nama / Syarikat</div>
          <div>Contact</div>
          <div>Service</div>
          <div>Telegram Daily Report</div>
          <div>Action</div>
        </div>
        \${rows}
      \`;
      applyClientFilters();
      if (registryStatus?.ok) {
        setMessage(clientResult, "", "");
      } else {
        setMessage(clientResult, "err", \`Senarai config dimuat. \${registryStatus?.error || "Database belum tersedia."}\`);
      }
    }

    function agencyDetailItem(label, value) {
      return '<div><dt>' + escapeHtml(label) + '</dt><dd>' + escapeHtml(value || "-") + '</dd></div>';
    }

    function renderAgencyClientDetail(client) {
      if (!client) throw new Error("Agency client tidak dijumpai.");
      const status = agencyClientStatus(client);
      currentAgencyClientCode = client.code;
      clientDetailStatus.textContent = agencyStatusLabel(status);
      clientDetailStatus.dataset.status = status;
      clientDetailName.textContent = client.brandClient || client.name || client.code;
      clientDetailService.textContent = [client.serviceType, client.code].filter(Boolean).join(" · ");
      clientDetailGrid.innerHTML = [
        agencyDetailItem("Contact person", client.contactName),
        agencyDetailItem("Phone number", client.phone),
        agencyDetailItem("Email", client.email),
        agencyDetailItem("Company", client.companyName || client.billingName),
        agencyDetailItem("Service type", client.serviceType),
        agencyDetailItem("Monthly service fee", formatMoneyValue(client.monthlyRetainer || 0)),
        agencyDetailItem("Monthly advertising budget", formatMoneyValue(client.monthlyAdBudget || 0)),
        agencyDetailItem("Start date", client.startDate || "-"),
        agencyDetailItem("Status", agencyStatusLabel(status)),
        agencyDetailItem("Drive folder", client.driveFolderId ? "Connected" : "Not connected"),
      ].join("");
      clientDetailNotes.textContent = client.notes || "Tiada notes.";
      archiveAgencyClientButton.hidden = status === "archived";
      clientDetailLoading.hidden = true;
      clientDetailContent.hidden = false;
      setMessage(clientDetailError, "", "");
    }

    function openAgencyClientDetail(clientCode) {
      clientDetailContent.hidden = true;
      clientDetailLoading.hidden = false;
      setMessage(clientDetailError, "", "");
      activateSubtab("client", "client-detail-panel");
      try {
        renderAgencyClientDetail(currentClients.find((client) => client.code === clientCode));
      } catch (error) {
        clientDetailLoading.hidden = true;
        setMessage(clientDetailError, "err", error.message || String(error));
      }
    }

    async function archiveAgencyClient() {
      const client = currentClients.find((item) => item.code === currentAgencyClientCode);
      if (!client) return setMessage(clientDetailError, "err", "Agency client tidak dijumpai.");
      const label = client.brandClient || client.name || client.code;
      if (!window.confirm('Archive ' + label + '? Data, history dan folder Drive akan dikekalkan.')) return;
      const finishButton = setButtonBusy(archiveAgencyClientButton, "Archiving...");
      try {
        const response = await fetch("/api/clients", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ clientCode: client.code, agencyStatus: "archived" })
        });
        const json = await readApiJson(response);
        if (response.status === 401) return void (window.location.href = "/login");
        if (!response.ok || !json.ok) throw new Error(json.error || "Archive agency client gagal.");
        await loadClients();
        await loadActivity();
        renderAgencyClientDetail(currentClients.find((item) => item.code === client.code) || json.client);
        finishButton("Archived");
        showToast(label + " sudah diarkibkan.", "ok");
      } catch (error) {
        finishButton();
        setMessage(clientDetailError, "err", error.message || String(error));
      }
    }

    const CLIENT_ONBOARDING_STEPS = ["details", "ads", "drive", "telegram", "review"];

    function clientOnboardingWhatsAppTemplate() {
      return [
        "Hi, boleh bantu isi details di bawah untuk saya setup akaun dan reporting ya.",
        "",
        "MAKLUMAT CLIENT",
        "Nama brand:",
        "Nama PIC / owner:",
        "Emel:",
        "No telefon:",
        "",
        "MAKLUMAT BILLING",
        "Nama syarikat:",
        "No pendaftaran / SSM:",
        "Alamat billing penuh:",
        "Harga servis bulanan yang dipersetujui: RM"
      ].join("\\n");
    }

    async function copyClientOnboardingTemplate() {
      const text = clientOnboardingWhatsAppTemplate();
      const finishButton = setButtonBusy(copyClientOnboardingTemplateButton, "Copying...");
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
        } else {
          const textarea = document.createElement("textarea");
          textarea.value = text;
          textarea.setAttribute("readonly", "");
          textarea.style.position = "fixed";
          textarea.style.opacity = "0";
          document.body.appendChild(textarea);
          textarea.select();
          const copied = document.execCommand("copy");
          textarea.remove();
          if (!copied) throw new Error("Clipboard tidak tersedia.");
        }
        finishButton("Copied");
        setMessage(clientResult, "ok", "Template onboarding WhatsApp sudah dicopy.");
      } catch (error) {
        finishButton();
        window.prompt("Copy template WhatsApp ini:", text);
      }
    }

    async function openClientOnboardingWelcome(clientCode, targetWindow) {
      const driveResponse = await fetch("/api/clients/share-link", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ clientCode })
      });
      const driveJson = await readApiJson(driveResponse);
      if (!driveResponse.ok || !driveJson.ok) throw new Error(driveJson.error || "Master Files Drive link gagal disediakan.");

      const telegramResponse = await fetch("/api/telegram/connect-link", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ clientCode, recipientSlot: 1 })
      });
      const telegramJson = await readApiJson(telegramResponse);
      if (!telegramResponse.ok || !telegramJson.ok) throw new Error(telegramJson.error || "Telegram Daily Report link gagal disediakan.");

      const client = currentClients.find((item) => item.code === clientCode);
      const clientName = client?.contactName || client?.brandClient || driveJson.clientName || "client";
      const brandName = client?.brandClient || driveJson.clientName || clientCode;
      const message = [
        "Hi " + clientName + ", onboarding " + brandName + " dah siap.",
        "",
        "Master Files Drive",
        driveJson.driveFolderUrl,
        "",
        "Telegram Daily Reporting",
        "Klik link di bawah dan tekan Start untuk connect penerima 1.",
        telegramJson.connectUrl,
        "",
        "Link Telegram sah selama 24 jam."
      ].join("\\n");

      const whatsappResponse = await fetch("/api/clients/whatsapp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ clientCode, type: "custom", customMessage: message })
      });
      const whatsappJson = await readApiJson(whatsappResponse);
      if (!whatsappResponse.ok || !whatsappJson.ok) throw new Error(whatsappJson.error || "WhatsApp onboarding gagal disediakan.");

      if (targetWindow && !targetWindow.closed) targetWindow.location.href = whatsappJson.whatsappUrl;
      else {
        const opened = window.open(whatsappJson.whatsappUrl, "_blank");
        if (!opened) window.location.href = whatsappJson.whatsappUrl;
      }
      return whatsappJson;
    }

    function fillClientForm(client) {
      clientForm.elements.clientCode.value = client.code || "";
      clientForm.elements.brandClient.value = client.brandClient || client.name || "";
      clientForm.elements.contactName.value = client.contactName || "";
      clientForm.elements.email.value = client.email || "";
      clientForm.elements.phone.value = client.phone || "";
      clientForm.elements.companyName.value = client.companyName || client.billingName || "";
      clientForm.elements.registrationNumber.value = client.registrationNumber || "";
      clientForm.elements.monthlyRetainer.value = Number(client.monthlyRetainer || 0) ? client.monthlyRetainer : "";
      clientForm.elements.serviceType.value = client.serviceType || "";
      clientForm.elements.monthlyAdBudget.value = Number(client.monthlyAdBudget || 0);
      clientForm.elements.startDate.value = client.startDate || "";
      clientForm.elements.agencyStatus.value = agencyClientStatus(client);
      clientForm.elements.notes.value = client.notes || "";
      clientForm.elements.billingAddress.value = client.billingAddress || "";
      const adsConfig = client.adsReportConfig || {};
      clientForm.elements.platform.value = adsConfig.platform === "tiktok" ? "tiktok" : "meta";
      populateAdsAccountOptions(adsConfig.accountId || "", clientForm.elements.platform.value);
      clientForm.elements.accountName.value = adsConfig.accountName || "";
      clientForm.elements.currency.value = adsConfig.currency || "MYR";
      clientForm.elements.resultMetric.value = adsConfig.resultMetric || "conversions";
      clientForm.elements.prospectingKeywords.value = (adsConfig.prospectingKeywords || []).join(", ");
      clientForm.elements.retargetingKeywords.value = (adsConfig.retargetingKeywords || []).join(", ");
    }

    function renderClientOnboardingSummary() {
      const checks = currentClientOnboarding?.checks || {};
      const stepStates = currentClientOnboarding?.state?.steps || {};
      const currentClient = currentClients.find((item) => item.code === clientForm.elements.clientCode.value);
      const recipients = currentClient?.telegramReportConfig?.recipients || [];
      const connected = recipients.filter((item) => item.connected).length;
      clientOnboardingDriveState.textContent = checks.drive
        ? "Folder client, Weekly Report dan Invoice & Receipt sudah siap."
        : (stepStates.drive?.error || "Folder belum disediakan. Tekan button di bawah untuk create dan verify semua folder.");
      clientOnboardingDriveState.classList.toggle("onboarding-error", Boolean(stepStates.drive?.error && !checks.drive));
      clientOnboardingTelegramState.textContent = connected
        ? connected + " penerima Telegram connected."
        : "Belum disambungkan. Langkah ini optional dan boleh dibuat kemudian.";
      const items = [
        ["Client dan billing", checks.details],
        ["Akaun Ads", checks.ads],
        ["Google Drive", checks.drive],
        ["Telegram (optional)", connected > 0],
      ];
      clientOnboardingChecklist.innerHTML = items.map(([label, ready], index) => (
        '<div class="onboarding-check-item"><span>' + escapeHtml(label) + '</span><span class="' + (ready || index === 3 ? "ready" : "pending") + '">' + (ready ? "Ready" : (index === 3 ? "Optional" : "Pending")) + '</span></div>'
      )).join("");
    }

    function showClientOnboardingStep(step) {
      const safeStep = CLIENT_ONBOARDING_STEPS.includes(step) ? step : "details";
      currentClientOnboardingStep = safeStep;
      clientForm.dataset.mode = "onboarding";
      clientForm.querySelectorAll("[data-onboarding-step]").forEach((panel) => {
        const active = panel.dataset.onboardingStep === safeStep;
        panel.hidden = !active;
        panel.classList.toggle("active", active);
      });
      const activeIndex = CLIENT_ONBOARDING_STEPS.indexOf(safeStep);
      clientOnboardingProgress.hidden = false;
      clientOnboardingProgress.querySelectorAll("[data-onboarding-progress]").forEach((item, index) => {
        item.classList.toggle("active", index === activeIndex);
        item.classList.toggle("complete", index < activeIndex);
      });
      clientOnboardingBackButton.hidden = activeIndex === 0;
      discardClientOnboardingButton.hidden = !clientForm.elements.clientCode.value;
      cancelClientEditButton.hidden = true;
      const labels = {
        details: "Save & Continue",
        ads: "Save Ads & Continue",
        drive: currentClientOnboarding?.checks?.drive ? "Verify & Continue" : "Create Drive Folders",
        telegram: "Continue to Review",
        review: "Activate Client",
      };
      saveClientButton.textContent = labels[safeStep];
      renderClientOnboardingSummary();
    }

    async function continueClientOnboarding(clientCode) {
      const client = currentClients.find((item) => item.code === clientCode);
      if (!client) throw new Error("Client onboarding tidak dijumpai.");
      const response = await fetch("/api/clients/onboarding?clientCode=" + encodeURIComponent(clientCode));
      const json = await readApiJson(response);
      if (!response.ok || !json.ok) throw new Error(json.error || "Load onboarding failed.");
      currentClientOnboarding = json.onboarding;
      fillClientForm(client);
      clientForm.querySelector("h2").textContent = "Onboard " + (client.brandClient || client.name || client.code);
      setMessage(clientResult, "", "");
      activateSubtab("client", "client-add-panel");
      showClientOnboardingStep(json.onboarding.step || "details");
    }

    function resetClientFormMode() {
      clientForm.dataset.mode = "create";
      clientForm.reset();
      clientForm.elements.clientCode.value = "";
      clientForm.elements.agencyStatus.value = "onboarding";
      clientForm.elements.monthlyAdBudget.value = "0";
      clientForm.elements.startDate.value = localIsoDate(new Date());
      clientForm.querySelector("h2").textContent = "Add Agency Client";
      clientAdsPlatform.value = "meta";
      populateAdsAccountOptions("", "meta");
      clientAdsAccountName.value = "";
      clientAdsCurrency.value = "";
      currentClientOnboarding = null;
      currentClientOnboardingStep = "details";
      showClientOnboardingStep("details");
      cancelClientEditButton.hidden = true;
    }

    function editClient(clientCode) {
      const client = currentClients.find((item) => item.code === clientCode);
      if (!client) {
        showClientError(new Error("Client tidak dijumpai dalam senarai semasa."));
        return;
      }

      clientForm.dataset.mode = "edit";
      fillClientForm(client);
      clientForm.querySelector("h2").textContent = \`Edit Pelanggan: \${client.brandClient || client.name || client.code}\`;
      saveClientButton.textContent = "Update Client";
      clientOnboardingProgress.hidden = true;
      clientForm.querySelectorAll("[data-onboarding-step]").forEach((panel) => {
        panel.hidden = !["details", "ads"].includes(panel.dataset.onboardingStep);
      });
      clientOnboardingBackButton.hidden = true;
      discardClientOnboardingButton.hidden = true;
      cancelClientEditButton.hidden = false;
      setMessage(clientResult, "", "");
      activateSubtab("client", "client-add-panel");
      clientForm.elements.brandClient.focus();
    }

    async function setClientService(clientCode, nextStatus, triggerButton) {
      const client = currentClients.find((item) => item.code === clientCode);
      const label = client?.brandClient || client?.name || clientCode;
      const action = nextStatus === "active" ? "recover service" : "stop service";
      if (!window.confirm(\`\${action} untuk \${label}? Folder Google Drive tidak akan dipadam.\`)) return;

      const finishButton = setButtonBusy(triggerButton, "Updating...");
      setMessage(clientResult, "", "");
      try {
        const response = await fetch("/api/clients", {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ clientCode, status: nextStatus })
        });
        const json = await readApiJson(response);
        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }
        if (!response.ok || !json.ok) throw new Error(json.error || "Update service status failed.");
        finishButton("Done");
        await sleep(350);
        closeActionMenu(triggerButton);
        resetClientFormMode();
        await loadClients();
        await loadActivity();
        currentInvoices = [];
        currentReceipts = [];
        invoiceList.innerHTML = "";
        receiptList.innerHTML = "";
        invoiceList.className = "invoice-list";
        receiptList.className = "invoice-list";
        setMessage(clientResult, "ok", nextStatus === "active"
          ? \`Service disambung semula: \${label}. Client akan muncul semula dalam invoice/receipt.\`
          : \`Service dihentikan: \${label}. Client disimpan untuk recover akan datang dan tidak masuk invoice/receipt.\`);
      } catch (error) {
        finishButton();
        showClientError(error);
      }
    }

    async function deleteClientPermanently(clientCode, triggerButton) {
      const client = currentClients.find((item) => item.code === clientCode);
      const label = client?.brandClient || client?.name || clientCode;
      const confirmLabel = client?.brandClient || client?.name || "";
      if (!client) {
        showClientError(new Error("Client tidak dijumpai dalam senarai semasa."));
        return;
      }

      const warning = [
        \`Delete \${label} secara kekal?\`,
        "",
        "Folder Google Drive client termasuk Weekly Report dan Invoice & Receipt akan dipadam.",
        "Tindakan ini tidak boleh recover melalui button Recover.",
      ].join("\\n");
      if (!window.confirm(warning)) return;

      const typed = window.prompt(\`Untuk confirm, taip nama client tepat:\\n\${confirmLabel}\`, "");
      if (typed === null) return;
      const validNames = [client.brandClient, client.name].filter(Boolean).map((value) => String(value).trim());
      if (!validNames.includes(String(typed || "").trim())) {
        setMessage(clientResult, "err", \`Delete dibatalkan. Nama mesti sama tepat: \${confirmLabel}.\`);
        return;
      }

      const finishButton = setButtonBusy(triggerButton, "Deleting...");
      setMessage(clientResult, "", "");
      try {
        const response = await fetch("/api/clients/delete-permanent", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ clientCode, confirmName: typed.trim() })
        });
        const json = await readApiJson(response);
        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }
        if (!response.ok || !json.ok) throw new Error(json.error || "Delete client failed.");
        finishButton("Deleted");
        await sleep(450);
        closeActionMenu(triggerButton);
        resetClientFormMode();
        await loadClients();
        await loadActivity();
        currentInvoices = [];
        currentReceipts = [];
        invoiceList.innerHTML = "";
        receiptList.innerHTML = "";
        invoiceList.className = "invoice-list";
        receiptList.className = "invoice-list";
        setMessage(clientResult, "ok", \`\${label} dipadam. Folder Drive \${json.deletedFolder?.name || ""} juga dipadam.\`);
      } catch (error) {
        finishButton();
        showClientError(error);
      }
    }

    async function copyClientDriveLink(clientCode, triggerButton) {
      const client = currentClients.find((item) => item.code === clientCode);
      const label = client?.brandClient || client?.name || clientCode;
      const finishButton = setButtonBusy(triggerButton, "Copying...");
      setMessage(clientResult, "", "");

      try {
        const response = await fetch("/api/clients/share-link", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ clientCode })
        });
        const json = await readApiJson(response);
        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }
        if (!response.ok || !json.ok) throw new Error(json.error || "Copy Drive link failed.");

        const text = json.whatsappText || "";
        let copied = false;
        if (navigator.clipboard?.writeText) {
          try {
            await navigator.clipboard.writeText(text);
            copied = true;
          } catch (clipboardError) {
            copied = false;
          }
        }
        if (!copied) {
          window.prompt("Copy template WhatsApp ini:", text);
        }
        finishButton(copied ? "Copied" : "Ready");
        await sleep(250);
        closeActionMenu(triggerButton);
        setMessage(clientResult, "ok", copied
          ? \`Link WhatsApp copied untuk \${label}. Folder sudah set Anyone with link = Editor.\`
          : \`Template WhatsApp siap untuk \${label}. Folder sudah set Anyone with link = Editor.\`);
        await loadActivity();
      } catch (error) {
        finishButton();
        showClientError(error);
      }
    }

    async function sendClientWhatsapp(clientCode, type, triggerButton) {
      const client = currentClients.find((item) => item.code === clientCode);
      const label = client?.brandClient || client?.name || clientCode;
      if (!client?.phone) {
        showClientError(new Error(\`Tambah nombor telefon untuk \${label} dahulu.\`));
        return;
      }

      let customMessage = "";
      if (type === "custom") {
        customMessage = window.prompt(\`Tulis mesej WhatsApp untuk \${label}:\`, "");
        if (customMessage === null) return;
        customMessage = customMessage.trim();
        if (!customMessage) {
          showClientError(new Error("Custom message tidak boleh kosong."));
          return;
        }
      }

      const finishButton = setButtonBusy(triggerButton, "Opening...");
      setMessage(clientResult, "", "");

      try {
        const response = await fetch("/api/clients/whatsapp", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            clientCode,
            type,
            customMessage,
            period: invoicePeriod.value || defaultInvoicePeriod()
          })
        });
        const json = await readApiJson(response);
        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }
        if (!response.ok || !json.ok) throw new Error(json.error || "WhatsApp failed.");

        const opened = window.open(json.whatsappUrl, "_blank");
        if (!opened) window.location.href = json.whatsappUrl;
        finishButton("Opened");
        await sleep(250);
        closeActionMenu(triggerButton);
        setMessage(clientResult, "ok", \`WhatsApp \${type} siap untuk \${label}.\`);
        await loadActivity();
      } catch (error) {
        finishButton();
        showClientError(error);
      }
    }

    async function generateTelegramLink(clientCode, recipientSlot, triggerButton) {
      const finishButton = setButtonBusy(triggerButton, "Generating...");
      setMessage(clientResult, "", "");
      try {
        const response = await fetch("/api/telegram/connect-link", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ clientCode, recipientSlot })
        });
        const json = await readApiJson(response);
        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }
        if (!response.ok || !json.ok) throw new Error(json.error || "Generate Telegram link failed.");
        let copied = false;
        if (navigator.clipboard?.writeText) {
          try {
            await navigator.clipboard.writeText(json.connectUrl);
            copied = true;
          } catch (error) {
            copied = false;
          }
        }
        if (!copied) window.prompt("Copy link ini dan beri kepada client. Link sah 24 jam:", json.connectUrl);
        finishButton(copied ? "Copied" : "Ready");
        setMessage(clientResult, "ok", \`Telegram link Penerima \${recipientSlot} \${copied ? "copied" : "ready"}. Penerima perlu buka link dan tekan Start dalam 24 jam.\`);
      } catch (error) {
        finishButton();
        showClientError(error);
      }
    }

    async function runTelegramAction(clientCode, recipientSlot, action, triggerButton) {
      if (action === "disconnect" && !window.confirm(\`Disconnect Telegram Penerima \${recipientSlot} dan hentikan auto-report untuk penerima ini?\`)) return;
      const finishButton = setButtonBusy(triggerButton, action === "send-yesterday" ? "Loading data..." : "Working...");
      setMessage(clientResult, "", "");
      try {
        const payload = { clientCode, recipientSlot, action };
        if (action === "toggle") payload.enabled = triggerButton.dataset.enabled === "true";
        const response = await fetch("/api/telegram/action", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload)
        });
        const json = await readApiJson(response);
        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }
        if (!response.ok || !json.ok) throw new Error(json.error || "Telegram action failed.");
        if (action === "send-yesterday" && json.result?.status !== "sent") {
          throw new Error(json.result?.error || json.result?.reason || "Report Telegram tidak berjaya dihantar.");
        }
        const messages = {
          test: \`Telegram test Penerima \${recipientSlot} berjaya dihantar.\`,
          "send-yesterday": \`Yesterday report berjaya dihantar kepada Penerima \${recipientSlot}.\`,
          toggle: \`Auto-report Penerima \${recipientSlot} sudah \${payload.enabled ? "diaktifkan" : "dimatikan"}.\`,
          disconnect: \`Telegram Penerima \${recipientSlot} sudah disconnected.\`
        };
        const successMessage = messages[action] || "Telegram updated.";
        finishButton(action === "send-yesterday" ? "Sent" : "Done");
        closeActionMenu(triggerButton);
        showToast(successMessage, "ok");
        await loadClients();
        await loadActivity();
        setMessage(clientResult, "ok", successMessage);
      } catch (error) {
        finishButton();
        closeActionMenu(triggerButton);
        showClientError(error);
      }
    }

    async function loadClients() {
      setMessage(clientResult, "", "");
      refreshClientsButton.disabled = true;
      refreshClientsButton.textContent = "Loading...";
      if (!currentClients.length) clientList.innerHTML = '<div class="client-list-skeleton" aria-label="Memuatkan pelanggan"><span></span><span></span><span></span></div>';

      try {
        const response = await fetch("/api/clients");
        const json = await readApiJson(response);
        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }
        if (!response.ok || !json.ok) throw new Error(json.error || "Load client failed.");
        renderClientList(json.clients || [], json.registryStatus || {});
        renderAgencyOperations();
      } catch (error) {
        setTextIfPresent(dashboardClientCount, "-");
        setTextIfPresent(dashboardRegistryStatus, "Error");
        showClientError(error);
      } finally {
        refreshClientsButton.disabled = false;
        refreshClientsButton.textContent = "Refresh Senarai";
      }
    }

    function formatDateTime(value) {
      if (!value) return "";
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return "";
      return new Intl.DateTimeFormat("en-MY", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
    }

    function renderActivityFeed(items = []) {
      if (!activityFeed) return;
      if (!items.length) {
        activityFeed.innerHTML = '<div class="empty-state">Belum ada aktiviti. Save client, settings, bank atau upload invoice untuk mula isi live feed.</div>';
        return;
      }

      activityFeed.innerHTML = items.map((item) => \`
        <div class="activity-item">
          <strong>\${escapeHtml(item.title || "Aktiviti")}</strong>
          <span class="invoice-muted">\${escapeHtml(item.description || "")}</span>
          <span class="activity-time">\${escapeHtml(formatDateTime(item.createdAt))}</span>
        </div>
      \`).join("");
    }

    async function loadActivity() {
      if (!activityFeed) return;
      setMessage(activityResult, "", "");
      if (refreshActivityButton) {
        refreshActivityButton.disabled = true;
        setTextIfPresent(refreshActivityButton.querySelector("span"), "Loading...");
      }

      try {
        const response = await fetch("/api/activity?limit=30");
        const json = await readApiJson(response);
        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }
        if (!response.ok || !json.ok) throw new Error(json.error || "Load activity failed.");
        renderActivityFeed(json.activity || []);
      } catch (error) {
        showActivityError(error);
      } finally {
        if (refreshActivityButton) {
          refreshActivityButton.disabled = false;
          setTextIfPresent(refreshActivityButton.querySelector("span"), "Refresh data");
        }
      }
    }

    function fillSettingsForm(settings = {}) {
      settingsForm.elements.name.value = settings.name || "";
      settingsForm.elements.registrationNumber.value = settings.registrationNumber || "";
      settingsForm.elements.email.value = settings.email || "";
      settingsForm.elements.phone.value = settings.phone || "";
      settingsForm.elements.address.value = settings.address || "";
      renderBusinessLogo(settings);
    }

    function renderBusinessLogo(settings = {}) {
      const hasLogo = Boolean(settings.hasLogoImage || settings.logoPath);
      removeBusinessLogoButton.hidden = !hasLogo;
      if (!hasLogo) {
        businessLogoPreview.hidden = true;
        businessLogoPreview.innerHTML = "";
        return;
      }
      businessLogoPreview.hidden = false;
      businessLogoPreview.innerHTML = \`
        <img src="/api/settings/logo?t=\${encodeURIComponent(settings.logoImageUpdatedAt || Date.now())}" alt="Logo syarikat">
        <div>
          <strong>Logo PDF ready</strong>
          <div class="invoice-muted">\${escapeHtml(settings.logoImageName || "Logo disimpan")}</div>
        </div>
      \`;
    }

    async function uploadBusinessLogoIfNeeded() {
      const file = businessLogoImage.files?.[0];
      if (!file) return null;
      const payload = new FormData();
      payload.append("logoImage", file);
      const response = await fetch("/api/settings/logo", {
        method: "POST",
        body: payload
      });
      const json = await readApiJson(response);
      if (response.status === 401) {
        window.location.href = "/login";
        return null;
      }
      if (!response.ok || !json.ok) throw new Error(json.error || "Upload logo failed.");
      return json.settings || null;
    }

    async function removeBusinessLogo() {
      setMessage(settingsResult, "", "");
      try {
        const response = await fetch("/api/settings/logo", {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({})
        });
        const json = await readApiJson(response);
        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }
        if (!response.ok || !json.ok) throw new Error(json.error || "Remove logo failed.");
        businessLogoImage.value = "";
        renderBusinessLogo(json.settings || {});
        await loadActivity();
        setMessage(settingsResult, "ok", "Logo PDF sudah dibuang.");
      } catch (error) {
        showSettingsError(error);
      }
    }

    async function loadSettings() {
      setMessage(settingsResult, "", "");

      try {
        const response = await fetch("/api/settings");
        const json = await readApiJson(response);
        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }
        if (!response.ok || !json.ok) throw new Error(json.error || "Load settings failed.");
        fillSettingsForm(json.settings || {});
        const statusLine = json.status?.ok
          ? (json.status.loaded
            ? \`Settings dimuat dari \${json.status.source === "supabase" ? "Supabase" : "Drive"}.\`
            : "Settings guna default config.")
          : \`Settings guna default config. \${json.status?.error || ""}\`;
        setMessage(settingsResult, json.status?.ok ? "ok" : "err", statusLine.trim());
      } catch (error) {
        showSettingsError(error);
      }
    }

    async function saveSettings(event) {
      event.preventDefault();
      setMessage(settingsResult, "", "");
      saveSettingsButton.disabled = true;
      saveSettingsButton.textContent = "Saving...";

      try {
        const payload = Object.fromEntries(new FormData(settingsForm).entries());
        delete payload.logoImage;
        const response = await fetch("/api/settings", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload)
        });
        const json = await readApiJson(response);
        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }
        if (!response.ok || !json.ok) throw new Error(json.error || "Save settings failed.");
        let settings = json.settings || payload;
        const logoSettings = await uploadBusinessLogoIfNeeded();
        if (logoSettings) settings = logoSettings;
        businessLogoImage.value = "";
        fillSettingsForm(settings);
        await loadActivity();
        setMessage(settingsResult, "ok", logoSettings
          ? "Settings dan logo syarikat sudah disimpan untuk PDF invoice."
          : "Settings syarikat sudah disimpan dalam database untuk PDF invoice.");
      } catch (error) {
        showSettingsError(error);
      } finally {
        saveSettingsButton.disabled = false;
        saveSettingsButton.textContent = "Save Settings";
      }
    }

    function resetBankFormMode() {
      bankForm.dataset.mode = "create";
      bankForm.reset();
      bankForm.elements.id.value = "";
      bankForm.querySelector("h2").textContent = "Tambah Akaun Bank";
      saveBankButton.textContent = "Save Akaun Bank";
      removeBankQrButton.hidden = true;
      cancelBankEditButton.hidden = true;
      bankQrPreview.hidden = true;
      bankQrPreview.innerHTML = "";
    }

    function renderBankAccounts(accounts = []) {
      currentBankAccounts = accounts || [];
      const defaultAccount = currentBankAccounts.find((account) => account.isDefault);
      setTextIfPresent(dashboardBankStatus, defaultAccount ? "OK" : "Setup");

      if (!currentBankAccounts.length) {
        bankList.innerHTML = '<div class="empty-state">Belum ada akaun bank. Tambah satu akaun dan jadikan default untuk invoice PDF.</div>';
        return;
      }

      bankList.innerHTML = currentBankAccounts.map((account) => \`
        <div class="bank-row" data-bank-id="\${escapeHtml(account.id)}">
          <div>
            <span class="invoice-client">\${escapeHtml(account.label)}</span>
            \${account.isDefault ? '<span class="default-pill">Default PDF</span>' : ''}
            <span class="qr-pill">\${account.hasQrImage ? "QR Ready" : "Tiada QR"}</span>
          </div>
          <div>
            \${escapeHtml(account.bankName)}
            <span class="invoice-muted">\${escapeHtml(account.accountName)}</span>
          </div>
          <div>\${escapeHtml(account.accountNumber)}</div>
          <div class="bank-actions">
            <button class="secondary edit-bank-button" type="button" data-bank-id="\${escapeHtml(account.id)}">Edit</button>
            <button class="secondary delete-bank-button" type="button" data-bank-id="\${escapeHtml(account.id)}">Delete</button>
          </div>
        </div>
      \`).join("");
    }

    async function loadBankAccounts() {
      setMessage(bankResult, "", "");
      refreshBankButton.disabled = true;
      refreshBankButton.textContent = "Loading...";

      try {
        const response = await fetch("/api/bank-accounts");
        const json = await readApiJson(response);
        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }
        if (!response.ok || !json.ok) throw new Error(json.error || "Load bank account failed.");
        renderBankAccounts(json.accounts || []);
      } catch (error) {
        setTextIfPresent(dashboardBankStatus, "Error");
        showBankError(error);
      } finally {
        refreshBankButton.disabled = false;
        refreshBankButton.textContent = "Refresh Bank";
      }
    }

    function editBankAccount(bankId) {
      const account = currentBankAccounts.find((item) => item.id === bankId);
      if (!account) {
        showBankError(new Error("Akaun bank tidak dijumpai."));
        return;
      }

      bankForm.dataset.mode = "edit";
      bankForm.elements.id.value = account.id || "";
      bankForm.elements.label.value = account.label || "";
      bankForm.elements.bankName.value = account.bankName || "";
      bankForm.elements.accountName.value = account.accountName || "";
      bankForm.elements.accountNumber.value = account.accountNumber || "";
      bankForm.elements.isDefault.checked = Boolean(account.isDefault);
      renderBankQrPreview(account);
      bankForm.querySelector("h2").textContent = \`Edit Akaun Bank: \${account.label || account.bankName}\`;
      saveBankButton.textContent = "Update Akaun Bank";
      removeBankQrButton.hidden = !account.hasQrImage;
      cancelBankEditButton.hidden = false;
      setMessage(bankResult, "", "");
      bankForm.elements.label.focus();
    }

    function renderBankQrPreview(account = {}) {
      if (!account.hasQrImage) {
        bankQrPreview.hidden = true;
        bankQrPreview.innerHTML = "";
        return;
      }
      bankQrPreview.hidden = false;
      bankQrPreview.innerHTML = \`
        <img src="/api/bank-accounts/qr?id=\${encodeURIComponent(account.id)}&t=\${encodeURIComponent(account.qrImageUpdatedAt || Date.now())}" alt="QR payment">
        <div>
          <strong>QR payment ready</strong>
          <div class="invoice-muted">\${escapeHtml(account.qrImageName || "QR disimpan")}</div>
        </div>
      \`;
    }

    async function uploadBankQrIfNeeded(bankId) {
      const file = bankQrImage.files?.[0];
      if (!file) return null;
      const payload = new FormData();
      payload.append("id", bankId);
      payload.append("qrImage", file);
      const response = await fetch("/api/bank-accounts/qr", {
        method: "POST",
        body: payload
      });
      const json = await readApiJson(response);
      if (response.status === 401) {
        window.location.href = "/login";
        return null;
      }
      if (!response.ok || !json.ok) throw new Error(json.error || "Upload QR failed.");
      return json.account || null;
    }

    async function removeBankQr() {
      const id = bankForm.elements.id.value;
      if (!id) return;
      setMessage(bankResult, "", "");
      try {
        const response = await fetch("/api/bank-accounts/qr", {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id })
        });
        const json = await readApiJson(response);
        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }
        if (!response.ok || !json.ok) throw new Error(json.error || "Remove QR failed.");
        bankQrImage.value = "";
        renderBankQrPreview(json.account || {});
        removeBankQrButton.hidden = true;
        await loadBankAccounts();
        await loadActivity();
        setMessage(bankResult, "ok", "QR payment sudah dibuang.");
      } catch (error) {
        showBankError(error);
      }
    }

    async function saveBankAccount(event) {
      event.preventDefault();
      setMessage(bankResult, "", "");
      saveBankButton.disabled = true;
      saveBankButton.textContent = "Saving...";

      try {
        const isEditMode = bankForm.dataset.mode === "edit";
        const formData = new FormData(bankForm);
        const payload = Object.fromEntries(formData.entries());
        delete payload.qrImage;
        payload.isDefault = bankForm.elements.isDefault.checked;
        const response = await fetch("/api/bank-accounts", {
          method: isEditMode ? "PUT" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload)
        });
        const json = await readApiJson(response);
        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }
        if (!response.ok || !json.ok) throw new Error(json.error || "Save bank account failed.");
        const qrAccount = await uploadBankQrIfNeeded(json.account?.id);
        resetBankFormMode();
        await loadBankAccounts();
        await loadActivity();
        setMessage(bankResult, "ok", qrAccount
          ? \`Akaun bank dan QR disimpan: \${qrAccount.label || "-"}\`
          : \`Akaun bank disimpan: \${json.account?.label || "-"}\`);
      } catch (error) {
        showBankError(error);
      } finally {
        saveBankButton.disabled = false;
        saveBankButton.textContent = bankForm.dataset.mode === "edit" ? "Update Akaun Bank" : "Save Akaun Bank";
      }
    }

    async function deleteBankAccount(bankId) {
      const account = currentBankAccounts.find((item) => item.id === bankId);
      const label = account?.label || "akaun bank ini";
      if (!window.confirm(\`Delete \${label}?\`)) return;

      setMessage(bankResult, "", "");
      try {
        const response = await fetch("/api/bank-accounts", {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id: bankId })
        });
        const json = await readApiJson(response);
        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }
        if (!response.ok || !json.ok) throw new Error(json.error || "Delete bank account failed.");
        resetBankFormMode();
        await loadBankAccounts();
        await loadActivity();
        setMessage(bankResult, "ok", json.defaultAccount
          ? \`Akaun dipadam. Default sekarang: \${json.defaultAccount.label}\`
          : "Akaun dipadam. Tambah akaun default sebelum generate PDF.");
      } catch (error) {
        showBankError(error);
      }
    }

`;
};
