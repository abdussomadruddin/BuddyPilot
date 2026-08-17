const { finishMetaAuthorization } = require("../../lib/meta-ads");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.end("Method not allowed.");
    return;
  }
  const params = new URL(req.url || "/", "https://buddypilot.vercel.app").searchParams;
  try {
    await finishMetaAuthorization(params);
    res.statusCode = 200;
    res.setHeader("content-type", "text/html; charset=utf-8");
    res.end('<!doctype html><meta name="viewport" content="width=device-width"><title>Meta Connected</title><p>Meta Ads connected. Kembali ke BuddyPilot...</p><script>setTimeout(function(){location.replace("/?tab=clientpilot&meta=connected")},600)</script>');
  } catch (error) {
    const message = encodeURIComponent(error?.message || String(error));
    res.statusCode = 200;
    res.setHeader("content-type", "text/html; charset=utf-8");
    res.end(`<!doctype html><meta name="viewport" content="width=device-width"><title>Meta Error</title><p>Meta authorization gagal. Kembali ke BuddyPilot...</p><script>setTimeout(function(){location.replace("/?tab=clientpilot&meta=error&message=${message}")},900)</script>`);
  }
};
