const { requireAuth } = require("../../lib/auth");
const { createPairCode } = require("../../lib/postpilot-remote");
const { handleError, json } = require("./_shared");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { ok: false, error: "Method not allowed." });
  try {
    requireAuth(req);
    json(res, 200, { ok: true, pairing: await createPairCode() });
  } catch (error) {
    handleError(res, error);
  }
};
