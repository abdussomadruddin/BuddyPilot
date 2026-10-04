const styles = require("./styles");
const browser = require("./browser");
module.exports = function pageHtml() {
  const uiIcon = (name, tone = "") => `<svg class="icon section-icon ${tone}" aria-hidden="true"><use href="/icons.svg#${name}"></use></svg>`;
  return `<!doctype html>
<html lang="ms">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>BuddyPilot</title>
  <link rel="icon" href="/favicon.ico?v=3" sizes="any">
  <link rel="icon" href="/icons/app-icon-32x32.png?v=3" type="image/png" sizes="32x32">
  <link rel="icon" href="/icons/app-icon-192x192.png?v=3" type="image/png" sizes="192x192">
  <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png?v=3" sizes="180x180">
  <link rel="manifest" href="/site.webmanifest?v=3">
  <meta name="application-name" content="BuddyPilot">
  <meta name="apple-mobile-web-app-title" content="BuddyPilot">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="default">
  <meta name="theme-color" content="#ffffff">
${styles()}
  <link rel="stylesheet" href="/buddypilot-redesign.css?v=20260801-2">
  <link rel="stylesheet" href="/buddypilot-liquid.css?v=20261002-1">
</head>
<body>
  <main>
    <div class="topbar">
      <div class="brand">
        <img src="/icons/app-icon-512x512.png?v=3" alt="" width="34" height="34">
        <span class="brand-name">BuddyPilot</span>
        <span id="mobileContextTitle" class="mobile-context-title">Hari Ini</span>
      </div>
      <nav class="tabs topbar-tabs" aria-label="Main tabs">
        <span class="nav-liquid-indicator" aria-hidden="true"></span>
        <button class="tab-button active" type="button" data-tab-target="dashboard"><svg class="icon" aria-hidden="true"><use href="/icons.svg#layout-dashboard"></use></svg><span>Dashboard</span></button>
        <button class="tab-button" type="button" data-tab-target="adscmo"><svg class="icon" aria-hidden="true"><use href="/icons.svg#chart"></use></svg><span>Ads CMO</span></button>
        <button class="tab-button" type="button" data-tab-target="personalpostpilot"><svg class="icon" aria-hidden="true"><use href="/icons.svg#send"></use></svg><span>Post Pilot</span></button>
        <button class="tab-button" type="button" data-tab-target="clientpilot"><svg class="icon" aria-hidden="true"><use href="/icons.svg#users"></use></svg><span>Client Pilot</span></button>
      </nav>
      <details class="topbar-menu">
        <summary><svg class="icon" aria-hidden="true"><use href="/icons.svg#menu"></use></svg><span>Menu</span></summary>
        <div class="topbar-menu-list">
          <button type="button" data-menu-refresh><svg class="icon" aria-hidden="true"><use href="/icons.svg#refresh"></use></svg><span>Refresh</span></button>
          <button type="button" data-menu-subtab="settings-panel"><svg class="icon" aria-hidden="true"><use href="/icons.svg#settings"></use></svg><span>Tetapan</span></button>
          <button type="button" data-menu-subtab="bank-panel"><svg class="icon" aria-hidden="true"><use href="/icons.svg#landmark"></use></svg><span>Akaun Bank</span></button>
          <button type="button" data-menu-section="menuMetaSettings"><svg class="icon" aria-hidden="true"><use href="/icons.svg#link"></use></svg><span>Meta Ads</span></button>
          <div id="menuMetaSettings" class="menu-settings-panel" hidden></div>
          <button type="button" data-menu-section="menuTikTokSettings"><svg class="icon" aria-hidden="true"><use href="/icons.svg#link"></use></svg><span>TikTok Ads</span></button>
          <div id="menuTikTokSettings" class="menu-settings-panel" hidden></div>
          <form method="post" action="/api/logout">
            <button class="logout-option" type="submit"><svg class="icon" aria-hidden="true"><use href="/icons.svg#log-out"></use></svg><span>Logout</span></button>
          </form>
        </div>
      </details>
    </div>

    <section id="tab-dashboard" class="tab-panel active" data-tab-panel="dashboard">
      <section class="dashboard-workspace">
        <header class="operations-header">
          <div>
            <span id="todayDate" class="today-eyebrow">Operations Center</span>
            <h1>${uiIcon("layout-dashboard")}System overview</h1>
            <p id="todayImpact">Status operasi dan integration BuddyPilot.</p>
          </div>
          <div class="operations-header-actions">
            <button id="refreshTodayButton" class="dashboard-refresh" type="button" aria-label="Refresh" title="Refresh"><svg class="icon" aria-hidden="true"><use href="/icons.svg#refresh"></use></svg><span>Refresh</span></button>
            <button id="checkAllHealthButton" class="button-secondary operations-check-all" type="button">Check all systems</button>
          </div>
        </header>
        <section id="todaySkeleton" class="today-skeleton" aria-label="Memuatkan dashboard">
          <span></span><span></span><span></span>
        </section>
        <section id="todayContent" hidden>
          <section id="operationsOverall" class="operations-overall" data-status="operational">
            <span class="operations-overall-dot" aria-hidden="true"></span>
            <div>
              <strong id="operationsOverallTitle">All systems operational</strong>
              <small id="operationsOverallDetail">Last checked just now</small>
            </div>
          </section>
          <div class="operations-summary" aria-label="Operations summary">
            <div data-ui-tone="blue">${uiIcon("refresh")}<strong id="todayRunning">0</strong><span>Running</span></div>
            <div data-ui-tone="rose">${uiIcon("message")}<strong id="operationsFailed">0</strong><span>Failed</span></div>
            <div data-ui-tone="amber">${uiIcon("sparkles")}<strong id="todayAttention">0</strong><span>Attention</span></div>
            <div data-ui-tone="green">${uiIcon("settings")}<strong id="operationsHealthy">0</strong><span>Healthy</span></div>
          </div>
          <section id="operationsAttentionSection" class="operations-section" hidden>
            <div class="dashboard-section-header"><h2>${uiIcon("message", "tone-amber")}Needs attention</h2><span id="operationsAttentionCount" class="operations-count"></span><button type="button" id="dismissAllIncidentsButton">Archive All</button></div>
            <div id="operationsIncidents" class="operations-list"></div>
          </section>
          <section id="operationsActiveSection" class="operations-section" hidden>
            <div class="dashboard-section-header"><h2>${uiIcon("refresh")}Active operations</h2><span class="dashboard-section-kicker">Current progress</span></div>
            <div id="operationsActiveList" class="operations-list"></div>
          </section>
          <section class="operations-section">
            <div class="dashboard-section-header"><h2>${uiIcon("settings", "tone-green")}System health</h2><span class="dashboard-section-kicker">Passive monitor</span></div>
            <div id="operationsHealth" class="operations-health-grid"></div>
          </section>
          <button id="resumeWorkButton" class="resume-work" type="button" hidden>
            <span><small>Sambung kerja</small><strong id="resumeWorkTitle">Kembali ke kerja terakhir</strong></span>
            <svg class="icon" aria-hidden="true"><use href="/icons.svg#arrow-right"></use></svg>
          </button>
        </section>
        <div class="dashboard-layout">
          <section class="dashboard-actions" aria-labelledby="quickActionsHeading">
            <div class="dashboard-section-header">
              <h2 id="quickActionsHeading">${uiIcon("sparkles", "tone-amber")}Quick actions</h2>
              <span class="dashboard-section-kicker">Mulakan kerja</span>
            </div>
            <div class="quick-grid">
              <button class="quick-card" type="button" data-action-key="page-post" data-go-tab="personalpostpilot" data-go-subtab="pagepilot-panel">
                <span class="quick-card-icon"><svg class="icon" aria-hidden="true"><use href="/icons.svg#send"></use></svg></span>
                <span class="quick-card-copy"><strong>Buat Post Page</strong><small>Facebook Page</small></span>
                <span class="quick-card-arrow" aria-hidden="true"><svg class="icon"><use href="/icons.svg#arrow-right"></use></svg></span>
              </button>
              <button class="quick-card" type="button" data-action-key="personal-post" data-go-tab="personalpostpilot" data-go-subtab="postpilot-auto-panel">
                <span class="quick-card-icon"><svg class="icon" aria-hidden="true"><use href="/icons.svg#sparkles"></use></svg></span>
                <span class="quick-card-copy"><strong>Buat Post Personal</strong><small>Facebook + Threads</small></span>
                <span class="quick-card-arrow" aria-hidden="true"><svg class="icon"><use href="/icons.svg#arrow-right"></use></svg></span>
              </button>
              <button class="quick-card" type="button" data-action-key="threads-post" data-go-tab="personalpostpilot" data-go-subtab="threads-viral-panel">
                <span class="quick-card-icon"><svg class="icon" aria-hidden="true"><use href="/icons.svg#message"></use></svg></span>
                <span class="quick-card-copy"><strong>Buat Post Threads</strong><small>Threads General</small></span>
                <span class="quick-card-arrow" aria-hidden="true"><svg class="icon"><use href="/icons.svg#arrow-right"></use></svg></span>
              </button>
              <button class="quick-card" type="button" data-action-key="weekly-report" data-go-tab="clientpilot" data-go-subtab="client-report-panel">
                <span class="quick-card-icon"><svg class="icon" aria-hidden="true"><use href="/icons.svg#chart"></use></svg></span>
                <span class="quick-card-copy"><strong>Buat Weekly Report</strong><small>Report Pilot</small></span>
                <span class="quick-card-arrow" aria-hidden="true"><svg class="icon"><use href="/icons.svg#arrow-right"></use></svg></span>
              </button>
              <button class="quick-card" type="button" data-action-key="invoice" data-go-tab="clientpilot" data-go-subtab="client-invoice-panel" data-go-inner-subtab="invoice-panel">
                <span class="quick-card-icon"><svg class="icon" aria-hidden="true"><use href="/icons.svg#file-text"></use></svg></span>
                <span class="quick-card-copy"><strong>Buat Invois</strong><small>Invoice Pilot</small></span>
                <span class="quick-card-arrow" aria-hidden="true"><svg class="icon"><use href="/icons.svg#arrow-right"></use></svg></span>
              </button>
              <button class="quick-card" type="button" data-action-key="receipt" data-go-tab="clientpilot" data-go-subtab="client-invoice-panel" data-go-inner-subtab="receipt-panel">
                <span class="quick-card-icon"><svg class="icon" aria-hidden="true"><use href="/icons.svg#receipt"></use></svg></span>
                <span class="quick-card-copy"><strong>Buat Resit</strong><small>Payment receipt</small></span>
                <span class="quick-card-arrow" aria-hidden="true"><svg class="icon"><use href="/icons.svg#arrow-right"></use></svg></span>
              </button>
              <button class="quick-card" type="button" data-action-key="onboard-client" data-go-tab="clientpilot" data-go-subtab="client-add-panel">
                <span class="quick-card-icon"><svg class="icon" aria-hidden="true"><use href="/icons.svg#users"></use></svg></span>
                <span class="quick-card-copy"><strong>Onboard Client</strong><small>Setup billing, Ads dan Drive</small></span>
                <span class="quick-card-arrow" aria-hidden="true"><svg class="icon"><use href="/icons.svg#arrow-right"></use></svg></span>
              </button>
            </div>
          </section>

        </div>
        <section class="operations-section operations-recent-section">
          <div class="dashboard-section-header"><h2>${uiIcon("file-text")}Recent operations</h2><span class="dashboard-section-kicker">Last 30 days</span></div>
          <div id="operationsRecent" class="operations-recent"></div>
        </section>
      </section>
    </section>

    <section id="tab-adscmo" class="tab-panel" data-tab-panel="adscmo">
      <section class="card app-panel">
        <div class="section-heading">
          <div>
            <h1>${uiIcon("chart")}Ads CMO</h1>
            <p class="note">Daily profitability brief peribadi daripada Meta. Read-only — tiada perubahan dibuat pada Meta Ads.</p>
          </div>
          <span id="adsCmoStatus" class="ads-cmo-status">Belum dimuatkan</span>
        </div>

        <div class="ads-cmo-view-tabs" role="tablist" aria-label="Ads CMO data view">
          <button id="adsCmoLiveViewButton" class="ads-cmo-view-tab active" type="button" role="tab" aria-selected="true">Live Data</button>
          <button id="adsCmoReportViewButton" class="ads-cmo-view-tab" type="button" role="tab" aria-selected="false">Load Report</button>
        </div>

        <div class="ads-cmo-toolbar">
          <div><label for="adsCmoAccount">Ads account</label><select id="adsCmoAccount"></select></div>
          <div id="adsCmoReportDateField"><label for="adsCmoReportDate">Report date</label><input id="adsCmoReportDate" type="date"></div>
          <div class="ads-cmo-toolbar-actions">
            <button id="adsCmoLiveButton" type="button">Live Data</button>
            <button id="adsCmoLoadButton" class="secondary" type="button">Load Report</button>
            <button id="adsCmoRetryButton" class="secondary" type="button">Refresh Report</button>
          </div>
        </div>

        <section id="adsCmoLive" class="ads-cmo-live" hidden>
          <div class="section-heading">
            <div><h2>${uiIcon("chart")}Live Data · Today</h2><p id="adsCmoLiveTimestamp" class="note"></p></div>
            <span class="ads-cmo-live-badge">Manual snapshot</span>
          </div>
          <div id="adsCmoLiveSpend" class="ads-cmo-live-spend"></div>
          <div class="ads-cmo-live-groups">
            <section><h3>Primary Data</h3><div id="adsCmoLivePrimary" class="ads-cmo-live-metrics"></div></section>
            <section><h3>Secondary Data</h3><div id="adsCmoLiveSecondary" class="ads-cmo-live-metrics"></div></section>
          </div>
          <section class="ads-cmo-live-campaigns"><h3>${uiIcon("landmark")}Performance by Product</h3><div id="adsCmoLiveProducts" class="ads-cmo-product-grid"></div></section>
          <section class="ads-cmo-live-campaigns">
            <h3>${uiIcon("chart")}Campaign Breakdown</h3>
            <div class="ads-cmo-table-scroll"><table><thead><tr><th>Campaign</th><th>Spend</th><th>CPP</th><th>ROAS</th><th>Est. Profit</th><th>Purchase</th><th>Lead</th><th>Conversation</th><th>Impressions</th><th>Reach</th><th>Clicks</th><th>Link Clicks</th><th>CTR</th><th>CPC</th><th>CPM</th><th>Frequency</th></tr></thead><tbody id="adsCmoLiveCampaigns"></tbody></table></div>
            <div id="adsCmoLiveCampaignCards" class="ads-cmo-campaign-cards"></div>
          </section>
          <ul id="adsCmoLiveWarnings" class="ads-cmo-live-warnings"></ul>
        </section>

        <details id="adsCmoSettings" class="advanced-panel ads-cmo-settings-panel">
          <summary>${uiIcon("settings")}Account & Profit Settings</summary>
          <div class="ads-cmo-settings-content">
            <div class="ads-cmo-settings-grid">
              <label class="check-row"><input id="adsCmoAutoEnabled" type="checkbox"> Auto report setiap pagi</label>
              <div><label for="adsCmoProspectingKeywords">Prospecting keywords</label><input id="adsCmoProspectingKeywords" type="text"></div>
              <div><label for="adsCmoRetargetingKeywords">Retargeting keywords</label><input id="adsCmoRetargetingKeywords" type="text"></div>
            </div>
            <div class="section-heading ads-cmo-rules-heading"><div><h3>${uiIcon("landmark")}Product Rules</h3><p class="note">Padankan campaign dengan harga, margin atau allowable CPA.</p></div><button id="adsCmoAddProductButton" class="secondary" type="button">Add Product</button></div>
            <div id="adsCmoProductRules"></div>
            <div class="actions ads-cmo-settings-actions"><button id="adsCmoSaveSettingsButton" type="button">Save Settings</button></div>
          </div>
        </details>

        <details class="advanced-panel ads-cmo-settings-panel">
          <summary>${uiIcon("message", "tone-amber")}Morning Push</summary>
          <div class="ads-cmo-settings-content ads-cmo-push-content">
            <p id="adsCmoPushNote" class="note">Aktifkan pada setiap browser, Android atau iOS Home Screen yang anda mahu gunakan.</p>
            <button id="adsCmoPushButton" class="secondary" type="button">Aktifkan Notifikasi</button>
          </div>
        </details>

        <div id="adsCmoResult" class="result"></div>
        <section id="adsCmoReport" hidden>
          <h2 class="ads-cmo-overall-title">${uiIcon("chart")}Overall Performance</h2>
          <div id="adsCmoKpis" class="ads-cmo-kpis"></div>
          <section class="ads-cmo-section"><h2>${uiIcon("landmark")}Performance by Product</h2><div id="adsCmoProducts" class="ads-cmo-product-grid"></div></section>
          <section class="ads-cmo-section"><h2>${uiIcon("file-text")}Executive Summary</h2><ul id="adsCmoExecutive"></ul></section>
          <section class="ads-cmo-section" style="margin-top:14px"><h2>${uiIcon("chart")}KPI Scorecard · 7 Days vs Previous 7 Days</h2><div style="overflow:auto"><table class="ads-cmo-scorecard"><thead><tr><th>KPI</th><th>Current</th><th>Previous</th><th>Difference</th></tr></thead><tbody id="adsCmoScorecard"></tbody></table></div></section>
          <div class="ads-cmo-two-column">
            <section class="ads-cmo-section"><h2>${uiIcon("sparkles", "tone-green")}What Is Working</h2><div id="adsCmoWorking"></div></section>
            <section class="ads-cmo-section"><h2>${uiIcon("chart", "tone-rose")}What Is Leaking Money</h2><div id="adsCmoLeaks"></div></section>
          </div>
          <div class="ads-cmo-two-column">
            <section class="ads-cmo-section"><h2>${uiIcon("file-text")}Confirmed Evidence</h2><ul id="adsCmoEvidence"></ul></section>
            <section class="ads-cmo-section"><h2>${uiIcon("message", "tone-amber")}Likely Causes</h2><ul id="adsCmoHypotheses"></ul></section>
          </div>
          <section class="ads-cmo-section" style="margin-top:14px"><h2>${uiIcon("arrow-right")}Recommended Actions</h2><div id="adsCmoActions" class="ads-cmo-two-column"></div></section>
          <section class="ads-cmo-section" style="margin-top:14px"><h2>${uiIcon("message", "tone-amber")}Tracking Warnings</h2><ul id="adsCmoWarnings"></ul></section>
        </section>
        <div id="adsCmoEmpty" class="ads-cmo-empty">Pilih account dan load snapshot. Jika belum tersedia, gunakan Retry Report.</div>
      </section>
    </section>

    <section id="tab-personalpostpilot" class="tab-panel" data-tab-panel="personalpostpilot">
      <section class="card app-panel" data-panel="personalpostpilot">
        <div class="hero">
          <div>
            <h1>${uiIcon("send")}Post Pilot</h1>
            <p>Jana post Facebook personal pendek dan gambar hook. Chrome extension terus post ke Facebook, kemudian Threads.</p>
          </div>
        </div>

        <section class="remote-automation-panel" aria-labelledby="remoteAutomationHeading">
          <div>
            <p id="remoteAutomationHeading" class="remote-automation-heading"><span id="remoteDeviceDot" class="remote-status-dot"></span>Mac Automation</p>
            <p id="remoteDeviceStatus" class="remote-automation-status">Semak extension Mac...</p>
            <p id="remoteJobStatus" class="remote-automation-job">Tiada automation aktif.</p>
            <code id="remotePairCode" class="remote-pair-code" hidden></code>
          </div>
          <div class="remote-automation-actions">
            <button id="remoteRefreshButton" class="secondary" type="button" title="Refresh Mac status"><svg class="icon" aria-hidden="true"><use href="/icons.svg#refresh"></use></svg><span>Refresh</span></button>
            <button id="remotePairButton" class="secondary" type="button">Pair Mac</button>
            <button id="remoteCancelButton" class="secondary" type="button" hidden>Cancel</button>
            <button id="remoteRetryButton" class="secondary" type="button" hidden>Retry</button>
          </div>
        </section>

        <div class="subtabs postpilot-subtabs">
          <button class="subtab-button active" type="button" data-subtab-group="post-pilot" data-subtab-target="postpilot-auto-panel">Facebook + Threads Promote</button>
          <button class="subtab-button" type="button" data-subtab-group="post-pilot" data-subtab-target="pagepilot-panel">Facebook Page Promote</button>
          <button class="subtab-button" type="button" data-subtab-group="post-pilot" data-subtab-target="threads-viral-panel">Threads General</button>
        </div>

        <div id="pagepilot-panel" class="subtab-panel" data-subtab-panel="post-pilot">
          <div class="section-heading">
            <div>
              <h2>${uiIcon("send")}Page Pilot</h2>
              <p class="note">Upload creative, review ayat, kemudian post ke Facebook Page.</p>
            </div>
          </div>
          <form id="postForm">
            <label for="creative">Creative gambar/video</label>
            <input id="creative" name="creative" type="file" accept="image/*,video/mp4,video/quicktime,video/webm" required>

            <label for="salespage_link">Salespage link</label>
            <input id="salespage_link" name="salespage_link" type="url" value="https://digitaldominate.com/" required>

            <details class="mobile-options">
              <summary>${uiIcon("settings")}More options</summary>
              <div class="mobile-options-content">
                <label for="caption_note">Konteks poster/video / angle creative (optional)</label>
                <textarea id="caption_note" name="caption_note" placeholder="Contoh: Poster tunjuk founder penat packing order, angle: banyak kerja tapi salespage bantu automate workflow."></textarea>
                <label for="custom_caption">Custom caption penuh (optional)</label>
                <textarea id="custom_caption" name="custom_caption" placeholder="Kalau isi bahagian ini, sistem guna caption ini terus. Pastikan letak salespage link."></textarea>
                <label for="first_comment">First comment CTA (optional)</label>
                <textarea id="first_comment" name="first_comment" placeholder="Kosongkan untuk auto-generate first comment."></textarea>
              </div>
            </details>

            <button type="submit">Preview Copywriting</button>
          </form>

          <section id="previewPanel" class="preview">
            <h2>${uiIcon("file-text")}Preview Sebelum Posting</h2>
            <p class="note" id="previewMeta"></p>

            <label for="captionPreview">Caption yang akan dipost</label>
            <textarea id="captionPreview"></textarea>

            <label for="commentPreview">Komen CTA yang akan dijadikan first comment</label>
            <textarea id="commentPreview"></textarea>

            <div class="actions">
              <button class="approve" id="approveButton" type="button">Approve & Post ke Facebook</button>
              <button class="regenerate" id="regenerateButton" type="button">Jana Semula Copywriting</button>
            </div>
          </section>

          <div id="result" class="result"></div>
        </div>

        <div id="postpilot-auto-panel" class="subtab-panel active" data-subtab-panel="post-pilot">
          <div class="workflow-steps" aria-label="Aliran Post Pilot"><span class="active">1 Pilih</span><span>2 Generate</span><span>3 Review</span><span>4 Post</span></div>
          <form id="threadsForm" class="client-form">
            <div class="client-grid">
              <div>
                <label for="threadsProductSelect">Produk aktif</label>
                <select id="threadsProductSelect" aria-label="Produk aktif"></select>
                <div class="inline-actions product-actions">
                  <button id="showAddProductButton" class="secondary" type="button">Tambah produk</button>
                  <button id="deleteProductButton" class="danger" type="button">Delete produk</button>
                </div>
              </div>
              <div id="addProductPanel" hidden>
                <label for="newProductName">Produk baru</label>
                <input id="newProductName" type="text" placeholder="Nama produk">
                <input id="newProductLink" type="url" placeholder="https://link-produk.com">
                <div class="inline-actions">
                  <button id="saveNewProductButton" type="button">Simpan produk</button>
                  <button id="cancelNewProductButton" class="secondary" type="button">Batal</button>
                </div>
              </div>
              <div>
                <label for="threadsProductName">Nama produk</label>
                <input id="threadsProductName" name="product_name" type="text" value="K-Method" placeholder="Contoh: K-Method" readonly required>
              </div>
              <div>
                <label for="threadsAffiliateLink">Affiliate / comment link</label>
                <input id="threadsAffiliateLink" name="affiliate_link" type="url" value="https://swiy.co/kmethod" placeholder="Link yang nak letak di komen" readonly>
              </div>
              <div>
                <label for="threadsPostMode">Mode post</label>
                <select id="threadsPostMode" name="post_mode">
                  <option value="auto" selected>Auto rotate random</option>
                  <option value="soft">Soft story</option>
                  <option value="hard">Hard sell</option>
                  <option value="proof">Proof</option>
                  <option value="engagement">Engagement question</option>
                  <option value="objection">Objection</option>
                </select>
              </div>
              <details class="full advanced-panel">
                <summary>${uiIcon("message")}Voice Lock</summary>
                <p class="note">Kekalkan cara cakap yang sama untuk produk ini, walaupun pattern post berubah.</p>
                <div class="client-grid">
                  <div>
                    <label for="postPilotVoiceSlang">Gaya bahasa</label>
                    <select id="postPilotVoiceSlang">
                      <option value="light">Santai ringan</option>
                      <option value="moderate" selected>Malaysia natural</option>
                      <option value="strong">Lebih slang</option>
                    </select>
                  </div>
                  <div>
                    <label for="postPilotVoiceEnglish">Malay-English mix</label>
                    <select id="postPilotVoiceEnglish">
                      <option value="off">BM sahaja</option>
                      <option value="light" selected>Light</option>
                      <option value="moderate">Moderate</option>
                    </select>
                  </div>
                  <div class="full">
                    <label for="postPilotVoicePreferred">Ayat yang aku selalu guna</label>
                    <input id="postPilotVoicePreferred" type="text" placeholder="Contoh, jujur aku rasa, senang cerita">
                  </div>
                  <div class="full">
                    <label for="postPilotVoiceBanned">Ayat yang jangan guna</label>
                    <input id="postPilotVoiceBanned" type="text" placeholder="Pisahkan dengan koma">
                  </div>
                </div>
                <button id="savePostPilotVoiceButton" class="secondary" type="button">Save Voice Lock</button>
              </details>
              <div>
                <label for="threadsHookImage">Gambar hook</label>
                <input id="threadsHookImage" name="hook_image" type="file" multiple accept="image/jpeg,image/png,image/webp">
                <div class="hook-image-preview">
                  <img id="threadsHookImagePreview" alt="Preview gambar hook terakhir" hidden>
                  <p class="note" id="threadsHookImageStatus">Galeri gambar hook belum dimuatkan.</p>
                </div>
                <div id="threadsHookGallery" class="postpilot-gallery" aria-live="polite"></div>
              </div>
            </div>
            <div class="actions">
              <button id="threadsPreviewButton" type="submit">Generate Preview</button>
              <button id="threadsBatchPostButton" class="approve" type="button">POST 5 NOW</button>
            </div>
          </form>

          <section id="threadsPreviewPanel" class="preview" hidden>
            <h2>${uiIcon("file-text")}Preview Post Pilot</h2>
            <p class="note" id="threadsPreviewMeta"></p>

            <label for="threadsPostPreview">Post utama</label>
            <textarea id="threadsPostPreview"></textarea>

            <div class="actions">
              <button class="approve" id="sendThreadsExtensionButton" type="button">POST NOW</button>
              <button class="regenerate" id="regenerateThreadsButton" type="button">Jana Semula Post</button>
            </div>
          </section>

          <div id="threadsResult" class="result"></div>
        </div>

        <div id="threads-viral-panel" class="subtab-panel" data-subtab-panel="post-pilot">
          <section class="client-form">
            <div class="section-heading">
              <div>
                <h2>${uiIcon("sparkles")}Threads General Post Generator</h2>
                <p class="note">Generate text-only Threads posts. Review dulu, kemudian post satu-satu ke Threads.</p>
              </div>
            </div>
            <div class="client-grid">
              <div>
                <label for="viralPattern">Pattern</label>
                <select id="viralPattern"></select>
              </div>
              <div>
                <label for="viralCategory">Post category</label>
                <select id="viralCategory"></select>
              </div>
              <div>
                <label for="viralTone">Tone</label>
                <select id="viralTone"></select>
              </div>
              <div>
                <label for="viralAudience">Audience</label>
                <select id="viralAudience"></select>
              </div>
              <div class="full">
                <label class="check-row" for="viralHashtags">
                  <input id="viralHashtags" type="checkbox">
                  Include hashtags
                </label>
              </div>
            </div>
            <div class="actions">
              <button id="generateViralOneButton" type="button">Generate 1 Post</button>
              <button id="generateViralTenButton" class="secondary" type="button">Generate 10 Posts</button>
              <button id="generateViralFiftyButton" class="secondary" type="button">Generate 50 Posts</button>
              <button id="autoPostViralTenButton" class="approve" type="button">Auto Post 10 to Threads</button>
              <button id="autoPostViralFiftyButton" class="approve" type="button">Auto Post 50 to Threads</button>
              <button id="exportViralCsvButton" class="secondary" type="button">Export CSV</button>
            </div>
            <div id="viralResult" class="result"></div>
            <div id="viralOutput" class="viral-post-grid"></div>
          </section>

          <section class="saved-viral-panel">
            <div class="section-heading">
              <div>
                <h2>${uiIcon("file-text")}Saved posts</h2>
                <p class="note">Favorites disimpan dalam browser.</p>
              </div>
            </div>
            <div class="viral-toolbar">
              <div>
                <label for="viralSavedSearch">Search saved posts</label>
                <input id="viralSavedSearch" type="search" placeholder="Search text">
              </div>
              <div>
                <label for="viralSavedCategoryFilter">Filter category</label>
                <select id="viralSavedCategoryFilter"></select>
              </div>
              <div>
                <label for="viralSavedToneFilter">Filter tone</label>
                <select id="viralSavedToneFilter"></select>
              </div>
            </div>
            <div class="actions">
              <button id="exportSavedViralButton" class="secondary" type="button">Export Saved CSV</button>
              <button id="clearSavedViralButton" class="secondary" type="button">Clear Saved Posts</button>
            </div>
            <div id="viralSavedOutput" class="viral-post-grid"></div>
          </section>
          <section class="saved-viral-panel">
            <div class="section-heading">
              <div>
                <h2>${uiIcon("refresh")}Post history</h2>
                <p class="note">History server digunakan untuk elak pattern dan ayat berulang pada semua device.</p>
              </div>
              <button id="refreshViralHistoryButton" class="secondary" type="button">Refresh</button>
            </div>
            <div id="viralHistoryOutput" class="viral-post-grid"></div>
          </section>
        </div>
      </section>
    </section>

    <section id="tab-reportpilot" class="tab-panel" data-tab-panel="reportpilot">
      <section class="card">
        <div class="section-heading">
          <div>
            <h1>${uiIcon("chart")}Report Pilot</h1>
            <p class="note">Isi details weekly report, preview PDF, kemudian upload terus ke folder Weekly Report client.</p>
          </div>
        </div>

        <form id="reportForm" class="client-form">
          <section class="form-section">
            <div class="form-section-header">
              <span>01</span>
              <div><h2>Report setup</h2><p>Pilih client, akaun dan tempoh laporan.</p></div>
            </div>
            <div class="client-grid">
            <div>
              <label for="reportClient">Client</label>
              <select id="reportClient" name="clientCode" required></select>
            </div>
            <div>
              <label for="reportPhase">Phase</label>
              <select id="reportPhase" name="phase" required>
                <option value="SETUP PHASE">SETUP PHASE</option>
                <option value="TESTING PHASE">TESTING PHASE</option>
                <option value="OPTIMIZE PHASE">OPTIMIZE PHASE</option>
                <option value="SCALING PHASE">SCALING PHASE</option>
              </select>
            </div>
            <div>
              <label id="reportAdAccountLabel" for="reportAdAccount">Ads account</label>
              <select id="reportAdAccount" name="accountId" required>
                <option value="">Pilih client dahulu</option>
              </select>
              <input id="reportPlatform" name="platform" type="hidden" value="meta">
            </div>
            <div class="date-field">
              <label for="reportStartDate">Minggu bermula</label>
              <input id="reportStartDate" name="startDate" type="date" required>
            </div>
            <div class="date-field">
              <label for="reportEndDate">Minggu berakhir</label>
              <input id="reportEndDate" name="endDate" type="date" required>
              <p class="note">Pilih tepat 7 hari yang sudah lengkap.</p>
            </div>
            <div>
              <label for="reportResultMetric">Primary result</label>
              <select id="reportResultMetric" name="resultMetric">
                <option value="conversions">Conversions / Purchases</option>
                <option value="leads">Lead forms / Leads</option>
                <option value="messaging_conversations">Messaging conversations</option>
              </select>
              <input id="reportResultLabel" name="resultLabel" type="hidden" value="Purchases">
            </div>
            <div class="full">
              <label for="reportTitle">Report title</label>
              <input id="reportTitle" name="reportTitle" type="text" value="META ADS PERFORMANCE BRIEF" required>
            </div>
            </div>
          </section>

          <section class="form-section">
            <div class="form-section-header">
              <span>02</span>
              <div><h2>Performance</h2><p>Semak metrik utama sebelum melengkapkan analisis.</p></div>
            </div>
            <div class="client-grid">
            <div>
              <label for="reportAdSpend">Ad spend</label>
              <input id="reportAdSpend" name="adSpend" type="number" min="0" step="0.01" inputmode="decimal" value="0" required>
            </div>
            <div>
              <label id="reportResultsLabel" for="reportLeadsGenerated">Results</label>
              <input id="reportLeadsGenerated" name="leadsGenerated" type="number" min="0" step="1" inputmode="numeric" value="0" required>
            </div>
            <div>
              <label id="reportCostLabel" for="reportCostPerLead">Cost per result</label>
              <input id="reportCostPerLead" name="costPerLead" type="number" min="0" step="0.01" inputmode="decimal" placeholder="Auto dari spend/results">
              <input id="reportCurrency" name="currency" type="hidden" value="MYR">
            </div>
            <input id="reportRecommendationHeadline" name="recommendationHeadline" type="hidden" value="ANALYSIS PENDING">
            </div>
          </section>

          <section class="form-section">
            <div class="form-section-header">
              <span>03</span>
              <div><h2>Analysis</h2><p>Rumusan creative, performance leak dan tindakan seterusnya.</p></div>
            </div>
            <div class="client-grid">
            <div class="full">
              <label for="reportWhatWeProved">What we proved</label>
              <textarea id="reportWhatWeProved" class="report-tall-textarea" name="whatWeProved" required>Setup technical automation telah disiapkan
Ads campaign telah mula berjalan
Tracking dan automation sudah aktif
Data awal sedang dikumpul
Optimization dibuat selepas data mencukupi</textarea>
            </div>
            <div>
              <label for="reportWinningCreative">Best Prospecting ad</label>
              <input id="reportWinningCreative" name="winningCreative" type="text" value="N/A">
            </div>
            <div>
              <label for="reportBestPerformance">Prospecting performance</label>
              <input id="reportBestPerformance" name="bestPerformance" type="text" placeholder="Contoh: 12 results | RM25 per result">
            </div>
            <div>
              <label for="reportRetargetingWinningCreative">Best Retargeting ad</label>
              <input id="reportRetargetingWinningCreative" name="retargetingWinningCreative" type="text" value="N/A">
            </div>
            <div>
              <label for="reportRetargetingBestPerformance">Retargeting performance</label>
              <input id="reportRetargetingBestPerformance" name="retargetingBestPerformance" type="text" placeholder="Result cost, CPM atau CPC">
            </div>
            <div class="full">
              <label for="reportLeadLeaks">Performance leaks</label>
              <textarea id="reportLeadLeaks" name="leadLeaks">Belum ada result yang mencukupi untuk diagnosis muktamad
Pantau tracking, funnel dan kualiti result</textarea>
            </div>
            <div class="full">
              <label for="reportNext7Days">Next 7 days</label>
              <textarea id="reportNext7Days" class="report-tall-textarea" name="next7Days" required>Monitor campaign performance
Check average cost per result
Find the strongest creative and campaign segment
Review retargeting when the warm audience is ready</textarea>
            </div>
            <div class="full">
              <label for="reportRecommendation">Executive recommendation</label>
              <textarea id="reportRecommendation" name="recommendation" required>Tunggu result untuk minggu ini sebelum optimize iklan. Fokus utama adalah mengumpul data awal sebelum membuat keputusan optimization dan scaling.</textarea>
            </div>
            </div>
          </section>

          <section class="form-section">
            <div class="form-section-header">
              <span>04</span>
              <div><h2>Delivery</h2><p>Sediakan nama penyedia dan fail akhir.</p></div>
            </div>
            <div class="client-grid">
            <div>
              <label for="reportPreparedBy">Prepared by</label>
              <input id="reportPreparedBy" name="preparedBy" type="text" value="Abdussomad Ruddin | Growth Partner" required>
            </div>
            <div>
              <label for="reportFileName">Nama fail PDF</label>
              <input id="reportFileName" name="fileName" type="text" required>
            </div>
            </div>
          </section>
          <div class="client-form-actions">
            <button id="loadAdsReportButton" class="secondary" type="button">Load Meta Data</button>
            <button id="previewReportButton" class="secondary" type="button">Preview PDF</button>
            <button id="uploadReportButton" class="approve" type="submit">Generate & Upload Report</button>
          </div>
          <div id="reportBreakdown" class="report-breakdown"></div>
        </form>
        <div id="reportResult" class="result"></div>
      </section>
    </section>

    <section id="tab-clientpilot" class="tab-panel" data-tab-panel="clientpilot">
      <section class="card">
        <div class="section-heading">
          <div>
            <h1>${uiIcon("users")}Client Pilot</h1>
            <p class="note">Urus agency clients, onboarding, service, billing dan operasi client.</p>
          </div>
        </div>

        <details class="advanced-panel">
          <summary>${uiIcon("message", "tone-amber")}Weekly Report Reminder</summary>
          <div class="ads-cmo-settings-content ads-cmo-push-content">
            <div><strong>Isnin, 10:00 pagi</strong><p id="weeklyReportPushNote" class="note">Reminder admin untuk WhatsApp weekly report minggu sebelumnya.</p></div>
            <button id="weeklyReportPushButton" class="secondary" type="button">Aktifkan Notifikasi</button>
          </div>
        </details>

        <div class="subtabs" aria-label="Client tabs">
          <button class="subtab-button active" type="button" data-subtab-group="client" data-subtab-target="agency-overview-panel">Agency Overview</button>
          <button class="subtab-button" type="button" data-subtab-group="client" data-subtab-target="client-list-panel">Agency Clients</button>
          <button class="subtab-button" type="button" data-subtab-group="client" data-subtab-target="client-add-panel">Add Agency Client</button>
        </div>

        <div id="agency-overview-panel" class="subtab-panel active" data-subtab-panel="client">
          <section class="agency-overview" aria-live="polite">
            <div class="agency-overview-toolbar">
              <div>
                <h2>${uiIcon("layout-dashboard")}Agency Overview</h2>
                <p class="note">Revenue, managed ad budget, services dan task client dalam satu tempat.</p>
              </div>
              <button id="refreshAgencyOperationsButton" class="secondary" type="button">Refresh</button>
            </div>
            <div class="agency-metrics">
              <article><span>Active clients</span><strong id="agencyActiveClients">0</strong></article>
              <article><span>Monthly revenue</span><strong id="agencyMonthlyRevenue">RM 0.00</strong></article>
              <article><span>Managed ad budget</span><strong id="agencyManagedBudget">RM 0.00</strong></article>
              <article><span>Open tasks</span><strong id="agencyOpenTasks">0</strong></article>
            </div>
            <section class="agency-performance-panel">
              <div class="agency-panel-heading">
                <div><h3>${uiIcon("chart", "tone-green")}Agency Performance</h3><p class="note">Profitability dan delivery health berdasarkan service serta task semasa.</p></div>
                <span class="agency-performance-period">Last 30 days</span>
              </div>
              <div class="agency-performance-metrics">
                <article><span>Gross profit</span><strong id="agencyGrossProfit">RM 0.00</strong><small id="agencyInternalCost">Cost RM 0.00</small></article>
                <article><span>Gross margin</span><strong id="agencyGrossMargin">0%</strong><small>Active services</small></article>
                <article><span>Completion rate</span><strong id="agencyCompletionRate">0%</strong><small id="agencyCompletionSample">No recent tasks</small></article>
                <article><span>Overdue</span><strong id="agencyOverdueTasks">0</strong><small>Open tasks</small></article>
              </div>
              <div class="agency-performance-grid">
                <div><h4>Client profitability</h4><div id="agencyClientProfitability" class="agency-performance-list"></div></div>
                <div><h4>Team capacity</h4><div id="agencyTeamCapacity" class="agency-performance-list"></div></div>
              </div>
            </section>
            <div class="agency-workspace-toolbar">
              <label for="agencyWorkspaceClient">Working on client</label>
              <select id="agencyWorkspaceClient"><option value="">Semua agency clients</option></select>
            </div>
            <section class="agency-health-panel">
              <div class="agency-panel-heading">
                <div><h3>${uiIcon("users")}Client Health & Retention</h3><p class="note">Nampak relationship risk, check-in dan renewal sebelum client terlepas.</p></div>
                <span class="agency-performance-period">Live score</span>
              </div>
              <div class="agency-health-metrics">
                <article><span>Healthy</span><strong id="agencyHealthyClients">0</strong></article>
                <article><span>Watch</span><strong id="agencyWatchClients">0</strong></article>
                <article><span>At risk</span><strong id="agencyRiskClients">0</strong></article>
                <article><span>Check-ins due</span><strong id="agencyCheckInsDue">0</strong></article>
              </div>
              <div class="agency-health-grid">
                <div><h4>Retention board</h4><div id="agencyHealthBoard" class="agency-health-board"></div></div>
                <form id="agencyHealthForm" class="agency-inline-form agency-health-form">
                  <h4>Update client health</h4>
                  <div class="agency-form-row">
                    <label>Relationship<select name="relationshipStatus"><option value="strong">Strong</option><option value="stable" selected>Stable</option><option value="watch">Watch</option><option value="risk">Risk</option></select></label>
                    <label>Renewal stage<select name="renewalStage"><option value="none">Not started</option><option value="upcoming">Upcoming</option><option value="proposed">Proposal sent</option><option value="renewed">Renewed</option><option value="churn_risk">Churn risk</option></select></label>
                  </div>
                  <div class="agency-form-row">
                    <label>Last check-in<input name="lastCheckIn" type="date"></label>
                    <label>Next check-in<input name="nextCheckIn" type="date"></label>
                  </div>
                  <label>Retention notes<textarea name="notes" rows="3" placeholder="Feedback, concern atau next action"></textarea></label>
                  <button type="submit">Save Health Check-in</button>
                </form>
              </div>
            </section>
            <section class="agency-growth-panel">
              <div class="agency-panel-heading">
                <div><h3>${uiIcon("chart", "tone-amber")}Renewal & Growth Pipeline</h3><p class="note">Forecast 90 hari untuk lindungi recurring revenue dan susun peluang growth client.</p></div>
                <span class="agency-performance-period">90-day view</span>
              </div>
              <div class="agency-growth-metrics">
                <article><span>Renewal value</span><strong id="agencyRenewalValue">RM 0.00</strong><small id="agencyRenewalCount">0 renewals</small></article>
                <article><span>Open pipeline</span><strong id="agencyPipelineValue">RM 0.00</strong><small id="agencyPipelineCount">0 opportunities</small></article>
                <article><span>Weighted forecast</span><strong id="agencyWeightedForecast">RM 0.00</strong><small>Stage adjusted</small></article>
                <article><span>Revenue at risk</span><strong id="agencyAtRiskRevenue">RM 0.00</strong><small>Risk or churn clients</small></article>
              </div>
              <div class="agency-growth-grid">
                <div>
                  <h4>90-day forecast</h4>
                  <div id="agencyGrowthForecast" class="agency-growth-forecast"></div>
                </div>
                <form id="agencyOpportunityForm" class="agency-inline-form agency-opportunity-form">
                  <input name="id" type="hidden">
                  <h4>Add growth opportunity</h4>
                  <label>Opportunity<input name="title" type="text" placeholder="Contoh: Tambah creative package" required></label>
                  <div class="agency-form-row">
                    <label>Type<select name="opportunityType"><option value="upsell">Upsell</option><option value="cross_sell">Cross-sell</option><option value="renewal">Renewal</option><option value="expansion">Expansion</option></select></label>
                    <label>Stage<select name="stage"><option value="idea">Idea</option><option value="discovery">Discovery</option><option value="proposal">Proposal</option><option value="won">Won</option><option value="lost">Lost</option></select></label>
                  </div>
                  <div class="agency-form-row">
                    <label>Estimated monthly value<input name="estimatedMonthlyValue" type="number" min="0" step="0.01" inputmode="decimal" value="0" required></label>
                    <label>Target date<input name="targetDate" type="date"></label>
                  </div>
                  <label>Owner<input name="owner" type="text" placeholder="PIC"></label>
                  <label>Notes<textarea name="notes" rows="2" placeholder="Next action atau context"></textarea></label>
                  <div class="inline-actions"><button type="submit">Save Opportunity</button><button id="cancelAgencyOpportunityEdit" class="secondary" type="button" hidden>Cancel</button></div>
                </form>
              </div>
              <div id="agencyOpportunityList" class="agency-opportunity-list"></div>
            </section>
            <div id="agencyAttentionList" class="agency-attention-list"></div>
            <section class="agency-delivery-calendar">
              <div class="agency-panel-heading">
                <div><h3>${uiIcon("file-text")}Delivery Calendar</h3><p class="note">Task due dalam 14 hari akan muncul di sini.</p></div>
                <button id="generateAgencyRecurringButton" class="secondary" type="button">Sync Recurring Tasks</button>
              </div>
              <div id="agencyDeliveryCalendar" class="agency-calendar-list"></div>
            </section>
            <div class="agency-workspace-grid">
              <section class="agency-workspace-panel">
                <div class="agency-panel-heading"><div><h3>${uiIcon("landmark", "tone-green")}Services</h3><p class="note">Track fee, owner dan renewal.</p></div></div>
                <form id="agencyServiceForm" class="agency-inline-form">
                  <input name="id" type="hidden">
                  <label>Service name<input name="name" type="text" placeholder="Contoh: Meta Ads Management" required></label>
                  <div class="agency-form-row">
                    <label>Monthly fee<input name="monthlyFee" type="number" min="0" step="0.01" inputmode="decimal" value="0" required></label>
                    <label>Internal monthly cost<input name="internalMonthlyCost" type="number" min="0" step="0.01" inputmode="decimal" placeholder="Isi untuk kira margin"></label>
                  </div>
                  <div class="agency-form-row">
                    <label>Status<select name="status"><option value="active">Active</option><option value="paused">Paused</option><option value="completed">Completed</option></select></label>
                    <label>Owner<input name="owner" type="text" placeholder="PIC"></label>
                  </div>
                  <label>Renewal date<input name="renewalDate" type="date"></label>
                  <div class="inline-actions"><button type="submit">Save Service</button><button id="cancelAgencyServiceEdit" class="secondary" type="button" hidden>Cancel</button></div>
                </form>
                <div id="agencyServiceList" class="agency-operation-list"></div>
              </section>
              <section class="agency-workspace-panel">
                <div class="agency-panel-heading"><div><h3>${uiIcon("file-text")}Task Tracker</h3><p class="note">Tugasan penting dan due date setiap client.</p></div></div>
                <form id="agencyTaskForm" class="agency-inline-form">
                  <input name="id" type="hidden">
                  <label>Task<input name="title" type="text" placeholder="Contoh: Hantar weekly report" required></label>
                  <div class="agency-form-row">
                    <label>Due date<input name="dueDate" type="date"></label>
                    <label>Priority<select name="priority"><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option><option value="low">Low</option></select></label>
                  </div>
                  <div class="agency-form-row">
                    <label>Owner<input name="owner" type="text" placeholder="PIC"></label>
                    <label>Status<select name="status"><option value="todo">To do</option><option value="in_progress">In progress</option><option value="done">Done</option><option value="cancelled">Cancelled</option></select></label>
                  </div>
                  <div class="agency-form-row">
                    <label>Work type<select name="workType"><option value="general">General</option><option value="report">Weekly report</option><option value="invoice">Invoice</option><option value="creative">Creative</option><option value="campaign_review">Campaign review</option></select></label>
                    <label>Estimated minutes<input name="estimatedMinutes" type="number" min="0" max="10080" step="15" inputmode="numeric" value="0"></label>
                  </div>
                  <div class="inline-actions"><button type="submit">Save Task</button><button id="cancelAgencyTaskEdit" class="secondary" type="button" hidden>Cancel</button></div>
                </form>
                <div id="agencyTaskList" class="agency-operation-list"></div>
              </section>
            </div>
            <section class="agency-workspace-panel agency-recurring-panel">
              <div class="agency-panel-heading"><div><h3>${uiIcon("refresh", "tone-amber")}Recurring Deliveries</h3><p class="note">Jadualkan report, invoice, creative atau campaign review secara mingguan dan bulanan.</p></div></div>
              <form id="agencyTemplateForm" class="agency-inline-form agency-template-form">
                <input name="id" type="hidden">
                <label>Delivery name<input name="title" type="text" placeholder="Contoh: Hantar weekly report" required></label>
                <div class="agency-form-row">
                  <label>Work type<select name="workType"><option value="report">Weekly report</option><option value="invoice">Invoice</option><option value="creative">Creative</option><option value="campaign_review">Campaign review</option><option value="general">General</option></select></label>
                  <label>Service<select name="serviceId"><option value="">No linked service</option></select></label>
                </div>
                <div class="agency-form-row">
                  <label>Cadence<select name="cadence"><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></label>
                  <label>Next due date<input name="nextDueDate" type="date" required></label>
                </div>
                <div class="agency-form-row">
                  <label>Weekly day<select name="weekday"><option value="1">Monday</option><option value="2">Tuesday</option><option value="3">Wednesday</option><option value="4">Thursday</option><option value="5">Friday</option><option value="6">Saturday</option><option value="0">Sunday</option></select></label>
                  <label>Monthly day<input name="monthDay" type="number" min="1" max="28" value="1" required></label>
                </div>
                <div class="agency-form-row">
                  <label>Priority<select name="priority"><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option><option value="low">Low</option></select></label>
                  <label>Owner<input name="owner" type="text" placeholder="PIC"></label>
                </div>
                <label>Estimated minutes per delivery<input name="estimatedMinutes" type="number" min="0" max="10080" step="15" inputmode="numeric" value="0"></label>
                <label class="agency-checkbox"><input name="isActive" type="checkbox" checked> Active schedule</label>
                <div class="inline-actions"><button type="submit">Save Recurring Delivery</button><button id="cancelAgencyTemplateEdit" class="secondary" type="button" hidden>Cancel</button></div>
              </form>
              <div id="agencyTemplateList" class="agency-operation-list"></div>
            </section>
            <div id="agencyOperationsResult" class="result"></div>
          </section>
        </div>

        <div id="client-list-panel" class="subtab-panel" data-subtab-panel="client">
          <div class="client-mobile-tools">
            <label class="client-search"><input id="clientSearchInput" type="search" placeholder="Cari pelanggan" aria-label="Cari pelanggan"></label>
            <div class="client-filter-chips" aria-label="Filter pelanggan">
              <button class="active" type="button" data-client-filter="all">Current</button>
              <button type="button" data-client-filter="onboarding">Onboarding</button>
              <button type="button" data-client-filter="active">Active</button>
              <button type="button" data-client-filter="paused">Paused</button>
              <button type="button" data-client-filter="completed">Completed</button>
              <button type="button" data-client-filter="archived">Archived</button>
            </div>
          </div>
          <div class="actions">
            <button id="refreshClientsButton" class="secondary" type="button">Refresh Senarai</button>
          </div>
          <div id="clientList" class="client-list"></div>
          <div id="clientResult" class="result"></div>
        </div>

        <div id="client-add-panel" class="subtab-panel" data-subtab-panel="client">
          <form id="clientForm" class="client-form">
            <h2>${uiIcon("users")}Add Agency Client</h2>
            <input id="clientCode" name="clientCode" type="hidden">
            <ol id="clientOnboardingProgress" class="onboarding-progress" aria-label="Progress onboarding">
              <li class="active" data-onboarding-progress="details"><span>1</span><small>Client</small></li>
              <li data-onboarding-progress="ads"><span>2</span><small>Ads</small></li>
              <li data-onboarding-progress="drive"><span>3</span><small>Drive</small></li>
              <li data-onboarding-progress="telegram"><span>4</span><small>Telegram</small></li>
              <li data-onboarding-progress="review"><span>5</span><small>Review</small></li>
            </ol>
            <section class="onboarding-step active" data-onboarding-step="details">
              <div class="onboarding-step-heading"><span>1</span><div><h3>Client dan billing</h3><p>Simpan maklumat asas dahulu. Progress boleh disambung selepas refresh.</p></div></div>
              <div class="onboarding-template-action">
                <p>Hantar template ini kepada client untuk kumpulkan semua maklumat onboarding.</p>
                <button id="copyClientOnboardingTemplateButton" class="secondary" type="button">Copy Template WhatsApp</button>
              </div>
              <div class="client-grid">
              <div>
                <label for="clientBrand">Brand client</label>
                <input id="clientBrand" name="brandClient" type="text" placeholder="Contoh: SAFRICH" required>
              </div>
              <div>
                <label for="clientContactName">Nama</label>
                <input id="clientContactName" name="contactName" type="text" placeholder="Nama PIC / owner" required>
              </div>
              <div>
                <label for="clientEmail">Emel</label>
                <input id="clientEmail" name="email" type="email" placeholder="client@email.com" required>
              </div>
              <div>
                <label for="clientPhone">No telefon</label>
                <input id="clientPhone" name="phone" type="tel" placeholder="+60..." required>
              </div>
              <div>
                <label for="clientCompanyName">Nama syarikat</label>
                <input id="clientCompanyName" name="companyName" type="text" placeholder="Nama syarikat" required>
              </div>
              <div>
                <label for="clientRegistration">No Pendaftaran/SSM</label>
                <input id="clientRegistration" name="registrationNumber" type="text" placeholder="No SSM">
              </div>
              <div>
                <label for="clientRetainer">Monthly service fee</label>
                <input id="clientRetainer" class="money-input" name="monthlyRetainer" type="number" min="0.01" step="0.01" inputmode="decimal" placeholder="0.00" required>
              </div>
              <div>
                <label for="clientServiceType">Service type</label>
                <input id="clientServiceType" name="serviceType" type="text" placeholder="Contoh: Meta Ads Management" required>
              </div>
              <div>
                <label for="clientAdBudget">Monthly advertising budget</label>
                <input id="clientAdBudget" class="money-input" name="monthlyAdBudget" type="number" min="0" step="0.01" inputmode="decimal" placeholder="0.00" required>
              </div>
              <div>
                <label for="clientStartDate">Start date</label>
                <input id="clientStartDate" name="startDate" type="date" required>
              </div>
              <div>
                <label for="clientAgencyStatus">Status</label>
                <select id="clientAgencyStatus" name="agencyStatus" required>
                  <option value="onboarding">Onboarding</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div class="full">
                <label for="clientAddress">Alamat</label>
                <textarea id="clientAddress" name="billingAddress" placeholder="Alamat billing client"></textarea>
              </div>
              <div class="full">
                <label for="clientNotes">Notes</label>
                <textarea id="clientNotes" name="notes" placeholder="Catatan penting tentang client, service atau billing."></textarea>
              </div>
              </div>
            </section>
            <section class="onboarding-step" data-onboarding-step="ads" hidden>
              <div class="onboarding-step-heading"><span>2</span><div><h3>Akaun Ads</h3><p>Pilih platform dan akaun yang akan digunakan untuk report client.</p></div></div>
              <div class="client-grid">
              <div>
                <label for="clientAdsPlatform">Ads platform</label>
                <select id="clientAdsPlatform" name="platform">
                  <option value="meta">Meta Ads</option>
                  <option value="tiktok">TikTok Ads</option>
                </select>
              </div>
              <div class="full">
                <label id="clientAdsAccountLabel" for="clientAdsAccount">Default Meta Ads account</label>
                <select id="clientAdsAccount" name="accountId">
                  <option value="">Belum dipadankan</option>
                </select>
                <input id="clientAdsAccountName" name="accountName" type="hidden">
                <input id="clientAdsCurrency" name="currency" type="hidden">
              </div>
              <div>
                <label for="clientResultMetric">Default primary result</label>
                <select id="clientResultMetric" name="resultMetric">
                  <option value="conversions">Conversions / Purchases</option>
                  <option value="leads">Lead forms / Leads</option>
                  <option value="messaging_conversations">Messaging conversations</option>
                </select>
              </div>
              <div class="full">
                <label for="clientProspectingKeywords">Prospecting keywords (pisahkan dengan koma)</label>
                <input id="clientProspectingKeywords" name="prospectingKeywords" type="text" value="prospecting, pros, cold, tof">
              </div>
              <div class="full">
                <label for="clientRetargetingKeywords">Retargeting keywords (pisahkan dengan koma)</label>
                <input id="clientRetargetingKeywords" name="retargetingKeywords" type="text" value="retargeting, retarget, rtg, warm, remarketing">
              </div>
              </div>
            </section>
            <section class="onboarding-step" data-onboarding-step="drive" hidden>
              <div class="onboarding-step-heading"><span>3</span><div><h3>Google Drive</h3><p>BuddyPilot akan sediakan folder client, Weekly Report dan Invoice & Receipt.</p></div></div>
              <div id="clientOnboardingDriveState" class="onboarding-state-card">Folder belum disediakan.</div>
            </section>
            <section class="onboarding-step" data-onboarding-step="telegram" hidden>
              <div class="onboarding-step-heading"><span>4</span><div><h3>Telegram Daily Report</h3><p>Optional. Sambungkan penerima sekarang atau buat kemudian.</p></div></div>
              <div class="onboarding-telegram-actions">
                <button class="secondary onboarding-telegram-link" type="button" data-recipient-slot="1">Connect Penerima 1</button>
                <button class="secondary onboarding-telegram-link" type="button" data-recipient-slot="2">Connect Penerima 2</button>
                <button id="refreshOnboardingTelegramButton" class="secondary" type="button">Refresh Status</button>
              </div>
              <div id="clientOnboardingTelegramState" class="onboarding-state-card">Belum disambungkan. Langkah ini boleh dilangkau.</div>
            </section>
            <section class="onboarding-step" data-onboarding-step="review" hidden>
              <div class="onboarding-step-heading"><span>5</span><div><h3>Review dan aktifkan</h3><p>Client hanya masuk invoice, report dan automation selepas checklist wajib siap.</p></div></div>
              <div id="clientOnboardingChecklist" class="onboarding-checklist"></div>
            </section>
            <div class="client-form-actions">
              <button id="clientOnboardingBackButton" class="secondary" type="button" hidden>Back</button>
              <button id="saveClientButton" type="submit">Save & Continue</button>
              <button id="discardClientOnboardingButton" class="danger" type="button" hidden>Discard Setup</button>
              <button id="cancelClientEditButton" class="secondary" type="button" hidden>Cancel Edit</button>
            </div>
          </form>
        </div>

        <div id="client-detail-panel" class="subtab-panel" data-subtab-panel="client">
          <section class="agency-client-detail" aria-live="polite">
            <div id="clientDetailLoading" class="client-list-skeleton" hidden><span></span><span></span><span></span></div>
            <div id="clientDetailContent" hidden>
              <div class="section-heading agency-detail-heading">
                <div>
                  <span id="clientDetailStatus" class="agency-status-pill">Active</span>
                  <h2 id="clientDetailName">Agency Client</h2>
                  <p id="clientDetailService" class="note"></p>
                </div>
                <div class="inline-actions">
                  <button id="editAgencyClientButton" class="secondary" type="button">Edit</button>
                  <button id="archiveAgencyClientButton" class="danger" type="button">Archive</button>
                </div>
              </div>
              <dl id="clientDetailGrid" class="agency-detail-grid"></dl>
              <section class="agency-notes-section">
                <h3>Notes</h3>
                <p id="clientDetailNotes" class="note">Tiada notes.</p>
              </section>
              <button id="backToAgencyClientsButton" class="secondary" type="button">Back to Agency Clients</button>
            </div>
            <div id="clientDetailError" class="result"></div>
          </section>
        </div>
      </section>
    </section>

    <section id="tab-invoicepilot" class="tab-panel" data-tab-panel="invoicepilot">
      <section class="card">
        <div class="section-heading">
          <div>
            <h1>${uiIcon("receipt", "tone-amber")}Invoice Pilot</h1>
            <p class="note">Generate invoice PDF dan receipt PDF di sini.</p>
          </div>
        </div>
        <details class="advanced-panel ads-cmo-settings-panel">
          <summary>${uiIcon("receipt", "tone-amber")}Jadual invoice bulanan</summary>
          <div class="ads-cmo-settings-content">
            <p class="note"><strong>1 haribulan, 6:00 pagi (Malaysia)</strong> &middot; Invoice client aktif dijana dan diupload ke Google Drive. Invoice bulan tersebut yang sudah diupload dikekalkan.</p>
            <p id="monthlyInvoicePushNote" class="note">Reminder admin pada 1 haribulan, 10:00 pagi untuk WhatsApp invoice secara manual. Tiada WhatsApp dihantar automatik.</p>
            <button id="monthlyInvoicePushButton" class="secondary" type="button">Aktifkan Notifikasi</button>
          </div>
        </details>
        <div class="subtabs" aria-label="Invoice Pilot tabs">
          <button class="subtab-button active" type="button" data-subtab-group="invoice-pilot" data-subtab-target="invoice-panel">Invoice</button>
          <button class="subtab-button" type="button" data-subtab-group="invoice-pilot" data-subtab-target="receipt-panel">Receipt</button>
        </div>

        <div id="settings-panel" class="subtab-panel" data-subtab-panel="invoice-pilot">
        <section id="metaAdsSettings" class="menu-tiktok-card" aria-labelledby="menuMetaTitle">
          <div class="menu-tiktok-heading">
            <svg class="icon" aria-hidden="true"><use href="/icons.svg#link"></use></svg>
            <div>
              <strong id="menuMetaTitle">Meta Ads</strong>
              <span id="metaConnectionText">Semak sambungan...</span>
            </div>
          </div>
          <div id="metaAuthorizationWarning" class="menu-tiktok-warning" hidden></div>
          <div class="menu-tiktok-actions">
            <a id="connectMetaButton" href="/api/meta/oauth-start">Connect Meta Ads</a>
            <button id="disconnectMetaButton" type="button" hidden>Disconnect</button>
          </div>
          <div class="push-notification-note">Sumber rasmi Meta MCP. Data Ads CMO, report dan Telegram menggunakan sambungan ini.</div>
        </section>
        <section id="tiktokAdsSettings" class="menu-tiktok-card" aria-labelledby="menuTikTokTitle">
          <div class="menu-tiktok-heading">
            <svg class="icon" aria-hidden="true"><use href="/icons.svg#link"></use></svg>
            <div>
              <strong id="menuTikTokTitle">TikTok Ads</strong>
              <span id="tiktokConnectionText">Semak sambungan...</span>
            </div>
          </div>
          <div id="tiktokAuthorizationWarning" class="menu-tiktok-warning" hidden></div>
          <div class="menu-tiktok-actions">
            <a id="connectTikTokButton" href="/api/tiktok/oauth-start">Connect TikTok Ads</a>
            <button id="enablePushNotificationsButton" class="push-notification-button" type="button">Aktifkan Notifikasi</button>
            <button id="disconnectTikTokButton" type="button" hidden>Disconnect</button>
          </div>
          <div id="pushNotificationNote" class="push-notification-note">Notifikasi menyokong browser, Android dan iOS Home Screen.</div>
        </section>
        <form id="settingsForm" class="client-form">
          <h2>${uiIcon("settings")}Settings Syarikat</h2>
          <div class="client-grid">
            <div>
              <label for="businessName">Nama Syarikat</label>
              <input id="businessName" name="name" type="text" placeholder="Nama syarikat">
            </div>
            <div>
              <label for="businessRegistration">No Pendaftaran/SSM</label>
              <input id="businessRegistration" name="registrationNumber" type="text" placeholder="No SSM">
            </div>
            <div>
              <label for="businessEmail">Alamat Email</label>
              <input id="businessEmail" name="email" type="email" placeholder="billing@email.com">
            </div>
            <div>
              <label for="businessPhone">No Telefon</label>
              <input id="businessPhone" name="phone" type="tel" placeholder="+60...">
            </div>
            <div class="full">
              <label for="businessAddress">Alamat</label>
              <textarea id="businessAddress" name="address" placeholder="Alamat syarikat"></textarea>
            </div>
            <div class="full">
              <label for="businessLogoImage">Logo syarikat untuk PDF</label>
              <input id="businessLogoImage" name="logoImage" type="file" accept="image/jpeg,image/png,image/webp">
              <div id="businessLogoPreview" class="asset-preview" hidden></div>
            </div>
          </div>
          <div class="client-form-actions">
            <button id="saveSettingsButton" type="submit">Save Settings</button>
            <button id="removeBusinessLogoButton" class="secondary" type="button" hidden>Remove Logo</button>
          </div>
        </form>
        <div id="settingsResult" class="result"></div>
        </div>

        <div id="bank-panel" class="subtab-panel" data-subtab-panel="invoice-pilot">
          <div class="section-heading">
            <div>
              <h2>${uiIcon("landmark", "tone-green")}Akaun Bank</h2>
              <p class="note">Akaun default akan masuk dalam PDF invoice.</p>
            </div>
            <button id="refreshBankButton" class="secondary" type="button">Refresh Bank</button>
          </div>
          <div id="bankList" class="bank-list"></div>
          <form id="bankForm" class="client-form">
            <h2>${uiIcon("landmark")}Tambah Akaun Bank</h2>
            <input id="bankId" name="id" type="hidden">
            <div class="client-grid">
              <div>
                <label for="bankLabel">Nama paparan</label>
                <input id="bankLabel" name="label" type="text" placeholder="Contoh: Akaun utama invoice" required>
              </div>
              <div>
                <label for="bankName">Nama bank</label>
                <input id="bankName" name="bankName" type="text" placeholder="Contoh: CIMB Bank" required>
              </div>
              <div>
                <label for="bankAccountName">Nama pemilik akaun</label>
                <input id="bankAccountName" name="accountName" type="text" placeholder="Contoh: LUR BAY MARKETING" required>
              </div>
              <div>
                <label for="bankAccountNumber">No akaun</label>
                <input id="bankAccountNumber" name="accountNumber" type="text" placeholder="Contoh: 8603134244" required>
              </div>
              <div class="full">
                <label for="bankQrImage">Gambar QR DuitNow/Bank</label>
                <input id="bankQrImage" name="qrImage" type="file" accept="image/jpeg,image/png,image/webp">
                <div id="bankQrPreview" class="asset-preview" hidden></div>
              </div>
              <label class="check-row full">
                <input id="bankDefault" name="isDefault" type="checkbox" value="true">
                Jadikan akaun default untuk invoice PDF
              </label>
            </div>
            <div class="client-form-actions">
              <button id="saveBankButton" type="submit">Save Akaun Bank</button>
              <button id="removeBankQrButton" class="secondary" type="button" hidden>Remove QR</button>
              <button id="cancelBankEditButton" class="secondary" type="button" hidden>Cancel Edit</button>
            </div>
          </form>
          <div id="bankResult" class="result"></div>
        </div>

        <div id="invoice-panel" class="subtab-panel active" data-subtab-panel="invoice-pilot">
          <p>Generate invoice PDF semua client ads untuk bulan terpilih, review dahulu, kemudian upload terus ke Google Drive folder client.</p>

          <div class="toolbar">
            <div>
              <label for="invoicePeriod">Bulan invoice</label>
              <input id="invoicePeriod" type="month">
            </div>
            <button id="generateInvoicesButton" type="button">Generate Invoices</button>
            <button id="uploadInvoicesButton" class="approve" type="button" disabled>Upload Selected Invoices</button>
          </div>

          <div id="invoiceList" class="invoice-list"></div>
          <div id="invoiceResult" class="result"></div>
        </div>

        <div id="receipt-panel" class="subtab-panel" data-subtab-panel="invoice-pilot">
          <p>Pilih invoice yang telah dibayar, review resit PDF dahulu, kemudian upload resit ke folder Google Drive yang sama.</p>

          <div class="toolbar">
            <div>
              <label for="receiptPeriod">Bulan receipt</label>
              <input id="receiptPeriod" type="month">
            </div>
            <button id="generateReceiptsButton" type="button">Generate Receipts</button>
            <button id="uploadReceiptsButton" class="approve" type="button" disabled>Upload Selected Receipts</button>
          </div>

          <div id="receiptList" class="invoice-list"></div>
          <div id="receiptResult" class="result"></div>
        </div>
      </section>
    </section>
  </main>

  <button id="menuBackdrop" class="menu-backdrop" type="button" aria-label="Tutup menu" hidden></button>
  <div id="appToast" class="app-toast" role="status" aria-live="polite" hidden></div>

${browser()}
</body>
</html>`;
};
