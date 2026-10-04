module.exports = function styles() {
  return `  <style>
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
        grid-template-columns: repeat(4, minmax(0, 1fr));
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
        grid-template-columns: repeat(4, minmax(0, 1fr));
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
        --active-index: 0; inset: auto auto calc(8px + env(safe-area-inset-bottom)) 50%; width: min(366px, calc(100% - 24px)); height: 66px; padding: 5px;
        grid-template-columns: repeat(4, minmax(0, 1fr)); overflow: visible; border: 1px solid rgba(255,255,255,.76); border-radius: 27px; background: rgba(244,244,244,.66);
        box-shadow: 0 12px 34px rgba(15,15,15,.16), inset 0 1px 0 rgba(255,255,255,.92), inset 0 -1px 0 rgba(255,255,255,.38);
        transform: translate3d(-50%,0,0);
        -webkit-backdrop-filter: blur(28px) saturate(185%); backdrop-filter: blur(28px) saturate(185%);
      }
      .nav-liquid-indicator { position: absolute; z-index: 0; top: 1px; left: 5px; display: block; width: calc((100% - 10px) / 4); height: 64px; overflow: hidden; border: 1px solid rgba(255,255,255,.92); border-radius: 22px; background: linear-gradient(145deg, rgba(255,255,255,.88), rgba(220,232,244,.5) 48%, rgba(255,255,255,.72)); box-shadow: none; opacity: 0; transform: translate3d(calc(var(--active-index) * 100%),0,0) scale(.82); transform-origin: center; transition: opacity 150ms ease; will-change: transform, opacity, border-radius; -webkit-backdrop-filter: blur(22px) saturate(190%); backdrop-filter: blur(22px) saturate(190%); }
      .nav-liquid-indicator::before { content: ""; position: absolute; inset: 3px 10% auto; height: 42%; border-radius: 18px 18px 50% 50%; background: linear-gradient(180deg, rgba(255,255,255,.84), rgba(255,255,255,.08)); filter: blur(3px); opacity: .92; pointer-events: none; }
      .nav-liquid-indicator::after { content: ""; position: absolute; top: -22%; bottom: -22%; left: -52%; width: 42%; background: linear-gradient(90deg, transparent, rgba(255,255,255,.92), transparent); opacity: 0; transform: skewX(-14deg); pointer-events: none; }
      .topbar .topbar-tabs .tab-button { position: relative; z-index: 1; min-height: 54px; border-radius: 20px; transition: color 140ms ease, opacity 140ms ease, transform 220ms cubic-bezier(.2,.9,.25,1); }
      .topbar .topbar-tabs .tab-button.active { color: #111; }
      .topbar .topbar-tabs .tab-button.active .icon { color: var(--red); }
      .topbar .topbar-tabs { touch-action: none; -webkit-user-select: none; user-select: none; }
      .topbar .topbar-tabs.nav-scrubbing { background: rgba(242,242,242,.58); box-shadow: 0 16px 42px rgba(15,15,15,.22), inset 0 1px 0 rgba(255,255,255,.96); }
      .topbar .topbar-tabs.nav-scrubbing .nav-liquid-indicator { opacity: 1; transform: translate3d(var(--scrub-x, 0px),0,0) scale(1.04,1.08); transition: none; border-radius: 22px; box-shadow: 0 12px 26px rgba(40,55,75,.18), 0 0 0 1px rgba(190,220,245,.24), inset 0 2px 3px #fff, inset 0 -5px 10px rgba(80,115,145,.12); }
      .topbar .topbar-tabs.nav-scrubbing.nav-lens-entering .nav-liquid-indicator { animation: bp-lens-emerge 280ms cubic-bezier(.16,1,.3,1) both; }
      .topbar .topbar-tabs.nav-scrubbing .nav-liquid-indicator::after { opacity: .78; animation: bp-glass-glint 520ms ease-out 1 both; }
      .topbar .topbar-tabs.nav-scrubbing .tab-button { opacity: .66; }
      .topbar .topbar-tabs.nav-scrubbing .tab-button.scrub-preview { color: #111; opacity: 1; transform: translateY(-2px) scale(1.04); }
      .topbar .topbar-tabs.nav-scrubbing .tab-button.scrub-preview .icon { color: var(--red); transform: scale(1.1); }
      .topbar .topbar-tabs.nav-scrubbing .tab-button.scrub-preview span { font-weight: 800; }
      .topbar .topbar-tabs.nav-settling .nav-liquid-indicator { animation: bp-liquid-release 420ms cubic-bezier(.16,1,.3,1) both; }
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
    @keyframes bp-glass-glint { 0% { left: -55%; } 55%, 100% { left: 118%; } }
    @keyframes bp-lens-emerge {
      0% { opacity: 0; border-radius: 28px; transform: translate3d(var(--scrub-x, 0px),8px,0) scale(.72,.58); }
      58% { opacity: 1; border-radius: 19px; transform: translate3d(var(--scrub-x, 0px),-1px,0) scale(1.07,1.12); }
      100% { opacity: 1; border-radius: 22px; transform: translate3d(var(--scrub-x, 0px),0,0) scale(1.04,1.08); }
    }
    @keyframes bp-liquid-release {
      0% { opacity: 1; border-radius: 22px; transform: translate3d(calc(var(--active-index) * 100%),0,0) scale(1.04,1.08); }
      48% { opacity: .92; border-radius: 19px; transform: translate3d(calc(var(--active-index) * 100%),1px,0) scale(.96,1.02); }
      100% { opacity: 0; border-radius: 26px; transform: translate3d(calc(var(--active-index) * 100%),7px,0) scale(.66,.42); }
    }

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
    .onboarding-progress {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 6px;
      margin: 18px 0 24px;
      padding: 0;
      list-style: none;
    }

    .onboarding-progress li {
      position: relative;
      display: grid;
      justify-items: center;
      gap: 5px;
      color: var(--muted);
      text-align: center;
    }

    .onboarding-progress li::before {
      content: "";
      position: absolute;
      top: 14px;
      left: calc(-50% + 16px);
      width: calc(100% - 32px);
      height: 2px;
      background: var(--line);
    }

    .onboarding-progress li:first-child::before { display: none; }

    .onboarding-progress span {
      position: relative;
      z-index: 1;
      display: grid;
      place-items: center;
      width: 30px;
      height: 30px;
      border: 1px solid var(--line);
      border-radius: 50%;
      background: #fff;
      font-size: 12px;
      font-weight: 800;
    }

    .onboarding-progress li.active,
    .onboarding-progress li.complete { color: var(--ink); }
    .onboarding-progress li.active span { border-color: var(--red); background: var(--red); color: #fff; }
    .onboarding-progress li.complete span { border-color: #94c8b7; background: #e8f6f0; color: #246d56; }
    .onboarding-progress li.complete::before,
    .onboarding-progress li.active::before { background: #94c8b7; }

    .onboarding-step { animation: onboarding-enter 180ms ease-out; }
    .onboarding-step[hidden] { display: none !important; }
    @keyframes onboarding-enter { from { opacity: 0; transform: translateX(10px); } to { opacity: 1; transform: translateX(0); } }

    .onboarding-step-heading {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 18px;
    }

    .onboarding-step-heading > span {
      display: grid;
      place-items: center;
      flex: 0 0 32px;
      width: 32px;
      height: 32px;
      border-radius: 7px;
      background: var(--accent-soft);
      color: var(--accent);
      font-weight: 800;
    }

    .onboarding-step-heading h3 { margin: 0 0 3px; }
    .onboarding-step-heading p { margin: 0; font-size: 13px; }

    .onboarding-template-action {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      margin: 0 0 20px;
      padding: 14px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--cream);
    }
    .onboarding-template-action p { margin: 0; font-size: 13px; }
    .onboarding-template-action button { width: auto; flex: 0 0 auto; margin: 0; }

    .onboarding-state-card,
    .onboarding-checklist {
      padding: 16px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fafafa;
      color: var(--muted);
    }
    .onboarding-state-card.onboarding-error { border-color: #efb6aa; background: #fff1ee; color: #9d321f; }

    .onboarding-telegram-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 12px;
    }

    .onboarding-telegram-actions button { width: auto; margin: 0; }
    .onboarding-checklist { display: grid; gap: 10px; }
    .onboarding-check-item { display: flex; justify-content: space-between; gap: 16px; color: var(--ink); }
    .onboarding-check-item span:last-child { font-weight: 750; }
    .onboarding-check-item .ready { color: #24705a; }
    .onboarding-check-item .pending { color: #a14d2f; }

    @media (max-width: 600px) {
      .onboarding-progress small { font-size: 10px; }
      .onboarding-progress li::before { left: calc(-50% + 12px); width: calc(100% - 24px); }
      .onboarding-progress span { width: 28px; height: 28px; }
      .onboarding-telegram-actions { display: grid; grid-template-columns: 1fr; }
      .onboarding-telegram-actions button { width: 100%; }
      .onboarding-template-action { align-items: stretch; flex-direction: column; }
      .onboarding-template-action button { width: 100%; }
    }

    .ads-cmo-toolbar, .ads-cmo-kpis, .ads-cmo-two-column { display: grid; gap: 14px; }
    .ads-cmo-view-tabs { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px; margin: 18px 0 14px; padding: 4px; border-radius: 10px; background: #e9e9e7; }
    .ads-cmo-view-tab { width: 100%; margin: 0; padding: 11px 14px; border: 0; border-radius: 7px; background: transparent; color: var(--muted); box-shadow: none; }
    .ads-cmo-view-tab.active { background: #fff; color: #111; box-shadow: 0 1px 4px rgba(20, 20, 20, .12); }
    .ads-cmo-toolbar { grid-template-columns: minmax(220px, 1.4fr) minmax(160px, .7fr) auto; align-items: end; }
    .ads-cmo-toolbar-actions { display: flex; gap: 8px; }
    .ads-cmo-toolbar-actions button { margin: 0; white-space: nowrap; }
    .ads-cmo-kpis { grid-template-columns: repeat(6, minmax(0, 1fr)); margin: 18px 0; }
    .ads-cmo-kpi, .ads-cmo-section { padding: 16px; border: 1px solid var(--line); border-radius: 14px; background: #fff; }
    .ads-cmo-kpi small { display: block; color: var(--muted); font-size: 11px; font-weight: 800; text-transform: uppercase; }
    .ads-cmo-kpi strong { display: block; margin-top: 7px; font-size: clamp(18px, 2vw, 25px); }
    .ads-cmo-overall-title { margin: 20px 0 0; font-size: 18px; }
    .ads-cmo-product-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin: 12px 0 18px; }
    .ads-cmo-product-card { min-width: 0; padding: 16px; border: 1px solid var(--line); border-radius: 12px; background: #fff; }
    .ads-cmo-product-card > header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding-bottom: 12px; border-bottom: 1px solid var(--line); }
    .ads-cmo-product-card > header strong { overflow-wrap: anywhere; font-size: 17px; }
    .ads-cmo-product-card > header small { color: var(--muted); white-space: nowrap; }
    .ads-cmo-product-metrics { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-top: 12px; }
    .ads-cmo-product-metric { min-width: 0; padding: 10px; border-radius: 8px; background: #f6f6f4; }
    .ads-cmo-product-metric small { display: block; color: var(--muted); font-size: 10px; font-weight: 800; text-transform: uppercase; }
    .ads-cmo-product-metric strong { display: block; margin-top: 4px; overflow-wrap: anywhere; font-size: 16px; }
    .ads-cmo-two-column { grid-template-columns: repeat(2, minmax(0, 1fr)); margin-top: 14px; }
    .ads-cmo-section h2, .ads-cmo-section h3 { margin-top: 0; }
    .ads-cmo-section ul { margin: 0; padding-left: 20px; }
    .ads-cmo-section li + li { margin-top: 7px; }
    .ads-cmo-scorecard { width: 100%; border-collapse: collapse; }
    .ads-cmo-scorecard th, .ads-cmo-scorecard td { padding: 9px 8px; border-bottom: 1px solid var(--line); text-align: left; }
    .ads-cmo-scorecard th { color: var(--muted); font-size: 11px; text-transform: uppercase; }
    .ads-cmo-status { display: inline-flex; align-items: center; gap: 7px; padding: 7px 10px; border-radius: 999px; background: var(--blue-soft); font-size: 12px; font-weight: 800; }
    .ads-cmo-settings-panel { margin-top: 16px; overflow: hidden; border: 1px solid var(--line); border-radius: 16px; background: #fff; }
    .ads-cmo-settings-panel > summary { padding: 16px 18px; background: #f7f7f5; font-size: 16px; font-weight: 800; }
    .ads-cmo-settings-content { padding: 18px; border-top: 1px solid var(--line); }
    .ads-cmo-push-content { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
    .ads-cmo-push-content .note { margin: 0; }
    .ads-cmo-push-content button { flex: 0 0 auto; }
    .ads-cmo-settings-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; padding: 14px; border-radius: 12px; background: #f7f7f5; }
    .ads-cmo-settings-grid .check-row { grid-column: 1 / -1; min-height: 48px; padding: 0 12px; border: 1px solid var(--line); border-radius: 10px; background: #fff; }
    .ads-cmo-settings-grid > div, .ads-cmo-product-rule > div { min-width: 0; }
    .ads-cmo-settings-grid label:not(.check-row), .ads-cmo-product-rule label { margin: 0 0 7px; color: #4d5158; font-size: 12px; font-weight: 800; }
    .ads-cmo-rules-heading { align-items: flex-end; margin: 24px 0 12px; padding-bottom: 12px; border-bottom: 1px solid var(--line); }
    .ads-cmo-rules-heading h3 { margin: 0 0 4px; }
    .ads-cmo-rules-heading .note { margin: 0; }
    .ads-cmo-rules-heading button { flex: 0 0 auto; }
    #adsCmoProductRules { display: grid; gap: 12px; }
    .ads-cmo-product-rule { display: grid; grid-template-columns: 1fr 1.4fr .9fr repeat(3, .7fr) auto; gap: 10px; align-items: end; margin: 0; padding: 14px; border: 1px solid var(--line); border-radius: 12px; background: #fff; box-shadow: 0 4px 14px rgba(20, 20, 20, .035); }
    .ads-cmo-product-rule .danger { min-width: 88px; }
    .ads-cmo-settings-actions { justify-content: flex-end; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--line); }
    .ads-cmo-empty { padding: 28px; border: 1px dashed var(--line); border-radius: 14px; color: var(--muted); text-align: center; }
    .ads-cmo-live { margin-top: 18px; padding: 18px; border: 1px solid var(--line); border-radius: 14px; background: #fff; }
    .ads-cmo-live-badge { align-self: flex-start; padding: 6px 9px; border-radius: 999px; background: #e8f6ef; color: #24705a; font-size: 11px; font-weight: 800; }
    .ads-cmo-live-spend { display: flex; align-items: baseline; justify-content: space-between; gap: 16px; margin-top: 14px; padding: 16px; border-radius: 10px; background: #111; color: #fff; }
    .ads-cmo-live-spend small { color: #d8d8d8; font-weight: 700; }
    .ads-cmo-live-spend strong { font-size: clamp(24px, 4vw, 38px); }
    .ads-cmo-live-groups { display: grid; grid-template-columns: .75fr 1.25fr; gap: 14px; margin-top: 14px; }
    .ads-cmo-live-groups > section, .ads-cmo-live-campaigns { padding: 14px; border: 1px solid var(--line); border-radius: 10px; }
    .ads-cmo-live-groups h3, .ads-cmo-live-campaigns h3 { margin: 0 0 12px; }
    .ads-cmo-live-metrics { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
    .ads-cmo-live-groups > section:first-child .ads-cmo-live-metrics { grid-template-columns: 1fr; }
    .ads-cmo-live-metric { min-width: 0; padding: 11px; border-radius: 8px; background: #f6f6f4; }
    .ads-cmo-live-metric small, .ads-cmo-live-metric span { display: block; color: var(--muted); }
    .ads-cmo-live-metric strong { display: block; margin: 4px 0; font-size: 20px; }
    .ads-cmo-live-metric span { font-size: 11px; }
    .ads-cmo-live-campaigns { margin-top: 14px; }
    .ads-cmo-table-scroll { max-width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
    .ads-cmo-table-scroll table { min-width: 1280px; border-collapse: collapse; }
    .ads-cmo-table-scroll th, .ads-cmo-table-scroll td { padding: 9px 10px; border-bottom: 1px solid var(--line); text-align: right; white-space: nowrap; }
    .ads-cmo-table-scroll th:first-child, .ads-cmo-table-scroll td:first-child { position: sticky; left: 0; z-index: 1; min-width: 220px; background: #fff; text-align: left; }
    .ads-cmo-table-scroll td small { display: block; margin-top: 3px; color: var(--muted); }
    .ads-cmo-campaign-cards { display: none; }
    .ads-cmo-campaign-card { border: 1px solid var(--line); border-radius: 8px; background: #fff; }
    .ads-cmo-campaign-card + .ads-cmo-campaign-card { margin-top: 8px; }
    .ads-cmo-campaign-card summary { display: grid; grid-template-columns: minmax(0, 1fr) auto 18px; gap: 10px; align-items: center; padding: 11px; cursor: pointer; list-style: none; }
    .ads-cmo-campaign-card summary::-webkit-details-marker { display: none; }
    .ads-cmo-campaign-card summary::after { width: 7px; height: 7px; border-right: 2px solid currentColor; border-bottom: 2px solid currentColor; content: ""; transform: rotate(45deg); transition: transform 180ms ease; }
    .ads-cmo-campaign-card[open] summary::after { transform: rotate(225deg); }
    .ads-cmo-campaign-title { min-width: 0; }
    .ads-cmo-campaign-title strong, .ads-cmo-campaign-title small { display: block; overflow-wrap: anywhere; }
    .ads-cmo-campaign-title small { margin-top: 3px; color: var(--muted); font-size: 11px; }
    .ads-cmo-campaign-spend { font-weight: 800; white-space: nowrap; }
    .ads-cmo-campaign-detail { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1px; padding: 1px; border-top: 1px solid var(--line); background: var(--line); }
    .ads-cmo-campaign-detail div { min-width: 0; padding: 9px 10px; background: #fff; }
    .ads-cmo-campaign-detail small, .ads-cmo-campaign-detail strong { display: block; }
    .ads-cmo-campaign-detail small { color: var(--muted); font-size: 10px; font-weight: 700; text-transform: uppercase; }
    .ads-cmo-campaign-detail strong { margin-top: 3px; overflow-wrap: anywhere; font-size: 14px; }
    .ads-cmo-live-warnings { margin: 12px 0 0; padding: 12px 12px 12px 30px; border-radius: 8px; background: #fff4e5; color: #7b4c12; }
    @media (max-width: 1180px) {
      .ads-cmo-product-rule { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      .ads-cmo-product-rule > div:nth-child(2) { grid-column: span 2; }
      .ads-cmo-product-rule .danger { grid-column: 3; }
    }
    @media (max-width: 820px) {
      .ads-cmo-toolbar, .ads-cmo-settings-grid, .ads-cmo-two-column { grid-template-columns: 1fr; }
      .ads-cmo-settings-content { padding: 12px; }
      .ads-cmo-push-content { align-items: stretch; flex-direction: column; }
      .ads-cmo-push-content button { width: 100%; }
      .ads-cmo-settings-grid { padding: 10px; }
      .ads-cmo-settings-grid .check-row { grid-column: auto; }
      .ads-cmo-rules-heading { align-items: stretch; }
      .ads-cmo-rules-heading button { width: 100%; }
      .ads-cmo-toolbar-actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
      #adsCmoRetryButton { grid-column: 1 / -1; }
      .ads-cmo-kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .ads-cmo-product-rule { grid-template-columns: 1fr 1fr; }
      .ads-cmo-product-rule > div:nth-child(2) { grid-column: auto; }
      .ads-cmo-product-rule .danger { grid-column: 1 / -1; }
      .ads-cmo-live { padding: 12px; }
      .ads-cmo-live-spend { align-items: flex-start; flex-direction: column; }
      .ads-cmo-live-groups { grid-template-columns: 1fr; gap: 10px; margin-top: 10px; }
      .ads-cmo-live-groups > section, .ads-cmo-live-campaigns { padding: 10px; }
      .ads-cmo-live-groups h3, .ads-cmo-live-campaigns h3 { margin-bottom: 8px; font-size: 17px; }
      .ads-cmo-live-metrics, .ads-cmo-live-groups > section:first-child .ads-cmo-live-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .ads-cmo-live-metric { min-height: 82px; padding: 9px; }
      .ads-cmo-live-metric strong { margin: 3px 0; font-size: 18px; }
      .ads-cmo-live-metric span { font-size: 10px; }
      .ads-cmo-product-grid { grid-template-columns: 1fr; }
      .ads-cmo-product-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .ads-cmo-live-campaigns .ads-cmo-table-scroll { display: none; }
      .ads-cmo-campaign-cards { display: block; }
    }
    @media (max-width: 520px) {
      .ads-cmo-product-rule { grid-template-columns: 1fr; }
      .ads-cmo-product-rule .danger { grid-column: auto; width: 100%; }
      .ads-cmo-settings-actions button { width: 100%; }
    }
  </style>`;
};
