const { requireAuth } = require("../lib/auth");
const {
  createPostPilotProduct,
  deletePostPilotProduct,
  listPostPilotProducts,
  upsertPostPilotDraft,
} = require("../lib/supabase-db");
const { readJsonBody } = require("../lib/postpilot");

module.exports = async function handler(req, res) {
  res.setHeader("content-type", "application/json; charset=utf-8");
  try {
    requireAuth(req);
    if (req.method === "GET") {
      res.statusCode = 200;
      res.end(JSON.stringify({ ok: true, products: await listPostPilotProducts() }));
      return;
    }
    if (req.method === "POST") {
      const body = await readJsonBody(req);
      const product = await createPostPilotProduct({ name: body.name, affiliateLink: body.affiliate_link });
      await upsertPostPilotDraft({ activeProductId: product.id, productName: product.name, affiliateLink: product.affiliateLink });
      res.statusCode = 201;
      res.end(JSON.stringify({ ok: true, product }));
      return;
    }
    if (req.method === "DELETE") {
      const body = await readJsonBody(req);
      const deleted = await deletePostPilotProduct(body.product_id);
      await upsertPostPilotDraft({
        activeProductId: deleted.nextProduct.id,
        productName: deleted.nextProduct.name,
        affiliateLink: deleted.nextProduct.affiliateLink,
      });
      res.statusCode = 200;
      res.end(JSON.stringify({
        ok: true,
        deleted_product: deleted.product,
        deleted_image_count: deleted.deletedImageCount,
        active_product: deleted.nextProduct,
        products: await listPostPilotProducts(),
      }));
      return;
    }
    res.statusCode = 405;
    res.end(JSON.stringify({ ok: false, error: "Method not allowed." }));
  } catch (error) {
    res.statusCode = error.statusCode || 400;
    res.end(JSON.stringify({ ok: false, error: error?.message || String(error) }));
  }
};
