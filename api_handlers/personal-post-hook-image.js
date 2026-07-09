const { requireAuth } = require("../lib/auth");
const {
  downloadPostPilotHookImage,
  uploadPostPilotHookImage,
} = require("../lib/supabase-db");
const {
  parseMultipart,
  readRequestBody,
} = require("../lib/postpilot");

function isSupabaseSetupError(error) {
  return /Supabase table belum setup|schema\.sql|relation .* does not exist|bucket .* not found|Bucket not found/i
    .test(error?.message || String(error || ""));
}

function browserFallbackDraft(file) {
  return {
    productName: "K-Method",
    affiliateLink: "https://swiy.co/kmethod",
    postMode: "soft",
    hookImagePath: "",
    hookImageName: file?.filename || "post-hook.jpg",
    hookImageMime: file?.contentType || "image/jpeg",
    hookImageSize: file?.data?.length || 0,
    hookImageUpdatedAt: new Date().toISOString(),
    hasHookImage: false,
    storage: "browser",
  };
}

module.exports = async function handler(req, res) {
  try {
    requireAuth(req);

    if (req.method === "GET") {
      const { draft, buffer, contentType } = await downloadPostPilotHookImage();
      res.statusCode = 200;
      res.setHeader("content-type", contentType);
      res.setHeader("content-length", String(buffer.length));
      res.setHeader("cache-control", "private, max-age=60");
      res.setHeader("content-disposition", `inline; filename="${(draft.hookImageName || "post-hook").replace(/"/g, "")}"`);
      res.end(buffer);
      return;
    }

    if (req.method === "POST") {
      const body = await readRequestBody(req);
      const { files } = parseMultipart(req, body);
      let draft;
      let storage = "supabase";
      try {
        draft = await uploadPostPilotHookImage(files.hookImage);
      } catch (error) {
        if (!isSupabaseSetupError(error)) throw error;
        storage = "browser";
        draft = browserFallbackDraft(files.hookImage);
      }
      res.statusCode = 200;
      res.setHeader("content-type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ ok: true, storage, draft }));
      return;
    }

    res.statusCode = 405;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ ok: false, error: "Method not allowed." }));
  } catch (error) {
    res.statusCode = error.statusCode || 400;
    res.setHeader("content-type", req.method === "GET" ? "text/plain; charset=utf-8" : "application/json; charset=utf-8");
    res.end(req.method === "GET"
      ? (error?.message || String(error))
      : JSON.stringify({ ok: false, error: error?.message || String(error) }));
  }
};
