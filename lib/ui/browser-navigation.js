module.exports = function render() {
  return `    function defaultInvoicePeriod() {
      const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kuala_Lumpur",
        year: "numeric",
        month: "2-digit"
      }).formatToParts(new Date());
      const year = parts.find((part) => part.type === "year")?.value;
      const month = parts.find((part) => part.type === "month")?.value;
      return \`\${year}-\${month}\`;
    }

    function escapeHtml(value) {
      return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    const messageTimers = new WeakMap();

    function setMessage(node, type, message) {
      const activeTimer = messageTimers.get(node);
      if (activeTimer) window.clearTimeout(activeTimer);

      node.className = type ? \`result \${type}\` : "result";
      node.textContent = message || "";

      const visiblePanel = node.closest(".tab-panel");
      if (message && (!visiblePanel || visiblePanel.classList.contains("active"))) {
        if (type === "err") showToast(message, "error");
        else if (type === "ok" && /selesai|berjaya|sudah (disimpan|dihantar|dipadam|dibuka)|uploaded/i.test(message)) showToast(message, "ok");
      }

      if (!message) {
        messageTimers.delete(node);
        return;
      }

      const timer = window.setTimeout(() => {
        node.className = "result";
        node.textContent = "";
        messageTimers.delete(node);
      }, 60000);
      messageTimers.set(node, timer);
    }

    function setTextIfPresent(node, text) {
      if (node) node.textContent = text;
    }

    function sleep(ms) {
      return new Promise((resolve) => window.setTimeout(resolve, ms));
    }

    function markButtonSuccess(button, label = "Done", restoreText) {
      if (!button) return;
      const originalText = restoreText || button.textContent;
      button.disabled = false;
      button.textContent = label;
      button.classList.add("button-success");
      window.setTimeout(() => {
        if (!button.isConnected) return;
        button.classList.remove("button-success");
        button.textContent = originalText;
      }, 900);
    }

    function setButtonBusy(button, label) {
      if (!button) return () => {};
      const originalText = button.textContent;
      button.disabled = true;
      button.textContent = label;
      return (successLabel) => {
        if (!button.isConnected) return;
        if (successLabel) {
          markButtonSuccess(button, successLabel, originalText);
          return;
        }
        button.disabled = false;
        button.textContent = originalText;
      };
    }

    function closeActionMenu(button) {
      const menu = button?.closest(".action-menu");
      if (menu) menu.open = false;
    }

    function showClientError(error) {
      setMessage(clientResult, "err", error.message || String(error));
    }

    function showSettingsError(error) {
      setMessage(settingsResult, "err", error.message || String(error));
    }

    function showBankError(error) {
      setMessage(bankResult, "err", error.message || String(error));
    }

    function showActivityError(error) {
      if (activityResult) setMessage(activityResult, "err", error.message || String(error));
    }

    function showToast(message, tone = "ok") {
      if (!appToast || !message) return;
      window.clearTimeout(toastTimer);
      appToast.hidden = false;
      appToast.dataset.tone = tone;
      appToast.textContent = message;
      toastTimer = window.setTimeout(() => { appToast.hidden = true; }, 3200);
    }

    function activeSubtabFor(tabName) {
      const group = tabName === "personalpostpilot" ? "post-pilot" : tabName === "clientpilot" ? "client-modules" : "";
      return group ? document.querySelector(\`.subtab-panel.active[data-subtab-panel="\${group}"]\`)?.id || "" : "";
    }

    function saveLastWork(tabName, subtab = "") {
      if (!tabName || tabName === "dashboard") return;
      localStorage.setItem(LAST_WORK_STORAGE_KEY, JSON.stringify({ tab: tabName, subtab: subtab || activeSubtabFor(tabName), scrollY: Math.max(0, Math.round(window.scrollY)), updatedAt: Date.now() }));
    }

    function readLastWork() {
      try {
        const value = JSON.parse(localStorage.getItem(LAST_WORK_STORAGE_KEY) || "null");
        if (value?.tab === "reportpilot" || value?.tab === "invoicepilot") {
          value.subtab = value.tab === "reportpilot" ? "client-report-panel" : "client-invoice-panel";
          value.tab = "clientpilot";
        }
        return value && NAV_ITEMS.includes(value.tab) && Date.now() - Number(value.updatedAt || 0) < 14 * 86400000 ? value : null;
      } catch { return null; }
    }

    function navigateToWork(target = {}, { remember = true } = {}) {
      if (!target.tab) return;
      const legacyModule = target.tab === "reportpilot" ? "client-report-panel" : target.tab === "invoicepilot" ? "client-invoice-panel" : "";
      const mainTab = legacyModule ? "clientpilot" : target.tab;
      const subtab = legacyModule || target.subtab;
      activateTab(mainTab);
      if (mainTab === "clientpilot") {
        const isClientInnerPanel = subtab === "client-list-panel" || subtab === "client-add-panel";
        activateSubtab("client-modules", isClientInnerPanel ? "client-overview-panel" : subtab || "client-overview-panel");
        if (isClientInnerPanel) activateSubtab("client", subtab);
      } else if (subtab) {
        activateSubtab("post-pilot", subtab);
      }
      if (target.innerSubtab) {
        activateSubtab(subtab === "client-invoice-panel" ? "invoice-pilot" : "client", target.innerSubtab);
      }
      if (remember) saveLastWork(mainTab, activeSubtabFor(mainTab));
      if (target.panel) window.setTimeout(() => document.getElementById(target.panel)?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
      else window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function renderResumeWork() {
      const lastWork = readLastWork();
      resumeWorkButton.hidden = !lastWork;
      if (!lastWork) return;
      resumeWorkTitle.textContent = NAV_TITLES[lastWork.tab] || "Kerja terakhir";
      resumeWorkButton.onclick = () => {
        navigateToWork(lastWork, { remember: false });
        window.setTimeout(() => window.scrollTo({ top: Number(lastWork.scrollY || 0), behavior: "smooth" }), 180);
      };
    }

    function formatOperationsTime(value) {
      const date = new Date(value || "");
      if (!Number.isFinite(date.getTime())) return "Belum diperiksa";
      return new Intl.DateTimeFormat("ms-MY", { timeZone: "Asia/Kuala_Lumpur", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(date);
    }

    function operationsStatusLabel(status) {
      return ({ healthy: "Healthy", warning: "Warning", down: "Down", setup: "Setup", stale: "Stale", operational: "Operational", attention: "Needs attention", critical: "Critical" })[status] || String(status || "Unknown");
    }

    function registerOperationsAction(action) {
      if (!action?.kind) return "";
      const id = "operation-action-" + Math.random().toString(36).slice(2);
      operationsActionMap.set(id, action);
      return '<button class="operations-item-action" type="button" data-operation-action="' + id + '">' + escapeHtml(action.label || "Open") + '</button>';
    }

    function renderOperationItem(item, actionHtml = "") {
      const detail = [item.clientName || "", item.detail || ""].filter(Boolean).join(" · ");
      return '<article class="operations-item" data-status="' + escapeHtml(item.severity || item.status || "") + '">' +
        '<span class="operations-item-status" aria-hidden="true"></span>' +
        '<span class="operations-item-copy"><strong>' + escapeHtml(item.title || "Operation") + '</strong><small>' + escapeHtml(detail || formatOperationsTime(item.lastSeenAt || item.updatedAt)) + '</small></span>' +
        actionHtml + '</article>';
    }

    function cacheOperationsOverview(overview) {
      if (overview.warnings?.length) {
        sessionStorage.removeItem(TODAY_CACHE_KEY);
        return;
      }
      sessionStorage.setItem(TODAY_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), overview }));
    }

    function renderTodayDashboard(overview) {
      const summary = overview.summary || {};
      const overall = overview.overall || "operational";
      const generatedAt = overview.generatedAt || new Date().toISOString();
      operationsActionMap = new Map();
      todayDate.textContent = "Operations Center";
      todayImpact.textContent = (overview.warnings || []).length
        ? "Snapshot tersedia dengan " + overview.warnings.length + " warning data."
        : "Status terakhir " + formatOperationsTime(generatedAt) + ". Tiada background polling.";
      todayRunning.textContent = String(summary.running || 0);
      operationsFailed.textContent = String(summary.failed || 0);
      todayAttention.textContent = String(summary.attention || 0);
      operationsHealthy.textContent = String(summary.healthy || 0);
      operationsOverall.dataset.status = overall;
      operationsOverallTitle.textContent = overall === "critical" ? "Critical issue detected" : overall === "attention" ? "Some systems need attention" : "All systems operational";
      operationsOverallDetail.textContent = "Snapshot " + formatOperationsTime(generatedAt);

      const incidents = overview.incidents || [];
      document.getElementById("dismissAllIncidentsButton").onclick = async function () {
        if (!confirm("Archive semua amaran ini? Sejarah kegagalan dikekalkan. Tiada resend atau retry.")) return;
        this.disabled = true;
        try {
          const response = await fetch("/api/operations/dismiss", {
            method: "POST", headers: { "content-type": "application/json" },
            body: JSON.stringify({ fingerprints: incidents.map((item) => item.fingerprint) }),
          });
          const json = await readApiJson(response);
          if (!response.ok || !json.ok) throw new Error(json.error || "Archive gagal.");
          sessionStorage.removeItem(TODAY_CACHE_KEY);
          renderTodayDashboard(json.overview);
          cacheOperationsOverview(json.overview);
          showToast(json.dismissed + " amaran diarkibkan.", "ok");
        } catch (error) {
          showToast(error.message || String(error), "error");
          await loadTodayDashboard({ force: true });
        } finally { this.disabled = false; }
      };
      operationsAttentionSection.hidden = incidents.length === 0;
      operationsAttentionCount.textContent = String(incidents.length);
      operationsIncidents.innerHTML = incidents.length
        ? incidents.map((item) => renderOperationItem(item, registerOperationsAction(item.action) + registerOperationsAction({ kind: "dismiss", label: "Archive", fingerprint: item.fingerprint }))).join("")
        : '<div class="operations-empty">Tiada incident terbuka.</div>';

      const active = overview.activeOperations || [];
      operationsActiveSection.hidden = active.length === 0;
      operationsActiveList.innerHTML = active.map((job) => {
        const retryAt = new Date(job.recovery?.nextRetryAt || "");
        const recoveryDetail = job.recovery
          ? "Auto recovery " + job.recovery.attempt + "/" + job.recovery.maxAttempts + (Number.isFinite(retryAt.getTime()) && retryAt > new Date() ? " · cuba " + formatOperationsTime(retryAt) : " · sedang berjalan")
          : "";
        return renderOperationItem({
          status: job.status,
          title: job.type === "threads_text" ? "Threads automation" : "Facebook + Threads automation",
          detail: recoveryDetail || job.progress?.message || "Job sedang berjalan.",
        }, registerOperationsAction({ kind: "automation", operation: "cancel", label: "Cancel", jobId: job.id }));
      }).join("");

      operationsHealth.innerHTML = (overview.health || []).map((item) => {
        const meta = item.checkedAt ? "Checked " + formatOperationsTime(item.checkedAt) : "Belum diperiksa";
        const contextualAction = item.status !== "healthy" ? registerOperationsAction(item.action) : "";
        return '<article class="health-card" data-status="' + escapeHtml(item.status) + '">' +
          '<span class="health-status-dot" aria-hidden="true"></span>' +
          '<span class="health-card-copy"><span class="health-card-heading"><strong>' + escapeHtml(item.label) + '</strong><span class="health-badge">' + escapeHtml(operationsStatusLabel(item.status)) + '</span></span>' +
          '<small>' + escapeHtml(item.detail || item.description || "") + '</small><small class="health-card-meta">' + escapeHtml(meta) + '</small></span>' +
          '<span class="health-card-actions"><button class="health-check-button" type="button" data-health-check="' + escapeHtml(item.id) + '" title="Check again" aria-label="Check ' + escapeHtml(item.label) + '"><svg class="icon" aria-hidden="true"><use href="/icons.svg#refresh"></use></svg></button>' + contextualAction + '</span></article>';
      }).join("");

      const recent = overview.recentOperations || [];
      operationsRecent.innerHTML = recent.length ? recent.map((item) =>
        '<article class="operations-recent-row"><span class="operations-item-status" data-status="' + escapeHtml(item.status) + '"></span><span class="operations-recent-copy"><strong>' + escapeHtml(item.title || "Operation") + '</strong><small>' + escapeHtml(item.detail || operationsStatusLabel(item.status)) + '</small></span><time>' + escapeHtml(formatOperationsTime(item.timestamp)) + '</time></article>'
      ).join("") : '<div class="operations-empty">Belum ada operasi direkodkan.</div>';

      todaySkeleton.hidden = true;
      todayContent.hidden = false;
      renderResumeWork();
    }

    async function loadTodayDashboard({ silent = false, force = false } = {}) {
      if (!force) {
        try {
          const cached = JSON.parse(sessionStorage.getItem(TODAY_CACHE_KEY) || "null");
          if (cached?.overview && !cached.overview.warnings?.length && Date.now() - cached.savedAt < OPERATIONS_CACHE_MS) {
            renderTodayDashboard(cached.overview);
            return cached.overview;
          }
        } catch {}
      }
      if (!silent) { todaySkeleton.hidden = false; todayContent.hidden = true; }
      refreshTodayButton.disabled = true;
      try {
        const response = await fetch("/api/operations/overview");
        const json = await readApiJson(response);
        if (response.status === 401) return void (window.location.href = "/login");
        if (!response.ok || !json.ok) throw new Error(json.error || "Operations Center tidak dapat dimuatkan.");
        renderTodayDashboard(json.overview || {});
        cacheOperationsOverview(json.overview || {});
        return json.overview;
      } catch (error) {
        todaySkeleton.hidden = true;
        todayContent.hidden = false;
        todayImpact.textContent = error?.message || String(error);
        showToast("Operations Center belum dapat disegerakkan.", "error");
        return null;
      } finally {
        refreshTodayButton.disabled = false;
      }
    }

    async function checkOperationsHealth(service = "", button = checkAllHealthButton) {
      const original = button.innerHTML;
      button.disabled = true;
      if (!button.matches(".health-check-button")) button.textContent = "Checking...";
      try {
        const response = await fetch("/api/operations/health-check", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ service }),
        });
        const json = await readApiJson(response);
        if (response.status === 401) return void (window.location.href = "/login");
        if (!response.ok || !json.ok) throw new Error(json.error || "Health check gagal.");
        renderTodayDashboard(json.overview || {});
        cacheOperationsOverview(json.overview || {});
        showToast(service ? "System check selesai." : "Semua system check selesai.", "ok");
      } catch (error) {
        showToast(error?.message || String(error), "error");
      } finally {
        button.disabled = false;
        button.innerHTML = original;
      }
    }

    async function runOperationsAction(action, button) {
      if (!action) return;
      if (action.kind === "navigate") {
        navigateToWork(action);
        if (action.clientCode) {
          try {
            if (!currentClients.length) await loadClients();
            await continueClientOnboarding(action.clientCode);
          } catch (error) {
            showClientError(error);
          }
        }
        return;
      }
      if (action.kind === "href") {
        window.location.href = action.href;
        return;
      }
      const original = button.textContent;
      button.disabled = true;
      button.textContent = "Working...";
      try {
        let response;
        if (action.kind === "dismiss") {
          response = await fetch("/api/operations/dismiss", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ fingerprints: [action.fingerprint] }) });
        } else if (action.kind === "automation") {
          response = await fetch("/api/postpilot-remote/jobs/action", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ job_id: action.jobId, action: action.operation }) });
        } else if (action.kind === "telegram") {
          response = await fetch("/api/telegram/action", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "send-yesterday", clientCode: action.clientCode, recipientSlot: action.recipientSlot || 1 }) });
        }
        if (!response) return;
        const json = await readApiJson(response);
        if (!response.ok || !json.ok) throw new Error(json.error || "Action gagal.");
        sessionStorage.removeItem(TODAY_CACHE_KEY);
        await loadTodayDashboard({ force: true });
        showToast("Action selesai.", "ok");
      } catch (error) {
        showToast(error?.message || String(error), "error");
      } finally {
        button.disabled = false;
        button.textContent = original;
      }
    }

    function quickActionStats() {
      try { return JSON.parse(localStorage.getItem(QUICK_ACTION_STORAGE_KEY) || "{}"); } catch { return {}; }
    }

    function recordQuickAction(key) {
      if (!key) return;
      const stats = quickActionStats();
      stats[key] = { count: Number(stats[key]?.count || 0) + 1, lastUsed: Date.now() };
      localStorage.setItem(QUICK_ACTION_STORAGE_KEY, JSON.stringify(stats));
    }

    function sortQuickActions() {
      const grid = document.querySelector(".quick-grid");
      const stats = quickActionStats();
      [...grid.querySelectorAll(".quick-card")].sort((a, b) => Number(stats[b.dataset.actionKey]?.lastUsed || 0) - Number(stats[a.dataset.actionKey]?.lastUsed || 0)).forEach((item) => grid.appendChild(item));
    }

    function applyClientFilters() {
      const query = String(clientSearchInput?.value || "").trim().toLowerCase();
      clientList.querySelectorAll(".client-row[data-client-search]").forEach((row) => {
        const statusMatch = activeClientFilter === "all"
          ? row.dataset.clientStatus !== "archived"
          : row.dataset.clientStatus === activeClientFilter;
        row.hidden = !statusMatch || !row.dataset.clientSearch.includes(query);
      });
      const visibleRows = [...clientList.querySelectorAll(".client-row[data-client-search]")].filter((row) => !row.hidden);
      let emptyState = clientList.querySelector(".agency-filter-empty");
      if (!visibleRows.length && currentClients.length) {
        if (!emptyState) {
          emptyState = document.createElement("div");
          emptyState.className = "agency-filter-empty empty-state";
          clientList.appendChild(emptyState);
        }
        emptyState.textContent = query ? "Tiada agency client sepadan dengan carian ini." : "Tiada agency client untuk status ini.";
        emptyState.hidden = false;
      } else if (emptyState) {
        emptyState.hidden = true;
      }
    }

    function activateTab(name) {
      const previous = document.querySelector(".tab-button.active")?.dataset.tabTarget || "dashboard";
      const previousIndex = NAV_ITEMS.indexOf(previous);
      const nextIndex = Math.max(0, NAV_ITEMS.indexOf(name));
      document.body.dataset.navDirection = nextIndex >= previousIndex ? "forward" : "back";
      document.querySelectorAll(".tab-button").forEach((button) => {
        button.classList.toggle("active", button.dataset.tabTarget === name);
      });
      document.querySelectorAll(".tab-panel").forEach((panel) => {
        panel.classList.toggle("active", panel.dataset.tabPanel === name);
      });
      mobileNavigation?.style.setProperty("--active-index", String(nextIndex));
      if (mobileContextTitle) mobileContextTitle.textContent = NAV_TITLES[name] || "BuddyPilot";
      localStorage.setItem("active-main-tab", name);
      if (name === "adscmo" && !currentAdsCmoAccounts.length) loadAdsCmoAccounts();
    }

    function setupMainTabSwipe() {
      const mobileQuery = window.matchMedia("(max-width: 700px)");
      const mainSurface = document.querySelector("main");
      const surfaces = [mainSurface].filter(Boolean);
      let gesture = null;

      function activeTabName() {
        return document.querySelector(".tab-button.active")?.dataset.tabTarget || "dashboard";
      }

      function hasHorizontalScroller(target, boundary) {
        for (let node = target; node && node !== boundary; node = node.parentElement) {
          if (!(node instanceof HTMLElement)) continue;
          const style = window.getComputedStyle(node);
          const scrollable = /(auto|scroll)/.test(style.overflowX) && node.scrollWidth > node.clientWidth + 6;
          if (scrollable || node.matches(".postpilot-gallery, .invoice-list, .table-scroll, table, .viral-post-card")) return true;
        }
        return false;
      }

      function shouldIgnoreSwipe(target, surface) {
        if (surface === mobileNavigation) return false;
        if (document.querySelector(".action-menu[open], .topbar-menu[open]")) return true;
        if (target.closest("input, textarea, select, button, a, summary, [contenteditable='true'], .action-menu-list, .topbar-menu-list")) return true;
        return hasHorizontalScroller(target, surface);
      }

      function clearGestureStyles(panel, returning = false) {
        if (!panel) return;
        panel.classList.remove("tab-swipe-dragging");
        panel.style.removeProperty("--tab-swipe-x");
        panel.style.removeProperty("--tab-swipe-opacity");
        mobileNavigation?.style.removeProperty("--swipe-offset");
        if (!returning) return;
        panel.classList.add("tab-swipe-returning");
        window.setTimeout(() => panel.classList.remove("tab-swipe-returning"), 240);
      }

      function startSwipe(event, surface) {
        if (!mobileQuery.matches || event.touches.length !== 1) return;
        const target = event.target;
        if (!(target instanceof Element) || shouldIgnoreSwipe(target, surface)) return;
        const touch = event.touches[0];
        gesture = {
          surface,
          panel: document.querySelector(".tab-panel.active"),
          startX: touch.clientX,
          startY: touch.clientY,
          lastX: touch.clientX,
          startedAt: Date.now(),
          horizontal: false,
          cancelled: false,
        };
      }

      function moveSwipe(event) {
        if (!gesture || event.touches.length !== 1) return;
        const touch = event.touches[0];
        const deltaX = touch.clientX - gesture.startX;
        const deltaY = touch.clientY - gesture.startY;
        gesture.lastX = touch.clientX;
        if (!gesture.horizontal && Math.abs(deltaY) > 10 && Math.abs(deltaY) > Math.abs(deltaX)) {
          gesture.cancelled = true;
          return;
        }
        if (gesture.cancelled || Math.abs(deltaX) < 8 || Math.abs(deltaX) <= Math.abs(deltaY) * 1.15) return;
        gesture.horizontal = true;
        event.preventDefault();
        const currentIndex = NAV_ITEMS.indexOf(activeTabName());
        const pullingPastEdge = (currentIndex === 0 && deltaX > 0) || (currentIndex === NAV_ITEMS.length - 1 && deltaX < 0);
        const resistance = pullingPastEdge ? 0.16 : 0.42;
        const visualX = Math.max(-90, Math.min(90, deltaX * resistance));
        gesture.panel?.classList.add("tab-swipe-dragging");
        gesture.panel?.style.setProperty("--tab-swipe-x", String(visualX) + "px");
        gesture.panel?.style.setProperty("--tab-swipe-opacity", String(Math.max(0.76, 1 - Math.abs(visualX) / 360)));
        mobileNavigation?.style.setProperty("--swipe-offset", String(visualX * 0.34) + "px");
      }

      function finishSwipe() {
        if (!gesture) return;
        const completedGesture = gesture;
        gesture = null;
        const deltaX = completedGesture.lastX - completedGesture.startX;
        const elapsed = Math.max(1, Date.now() - completedGesture.startedAt);
        const velocity = Math.abs(deltaX) / elapsed;
        const shouldChange = completedGesture.horizontal && !completedGesture.cancelled && (Math.abs(deltaX) >= 56 || (Math.abs(deltaX) >= 32 && velocity > 0.45));
        const currentIndex = NAV_ITEMS.indexOf(activeTabName());
        const nextIndex = shouldChange ? currentIndex + (deltaX < 0 ? 1 : -1) : currentIndex;
        const targetTab = NAV_ITEMS[nextIndex];
        if (!targetTab) {
          clearGestureStyles(completedGesture.panel, true);
          return;
        }
        clearGestureStyles(completedGesture.panel, !shouldChange);
        if (!shouldChange || nextIndex === currentIndex) return;
        suppressTabClickUntil = Date.now() + 450;
        activateTab(targetTab);
        saveLastWork(targetTab, activeSubtabFor(targetTab));
        window.scrollTo({ top: 0, behavior: "smooth" });
      }

      surfaces.forEach((surface) => {
        surface.addEventListener("touchstart", (event) => startSwipe(event, surface), { passive: true });
        surface.addEventListener("touchmove", moveSwipe, { passive: false });
        surface.addEventListener("touchend", finishSwipe, { passive: true });
        surface.addEventListener("touchcancel", finishSwipe, { passive: true });
      });
    }

    function setupMainTabScrub() {
      if (!mobileNavigation) return;
      const mobileQuery = window.matchMedia("(max-width: 600px)");
      const buttons = [...mobileNavigation.querySelectorAll(".tab-button[data-tab-target]")];
      let scrub = null;

      function clearHoldTimer() {
        if (!scrub?.holdTimer) return;
        window.cancelAnimationFrame(scrub.holdTimer);
        scrub.holdTimer = null;
      }

      function schedulePreview(clientX) {
        if (!scrub) return;
        scrub.pendingX = clientX;
        if (scrub.previewFrame) return;
        scrub.previewFrame = window.requestAnimationFrame(() => {
          if (!scrub) return;
          scrub.previewFrame = null;
          previewAt(scrub.pendingX);
        });
      }

      function previewAt(clientX) {
        if (!scrub) return;
        const rect = mobileNavigation.getBoundingClientRect();
        const trackLeft = rect.left + 5;
        const trackWidth = Math.max(1, rect.width - 10);
        const slotWidth = trackWidth / buttons.length;
        const boundedX = Math.max(trackLeft + slotWidth / 2, Math.min(rect.right - 5 - slotWidth / 2, clientX));
        const targetIndex = Math.max(0, Math.min(buttons.length - 1, Math.floor((boundedX - trackLeft) / slotWidth)));
        const indicatorX = boundedX - trackLeft - slotWidth / 2;
        mobileNavigation.style.setProperty("--scrub-x", indicatorX.toFixed(2) + "px");
        buttons.forEach((button, index) => button.classList.toggle("scrub-preview", index === targetIndex));
        if (targetIndex !== scrub.targetIndex) {
          scrub.targetIndex = targetIndex;
          if (navigator.vibrate) navigator.vibrate(8);
        }
      }

      function beginScrub() {
        if (!scrub || scrub.dragging || !mobileQuery.matches) return;
        scrub.dragging = true;
        mobileNavigation.classList.remove("nav-settling");
        mobileNavigation.classList.add("nav-scrubbing", "nav-lens-entering");
        schedulePreview(scrub.lastX);
        scrub.enterTimer = window.setTimeout(() => {
          mobileNavigation.classList.remove("nav-lens-entering");
          if (scrub) scrub.enterTimer = null;
        }, 300);
      }

      function resetScrub(activate = false) {
        if (!scrub) return;
        clearHoldTimer();
        const completed = scrub;
        scrub = null;
        if (completed.previewFrame) window.cancelAnimationFrame(completed.previewFrame);
        if (completed.enterTimer) window.clearTimeout(completed.enterTimer);
        if (!completed.dragging) return;
        suppressTabClickUntil = Date.now() + 500;
        const target = buttons[completed.targetIndex]?.dataset.tabTarget;
        if (activate && target) {
          activateTab(target);
          saveLastWork(target, activeSubtabFor(target));
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
        buttons.forEach((button) => button.classList.remove("scrub-preview"));
        window.requestAnimationFrame(() => {
          mobileNavigation.classList.remove("nav-scrubbing", "nav-lens-entering");
          mobileNavigation.style.removeProperty("--scrub-x");
          mobileNavigation.classList.remove("nav-settling");
          void mobileNavigation.offsetWidth;
          mobileNavigation.classList.add("nav-settling");
          window.setTimeout(() => mobileNavigation.classList.remove("nav-settling"), 450);
        });
      }

      mobileNavigation.addEventListener("touchstart", (event) => {
        if (!mobileQuery.matches || event.touches.length !== 1) return;
        const touch = event.touches[0];
        scrub = {
          identifier: touch.identifier,
          startX: touch.clientX,
          startY: touch.clientY,
          lastX: touch.clientX,
          targetIndex: NAV_ITEMS.indexOf(document.querySelector(".tab-button.active")?.dataset.tabTarget),
          dragging: false,
          holdTimer: window.requestAnimationFrame(beginScrub),
          enterTimer: null,
          previewFrame: null,
          pendingX: touch.clientX,
        };
      }, { passive: true });

      mobileNavigation.addEventListener("touchmove", (event) => {
        if (!scrub) return;
        const touch = [...event.touches].find((item) => item.identifier === scrub.identifier);
        if (!touch) return;
        scrub.lastX = touch.clientX;
        const deltaX = touch.clientX - scrub.startX;
        const deltaY = touch.clientY - scrub.startY;
        if (!scrub.dragging && Math.abs(deltaY) > 12 && Math.abs(deltaY) > Math.abs(deltaX)) {
          resetScrub(false);
          return;
        }
        if (!scrub.dragging) return;
        event.preventDefault();
        schedulePreview(touch.clientX);
      }, { passive: false });

      mobileNavigation.addEventListener("touchend", (event) => {
        if (!scrub) return;
        if (scrub.dragging) event.preventDefault();
        resetScrub(true);
      }, { passive: false });
      mobileNavigation.addEventListener("touchcancel", () => resetScrub(false), { passive: true });
      mobileNavigation.addEventListener("contextmenu", (event) => {
        if (scrub?.dragging) event.preventDefault();
      });
    }

    function activateSubtab(group, targetId) {
      document.querySelectorAll(\`.subtab-button[data-subtab-group="\${group}"]\`).forEach((button) => {
        button.classList.toggle("active", button.dataset.subtabTarget === targetId);
      });
      document.querySelectorAll(\`.subtab-panel[data-subtab-panel="\${group}"]\`).forEach((panel) => {
        panel.classList.toggle("active", panel.id === targetId);
      });
      localStorage.setItem(\`active-subtab-\${group}\`, targetId);
    }

    function openInvoicePilotPanel(targetId) {
      activateTab("clientpilot");
      activateSubtab("client-modules", "client-invoice-panel");
      activateSubtab("invoice-pilot", targetId);
    }

    function setupMenuIntegrations() {
      const metaCard = document.getElementById("metaAdsSettings");
      const metaPanel = document.getElementById("menuMetaSettings");
      const tiktokCard = document.getElementById("tiktokAdsSettings");
      const tiktokPanel = document.getElementById("menuTikTokSettings");
      if (metaCard && metaPanel) metaPanel.appendChild(metaCard);
      if (tiktokCard && tiktokPanel) tiktokPanel.appendChild(tiktokCard);
      const panels = [...document.querySelectorAll(".menu-settings-panel")];
      document.querySelectorAll("[data-menu-section]").forEach((button) => {
        button.addEventListener("click", async () => {
          const panel = document.getElementById(button.dataset.menuSection);
          const willOpen = panel.hidden;
          panels.forEach((item) => { item.hidden = true; });
          panel.hidden = !willOpen;
        });
      });
      const requested = new URLSearchParams(window.location.search);
      if (requested.get("tiktok") || window.location.hash === "#tiktokAdsSettings") {
        topbarMenu.open = true;
        panels.forEach((item) => { item.hidden = item !== tiktokPanel; });
      } else if (requested.get("meta") || window.location.hash === "#metaAdsSettings") {
        topbarMenu.open = true;
        panels.forEach((item) => { item.hidden = item !== metaPanel; });
      }
    }

    function configureClientPilotModules() {
      const clientPanel = document.getElementById("tab-clientpilot");
      const clientCard = clientPanel?.querySelector(":scope > .card");
      const reportPanel = document.getElementById("tab-reportpilot");
      const invoicePanel = document.getElementById("tab-invoicepilot");
      if (!clientPanel || !clientCard || !reportPanel || !invoicePanel || document.getElementById("client-module-tabs")) return;

      const moduleTabs = document.createElement("div");
      moduleTabs.id = "client-module-tabs";
      moduleTabs.className = "subtabs client-module-tabs";
      moduleTabs.setAttribute("aria-label", "Client Pilot modules");
      moduleTabs.innerHTML = \`
        <button class="subtab-button active" type="button" data-subtab-group="client-modules" data-subtab-target="client-overview-panel">Client Pilot</button>
        <button class="subtab-button" type="button" data-subtab-group="client-modules" data-subtab-target="client-report-panel">Report Pilot</button>
        <button class="subtab-button" type="button" data-subtab-group="client-modules" data-subtab-target="client-invoice-panel">Invoice Pilot</button>
      \`;
      clientPanel.insertBefore(moduleTabs, clientCard);

      clientCard.id = "client-overview-panel";
      clientCard.classList.add("subtab-panel", "active");
      clientCard.dataset.subtabPanel = "client-modules";

      [
        [reportPanel, "client-report-panel"],
        [invoicePanel, "client-invoice-panel"],
      ].forEach(([panel, id]) => {
        panel.classList.remove("tab-panel");
        panel.classList.add("subtab-panel");
        panel.removeAttribute("data-tab-panel");
        panel.dataset.subtabPanel = "client-modules";
        panel.id = id;
        clientPanel.appendChild(panel);
      });
    }

    function setupTabs() {
      configureClientPilotModules();
      const requestedParams = new URLSearchParams(window.location.search);
      const requestedTab = requestedParams.get("tab");
      const requestedPanel = requestedParams.get("panel");
      let savedMainTab = requestedTab || localStorage.getItem("active-main-tab") || "dashboard";
      if (savedMainTab === "postpilot") {
        savedMainTab = "personalpostpilot";
        localStorage.setItem("active-main-tab", savedMainTab);
        localStorage.setItem("active-subtab-post-pilot", "pagepilot-panel");
      }
      if (savedMainTab === "copypilot") {
        savedMainTab = "dashboard";
        localStorage.setItem("active-main-tab", savedMainTab);
      }
      if (savedMainTab === "reportpilot" || savedMainTab === "invoicepilot") {
        localStorage.setItem("active-subtab-client-modules", savedMainTab === "reportpilot" ? "client-report-panel" : "client-invoice-panel");
        savedMainTab = "clientpilot";
        localStorage.setItem("active-main-tab", savedMainTab);
      }
      const mainTab = document.querySelector(\`.tab-button[data-tab-target="\${savedMainTab}"]\`) ? savedMainTab : "dashboard";
      activateTab(mainTab);
      document.querySelectorAll(".tab-button").forEach((button) => {
        button.addEventListener("click", (event) => {
          if (Date.now() < suppressTabClickUntil) {
            event.preventDefault();
            return;
          }
          activateTab(button.dataset.tabTarget);
          saveLastWork(button.dataset.tabTarget, activeSubtabFor(button.dataset.tabTarget));
        });
      });

      const subtabDefaults = {
        "client-modules": "client-overview-panel",
        "invoice-pilot": "invoice-panel",
        client: "client-list-panel",
        "post-pilot": "postpilot-auto-panel"
      };
      ["client-modules", "invoice-pilot", "client", "post-pilot"].forEach((group) => {
        const fallback = subtabDefaults[group] || document.querySelector(\`.subtab-button[data-subtab-group="\${group}"]\`)?.dataset.subtabTarget;
        let saved = group === "invoice-pilot" && requestedPanel ? requestedPanel : localStorage.getItem(\`active-subtab-\${group}\`);
        if (requestedTab === "clientpilot" && requestedPanel === "client-list-panel") {
          if (group === "client-modules") saved = "client-overview-panel";
          if (group === "client") saved = "client-list-panel";
        }
        const savedPanel = saved ? document.getElementById(saved) : null;
        const target = savedPanel?.dataset.subtabPanel === group ? saved : fallback;
        if (target) activateSubtab(group, target);
      });
      document.querySelectorAll(".subtab-button").forEach((button) => {
        button.addEventListener("click", () => {
          if (button.dataset.subtabGroup === "client" && button.dataset.subtabTarget === "client-add-panel") resetClientFormMode();
          activateSubtab(button.dataset.subtabGroup, button.dataset.subtabTarget);
        });
      });
      document.querySelectorAll("[data-menu-subtab]").forEach((button) => {
        button.addEventListener("click", () => {
          openInvoicePilotPanel(button.dataset.menuSubtab);
          button.closest(".topbar-menu")?.removeAttribute("open");
        });
      });
      document.querySelector("[data-menu-refresh]")?.addEventListener("click", (event) => {
        event.currentTarget.closest(".topbar-menu")?.removeAttribute("open");
        window.location.reload();
      });
      if (requestedPanel === "settings-panel") {
        window.setTimeout(() => document.getElementById("tiktokAdsSettings")?.scrollIntoView({ behavior: "smooth", block: "start" }), 200);
      }
    }

    function panelStorageKey(name) {
      return \`panel-open-\${name}\`;
    }

    function setPanelOpen(panel, isOpen) {
      panel.classList.toggle("collapsed", !isOpen);
      const header = panel.querySelector(".panel-header");
      const toggle = panel.querySelector(".panel-toggle");
      if (header) header.setAttribute("aria-expanded", isOpen ? "true" : "false");
      if (toggle) toggle.textContent = isOpen ? "⌄" : "›";
      localStorage.setItem(panelStorageKey(panel.dataset.panel), isOpen ? "1" : "0");
    }

    function setupPanels() {
      document.querySelectorAll(".app-panel").forEach((panel) => {
        const saved = localStorage.getItem(panelStorageKey(panel.dataset.panel));
        setPanelOpen(panel, saved === null ? true : saved === "1");
        panel.querySelector(".panel-header")?.addEventListener("click", () => {
          setPanelOpen(panel, panel.classList.contains("collapsed"));
        });
      });
    }

    function formatMb(bytes) {
      return (bytes / 1024 / 1024).toFixed(1);
    }

    function fileFromBlob(blob, filename) {
      return new File([blob], filename, { type: blob.type || "application/octet-stream", lastModified: Date.now() });
    }

    function readFileAsDataUrl(file) {
      return new Promise((resolve, reject) => {
        if (!file) {
          resolve("");
          return;
        }
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("Gagal baca gambar hook."));
        reader.readAsDataURL(file);
      });
    }

    function uploadLimitMessage(file) {
      return \`File ini \${formatMb(file.size)}MB. Auto-compress tidak berjaya turunkan file bawah 4MB. Vercel Serverless Function ada request body limit sekitar 4.5MB, jadi file besar tidak boleh dihantar terus melalui route ini. Cuba video lebih pendek/resolution lebih rendah, atau guna flow chunked/direct storage.\`;
    }

    function showLocalAssetPreview(container, file, label) {
      if (!file) return;
      const url = URL.createObjectURL(file);
      container.hidden = false;
      container.innerHTML = \`
        <img src="\${url}" alt="\${escapeHtml(label)}">
        <div>
          <strong>\${escapeHtml(label)} dipilih</strong>
          <div class="invoice-muted">\${escapeHtml(file.name)} - akan disimpan bila klik Save.</div>
        </div>
      \`;
    }

    async function readApiJson(response) {
      const text = await response.text();
      try {
        return JSON.parse(text);
      } catch {
        const cleanText = text.trim() || response.statusText || "Unknown server response";
        throw new Error(\`Server balas bukan JSON: \${cleanText.slice(0, 220)}\`);
      }
    }

    function canvasToBlob(canvas, type, quality) {
      return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Gagal compress image."));
        }, type, quality);
      });
    }

    async function imageBitmapFromFile(file) {
      if ("createImageBitmap" in window) return createImageBitmap(file);

      return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const image = new Image();
        image.onload = () => {
          URL.revokeObjectURL(url);
          resolve(image);
        };
        image.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error("Gagal baca image untuk compression."));
        };
        image.src = url;
      });
    }

    async function compressImageFile(file) {
      const image = await imageBitmapFromFile(file);
      const originalWidth = image.width;
      const originalHeight = image.height;
      const maxDims = [1800, 1440, 1200, 1080, 900, 720, 540];
      const qualities = [0.86, 0.78, 0.7, 0.62, 0.54, 0.46, 0.38];

      for (const maxDim of maxDims) {
        const scale = Math.min(1, maxDim / Math.max(originalWidth, originalHeight));
        const width = Math.max(1, Math.round(originalWidth * scale));
        const height = Math.max(1, Math.round(originalHeight * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(image, 0, 0, width, height);

        for (const quality of qualities) {
          const blob = await canvasToBlob(canvas, "image/jpeg", quality);
          if (blob.size <= TARGET_UPLOAD_BYTES) {
            const name = file.name.replace(/\.[^.]+$/, "") + "-compressed.jpg";
            return fileFromBlob(blob, name);
          }
        }
      }

      throw new Error("Image terlalu besar untuk dicompress bawah 4MB.");
    }

    function getVideoMetadata(file) {
      return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const video = document.createElement("video");
        video.preload = "metadata";
        video.muted = true;
        video.playsInline = true;
        video.onloadedmetadata = () => {
          const metadata = {
            duration: Math.max(1, video.duration || 1),
            width: video.videoWidth || 720,
            height: video.videoHeight || 1280,
          };
          URL.revokeObjectURL(url);
          resolve(metadata);
        };
        video.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error("Gagal baca video untuk compression."));
        };
        video.src = url;
      });
    }

    function recorderMimeType() {
      const candidates = [
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm",
        "video/mp4",
      ];
      return candidates.find((type) => window.MediaRecorder && MediaRecorder.isTypeSupported(type)) || "";
    }

    async function compressVideoPass(file, maxWidth, videoBitsPerSecond) {
      if (!window.MediaRecorder) throw new Error("Browser ini tidak support video compression.");
      const mimeType = recorderMimeType();
      if (!mimeType) throw new Error("Browser ini tidak support output video WebM/MP4 compression.");

      const url = URL.createObjectURL(file);
      const video = document.createElement("video");
      video.src = url;
      video.muted = true;
      video.playsInline = true;
      video.preload = "auto";
      await new Promise((resolve, reject) => {
        video.onloadedmetadata = resolve;
        video.onerror = () => reject(new Error("Gagal load video untuk compression."));
      });

      const scale = Math.min(1, maxWidth / Math.max(video.videoWidth || maxWidth, video.videoHeight || maxWidth));
      const width = Math.max(2, Math.round((video.videoWidth || maxWidth) * scale / 2) * 2);
      const height = Math.max(2, Math.round((video.videoHeight || maxWidth) * scale / 2) * 2);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      const stream = canvas.captureStream(24);
      const chunks = [];
      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond });

      let drawTimer = null;
      const drawFrame = () => {
        if (!video.paused && !video.ended) {
          ctx.drawImage(video, 0, 0, width, height);
          drawTimer = requestAnimationFrame(drawFrame);
        }
      };

      const done = new Promise((resolve, reject) => {
        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size) chunks.push(event.data);
        };
        recorder.onerror = () => reject(new Error("Gagal record compressed video."));
        recorder.onstop = () => {
          if (drawTimer) cancelAnimationFrame(drawTimer);
          stream.getTracks().forEach((track) => track.stop());
          URL.revokeObjectURL(url);
          resolve(new Blob(chunks, { type: mimeType.split(";")[0] || "video/webm" }));
        };
      });

      recorder.start(1000);
      video.currentTime = 0;
      await video.play();
      drawFrame();
      await new Promise((resolve) => {
        video.onended = resolve;
      });
      if (recorder.state !== "inactive") recorder.stop();
      return done;
    }

    async function compressVideoFile(file) {
      const metadata = await getVideoMetadata(file);
      const baseBitrate = Math.max(140000, Math.floor((TARGET_UPLOAD_BYTES * 8 * 0.78) / metadata.duration));
      const attempts = [
        { maxWidth: 720, bitrate: Math.min(baseBitrate, 1200000) },
        { maxWidth: 540, bitrate: Math.min(Math.floor(baseBitrate * 0.72), 800000) },
        { maxWidth: 360, bitrate: Math.min(Math.floor(baseBitrate * 0.48), 420000) },
      ];

      for (const attempt of attempts) {
        const blob = await compressVideoPass(file, attempt.maxWidth, attempt.bitrate);
        if (blob.size <= TARGET_UPLOAD_BYTES) {
          const extension = blob.type.includes("mp4") ? "mp4" : "webm";
          const name = file.name.replace(/\.[^.]+$/, "") + \`-compressed.\${extension}\`;
          return fileFromBlob(blob, name);
        }
      }

      throw new Error("Video terlalu besar/panjang untuk dicompress bawah 4MB dalam browser.");
    }

    async function prepareCreativeFile(file) {
      preparedCreativeFile = null;
      preparedCreativeNotice = "";
      if (!file || file.size <= MAX_DIRECT_UPLOAD_BYTES) {
        preparedCreativeFile = file;
        return file;
      }

      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      if (!isImage && !isVideo) throw new Error("Format tidak disokong untuk auto-compress.");

      const compressed = isImage
        ? await compressImageFile(file)
        : await compressVideoFile(file);

      if (compressed.size > MAX_DIRECT_UPLOAD_BYTES) throw new Error(uploadLimitMessage(compressed));

      preparedCreativeFile = compressed;
      preparedCreativeNotice = \`Auto-compress siap: \${formatMb(file.size)}MB -> \${formatMb(compressed.size)}MB (\${compressed.name}).\`;
      return compressed;
    }

    async function prepareThreadsImageFile(file) {
      preparedThreadsImageFile = null;
      preparedThreadsImageNotice = "";
      if (!file) return null;
      if (!file.type.startsWith("image/")) throw new Error("Post Pilot buat masa ini support gambar hook sahaja.");
      if (file.size <= TARGET_UPLOAD_BYTES) {
        preparedThreadsImageFile = file;
        return file;
      }

      const compressed = await compressImageFile(file);
      preparedThreadsImageFile = compressed;
      preparedThreadsImageNotice = \`Auto-compress gambar hook: \${formatMb(file.size)}MB -> \${formatMb(compressed.size)}MB (\${compressed.name}).\`;
      return compressed;
    }

`;
};
