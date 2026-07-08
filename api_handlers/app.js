const { requireAuth } = require("../lib/auth");

function pageHtml() {
  return `<!doctype html>
<html lang="ms">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>PostPilot</title>
  <link rel="icon" href="/favicon.ico" sizes="any">
  <link rel="icon" href="/logo.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
  <link rel="manifest" href="/site.webmanifest">
  <meta name="theme-color" content="#0f172a">
  <style>
    :root {
      color-scheme: light;
      font-family: Arial, sans-serif;
      background: #f4f5f7;
      color: #111827;
    }

    body { margin: 0; }

    main {
      width: min(1080px, calc(100% - 32px));
      margin: 40px auto;
    }

    .topbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      margin-bottom: 16px;
    }

    .brand {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      font-weight: 800;
    }

    .brand img {
      width: 34px;
      height: 34px;
      border-radius: 10px;
    }

    .card {
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 18px;
      box-shadow: 0 14px 35px rgba(15, 23, 42, 0.08);
      padding: 26px;
    }

    .tabs,
    .subtabs {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 16px 0;
    }

    .tab-button,
    .subtab-button {
      margin-top: 0;
      border: 1px solid #d1d5db;
      background: #fff;
      color: #111827;
      border-radius: 999px;
      padding: 10px 16px;
      font-weight: 800;
    }

    .tab-button.active,
    .subtab-button.active {
      background: #111827;
      border-color: #111827;
      color: #fff;
    }

    .tab-panel,
    .subtab-panel {
      display: none;
    }

    .tab-panel.active,
    .subtab-panel.active {
      display: block;
    }

    .section-heading {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      margin-bottom: 12px;
    }

    .section-heading h1,
    .section-heading h2 {
      margin: 0;
    }

    .mini-grid,
    .quick-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
      margin-top: 16px;
    }

    .quick-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
      margin: 18px 0 22px;
    }

    .mini-card {
      border: 1px solid #e5e7eb;
      border-radius: 14px;
      padding: 14px;
      background: #f8fafc;
    }

    .mini-card strong {
      display: block;
      margin-top: 4px;
      font-size: 22px;
    }

    .quick-card {
      width: 100%;
      min-height: 76px;
      margin-top: 0;
      border-radius: 14px;
      background: #f0fdf4;
      color: #14532d;
      border: 1px solid #bbf7d0;
      font-size: 16px;
    }

    .client-list {
      margin-top: 18px;
      border: 1px solid #dbe3ef;
      border-radius: 14px;
      overflow: hidden;
    }

    .client-row {
      display: grid;
      grid-template-columns: minmax(150px, 1.05fr) minmax(180px, 1.15fr) minmax(220px, 1.3fr) minmax(120px, 0.72fr) minmax(300px, 1.45fr);
      gap: 16px;
      padding: 14px 16px;
      border-top: 1px solid #e5e7eb;
      align-items: start;
    }

    .client-row > div {
      min-width: 0;
      overflow-wrap: anywhere;
    }

    .client-row > div:nth-child(4) {
      overflow-wrap: normal;
      white-space: nowrap;
    }

    .client-row:first-child {
      border-top: 0;
    }

    .client-row.header {
      background: #f8fafc;
      color: #475569;
      font-weight: 800;
      font-size: 13px;
      align-items: center;
    }

    .client-row.header > div {
      overflow-wrap: normal;
      white-space: nowrap;
    }

    .client-row.header > div:last-child {
      text-align: right;
    }

    .bank-list,
    .activity-feed {
      margin-top: 18px;
      border: 1px solid #dbe3ef;
      border-radius: 14px;
      overflow: hidden;
      background: #fff;
    }

    .bank-row {
      display: grid;
      grid-template-columns: minmax(160px, 1.1fr) minmax(150px, 1fr) minmax(130px, 0.9fr) minmax(150px, auto);
      gap: 12px;
      padding: 14px;
      border-top: 1px solid #e5e7eb;
      align-items: center;
    }

    .bank-row:first-child,
    .activity-item:first-child {
      border-top: 0;
    }

    .bank-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: flex-end;
    }

    .bank-actions button {
      margin-top: 0;
      padding: 9px 12px;
      width: auto;
    }

    .default-pill {
      display: inline-flex;
      align-items: center;
      width: fit-content;
      margin-top: 6px;
      border-radius: 999px;
      padding: 4px 9px;
      background: #dcfce7;
      color: #166534;
      font-size: 12px;
      font-weight: 800;
    }

    .asset-preview {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-top: 10px;
      padding: 12px;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      background: #f8fafc;
    }

    .asset-preview[hidden] {
      display: none;
    }

    .asset-preview img {
      width: 92px;
      height: 92px;
      object-fit: contain;
      border-radius: 10px;
      background: #fff;
      border: 1px solid #e5e7eb;
    }

    .qr-pill {
      display: inline-flex;
      width: fit-content;
      margin-top: 6px;
      border-radius: 999px;
      padding: 4px 9px;
      background: #eef2ff;
      color: #3730a3;
      font-size: 12px;
      font-weight: 800;
    }

    .activity-item {
      padding: 14px;
      border-top: 1px solid #e5e7eb;
    }

    .activity-item strong {
      display: block;
      color: #111827;
    }

    .activity-time {
      display: block;
      color: #64748b;
      font-size: 13px;
      margin-top: 4px;
    }

    .empty-state {
      padding: 16px;
      color: #64748b;
      background: #f8fafc;
    }

    .client-actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }

    .client-actions button {
      margin-top: 0;
      padding: 9px 12px;
      width: auto;
      flex: 0 0 auto;
      white-space: nowrap;
    }

    .client-form-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 20px;
    }

    .client-form-actions button {
      margin-top: 0;
      width: auto;
    }

    .hero {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .hero img {
      width: 64px;
      height: 64px;
      border-radius: 18px;
      box-shadow: 0 12px 30px rgba(15, 23, 42, 0.16);
    }

    h1 {
      margin: 0 0 8px;
      font-size: clamp(28px, 5vw, 42px);
      letter-spacing: -0.04em;
    }

    p {
      line-height: 1.55;
      color: #4b5563;
    }

    label {
      display: block;
      margin: 18px 0 8px;
      font-weight: 700;
    }

    input,
    textarea {
      width: 100%;
      box-sizing: border-box;
      border: 1px solid #cbd5e1;
      border-radius: 12px;
      padding: 13px 14px;
      font: inherit;
      background: #fff;
    }

    input[type="checkbox"] {
      width: 22px;
      height: 22px;
      margin: 0;
    }

    .check-row {
      display: flex;
      align-items: center;
      gap: 10px;
      min-height: 48px;
      margin: 0;
      font-weight: 800;
    }

    textarea {
      min-height: 110px;
      resize: vertical;
    }

    button {
      margin-top: 20px;
      border: 0;
      border-radius: 999px;
      padding: 14px 22px;
      background: #111827;
      color: #fff;
      font-weight: 800;
      cursor: pointer;
      transition: transform 120ms ease, box-shadow 160ms ease, background-color 160ms ease, color 160ms ease, opacity 160ms ease;
      transform-origin: center;
      -webkit-tap-highlight-color: transparent;
    }

    button:not(:disabled):active {
      transform: scale(0.97);
    }

    button.button-success {
      animation: buttonSuccessPulse 700ms ease;
      background: #16a34a !important;
      color: #ffffff !important;
      box-shadow: 0 0 0 6px rgba(22, 163, 74, 0.14);
    }

    @keyframes buttonSuccessPulse {
      0% { transform: scale(0.97); }
      45% { transform: scale(1.04); }
      100% { transform: scale(1); }
    }

    button.secondary {
      margin-top: 0;
      background: #e5e7eb;
      color: #111827;
    }

    button.approve {
      background: #15803d;
    }

    button.regenerate {
      background: #2563eb;
    }

    button:disabled {
      opacity: 0.65;
      cursor: wait;
    }

    .note { font-size: 14px; }

    .result {
      margin-top: 18px;
      border-radius: 14px;
      padding: 14px;
      white-space: pre-wrap;
      display: none;
    }

    .result.ok {
      display: block;
      background: #ecfdf5;
      border: 1px solid #86efac;
      color: #14532d;
    }

    .result.err {
      display: block;
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #7f1d1d;
    }

    .preview {
      display: none;
      margin-top: 22px;
      border-top: 1px solid #e5e7eb;
      padding-top: 22px;
    }

    .preview.show {
      display: block;
    }

    .preview-box {
      background: #f8fafc;
      border: 1px solid #dbe3ef;
      border-radius: 14px;
      padding: 14px;
      white-space: pre-wrap;
      line-height: 1.5;
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 16px;
    }

    .actions button {
      margin-top: 0;
    }

    .tool-card {
      margin-top: 22px;
    }

    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      border: 0;
      background: transparent;
      color: inherit;
      width: 100%;
      padding: 0;
      margin: 0;
      cursor: pointer;
      text-align: left;
    }

    .panel-toggle {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 38px;
      height: 38px;
      margin-top: 0;
      border-radius: 999px;
      background: #e5e7eb;
      color: #111827;
      font-size: 20px;
      line-height: 1;
      flex: 0 0 auto;
    }

    .panel-body {
      margin-top: 16px;
    }

    .card.collapsed .panel-body {
      display: none;
    }

    .client-form {
      margin-top: 18px;
      border-top: 1px solid #e5e7eb;
      padding-top: 18px;
    }

    .client-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }

    .client-grid label,
    .client-form label {
      margin-top: 0;
    }

    .client-grid .full {
      grid-column: 1 / -1;
    }

    .client-form textarea {
      min-height: 86px;
    }

    .toolbar {
      display: flex;
      flex-wrap: wrap;
      align-items: end;
      gap: 12px;
      margin-top: 18px;
    }

    .toolbar label {
      margin: 0 0 8px;
    }

    .toolbar input {
      min-width: 180px;
    }

    .toolbar input.money-input {
      min-width: 140px;
    }

    .invoice-list {
      margin-top: 18px;
      display: none;
      border: 1px solid #dbe3ef;
      border-radius: 14px;
      overflow: hidden;
      background: #fff;
    }

    .invoice-list.show {
      display: block;
    }

    .invoice-row {
      display: grid;
      grid-template-columns: minmax(145px, 1.2fr) minmax(128px, 1fr) minmax(105px, 0.75fr) minmax(95px, 0.65fr) minmax(100px, 0.75fr) minmax(110px, auto);
      gap: 12px;
      align-items: center;
      padding: 12px 14px;
      border-top: 1px solid #e5e7eb;
    }

    .invoice-row:first-child {
      border-top: 0;
    }

    .invoice-row.header {
      background: #f8fafc;
      color: #475569;
      font-weight: 800;
      font-size: 13px;
    }

    .receipt-list .invoice-row {
      grid-template-columns: minmax(110px, 0.7fr) minmax(145px, 1.2fr) minmax(150px, 1fr) minmax(110px, 0.8fr) minmax(130px, auto);
    }

    .invoice-client {
      font-weight: 800;
      color: #111827;
    }

    .invoice-muted {
      display: block;
      color: #64748b;
      font-size: 13px;
      margin-top: 3px;
    }

    .link-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 38px;
      margin-top: 0;
      border: 0;
      border-radius: 999px;
      background: #e5e7eb;
      color: #111827;
      text-decoration: none;
      font-weight: 800;
      font: inherit;
      padding: 0 14px;
      white-space: nowrap;
      cursor: pointer;
    }

    .money-input {
      width: 100%;
      min-width: 0;
      border-radius: 10px;
      padding: 9px 10px;
      text-align: right;
    }

    .total-payment {
      font-weight: 800;
      color: #111827;
      text-align: right;
    }

    @media (max-width: 720px) {
      .mini-grid,
      .quick-grid,
      .client-grid {
        grid-template-columns: 1fr;
      }

      .client-row,
      .bank-row,
      .invoice-row {
        grid-template-columns: 1fr;
      }

      .client-row {
        gap: 10px;
        padding: 16px;
      }

      .client-row:not(.header) > div::before {
        content: attr(data-label);
        display: block;
        margin-bottom: 4px;
        color: #64748b;
        font-size: 12px;
        font-weight: 800;
        text-transform: uppercase;
      }

      .client-actions {
        justify-content: flex-start;
      }

      .client-actions::before {
        flex: 0 0 100%;
      }

      .client-actions button {
        flex: 1 1 130px;
      }

      .client-row.header,
      .invoice-row.header {
        display: none;
      }

      main {
        width: min(100% - 20px, 1080px);
        margin: 14px auto 28px;
      }

      .card {
        border-radius: 14px;
        padding: 16px;
      }

      .tabs,
      .subtabs {
        display: grid;
        grid-template-columns: 1fr;
      }

      .tab-button,
      .subtab-button,
      button {
        width: 100%;
        min-height: 48px;
      }

      .section-heading {
        align-items: stretch;
        flex-direction: column;
      }

      .toolbar {
        display: grid;
        grid-template-columns: 1fr;
      }

      .toolbar input {
        min-width: 0;
      }
    }
  </style>
</head>
<body>
  <main>
    <div class="topbar">
      <div class="brand">
        <img src="/logo.svg" alt="" width="34" height="34">
        <span>PostPilot</span>
      </div>
      <form method="post" action="/api/logout">
        <button class="secondary" type="submit">Logout</button>
      </form>
    </div>

    <nav class="tabs" aria-label="Main tabs">
      <button class="tab-button active" type="button" data-tab-target="dashboard">Dashboard</button>
      <button class="tab-button" type="button" data-tab-target="postpilot">Post Pilot</button>
      <button class="tab-button" type="button" data-tab-target="invoicepilot">Invoice Pilot</button>
    </nav>

    <section id="tab-dashboard" class="tab-panel active" data-tab-panel="dashboard">
      <section class="card">
        <div class="section-heading">
          <div>
            <h1>Dashboard</h1>
            <p class="note">Semua status penting dalam satu tempat.</p>
          </div>
          <button id="refreshActivityButton" class="secondary" type="button">Refresh</button>
        </div>
        <div class="mini-grid">
          <div class="mini-card">Pelanggan<strong id="dashboardClientCount">-</strong></div>
          <div class="mini-card">Invoice bulan ini<strong id="dashboardInvoiceCount">-</strong></div>
          <div class="mini-card">Database<strong id="dashboardRegistryStatus">-</strong></div>
          <div class="mini-card">Akaun Bank<strong id="dashboardBankStatus">-</strong></div>
        </div>
        <div class="quick-grid">
          <button class="quick-card" type="button" data-go-tab="postpilot">Buat Post</button>
          <button class="quick-card" type="button" data-go-tab="invoicepilot" data-go-subtab="document-panel">Generate Invoice</button>
          <button class="quick-card" type="button" data-go-tab="invoicepilot" data-go-subtab="bank-panel">Akaun Bank</button>
        </div>
        <h2>Live Feed</h2>
        <div id="activityFeed" class="activity-feed">
          <div class="empty-state">Belum ada aktiviti. Bila anda save client, settings, bank atau upload invoice, aktiviti akan muncul di sini.</div>
        </div>
        <div id="activityResult" class="result"></div>
      </section>
    </section>

    <section id="tab-postpilot" class="tab-panel" data-tab-panel="postpilot">
      <section class="card app-panel" data-panel="postpilot">
        <div class="hero">
          <img src="/logo.svg" alt="" width="64" height="64">
          <div>
            <h1>Post Pilot</h1>
            <p>Upload creative, review ayat, kemudian post ke Facebook Page.</p>
          </div>
        </div>

        <form id="postForm">
          <label for="creative">Creative gambar/video</label>
          <input id="creative" name="creative" type="file" accept="image/*,video/mp4,video/quicktime,video/webm" required>

          <label for="salespage_link">Salespage link</label>
          <input id="salespage_link" name="salespage_link" type="url" value="https://digitaldominate.com/" required>

          <label for="caption_note">Konteks poster/video / angle creative (optional)</label>
          <textarea id="caption_note" name="caption_note" placeholder="Contoh: Poster tunjuk founder penat packing order, angle: banyak kerja tapi salespage bantu automate workflow."></textarea>

          <label for="custom_caption">Custom caption penuh (optional)</label>
          <textarea id="custom_caption" name="custom_caption" placeholder="Kalau isi bahagian ini, sistem guna caption ini terus. Pastikan letak salespage link."></textarea>

          <label for="first_comment">First comment CTA (optional)</label>
          <textarea id="first_comment" name="first_comment" placeholder="Kosongkan untuk auto-generate first comment."></textarea>

          <button type="submit">Preview Copywriting</button>
        </form>

        <section id="previewPanel" class="preview">
          <h2>Preview Sebelum Posting</h2>
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
      </section>
    </section>

    <section id="tab-invoicepilot" class="tab-panel" data-tab-panel="invoicepilot">
      <section class="card">
        <div class="section-heading">
          <div>
            <h1>Invoice Pilot</h1>
            <p class="note">Urus pelanggan, settings, bank, dan invoice PDF di sini.</p>
          </div>
        </div>
        <div class="subtabs" aria-label="Invoice Pilot tabs">
          <button class="subtab-button active" type="button" data-subtab-group="invoice-pilot" data-subtab-target="client-panel">Client</button>
          <button class="subtab-button" type="button" data-subtab-group="invoice-pilot" data-subtab-target="settings-panel">Settings</button>
          <button class="subtab-button" type="button" data-subtab-group="invoice-pilot" data-subtab-target="bank-panel">Akaun Bank</button>
          <button class="subtab-button" type="button" data-subtab-group="invoice-pilot" data-subtab-target="document-panel">Document</button>
        </div>

        <div id="client-panel" class="subtab-panel active" data-subtab-panel="invoice-pilot">
        <div class="subtabs" aria-label="Client tabs">
          <button class="subtab-button active" type="button" data-subtab-group="client" data-subtab-target="client-list-panel">Senarai Pelanggan</button>
          <button class="subtab-button" type="button" data-subtab-group="client" data-subtab-target="client-add-panel">Tambah Pelanggan</button>
        </div>

        <div id="client-list-panel" class="subtab-panel active" data-subtab-panel="client">
          <div class="actions">
            <button id="refreshClientsButton" class="secondary" type="button">Refresh Senarai</button>
          </div>
          <div id="clientList" class="client-list"></div>
          <div id="clientResult" class="result"></div>
        </div>

        <div id="client-add-panel" class="subtab-panel" data-subtab-panel="client">
          <form id="clientForm" class="client-form">
            <h2>Tambah Pelanggan</h2>
            <input id="clientCode" name="clientCode" type="hidden">
            <div class="client-grid">
              <div>
                <label for="clientBrand">Brand client</label>
                <input id="clientBrand" name="brandClient" type="text" placeholder="Contoh: SAFRICH" required>
              </div>
              <div>
                <label for="clientContactName">Nama</label>
                <input id="clientContactName" name="contactName" type="text" placeholder="Nama PIC / owner">
              </div>
              <div>
                <label for="clientEmail">Emel</label>
                <input id="clientEmail" name="email" type="email" placeholder="client@email.com">
              </div>
              <div>
                <label for="clientPhone">No telefon</label>
                <input id="clientPhone" name="phone" type="tel" placeholder="+60...">
              </div>
              <div>
                <label for="clientCompanyName">Nama syarikat</label>
                <input id="clientCompanyName" name="companyName" type="text" placeholder="Nama syarikat">
              </div>
              <div>
                <label for="clientRegistration">No Pendaftaran/SSM</label>
                <input id="clientRegistration" name="registrationNumber" type="text" placeholder="No SSM">
              </div>
              <div>
                <label for="clientRetainer">Harga service default</label>
                <input id="clientRetainer" class="money-input" name="monthlyRetainer" type="number" min="0" step="0.01" inputmode="decimal" placeholder="0.00">
              </div>
              <div class="full">
                <label for="clientAddress">Alamat</label>
                <textarea id="clientAddress" name="billingAddress" placeholder="Alamat billing client"></textarea>
              </div>
            </div>
            <div class="client-form-actions">
              <button id="saveClientButton" type="submit">Save Client & Create Drive Folders</button>
              <button id="cancelClientEditButton" class="secondary" type="button" hidden>Cancel Edit</button>
            </div>
          </form>
        </div>
        </div>

        <div id="settings-panel" class="subtab-panel" data-subtab-panel="invoice-pilot">
        <form id="settingsForm" class="client-form">
          <h2>Settings Syarikat</h2>
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
              <h2>Akaun Bank</h2>
              <p class="note">Akaun default akan masuk dalam PDF invoice.</p>
            </div>
            <button id="refreshBankButton" class="secondary" type="button">Refresh Bank</button>
          </div>
          <div id="bankList" class="bank-list"></div>
          <form id="bankForm" class="client-form">
            <h2>Tambah Akaun Bank</h2>
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

        <div id="document-panel" class="subtab-panel" data-subtab-panel="invoice-pilot">
        <div class="subtabs" aria-label="Document tabs">
          <button class="subtab-button active" type="button" data-subtab-group="document" data-subtab-target="invoice-panel">Invoice</button>
          <button class="subtab-button" type="button" data-subtab-group="document" data-subtab-target="receipt-panel">Receipt</button>
        </div>

        <div id="invoice-panel" class="subtab-panel active" data-subtab-panel="document">
          <p>Generate invoice PDF semua client ads untuk bulan terpilih, review dahulu, kemudian upload terus ke Google Drive folder client.</p>

          <div class="toolbar">
            <div>
              <label for="invoicePeriod">Bulan invoice</label>
              <input id="invoicePeriod" type="month">
            </div>
            <div>
              <label for="defaultServicePrice">Default Harga Service</label>
              <input id="defaultServicePrice" class="money-input" type="number" min="0" step="0.01" inputmode="decimal" placeholder="0.00">
            </div>
            <div>
              <label for="defaultDiscount">Default Diskaun</label>
              <input id="defaultDiscount" class="money-input" type="number" min="0" step="0.01" inputmode="decimal" placeholder="0.00">
            </div>
            <button id="applyInvoiceDefaultsButton" class="secondary" type="button" disabled>Apply to All</button>
            <button id="generateInvoicesButton" type="button">Generate Invoices</button>
            <button id="uploadInvoicesButton" class="approve" type="button" disabled>Upload All to Google Drive</button>
          </div>

          <div id="invoiceList" class="invoice-list"></div>
          <div id="invoiceResult" class="result"></div>
        </div>

        <div id="receipt-panel" class="subtab-panel" data-subtab-panel="document">
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
        </div>
      </section>
    </section>
  </main>

  <script>
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
    const invoicePeriod = document.getElementById("invoicePeriod");
    const defaultServicePrice = document.getElementById("defaultServicePrice");
    const defaultDiscount = document.getElementById("defaultDiscount");
    const applyInvoiceDefaultsButton = document.getElementById("applyInvoiceDefaultsButton");
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
    const clientList = document.getElementById("clientList");
    const clientResult = document.getElementById("clientResult");
    const refreshClientsButton = document.getElementById("refreshClientsButton");
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
    const MAX_DIRECT_UPLOAD_BYTES = 4 * 1024 * 1024;
    const TARGET_UPLOAD_BYTES = Math.floor(3.75 * 1024 * 1024);
    let currentPreview = null;
    let seenVariations = [];
    let preparedCreativeFile = null;
    let preparedCreativeNotice = "";
    let currentInvoices = [];
    let currentReceipts = [];
    let currentClients = [];
    let currentBankAccounts = [];
    let currentBankStatus = null;

    creativeInput.addEventListener("change", () => {
      currentPreview = null;
      seenVariations = [];
      preparedCreativeFile = null;
      preparedCreativeNotice = "";
      previewPanel.className = "preview";
      result.className = "result";
      result.textContent = "";
    });

    function showError(error) {
      result.className = "result err";
      result.textContent = error.message || String(error);
    }

    function showInvoiceError(error) {
      invoiceResult.className = "result err";
      invoiceResult.textContent = error.message || String(error);
    }

    function showReceiptError(error) {
      receiptResult.className = "result err";
      receiptResult.textContent = error.message || String(error);
    }

    function defaultInvoicePeriod() {
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

    function setMessage(node, type, message) {
      node.className = type ? \`result \${type}\` : "result";
      node.textContent = message || "";
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
      setMessage(activityResult, "err", error.message || String(error));
    }

    function activateTab(name) {
      document.querySelectorAll(".tab-button").forEach((button) => {
        button.classList.toggle("active", button.dataset.tabTarget === name);
      });
      document.querySelectorAll(".tab-panel").forEach((panel) => {
        panel.classList.toggle("active", panel.dataset.tabPanel === name);
      });
      localStorage.setItem("active-main-tab", name);
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

    function setupTabs() {
      const savedMainTab = localStorage.getItem("active-main-tab") || "dashboard";
      const mainTab = document.querySelector(\`.tab-button[data-tab-target="\${savedMainTab}"]\`) ? savedMainTab : "dashboard";
      activateTab(mainTab);
      document.querySelectorAll(".tab-button").forEach((button) => {
        button.addEventListener("click", () => activateTab(button.dataset.tabTarget));
      });

      ["invoice-pilot", "client", "document"].forEach((group) => {
        const first = document.querySelector(\`.subtab-button[data-subtab-group="\${group}"]\`);
        const saved = localStorage.getItem(\`active-subtab-\${group}\`) || first?.dataset.subtabTarget;
        if (saved) activateSubtab(group, saved);
      });
      document.querySelectorAll(".subtab-button").forEach((button) => {
        button.addEventListener("click", () => activateSubtab(button.dataset.subtabGroup, button.dataset.subtabTarget));
      });
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

    function showPreview(json) {
      currentPreview = json.preview;
      seenVariations = [Number(currentPreview.variation || 0)];
      captionPreview.value = currentPreview.caption || "";
      commentPreview.value = currentPreview.comment_cta || "";
      previewMeta.textContent = [
        \`Salespage context: \${currentPreview.salespage_context?.product_name || "-"}\`,
        \`Concept: \${Number(currentPreview.variation || 0) + 1}/3000\`,
        \`Style: \${currentPreview.style || "-"}\`
      ].join(" | ");
      previewPanel.className = "preview show";
      result.className = "result ok";
      result.textContent = "Preview siap. Semak caption dan komen CTA. Klik Approve untuk post, atau Jana Semula untuk variasi baru.";
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      result.className = "result";
      result.textContent = "";
      previewPanel.className = "preview";
      button.disabled = true;
      button.textContent = "Generating preview...";

      try {
        const file = creativeInput.files[0];
        let uploadFile = file;
        if (file && file.size > MAX_DIRECT_UPLOAD_BYTES) {
          button.textContent = "Compressing creative...";
          try {
            uploadFile = await prepareCreativeFile(file);
          } catch (compressionError) {
            preparedCreativeFile = null;
            preparedCreativeNotice = compressionError.message || String(compressionError);
          }
        } else {
          preparedCreativeFile = file || null;
          preparedCreativeNotice = "";
        }

        let response;
        if (uploadFile && uploadFile.size > MAX_DIRECT_UPLOAD_BYTES) {
          response = await fetch("/api/preview-metadata", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              filename: uploadFile.name,
              content_type: uploadFile.type,
              salespage_link: document.getElementById("salespage_link").value,
              caption_note: document.getElementById("caption_note").value,
              custom_caption: document.getElementById("custom_caption").value,
              first_comment: document.getElementById("first_comment").value
            })
          });
        } else {
          const previewForm = new FormData(form);
          if (uploadFile) previewForm.set("creative", uploadFile);
          response = await fetch("/api/preview", {
            method: "POST",
            body: previewForm
          });
        }
        const json = await readApiJson(response);
        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }
        if (!response.ok || !json.ok) {
          throw new Error(json.error || "Post failed.");
        }

        showPreview(json);
        if (preparedCreativeNotice && preparedCreativeFile) {
          result.className = "result ok";
          result.textContent = \`Preview siap. \${preparedCreativeNotice}\\n\\nSemak caption dan komen CTA. Klik Approve untuk post.\`;
        } else if (uploadFile && uploadFile.size > MAX_DIRECT_UPLOAD_BYTES) {
          result.className = "result err";
          result.textContent = \`Preview siap, tapi file terlalu besar untuk direct approve/post dari Vercel.\\n\\n\${uploadLimitMessage(uploadFile)}\`;
        }
      } catch (error) {
        showError(error);
      } finally {
        button.disabled = false;
        button.textContent = "Preview Copywriting";
      }
    });

    regenerateButton.addEventListener("click", async () => {
      if (!currentPreview) return;
      result.className = "result";
      result.textContent = "";
      regenerateButton.disabled = true;
      regenerateButton.textContent = "Generating...";

      try {
        const response = await fetch("/api/regenerate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            salespage_link: currentPreview.salespage_link,
            creative_angle: currentPreview.creative_angle,
            media_type: currentPreview.media_type,
            salespage_context: currentPreview.salespage_context?.raw,
            variation: currentPreview.variation,
            seen_variations: seenVariations
          })
        });
        const json = await readApiJson(response);
        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }
        if (!response.ok || !json.ok) throw new Error(json.error || "Regenerate failed.");

        currentPreview = {
          ...currentPreview,
          caption: json.preview.caption,
          comment_cta: json.preview.comment_cta,
          salespage_context: json.preview.salespage_context,
          variation: json.preview.variation,
          style: json.preview.style
        };
        seenVariations.push(Number(currentPreview.variation || 0));
        captionPreview.value = currentPreview.caption || "";
        commentPreview.value = currentPreview.comment_cta || "";
        previewMeta.textContent = [
          \`Salespage context: \${currentPreview.salespage_context?.product_name || "-"}\`,
          \`Concept: \${Number(currentPreview.variation || 0) + 1}/3000\`,
          \`Style: \${currentPreview.style || "-"}\`
        ].join(" | ");
        result.className = "result ok";
        result.textContent = "Copywriting baru sudah dijana. Semak semula sebelum approve.";
      } catch (error) {
        showError(error);
      } finally {
        regenerateButton.disabled = false;
        regenerateButton.textContent = "Jana Semula Copywriting";
      }
    });

    approveButton.addEventListener("click", async () => {
      if (!currentPreview) return;
      const file = creativeInput.files[0];
      if (!file) {
        showError(new Error("Creative file tiada. Sila pilih semula file dan preview semula."));
        return;
      }
      const uploadFile = preparedCreativeFile || file;
      if (uploadFile.size > MAX_DIRECT_UPLOAD_BYTES) {
        showError(new Error(uploadLimitMessage(uploadFile)));
        return;
      }

      const payload = new FormData();
      payload.append("creative", uploadFile);
      payload.append("caption", captionPreview.value);
      payload.append("first_comment", commentPreview.value);

      result.className = "result";
      result.textContent = "";
      approveButton.disabled = true;
      regenerateButton.disabled = true;
      approveButton.textContent = "Posting...";

      try {
        const response = await fetch("/api/post", {
          method: "POST",
          body: payload
        });
        const json = await readApiJson(response);
        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }
        if (!response.ok || !json.ok) throw new Error(json.error || "Post failed.");

        result.className = "result ok";
        result.textContent = [
          "Posted ke Facebook.",
          \`Post ID: \${json.post_id || "-"}\`,
          \`Media ID: \${json.media_id || "-"}\`,
          \`Post Link: \${json.permalink_url || "-"}\`,
          json.media_permalink_url ? \`Media/Reel Link: \${json.media_permalink_url}\` : "",
          \`Comment ID: \${json.comment_id || "-"}\`,
          json.processing_note ? \`Nota: \${json.processing_note}\` : ""
        ].filter(Boolean).join("\\n");
        form.reset();
        document.getElementById("salespage_link").value = "https://digitaldominate.com/";
        previewPanel.className = "preview";
        currentPreview = null;
        seenVariations = [];
        preparedCreativeFile = null;
        preparedCreativeNotice = "";
        await loadActivity();
      } catch (error) {
        showError(error);
      } finally {
        approveButton.disabled = false;
        regenerateButton.disabled = false;
        approveButton.textContent = "Approve & Post ke Facebook";
      }
    });

    function numericValue(value) {
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

    function renderClientList(clients, registryStatus) {
      currentClients = clients || [];
      dashboardClientCount.textContent = String(clients.length);
      dashboardRegistryStatus.textContent = registryStatus?.ok
        ? (registryStatus.source === "supabase" ? "DB OK" : "Drive OK")
        : "Setup";

      if (!clients.length) {
        currentClients = [];
        clientList.innerHTML = "";
        setMessage(clientResult, "err", "Belum ada pelanggan.");
        return;
      }

      const rows = clients.map((client) => \`
        <div class="client-row" data-client-code="\${escapeHtml(client.code)}">
          <div data-label="Brand">
            <span class="invoice-client">\${escapeHtml(client.brandClient || client.name)}</span>
            <span class="invoice-muted">\${escapeHtml(client.code)}</span>
            \${client.serviceStatus === "paused" ? '<span class="qr-pill">Stopped</span>' : '<span class="default-pill">Active</span>'}
          </div>
          <div data-label="Nama / Syarikat">
            \${escapeHtml(client.contactName || "-")}
            <span class="invoice-muted">\${escapeHtml(client.companyName || client.billingName || "-")}</span>
          </div>
          <div data-label="Contact">
            \${escapeHtml(client.email || "-")}
            <span class="invoice-muted">\${escapeHtml(client.phone || "-")}</span>
          </div>
          <div data-label="Harga">
            \${escapeHtml(formatMoneyValue(client.monthlyRetainer || 0))}
            <span class="invoice-muted">\${escapeHtml(client.source || "config")}</span>
          </div>
          <div class="client-actions" data-label="Action">
            <button class="secondary copy-drive-link-button" type="button" data-client-code="\${escapeHtml(client.code)}">Copy Drive Link</button>
            <button class="secondary edit-client-button" type="button" data-client-code="\${escapeHtml(client.code)}">Edit</button>
            <button class="secondary service-client-button" type="button" data-client-code="\${escapeHtml(client.code)}" data-next-status="\${client.serviceStatus === "paused" ? "active" : "paused"}">\${client.serviceStatus === "paused" ? "Recover" : "Stop Service"}</button>
          </div>
        </div>
      \`).join("");

      clientList.innerHTML = \`
        <div class="client-row header">
          <div>Brand</div>
          <div>Nama / Syarikat</div>
          <div>Contact</div>
          <div>Harga</div>
          <div>Action</div>
        </div>
        \${rows}
      \`;
      const statusLine = registryStatus?.ok
        ? (registryStatus.source === "supabase"
          ? \`Senarai pelanggan dimuat dari Supabase. Rekod DB: \${registryStatus.count || 0}.\`
          : \`Senarai pelanggan dimuat. Registry Drive: \${registryStatus.loaded ? "loaded" : "belum ada file"}.\`)
        : \`Senarai config dimuat. \${registryStatus?.error || "Database belum tersedia."}\`;
      setMessage(clientResult, registryStatus?.ok ? "ok" : "err", statusLine);
    }

    function resetClientFormMode() {
      clientForm.dataset.mode = "create";
      clientForm.reset();
      clientForm.elements.clientCode.value = "";
      clientForm.querySelector("h2").textContent = "Tambah Pelanggan";
      saveClientButton.textContent = "Save Client & Create Drive Folders";
      cancelClientEditButton.hidden = true;
    }

    function editClient(clientCode) {
      const client = currentClients.find((item) => item.code === clientCode);
      if (!client) {
        showClientError(new Error("Client tidak dijumpai dalam senarai semasa."));
        return;
      }

      clientForm.dataset.mode = "edit";
      clientForm.elements.clientCode.value = client.code || "";
      clientForm.elements.brandClient.value = client.brandClient || client.name || "";
      clientForm.elements.contactName.value = client.contactName || "";
      clientForm.elements.email.value = client.email || "";
      clientForm.elements.phone.value = client.phone || "";
      clientForm.elements.companyName.value = client.companyName || client.billingName || "";
      clientForm.elements.registrationNumber.value = client.registrationNumber || "";
      clientForm.elements.monthlyRetainer.value = Number(client.monthlyRetainer || 0) ? client.monthlyRetainer : "";
      clientForm.elements.billingAddress.value = client.billingAddress || "";
      clientForm.querySelector("h2").textContent = \`Edit Pelanggan: \${client.brandClient || client.name || client.code}\`;
      saveClientButton.textContent = "Update Client";
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
        setMessage(clientResult, "ok", copied
          ? \`Link WhatsApp copied untuk \${label}. Folder sudah set Anyone with link = Editor.\`
          : \`Template WhatsApp siap untuk \${label}. Folder sudah set Anyone with link = Editor.\`);
        await loadActivity();
      } catch (error) {
        finishButton();
        showClientError(error);
      }
    }

    async function loadClients() {
      setMessage(clientResult, "", "");
      refreshClientsButton.disabled = true;
      refreshClientsButton.textContent = "Loading...";

      try {
        const response = await fetch("/api/clients");
        const json = await readApiJson(response);
        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }
        if (!response.ok || !json.ok) throw new Error(json.error || "Load client failed.");
        renderClientList(json.clients || [], json.registryStatus || {});
      } catch (error) {
        dashboardClientCount.textContent = "-";
        dashboardRegistryStatus.textContent = "Error";
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
      setMessage(activityResult, "", "");
      refreshActivityButton.disabled = true;
      refreshActivityButton.textContent = "Loading...";

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
        refreshActivityButton.disabled = false;
        refreshActivityButton.textContent = "Refresh";
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
      dashboardBankStatus.textContent = defaultAccount ? "OK" : "Setup";

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
        dashboardBankStatus.textContent = "Error";
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

    function invoiceTotal(servicePrice, discount) {
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
        discount: numericValue(row.querySelector(".discount-input")?.value)
      }));
    }

    function collectReceiptDrafts() {
      return [...receiptList.querySelectorAll(".invoice-row[data-client-code]")].map((row) => ({
        clientCode: row.dataset.clientCode,
        servicePrice: numericValue(row.dataset.servicePrice),
        discount: numericValue(row.dataset.discount),
        paid: Boolean(row.querySelector(".receipt-paid-input")?.checked)
      }));
    }

    function renderReceiptList(receipts) {
      currentReceipts = receipts;
      if (!receipts.length) {
        receiptList.className = "invoice-list";
        receiptList.innerHTML = "";
        uploadReceiptsButton.disabled = true;
        receiptResult.className = "result err";
        receiptResult.textContent = "Belum ada client. Tambah pelanggan dahulu di tab Client.";
        return;
      }

      const rows = receipts.map((receipt) => {
        const folderNote = receipt.hasDriveFolder ? "" : "<span class=\\"invoice-muted\\">Folder Drive belum diset</span>";
        const servicePrice = Number(receipt.servicePrice || receipt.amount || 0).toFixed(2);
        const discount = Number(receipt.discount || 0).toFixed(2);
        const total = invoiceTotal(servicePrice, discount);
        return \`
          <div class="invoice-row" data-client-code="\${escapeHtml(receipt.clientCode)}" data-service-price="\${escapeHtml(servicePrice)}" data-discount="\${escapeHtml(discount)}">
            <div>
              <label class="check-row">
                <input class="receipt-paid-input" type="checkbox">
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
            </div>
            <div class="total-payment" data-total="\${escapeHtml(String(total))}">\${escapeHtml(formatMoneyValue(total))}</div>
            <div>
              <button class="link-button review-receipt-button" type="button" data-client-code="\${escapeHtml(receipt.clientCode)}">Review Resit</button>
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
        : "Tick invoice yang sudah dibayar, review resit, kemudian upload selected receipts.";
    }

    function renderInvoiceList(invoices) {
      currentInvoices = invoices;
      dashboardInvoiceCount.textContent = String(invoices.length);
      if (!invoices.length) {
        invoiceList.className = "invoice-list";
        invoiceList.innerHTML = "";
        uploadInvoicesButton.disabled = true;
        applyInvoiceDefaultsButton.disabled = true;
        invoiceResult.className = "result err";
        invoiceResult.textContent = "Belum ada client. Tambah pelanggan dahulu di tab Client.";
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
      uploadInvoicesButton.disabled = invoices.some((invoice) => !invoice.hasDriveFolder) || bankMissing;
      applyInvoiceDefaultsButton.disabled = false;
      invoiceResult.className = "result ok";
      invoiceResult.textContent = bankMissing
        ? "Invoice draft siap. Tambah atau set default akaun bank dahulu sebelum review/upload PDF."
        : uploadInvoicesButton.disabled
        ? "Invoice siap untuk review, tapi ada client yang belum ada Drive folder ID."
        : "Invoice siap untuk review. Edit harga/diskaun jika perlu, buka PDF dahulu, kemudian klik Upload All bila sudah puas hati.";
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
      setMessage(clientResult, "", "");
      saveClientButton.disabled = true;
      saveClientButton.textContent = "Saving...";

      try {
        const isEditMode = clientForm.dataset.mode === "edit";
        const payload = Object.fromEntries(new FormData(clientForm).entries());
        const response = await fetch("/api/clients", {
          method: isEditMode ? "PUT" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload)
        });
        const json = await readApiJson(response);
        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }
        if (!response.ok || !json.ok) throw new Error(json.error || "Save client failed.");

        const savedMessage = isEditMode
          ? [
            \`Client updated: \${json.client?.brandClient || "-"}\`,
            "Detail pelanggan sudah disimpan dalam database."
          ].join("\\n")
          : [
            \`Client saved: \${json.client?.brandClient || "-"}\`,
            \`Folder: \${json.client?.driveFolderName || "-"}\`,
            "Subfolder siap: Weekly Report, Invoice & Receipt"
          ].join("\\n");
        resetClientFormMode();
        await loadClients();
        await loadActivity();
        if (currentInvoices.length) await generateInvoices();
        setMessage(clientResult, "ok", \`\${savedMessage}\\nSenarai pelanggan sudah dikemas kini.\`);
        activateSubtab("client", "client-list-panel");
      } catch (error) {
        showClientError(error);
      } finally {
        saveClientButton.disabled = false;
        saveClientButton.textContent = clientForm.dataset.mode === "edit" ? "Update Client" : "Save Client & Create Drive Folders";
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
      uploadInvoicesButton.disabled = true;
      generateInvoicesButton.disabled = true;
      uploadInvoicesButton.textContent = "Uploading...";

      try {
        const response = await fetch("/api/invoices/upload", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            period: invoicePeriod.value,
            drafts: collectInvoiceDrafts()
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
        await loadActivity();
      } catch (error) {
        showInvoiceError(error);
      } finally {
        uploadInvoicesButton.disabled = false;
        generateInvoicesButton.disabled = false;
        uploadInvoicesButton.textContent = "Upload All to Google Drive";
      }
    }

    async function uploadReceipts() {
      receiptResult.className = "result";
      receiptResult.textContent = "";
      const drafts = collectReceiptDrafts();
      if (!drafts.some((draft) => draft.paid)) {
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
        await loadActivity();
      } catch (error) {
        showReceiptError(error);
      } finally {
        uploadReceiptsButton.disabled = false;
        generateReceiptsButton.disabled = false;
        uploadReceiptsButton.textContent = "Upload Selected Receipts";
      }
    }

    invoicePeriod.value = defaultInvoicePeriod();
    receiptPeriod.value = invoicePeriod.value;
    setupTabs();
    setupPanels();
    resetClientFormMode();
    resetBankFormMode();
    document.querySelectorAll("[data-go-tab]").forEach((button) => {
      button.addEventListener("click", () => {
        activateTab(button.dataset.goTab);
        if (button.dataset.goSubtab) activateSubtab("invoice-pilot", button.dataset.goSubtab);
      });
    });
    clientForm.addEventListener("submit", saveClient);
    cancelClientEditButton.addEventListener("click", () => {
      resetClientFormMode();
      setMessage(clientResult, "", "");
      activateSubtab("client", "client-list-panel");
    });
    clientList.addEventListener("click", (event) => {
      const copyDriveButton = event.target.closest(".copy-drive-link-button");
      if (copyDriveButton) {
        copyClientDriveLink(copyDriveButton.dataset.clientCode, copyDriveButton);
        return;
      }
      const editButton = event.target.closest(".edit-client-button");
      if (editButton) {
        markButtonSuccess(editButton, "Open");
        editClient(editButton.dataset.clientCode);
        return;
      }
      const deleteButton = event.target.closest(".delete-client-button");
      if (deleteButton) setClientService(deleteButton.dataset.clientCode, "paused", deleteButton);
      const serviceButton = event.target.closest(".service-client-button");
      if (serviceButton) setClientService(serviceButton.dataset.clientCode, serviceButton.dataset.nextStatus, serviceButton);
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
    refreshActivityButton.addEventListener("click", loadActivity);
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
    applyInvoiceDefaultsButton.addEventListener("click", () => {
      invoiceList.querySelectorAll(".invoice-row[data-client-code]").forEach((row) => {
        const serviceInput = row.querySelector(".service-price-input");
        const discountInput = row.querySelector(".discount-input");
        if (defaultServicePrice.value !== "" && serviceInput) serviceInput.value = defaultServicePrice.value;
        if (defaultDiscount.value !== "" && discountInput) discountInput.value = defaultDiscount.value;
        updateInvoiceRowTotal(row);
      });
    });
    invoiceList.addEventListener("input", (event) => {
      if (!event.target.matches(".service-price-input, .discount-input")) return;
      const row = event.target.closest(".invoice-row[data-client-code]");
      if (row) updateInvoiceRowTotal(row);
    });
    invoiceList.addEventListener("click", (event) => {
      const button = event.target.closest(".review-pdf-button");
      if (!button) return;
      reviewInvoicePdf(button.dataset.clientCode).catch(showInvoiceError);
    });
    uploadInvoicesButton.addEventListener("click", uploadInvoices);
    receiptList.addEventListener("change", (event) => {
      if (!event.target.matches(".receipt-paid-input")) return;
      const bankMissing = currentBankStatus && currentBankStatus.source === "supabase" && !currentBankStatus.loaded;
      uploadReceiptsButton.disabled = bankMissing || !collectReceiptDrafts().some((draft) => draft.paid);
    });
    receiptList.addEventListener("click", (event) => {
      const button = event.target.closest(".review-receipt-button");
      if (!button) return;
      reviewReceiptPdf(button.dataset.clientCode).catch(showReceiptError);
    });
    uploadReceiptsButton.addEventListener("click", uploadReceipts);
    loadClients();
    loadSettings();
    loadBankAccounts();
    loadActivity();
  </script>
</body>
</html>`;
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.end("Method not allowed.");
    return;
  }

  try {
    requireAuth(req);
    res.setHeader("content-type", "text/html; charset=utf-8");
    res.statusCode = 200;
    res.end(pageHtml());
  } catch (error) {
    if (error.statusCode === 500) {
      res.statusCode = 302;
      res.setHeader("location", "/login?setup=1");
      res.end("Redirecting to setup notice.");
      return;
    }

    res.statusCode = 302;
    res.setHeader("location", "/login");
    res.end("Redirecting to login.");
  }
};
