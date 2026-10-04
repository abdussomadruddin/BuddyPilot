const { requireAuth } = require("../../lib/auth");
const { readJsonBody } = require("../../lib/postpilot");
const { recordActivity } = require("../../lib/supabase-db");
const {
  createAgencyOpportunity,
  createAgencyService,
  createAgencyTask,
  createAgencyTemplate,
  generateDueAgencyTasks,
  listAgencyOperations,
  saveAgencyHealth,
  updateAgencyService,
  updateAgencyOpportunity,
  updateAgencyTask,
  updateAgencyTemplate,
} = require("../../lib/agency-operations");

module.exports = async function handler(req, res) {
  res.setHeader("content-type", "application/json; charset=utf-8");
  try {
    requireAuth(req);
    if (req.method === "GET") {
      const url = new URL(req.url || "/", "http://localhost");
      const data = await listAgencyOperations(url.searchParams.get("clientCode") || "");
      res.statusCode = 200;
      res.end(JSON.stringify({ ok: true, ...data }));
      return;
    }

    if (req.method === "POST" || req.method === "PATCH") {
      const body = await readJsonBody(req);
      if (req.method === "POST" && body.action === "generate_recurring") {
        const generated = await generateDueAgencyTasks(body.clientCode || "");
        const data = await listAgencyOperations(body.clientCode || "", { generate: false });
        res.statusCode = 200;
        res.end(JSON.stringify({ ok: true, generated, ...data }));
        return;
      }
      const resource = String(body.resource || "").trim().toLowerCase();
      let saved;
      if (resource === "service") saved = req.method === "POST" ? await createAgencyService(body) : await updateAgencyService(body);
      else if (resource === "task") saved = req.method === "POST" ? await createAgencyTask(body) : await updateAgencyTask(body);
      else if (resource === "template") saved = req.method === "POST" ? await createAgencyTemplate(body) : await updateAgencyTemplate(body);
      else if (resource === "health") saved = await saveAgencyHealth(body);
      else if (resource === "opportunity") saved = req.method === "POST" ? await createAgencyOpportunity(body) : await updateAgencyOpportunity(body);
      else throw new Error("Jenis agency operation tidak sah.");

      await recordActivity({
        type: `${resource}_${req.method === "POST" ? "created" : "updated"}`,
        title: `${resource === "service" ? "Service" : resource === "template" ? "Recurring delivery" : resource === "health" ? "Client health" : resource === "opportunity" ? "Growth opportunity" : "Task"} agency ${req.method === "POST" ? "ditambah" : "dikemaskini"}`,
        description: saved.name || saved.title || "",
        entityType: resource,
        entityId: saved.id,
        metadata: { clientCode: saved.clientCode },
      });
      res.statusCode = 200;
      res.end(JSON.stringify({ ok: true, [resource]: saved }));
      return;
    }

    res.statusCode = 405;
    res.end(JSON.stringify({ ok: false, error: "Method not allowed." }));
  } catch (error) {
    res.statusCode = error.statusCode || 400;
    res.end(JSON.stringify({ ok: false, error: error?.message || String(error) }));
  }
};
