// Facebook Storytelling API. GET reads, POST { action } writes or calls the AI.
// The AI key stays on the server; nothing here publishes to Facebook.
const { requireAuth } = require("../lib/auth");
const { readJsonBody } = require("../lib/http-body");
const { verifyModel } = require("../lib/storytelling-ai");
const story = require("../lib/storytelling");

function send(res, status, body) {
  res.statusCode = status;
  res.end(JSON.stringify(body));
}

async function bootstrap(store) {
  const config = story.publicConfig();
  try {
    const [dna, versions, samples, drafts] = await Promise.all([
      story.activeDna(store),
      store.list("dna", { limit: 20 }),
      store.list("sample", { limit: 100 }),
      story.listDrafts(store),
    ]);
    return {
      config,
      dna,
      dnaVersions: versions.map((row) => ({ id: row.id, version: row.version, source: row.source, note: row.note || "", createdAt: row.createdAt })),
      samples,
      drafts,
      setupRequired: false,
    };
  } catch (error) {
    if (error.code !== "setup_required") throw error;
    return { config, dna: { id: "", version: 0, source: "preset", profile: story.normalizeDna(story.PRESET_DNA) }, dnaVersions: [], samples: [], drafts: [], setupRequired: true, setupMessage: error.message };
  }
}

const ACTIONS = {
  "sample.save": async (store, body) => {
    const data = story.sampleInput(body);
    const title = data.content.split("\n")[0].slice(0, 80);
    return { sample: body.id ? await store.update("sample", body.id, { title, data }) : await store.insert("sample", { title, data }) };
  },
  "sample.select": async (store, body) => {
    const sample = await store.get("sample", body.id);
    return { sample: await store.update("sample", body.id, { data: { content: sample.content, category: sample.category || "", characters: sample.characters, source: sample.source || "", selected: Boolean(body.selected) } }) };
  },
  "sample.delete": async (store, body) => { await store.remove("sample", body.id); return {}; },
  "sample.import": async (store, body) => {
    const blocks = story.splitImport(body.text);
    if (!blocks.length) throw Object.assign(new Error("Tiada post dijumpai. Asingkan setiap post dengan baris --- atau dua baris kosong."), { statusCode: 400 });
    const samples = [];
    for (const block of blocks) {
      const data = story.sampleInput({ content: block, category: body.category });
      samples.push(await store.insert("sample", { title: data.content.split("\n")[0].slice(0, 80), data: { ...data, source: "import" } }));
    }
    return { samples };
  },
  "dna.analyze": async (store, body, options) => ({ dna: await story.analyzeDna(store, options) }),
  "dna.save": async (store, body) => ({ dna: await story.saveDna(store, body.profile || {}, "manual", "Disunting secara manual.") }),
  "dna.reset": async (store) => ({ dna: await story.saveDna(store, story.PRESET_DNA, "preset", "Kembali ke preset asal.") }),
  "dna.restore": async (store, body) => {
    const version = await store.get("dna", body.id);
    return { dna: await story.saveDna(store, version.profile, "restore", `Dipulihkan daripada versi ${version.version}.`) };
  },
  "dna.learn": async (store, body, options) => story.learnFromFeedback(store, options),
  generate: async (store, body, options) => story.generatePost(store, body, options),
  // "mode" because "action" already names the request.
  rewrite: async (store, body, options) => story.rewritePost(store, { ...body, action: body.mode }, options),
  quality: async (store, body, options) => story.reviewPost(store, body, options),
  "draft.save": async (store, body) => ({ draft: await story.saveDraft(store, body) }),
  "draft.status": async (store, body) => {
    if (!story.STATUSES.includes(body.status)) throw Object.assign(new Error("Status draf tidak sah."), { statusCode: 400 });
    return { draft: await store.update("draft", body.id, { status: body.status }) };
  },
  "draft.duplicate": async (store, body) => {
    const draft = await store.get("draft", body.id);
    return { draft: await story.saveDraft(store, { ...draft, id: "", topic: `${draft.topic || draft.title} (salinan)`, status: "draft" }) };
  },
  "draft.delete": async (store, body) => { await store.remove("draft", body.id); return {}; },
  "feedback.save": async (store, body) => story.saveFeedback(store, body),
  "ai.verify": async (store, body, options) => ({ verification: await (options.verify || verifyModel)() }),
};

// The request logic without HTTP, so tests and the local stub can run it with
// an in-memory store and a mock AI.
async function dispatch(store, { method = "GET", url = "/", body = {}, options = {} } = {}) {
  if (method === "GET") {
    const parsed = new URL(url, "http://localhost");
    const view = parsed.searchParams.get("view") || "bootstrap";
    if (view === "bootstrap") return bootstrap(store);
    if (view === "drafts") return { drafts: await story.listDrafts(store, { q: parsed.searchParams.get("q") || "", status: parsed.searchParams.get("status") || "" }) };
    if (view === "draft") {
      const id = parsed.searchParams.get("id");
      const [draft, revisions] = await Promise.all([store.get("draft", id), store.list("revision", { parentId: id, limit: 30 })]);
      return { draft, revisions };
    }
    throw Object.assign(new Error("Paparan tidak sah."), { statusCode: 400 });
  }
  if (method !== "POST") throw Object.assign(new Error("Method not allowed."), { statusCode: 405 });
  const action = ACTIONS[String(body.action || "")];
  if (!action) throw Object.assign(new Error("Tindakan tidak sah."), { statusCode: 400 });
  return action(store, body, options);
}

module.exports = async function handler(req, res) {
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  try {
    requireAuth(req);
    const body = req.method === "POST" ? await readJsonBody(req) : {};
    return send(res, 200, { ok: true, ...await dispatch(story.createStore(), { method: req.method, url: req.url || "/", body }) });
  } catch (error) {
    // Only the error text is logged: never writing samples, drafts or keys.
    if (!error.statusCode || error.statusCode >= 500) console.error("storytelling_error", { code: error.code || "", message: String(error?.message || error).slice(0, 200) });
    return send(res, error.statusCode || 500, { ok: false, code: error.code || "", error: error?.message || String(error) });
  }
};
module.exports.dispatch = dispatch;
