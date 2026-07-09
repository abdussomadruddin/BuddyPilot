const { requireAuth } = require("../lib/auth");
const {
  parseMultipart,
  publishToFacebook,
  readRequestBody,
} = require("../lib/postpilot");
const { recordActivity } = require("../lib/supabase-db");

module.exports = async function handler(req, res) {
  res.setHeader("content-type", "application/json; charset=utf-8");

  if (req.method !== "POST") {
    res.statusCode = 405;
    res.end(JSON.stringify({ ok: false, error: "Method not allowed." }));
    return;
  }

  try {
    requireAuth(req);
    const body = await readRequestBody(req);
    const { values, files } = parseMultipart(req, body);
    const creative = files.creative;
    if (!creative || !creative.data.length) throw new Error("Creative file wajib diupload.");

    const caption = String(values.caption || "").trim();
    const firstComment = String(values.first_comment || "").trim();
    if (!caption) throw new Error("Caption wajib ada sebelum approve.");
    if (!firstComment) throw new Error("Comment CTA wajib ada sebelum approve.");

    const result = await publishToFacebook({
      file: creative,
      caption,
      firstComment,
    });
    await recordActivity({
      type: "facebook_posted",
      title: "BuddyPilot posted ke Facebook",
      description: result.permalink_url || result.post_id || "Post berjaya dipublish.",
      entityType: "facebook_post",
      entityId: result.post_id || "",
      metadata: { postUrl: result.permalink_url || "" },
    });

    res.statusCode = 200;
    res.end(JSON.stringify({
      ok: true,
      ...result,
    }));
  } catch (error) {
    res.statusCode = error.statusCode || 400;
    res.end(JSON.stringify({ ok: false, error: error?.message || String(error) }));
  }
};
