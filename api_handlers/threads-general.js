const { requireAuth } = require("../lib/auth");
const { readJsonBody } = require("../lib/postpilot");
const templates = require("../lib/threads-viral-templates");
const {
  generateAdaptivePost,
  threadsFamilyDeck,
} = require("../lib/postpilot-pattern-engine");
const {
  getPostPilotVoiceProfile,
  listPostPilotCopyHistory,
  prunePostPilotCopyHistory,
  recordPostPilotCopyHistory,
} = require("../lib/supabase-db");

function randomItem(values) {
  return values[Math.floor(Math.random() * values.length)] || values[0] || "";
}

function hashtags(category, topic, enabled) {
  if (!enabled) return "";
  const tags = [category, topic, "ThreadsMY"]
    .map((value) => String(value || "").replace(/[^a-z0-9]/gi, ""))
    .filter(Boolean)
    .slice(0, 3);
  return tags.length ? `\n\n${tags.map((tag) => `#${tag}`).join(" ")}` : "";
}

module.exports = async function handler(req, res) {
  res.setHeader("content-type", "application/json; charset=utf-8");
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.end(JSON.stringify({ ok: false, error: "Method not allowed." }));
    return;
  }

  try {
    requireAuth(req);
    const body = await readJsonBody(req);
    const count = [1, 10, 50].includes(Number(body.count)) ? Number(body.count) : 1;
    const randomize = Boolean(body.randomize) || count > 1;
    const history = await listPostPilotCopyHistory({ channel: "threads_general", limit: 500 });
    const voiceProfile = await getPostPilotVoiceProfile("", "threads_general");
    const families = threadsFamilyDeck(count, Math.random);
    const posts = [];

    for (let index = 0; index < count; index += 1) {
      const category = randomize ? randomItem(templates.categories) : String(body.category || "Business");
      const tone = randomize ? randomItem(templates.toneOptions) : String(body.tone || "Casual");
      const audience = randomize ? randomItem(templates.audienceTypes) : String(body.audience || "orang Malaysia");
      const topic = randomize
        ? randomItem(templates.topicOptions || templates.categories)
        : String(body.topic || category);
      const generated = generateAdaptivePost({
        platform: "threads_general",
        category,
        topic,
        tone,
        audience,
        history: [...posts, ...history],
        voiceProfile,
        forcedFamily: families[index],
        seed: `${Date.now()}:${index}:${Math.random()}`,
      });
      const suffix = hashtags(category, topic, Boolean(body.hashtags));
      const postText = `${generated.postText.slice(0, 500 - suffix.length)}${suffix}`.trim();
      const saved = await recordPostPilotCopyHistory({
        ...generated,
        channel: "threads_general",
        postText,
        intentKey: `${category}:${tone}:${audience}`,
        metadata: { category, tone, audience, topic },
      });
      const post = {
        id: saved?.id || `viral-${Date.now()}-${index}-${Math.random().toString(16).slice(2)}`,
        postText,
        characterCount: postText.length,
        category,
        tone,
        audience,
        topic,
        structure: generated.patternFamily,
        patternFamily: generated.patternFamily,
        rating: "",
        createdAt: new Date().toISOString(),
      };
      posts.push(post);
      history.unshift({ ...generated, channel: "threads_general", postText });
    }

    await prunePostPilotCopyHistory({ channel: "threads_general", keep: 500 });
    res.statusCode = 200;
    res.end(JSON.stringify({ ok: true, count, posts }));
  } catch (error) {
    res.statusCode = error.statusCode || 400;
    res.end(JSON.stringify({ ok: false, error: error?.message || String(error) }));
  }
};
