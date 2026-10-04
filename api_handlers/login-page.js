const { isAuthed } = require("../lib/auth");

function loginHtml({ error, setupMissing } = {}) {
  return `<!doctype html>
<html lang="ms">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>Login - BuddyPilot</title>
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
      font-family: Arial, Helvetica, ui-sans-serif, system-ui, -apple-system, sans-serif;
      background: #f9f9f9;
      color: #0f0f0f;
      --ink: #0f0f0f;
      --muted: #606060;
      --line: #e5e5e5;
      --accent: #ff0033;
      --accent-hover: #d9002b;
    }

    * { box-sizing: border-box; }

    body {
      display: grid;
      min-height: 100vh;
      margin: 0;
      padding: env(safe-area-inset-top) 0 env(safe-area-inset-bottom);
      background: #f9f9f9;
      color: var(--ink);
    }

    main {
      width: min(430px, calc(100% - 28px));
      margin: auto;
      padding: 48px 0;
    }

    .card {
      position: relative;
      overflow: hidden;
      background: #fff;
      border: 1px solid var(--line);
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(15, 15, 15, 0.07);
      padding: 30px;
    }

    .card::before {
      content: "";
      position: absolute;
      inset: 0 0 auto;
      height: 3px;
      background: var(--accent);
    }

    h1 {
      margin: 0 0 7px;
      font-size: 31px;
      line-height: 1.15;
      letter-spacing: 0;
    }

    .logo {
      width: 52px;
      height: 52px;
      margin-bottom: 20px;
      border: 1px solid var(--line);
      border-radius: 8px;
      box-shadow: none;
    }

    p {
      margin: 0;
      color: var(--muted);
      line-height: 1.55;
    }

    label {
      display: block;
      margin: 22px 0 7px;
      color: #3f3f3f;
      font-size: 13px;
      font-weight: 650;
    }

    input {
      width: 100%;
      min-height: 44px;
      border: 1px solid #d3d3d3;
      border-radius: 8px;
      padding: 10px 12px;
      background: #fff;
      color: var(--ink);
      font: inherit;
      outline: 0;
    }

    input:focus {
      border-color: #065fd4;
      box-shadow: 0 0 0 1px #065fd4;
    }

    button {
      min-height: 42px;
      margin-top: 18px;
      width: 100%;
      border: 1px solid transparent;
      border-radius: 8px;
      padding: 10px 16px;
      background: var(--accent);
      color: #fff;
      font: inherit;
      font-weight: 680;
      cursor: pointer;
      transition: background-color 140ms ease;
    }

    button:hover { background: var(--accent-hover); }

    button:focus-visible {
      outline: 3px solid rgba(6, 95, 212, 0.28);
      outline-offset: 2px;
    }

    .error,
    .setup {
      margin-top: 14px;
      border-radius: 6px;
      padding: 11px 12px;
      font-size: 14px;
      line-height: 1.45;
    }

    .error {
      display: ${error ? "block" : "none"};
      border: 1px solid #ecc9c9;
      background: #fbefef;
      color: #8f3f3f;
    }

    .setup {
      display: ${setupMissing ? "block" : "none"};
      border: 1px solid #e8d4ad;
      background: #faf4e7;
      color: #785a27;
    }

    @media (max-width: 520px) {
      main {
        width: calc(100% - 24px);
        padding: 16px 0;
      }
      .card {
        padding: 24px 18px;
        box-shadow: none;
      }
      h1 { font-size: 28px; }
      input { min-height: 48px; font-size: 16px; }
      button { min-height: 48px; }
    }

    @keyframes login-in {
      from {
        opacity: 0;
        transform: translate3d(0, 10px, 0) scale(0.99);
      }
      to {
        opacity: 1;
        transform: translate3d(0, 0, 0) scale(1);
      }
    }

    .card {
      animation: login-in 300ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
    }

    input,
    button {
      transition: border-color 180ms ease, box-shadow 180ms ease, background-color 180ms ease, transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1);
    }

    button {
      -webkit-tap-highlight-color: transparent;
      touch-action: manipulation;
    }

    button:active {
      transform: scale(0.975);
      transition-duration: 80ms;
    }

    @media (prefers-reduced-motion: reduce) {
      *,
      *::before,
      *::after {
        animation-duration: 1ms !important;
        transition-duration: 1ms !important;
      }
    }
  </style>
  <link rel="stylesheet" href="/buddypilot-redesign.css?v=1">
</head>
<body>
  <main>
    <section class="card">
      <img class="logo" src="/icons/app-icon-512x512.png?v=3" alt="BuddyPilot" width="72" height="72">
      <h1>BuddyPilot</h1>
      <p>Masukkan password untuk akses workspace anda.</p>
      <form method="post" action="/api/login">
        <label for="password">Password</label>
        <input id="password" name="password" type="password" autocomplete="current-password" autofocus required>
        <button type="submit">Login</button>
      </form>
      <div class="error">Password salah.</div>
      <div class="setup">APP_PASSWORD belum diset di Vercel env. Set env production dahulu, kemudian redeploy.</div>
    </section>
  </main>
</body>
</html>`;
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.end("Method not allowed.");
    return;
  }

  if (isAuthed(req)) {
    res.statusCode = 302;
    res.setHeader("location", "/");
    res.end("Redirecting.");
    return;
  }

  const hasError = String(req.url || "").includes("error=1");
  const setupMissing = !process.env.APP_PASSWORD;
  res.setHeader("content-type", "text/html; charset=utf-8");
  res.statusCode = 200;
  res.end(loginHtml({ error: hasError, setupMissing }));
};
