const { exchangeGoogleCode } = require("../../lib/invoices");

function queryParam(req, key) {
  const parsed = new URL(req.url || "/", "http://localhost");
  return parsed.searchParams.get(key);
}

function htmlEscape(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.end("Method not allowed.");
    return;
  }

  try {
    const error = queryParam(req, "error");
    if (error) throw new Error(`Google OAuth error: ${error}`);

    const code = queryParam(req, "code");
    if (!code) throw new Error("Google OAuth code tiada.");

    const tokens = await exchangeGoogleCode(code);
    const refreshToken = tokens.refresh_token || "";
    const accessToken = tokens.access_token || "";

    res.statusCode = 200;
    res.setHeader("content-type", "text/html; charset=utf-8");
    res.end(`<!doctype html>
<html lang="ms">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Google Drive Connected</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #111827; background: #f4f5f7; }
    main { max-width: 760px; margin: auto; background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 24px; }
    code, pre { background: #f3f4f6; border-radius: 8px; padding: 12px; white-space: pre-wrap; word-break: break-all; }
  </style>
</head>
<body>
  <main>
    <h1>Google Drive connected</h1>
    <p>Copy refresh token ini ke Vercel env sebagai <strong>GOOGLE_REFRESH_TOKEN</strong>.</p>
    <pre>${htmlEscape(refreshToken || "(Tiada refresh token. Cuba semula /api/google/oauth-start.)")}</pre>
    <p>Access token sementara:</p>
    <pre>${htmlEscape(accessToken || "-")}</pre>
  </main>
</body>
</html>`);
  } catch (error) {
    res.statusCode = error.statusCode || 400;
    res.setHeader("content-type", "text/plain; charset=utf-8");
    res.end(error?.message || String(error));
  }
};
