const { requireAuth } = require("../lib/auth");
const threadsViralTemplates = require("../lib/threads-viral-templates");
const { buildThreadsGeneralText } = require("../lib/threads-general-copy");

function pageHtml() {
  const threadsViralTemplatesJson = JSON.stringify(threadsViralTemplates).replace(/</g, "\\u003c");
  const threadsGeneralCopySource = buildThreadsGeneralText.toString().replace(/</g, "\\u003c");
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

    [hidden] {
      display: none !important;
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

    .topbar-tabs {
      flex: 1 1 auto;
      flex-wrap: nowrap;
      min-width: 0;
      margin: 0;
      gap: 8px;
      overflow-x: auto;
      scrollbar-width: thin;
    }

    .topbar-tabs .tab-button {
      flex: 0 0 auto;
      padding: 10px 14px;
      white-space: nowrap;
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

    .dashboard-workspace {
      padding: 8px 2px 22px;
    }

    .dashboard-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
      margin-bottom: 26px;
    }

    .dashboard-header h1 {
      margin: 0;
      font-size: clamp(32px, 4vw, 48px);
      letter-spacing: 0;
    }

    .dashboard-header p {
      margin: 7px 0 0;
    }

    .dashboard-refresh {
      flex: 0 0 auto;
      min-height: 44px;
      padding: 11px 18px;
      border: 1px solid #dbe5f1;
      border-radius: 8px;
      background: #ffffff;
      color: var(--ink);
      box-shadow: 0 3px 10px rgba(20, 33, 61, 0.08);
    }

    .dashboard-metrics {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
      margin-bottom: 28px;
    }

    .dashboard-metric {
      position: relative;
      min-width: 0;
      padding: 18px;
      overflow: hidden;
      border: 1px solid #e3eaf3;
      border-radius: 8px;
      background: #ffffff;
      box-shadow: 0 5px 16px rgba(20, 33, 61, 0.06);
    }

    .dashboard-metric::before {
      content: "";
      position: absolute;
      inset: 0 auto 0 0;
      width: 4px;
      background: var(--metric-color, var(--blue));
    }

    .dashboard-metric[data-tone="green"] { --metric-color: var(--green); }
    .dashboard-metric[data-tone="yellow"] { --metric-color: #e5a900; }
    .dashboard-metric[data-tone="purple"] { --metric-color: var(--purple); }

    .dashboard-metric-label,
    .dashboard-metric-detail {
      display: block;
      color: var(--muted);
      font-size: 13px;
    }

    .dashboard-metric-value {
      display: block;
      margin: 9px 0 5px;
      overflow-wrap: anywhere;
      font-size: clamp(22px, 3vw, 30px);
      line-height: 1;
      letter-spacing: 0;
    }

    .dashboard-layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: 28px;
      align-items: start;
    }

    .dashboard-section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      min-height: 34px;
      margin-bottom: 14px;
    }

    .dashboard-section-header h2 {
      margin: 0;
      font-size: 20px;
      letter-spacing: 0;
    }

    .dashboard-section-kicker {
      color: var(--muted);
      font-size: 13px;
    }

    .quick-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
      margin: 0;
    }

    .quick-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      width: 100%;
      min-height: 72px;
      margin: 0;
      padding: 15px 16px;
      border: 1px solid #e3eaf3;
      border-radius: 8px;
      background: #ffffff;
      color: var(--ink);
      text-align: left;
      box-shadow: 0 4px 12px rgba(20, 33, 61, 0.05);
    }

    .quick-card:hover,
    .quick-card:focus-visible {
      border-color: #b9d7f3;
      background: #f8fbff;
      outline: 0;
      box-shadow: 0 7px 18px rgba(29, 155, 240, 0.10);
    }

    .quick-card-copy {
      display: grid;
      gap: 4px;
      min-width: 0;
    }

    .quick-card-copy strong {
      font-size: 15px;
      line-height: 1.25;
    }

    .quick-card-copy small {
      color: var(--muted);
      font-size: 12px;
      font-weight: 600;
    }

    .quick-card-arrow {
      display: grid;
      place-items: center;
      flex: 0 0 30px;
      width: 30px;
      height: 30px;
      border-radius: 50%;
      background: var(--blue-soft);
      color: #126aa3;
      font-size: 17px;
      line-height: 1;
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
      grid-template-columns: minmax(140px, 1fr) minmax(165px, 1fr) minmax(190px, 1.15fr) minmax(105px, 0.65fr) minmax(180px, 1fr) minmax(175px, 0.72fr);
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

    .dashboard-activity .activity-feed {
      margin: 0;
      border: 1px solid #e3eaf3;
      border-radius: 8px;
      background: #ffffff;
      box-shadow: 0 5px 16px rgba(20, 33, 61, 0.06);
    }

    .dashboard-activity .activity-item {
      position: relative;
      padding: 15px 16px 15px 36px;
      border-top: 1px solid #edf1f6;
    }

    .dashboard-activity .activity-item::before {
      content: "";
      position: absolute;
      top: 20px;
      left: 17px;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--green);
      box-shadow: 0 0 0 4px var(--green-soft);
    }

    .dashboard-activity .activity-item strong {
      font-size: 14px;
      line-height: 1.35;
    }

    .dashboard-activity .empty-state {
      padding: 20px;
      background: #ffffff;
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
      width: fit-content;
      margin: 0 auto;
    }

    .action-menu summary {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      min-height: 44px;
      padding: 8px 9px 8px 16px;
      border-radius: 999px;
      border: 1px solid #171717;
      background: #171717;
      color: #ffffff;
      font-weight: 800;
      cursor: pointer;
      user-select: none;
      box-shadow: 0 5px 14px rgba(17, 17, 17, .14);
      transition: transform 160ms ease, background-color 180ms ease, box-shadow 180ms ease;
    }

    .action-menu summary::-webkit-details-marker {
      display: none;
    }

    .action-menu summary::after {
      content: "";
      width: 26px;
      height: 26px;
      flex: 0 0 26px;
      border-radius: 50%;
      background-color: #ffffff;
      background-image:
        linear-gradient(45deg, transparent 46%, #171717 47% 56%, transparent 57%),
        linear-gradient(135deg, transparent 46%, #171717 47% 56%, transparent 57%);
      background-position: 7px 10px, 13px 10px;
      background-size: 8px 8px;
      background-repeat: no-repeat;
      transition: transform 320ms cubic-bezier(.34, 1.56, .64, 1), background-color 180ms ease;
    }

    .action-menu summary:hover {
      background: #2b2b2b;
      box-shadow: 0 7px 18px rgba(17, 17, 17, .2);
      transform: translateY(-1px);
    }

    .action-menu summary:active {
      transform: scale(.985);
    }

    .action-menu[open] summary {
      background: #2b2b2b;
      color: #ffffff;
    }

    .action-menu[open] summary::after {
      transform: rotate(180deg);
      background-color: #ffffff;
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

    .postpilot-gallery {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(104px, 1fr));
      gap: 12px;
      margin-top: 12px;
    }

    .postpilot-gallery-item {
      position: relative;
      aspect-ratio: 1;
      overflow: hidden;
      border: 2px solid #e4edff;
      border-radius: 8px;
      background: #fff;
    }

    .postpilot-gallery-item img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .postpilot-gallery-item button {
      position: absolute;
      top: 5px;
      right: 5px;
      min-width: 28px;
      min-height: 28px;
      padding: 2px 7px;
      margin: 0;
      border-radius: 50%;
      background: #fff;
      color: #a61b1b;
      box-shadow: none;
      font-size: 16px;
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

    .client-grid > div {
      min-width: 0;
    }

    .inline-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .inline-actions > select,
    .inline-actions > input {
      flex: 1 1 auto;
      min-width: 0;
    }

    .inline-actions > button {
      width: auto;
      flex: 0 0 auto;
      margin-top: 0;
      white-space: nowrap;
    }

    .product-actions {
      margin-top: 10px;
    }

    .product-actions > button {
      flex: 1 1 0;
    }

    .client-grid input[type="date"] {
      display: block;
      width: 100%;
      min-width: 0;
      max-width: 100%;
      padding-right: 12px;
    }

    .date-field {
      min-width: 0;
      max-width: 100%;
      overflow: hidden;
    }

    .date-field input[type="date"] {
      inline-size: 100%;
      min-inline-size: 0;
      max-inline-size: 100%;
    }

    @supports (width: -webkit-fill-available) {
      .date-field input[type="date"] {
        width: -webkit-fill-available;
      }
    }

    .client-grid label,
    .client-form label {
      margin-top: 0;
    }

    .client-grid .full {
      grid-column: 1 / -1;
    }

    .form-section + .form-section {
      margin-top: 24px;
      padding-top: 24px;
      border-top: 1px solid var(--line);
    }

    .form-section-header {
      display: flex;
      align-items: flex-start;
      gap: 11px;
      margin-bottom: 17px;
    }

    .form-section-header > span {
      display: grid;
      place-items: center;
      flex: 0 0 28px;
      width: 28px;
      height: 28px;
      border: 1px solid #e3c8bd;
      border-radius: 6px;
      background: var(--accent-soft);
      color: #925139;
      font-size: 11px;
      font-weight: 750;
    }

    .form-section-header h2 {
      margin: 1px 0 2px;
      font-size: 16px;
    }

    .form-section-header p {
      margin: 0;
      font-size: 13px;
    }

    .form-grid-heading {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: 6px;
      padding-top: 18px;
      border-top: 1px solid var(--line);
    }

    .form-grid-heading:first-child {
      margin-top: 0;
      padding-top: 0;
      border-top: 0;
    }

    .form-grid-heading h3 {
      margin: 0;
    }

    .report-breakdown {
      margin-top: 14px;
      overflow-x: auto;
    }

    .report-breakdown table {
      width: 100%;
      border-collapse: collapse;
      background: #fff;
    }

    .report-breakdown th,
    .report-breakdown td {
      padding: 9px 10px;
      border-bottom: 1px solid #e7edf5;
      text-align: left;
      white-space: nowrap;
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

      .dashboard-metrics {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .dashboard-layout {
        grid-template-columns: 1fr;
      }

      .dashboard-workspace .quick-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
    }

    @media (max-width: 840px) {
      .quick-grid,
      .client-grid {
        grid-template-columns: 1fr;
      }

      .dashboard-workspace .quick-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
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
        align-items: center;
        flex-direction: row;
        flex-wrap: wrap;
        border-radius: 22px;
      }

      .topbar-menu {
        width: auto;
      }

      .topbar .topbar-tabs {
        order: 3;
        display: flex;
        flex: 1 0 100%;
        flex-wrap: nowrap;
        width: 100%;
        padding-bottom: 7px;
        overflow-x: auto;
      }

      .topbar .topbar-tabs .tab-button {
        width: auto;
        min-height: 44px;
      }

      .topbar-menu summary {
        width: auto;
        text-align: center;
      }

      .topbar-menu-list {
        left: auto;
        right: 0;
        min-width: 190px;
      }
      .topbar:has(.topbar-menu[open]) { z-index: 170; }

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

      .dashboard-refresh {
        width: auto;
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

      .dashboard-workspace {
        padding-top: 2px;
      }

      .dashboard-header {
        align-items: stretch;
        flex-direction: column;
        gap: 14px;
      }

      .dashboard-refresh {
        width: 100%;
      }

      .dashboard-workspace .quick-grid {
        grid-template-columns: 1fr;
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

    /* BuddyPilot 2026 interface */
    :root {
      font-family: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #f7f6f2;
      color: #2b2926;
      --ink: #2b2926;
      --muted: #716d66;
      --line: #dedbd4;
      --panel: #ffffff;
      --cream: #f7f6f2;
      --red: #d97757;
      --red-dark: #b95f43;
      --blue: #557f91;
      --blue-soft: #edf3f5;
      --yellow: #c79843;
      --yellow-soft: #f8f1df;
      --green: #4f8068;
      --green-soft: #edf5f0;
      --purple: #75658c;
      --purple-soft: #f2eff5;
      --surface-muted: #f1f0ec;
      --surface-hover: #f8f7f4;
      --accent-soft: #f6eae5;
      --danger: #b64f4f;
      --danger-soft: #fbefef;
      --shadow-sm: 0 1px 2px rgba(43, 41, 38, 0.05), 0 4px 14px rgba(43, 41, 38, 0.035);
    }

    html {
      min-width: 320px;
      background: var(--cream);
      scroll-behavior: smooth;
    }

    body {
      min-height: 100vh;
      background: var(--cream);
      color: var(--ink);
      font-size: 15px;
      line-height: 1.5;
    }

    ::selection {
      background: #ead1c7;
      color: var(--ink);
    }

    main {
      width: min(1440px, calc(100% - 32px));
      margin: 0 auto 48px;
      padding-top: 14px;
    }

    .icon {
      display: inline-block;
      width: 17px;
      height: 17px;
      flex: 0 0 auto;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.8;
      stroke-linecap: round;
      stroke-linejoin: round;
      pointer-events: none;
    }

    .topbar {
      position: sticky;
      top: 10px;
      z-index: 40;
      display: flex;
      align-items: center;
      gap: 18px;
      min-height: 62px;
      margin-bottom: 34px;
      padding: 9px 10px;
      border: 1px solid rgba(209, 205, 197, 0.92);
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.92);
      box-shadow: 0 5px 24px rgba(43, 41, 38, 0.07);
      backdrop-filter: blur(18px);
    }

    .brand {
      gap: 9px;
      padding-right: 5px;
      color: var(--ink);
      font-size: 17px;
      font-weight: 720;
      letter-spacing: 0;
      white-space: nowrap;
    }

    .brand img {
      width: 36px;
      height: 36px;
      border: 1px solid var(--line);
      border-radius: 7px;
      box-shadow: none;
    }

    .tabs,
    .subtabs {
      display: flex;
      gap: 4px;
      margin: 0;
    }

    .topbar-tabs {
      flex: 1 1 auto;
      flex-wrap: nowrap;
      min-width: 0;
      padding: 0;
      overflow-x: auto;
      scrollbar-width: none;
    }

    .topbar-tabs::-webkit-scrollbar,
    .subtabs::-webkit-scrollbar {
      display: none;
    }

    .tab-button,
    .subtab-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 7px;
      flex: 0 0 auto;
      min-height: 38px;
      margin: 0;
      padding: 8px 12px;
      border: 1px solid transparent;
      border-radius: 6px;
      background: transparent;
      color: #65615b;
      font-size: 14px;
      font-weight: 650;
      box-shadow: none;
      white-space: nowrap;
    }

    .tab-button:hover,
    .subtab-button:hover {
      background: var(--surface-muted);
      color: var(--ink);
    }

    .tab-button.active,
    .subtab-button.active {
      border-color: #ebd6cd;
      background: var(--accent-soft);
      color: #914f39;
      box-shadow: none;
    }

    .topbar-menu {
      flex: 0 0 auto;
      margin-left: 0;
    }

    .topbar-menu summary {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      min-height: 38px;
      margin: 0;
      padding: 8px 11px;
      border: 1px solid var(--line);
      border-radius: 6px;
      background: #fff;
      color: var(--ink);
      font-size: 14px;
      font-weight: 650;
      box-shadow: none;
    }

    .topbar-menu summary::after {
      margin-left: 1px;
      color: var(--muted);
      font-size: 12px;
    }

    .topbar-menu-list {
      top: calc(100% + 8px);
      min-width: 210px;
      padding: 6px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fff;
      box-shadow: 0 14px 38px rgba(43, 41, 38, 0.14);
    }

    .topbar-menu-list button {
      display: flex;
      align-items: center;
      gap: 9px;
      min-height: 38px;
      margin: 0;
      padding: 9px 10px;
      border-radius: 5px;
      color: var(--ink);
      font-weight: 600;
    }

    .topbar-menu-list button:hover,
    .topbar-menu-list button:focus-visible {
      background: var(--surface-muted);
    }

    .topbar-menu-list button.logout-option {
      color: var(--danger);
    }

    .tab-panel > .card,
    .tab-panel > .app-panel {
      padding: 0;
      border: 0;
      border-radius: 0;
      background: transparent;
      box-shadow: none;
    }

    .tab-panel {
      max-width: 100%;
    }

    .hero,
    .tab-panel > .card > .section-heading:first-child {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 24px;
      margin-bottom: 24px;
    }

    h1,
    h2,
    h3 {
      color: var(--ink);
      letter-spacing: 0;
    }

    h1 {
      margin: 0 0 7px;
      font-size: 34px;
      line-height: 1.12;
      font-weight: 700;
    }

    h2 {
      margin: 0 0 7px;
      font-size: 21px;
      line-height: 1.25;
      font-weight: 680;
    }

    h3 {
      margin: 0 0 6px;
      font-size: 16px;
      font-weight: 680;
    }

    p {
      margin: 0 0 12px;
      color: var(--muted);
      line-height: 1.55;
    }

    .note {
      color: var(--muted);
      font-size: 13px;
    }

    .subtabs {
      width: fit-content;
      max-width: 100%;
      margin: 0 0 22px;
      padding: 4px;
      overflow-x: auto;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--surface-muted);
      scrollbar-width: none;
    }

    .subtab-button {
      min-height: 34px;
      padding: 7px 11px;
      font-size: 13px;
    }

    .subtab-button.active {
      border-color: var(--line);
      background: #fff;
      color: var(--ink);
      box-shadow: 0 1px 3px rgba(43, 41, 38, 0.07);
    }

    label {
      margin: 0 0 7px;
      color: #4f4b45;
      font-size: 13px;
      font-weight: 650;
    }

    input,
    select,
    textarea {
      width: 100%;
      border: 1px solid #d5d1ca;
      border-radius: 6px;
      padding: 10px 12px;
      background: #fff;
      color: var(--ink);
      font: inherit;
      box-shadow: 0 1px 1px rgba(43, 41, 38, 0.02);
      outline: 0;
    }

    input,
    select {
      min-height: 42px;
    }

    textarea {
      min-height: 104px;
      resize: vertical;
      line-height: 1.55;
    }

    input:hover,
    select:hover,
    textarea:hover {
      border-color: #bdb8b0;
    }

    input:focus,
    select:focus,
    textarea:focus {
      border-color: #b96549;
      box-shadow: 0 0 0 3px rgba(217, 119, 87, 0.14);
    }

    input::placeholder,
    textarea::placeholder {
      color: #9a968f;
    }

    input[type="checkbox"] {
      width: 18px;
      height: 18px;
      min-height: 0;
      margin: 0;
      accent-color: var(--red);
    }

    input[type="file"] {
      padding: 5px;
      color: var(--muted);
    }

    input[type="file"]::file-selector-button {
      min-height: 32px;
      margin-right: 10px;
      padding: 6px 10px;
      border: 1px solid var(--line);
      border-radius: 5px;
      background: var(--surface-muted);
      color: var(--ink);
      font: inherit;
      font-size: 13px;
      font-weight: 650;
      cursor: pointer;
    }

    .check-row {
      min-height: 42px;
      gap: 9px;
      margin: 0;
      font-size: 14px;
      font-weight: 600;
    }

    button,
    .link-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 7px;
      min-height: 40px;
      margin: 0;
      padding: 9px 14px;
      border: 1px solid transparent;
      border-radius: 6px;
      background: var(--red);
      color: #fff;
      font: inherit;
      font-size: 14px;
      font-weight: 680;
      line-height: 1.2;
      text-decoration: none;
      box-shadow: none;
      cursor: pointer;
      transition: background-color 140ms ease, border-color 140ms ease, color 140ms ease, opacity 140ms ease;
    }

    button:hover,
    .link-button:hover {
      background: var(--red-dark);
    }

    button:not(:disabled):active {
      transform: none;
    }

    button:focus-visible,
    .link-button:focus-visible,
    summary:focus-visible {
      outline: 3px solid rgba(217, 119, 87, 0.24);
      outline-offset: 2px;
    }

    button.secondary,
    .link-button {
      border-color: var(--line);
      background: #fff;
      color: var(--ink);
      box-shadow: none;
    }

    button.secondary:hover,
    .link-button:hover {
      border-color: #c8c3bb;
      background: var(--surface-hover);
    }

    button.approve {
      background: var(--green);
      box-shadow: none;
    }

    button.approve:hover {
      background: #3f6d58;
    }

    button.regenerate {
      background: #557f91;
      box-shadow: none;
    }

    button.regenerate:hover {
      background: #456e80;
    }

    button.danger,
    .action-menu-list button.danger {
      border-color: #efd0d0;
      background: var(--danger-soft);
      color: var(--danger);
      box-shadow: none;
    }

    button:disabled {
      opacity: 0.48;
      cursor: not-allowed;
    }

    button.button-success {
      animation: none;
      background: var(--green) !important;
      box-shadow: none;
    }

    .actions,
    .client-form-actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      margin-top: 18px;
    }

    .actions button,
    .client-form-actions button {
      width: auto;
      margin: 0;
    }

    .client-form,
    #postForm,
    .saved-viral-panel {
      margin-top: 0;
      padding: 22px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fff;
      box-shadow: var(--shadow-sm);
    }

    .client-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 18px;
    }

    .client-grid > div {
      min-width: 0;
    }

    .client-grid .full {
      grid-column: 1 / -1;
    }

    .client-grid .full > h3,
    .client-grid > .full h3 {
      margin-top: 5px;
      padding-top: 18px;
      border-top: 1px solid var(--line);
    }

    .client-form textarea {
      min-height: 94px;
    }

    #postForm {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px 18px;
    }

    #postForm > label,
    #postForm > input,
    #postForm > textarea,
    #postForm > button {
      min-width: 0;
    }

    #postForm > label {
      align-self: end;
      margin-top: 8px;
    }

    #postForm > textarea,
    #postForm > button,
    #postForm > label[for="caption_note"],
    #postForm > label[for="custom_caption"],
    #postForm > label[for="first_comment"] {
      grid-column: 1 / -1;
    }

    #postForm > button {
      justify-self: start;
      margin-top: 10px;
    }

    .preview {
      margin-top: 22px;
      padding: 22px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fff;
      box-shadow: var(--shadow-sm);
    }

    .preview.show {
      display: block;
    }

    .preview-box {
      padding: 14px;
      border: 1px solid var(--line);
      border-radius: 6px;
      background: var(--surface-muted);
    }

    .result {
      margin-top: 14px;
      padding: 12px 13px;
      border-radius: 6px;
      font-size: 14px;
    }

    .result.ok {
      border: 1px solid #c7dfd1;
      background: var(--green-soft);
      color: #315d49;
    }

    .result.err {
      border: 1px solid #ecc9c9;
      background: var(--danger-soft);
      color: #8f3f3f;
    }

    .hook-image-preview {
      gap: 11px;
      margin-top: 10px;
    }

    .hook-image-preview img {
      width: 72px;
      height: 72px;
      border: 1px solid var(--line);
      border-radius: 7px;
    }

    .postpilot-gallery {
      grid-template-columns: repeat(auto-fill, minmax(92px, 1fr));
      gap: 8px;
      margin-top: 12px;
    }

    .postpilot-gallery-item {
      border: 1px solid var(--line);
      border-radius: 7px;
    }

    .postpilot-gallery-item button {
      width: 28px;
      min-width: 28px;
      min-height: 28px;
      padding: 0;
      border: 1px solid var(--line);
      border-radius: 50%;
      background: #fff;
      color: var(--danger);
      box-shadow: 0 2px 7px rgba(43, 41, 38, 0.12);
    }

    .viral-post-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 12px;
      margin-top: 18px;
    }

    .viral-post-card {
      min-width: 0;
      padding: 16px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fff;
      box-shadow: none;
    }

    .viral-post-card.favorite {
      border-color: #d7b977;
      background: #fffcf4;
    }

    .viral-post-text {
      margin: 0 0 12px;
      color: var(--ink);
      font-weight: 500;
      line-height: 1.58;
    }

    .viral-meta {
      gap: 6px;
      margin-bottom: 12px;
      font-size: 12px;
      font-weight: 600;
    }

    .viral-meta span {
      padding: 4px 7px;
      border: 1px solid var(--line);
      border-radius: 5px;
      background: var(--surface-muted);
    }

    .saved-viral-panel {
      margin-top: 22px;
    }

    .viral-toolbar {
      gap: 14px;
      margin-top: 16px;
    }

    .tool-card {
      margin-top: 18px;
    }

    .panel-header {
      padding: 0;
    }

    .panel-toggle {
      width: 34px;
      height: 34px;
      min-height: 34px;
      border: 1px solid var(--line);
      border-radius: 6px;
      background: #fff;
      color: var(--ink);
      box-shadow: none;
    }

    .client-list,
    .bank-list,
    .activity-feed,
    .invoice-list {
      margin-top: 16px;
      overflow: hidden;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fff;
      box-shadow: var(--shadow-sm);
    }

    .client-row,
    .bank-row,
    .invoice-row {
      border-top: 1px solid #ebe8e2;
    }

    .client-row {
      gap: 14px;
      padding: 13px 14px;
    }

    .client-row.header,
    .invoice-row.header {
      background: var(--surface-muted);
      color: #55514b;
      font-size: 12px;
      font-weight: 680;
      text-transform: none;
    }

    .bank-row {
      padding: 13px 14px;
    }

    .default-pill,
    .qr-pill {
      margin-top: 6px;
      padding: 3px 7px;
      border: 1px solid #d0e2d6;
      border-radius: 5px;
      background: var(--green-soft);
      color: #3c6753;
      font-size: 11px;
      font-weight: 680;
    }

    .qr-pill {
      border-color: #ded6e7;
      background: var(--purple-soft);
      color: #665477;
    }

    .asset-preview {
      gap: 12px;
      margin-top: 10px;
      padding: 10px;
      border: 1px solid var(--line);
      border-radius: 7px;
      background: var(--surface-muted);
    }

    .asset-preview img {
      border: 1px solid var(--line);
      border-radius: 6px;
    }

    .action-menu summary {
      min-height: 44px;
      padding: 8px 9px 8px 16px;
      border: 1px solid #171717;
      border-radius: 999px;
      background: #171717;
      color: #ffffff;
      box-shadow: 0 5px 14px rgba(17, 17, 17, .14);
    }

    .action-menu-list {
      padding: 5px;
      border: 1px solid var(--line);
      border-radius: 8px;
      box-shadow: 0 12px 30px rgba(43, 41, 38, 0.13);
    }

    .action-menu-list button {
      min-height: 36px;
      padding: 8px 10px;
      border-radius: 5px;
      font-size: 13px;
    }

    .toolbar {
      display: flex;
      flex-wrap: wrap;
      align-items: end;
      gap: 10px;
      margin-top: 18px;
      padding: 16px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fff;
    }

    .toolbar label {
      margin-bottom: 7px;
    }

    .invoice-list {
      overflow-x: auto;
    }

    .invoice-row {
      padding: 11px 12px;
    }

    .money-input {
      border-radius: 5px;
      padding: 8px 9px;
    }

    .report-breakdown {
      margin-top: 18px;
      overflow-x: auto;
      border: 1px solid var(--line);
      border-radius: 8px;
    }

    .report-breakdown table {
      background: #fff;
    }

    .report-breakdown th,
    .report-breakdown td {
      padding: 10px 12px;
      border-bottom: 1px solid #ebe8e2;
    }

    .empty-state {
      padding: 20px;
      background: #fff;
      color: var(--muted);
    }

    .dashboard-workspace {
      padding: 0;
    }

    .dashboard-header {
      margin-bottom: 24px;
    }

    .dashboard-header h1 {
      font-size: 34px;
    }

    .dashboard-refresh {
      min-height: 40px;
      padding: 9px 13px;
      border: 1px solid var(--line);
      border-radius: 6px;
      background: #fff;
      color: var(--ink);
      box-shadow: none;
    }

    .dashboard-refresh:hover {
      background: var(--surface-hover);
    }

    .dashboard-metrics {
      gap: 12px;
      margin-bottom: 28px;
    }

    .dashboard-metric {
      padding: 17px;
      border: 1px solid var(--line);
      border-radius: 8px;
      box-shadow: var(--shadow-sm);
    }

    .dashboard-metric::before {
      width: 3px;
    }

    .dashboard-metric-value {
      margin: 8px 0 5px;
      font-size: 27px;
    }

    .dashboard-layout {
      gap: 24px;
    }

    .dashboard-section-header h2 {
      font-size: 19px;
    }

    .quick-grid {
      gap: 9px;
    }

    .quick-card {
      min-height: 68px;
      padding: 13px 14px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fff;
      box-shadow: var(--shadow-sm);
    }

    .quick-card:hover,
    .quick-card:focus-visible {
      border-color: #d7bdb3;
      background: #fffaf8;
      box-shadow: var(--shadow-sm);
    }

    .quick-card-icon,
    .quick-card-arrow {
      display: grid;
      place-items: center;
      flex: 0 0 32px;
      width: 32px;
      height: 32px;
      border-radius: 6px;
      background: var(--accent-soft);
      color: #9a543d;
    }

    .quick-card-arrow {
      flex-basis: 28px;
      width: 28px;
      height: 28px;
      background: var(--surface-muted);
      color: var(--muted);
    }

    .quick-card-copy {
      flex: 1 1 auto;
    }

    .dashboard-activity .activity-feed {
      border: 1px solid var(--line);
      border-radius: 8px;
      box-shadow: var(--shadow-sm);
    }

    .dashboard-activity .activity-item {
      border-top: 1px solid #ebe8e2;
    }

    .dashboard-activity .activity-item::before {
      background: var(--red);
      box-shadow: 0 0 0 3px var(--accent-soft);
    }

    @media (max-width: 1100px) {
      main {
        width: min(100% - 24px, 960px);
      }

      .dashboard-layout {
        grid-template-columns: 1fr;
      }

      .dashboard-workspace .quick-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
    }

    @media (max-width: 840px) {
      main {
        width: min(100% - 20px, 760px);
        margin-bottom: 28px;
        padding-top: 8px;
      }

      .topbar {
        top: 6px;
        flex-direction: row;
        flex-wrap: wrap;
        gap: 8px;
        margin-bottom: 26px;
        padding: 8px;
      }

      .topbar .topbar-tabs {
        order: 3;
        display: flex;
        flex: 1 0 100%;
        flex-wrap: nowrap;
        width: 100%;
        padding-bottom: 2px;
        overflow-x: auto;
      }

      .topbar .topbar-tabs .tab-button {
        width: auto;
        min-height: 36px;
      }

      .topbar-menu {
        width: auto;
        margin-left: auto;
      }

      .topbar-menu summary {
        width: auto;
      }

      .tabs,
      .subtabs {
        display: flex;
      }

      .subtabs {
        flex-wrap: nowrap;
      }

      .tab-button,
      .subtab-button,
      button {
        width: auto;
        min-height: 38px;
      }

      .client-grid,
      #postForm {
        grid-template-columns: 1fr;
      }

      #postForm > label,
      #postForm > input,
      #postForm > textarea,
      #postForm > button {
        grid-column: 1;
      }

      .client-form,
      #postForm,
      .saved-viral-panel,
      .preview {
        padding: 18px;
      }

      .section-heading {
        align-items: flex-start;
        flex-direction: row;
      }

      .client-list,
      .invoice-list {
        overflow-x: auto;
      }

      .client-row {
        grid-template-columns: minmax(140px, 1fr) minmax(165px, 1fr) minmax(190px, 1.15fr) minmax(105px, .65fr) minmax(180px, 1fr) minmax(175px, .72fr);
        min-width: 1050px;
      }

      .client-row.header {
        display: grid;
      }

      .client-row:not(.header) > div::before {
        display: none;
      }

      .invoice-row {
        grid-template-columns: minmax(92px, .62fr) minmax(145px, 1.15fr) minmax(128px, 1fr) minmax(105px, .75fr) minmax(95px, .65fr) minmax(100px, .75fr) minmax(110px, auto);
        min-width: 900px;
      }

      .invoice-row.header {
        display: grid;
      }

      .receipt-list .invoice-row {
        grid-template-columns: minmax(110px, .7fr) minmax(145px, 1.2fr) minmax(150px, 1fr) minmax(110px, .8fr) minmax(130px, auto);
        min-width: 720px;
      }

      .toolbar {
        display: flex;
      }

      .action-menu {
        width: auto;
      }

      .action-menu summary,
      .action-menu-list button {
        width: auto;
        text-align: left;
      }

      .actions button,
      .client-form-actions button {
        flex: 1 1 160px;
        width: auto;
      }
    }

    @media (max-width: 560px) {
      main {
        width: calc(100% - 16px);
      }

      .brand span {
        font-size: 15px;
      }

      h1,
      .dashboard-header h1 {
        font-size: 29px;
      }

      .hero,
      .tab-panel > .card > .section-heading:first-child,
      .dashboard-header {
        align-items: stretch;
        flex-direction: column;
        gap: 12px;
      }

      .dashboard-refresh {
        width: 100%;
      }

      .dashboard-metrics {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
      }

      .dashboard-metric {
        padding: 14px;
      }

      .dashboard-metric-value {
        font-size: 22px;
      }

      .dashboard-workspace .quick-grid,
      .viral-post-grid {
        grid-template-columns: 1fr;
      }

      .client-form,
      #postForm,
      .saved-viral-panel,
      .preview {
        padding: 15px;
      }

      .toolbar {
        display: grid;
        grid-template-columns: 1fr;
        padding: 14px;
      }

      .toolbar > *,
      .toolbar button,
      #postForm > button {
        width: 100%;
      }

      .section-heading {
        align-items: stretch;
        flex-direction: column;
      }
    }

    /* YouTube-inspired application shell */
    :root {
      font-family: Arial, Helvetica, ui-sans-serif, system-ui, -apple-system, sans-serif;
      background: #f9f9f9;
      color: #0f0f0f;
      --ink: #0f0f0f;
      --muted: #606060;
      --line: #e5e5e5;
      --panel: #ffffff;
      --cream: #f9f9f9;
      --red: #ff0033;
      --red-dark: #d9002b;
      --blue: #065fd4;
      --blue-soft: #def1ff;
      --yellow: #a76800;
      --yellow-soft: #fff4d5;
      --green: #16845b;
      --green-soft: #e8f5ef;
      --purple: #76529b;
      --purple-soft: #f4eff9;
      --surface-muted: #f2f2f2;
      --surface-hover: #e5e5e5;
      --accent-soft: #ffe5ea;
      --danger: #c5221f;
      --danger-soft: #fce8e6;
      --shadow-sm: none;
    }

    html,
    body {
      background: var(--cream);
      color: var(--ink);
      overflow-x: hidden;
    }

    body {
      font-size: 14px;
    }

    ::selection {
      background: #ffd5dd;
      color: var(--ink);
    }

    main {
      width: 100%;
      max-width: none;
      margin: 0 0 56px;
      padding: 0;
    }

    .topbar {
      top: 0;
      gap: 20px;
      min-height: 64px;
      margin: 0 0 28px;
      padding: 10px max(20px, calc((100vw - 1400px) / 2));
      border: 0;
      border-bottom: 1px solid var(--line);
      border-radius: 0;
      background: rgba(255, 255, 255, 0.98);
      box-shadow: none;
      backdrop-filter: blur(12px);
    }

    .brand {
      gap: 10px;
      padding-right: 8px;
      font-size: 19px;
      font-weight: 700;
    }

    .brand img {
      width: 38px;
      height: 38px;
      border: 0;
      border-radius: 8px;
    }

    .topbar-tabs {
      gap: 2px;
    }

    .topbar-tabs .tab-button {
      min-height: 42px;
      padding: 8px 13px;
      border: 0;
      border-radius: 8px;
      color: #3f3f3f;
      font-size: 14px;
      font-weight: 600;
    }

    .topbar-tabs .tab-button:hover {
      background: #f2f2f2;
      color: var(--ink);
    }

    .topbar-tabs .tab-button.active {
      border: 0;
      background: #f2f2f2;
      color: var(--red);
    }

    .topbar-tabs .tab-button .icon {
      width: 19px;
      height: 19px;
      stroke-width: 2;
    }

    .topbar-menu summary {
      min-height: 40px;
      padding: 8px 12px;
      border-color: var(--line);
      border-radius: 8px;
      background: #fff;
    }

    .topbar-menu summary:hover {
      background: #f2f2f2;
    }

    .topbar-menu-list {
      border-color: var(--line);
      box-shadow: 0 8px 24px rgba(15, 15, 15, 0.12);
    }

    .tab-panel {
      width: min(1400px, calc(100% - 40px));
      margin: 0 auto;
    }

    h1,
    .dashboard-header h1 {
      font-size: clamp(28px, 3vw, 38px);
      font-weight: 700;
    }

    h2 {
      font-size: 20px;
      font-weight: 700;
    }

    h3 {
      font-weight: 700;
    }

    p,
    .note {
      color: var(--muted);
    }

    .subtabs {
      gap: 3px;
      margin-bottom: 24px;
      padding: 4px;
      border: 0;
      border-radius: 8px;
      background: #ededed;
    }

    .subtab-button {
      min-height: 36px;
      border: 0;
      border-radius: 6px;
      color: #3f3f3f;
      font-weight: 600;
    }

    .subtab-button.active {
      border: 0;
      background: #fff;
      color: var(--ink);
      box-shadow: 0 1px 2px rgba(15, 15, 15, 0.08);
    }

    label {
      color: #3f3f3f;
      font-weight: 600;
    }

    input,
    select,
    textarea {
      border-color: #d3d3d3;
      border-radius: 8px;
      box-shadow: none;
    }

    input:hover,
    select:hover,
    textarea:hover {
      border-color: #a9a9a9;
    }

    input:focus,
    select:focus,
    textarea:focus {
      border-color: var(--blue);
      box-shadow: 0 0 0 1px var(--blue);
    }

    input[type="file"]::file-selector-button {
      border: 0;
      border-radius: 6px;
      background: #f2f2f2;
    }

    button,
    .link-button {
      min-height: 40px;
      border-radius: 8px;
      background: var(--red);
      font-weight: 700;
    }

    button:hover,
    .link-button:hover {
      background: var(--red-dark);
    }

    button:focus-visible,
    .link-button:focus-visible,
    summary:focus-visible {
      outline-color: rgba(6, 95, 212, 0.32);
    }

    button.secondary,
    .link-button {
      border-color: transparent;
      background: #f2f2f2;
      color: var(--ink);
    }

    button.secondary:hover,
    .link-button:hover {
      border-color: transparent;
      background: #e5e5e5;
    }

    button.regenerate {
      background: var(--blue);
    }

    button.regenerate:hover {
      background: #004ea8;
    }

    .client-form,
    #postForm,
    .saved-viral-panel,
    .preview,
    .toolbar,
    .client-list,
    .bank-list,
    .activity-feed,
    .invoice-list,
    .report-breakdown,
    .viral-post-card,
    .dashboard-metric,
    .quick-card,
    .dashboard-activity .activity-feed {
      border-color: var(--line);
      border-radius: 8px;
      background: #fff;
      box-shadow: none;
    }

    .client-form,
    #postForm,
    .saved-viral-panel,
    .preview {
      padding: 20px;
    }

    .preview-box,
    .client-row.header,
    .invoice-row.header,
    .viral-meta span {
      background: #f7f7f7;
    }

    .dashboard-metrics {
      gap: 10px;
    }

    .dashboard-metric {
      padding: 16px;
    }

    .dashboard-metric::before {
      background: var(--red);
    }

    .dashboard-metric-value {
      color: var(--ink);
    }

    .quick-card {
      min-height: 72px;
    }

    .quick-card:hover,
    .quick-card:focus-visible {
      border-color: #d3d3d3;
      background: #f7f7f7;
    }

    .quick-card-icon {
      background: #ffe5ea;
      color: var(--red);
    }

    .quick-card-arrow {
      background: #f2f2f2;
      color: #606060;
    }

    .dashboard-activity .activity-item::before {
      background: var(--red);
      box-shadow: 0 0 0 3px #ffe5ea;
    }

    @media (max-width: 840px) {
      main {
        width: 100%;
        max-width: none;
        margin-bottom: 40px;
        padding: 0;
      }

      .topbar {
        top: 0;
        flex-wrap: nowrap;
        gap: 10px;
        margin-bottom: 22px;
        padding: 8px 12px;
        border-radius: 0;
      }

      .topbar .topbar-tabs {
        order: initial;
        flex: 1 1 auto;
        width: auto;
        padding: 0;
      }

      .tab-panel {
        width: calc(100% - 24px);
      }
    }

    @media (max-width: 600px) {
      html {
        scroll-padding-top: calc(64px + env(safe-area-inset-top));
      }

      body {
        padding-bottom: calc(70px + env(safe-area-inset-bottom));
        font-size: 14px;
      }

      main {
        margin-bottom: 0;
      }

      .topbar {
        min-height: calc(58px + env(safe-area-inset-top));
        padding: max(8px, env(safe-area-inset-top)) 12px 8px;
        background: #fff;
        backdrop-filter: none;
      }

      .brand {
        gap: 8px;
        padding: 0;
        font-size: 17px;
      }

      .brand img {
        width: 34px;
        height: 34px;
      }

      .topbar-menu {
        margin-left: auto;
      }

      .topbar-menu summary {
        display: grid;
        place-items: center;
        width: 44px;
        min-width: 44px;
        height: 44px;
        min-height: 44px;
        padding: 0;
        border: 0;
        border-radius: 50%;
        background: transparent;
        box-shadow: none;
        line-height: 0;
      }

      .topbar-menu summary:hover,
      .topbar-menu summary:focus-visible,
      .topbar-menu summary:active,
      .topbar-menu[open] summary {
        background: transparent;
        box-shadow: none;
      }

      .topbar-menu summary .icon {
        display: block;
        width: 24px;
        height: 24px;
        margin: 0;
      }

      .topbar-menu summary span {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip: rect(0 0 0 0);
        white-space: nowrap;
      }

      .topbar-menu summary::after {
        display: none;
      }

      .topbar-menu-list {
        position: fixed;
        top: calc(56px + env(safe-area-inset-top));
        right: 10px;
        left: auto;
        width: min(260px, calc(100% - 20px));
      }

      .topbar .topbar-tabs {
        position: fixed;
        inset: auto 0 0;
        z-index: 80;
        display: grid;
        grid-template-columns: repeat(5, minmax(0, 1fr));
        gap: 0;
        width: 100%;
        min-width: 0;
        height: calc(64px + env(safe-area-inset-bottom));
        padding: 4px 2px env(safe-area-inset-bottom);
        overflow: visible;
        border-top: 1px solid var(--line);
        background: rgba(255, 255, 255, 0.98);
        box-shadow: 0 -1px 8px rgba(15, 15, 15, 0.06);
        backdrop-filter: blur(14px);
      }

      .topbar .topbar-tabs .tab-button {
        flex-direction: column;
        gap: 2px;
        width: 100%;
        min-width: 0;
        min-height: 56px;
        padding: 5px 1px 4px;
        border-radius: 0;
        background: transparent;
        color: #606060;
        font-size: 10px;
        font-weight: 600;
        line-height: 1.05;
      }

      .topbar .topbar-tabs .tab-button:hover {
        background: transparent;
      }

      .topbar .topbar-tabs .tab-button.active {
        background: transparent;
        color: var(--red);
      }

      .topbar .topbar-tabs .tab-button .icon {
        width: 22px;
        height: 22px;
      }

      .topbar .topbar-tabs .tab-button span {
        display: block;
        width: 100%;
        overflow: hidden;
        text-align: center;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .tab-panel {
        width: calc(100% - 24px);
      }

      h1,
      .dashboard-header h1 {
        font-size: 28px;
      }

      h2 {
        font-size: 19px;
      }

      input,
      select,
      textarea {
        min-height: 44px;
        font-size: 16px;
      }

      button,
      .link-button,
      .tab-button,
      .subtab-button {
        min-height: 44px;
      }

      .subtabs {
        width: 100%;
        margin-bottom: 18px;
      }

      .subtab-button {
        flex: 1 0 auto;
      }

      .postpilot-subtabs {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        overflow: visible;
      }

      .postpilot-subtabs .subtab-button {
        width: 100%;
        min-width: 0;
        min-height: 54px;
        padding: 6px 4px;
        font-size: 11px;
        line-height: 1.2;
        overflow-wrap: anywhere;
        white-space: normal;
      }

      .client-form,
      #postForm,
      .saved-viral-panel,
      .preview,
      .toolbar {
        padding: 14px;
      }

      .toolbar {
        width: 100%;
        min-width: 0;
        max-width: 100%;
        overflow: hidden;
      }

      .toolbar > div {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        width: 100%;
        min-width: 0;
        max-width: 100%;
      }

      #invoicePeriod,
      #receiptPeriod {
        display: block;
        width: 100% !important;
        min-width: 0 !important;
        max-width: 100% !important;
        inline-size: 100% !important;
        min-inline-size: 0 !important;
        max-inline-size: 100% !important;
        -webkit-appearance: none;
        appearance: none;
      }

      .dashboard-metrics {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .dashboard-workspace,
      .dashboard-layout,
      .dashboard-actions,
      .dashboard-activity,
      .quick-grid,
      .dashboard-activity .activity-feed {
        width: 100%;
        min-width: 0;
        max-width: 100%;
      }

      .dashboard-workspace,
      .dashboard-layout,
      .dashboard-actions,
      .dashboard-activity {
        overflow: hidden;
      }

      .dashboard-metric {
        min-width: 0;
        padding: 13px;
      }

      .dashboard-metric-label,
      .dashboard-metric-note {
        overflow-wrap: anywhere;
      }

      .dashboard-workspace .quick-grid,
      .viral-post-grid {
        grid-template-columns: 1fr;
      }

      .quick-card {
        width: 100%;
        min-width: 0;
        max-width: 100%;
        min-height: 64px;
        overflow: hidden;
      }

      .quick-card-copy,
      .quick-card-copy strong,
      .quick-card-copy small,
      .dashboard-activity .activity-item,
      .dashboard-activity .activity-item strong,
      .dashboard-activity .activity-item span {
        min-width: 0;
        max-width: 100%;
        overflow-wrap: anywhere;
        word-break: break-word;
      }

      .quick-card-copy strong,
      .quick-card-copy small {
        display: block;
      }

      .dashboard-activity .activity-feed {
        overflow: hidden;
      }

      .actions,
      .client-form-actions {
        display: grid;
        grid-template-columns: 1fr;
      }

      .actions button,
      .client-form-actions button,
      #postForm > button {
        width: 100%;
      }

      .postpilot-gallery {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }

      .viral-toolbar {
        display: grid;
        grid-template-columns: 1fr;
      }

      .viral-toolbar > *,
      .viral-toolbar button {
        width: 100%;
      }
    }

    /* Native-app motion */
    @keyframes bp-view-in {
      from {
        opacity: 0;
        transform: translate3d(0, 8px, 0);
      }
      to {
        opacity: 1;
        transform: translate3d(0, 0, 0);
      }
    }

    @keyframes bp-menu-in {
      from {
        opacity: 0;
        transform: translate3d(0, -6px, 0) scale(0.98);
      }
      to {
        opacity: 1;
        transform: translate3d(0, 0, 0) scale(1);
      }
    }

    @keyframes bp-tab-pop {
      0% { transform: scale(0.88); }
      65% { transform: scale(1.08); }
      100% { transform: scale(1); }
    }

    body {
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    .tab-panel.active,
    .subtab-panel.active {
      animation: bp-view-in 280ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
      transform-origin: top center;
    }

    .topbar-menu[open] .topbar-menu-list,
    .action-menu[open] .action-menu-list {
      animation: bp-menu-in 200ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
      transform-origin: top right;
    }

    button,
    .link-button,
    summary,
    input,
    select,
    textarea,
    .quick-card,
    .dashboard-metric,
    .viral-post-card {
      transition:
        color 180ms ease,
        background-color 180ms ease,
        border-color 180ms ease,
        box-shadow 180ms ease,
        opacity 180ms ease,
        transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1);
    }

    button,
    .link-button,
    summary,
    .quick-card,
    .tab-button,
    .subtab-button {
      -webkit-tap-highlight-color: transparent;
      touch-action: manipulation;
    }

    button:not(:disabled):active,
    .link-button:active,
    summary:active,
    .quick-card:active {
      transform: scale(0.975);
      transition-duration: 80ms;
    }

    .tab-button.active .icon {
      animation: bp-tab-pop 260ms cubic-bezier(0.2, 0.8, 0.2, 1);
    }

    .result.ok,
    .result.err,
    .preview.show {
      animation: bp-view-in 240ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
    }

    .remote-automation-panel {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 14px;
      align-items: center;
      margin: 18px 0;
      padding: 14px 16px;
      border: 1px solid var(--border, #e5e5e5);
      border-radius: 8px;
      background: #fff;
    }

    .remote-automation-heading,
    .remote-automation-status,
    .remote-automation-job {
      margin: 0;
    }

    .remote-automation-heading {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 800;
    }

    .remote-automation-status,
    .remote-automation-job {
      margin-top: 5px;
      color: #606060;
      font-size: 13px;
    }

    .remote-status-dot {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      background: #a3a3a3;
      box-shadow: 0 0 0 3px #f1f1f1;
    }

    .remote-status-dot.online { background: #16a34a; box-shadow: 0 0 0 3px #dcfce7; }
    .remote-status-dot.busy { background: #d97706; box-shadow: 0 0 0 3px #fef3c7; }
    .remote-status-dot.offline { background: #737373; box-shadow: 0 0 0 3px #e5e5e5; }

    .remote-automation-actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 8px;
    }

    .remote-pair-code {
      display: inline-block;
      margin-top: 8px;
      padding: 6px 9px;
      border: 1px dashed #a3a3a3;
      border-radius: 6px;
      font: 800 18px/1 ui-monospace, SFMono-Regular, Menlo, monospace;
      letter-spacing: 2px;
      color: #171717;
      background: #fafafa;
    }

    .remote-automation-panel button {
      min-height: 38px;
      padding: 8px 12px;
    }

    .topbar-tabs,
    .subtabs,
    .client-list,
    .invoice-list,
    .report-breakdown {
      -webkit-overflow-scrolling: touch;
      overscroll-behavior-inline: contain;
    }

    @media (max-width: 600px) {
      .remote-automation-panel {
        grid-template-columns: 1fr;
      }

      .remote-automation-actions {
        justify-content: stretch;
      }

      .remote-automation-actions button {
        flex: 1 1 auto;
      }

      .topbar .topbar-tabs {
        transform: translateZ(0);
        will-change: transform;
      }

      .topbar .topbar-tabs .tab-button.active .icon {
        animation-duration: 300ms;
      }

      #client-list-panel .actions {
        margin-bottom: 12px;
      }

      #client-list-panel .actions > button {
        width: 100%;
      }

      .client-list {
        display: grid;
        gap: 10px;
        margin-top: 0;
        overflow: visible;
        border: 0;
        border-radius: 0;
        background: transparent;
        box-shadow: none;
      }

      .client-row.header {
        display: none;
      }

      .client-row:not(.header) {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 10px 14px;
        min-width: 0;
        padding: 14px;
        border: 1px solid var(--line);
        border-radius: 10px;
        background: #fff;
        box-shadow: var(--shadow-sm);
      }

      .client-row:not(.header) > div::before {
        display: none;
      }

      .client-card-brand {
        display: grid;
        grid-column: 1 / -1;
        grid-template-columns: minmax(0, 1fr) auto;
        column-gap: 10px;
        align-items: start;
      }

      .client-card-brand .invoice-client {
        font-size: 16px;
        line-height: 1.25;
      }

      .client-card-brand > .invoice-muted {
        grid-column: 1;
        margin-top: 2px;
        font-size: 12px;
      }

      .client-card-brand > .default-pill,
      .client-card-brand > .qr-pill {
        grid-column: 2;
        grid-row: 1 / span 2;
        align-self: center;
        margin: 0;
      }

      .client-card-identity {
        grid-column: 1 / -1;
        padding-bottom: 9px;
        border-bottom: 1px solid #efede8;
        font-size: 14px;
        font-weight: 650;
      }

      .client-card-identity .invoice-muted,
      .client-card-contact .invoice-muted {
        margin-top: 2px;
        font-size: 12px;
        font-weight: 500;
      }

      .client-card-contact,
      .client-card-price,
      .client-card-telegram {
        font-size: 13px;
      }

      .client-card-contact::before,
      .client-card-price::before,
      .client-card-telegram::before {
        content: attr(data-label) !important;
        display: block !important;
        margin-bottom: 3px;
        color: var(--muted);
        font-size: 10px;
        font-weight: 750;
        letter-spacing: .04em;
        text-transform: uppercase;
      }

      .client-card-contact {
        min-width: 0;
        overflow-wrap: anywhere;
      }

      .client-card-price {
        text-align: right;
        white-space: nowrap;
      }

      .client-card-telegram {
        grid-column: 1 / -1;
        padding-top: 9px;
        border-top: 1px solid #efede8;
      }

      .client-card-telegram .invoice-muted {
        margin-top: 3px;
        font-size: 11px;
      }

      .client-actions {
        grid-column: 1 / -1;
        justify-content: stretch;
      }

      .client-actions .action-menu {
        width: 100%;
      }

      .client-actions .action-menu summary {
        width: fit-content;
      }
    }

    .menu-tiktok-card {
      display: grid;
      gap: 12px;
      margin: 8px;
      padding: 14px;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      background: #fafafa;
      text-align: left;
      scroll-margin-top: 18px;
    }

    .menu-tiktok-heading {
      display: flex;
      align-items: flex-start;
      justify-content: flex-start;
      gap: 10px;
      color: #111;
    }

    .menu-tiktok-heading > .icon {
      flex: 0 0 20px;
      width: 20px;
      height: 20px;
      margin-top: 1px;
    }

    .menu-tiktok-heading > div {
      display: grid;
      min-width: 0;
      gap: 3px;
      text-align: left;
    }

    .menu-tiktok-heading strong {
      font-size: 14px;
      line-height: 1.25;
    }

    .menu-tiktok-heading span {
      color: #666;
      font-size: 12px;
      font-weight: 500;
      line-height: 1.4;
    }

    .menu-tiktok-warning {
      padding: 9px 10px;
      border: 1px solid #f5c2c0;
      border-radius: 6px;
      background: #fff1f0;
      color: #a61b1b;
      font-size: 12px;
      font-weight: 700;
      line-height: 1.4;
    }

    .menu-tiktok-warning[hidden] {
      display: none;
    }

    .menu-tiktok-actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-start;
      align-items: center;
      gap: 8px;
    }

    .menu-tiktok-actions a,
    .menu-tiktok-actions button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: auto;
      min-height: 38px;
      margin: 0;
      padding: 9px 12px;
      border: 1px solid #111;
      border-radius: 7px;
      background: #111;
      color: #fff;
      font: inherit;
      font-size: 12px;
      font-weight: 750;
      line-height: 1;
      text-decoration: none;
      white-space: nowrap;
      cursor: pointer;
    }

    .menu-tiktok-actions button {
      border-color: #e5e7eb;
      background: #fff;
      color: #b42318;
    }

    .menu-tiktok-actions .push-notification-button {
      border-color: #dbeafe;
      background: #eff6ff;
      color: #1d4ed8;
    }

    .push-notification-note {
      color: #666;
      font-size: 11px;
      line-height: 1.4;
    }

    .topbar-menu.tiktok-expiring summary {
      position: relative;
    }

    .topbar-menu.tiktok-expiring summary::before {
      content: "";
      position: absolute;
      top: 9px;
      right: 9px;
      width: 8px;
      height: 8px;
      border: 2px solid #fff;
      border-radius: 50%;
      background: #dc2626;
    }

    @media (max-width: 620px) {
      .menu-tiktok-card {
        margin: 6px;
        padding: 14px;
      }

      .menu-tiktok-actions a,
      .menu-tiktok-actions button {
        min-height: 40px;
        padding-inline: 13px;
      }
    }

    .mobile-context-title,
    .nav-liquid-indicator { display: none; }

    .today-header { display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; margin-bottom: 18px; }
    .today-header h1 { margin: 4px 0 5px; font-size: clamp(30px, 4vw, 46px); }
    .today-header p, .today-eyebrow { margin: 0; color: var(--muted); }
    .today-eyebrow { font-size: 12px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
    .today-progress { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-bottom: 12px; }
    .today-progress > div { display: grid; gap: 3px; padding: 14px; border: 1px solid var(--line); border-radius: 14px; background: #fff; }
    .today-progress strong { font-size: 24px; line-height: 1; }
    .today-progress span { color: var(--muted); font-size: 11px; font-weight: 700; }

    .today-next-action, .resume-work {
      position: relative; display: grid; width: 100%; margin: 0 0 12px; padding: 18px 58px 18px 18px;
      overflow: hidden; border: 0; border-radius: 18px; background: #171717; color: #fff; text-align: left;
      box-shadow: 0 10px 24px rgba(17, 17, 17, .16);
    }
    .today-next-action[data-tone="danger"] { background: linear-gradient(135deg, #9f1239, #e50914); }
    .today-next-action[data-tone="warning"] { background: linear-gradient(135deg, #7c2d12, #d97706); }
    .today-next-action[data-tone="progress"] { background: linear-gradient(135deg, #164e63, #0284c7); }
    .today-next-kicker, .resume-work small { margin-bottom: 5px; color: rgba(255,255,255,.72); font-size: 10px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
    .today-next-action strong { font-size: 19px; }
    .today-next-action small { margin-top: 5px; color: rgba(255,255,255,.78); line-height: 1.4; }
    .today-next-arrow { position: absolute; right: 16px; top: 50%; display: grid; place-items: center; width: 34px; height: 34px; border-radius: 50%; background: rgba(255,255,255,.16); transform: translateY(-50%); }
    .resume-work { display: flex; align-items: center; justify-content: space-between; padding: 13px 16px; border: 1px solid var(--line); background: #fff; color: var(--ink); box-shadow: none; }
    .resume-work span { display: grid; gap: 2px; }
    .resume-work small { margin: 0; color: var(--muted); }

    .today-skeleton { display: grid; gap: 10px; margin-bottom: 20px; }
    .today-skeleton span { height: 54px; border-radius: 14px; background: linear-gradient(100deg, #eee 30%, #f8f8f8 50%, #eee 70%); background-size: 220% 100%; animation: today-shimmer 1.2s linear infinite; }
    .operations-header { display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; margin-bottom: 18px; }
    .operations-header h1 { margin: 4px 0 5px; font-size: clamp(30px, 4vw, 44px); }
    .operations-header p { margin: 0; color: var(--muted); }
    .operations-header-actions { display: flex; align-items: center; gap: 8px; }
    .operations-header-actions button { width: auto; margin: 0; white-space: nowrap; }
    .operations-check-all { min-height: 40px; padding: 9px 13px; border: 1px solid var(--line); border-radius: 6px; background: #171717; color: #fff; box-shadow: none; }
    .operations-overall { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; padding: 15px 16px; border: 1px solid #cfe7d8; border-radius: 8px; background: #f3faf5; }
    .operations-overall[data-status="attention"] { border-color: #eadbb4; background: #fffaf0; }
    .operations-overall[data-status="critical"] { border-color: #efc4c4; background: #fff5f5; }
    .operations-overall-dot { width: 10px; height: 10px; flex: 0 0 10px; border-radius: 50%; background: #2f855a; box-shadow: 0 0 0 4px rgba(47,133,90,.12); }
    .operations-overall[data-status="attention"] .operations-overall-dot { background: #b7791f; box-shadow: 0 0 0 4px rgba(183,121,31,.12); }
    .operations-overall[data-status="critical"] .operations-overall-dot { background: #c53030; box-shadow: 0 0 0 4px rgba(197,48,48,.12); }
    .operations-overall div { display: grid; gap: 2px; min-width: 0; }
    .operations-overall strong { font-size: 16px; }
    .operations-overall small { color: var(--muted); }
    .operations-summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin-bottom: 24px; }
    .operations-summary > div { display: grid; gap: 3px; min-width: 0; padding: 13px 14px; border: 1px solid var(--line); border-radius: 8px; background: #fff; }
    .operations-summary strong { font-size: 23px; line-height: 1; }
    .operations-summary span { color: var(--muted); font-size: 11px; font-weight: 700; }
    .operations-section { margin: 0 0 25px; }
    .operations-count { display: inline-flex; min-width: 24px; height: 24px; align-items: center; justify-content: center; border-radius: 12px; background: var(--danger-soft); color: var(--danger); font-size: 12px; font-weight: 800; }
    .operations-list { display: grid; gap: 8px; }
    .operations-item { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 11px; align-items: center; padding: 13px 14px; border: 1px solid var(--line); border-radius: 8px; background: #fff; }
    .operations-item-status { width: 9px; height: 9px; border-radius: 50%; background: #718096; }
    .operations-item[data-status="critical"] .operations-item-status,
    .operations-item[data-status="failed"] .operations-item-status { background: #c53030; }
    .operations-item[data-status="warning"] .operations-item-status,
    .operations-item[data-status="queued"] .operations-item-status { background: #b7791f; }
    .operations-item[data-status="running"] .operations-item-status,
    .operations-item[data-status="claimed"] .operations-item-status { background: #2b6cb0; }
    .operations-item-copy { display: grid; gap: 3px; min-width: 0; }
    .operations-item-copy strong, .operations-item-copy small { overflow-wrap: anywhere; }
    .operations-item-copy small { color: var(--muted); }
    .operations-item-action { width: auto; min-height: 36px; margin: 0; padding: 7px 11px; border: 1px solid var(--line); border-radius: 6px; background: var(--surface-muted); color: var(--ink); box-shadow: none; font-size: 12px; }
    .operations-health-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
    .health-card { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 10px; align-items: start; min-width: 0; padding: 14px; border: 1px solid var(--line); border-radius: 8px; background: #fff; }
    .health-status-dot { width: 9px; height: 9px; margin-top: 6px; border-radius: 50%; background: #718096; }
    .health-card[data-status="healthy"] .health-status-dot { background: #2f855a; }
    .health-card[data-status="warning"] .health-status-dot,
    .health-card[data-status="stale"] .health-status-dot { background: #b7791f; }
    .health-card[data-status="down"] .health-status-dot { background: #c53030; }
    .health-card[data-status="setup"] .health-status-dot { background: #a0aec0; }
    .health-card-copy { display: grid; gap: 3px; min-width: 0; }
    .health-card-heading { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; }
    .health-card-heading strong { font-size: 14px; }
    .health-badge { padding: 2px 6px; border-radius: 4px; background: var(--surface-muted); color: var(--muted); font-size: 9px; font-weight: 800; text-transform: uppercase; }
    .health-card-copy small { color: var(--muted); overflow-wrap: anywhere; }
    .health-card-meta { font-size: 10px; }
    .health-card-actions { display: flex; align-items: center; justify-content: flex-end; gap: 6px; flex-wrap: wrap; }
    .health-card-actions .operations-item-action { min-height: 34px; }
    .health-check-button { width: 34px; min-width: 34px; min-height: 34px; margin: 0; padding: 0; border: 1px solid var(--line); border-radius: 6px; background: #fff; color: var(--muted); box-shadow: none; }
    .health-check-button .icon { width: 15px; height: 15px; }
    .operations-recent { overflow: hidden; border: 1px solid var(--line); border-radius: 8px; background: #fff; }
    .operations-recent-section { margin-top: 24px; margin-bottom: 0; }
    .operations-recent-row { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 10px; align-items: center; padding: 11px 13px; border-top: 1px solid #ebe8e2; }
    .operations-recent-row:first-child { border-top: 0; }
    .operations-recent-row .operations-item-status[data-status="completed"],
    .operations-recent-row .operations-item-status[data-status="sent"] { background: #2f855a; }
    .operations-recent-row .operations-item-status[data-status="failed"],
    .operations-recent-row .operations-item-status[data-status="expired"] { background: #c53030; }
    .operations-recent-row .operations-item-status[data-status="running"],
    .operations-recent-row .operations-item-status[data-status="claimed"] { background: #2b6cb0; }
    .operations-recent-row small { color: var(--muted); }
    .operations-recent-copy { display: grid; gap: 2px; min-width: 0; }
    .operations-recent-copy strong, .operations-recent-copy small { overflow-wrap: anywhere; }
    .operations-empty { padding: 17px; border: 1px dashed var(--line); border-radius: 8px; color: var(--muted); text-align: center; }
    .client-list-skeleton { display: grid; gap: 10px; padding: 10px; }
    .client-list-skeleton span { height: 116px; border-radius: 14px; background: linear-gradient(100deg, #eee 30%, #f8f8f8 50%, #eee 70%); background-size: 220% 100%; animation: today-shimmer 1.2s linear infinite; }
    @keyframes today-shimmer { to { background-position-x: -220%; } }

    .client-mobile-tools { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
    .client-search { flex: 1; margin: 0; }
    .client-search input { margin: 0; }
    .client-filter-chips { display: flex; gap: 6px; }
    .client-filter-chips button { min-height: 38px; margin: 0; padding: 8px 11px; border-radius: 999px; background: #f3f3f3; color: var(--muted); }
    .client-filter-chips button.active { background: #171717; color: #fff; }

    .workflow-steps { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 5px; margin: 0 0 12px; }
    .workflow-steps span { padding: 8px 5px; border-radius: 999px; background: #f2f2f2; color: var(--muted); font-size: 10px; font-weight: 750; text-align: center; }
    .workflow-steps span.active { background: #171717; color: #fff; }
    .mobile-options { margin: 12px 0; border: 1px solid var(--line); border-radius: 12px; }
    .mobile-options summary { padding: 12px 14px; color: var(--muted); font-weight: 750; cursor: pointer; }
    .mobile-options-content { padding: 0 14px 14px; }

    @media (min-width: 601px) {
      .mobile-options { border: 0; }
      .mobile-options summary { display: none; }
      .mobile-options-content { display: block !important; padding: 0; }
    }

    .app-toast { position: fixed; right: 18px; bottom: 22px; z-index: 140; max-width: min(360px, calc(100% - 28px)); padding: 12px 16px; border-radius: 14px; background: rgba(23,23,23,.94); color: #fff; box-shadow: 0 14px 36px rgba(0,0,0,.24); backdrop-filter: blur(18px); animation: bp-view-in 220ms ease both; }

    @media (max-width: 600px) {
      body { padding-bottom: calc(88px + env(safe-area-inset-bottom)); }
      .brand-name { display: none; }
      .mobile-context-title { display: block; font-size: 16px; font-weight: 800; }

      .topbar .topbar-tabs {
        --active-index: 0; inset: auto 10px calc(8px + env(safe-area-inset-bottom)); width: auto; height: 66px; padding: 5px;
        overflow: hidden; border: 1px solid rgba(255,255,255,.72); border-radius: 27px; background: rgba(245,245,245,.72);
        box-shadow: 0 12px 34px rgba(15,15,15,.18), inset 0 1px 0 rgba(255,255,255,.8);
        -webkit-backdrop-filter: blur(24px) saturate(180%); backdrop-filter: blur(24px) saturate(180%);
      }
      .nav-liquid-indicator { position: absolute; z-index: 0; top: 5px; left: 5px; display: block; width: calc((100% - 10px) / 5); height: 54px; border: 1px solid rgba(255,255,255,.9); border-radius: 22px; background: rgba(255,255,255,.82); box-shadow: 0 4px 16px rgba(0,0,0,.10), inset 0 1px 0 #fff; transform: translate3d(calc((var(--active-index) * 100%) + var(--swipe-offset, 0px)),0,0); transition: transform 420ms cubic-bezier(.22,1.35,.36,1); }
      .topbar .topbar-tabs .tab-button { position: relative; z-index: 1; min-height: 54px; border-radius: 22px; }
      .topbar .topbar-tabs .tab-button.active { color: #111; }
      .topbar .topbar-tabs .tab-button.active .icon { color: var(--red); }
      .topbar .topbar-tabs { touch-action: pan-x; }
      .tab-panel.active { touch-action: pan-y; will-change: transform, opacity; }
      .tab-panel.active.tab-swipe-dragging { animation: none; transform: translate3d(var(--tab-swipe-x, 0px), 0, 0); opacity: var(--tab-swipe-opacity, 1); transition: none; }
      .tab-panel.active.tab-swipe-returning { animation: none; transform: translate3d(0, 0, 0); opacity: 1; transition: transform 220ms cubic-bezier(.22,1,.36,1), opacity 180ms ease; }

      .topbar-menu-list {
        position: fixed; z-index: 160; top: 0; right: 0; bottom: 0; left: auto; width: min(340px, 86vw);
        padding: calc(72px + env(safe-area-inset-top)) 16px calc(90px + env(safe-area-inset-bottom));
        overflow-y: auto; border: 1px solid rgba(255,255,255,.72); border-radius: 28px 0 0 28px;
        background: rgba(248,248,248,.9); box-shadow: -18px 0 60px rgba(0,0,0,.22);
        -webkit-backdrop-filter: blur(30px) saturate(180%); backdrop-filter: blur(30px) saturate(180%);
        animation: bp-drawer-in 380ms cubic-bezier(.22,1,.36,1) both;
      }
      .topbar-menu-list > button, .topbar-menu-list form button { min-height: 52px; border-radius: 16px; font-size: 15px; }
      body.menu-drawer-open .menu-backdrop { right: auto; width: max(14vw, calc(100vw - 340px)); }
      body.menu-drawer-open .tab-panel.active { transform: translate3d(-24px,0,0) scale(.985); transform-origin: center left; filter: brightness(.72); pointer-events: none; }
      .tab-panel { transition: transform 360ms cubic-bezier(.22,1,.36,1), filter 260ms ease; }
      .action-menu[open] .action-menu-list {
        position: static;
        width: 100%;
        max-width: 100%;
        margin-top: 8px;
        padding: 8px;
        overflow: visible;
        border-radius: 14px;
        background: #f7f7f7;
        box-shadow: inset 0 0 0 1px rgba(20,20,20,.06);
        animation: bp-menu-in 200ms cubic-bezier(.2,.8,.2,1) both;
        transform-origin: top center;
      }
      .action-menu-list button { min-height: 44px; text-align: left; }

      .today-header { align-items: center; margin-bottom: 14px; }
      .today-header h1 { font-size: 27px; }
      .today-header p { font-size: 12px; }
      .today-header .dashboard-refresh { width: 44px; min-width: 44px; height: 44px; padding: 0; }
      .today-header .dashboard-refresh span { display: none; }
      .today-progress > div { padding: 12px; }
      .today-next-action { min-height: 118px; }
      .operations-header { align-items: stretch; flex-direction: column; gap: 12px; }
      .operations-header h1 { font-size: 27px; }
      .operations-header-actions { display: grid; grid-template-columns: 44px minmax(0, 1fr); width: 100%; }
      .operations-header .dashboard-refresh { width: 44px; min-width: 44px; height: 44px; padding: 0; }
      .operations-header .dashboard-refresh span { display: none; }
      .operations-check-all { width: 100% !important; }
      .operations-summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .operations-health-grid { grid-template-columns: 1fr; }
      .operations-item { grid-template-columns: auto minmax(0, 1fr); }
      .operations-item-action { grid-column: 2; justify-self: start; }
      .operations-recent-row { grid-template-columns: auto minmax(0, 1fr); }
      .operations-recent-row > time { grid-column: 2; }
      .workflow-steps { position: sticky; z-index: 18; top: calc(58px + env(safe-area-inset-top)); padding: 7px 0; background: rgba(249,249,249,.92); backdrop-filter: blur(14px); }
      .client-mobile-tools { position: sticky; z-index: 20; top: calc(58px + env(safe-area-inset-top)); display: grid; padding: 8px 0; background: rgba(249,249,249,.94); backdrop-filter: blur(14px); }
      .client-filter-chips { overflow-x: auto; }
      .client-filter-chips button { flex: 0 0 auto; }
      .app-toast { right: 14px; bottom: calc(88px + env(safe-area-inset-bottom)); left: 14px; max-width: none; text-align: center; }
      body[data-nav-direction="forward"] .tab-panel.active { animation-name: bp-slide-forward; }
      body[data-nav-direction="back"] .tab-panel.active { animation-name: bp-slide-back; }
      body.menu-drawer-open[data-nav-direction] .tab-panel.active { animation: none; transform: translate3d(-24px,0,0) scale(.985); filter: brightness(.72); }
    }

    @keyframes bp-slide-forward { from { opacity: 0; transform: translate3d(38px,0,0); } to { opacity: 1; transform: translate3d(0,0,0); } }
    @keyframes bp-slide-back { from { opacity: 0; transform: translate3d(-38px,0,0); } to { opacity: 1; transform: translate3d(0,0,0); } }
    @keyframes bp-drawer-in { from { opacity: 0; transform: translate3d(100%,0,0); } to { opacity: 1; transform: translate3d(0,0,0); } }

    .menu-backdrop,
    .menu-backdrop:hover,
    .menu-backdrop:focus,
    .menu-backdrop:active { position: fixed; z-index: 150; inset: 0; width: 100%; height: 100%; margin: 0; padding: 0; border: 0; border-radius: 0; background: rgba(0,0,0,.28) !important; box-shadow: none; backdrop-filter: blur(2px); animation: bp-view-in 220ms ease both; transform: none; }

    @media (prefers-reduced-motion: reduce) {
      html {
        scroll-behavior: auto;
      }

      *,
      *::before,
      *::after {
        animation-duration: 1ms !important;
        animation-iteration-count: 1 !important;
        scroll-behavior: auto !important;
        transition-duration: 1ms !important;
      }
    }
  </style>
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
        <button class="tab-button" type="button" data-tab-target="personalpostpilot"><svg class="icon" aria-hidden="true"><use href="/icons.svg#send"></use></svg><span>Post Pilot</span></button>
        <button class="tab-button" type="button" data-tab-target="clientpilot"><svg class="icon" aria-hidden="true"><use href="/icons.svg#users"></use></svg><span>Client Pilot</span></button>
        <button class="tab-button" type="button" data-tab-target="reportpilot"><svg class="icon" aria-hidden="true"><use href="/icons.svg#chart"></use></svg><span>Report Pilot</span></button>
        <button class="tab-button" type="button" data-tab-target="invoicepilot"><svg class="icon" aria-hidden="true"><use href="/icons.svg#receipt"></use></svg><span>Invoice Pilot</span></button>
      </nav>
      <details class="topbar-menu">
        <summary><svg class="icon" aria-hidden="true"><use href="/icons.svg#menu"></use></svg><span>Menu</span></summary>
        <div class="topbar-menu-list">
          <button type="button" data-menu-refresh><svg class="icon" aria-hidden="true"><use href="/icons.svg#refresh"></use></svg><span>Refresh</span></button>
          <button type="button" data-menu-subtab="settings-panel"><svg class="icon" aria-hidden="true"><use href="/icons.svg#settings"></use></svg><span>Tetapan</span></button>
          <button type="button" data-menu-subtab="bank-panel"><svg class="icon" aria-hidden="true"><use href="/icons.svg#landmark"></use></svg><span>Akaun Bank</span></button>
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
            <h1>System overview</h1>
            <p id="todayImpact">Status operasi dan integration BuddyPilot.</p>
          </div>
          <div class="operations-header-actions">
            <button id="refreshTodayButton" class="dashboard-refresh" type="button"><svg class="icon" aria-hidden="true"><use href="/icons.svg#refresh"></use></svg><span>Refresh</span></button>
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
            <div><strong id="todayRunning">0</strong><span>Running</span></div>
            <div><strong id="operationsFailed">0</strong><span>Failed</span></div>
            <div><strong id="todayAttention">0</strong><span>Attention</span></div>
            <div><strong id="operationsHealthy">0</strong><span>Healthy</span></div>
          </div>
          <section id="operationsAttentionSection" class="operations-section" hidden>
            <div class="dashboard-section-header"><h2>Needs attention</h2><span id="operationsAttentionCount" class="operations-count"></span></div>
            <div id="operationsIncidents" class="operations-list"></div>
          </section>
          <section id="operationsActiveSection" class="operations-section" hidden>
            <div class="dashboard-section-header"><h2>Active operations</h2><span class="dashboard-section-kicker">Current progress</span></div>
            <div id="operationsActiveList" class="operations-list"></div>
          </section>
          <section class="operations-section">
            <div class="dashboard-section-header"><h2>System health</h2><span class="dashboard-section-kicker">Passive monitor</span></div>
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
              <h2 id="quickActionsHeading">Quick actions</h2>
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
              <button class="quick-card" type="button" data-action-key="weekly-report" data-go-tab="reportpilot">
                <span class="quick-card-icon"><svg class="icon" aria-hidden="true"><use href="/icons.svg#chart"></use></svg></span>
                <span class="quick-card-copy"><strong>Buat Weekly Report</strong><small>Report Pilot</small></span>
                <span class="quick-card-arrow" aria-hidden="true"><svg class="icon"><use href="/icons.svg#arrow-right"></use></svg></span>
              </button>
              <button class="quick-card" type="button" data-action-key="invoice" data-go-tab="invoicepilot" data-go-subtab="invoice-panel">
                <span class="quick-card-icon"><svg class="icon" aria-hidden="true"><use href="/icons.svg#file-text"></use></svg></span>
                <span class="quick-card-copy"><strong>Buat Invois</strong><small>Invoice Pilot</small></span>
                <span class="quick-card-arrow" aria-hidden="true"><svg class="icon"><use href="/icons.svg#arrow-right"></use></svg></span>
              </button>
              <button class="quick-card" type="button" data-action-key="receipt" data-go-tab="invoicepilot" data-go-subtab="receipt-panel">
                <span class="quick-card-icon"><svg class="icon" aria-hidden="true"><use href="/icons.svg#receipt"></use></svg></span>
                <span class="quick-card-copy"><strong>Buat Resit</strong><small>Payment receipt</small></span>
                <span class="quick-card-arrow" aria-hidden="true"><svg class="icon"><use href="/icons.svg#arrow-right"></use></svg></span>
              </button>
            </div>
          </section>

        </div>
        <section class="operations-section operations-recent-section">
          <div class="dashboard-section-header"><h2>Recent operations</h2><span class="dashboard-section-kicker">Last 30 days</span></div>
          <div id="operationsRecent" class="operations-recent"></div>
        </section>
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
              <h2>Page Pilot</h2>
              <p class="note">Upload creative, review ayat, kemudian post ke Facebook Page.</p>
            </div>
          </div>
          <form id="postForm">
            <label for="creative">Creative gambar/video</label>
            <input id="creative" name="creative" type="file" accept="image/*,video/mp4,video/quicktime,video/webm" required>

            <label for="salespage_link">Salespage link</label>
            <input id="salespage_link" name="salespage_link" type="url" value="https://digitaldominate.com/" required>

            <details class="mobile-options">
              <summary>More options</summary>
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
            <button id="loadAdsReportButton" class="secondary" type="button">Load AdFlow Data</button>
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
            <h1>Client Pilot</h1>
            <p class="note">Urus senarai pelanggan, folder Drive, status service, dan contact client.</p>
          </div>
        </div>

        <div class="subtabs" aria-label="Client tabs">
          <button class="subtab-button active" type="button" data-subtab-group="client" data-subtab-target="client-list-panel">Senarai Pelanggan</button>
          <button class="subtab-button" type="button" data-subtab-group="client" data-subtab-target="client-add-panel">Tambah Pelanggan</button>
        </div>

        <div id="client-list-panel" class="subtab-panel active" data-subtab-panel="client">
          <div class="client-mobile-tools">
            <label class="client-search"><input id="clientSearchInput" type="search" placeholder="Cari pelanggan" aria-label="Cari pelanggan"></label>
            <div class="client-filter-chips" aria-label="Filter pelanggan">
              <button class="active" type="button" data-client-filter="all">Semua</button>
              <button type="button" data-client-filter="active">Active</button>
              <button type="button" data-client-filter="paused">Stopped</button>
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
            <h2>Tambah Pelanggan</h2>
            <input id="clientCode" name="clientCode" type="hidden">
            <div class="client-grid">
              <div class="full form-grid-heading"><h3>Maklumat pelanggan</h3></div>
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
              <div class="full form-grid-heading"><h3>Ads report setup</h3></div>
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

  <button id="menuBackdrop" class="menu-backdrop" type="button" aria-label="Tutup menu" hidden></button>
  <div id="appToast" class="app-toast" role="status" aria-live="polite" hidden></div>

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
    const threadsCommentPreview = document.getElementById("threadsCommentPreview");
    const sendThreadsExtensionButton = document.getElementById("sendThreadsExtensionButton");
    const regenerateThreadsButton = document.getElementById("regenerateThreadsButton");
    const copyThreadsCtaButton = document.getElementById("copyThreadsCtaButton");
    const threadsHookImage = document.getElementById("threadsHookImage");
    const threadsHookImagePreview = document.getElementById("threadsHookImagePreview");
    const threadsHookImageStatus = document.getElementById("threadsHookImageStatus");
    const threadsHookGallery = document.getElementById("threadsHookGallery");
    const threadsBatchPostButton = document.getElementById("threadsBatchPostButton");
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
    const viralTopic = document.getElementById("viralTopic");
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
    const enablePushNotificationsButton = document.getElementById("enablePushNotificationsButton");
    const pushNotificationNote = document.getElementById("pushNotificationNote");
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
    const NAV_ITEMS = ["dashboard", "personalpostpilot", "clientpilot", "reportpilot", "invoicepilot"];
    const NAV_TITLES = { dashboard: "Hari Ini", personalpostpilot: "Post Pilot", clientpilot: "Client Pilot", reportpilot: "Report Pilot", invoicepilot: "Invoice Pilot" };
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
    let currentAdflowAccounts = [];
    let currentTikTokAccounts = [];
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
      const group = tabName === "personalpostpilot" ? "post-pilot" : tabName === "clientpilot" ? "client" : tabName === "invoicepilot" ? "invoice-pilot" : "";
      return group ? document.querySelector(\`.subtab-panel.active[data-subtab-panel="\${group}"]\`)?.id || "" : "";
    }

    function saveLastWork(tabName, subtab = "") {
      if (!tabName || tabName === "dashboard") return;
      localStorage.setItem(LAST_WORK_STORAGE_KEY, JSON.stringify({ tab: tabName, subtab: subtab || activeSubtabFor(tabName), scrollY: Math.max(0, Math.round(window.scrollY)), updatedAt: Date.now() }));
    }

    function readLastWork() {
      try {
        const value = JSON.parse(localStorage.getItem(LAST_WORK_STORAGE_KEY) || "null");
        return value && NAV_ITEMS.includes(value.tab) && Date.now() - Number(value.updatedAt || 0) < 14 * 86400000 ? value : null;
      } catch { return null; }
    }

    function navigateToWork(target = {}, { remember = true } = {}) {
      if (!target.tab) return;
      activateTab(target.tab);
      if (target.subtab) {
        const group = target.tab === "personalpostpilot" ? "post-pilot" : target.tab === "clientpilot" ? "client" : "invoice-pilot";
        activateSubtab(group, target.subtab);
      }
      if (remember) saveLastWork(target.tab, target.subtab || "");
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
      operationsAttentionSection.hidden = incidents.length === 0;
      operationsAttentionCount.textContent = String(incidents.length);
      operationsIncidents.innerHTML = incidents.length
        ? incidents.map((item) => renderOperationItem(item, registerOperationsAction(item.action))).join("")
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
          if (cached?.overview && Date.now() - cached.savedAt < OPERATIONS_CACHE_MS) {
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
        if (action.kind === "automation") {
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
        const statusMatch = activeClientFilter === "all" || row.dataset.clientStatus === activeClientFilter;
        row.hidden = !statusMatch || !row.dataset.clientSearch.includes(query);
      });
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
    }

    function setupMainTabSwipe() {
      const mobileQuery = window.matchMedia("(max-width: 700px)");
      const mainSurface = document.querySelector("main");
      const surfaces = [mainSurface, mobileNavigation].filter(Boolean);
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
      const requestedParams = new URLSearchParams(window.location.search);
      const requestedTab = requestedParams.get("tab");
      const requestedPanel = requestedParams.get("panel");
      let savedMainTab = requestedTab || localStorage.getItem("active-main-tab") || "dashboard";
      if (savedMainTab === "postpilot") {
        savedMainTab = "personalpostpilot";
        localStorage.setItem("active-main-tab", savedMainTab);
        localStorage.setItem("active-subtab-post-pilot", "pagepilot-panel");
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
        "invoice-pilot": "invoice-panel",
        client: "client-list-panel",
        "post-pilot": "postpilot-auto-panel"
      };
      ["invoice-pilot", "client", "post-pilot"].forEach((group) => {
        const fallback = subtabDefaults[group] || document.querySelector(\`.subtab-button[data-subtab-group="\${group}"]\`)?.dataset.subtabTarget;
        const saved = group === "invoice-pilot" && requestedPanel ? requestedPanel : localStorage.getItem(\`active-subtab-\${group}\`);
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

    function threadsPayloadFromForm() {
      return {
        product_id: activePostPilotProductId,
        active_product_id: activePostPilotProductId,
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
          affiliate_link: "threadsAffiliateLink"
        };
        Object.entries(fields).forEach(([key, id]) => {
          const node = document.getElementById(id);
          if (node && typeof saved[key] === "string") node.value = saved[key];
        });
      } catch {
        localStorage.removeItem(POSTPILOT_INPUT_STORAGE_KEY);
      }

      const postMode = document.getElementById("threadsPostMode");
      if (postMode) postMode.value = "auto";

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
        affiliate_link: draft.affiliateLink
      };
      const fields = {
        product_name: "threadsProductName",
        affiliate_link: "threadsAffiliateLink"
      };
      Object.entries(fields).forEach(([key, id]) => {
        const node = document.getElementById(id);
        if (node && typeof values[key] === "string") node.value = values[key];
      });
      const postMode = document.getElementById("threadsPostMode");
      if (postMode) postMode.value = "auto";
      if (draft.activeProductId && postPilotProducts.some((product) => product.id === draft.activeProductId)) {
        activePostPilotProductId = draft.activeProductId;
        threadsProductSelect.value = draft.activeProductId;
        const product = postPilotProducts.find((item) => item.id === draft.activeProductId);
        document.getElementById("threadsProductName").value = product.name;
        document.getElementById("threadsAffiliateLink").value = product.affiliateLink;
      }
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

    function renderPostPilotProducts() {
      threadsProductSelect.innerHTML = "";
      postPilotProducts.forEach((product) => {
        const option = document.createElement("option");
        option.value = product.id;
        option.textContent = product.name;
        threadsProductSelect.appendChild(option);
      });
      deleteProductButton.disabled = postPilotProducts.length <= 1;
      deleteProductButton.title = postPilotProducts.length <= 1
        ? "Tambah produk lain sebelum delete produk ini"
        : "Delete produk aktif dan semua gambar miliknya";
    }

    async function loadPostPilotProducts() {
      const response = await fetch("/api/personal-post-products");
      const json = await readApiJson(response);
      if (!response.ok || !json.ok) throw new Error(json.error || "Gagal load produk Post Pilot.");
      postPilotProducts = Array.isArray(json.products) ? json.products : [];
      renderPostPilotProducts();
    }

    async function activatePostPilotProduct(productId, { persist = true } = {}) {
      const product = postPilotProducts.find((item) => item.id === productId);
      if (!product) return;
      activePostPilotProductId = product.id;
      threadsProductSelect.value = product.id;
      document.getElementById("threadsProductName").value = product.name;
      document.getElementById("threadsAffiliateLink").value = product.affiliateLink;
      postPilotGalleryImages = [];
      savedThreadsImage = null;
      threadsPreviewPanel.hidden = true;
      threadsPostPreview.value = "";
      threadsCommentPreview.value = "";
      renderPostPilotGallery();
      if (persist) await savePostPilotInputsToSupabase();
      await loadPostPilotGallery();
    }

    async function createPostPilotProductFromForm() {
      const response = await fetch("/api/personal-post-products", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: newProductName.value, affiliate_link: newProductLink.value }),
      });
      const json = await readApiJson(response);
      if (!response.ok || !json.ok) throw new Error(json.error || "Gagal tambah produk.");
      postPilotProducts.push(json.product);
      renderPostPilotProducts();
      addProductPanel.hidden = true;
      newProductName.value = "";
      newProductLink.value = "";
      await activatePostPilotProduct(json.product.id, { persist: false });
      setMessage(threadsResult, "ok", \`Produk \${json.product.name} ditambah dan diaktifkan.\`);
    }

    async function deleteActivePostPilotProduct() {
      const product = postPilotProducts.find((item) => item.id === activePostPilotProductId);
      if (!product) throw new Error("Pilih produk yang hendak dipadam.");
      if (postPilotProducts.length <= 1) throw new Error("Produk terakhir tidak boleh dipadam. Tambah produk lain dahulu.");
      if (!window.confirm(\`Delete produk \${product.name} dan semua gambar yang disimpan untuk produk ini?\`)) return;

      deleteProductButton.disabled = true;
      try {
        const response = await fetch("/api/personal-post-products", {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ product_id: product.id }),
        });
        const json = await readApiJson(response);
        if (!response.ok || !json.ok) throw new Error(json.error || "Gagal delete produk.");
        postPilotProducts = Array.isArray(json.products) ? json.products : [];
        renderPostPilotProducts();
        await activatePostPilotProduct(json.active_product.id, { persist: false });
        setMessage(threadsResult, "ok", \`Produk \${product.name} dan \${json.deleted_image_count || 0} gambar sudah dipadam.\`);
      } finally {
        deleteProductButton.disabled = postPilotProducts.length <= 1;
      }
    }

    async function setupPostPilotInputStorage() {
      restorePostPilotInputs();
      threadsForm.querySelectorAll("input:not([type='file']), textarea, select").forEach((node) => {
        node.addEventListener("input", schedulePostPilotSave);
        node.addEventListener("change", schedulePostPilotSave);
      });
      try {
        await loadPostPilotProducts();
        await loadPostPilotDraftFromSupabase();
        const initialId = activePostPilotProductId || postPilotProducts[0]?.id || "";
        if (initialId) await activatePostPilotProduct(initialId, { persist: false });
      } catch (error) {
        showThreadsError(error);
      }
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

    function postPilotGalleryImageUrl(image) {
      return image.url || \`/api/personal-post-hook-images?id=\${encodeURIComponent(image.id)}\`;
    }

    function renderPostPilotGallery() {
      if (!threadsHookGallery || !threadsHookImageStatus) return;
      threadsHookGallery.innerHTML = "";
      postPilotGalleryImages.forEach((image) => {
        const item = document.createElement("div");
        item.className = "postpilot-gallery-item";
        const preview = document.createElement("img");
        preview.src = postPilotGalleryImageUrl(image);
        preview.alt = image.name || "Gambar hook";
        preview.loading = "lazy";
        const remove = document.createElement("button");
        remove.type = "button";
        remove.textContent = "x";
        remove.title = \`Delete \${image.name || "gambar"}\`;
        remove.setAttribute("aria-label", remove.title);
        remove.addEventListener("click", () => deletePostPilotGalleryImage(image));
        item.append(preview, remove);
        threadsHookGallery.appendChild(item);
      });
      threadsHookImageStatus.textContent = postPilotGalleryImages.length
        ? \`\${postPilotGalleryImages.length}/20 gambar hook tersimpan. Rotation akan pilih gambar paling lama belum digunakan.\`
        : "Belum ada gambar dalam galeri. Upload sekurang-kurangnya satu gambar untuk POST NOW.";
      if (threadsHookImagePreview) threadsHookImagePreview.hidden = true;
    }

    async function loadPostPilotGallery() {
      if (!activePostPilotProductId) return;
      const response = await fetch(\`/api/personal-post-hook-images?product_id=\${encodeURIComponent(activePostPilotProductId)}\`);
      const json = await readApiJson(response);
      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!response.ok || !json.ok) throw new Error(json.error || "Gagal load galeri gambar hook.");
      postPilotGalleryImages = Array.isArray(json.images) ? json.images : [];
      renderPostPilotGallery();
    }

    async function uploadPostPilotGalleryFiles(files) {
      const available = Math.max(0, 20 - postPilotGalleryImages.length);
      if (!available) throw new Error("Galeri gambar hook sudah penuh (20). Delete satu gambar dahulu.");
      const selected = files.slice(0, available);
      const skipped = files.length - selected.length;
      for (let index = 0; index < selected.length; index += 1) {
        threadsHookImageStatus.textContent = \`Simpan gambar \${index + 1}/\${selected.length}...\`;
        const storedFile = await compressImageForPostPilotStorage(selected[index]);
        const payload = new FormData();
        payload.append("hookImage", storedFile);
        const response = await fetch(\`/api/personal-post-hook-images?product_id=\${encodeURIComponent(activePostPilotProductId)}\`, { method: "POST", body: payload });
        const json = await readApiJson(response);
        if (!response.ok || !json.ok) throw new Error(json.error || \`Gagal simpan \${selected[index].name}.\`);
        postPilotGalleryImages.push(json.image);
        renderPostPilotGallery();
      }
      threadsHookImage.value = "";
      threadsResult.className = "result ok";
      threadsResult.textContent = [
        \`\${selected.length} gambar hook disimpan dalam Supabase.\`,
        skipped ? \`\${skipped} gambar tidak dimuat naik kerana galeri maksimum 20.\` : "",
      ].filter(Boolean).join("\\n");
    }

    async function deletePostPilotGalleryImage(image) {
      const response = await fetch(\`/api/personal-post-hook-images?id=\${encodeURIComponent(image.id)}\`, { method: "DELETE" });
      const json = await readApiJson(response);
      if (!response.ok || !json.ok) throw new Error(json.error || "Gagal delete gambar hook.");
      postPilotGalleryImages = postPilotGalleryImages.filter((item) => item.id !== image.id);
      renderPostPilotGallery();
      threadsResult.className = "result ok";
      threadsResult.textContent = "Gambar hook sudah dibuang daripada galeri.";
    }

    async function buildPostPilotBatchDraft(count) {
      const response = await fetch("/api/personal-post-batch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...threadsPayloadFromForm(), count })
      });
      const json = await readApiJson(response);
      if (response.status === 401) {
        window.location.href = "/login";
        return null;
      }
      if (!response.ok || !json.ok) throw new Error(json.error || "Gagal jana batch Post Pilot.");
      const posts = [];
      for (const post of json.posts || []) {
        if (!post.image?.url) throw new Error(\`Gambar hook untuk \${post.id} tidak lengkap.\`);
        const imageResponse = await fetch(post.image.url);
        if (!imageResponse.ok) throw new Error(\`Gagal load gambar hook untuk \${post.id}.\`);
        const imageBlob = await imageResponse.blob();
        const imageDataUrl = await readFileAsDataUrl(fileFromBlob(imageBlob, post.image.name || "post-hook.jpg"));
        posts.push({
          ...post,
          image: {
            name: post.image.name,
            type: post.image.type,
            dataUrl: imageDataUrl
          }
        });
      }
      if (posts.length !== count) throw new Error("Batch Post Pilot tidak lengkap.");
      const automationId = \`postpilot-batch-\${Date.now()}\`;
      return {
        source: "postpilot-webapp",
        type: "POSTPILOT_BATCH_DRAFT",
        draft: { id: automationId, automationId, createdAt: new Date().toISOString(), autoPublish: true, batchDelayMs: 30000, posts }
      };
    }

    async function startPostPilotBatch(count) {
      const button = count === 5 ? threadsBatchPostButton : threadsPreviewButton;
      const otherButton = count === 5 ? threadsPreviewButton : threadsBatchPostButton;
      button.disabled = true;
      otherButton.disabled = true;
      button.textContent = count === 5 ? "Preparing 5 posts..." : "Preparing post...";
      threadsResult.className = "result";
      threadsResult.textContent = "";
      try {
        await savePostPilotInputsToSupabase();
        await createRemoteAutomationJob({
          type: "facebook_threads",
          count,
          personal: threadsPayloadFromForm()
        }, threadsResult);
        threadsResult.className = "result ok";
        threadsResult.textContent = count === 5
          ? "5 post unik masuk queue Mac. Facebook dan Threads akan bergerak satu demi satu, dengan jarak 30 saat."
          : "Post unik masuk queue Mac. Facebook akan post dahulu, kemudian Threads.";
      } catch (error) {
        showThreadsError(error);
      } finally {
        threadsPreviewButton.disabled = false;
        threadsBatchPostButton.disabled = false;
        threadsPreviewButton.textContent = "Generate Preview";
        threadsBatchPostButton.textContent = "POST 5 NOW";
      }
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
      threadsPreviewPanel.hidden = !reveal;
      setPostWorkflowStep(3);
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
      if (!currentThreadsPreview) throw new Error("Preview Post Pilot belum dijana.");
      const postText = normalizePostPilotMainTextForSend(
        threadsPostPreview.value,
        currentThreadsPreview.affiliate_link || document.getElementById("threadsAffiliateLink").value
      );
      if (!postText) throw new Error("Post utama kosong.");
      await createRemoteAutomationJob({
        type: "facebook_threads",
        product_id: activePostPilotProductId,
        posts: [{
          id: "postpilot-preview-" + Date.now(),
          postText,
          commentCta: threadsCommentPreview.value.trim(),
          postMode: currentThreadsPreview.post_mode || "custom",
          style: currentThreadsPreview.style || "custom"
        }]
      }, threadsResult);
      threadsResult.className = "result ok";
      threadsResult.textContent = "Draft masuk queue. Menunggu Chrome Mac buka Facebook, kemudian Threads.";
      setPostWorkflowStep(4);
      showToast("Post masuk queue Mac.");
      loadTodayDashboard({ silent: true, force: true });
    }

    function setPostWorkflowStep(step) {
      document.querySelectorAll(".workflow-steps span").forEach((item, index) => item.classList.toggle("active", index + 1 === step));
    }

    async function generatePostPilotPreview() {
      threadsPreviewButton.disabled = true;
      threadsBatchPostButton.disabled = true;
      threadsPreviewButton.textContent = "Generating...";
      setPostWorkflowStep(2);
      try {
        await savePostPilotInputsToSupabase();
        const response = await fetch("/api/personal-post-preview", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(threadsPayloadFromForm())
        });
        const json = await readApiJson(response);
        if (response.status === 401) return void (window.location.href = "/login");
        if (!response.ok || !json.ok) throw new Error(json.error || "Gagal jana preview Post Pilot.");
        showThreadsPreview(json);
      } catch (error) {
        setPostWorkflowStep(1);
        showThreadsError(error);
      } finally {
        threadsPreviewButton.disabled = false;
        threadsBatchPostButton.disabled = false;
        threadsPreviewButton.textContent = "Generate Preview";
      }
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
        .replace(/\\*\\*/g, "")
        .replace(/:/g, ",")
        .replace(/\\s+([?.!,])/g, "$1")
        .replace(/[ \\t]+/g, " ")
        .replace(/\\n{3,}/g, "\\n\\n")
        .trim();
    }

    function withTopic(template, topic) {
      return String(template || "").replace(/\\{topic\\}/g, topic);
    }

    function withViralContext(template, topic, audience) {
      return withTopic(template, topic).replace(/\\{audience\\}/g, audience);
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
      return buildThreadsGeneralText(parts);
    }

    function validateViralPost(text, existingPosts) {
      const safe = cleanViralText(text);
      if (!safe) return { ok: false, reason: "empty" };
      if (safe.length > 500) return { ok: false, reason: "over_500" };
      if (!viralHashtags.checked && /(^|\\s)#\\w+/i.test(safe)) return { ok: false, reason: "hashtag_disabled" };
      if (containsAnyPhrase(safe, VIRAL_BANNED_WORDS)) return { ok: false, reason: "banned_word" };
      if (containsAnyPhrase(safe, VIRAL_PROMO_PHRASES)) return { ok: false, reason: "too_promotional" };
      if (containsAnyPhrase(safe, VIRAL_ROBOTIC_PHRASES)) return { ok: false, reason: "robotic_phrase" };
      if (/\\*\\*|:/.test(safe)) return { ok: false, reason: "robotic_punctuation" };
      if (/\\?\\s*(?:#\\w+(?:\\s+#\\w+)*)?$/i.test(safe)) return { ok: false, reason: "question_ending" };
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
        const toneTemplates = viralTemplates.toneLeadIns?.[tone] || viralTemplates.toneLeadIns?.Casual || [];
        const parts = {
          angle: pickRandom(viralTemplates.contentAngles),
          audience,
          audienceLead: withViralContext(pickRandom(viralTemplates.audienceLeadIns || []), topic, audience),
          category,
          context: viralContextFor(category),
          emotion: pickRandom(viralTemplates.emotionalTriggers),
          hook: withTopic(pickRandom(viralTemplates.hooks), topic),
          middle: pickRandom(viralTemplates.middleSentencePatterns),
          opening: withTopic(pickRandom(viralTemplates.openingStyles), topic),
          pain: pickRandom(viralTemplates.painPoints),
          structure,
          tone,
          toneLead: withViralContext(pickRandom(toneTemplates), topic, audience),
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
        "mula dengan satu benda yang paling senang nampak dulu."
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

    function shuffledViralValues(values, count) {
      const source = [...new Set((values || []).filter(Boolean))];
      const output = [];
      while (output.length < count && source.length) {
        const round = [...source];
        for (let index = round.length - 1; index > 0; index -= 1) {
          const target = Math.floor(Math.random() * (index + 1));
          [round[index], round[target]] = [round[target], round[index]];
        }
        output.push(...round);
      }
      return output.slice(0, count);
    }

    function randomViralOverride() {
      return {
        audience: pickRandom(viralTemplates.audienceTypes || []),
        category: pickRandom(viralTemplates.categories || []),
        tone: pickRandom(viralTemplates.toneOptions || []),
        topic: pickRandom(viralTemplates.topicOptions || viralTemplates.categories || []),
      };
    }

    function generateRandomViralPosts(count) {
      const posts = [];
      const audiences = shuffledViralValues(viralTemplates.audienceTypes, count);
      const categories = shuffledViralValues(viralTemplates.categories, count);
      const tones = shuffledViralValues(viralTemplates.toneOptions, count);
      const topics = shuffledViralValues(viralTemplates.topicOptions || viralTemplates.categories, count);
      for (let index = 0; index < count; index += 1) {
        posts.push(makeViralPost(posts, {
          audience: audiences[index],
          category: categories[index],
          tone: tones[index],
          topic: topics[index],
        }));
      }
      viralGeneratedPosts = posts;
      renderViralPosts();
      setMessage(viralResult, "ok", count + " random Threads viral post generated.");
    }

    function ensureViralPostCount(count) {
      const posts = [...viralGeneratedPosts];
      while (posts.length < count) {
        posts.push(makeViralPost(posts, randomViralOverride()));
      }
      viralGeneratedPosts = posts;
      renderViralPosts();
      return viralGeneratedPosts.slice(0, count);
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

    async function postViralToThreads(post) {
      try {
        await createRemoteAutomationJob({
          type: "threads_text",
          posts: [{ id: post.id, postText: post.postText, category: post.category, tone: post.tone, structure: post.structure }],
          batchDelayMs: 30000
        }, viralResult);
        setMessage(viralResult, "ok", "Post Threads masuk queue Chrome Mac.");
      } catch (error) {
        setMessage(viralResult, "err", error.message || String(error));
      }
    }

    async function postViralBatchToThreads(count) {
      const posts = ensureViralPostCount(count);
      try {
        await createRemoteAutomationJob({
          type: "threads_text",
          posts: posts.map((post) => ({
            id: post.id,
            postText: post.postText,
            category: post.category,
            tone: post.tone,
            structure: post.structure
          })),
          batchDelayMs: 30000
        }, viralResult);
        setMessage(viralResult, "ok", posts.length + " Threads posts masuk queue Chrome Mac.");
      } catch (error) {
        setMessage(viralResult, "err", error.message || String(error));
      }
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
      await generatePostPilotPreview();
    });

    threadsBatchPostButton.addEventListener("click", () => startPostPilotBatch(5));

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
    generateViralTenButton.addEventListener("click", () => generateRandomViralPosts(10));
    generateViralFiftyButton.addEventListener("click", () => generateRandomViralPosts(50));
    autoPostViralTenButton.addEventListener("click", () => postViralBatchToThreads(10));
    autoPostViralFiftyButton.addEventListener("click", () => postViralBatchToThreads(50));
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
      const accounts = platform === "tiktok" ? currentTikTokAccounts : currentAdflowAccounts;
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
      return platform === "tiktok" ? currentTikTokAccounts : currentAdflowAccounts;
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

    async function loadAdflowAccounts() {
      try {
        const response = await fetch("/api/reports/accounts");
        const json = await readApiJson(response);
        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }
        if (!response.ok || !json.ok) throw new Error(json.error || "Gagal load AdFlow accounts.");
        currentAdflowAccounts = json.accounts || [];
        populateAdsAccountOptions();
        applySelectedClientReportDefaults();
      } catch (error) {
        currentAdflowAccounts = [];
        populateAdsAccountOptions();
        setMessage(clientResult, "err", \`AdFlow: \${error?.message || error}\`);
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

    async function setupPushNotifications({ requestPermission = false } = {}) {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        enablePushNotificationsButton.hidden = true;
        pushNotificationNote.textContent = "Peranti atau browser ini tidak menyokong Web Push.";
        return;
      }
      if (isIosDevice() && !isStandaloneApp()) {
        pushNotificationNote.textContent = "iPhone/iPad: tekan Share > Add to Home Screen, buka BuddyPilot dari Home Screen, kemudian aktifkan notifikasi.";
        enablePushNotificationsButton.textContent = "Perlu Home Screen";
        enablePushNotificationsButton.disabled = true;
        return;
      }
      const registration = await navigator.serviceWorker.register("/sw.js");
      let subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        enablePushNotificationsButton.textContent = "Notifikasi Aktif";
        enablePushNotificationsButton.disabled = true;
        pushNotificationNote.textContent = "Amaran TikTok Ads akan dihantar ke peranti ini.";
        return;
      }
      if (!requestPermission) {
        if (Notification.permission === "denied") {
          enablePushNotificationsButton.textContent = "Notifikasi Disekat";
          pushNotificationNote.textContent = "Benarkan notification dalam tetapan browser/peranti dahulu.";
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
      enablePushNotificationsButton.textContent = "Notifikasi Aktif";
      enablePushNotificationsButton.disabled = true;
      pushNotificationNote.textContent = "Amaran TikTok Ads akan dihantar ke peranti ini.";
      await registration.showNotification("Notifikasi BuddyPilot aktif", {
        body: "Peranti ini akan menerima amaran apabila authorization TikTok Ads berbaki 7 hari atau kurang.",
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
      const activeClients = currentClients.filter((client) => client.serviceStatus !== "paused");
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
      let whatsappWindow = null;
      try {
        whatsappWindow = window.open("about:blank", "_blank");
        if (whatsappWindow) whatsappWindow.document.title = "Preparing WhatsApp...";
      } catch {}

      try {
        const response = await fetch("/api/reports/upload", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload)
        });
        const json = await readApiJson(response);
        if (response.status === 401) {
          if (whatsappWindow && !whatsappWindow.closed) whatsappWindow.close();
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
          upload.whatsappUrl ? "WhatsApp dibuka dengan template report." : (upload.whatsappError ? \`WhatsApp tidak dibuka: \${upload.whatsappError}\` : "")
        ].filter(Boolean).join("\\n");
        showToast("Weekly report selesai dan sudah diupload.");
        loadTodayDashboard({ silent: true, force: true });
        if (upload.whatsappUrl) {
          if (whatsappWindow && !whatsappWindow.closed) whatsappWindow.location.href = upload.whatsappUrl;
          else {
            const opened = window.open(upload.whatsappUrl, "_blank");
            if (!opened) window.location.href = upload.whatsappUrl;
          }
        } else if (whatsappWindow && !whatsappWindow.closed) {
          whatsappWindow.close();
        }
        await loadActivity();
      } catch (error) {
        if (whatsappWindow && !whatsappWindow.closed) whatsappWindow.close();
        showReportError(error);
      } finally {
        previewReportButton.disabled = false;
        uploadReportButton.disabled = false;
        uploadReportButton.textContent = "Generate & Upload Report";
      }
    }

    function renderClientList(clients, registryStatus) {
      clients = [...(clients || [])].sort((left, right) => {
        const leftStopped = left.serviceStatus === "paused" ? 1 : 0;
        const rightStopped = right.serviceStatus === "paused" ? 1 : 0;
        return leftStopped - rightStopped;
      });
      currentClients = clients;
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
        <div class="client-row" data-client-code="\${escapeHtml(client.code)}" data-client-status="\${client.serviceStatus === "paused" ? "paused" : "active"}" data-client-search="\${escapeHtml([client.brandClient, client.code, client.contactName, client.name, client.companyName, client.email, client.phone].filter(Boolean).join(" ").toLowerCase())}">
          <div class="client-card-brand" data-label="Brand">
            <span class="invoice-client">\${escapeHtml(client.brandClient || client.name)}</span>
            <span class="invoice-muted">\${escapeHtml(client.code)}</span>
            \${client.serviceStatus === "paused" ? '<span class="qr-pill">Stopped</span>' : '<span class="default-pill">Active</span>'}
          </div>
          <div class="client-card-identity" data-label="Nama / Syarikat">
            \${escapeHtml(client.contactName || "-")}
            <span class="invoice-muted">\${escapeHtml(client.companyName || client.billingName || "-")}</span>
          </div>
          <div class="client-card-contact" data-label="Contact">
            \${escapeHtml(client.email || "-")}
            <span class="invoice-muted">\${escapeHtml(client.phone || "-")}</span>
          </div>
          <div class="client-card-price" data-label="Harga">
            \${escapeHtml(formatMoneyValue(client.monthlyRetainer || 0))}
            <span class="invoice-muted">\${escapeHtml(client.source || "config")}</span>
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

    function resetClientFormMode() {
      clientForm.dataset.mode = "create";
      clientForm.reset();
      clientForm.elements.clientCode.value = "";
      clientForm.querySelector("h2").textContent = "Tambah Pelanggan";
      clientAdsPlatform.value = "meta";
      populateAdsAccountOptions("", "meta");
      clientAdsAccountName.value = "";
      clientAdsCurrency.value = "";
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
      const adsConfig = client.adsReportConfig || {};
      clientForm.elements.platform.value = adsConfig.platform === "tiktok" ? "tiktok" : "meta";
      populateAdsAccountOptions(adsConfig.accountId || "", clientForm.elements.platform.value);
      clientForm.elements.accountName.value = adsConfig.accountName || "";
      clientForm.elements.currency.value = adsConfig.currency || "MYR";
      clientForm.elements.resultMetric.value = adsConfig.resultMetric || "conversions";
      clientForm.elements.prospectingKeywords.value = (adsConfig.prospectingKeywords || []).join(", ");
      clientForm.elements.retargetingKeywords.value = (adsConfig.retargetingKeywords || []).join(", ");
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

    invoicePeriod.value = localStorage.getItem("buddypilot-invoice-period") || defaultInvoicePeriod();
    receiptPeriod.value = localStorage.getItem("buddypilot-receipt-period") || invoicePeriod.value;
    const reportWeek = defaultReportWeek();
    reportStartDate.value = reportWeek.start;
    reportEndDate.value = reportWeek.end;
    setupTabs();
    setupMainTabSwipe();
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
        navigateToWork({ tab: button.dataset.goTab, subtab: button.dataset.goSubtab || "" });
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
    enablePushNotificationsButton.addEventListener("click", () => {
      setupPushNotifications({ requestPermission: true }).catch((error) => {
        pushNotificationNote.textContent = error?.message || String(error);
      });
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
    loadAdflowAccounts();
    loadTikTokConnection();
    setupPushNotifications().catch(() => {});
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
