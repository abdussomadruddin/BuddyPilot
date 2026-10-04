const { requireAuth } = require("../../lib/auth");
const { readJsonBody } = require("../../lib/postpilot");
const { jobAction } = require("../../lib/postpilot-remote");
const { reportOperationalSuccess } = require("../../lib/operations-events");
const { handleError, json } = require("./_shared");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { ok: false, error: "Method not allowed." });
  try {
    requireAuth(req);
    const body = await readJsonBody(req);
    const job = await jobAction({ jobId: body.job_id, action: body.action });
    if (["retry", "cancel"].includes(body.action)) {
      await reportOperationalSuccess({ fingerprint: `postpilot-job:${job.id}` });
    }
    json(res, 200, { ok: true, job });
  } catch (error) {
    handleError(res, error);
  }
};
