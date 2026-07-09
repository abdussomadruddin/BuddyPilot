const { requireAuth } = require("../lib/auth");
const threadsViralTemplates = require("../lib/threads-viral-templates");

function pageHtml() {
  const threadsViralTemplatesJson = JSON.stringify(threadsViralTemplates).replace(/</g, "\\u003c");
  return `<!doctype html>
<html lang="ms">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>BuddyPilot</title>
  <link rel="icon" href="/favicon.ico" sizes="any">
  <link rel="icon" href="/logo.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
  <link rel="manifest" href="/site.webmanifest">
  <meta name="theme-color" content="#ff2442">
  <style>
    :root {
      color-scheme: light;
      font-family: Arial, Helvetica, sans-serif;
      background: #fff7df;
      color: #14213d;
      --ink: #14213d;
      --muted: #667085;
      --line: #dbeafe;
      --panel: #ffffff;
      --cream: #fff7df;
      --red: #ff2442;
      --red-dark: #d91632;
      --blue: #1d9bf0;
      --blue-soft: #e8f5ff;
      --yellow: #ffd23f;
      --yellow-soft: #fff3bf;
      --green: #20c997;
      --green-soft: #dffcf3;
      --purple: #845ef7;
      --purple-soft: #f0eaff;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      background:
        linear-gradient(90deg, rgba(255, 210, 63, 0.18) 0 12px, transparent 12px 40px),
        #fff7df;
      color: var(--ink);
    }

    main {
      width: min(1220px, calc(100% - 28px));
      margin: 24px auto 42px;
    }

    .topbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      margin-bottom: 18px;
      padding: 12px;
      border: 3px solid #ffffff;
      border-radius: 28px;
      background: rgba(255, 255, 255, 0.82);
      box-shadow: 0 12px 0 rgba(29, 155, 240, 0.14);
    }

    .brand {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      font-weight: 800;
      color: var(--ink);
      font-size: 18px;
    }

    .brand img {
      width: 44px;
      height: 44px;
      border-radius: 16px;
      border: 3px solid #ffffff;
      box-shadow: 0 5px 0 rgba(20, 33, 61, 0.12);
    }

    .topbar-menu {
      position: relative;
      margin-left: auto;
    }

    .topbar-menu summary {
      list-style: none;
      margin-top: 0;
      border-radius: 999px;
      padding: 14px 22px;
      background: var(--blue-soft);
      color: var(--ink);
      font-weight: 800;
      cursor: pointer;
      box-shadow: 0 7px 0 rgba(29, 155, 240, 0.14);
      user-select: none;
    }

    .topbar-menu summary::-webkit-details-marker {
      display: none;
    }

    .topbar-menu summary::after {
      content: "⌄";
      display: inline-block;
      margin-left: 8px;
      font-size: 14px;
      line-height: 1;
    }

    .topbar-menu[open] summary::after {
      transform: rotate(180deg);
    }

    .topbar-menu-list {
      position: absolute;
      top: calc(100% + 10px);
      right: 0;
      z-index: 20;
      min-width: 190px;
      padding: 8px;
      border: 3px solid #ffffff;
      border-radius: 20px;
      background: #ffffff;
      box-shadow: 0 16px 32px rgba(20, 33, 61, 0.16);
    }

    .topbar-menu-list form {
      margin: 0;
    }

    .topbar-menu-list button {
      width: 100%;
      margin-top: 0;
      background: transparent;
      color: var(--ink);
      box-shadow: none;
      text-align: left;
      padding: 12px 14px;
    }

    .topbar-menu-list button:hover,
    .topbar-menu-list button:focus-visible {
      background: var(--blue-soft);
      outline: 0;
    }

    .topbar-menu-list button.logout-option {
      color: var(--red-dark);
    }

    .card {
      background: var(--panel);
      border: 3px solid #ffffff;
      border-radius: 26px;
      box-shadow: 0 16px 0 rgba(20, 33, 61, 0.08), 0 22px 45px rgba(20, 33, 61, 0.08);
      padding: 24px;
    }

    .tabs,
    .subtabs {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin: 18px 0;
    }

    .tab-button,
    .subtab-button {
      margin-top: 0;
      border: 3px solid #ffffff;
      background: #fff;
      color: var(--ink);
      border-radius: 999px;
      padding: 12px 18px;
      font-weight: 800;
      box-shadow: 0 7px 0 rgba(20, 33, 61, 0.10);
    }

    .tab-button.active,
    .subtab-button.active {
      background: var(--red);
      border-color: #ffffff;
      color: #fff;
      box-shadow: 0 7px 0 rgba(217, 22, 50, 0.28);
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

    .quick-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
      margin-top: 16px;
    }

    .quick-grid {
      grid-template-columns: minmax(0, 1fr);
      margin: 18px 0 22px;
    }

    .quick-card {
      width: 100%;
      min-height: 84px;
      margin-top: 0;
      border-radius: 22px;
      background: var(--yellow);
      color: var(--ink);
      border: 3px solid #ffffff;
      font-size: 16px;
      box-shadow: 0 9px 0 rgba(245, 158, 11, 0.24);
    }

    .client-list {
      margin-top: 18px;
      border: 3px solid #ffffff;
      border-radius: 24px;
      overflow: hidden;
      background: #ffffff;
      box-shadow: 0 12px 0 rgba(29, 155, 240, 0.12);
    }

    .client-row {
      display: grid;
      grid-template-columns: minmax(150px, 1.05fr) minmax(180px, 1.1fr) minmax(220px, 1.3fr) minmax(120px, 0.72fr) minmax(190px, 0.72fr);
      gap: 16px;
      padding: 14px 16px;
      border-top: 2px solid #e8f0ff;
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
      background: var(--yellow-soft);
      color: var(--ink);
      font-weight: 800;
      font-size: 14px;
      align-items: center;
    }

    .client-row.header > div {
      overflow-wrap: normal;
      white-space: nowrap;
    }

    .client-row.header > div:last-child {
      text-align: center;
    }

    .bank-list,
    .activity-feed {
      margin-top: 18px;
      border: 3px solid #ffffff;
      border-radius: 24px;
      overflow: hidden;
      background: #fff;
      box-shadow: 0 12px 0 rgba(132, 94, 247, 0.12);
    }

    .bank-row {
      display: grid;
      grid-template-columns: minmax(160px, 1.1fr) minmax(150px, 1fr) minmax(130px, 0.9fr) minmax(150px, auto);
      gap: 12px;
      padding: 14px;
      border-top: 2px solid #e8f0ff;
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
      padding: 5px 12px;
      background: var(--green-soft);
      color: #087f5b;
      font-size: 12px;
      font-weight: 800;
    }

    .asset-preview {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-top: 10px;
      padding: 12px;
      border: 3px solid #ffffff;
      border-radius: 18px;
      background: var(--blue-soft);
    }

    .asset-preview[hidden] {
      display: none;
    }

    .asset-preview img {
      width: 92px;
      height: 92px;
      object-fit: contain;
      border-radius: 16px;
      background: #fff;
      border: 2px solid #dbeafe;
    }

    .qr-pill {
      display: inline-flex;
      width: fit-content;
      margin-top: 6px;
      border-radius: 999px;
      padding: 5px 12px;
      background: var(--purple-soft);
      color: #5f3dc4;
      font-size: 12px;
      font-weight: 800;
    }

    .activity-item {
      padding: 14px;
      border-top: 2px solid #e8f0ff;
    }

    .activity-item strong {
      display: block;
      color: var(--ink);
    }

    .activity-time {
      display: block;
      color: var(--muted);
      font-size: 13px;
      margin-top: 4px;
    }

    .empty-state {
      padding: 16px;
      color: var(--muted);
      background: var(--blue-soft);
    }

    .client-actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }

    .client-actions button,
    .action-menu summary {
      margin-top: 0;
      padding: 9px 12px;
      width: auto;
      flex: 0 0 auto;
      white-space: nowrap;
    }

    .action-menu {
      width: 190px;
      margin: 0 auto;
    }

    .action-menu summary {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      border-radius: 999px;
      background: var(--blue-soft);
      color: var(--ink);
      font-weight: 800;
      cursor: pointer;
      user-select: none;
      transition: transform 120ms ease, background-color 160ms ease, color 160ms ease;
    }

    .action-menu summary::-webkit-details-marker {
      display: none;
    }

    .action-menu summary::after {
      content: "⌄";
      font-size: 13px;
      line-height: 1;
    }

    .action-menu[open] summary {
      background: var(--blue);
      color: #ffffff;
    }

    .action-menu[open] summary::after {
      transform: rotate(180deg);
    }

    .action-menu-list {
      display: grid;
      gap: 7px;
      padding-top: 8px;
    }

    .action-menu-list button {
      width: 100%;
      border-radius: 12px;
      padding: 10px 12px;
      text-align: left;
    }

    button.danger,
    .action-menu-list button.danger {
      background: #ffe3e8;
      color: #b00020;
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
      border-radius: 20px;
      border: 3px solid #ffffff;
      box-shadow: 0 9px 0 rgba(255, 36, 66, 0.18);
    }

    h1 {
      margin: 0 0 8px;
      font-size: clamp(28px, 5vw, 42px);
      letter-spacing: -0.04em;
    }

    p {
      line-height: 1.55;
      color: var(--muted);
    }

    label {
      display: block;
      margin: 18px 0 8px;
      font-weight: 700;
    }

    input,
    select,
    textarea {
      width: 100%;
      box-sizing: border-box;
      border: 3px solid #e4edff;
      border-radius: 18px;
      padding: 14px 16px;
      font: inherit;
      background: #fff;
      color: var(--ink);
      outline: none;
    }

    input:focus,
    select:focus,
    textarea:focus {
      border-color: var(--blue);
      box-shadow: 0 0 0 5px rgba(29, 155, 240, 0.14);
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
      background: var(--red);
      color: #fff;
      font-weight: 800;
      cursor: pointer;
      box-shadow: 0 8px 0 rgba(217, 22, 50, 0.28);
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
      background: var(--blue-soft);
      color: var(--ink);
      box-shadow: 0 7px 0 rgba(29, 155, 240, 0.14);
    }

    button.approve {
      background: var(--green);
      box-shadow: 0 8px 0 rgba(8, 127, 91, 0.22);
    }

    button.regenerate {
      background: var(--blue);
      box-shadow: 0 8px 0 rgba(29, 155, 240, 0.24);
    }

    button:disabled {
      opacity: 0.65;
      cursor: wait;
    }

    .note { font-size: 14px; }

    .hook-image-preview {
      margin-top: 10px;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .hook-image-preview img {
      width: 86px;
      height: 86px;
      object-fit: cover;
      border-radius: 14px;
      border: 3px solid #e4edff;
      background: #ffffff;
    }

    .result {
      margin-top: 18px;
      border-radius: 20px;
      padding: 14px;
      white-space: pre-wrap;
      display: none;
    }

    .result.ok {
      display: block;
      background: #ecfdf5;
      border: 3px solid #b2f2bb;
      color: #14532d;
    }

    .result.err {
      display: block;
      background: #fef2f2;
      border: 3px solid #ffc9c9;
      color: #7f1d1d;
    }

    .preview {
      display: none;
      margin-top: 22px;
      border-top: 3px solid #e4edff;
      padding-top: 22px;
    }

    .preview.show {
      display: block;
    }

    .preview-box {
      background: var(--blue-soft);
      border: 3px solid #ffffff;
      border-radius: 22px;
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

    .viral-post-grid {
      display: grid;
      gap: 14px;
      margin-top: 18px;
    }

    .viral-post-card {
      border: 3px solid #e4edff;
      border-radius: 20px;
      padding: 16px;
      background: #ffffff;
    }

    .viral-post-card.favorite {
      border-color: #ffd23f;
      background: #fffdf2;
    }

    .viral-post-text {
      white-space: pre-wrap;
      line-height: 1.55;
      margin: 0 0 12px;
      color: var(--ink);
      font-weight: 700;
    }

    .viral-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 12px;
      color: var(--muted);
      font-size: 13px;
      font-weight: 700;
    }

    .viral-meta span {
      border-radius: 999px;
      padding: 6px 10px;
      background: var(--blue-soft);
    }

    .viral-toolbar {
      display: flex;
      flex-wrap: wrap;
      align-items: end;
      gap: 12px;
      margin-top: 18px;
    }

    .viral-toolbar > div {
      flex: 1 1 170px;
    }

    .saved-viral-panel {
      margin-top: 28px;
      border-top: 3px solid #e4edff;
      padding-top: 22px;
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
      background: var(--yellow);
      color: var(--ink);
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
      border-top: 3px solid #e4edff;
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

    .report-tall-textarea {
      min-height: 170px !important;
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
      border: 3px solid #ffffff;
      border-radius: 24px;
      overflow: hidden;
      background: #fff;
      box-shadow: 0 12px 0 rgba(32, 201, 151, 0.12);
    }

    .invoice-list.show {
      display: block;
    }

    .invoice-row {
      display: grid;
      grid-template-columns: minmax(92px, 0.62fr) minmax(145px, 1.15fr) minmax(128px, 1fr) minmax(105px, 0.75fr) minmax(95px, 0.65fr) minmax(100px, 0.75fr) minmax(110px, auto);
      gap: 12px;
      align-items: center;
      padding: 12px 14px;
      border-top: 2px solid #e8f0ff;
    }

    .invoice-row:first-child {
      border-top: 0;
    }

    .invoice-row.header {
      background: var(--green-soft);
      color: var(--ink);
      font-weight: 800;
      font-size: 13px;
    }

    .receipt-list .invoice-row {
      grid-template-columns: minmax(110px, 0.7fr) minmax(145px, 1.2fr) minmax(150px, 1fr) minmax(110px, 0.8fr) minmax(130px, auto);
    }

    .invoice-client {
      font-weight: 800;
      color: var(--ink);
    }

    .invoice-muted {
      display: block;
      color: var(--muted);
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
      background: var(--blue-soft);
      color: var(--ink);
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

    @media (max-width: 1040px) {
      main {
        width: min(100% - 24px, 900px);
      }

      .quick-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 840px) {
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
        color: var(--muted);
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

      .action-menu {
        width: 100%;
        margin-left: 0;
      }

      .client-row.header,
      .invoice-row.header {
        display: none;
      }

      main {
        width: min(100% - 18px, 1080px);
        margin: 14px auto 28px;
      }

      .card {
        border-radius: 22px;
        padding: 16px;
      }

      .topbar {
        align-items: stretch;
        flex-direction: column;
        border-radius: 22px;
      }

      .topbar-menu {
        width: 100%;
      }

      .topbar-menu summary {
        width: 100%;
        text-align: center;
      }

      .topbar-menu-list {
        left: 0;
        right: 0;
        min-width: 0;
      }

      .topbar form,
      .topbar button {
        width: 100%;
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

      .action-menu summary,
      .action-menu-list button {
        width: 100%;
        justify-content: center;
        text-align: center;
      }
    }

    @media (max-width: 520px) {
      h1 {
        font-size: 28px;
        letter-spacing: 0;
      }

      .brand {
        font-size: 16px;
      }

      .tab-button,
      .subtab-button,
      button {
        padding-left: 14px;
        padding-right: 14px;
      }
    }
  </style>
</head>
<body>
  <main>
    <div class="topbar">
      <div class="brand">
        <img src="/logo.svg" alt="" width="34" height="34">
        <span>BuddyPilot</span>
      </div>
      <details class="topbar-menu">
        <summary>Menu</summary>
        <div class="topbar-menu-list">
          <button type="button" data-menu-subtab="settings-panel">Tetapan</button>
          <button type="button" data-menu-subtab="bank-panel">Akaun Bank</button>
          <form method="post" action="/api/logout">
            <button class="logout-option" type="submit">Logout</button>
          </form>
        </div>
      </details>
    </div>

    <nav class="tabs" aria-label="Main tabs">
      <button class="tab-button active" type="button" data-tab-target="dashboard">Dashboard</button>
      <button class="tab-button" type="button" data-tab-target="postpilot">Page Pilot</button>
      <button class="tab-button" type="button" data-tab-target="personalpostpilot">Post Pilot</button>
      <button class="tab-button" type="button" data-tab-target="clientpilot">Client Pilot</button>
      <button class="tab-button" type="button" data-tab-target="reportpilot">Report Pilot</button>
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
        <div class="quick-grid">
          <button class="quick-card" type="button" data-go-tab="postpilot">Buat Post</button>
          <button class="quick-card" type="button" data-go-tab="personalpostpilot">Buat Post Personal</button>
          <button class="quick-card" type="button" data-go-tab="reportpilot">Buat Weekly Report</button>
          <button class="quick-card" type="button" data-go-tab="invoicepilot" data-go-subtab="invoice-panel">Buat Invois</button>
          <button class="quick-card" type="button" data-go-tab="invoicepilot" data-go-subtab="receipt-panel">Buat Resit</button>
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
          <div>
            <h1>Page Pilot</h1>
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

    <section id="tab-personalpostpilot" class="tab-panel" data-tab-panel="personalpostpilot">
      <section class="card app-panel" data-panel="personalpostpilot">
        <div class="hero">
          <div>
            <h1>Post Pilot</h1>
            <p>Jana post Facebook personal pendek dan gambar hook. Chrome extension terus post ke Facebook, kemudian Threads.</p>
          </div>
        </div>

        <div class="subtabs">
          <button class="subtab-button active" type="button" data-subtab-group="post-pilot" data-subtab-target="postpilot-auto-panel">Auto Post</button>
          <button class="subtab-button" type="button" data-subtab-group="post-pilot" data-subtab-target="threads-viral-panel">Threads Viral</button>
        </div>

        <div id="postpilot-auto-panel" class="subtab-panel active" data-subtab-panel="post-pilot">
          <form id="threadsForm" class="client-form">
            <div class="client-grid">
              <div>
                <label for="threadsProductName">Nama produk</label>
                <input id="threadsProductName" name="product_name" type="text" value="K-Method" placeholder="Contoh: K-Method" required>
              </div>
              <div>
                <label for="threadsAffiliateLink">Affiliate / comment link</label>
                <input id="threadsAffiliateLink" name="affiliate_link" type="url" value="https://swiy.co/kmethod" placeholder="Link yang nak letak di komen">
              </div>
              <div>
                <label for="threadsPostMode">Mode post</label>
                <select id="threadsPostMode" name="post_mode">
                  <option value="soft">Soft story</option>
                  <option value="hard">Hard sell</option>
                  <option value="proof">Proof</option>
                  <option value="engagement">Engagement question</option>
                  <option value="objection">Objection</option>
                </select>
              </div>
              <div>
                <label for="threadsHookImage">Gambar hook</label>
                <input id="threadsHookImage" name="hook_image" type="file" accept="image/jpeg,image/png,image/webp,image/gif">
                <div class="hook-image-preview">
                  <img id="threadsHookImagePreview" alt="Preview gambar hook terakhir" hidden>
                  <p class="note" id="threadsHookImageStatus">Belum ada gambar hook tersimpan.</p>
                </div>
              </div>
            </div>
            <button id="threadsPreviewButton" type="submit">POST NOW</button>
          </form>

          <section id="threadsPreviewPanel" class="preview">
            <h2>Preview Post Pilot</h2>
            <p class="note" id="threadsPreviewMeta"></p>

            <label for="threadsPostPreview">Post utama</label>
            <textarea id="threadsPostPreview"></textarea>

            <label for="threadsCommentPreview">Komen CTA</label>
            <textarea id="threadsCommentPreview"></textarea>

            <div class="actions">
              <button class="approve" id="sendThreadsExtensionButton" type="button">POST NOW</button>
              <button class="regenerate" id="regenerateThreadsButton" type="button">Jana Semula Post</button>
              <button class="secondary" id="copyThreadsCtaButton" type="button">Copy CTA</button>
            </div>
          </section>

          <div id="threadsResult" class="result"></div>
        </div>

        <div id="threads-viral-panel" class="subtab-panel" data-subtab-panel="post-pilot">
          <section class="client-form">
            <div class="section-heading">
              <div>
                <h2>Threads Viral Post Generator</h2>
                <p class="note">Generate text-only Threads posts. Review dulu, kemudian post satu-satu ke Threads.</p>
              </div>
            </div>
            <div class="client-grid">
              <div>
                <label for="viralTopic">Niche / topic</label>
                <input id="viralTopic" type="text" placeholder="Contoh: small business, AI automation, parenting">
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
              <button id="generateViralHundredButton" class="secondary" type="button">Generate 100 Posts</button>
              <button id="exportViralCsvButton" class="secondary" type="button">Export CSV</button>
            </div>
            <div id="viralResult" class="result"></div>
            <div id="viralOutput" class="viral-post-grid"></div>
          </section>

          <section class="saved-viral-panel">
            <div class="section-heading">
              <div>
                <h2>Saved posts</h2>
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
        </div>
      </section>
    </section>

    <section id="tab-reportpilot" class="tab-panel" data-tab-panel="reportpilot">
      <section class="card">
        <div class="section-heading">
          <div>
            <h1>Report Pilot</h1>
            <p class="note">Isi details weekly report, preview PDF, kemudian upload terus ke folder Weekly Report client.</p>
          </div>
        </div>

        <form id="reportForm" class="client-form">
          <div class="client-grid">
            <div>
              <label for="reportClient">Client</label>
              <select id="reportClient" name="clientCode" required></select>
            </div>
            <div>
              <label for="reportPhase">Phase</label>
              <input id="reportPhase" name="phase" type="text" value="SETUP PHASE" required>
            </div>
            <div>
              <label for="reportStartDate">Tarikh mula minggu</label>
              <input id="reportStartDate" name="startDate" type="date" required>
            </div>
            <div>
              <label for="reportEndDate">Tarikh akhir minggu</label>
              <input id="reportEndDate" name="endDate" type="date" required>
            </div>
            <div class="full">
              <label for="reportTitle">Report title</label>
              <input id="reportTitle" name="reportTitle" type="text" value="EXECUTIVE LEAD GENERATION BRIEF" required>
            </div>
            <div>
              <label for="reportAdSpend">Ad spend</label>
              <input id="reportAdSpend" name="adSpend" type="number" min="0" step="0.01" inputmode="decimal" value="0" required>
            </div>
            <div>
              <label for="reportLeadsGenerated">Leads generated</label>
              <input id="reportLeadsGenerated" name="leadsGenerated" type="number" min="0" step="1" inputmode="numeric" value="0" required>
            </div>
            <div>
              <label for="reportCostPerLead">Cost per lead</label>
              <input id="reportCostPerLead" name="costPerLead" type="number" min="0" step="0.01" inputmode="decimal" placeholder="Auto dari spend/leads">
            </div>
            <div>
              <label for="reportTargetLeads">Target leads</label>
              <input id="reportTargetLeads" name="targetLeads" type="number" min="0" step="1" inputmode="numeric" value="50" required>
            </div>
            <div>
              <label for="reportTargetCpl">Target CPL</label>
              <input id="reportTargetCpl" name="targetCpl" type="number" min="0" step="0.01" inputmode="decimal" value="10" required>
            </div>
            <div class="full">
              <label for="reportWhatWeProved">What we proved</label>
              <textarea id="reportWhatWeProved" class="report-tall-textarea" name="whatWeProved" required>Setup technical automation telah disiapkan
Ads campaign telah mula berjalan
Tracking dan automation sudah aktif
Data awal sedang dikumpul
Optimization dibuat selepas data mencukupi</textarea>
            </div>
            <div>
              <label for="reportWinningCreative">Winning creative</label>
              <input id="reportWinningCreative" name="winningCreative" type="text" value="N/A">
            </div>
            <div>
              <label for="reportBestPerformance">Performance</label>
              <input id="reportBestPerformance" name="bestPerformance" type="text" placeholder="Contoh: N/A Leads | RM0 CPL">
            </div>
            <div class="full">
              <label for="reportBestAudience">Audience</label>
              <input id="reportBestAudience" name="bestAudience" type="text" value="N/A">
            </div>
            <div class="full">
              <label for="reportLeadLeaks">Lead leaks</label>
              <textarea id="reportLeadLeaks" name="leadLeaks">Belum ada leads sebab minggu pertama setup technical automation dahulu
Ads dah jalan tunggu result minggu ini</textarea>
            </div>
            <div class="full">
              <label for="reportNext7Days">Next 7 days</label>
              <textarea id="reportNext7Days" class="report-tall-textarea" name="next7Days" required>Monitor Ads Campaign
Check Average CPL
Find Winning Video for TOP Funnel
Create Retargeting MIDDLE & BOTTOM Funnel Campaign if audience ready</textarea>
            </div>
            <div class="full">
              <label for="reportRecommendation">Executive recommendation</label>
              <textarea id="reportRecommendation" name="recommendation" required>Tunggu result untuk minggu ini sebelum optimize iklan. Fokus utama adalah mengumpul data awal sebelum membuat keputusan optimization dan scaling.</textarea>
            </div>
            <div>
              <label for="reportPreparedBy">Prepared by</label>
              <input id="reportPreparedBy" name="preparedBy" type="text" value="Abdussomad Ruddin | Growth Partner" required>
            </div>
            <div>
              <label for="reportFileName">Nama fail PDF</label>
              <input id="reportFileName" name="fileName" type="text" required>
            </div>
          </div>
          <div class="client-form-actions">
            <button id="previewReportButton" class="secondary" type="button">Preview PDF</button>
            <button id="uploadReportButton" class="approve" type="submit">Generate & Upload Report</button>
          </div>
        </form>
        <div id="reportResult" class="result"></div>
      </section>
    </section>

    <section id="tab-clientpilot" class="tab-panel" data-tab-panel="clientpilot">
      <section class="card">
        <div class="section-heading">
          <div>
            <h1>Client Pilot</h1>
            <p class="note">Urus senarai pelanggan, folder Drive, status service, dan contact client.</p>
          </div>
        </div>

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
      </section>
    </section>

    <section id="tab-invoicepilot" class="tab-panel" data-tab-panel="invoicepilot">
      <section class="card">
        <div class="section-heading">
          <div>
            <h1>Invoice Pilot</h1>
            <p class="note">Generate invoice PDF dan receipt PDF di sini.</p>
          </div>
        </div>
        <div class="subtabs" aria-label="Invoice Pilot tabs">
          <button class="subtab-button active" type="button" data-subtab-group="invoice-pilot" data-subtab-target="invoice-panel">Invoice</button>
          <button class="subtab-button" type="button" data-subtab-group="invoice-pilot" data-subtab-target="receipt-panel">Receipt</button>
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
    const threadsForm = document.getElementById("threadsForm");
    const threadsPreviewButton = document.getElementById("threadsPreviewButton");
    const threadsPreviewPanel = document.getElementById("threadsPreviewPanel");
    const threadsPreviewMeta = document.getElementById("threadsPreviewMeta");
    const threadsPostPreview = document.getElementById("threadsPostPreview");
    const threadsCommentPreview = document.getElementById("threadsCommentPreview");
    const sendThreadsExtensionButton = document.getElementById("sendThreadsExtensionButton");
    const regenerateThreadsButton = document.getElementById("regenerateThreadsButton");
    const copyThreadsCtaButton = document.getElementById("copyThreadsCtaButton");
    const threadsHookImage = document.getElementById("threadsHookImage");
    const threadsHookImagePreview = document.getElementById("threadsHookImagePreview");
    const threadsHookImageStatus = document.getElementById("threadsHookImageStatus");
    const threadsResult = document.getElementById("threadsResult");
    const viralTemplates = ${threadsViralTemplatesJson};
    const viralTopic = document.getElementById("viralTopic");
    const viralCategory = document.getElementById("viralCategory");
    const viralTone = document.getElementById("viralTone");
    const viralAudience = document.getElementById("viralAudience");
    const viralHashtags = document.getElementById("viralHashtags");
    const generateViralOneButton = document.getElementById("generateViralOneButton");
    const generateViralTenButton = document.getElementById("generateViralTenButton");
    const generateViralHundredButton = document.getElementById("generateViralHundredButton");
    const exportViralCsvButton = document.getElementById("exportViralCsvButton");
    const viralResult = document.getElementById("viralResult");
    const viralOutput = document.getElementById("viralOutput");
    const viralSavedSearch = document.getElementById("viralSavedSearch");
    const viralSavedCategoryFilter = document.getElementById("viralSavedCategoryFilter");
    const viralSavedToneFilter = document.getElementById("viralSavedToneFilter");
    const exportSavedViralButton = document.getElementById("exportSavedViralButton");
    const clearSavedViralButton = document.getElementById("clearSavedViralButton");
    const viralSavedOutput = document.getElementById("viralSavedOutput");
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
    const reportForm = document.getElementById("reportForm");
    const reportClient = document.getElementById("reportClient");
    const reportStartDate = document.getElementById("reportStartDate");
    const reportEndDate = document.getElementById("reportEndDate");
    const reportFileName = document.getElementById("reportFileName");
    const previewReportButton = document.getElementById("previewReportButton");
    const uploadReportButton = document.getElementById("uploadReportButton");
    const reportResult = document.getElementById("reportResult");
    const MAX_DIRECT_UPLOAD_BYTES = 4 * 1024 * 1024;
    const TARGET_UPLOAD_BYTES = Math.floor(3.75 * 1024 * 1024);
    const POSTPILOT_INPUT_STORAGE_KEY = "postpilot-last-input-v1";
    const POSTPILOT_IMAGE_STORAGE_KEY = "postpilot-last-hook-image-v1";
    const POSTPILOT_SAVED_IMAGE_MAX_BYTES = 900 * 1024;
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
    let viralGeneratedPosts = [];
    let viralSavedPosts = [];
    const VIRAL_SAVED_STORAGE_KEY = "postpilot-threads-viral-saved-v1";
    const VIRAL_BANNED_WORDS = [...(viralTemplates.bannedWords || [])];
    const VIRAL_PROMO_PHRASES = [...(viralTemplates.promotionalPhrases || [])];
    let currentInvoices = [];
    let currentReceipts = [];
    let currentClients = [];
    let currentBankAccounts = [];
    let currentBankStatus = null;
    let reportFileNameTouched = false;

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
      const file = threadsHookImage.files[0];
      if (currentThreadsImagePreviewUrl) URL.revokeObjectURL(currentThreadsImagePreviewUrl);
      currentThreadsImagePreviewUrl = file ? URL.createObjectURL(file) : "";
      updatePostPilotHookImageStatus();
      if (file) {
        savePostPilotImageInput(file).catch(showThreadsError);
      }
    });

    function showError(error) {
      result.className = "result err";
      result.textContent = error.message || String(error);
    }

    function showThreadsError(error) {
      threadsResult.className = "result err";
      threadsResult.textContent = error.message || String(error);
    }

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

    function openInvoicePilotPanel(targetId) {
      activateTab("invoicepilot");
      activateSubtab("invoice-pilot", targetId);
    }

    function setupTabs() {
      const savedMainTab = localStorage.getItem("active-main-tab") || "dashboard";
      const mainTab = document.querySelector(\`.tab-button[data-tab-target="\${savedMainTab}"]\`) ? savedMainTab : "dashboard";
      activateTab(mainTab);
      document.querySelectorAll(".tab-button").forEach((button) => {
        button.addEventListener("click", () => {
          activateTab(button.dataset.tabTarget);
          if (button.dataset.tabTarget === "invoicepilot") activateSubtab("invoice-pilot", "invoice-panel");
        });
      });

      const subtabDefaults = {
        "invoice-pilot": "invoice-panel",
        client: "client-list-panel",
        "post-pilot": "postpilot-auto-panel"
      };
      ["invoice-pilot", "client", "post-pilot"].forEach((group) => {
        const fallback = subtabDefaults[group] || document.querySelector(\`.subtab-button[data-subtab-group="\${group}"]\`)?.dataset.subtabTarget;
        const saved = group === "invoice-pilot" ? "" : localStorage.getItem(\`active-subtab-\${group}\`);
        const savedPanel = saved ? document.getElementById(saved) : null;
        const target = savedPanel?.dataset.subtabPanel === group ? saved : fallback;
        if (target) activateSubtab(group, target);
      });
      document.querySelectorAll(".subtab-button").forEach((button) => {
        button.addEventListener("click", () => activateSubtab(button.dataset.subtabGroup, button.dataset.subtabTarget));
      });
      document.querySelectorAll("[data-menu-subtab]").forEach((button) => {
        button.addEventListener("click", () => {
          openInvoicePilotPanel(button.dataset.menuSubtab);
          button.closest(".topbar-menu")?.removeAttribute("open");
        });
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

    function threadsPayloadFromForm() {
      return {
        product_name: document.getElementById("threadsProductName").value,
        affiliate_link: document.getElementById("threadsAffiliateLink").value,
        post_mode: document.getElementById("threadsPostMode").value
      };
    }

    function updatePostPilotHookImageStatus() {
      if (!threadsHookImageStatus) return;
      const selected = threadsHookImage.files?.[0];
      const previewSrc = selected
        ? currentThreadsImagePreviewUrl
        : savedThreadsImage?.dataUrl || savedThreadsImage?.url || "";
      if (threadsHookImagePreview) {
        if (previewSrc) {
          threadsHookImagePreview.src = previewSrc;
          threadsHookImagePreview.hidden = false;
        } else {
          threadsHookImagePreview.removeAttribute("src");
          threadsHookImagePreview.hidden = true;
        }
      }
      if (selected) {
        threadsHookImageStatus.textContent = \`Dipilih sekarang: \${selected.name}\`;
        return;
      }
      if (savedThreadsImage?.name) {
        const source = savedThreadsImage.url ? "Supabase" : "browser";
        threadsHookImageStatus.textContent = \`Gambar terakhir tersimpan: \${savedThreadsImage.name} (\${source}). Akan digunakan semula selepas refresh.\`;
        return;
      }
      threadsHookImageStatus.textContent = "Belum ada gambar hook tersimpan.";
    }

    function setPostPilotSavedImage(image) {
      savedThreadsImage = image && (image.dataUrl || image.url) ? image : null;
      try {
        if (savedThreadsImage) {
          localStorage.setItem(POSTPILOT_IMAGE_STORAGE_KEY, JSON.stringify(savedThreadsImage));
        } else {
          localStorage.removeItem(POSTPILOT_IMAGE_STORAGE_KEY);
        }
      } catch {
        // If localStorage quota is full, keep the image in memory for the current send.
      }
      updatePostPilotHookImageStatus();
    }

    function restorePostPilotInputs() {
      try {
        const saved = JSON.parse(localStorage.getItem(POSTPILOT_INPUT_STORAGE_KEY) || "{}");
        const fields = {
          product_name: "threadsProductName",
          affiliate_link: "threadsAffiliateLink",
          post_mode: "threadsPostMode"
        };
        Object.entries(fields).forEach(([key, id]) => {
          const node = document.getElementById(id);
          if (node && typeof saved[key] === "string") node.value = saved[key];
        });
      } catch {
        localStorage.removeItem(POSTPILOT_INPUT_STORAGE_KEY);
      }

      try {
        const image = JSON.parse(localStorage.getItem(POSTPILOT_IMAGE_STORAGE_KEY) || "null");
        savedThreadsImage = image?.dataUrl || image?.url ? image : null;
      } catch {
        localStorage.removeItem(POSTPILOT_IMAGE_STORAGE_KEY);
        savedThreadsImage = null;
      }
      updatePostPilotHookImageStatus();
    }

    function applyPostPilotDraft(draft) {
      if (!draft) return;
      const values = {
        product_name: draft.productName,
        affiliate_link: draft.affiliateLink,
        post_mode: draft.postMode
      };
      const fields = {
        product_name: "threadsProductName",
        affiliate_link: "threadsAffiliateLink",
        post_mode: "threadsPostMode"
      };
      Object.entries(fields).forEach(([key, id]) => {
        const node = document.getElementById(id);
        if (node && typeof values[key] === "string") node.value = values[key];
      });
      savePostPilotInputs();
      if (draft.hasHookImage) {
        const localDataUrl = savedThreadsImage?.savedAt === draft.hookImageUpdatedAt
          ? savedThreadsImage.dataUrl || ""
          : "";
        setPostPilotSavedImage({
          name: draft.hookImageName || "post-hook.jpg",
          type: draft.hookImageMime || "image/jpeg",
          url: \`/api/personal-post-hook-image?t=\${encodeURIComponent(draft.hookImageUpdatedAt || Date.now())}\`,
          dataUrl: localDataUrl,
          savedAt: draft.hookImageUpdatedAt || "",
        });
      }
    }

    async function loadPostPilotDraftFromSupabase() {
      try {
        const response = await fetch("/api/personal-post-draft");
        const json = await readApiJson(response);
        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }
        if (!response.ok || !json.ok) throw new Error(json.error || "Load Post Pilot draft failed.");
        applyPostPilotDraft(json.draft);
      } catch {
        // Local storage remains the fallback when Supabase is not configured yet.
      }
    }

    function savePostPilotInputs() {
      try {
        localStorage.setItem(POSTPILOT_INPUT_STORAGE_KEY, JSON.stringify(threadsPayloadFromForm()));
      } catch {
        // Ignore private browsing/quota issues; the current form still works.
      }
    }

    async function savePostPilotInputsToSupabase() {
      const response = await fetch("/api/personal-post-draft", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(threadsPayloadFromForm())
      });
      const json = await readApiJson(response);
      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!response.ok || !json.ok) throw new Error(json.error || "Save Post Pilot draft failed.");
      applyPostPilotDraft(json.draft);
    }

    function schedulePostPilotSave() {
      savePostPilotInputs();
      window.clearTimeout(postPilotSaveTimer);
      postPilotSaveTimer = window.setTimeout(() => {
        savePostPilotInputsToSupabase().catch(() => {});
      }, 650);
    }

    function setupPostPilotInputStorage() {
      restorePostPilotInputs();
      threadsForm.querySelectorAll("input:not([type='file']), textarea, select").forEach((node) => {
        node.addEventListener("input", schedulePostPilotSave);
        node.addEventListener("change", schedulePostPilotSave);
      });
      loadPostPilotDraftFromSupabase();
    }

    function blobToDataUrl(blob) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("Gagal simpan gambar hook."));
        reader.readAsDataURL(blob);
      });
    }

    function normalizePostPilotMainTextForSend(value, link) {
      const safeLink = String(link || "https://swiy.co/kmethod").trim() || "https://swiy.co/kmethod";
      const lines = String(value || "")
        .replace(/https?:\\/\\/\\S+/gi, "")
        .split(/\\r?\\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .filter((line) => !/^klik\\s+sini\\s*:/i.test(line));
      const selected = [];
      let total = 0;
      for (const line of lines) {
        const nextTotal = total + line.length + (selected.length ? 2 : 0);
        if (selected.length >= 3 || nextTotal > 430) break;
        selected.push(line);
        total = nextTotal;
      }
      return [...selected, \`klik sini: \${safeLink}\`].join("\\n\\n").trim();
    }

    async function compressImageForPostPilotStorage(file) {
      if (!file || !file.type.startsWith("image/")) throw new Error("Gambar hook mesti image.");
      if (file.size <= POSTPILOT_SAVED_IMAGE_MAX_BYTES) return file;

      const image = await imageBitmapFromFile(file);
      const maxDims = [1200, 960, 720, 540];
      const qualities = [0.82, 0.74, 0.66, 0.58, 0.5, 0.42];

      for (const maxDim of maxDims) {
        const scale = Math.min(1, maxDim / Math.max(image.width, image.height));
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(image, 0, 0, width, height);

        for (const quality of qualities) {
          const blob = await canvasToBlob(canvas, "image/jpeg", quality);
          if (blob.size <= POSTPILOT_SAVED_IMAGE_MAX_BYTES) {
            return fileFromBlob(blob, file.name.replace(/\.[^.]+$/, "") + "-saved.jpg");
          }
        }
      }

      throw new Error("Gambar hook terlalu besar untuk disimpan. Pilih gambar lebih kecil.");
    }

    async function savePostPilotImageInput(file) {
      const storedFile = await compressImageForPostPilotStorage(file);
      const localImage = {
        name: storedFile.name || file.name || "post-hook.jpg",
        type: storedFile.type || file.type || "image/jpeg",
        dataUrl: await readFileAsDataUrl(storedFile),
        savedAt: new Date().toISOString()
      };
      setPostPilotSavedImage(localImage);

      const payload = new FormData();
      payload.append("hookImage", storedFile);
      let response;
      let json;
      try {
        response = await fetch("/api/personal-post-hook-image", {
          method: "POST",
          body: payload
        });
        json = await readApiJson(response);
      } catch (error) {
        threadsResult.className = "result ok";
        threadsResult.textContent = "Gambar hook sudah disimpan untuk Post Pilot. Extension akan guna gambar terakhir ini.";
        return;
      }
      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!response.ok || !json.ok) {
        threadsResult.className = "result ok";
        threadsResult.textContent = "Gambar hook sudah disimpan untuk Post Pilot. Extension akan guna gambar terakhir ini.";
        return;
      }
      if (json.storage === "browser") {
        setPostPilotSavedImage({
          ...localImage,
          savedAt: json.draft?.hookImageUpdatedAt || localImage.savedAt
        });
        threadsResult.className = "result ok";
        threadsResult.textContent = "Gambar hook sudah disimpan untuk Post Pilot. Extension akan guna gambar terakhir ini.";
        return;
      }
      const image = {
        name: json.draft?.hookImageName || storedFile.name || "post-hook.jpg",
        type: json.draft?.hookImageMime || storedFile.type || "image/jpeg",
        url: \`/api/personal-post-hook-image?t=\${encodeURIComponent(json.draft?.hookImageUpdatedAt || Date.now())}\`,
        dataUrl: localImage.dataUrl,
        savedAt: json.draft?.hookImageUpdatedAt || new Date().toISOString()
      };
      setPostPilotSavedImage(image);
      threadsResult.className = "result ok";
      threadsResult.textContent = "Gambar hook sudah disimpan dalam Supabase untuk Post Pilot.";
    }

    function showThreadsPreview(json, { reveal = true, message = "" } = {}) {
      currentThreadsPreview = json.preview;
      seenThreadsVariations = [Number(currentThreadsPreview.variation || 0)];
      threadsPostPreview.value = currentThreadsPreview.post_text || "";
      threadsCommentPreview.value = currentThreadsPreview.comment_cta || "";
      threadsPreviewMeta.textContent = [
        \`Produk: \${currentThreadsPreview.product_context?.product_name || currentThreadsPreview.product_name || "-"}\`,
        \`Concept: \${Number(currentThreadsPreview.variation || 0) + 1}/120\`,
        \`Style: \${currentThreadsPreview.style || "-"}\`
      ].join(" | ");
      threadsPreviewPanel.className = reveal ? "preview show" : "preview";
      if (message || reveal) {
        threadsResult.className = "result ok";
        threadsResult.textContent = [
          message || "Preview Post Pilot siap. Post utama dan CTA komen sudah disediakan.",
          savedThreadsImage && !threadsHookImage.files[0] ? "Gambar hook last key in tersedia untuk extension." : "",
          preparedThreadsImageNotice || ""
        ].filter(Boolean).join("\\n\\n");
      }
    }

    async function buildThreadsExtensionDraft() {
      if (!currentThreadsPreview) throw new Error("Preview Post Pilot belum dijana.");
      const selectedImage = preparedThreadsImageFile || threadsHookImage.files[0] || null;
      let imageDataUrl = "";
      let imageNotice = "";
      if (selectedImage) {
        const imageForExtension = await prepareThreadsImageFile(selectedImage);
        if (imageForExtension && imageForExtension.size <= TARGET_UPLOAD_BYTES) {
          imageDataUrl = await readFileAsDataUrl(imageForExtension);
        } else if (imageForExtension) {
          imageNotice = "Gambar terlalu besar untuk dihantar ke extension. Pilih gambar secara manual di Facebook.";
        }
      } else if (savedThreadsImage?.dataUrl) {
        imageDataUrl = savedThreadsImage.dataUrl;
      } else if (savedThreadsImage?.url) {
        try {
          const response = await fetch(savedThreadsImage.url);
          if (!response.ok) throw new Error("Gagal load gambar hook dari Supabase.");
          imageDataUrl = await blobToDataUrl(await response.blob());
        } catch (error) {
          imageNotice = \`Gambar hook terakhir tidak dapat dibaca dari Supabase. Upload gambar secara manual di Facebook. Detail: \${error.message || String(error)}\`;
        }
      }

      return {
        source: "postpilot-webapp",
        type: "POSTPILOT_SAVE_DRAFT",
        draft: {
          id: \`postpilot-\${Date.now()}\`,
          createdAt: new Date().toISOString(),
          postText: normalizePostPilotMainTextForSend(
            threadsPostPreview.value,
            currentThreadsPreview.affiliate_link || document.getElementById("threadsAffiliateLink").value
          ),
          commentCta: threadsCommentPreview.value.trim(),
          productName: currentThreadsPreview.product_name || currentThreadsPreview.product_context?.product_name || "",
          affiliateLink: currentThreadsPreview.affiliate_link || "",
          postMode: currentThreadsPreview.post_mode || "soft",
          style: currentThreadsPreview.style || "",
          autoPublish: true,
          image: imageDataUrl ? {
            name: (preparedThreadsImageFile || selectedImage)?.name || savedThreadsImage?.name || "post-hook.jpg",
            type: (preparedThreadsImageFile || selectedImage)?.type || savedThreadsImage?.type || "image/jpeg",
            dataUrl: imageDataUrl
          } : null,
          imageNotice
        }
      };
    }

    async function sendThreadsDraftToExtension() {
      const message = await buildThreadsExtensionDraft();
      if (!message.draft.postText) throw new Error("Post utama kosong.");
      window.postMessage(message, window.location.origin);
      threadsResult.className = "result ok";
      threadsResult.textContent = [
        "Draft dihantar. Menunggu Post Pilot extension buka Facebook, kemudian Threads...",
        message.draft.imageNotice || preparedThreadsImageNotice || ""
      ].filter(Boolean).join("\\n");
      return message;
    }

    function pickRandom(list) {
      return list[Math.floor(Math.random() * list.length)] || "";
    }

    function fillSelectOptions(select, values, includeAllLabel) {
      if (!select) return;
      select.innerHTML = "";
      if (includeAllLabel) {
        const allOption = document.createElement("option");
        allOption.value = "";
        allOption.textContent = includeAllLabel;
        select.appendChild(allOption);
      }
      values.forEach((value) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        select.appendChild(option);
      });
    }

    function normalizeWords(value) {
      return String(value || "")
        .toLowerCase()
        .replace(/https?:\\/\\/\\S+/g, " ")
        .replace(/[^a-z0-9\\u00c0-\\u024f\\u1e00-\\u1eff\\s-]/gi, " ")
        .split(/\\s+/)
        .map((word) => word.trim())
        .filter((word) => word.length >= 3);
    }

    function similarityScore(a, b) {
      const aWords = new Set(normalizeWords(a));
      const bWords = new Set(normalizeWords(b));
      if (!aWords.size || !bWords.size) return 0;
      const intersection = [...aWords].filter((word) => bWords.has(word)).length;
      const union = new Set([...aWords, ...bWords]).size;
      return intersection / union;
    }

    function tooSimilarToBatch(text, posts) {
      return posts.some((post) => similarityScore(text, post.postText || post.post_text || "") > 0.72);
    }

    function containsAnyPhrase(text, phrases) {
      const lower = String(text || "").toLowerCase();
      return phrases.some((phrase) => lower.includes(String(phrase || "").toLowerCase()));
    }

    function cleanViralText(value) {
      return String(value || "")
        .replace(/\\s+([?.!,])/g, "$1")
        .replace(/[ \\t]+/g, " ")
        .replace(/\\n{3,}/g, "\\n\\n")
        .trim();
    }

    function withTopic(template, topic) {
      return String(template || "").replace(/\\{topic\\}/g, topic);
    }

    function maybeHashtags(category, topic) {
      if (!viralHashtags.checked) return "";
      const raw = [category, topic, "ThreadsMY"]
        .map((item) => String(item || "").replace(/[^a-z0-9]/gi, ""))
        .filter(Boolean)
        .slice(0, 3);
      return raw.length ? "\\n\\n" + raw.map((item) => "#" + item).join(" ") : "";
    }

    function viralContextFor(category) {
      if (["Business", "Marketing", "Sales", "Side Income", "AI Automation", "TikTok Ads", "Facebook Ads", "Local Brand"].includes(category)) {
        return pickRandom(viralTemplates.businessContextPhrases);
      }
      return pickRandom(viralTemplates.malaysianContextPhrases);
    }

    function buildViralText(parts) {
      const structure = parts.structure;
      const topic = parts.topic;
      const hook = withTopic(parts.hook, topic);
      const opening = withTopic(parts.opening, topic);
      const angle = parts.angle;
      const pain = parts.pain;
      const emotion = parts.emotion;
      const middle = parts.middle;
      const context = parts.context;
      const cta = parts.cta;

      if (structure === "Hot Take") return [hook + ".", angle + ".", middle + ".", cta].join("\\n\\n");
      if (structure === "Relatable Pain") return [pain + ".", emotion + ".", middle + ".", cta].join("\\n\\n");
      if (structure === "Contrarian") return ["ramai fikir " + topic + " kena complicated.", "aku tak rasa macam tu.", angle + ".", cta].join("\\n\\n");
      if (structure === "List Style") return ["3 benda aku belajar pasal " + topic + ":", "1. " + angle, "2. " + middle, "3. " + context, cta].join("\\n");
      if (structure === "Story Style") return [opening + ".", "lepas tu aku perasan: " + middle + ".", cta].join("\\n\\n");
      if (structure === "Comparison") return ["cara lama: overthink sampai tak post.", "cara baru: " + angle + ".", middle + ".", cta].join("\\n\\n");
      if (structure === "Warning") return ["mistake ramai orang buat: " + pain + ".", "kesannya, " + emotion + ".", "better move: " + angle + ".", cta].join("\\n\\n");
      if (structure === "Recommendation") return ["kalau kau tengah explore " + topic + ", cuba " + angle + ".", middle + ".", cta].join("\\n\\n");
      if (structure === "Local Malaysian Angle") return [context + ".", opening + ".", middle + ".", cta].join("\\n\\n");
      return [context + ".", "dalam business, " + middle + ".", angle + ".", cta].join("\\n\\n");
    }

    function validateViralPost(text, existingPosts) {
      const safe = cleanViralText(text);
      if (!safe) return { ok: false, reason: "empty" };
      if (safe.length > 500) return { ok: false, reason: "over_500" };
      if (!/[?？]$/.test(safe)) return { ok: false, reason: "no_question" };
      if (!viralHashtags.checked && /(^|\\s)#\\w+/i.test(safe)) return { ok: false, reason: "hashtag_disabled" };
      if (containsAnyPhrase(safe, VIRAL_BANNED_WORDS)) return { ok: false, reason: "banned_word" };
      if (containsAnyPhrase(safe, VIRAL_PROMO_PHRASES)) return { ok: false, reason: "too_promotional" };
      if (tooSimilarToBatch(safe, existingPosts)) return { ok: false, reason: "too_similar" };
      return { ok: true, text: safe };
    }

    function makeViralPost(existingPosts = [], override = {}) {
      const category = override.category || viralCategory.value || "Business";
      const tone = override.tone || viralTone.value || "Casual";
      const audience = override.audience || viralAudience.value || pickRandom(viralTemplates.audienceTypes);
      const topic = (override.topic || viralTopic.value || category).trim();

      for (let attempt = 0; attempt < 160; attempt += 1) {
        const structure = pickRandom(viralTemplates.structures);
        const parts = {
          angle: pickRandom(viralTemplates.contentAngles),
          audience,
          category,
          context: viralContextFor(category),
          cta: pickRandom(viralTemplates.ctaQuestions),
          emotion: pickRandom(viralTemplates.emotionalTriggers),
          hook: pickRandom(viralTemplates.hooks),
          middle: pickRandom(viralTemplates.middleSentencePatterns),
          opening: pickRandom(viralTemplates.openingStyles),
          pain: pickRandom(viralTemplates.painPoints),
          structure,
          tone,
          topic,
        };
        let text = buildViralText(parts) + maybeHashtags(category, topic);
        text = cleanViralText(text);
        const validation = validateViralPost(text, existingPosts);
        if (validation.ok) {
          return {
            id: "viral-" + Date.now() + "-" + Math.random().toString(16).slice(2),
            postText: validation.text,
            characterCount: validation.text.length,
            category,
            tone,
            audience,
            structure,
            createdAt: new Date().toISOString(),
          };
        }
      }

      const fallbackText = cleanViralText([
        "aku rasa " + topic + " tak perlu complicated.",
        "mula dengan satu step yang jelas dulu.",
        "kau akan mula kecil dulu atau tunggu ready?"
      ].join("\\n\\n") + maybeHashtags(category, topic));
      return {
        id: "viral-" + Date.now() + "-" + Math.random().toString(16).slice(2),
        postText: fallbackText.slice(0, 500),
        characterCount: Math.min(fallbackText.length, 500),
        category,
        tone,
        audience,
        structure: "Recommendation",
        createdAt: new Date().toISOString(),
      };
    }

    function generateViralPosts(count) {
      const posts = [];
      for (let index = 0; index < count; index += 1) {
        posts.push(makeViralPost(posts));
      }
      viralGeneratedPosts = posts;
      renderViralPosts();
      setMessage(viralResult, "ok", count + " Threads viral post generated.");
    }

    function csvEscape(value) {
      return '"' + String(value || "").replace(/"/g, '""') + '"';
    }

    function exportViralCsv(posts, filename) {
      if (!posts.length) {
        setMessage(viralResult, "err", "Tiada post untuk export.");
        return;
      }
      const rows = [["post_text", "character_count", "category", "tone", "structure", "created_at"]];
      posts.forEach((post) => {
        rows.push([post.postText, post.characterCount, post.category, post.tone, post.structure, post.createdAt]);
      });
      const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    }

    async function copyText(text, button) {
      await navigator.clipboard.writeText(text);
      if (button) markButtonSuccess(button, "Copied");
    }

    function isViralSaved(post) {
      return viralSavedPosts.some((saved) => saved.postText === post.postText);
    }

    function saveViralPosts() {
      localStorage.setItem(VIRAL_SAVED_STORAGE_KEY, JSON.stringify(viralSavedPosts));
    }

    function loadViralPosts() {
      try {
        viralSavedPosts = JSON.parse(localStorage.getItem(VIRAL_SAVED_STORAGE_KEY) || "[]");
      } catch {
        viralSavedPosts = [];
        localStorage.removeItem(VIRAL_SAVED_STORAGE_KEY);
      }
    }

    function toggleViralFavorite(post) {
      if (isViralSaved(post)) {
        viralSavedPosts = viralSavedPosts.filter((saved) => saved.postText !== post.postText);
      } else {
        viralSavedPosts.unshift({ ...post, savedAt: new Date().toISOString() });
      }
      saveViralPosts();
      renderViralPosts();
      renderSavedViralPosts();
    }

    function regenerateViralPost(postId) {
      const index = viralGeneratedPosts.findIndex((post) => post.id === postId);
      if (index < 0) return;
      const existing = viralGeneratedPosts.filter((post) => post.id !== postId);
      viralGeneratedPosts[index] = makeViralPost(existing);
      renderViralPosts();
    }

    function postViralToThreads(post) {
      window.postMessage({
        source: "postpilot-webapp",
        type: "POSTPILOT_THREADS_TEXT_ONLY_DRAFT",
        draft: {
          id: "threads-viral-" + Date.now(),
          createdAt: new Date().toISOString(),
          postText: post.postText,
          category: post.category,
          tone: post.tone,
          structure: post.structure,
          threadsTextOnly: true,
          autoPublish: true,
        }
      }, window.location.origin);
      setMessage(viralResult, "ok", "Draft Threads viral dihantar. Extension akan buka Threads dan post text sahaja.");
    }

    function viralCard(post, options = {}) {
      const card = document.createElement("article");
      card.className = "viral-post-card" + (isViralSaved(post) ? " favorite" : "");

      const text = document.createElement("p");
      text.className = "viral-post-text";
      text.textContent = post.postText;

      const meta = document.createElement("div");
      meta.className = "viral-meta";
      [post.characterCount + " chars", post.structure, post.tone, post.category].forEach((item) => {
        const span = document.createElement("span");
        span.textContent = item;
        meta.appendChild(span);
      });

      const actions = document.createElement("div");
      actions.className = "actions";

      const copyButton = document.createElement("button");
      copyButton.className = "secondary";
      copyButton.type = "button";
      copyButton.textContent = "Copy";
      copyButton.addEventListener("click", () => copyText(post.postText, copyButton).catch(showThreadsError));
      actions.appendChild(copyButton);

      if (!options.savedOnly) {
        const regenerateButton = document.createElement("button");
        regenerateButton.className = "regenerate";
        regenerateButton.type = "button";
        regenerateButton.textContent = "Regenerate";
        regenerateButton.addEventListener("click", () => regenerateViralPost(post.id));
        actions.appendChild(regenerateButton);
      }

      const favoriteButton = document.createElement("button");
      favoriteButton.className = "secondary";
      favoriteButton.type = "button";
      favoriteButton.textContent = isViralSaved(post) ? "Saved" : "Favorite";
      favoriteButton.addEventListener("click", () => toggleViralFavorite(post));
      actions.appendChild(favoriteButton);

      const postButton = document.createElement("button");
      postButton.className = "approve";
      postButton.type = "button";
      postButton.textContent = "Post to Threads";
      postButton.addEventListener("click", () => postViralToThreads(post));
      actions.appendChild(postButton);

      card.append(text, meta, actions);
      return card;
    }

    function renderViralPosts() {
      viralOutput.innerHTML = "";
      viralGeneratedPosts.forEach((post) => viralOutput.appendChild(viralCard(post)));
    }

    function filteredSavedViralPosts() {
      const query = String(viralSavedSearch.value || "").toLowerCase();
      const category = viralSavedCategoryFilter.value;
      const tone = viralSavedToneFilter.value;
      return viralSavedPosts.filter((post) => {
        if (query && !post.postText.toLowerCase().includes(query)) return false;
        if (category && post.category !== category) return false;
        if (tone && post.tone !== tone) return false;
        return true;
      });
    }

    function renderSavedViralPosts() {
      viralSavedOutput.innerHTML = "";
      const posts = filteredSavedViralPosts();
      posts.forEach((post) => viralSavedOutput.appendChild(viralCard(post, { savedOnly: true })));
      if (!posts.length) {
        const empty = document.createElement("p");
        empty.className = "note";
        empty.textContent = "Belum ada saved posts.";
        viralSavedOutput.appendChild(empty);
      }
    }

    function setupThreadsViralGenerator() {
      fillSelectOptions(viralCategory, viralTemplates.categories || [], "");
      fillSelectOptions(viralTone, viralTemplates.toneOptions || [], "");
      fillSelectOptions(viralAudience, viralTemplates.audienceTypes || [], "");
      fillSelectOptions(viralSavedCategoryFilter, viralTemplates.categories || [], "All categories");
      fillSelectOptions(viralSavedToneFilter, viralTemplates.toneOptions || [], "All tones");
      loadViralPosts();
      renderSavedViralPosts();
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

    threadsForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      threadsResult.className = "result";
      threadsResult.textContent = "";
      threadsPreviewPanel.className = "preview";
      threadsPreviewButton.disabled = true;
      threadsPreviewButton.textContent = "Preparing post...";

      try {
        const hookFile = threadsHookImage.files[0];
        if (hookFile) {
          threadsPreviewButton.textContent = "Preparing image...";
          await prepareThreadsImageFile(hookFile);
        }

        const response = await fetch("/api/personal-post-preview", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(threadsPayloadFromForm())
        });
        const json = await readApiJson(response);
        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }
        if (!response.ok || !json.ok) throw new Error(json.error || "Post Pilot preview failed.");
        showThreadsPreview(json, { reveal: false });
        threadsPreviewButton.textContent = "Sending to Chrome...";
        await sendThreadsDraftToExtension();
      } catch (error) {
        showThreadsError(error);
      } finally {
        threadsPreviewButton.disabled = false;
        threadsPreviewButton.textContent = "POST NOW";
      }
    });

    regenerateThreadsButton.addEventListener("click", async () => {
      if (!currentThreadsPreview) return;
      threadsResult.className = "result";
      threadsResult.textContent = "";
      regenerateThreadsButton.disabled = true;
      regenerateThreadsButton.textContent = "Generating...";

      try {
        const response = await fetch("/api/personal-post-regenerate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            product_name: currentThreadsPreview.product_name,
            affiliate_link: currentThreadsPreview.affiliate_link,
            post_mode: currentThreadsPreview.post_mode,
            product_context: currentThreadsPreview.product_context?.raw,
            variation: currentThreadsPreview.variation,
            seen_variations: seenThreadsVariations
          })
        });
        const json = await readApiJson(response);
        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }
        if (!response.ok || !json.ok) throw new Error(json.error || "Post Pilot regenerate failed.");

        currentThreadsPreview = {
          ...currentThreadsPreview,
          post_text: json.preview.post_text,
          comment_cta: json.preview.comment_cta,
          product_context: json.preview.product_context,
          variation: json.preview.variation,
          style: json.preview.style
        };
        seenThreadsVariations.push(Number(currentThreadsPreview.variation || 0));
        threadsPostPreview.value = currentThreadsPreview.post_text || "";
        threadsCommentPreview.value = currentThreadsPreview.comment_cta || "";
        threadsPreviewMeta.textContent = [
          \`Produk: \${currentThreadsPreview.product_context?.product_name || currentThreadsPreview.product_name || "-"}\`,
          \`Concept: \${Number(currentThreadsPreview.variation || 0) + 1}/120\`,
          \`Style: \${currentThreadsPreview.style || "-"}\`
        ].join(" | ");
        threadsResult.className = "result ok";
        threadsResult.textContent = "Variasi post baru sudah dijana.";
      } catch (error) {
        showThreadsError(error);
      } finally {
        regenerateThreadsButton.disabled = false;
        regenerateThreadsButton.textContent = "Jana Semula Post";
      }
    });

    copyThreadsCtaButton.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(threadsCommentPreview.value || "");
        threadsResult.className = "result ok";
        threadsResult.textContent = "CTA komen sudah dicopy.";
      } catch (error) {
        showThreadsError(error);
      }
    });

    generateViralOneButton.addEventListener("click", () => generateViralPosts(1));
    generateViralTenButton.addEventListener("click", () => generateViralPosts(10));
    generateViralHundredButton.addEventListener("click", () => generateViralPosts(100));
    exportViralCsvButton.addEventListener("click", () => exportViralCsv(viralGeneratedPosts, "threads-viral-posts.csv"));
    exportSavedViralButton.addEventListener("click", () => exportViralCsv(filteredSavedViralPosts(), "threads-viral-saved-posts.csv"));
    clearSavedViralButton.addEventListener("click", () => {
      viralSavedPosts = [];
      saveViralPosts();
      renderViralPosts();
      renderSavedViralPosts();
    });
    viralSavedSearch.addEventListener("input", renderSavedViralPosts);
    viralSavedCategoryFilter.addEventListener("change", renderSavedViralPosts);
    viralSavedToneFilter.addEventListener("change", renderSavedViralPosts);

    sendThreadsExtensionButton.addEventListener("click", async () => {
      sendThreadsExtensionButton.disabled = true;
      sendThreadsExtensionButton.textContent = "Sending...";
      threadsResult.className = "result";
      threadsResult.textContent = "";

      try {
        await sendThreadsDraftToExtension();
      } catch (error) {
        showThreadsError(error);
      } finally {
        sendThreadsExtensionButton.disabled = false;
        sendThreadsExtensionButton.textContent = "POST NOW";
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
      start.setDate(today.getDate() - day + 1);
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

    function updateReportFileName(force = false) {
      if (!force && reportFileNameTouched) return;
      const client = selectedReportClient();
      if (!client || !reportStartDate.value || !reportEndDate.value) return;
      const brand = client.name || client.brandClient || client.code;
      reportFileName.value = \`\${safeReportFilePart(brand)} Weekly Report \${reportFileDateRange(reportStartDate.value, reportEndDate.value)}.pdf\`;
    }

    function populateReportClientOptions() {
      if (!reportClient) return;
      const previous = reportClient.value;
      const activeClients = currentClients.filter((client) => client.serviceStatus !== "paused");
      reportClient.innerHTML = activeClients.length
        ? activeClients.map((client) => \`<option value="\${escapeHtml(client.code)}">\${escapeHtml(client.brandClient || client.name || client.code)}</option>\`).join("")
        : '<option value="">Belum ada client aktif</option>';
      if (activeClients.some((client) => client.code === previous)) reportClient.value = previous;
      updateReportFileName();
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
          upload.webViewLink || upload.fileId || ""
        ].filter(Boolean).join("\\n");
        await loadActivity();
      } catch (error) {
        showReportError(error);
      } finally {
        previewReportButton.disabled = false;
        uploadReportButton.disabled = false;
        uploadReportButton.textContent = "Generate & Upload Report";
      }
    }

    function renderClientList(clients, registryStatus) {
      currentClients = clients || [];
      setTextIfPresent(dashboardClientCount, String(clients.length));
      setTextIfPresent(dashboardRegistryStatus, registryStatus?.ok
        ? (registryStatus.source === "supabase" ? "DB OK" : "Drive OK")
        : "Setup");

      if (!clients.length) {
        currentClients = [];
        populateReportClientOptions();
        clientList.innerHTML = "";
        setMessage(clientResult, "err", "Belum ada pelanggan.");
        return;
      }
      populateReportClientOptions();

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
            <details class="action-menu">
              <summary>Actions</summary>
              <div class="action-menu-list">
                <button class="secondary copy-drive-link-button" type="button" data-client-code="\${escapeHtml(client.code)}">Copy Drive Link</button>
                <button class="secondary whatsapp-client-button" type="button" data-client-code="\${escapeHtml(client.code)}" data-whatsapp-type="invoice">WhatsApp Invoice</button>
                <button class="secondary whatsapp-client-button" type="button" data-client-code="\${escapeHtml(client.code)}" data-whatsapp-type="receipt">WhatsApp Receipt</button>
                <button class="secondary whatsapp-client-button" type="button" data-client-code="\${escapeHtml(client.code)}" data-whatsapp-type="report">WhatsApp Report</button>
                <button class="secondary whatsapp-client-button" type="button" data-client-code="\${escapeHtml(client.code)}" data-whatsapp-type="custom">WhatsApp Custom</button>
                <button class="secondary edit-client-button" type="button" data-client-code="\${escapeHtml(client.code)}">Edit</button>
                <button class="secondary service-client-button" type="button" data-client-code="\${escapeHtml(client.code)}" data-next-status="\${client.serviceStatus === "paused" ? "active" : "paused"}">\${client.serviceStatus === "paused" ? "Recover" : "Stop Service"}</button>
                <button class="danger delete-client-button" type="button" data-client-code="\${escapeHtml(client.code)}">Delete</button>
              </div>
            </details>
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
        await loadActivity();
      } catch (error) {
        showReceiptError(error);
      } finally {
        generateReceiptsButton.disabled = false;
        uploadReceiptsButton.textContent = "Upload Selected Receipts";
        updateUploadReceiptsButtonState();
      }
    }

    invoicePeriod.value = defaultInvoicePeriod();
    receiptPeriod.value = invoicePeriod.value;
    const reportWeek = defaultReportWeek();
    reportStartDate.value = reportWeek.start;
    reportEndDate.value = reportWeek.end;
    setupTabs();
    setupPanels();
    setupPostPilotInputStorage();
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
      const whatsappButton = event.target.closest(".whatsapp-client-button");
      if (whatsappButton) {
        sendClientWhatsapp(whatsappButton.dataset.clientCode, whatsappButton.dataset.whatsappType, whatsappButton);
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
    refreshActivityButton.addEventListener("click", loadActivity);
    reportClient.addEventListener("change", () => updateReportFileName(true));
    reportStartDate.addEventListener("change", () => updateReportFileName());
    reportEndDate.addEventListener("change", () => updateReportFileName());
    reportFileName.addEventListener("input", () => {
      reportFileNameTouched = true;
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
