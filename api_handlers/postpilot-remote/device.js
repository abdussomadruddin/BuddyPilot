const { requireAuth } = require("../../lib/auth");
const { getRemoteOverview } = require("../../lib/postpilot-remote");
const { handleError, json } = require("./_shared");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return json(res, 405, { ok: false, error: "Method not allowed." });
  try {
    requireAuth(req);
    json(res, 200, { ok: true, ...(await getRemoteOverview()) });
  } catch (error) {
    handleError(res, error);
  }
};
