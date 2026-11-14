const { requireAuth } = require("../lib/auth");
const { readJsonBody } = require("../lib/http-body");
const settings = require("../lib/ai-key-settings");

module.exports = async function handler(req, res) {
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  try {
    requireAuth(req);
    if (req.method === "GET") {
      const statuses = await Promise.all(["gemini", "openrouter"].map(settings.getStatus));
      res.statusCode = 200;
      return res.end(JSON.stringify({ ok: true, providers: statuses, settings: await settings.getGenerationSettings() }));
    }
    if (req.method !== "POST") {
      res.statusCode = 405;
      return res.end(JSON.stringify({ ok: false, error: "Method not allowed." }));
    }
    if (req.headers["sec-fetch-site"] === "cross-site" || !/^application\/json(?:;|$)/i.test(req.headers["content-type"] || "")) {
      res.statusCode = 403;
      return res.end(JSON.stringify({ ok: false, error: "Request tidak dibenarkan." }));
    }
    const body = await readJsonBody(req);
    if (!["save", "test"].includes(body.action)) throw new Error("Tindakan tidak sah.");
    const result = body.action === "save"
      ? await settings.saveGenerationSettings(body.provider, body.model, body.apiKey, body.geminiFreeTierConfirmed === true)
      : await settings.testConnection(body.provider, body.apiKey, body.model);
    res.statusCode = 200;
    res.end(JSON.stringify({ ok: true, result }));
  } catch (error) {
    res.statusCode = error.statusCode === 401 ? 401 : 400;
    // All infrastructure failures are redacted, including database responses.
    const safe = /^(Pilih provider|Masukkan|Encryption server|Key tersimpan|Sambungan provider|Key ditolak|Had request|Provider tidak|Tindakan tidak)/.test(error.message || "");
    res.end(JSON.stringify({ ok: false, error: res.statusCode === 401 ? "Unauthorized." : safe ? error.message : "Tetapan key tidak tersedia. Semak migration dan konfigurasi server." }));
  }
};
