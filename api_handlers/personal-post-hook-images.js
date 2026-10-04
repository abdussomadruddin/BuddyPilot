const { requireAuth } = require("../lib/auth");
const {
  deletePostPilotHookGalleryImage,
  getPostPilotHookImage,
  listPostPilotHookImages,
  postPilotHookImageUrl,
  uploadPostPilotHookGalleryImage,
} = require("../lib/supabase-db");
const { parseMultipart, readRequestBody } = require("../lib/postpilot");

module.exports = async function handler(req, res) {
  try {
    requireAuth(req);
    if (req.method === "GET") {
      const params = new URL(req.url || "/", "http://localhost").searchParams;
      const id = params.get("id");
      if (id) {
        const image = await getPostPilotHookImage(id);
        res.statusCode = 302;
        res.setHeader("location", postPilotHookImageUrl(image));
        res.setHeader("cache-control", "private, max-age=300");
        res.end();
        return;
      }
      const images = await listPostPilotHookImages(params.get("product_id") || "");
      res.statusCode = 200;
      res.setHeader("content-type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ ok: true, images }));
      return;
    }

    if (req.method === "POST") {
      const productId = new URL(req.url || "/", "http://localhost").searchParams.get("product_id");
      const body = await readRequestBody(req);
      const { files } = parseMultipart(req, body);
      const image = await uploadPostPilotHookGalleryImage(files.hookImage, productId);
      res.statusCode = 200;
      res.setHeader("content-type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ ok: true, image }));
      return;
    }

    if (req.method === "DELETE") {
      const id = new URL(req.url || "/", "http://localhost").searchParams.get("id");
      const image = await deletePostPilotHookGalleryImage(id);
      res.statusCode = 200;
      res.setHeader("content-type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ ok: true, image }));
      return;
    }

    res.statusCode = 405;
    res.end(JSON.stringify({ ok: false, error: "Method not allowed." }));
  } catch (error) {
    res.statusCode = error.statusCode || 400;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ ok: false, error: error?.message || String(error) }));
  }
};
