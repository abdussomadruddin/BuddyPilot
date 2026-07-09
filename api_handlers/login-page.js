const { isAuthed } = require("../lib/auth");

function loginHtml({ error, setupMissing } = {}) {
  return `<!doctype html>
<html lang="ms">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Login - BuddyPilot</title>
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
      width: min(460px, calc(100% - 32px));
      margin: 72px auto;
    }

    .card {
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 18px;
      box-shadow: 0 14px 35px rgba(15, 23, 42, 0.08);
      padding: 26px;
    }

    h1 {
      margin: 0 0 8px;
      font-size: 36px;
      letter-spacing: -0.04em;
    }

    .logo {
      width: 72px;
      height: 72px;
      border-radius: 20px;
      box-shadow: 0 12px 30px rgba(15, 23, 42, 0.16);
      margin-bottom: 18px;
    }

    p { color: #4b5563; line-height: 1.55; }

    label {
      display: block;
      margin: 20px 0 8px;
      font-weight: 700;
    }

    input {
      width: 100%;
      box-sizing: border-box;
      border: 1px solid #cbd5e1;
      border-radius: 12px;
      padding: 13px 14px;
      font: inherit;
    }

    button {
      margin-top: 20px;
      width: 100%;
      border: 0;
      border-radius: 999px;
      padding: 14px 22px;
      background: #111827;
      color: #fff;
      font-weight: 800;
      cursor: pointer;
    }

	    .error {
	      margin-top: 16px;
	      border-radius: 12px;
	      background: #fef2f2;
	      border: 1px solid #fecaca;
	      color: #7f1d1d;
	      padding: 12px;
	      display: ${error ? "block" : "none"};
	    }

	    .setup {
	      margin-top: 16px;
	      border-radius: 12px;
	      background: #fff7ed;
	      border: 1px solid #fed7aa;
	      color: #7c2d12;
	      padding: 12px;
	      display: ${setupMissing ? "block" : "none"};
	    }
	  </style>
</head>
<body>
  <main>
    <section class="card">
      <img class="logo" src="/logo.svg" alt="BuddyPilot" width="72" height="72">
      <h1>BuddyPilot</h1>
      <p>Masukkan password untuk akses uploader Facebook Page.</p>
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
