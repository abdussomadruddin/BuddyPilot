const { requireAuth } = require("../lib/auth");
const { readJsonBody } = require("../lib/postpilot");
const templates = require("../lib/threads-viral-templates");
const { generateThreadsGeneralBatch } = require("../lib/threads-general-engine");
const {
  getPostPilotVoiceProfile,
  listPostPilotCopyHistory,
  prunePostPilotCopyHistory,
  recordPostPilotCopyHistoryBatch,
} = require("../lib/supabase-db");

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
    const history = await listPostPilotCopyHistory({ channel: "threads_general", limit: 500 });
    const savedVoiceProfile = await getPostPilotVoiceProfile("", "threads_general");
    const generated = generateThreadsGeneralBatch({
      count,
      patternId: count === 1 ? String(body.patternId || "") : "",
      category: String(body.category || "business").toLowerCase(),
      tone: String(body.tone || "Casual"),
      audience: String(body.audience || "orang Malaysia"),
      categories: templates.categories,
      tones: templates.toneOptions,
      audiences: templates.audienceTypes,
      history,
      voiceProfile: savedVoiceProfile,
      seed: `${Date.now()}:${Math.random()}`,
    });
    const createdAt = new Date().toISOString();
    const pending = generated.posts.map((item) => {
      const suffix = hashtags(item.category, item.topic, Boolean(body.hashtags));
      const postText = `${item.postText.slice(0, 500 - suffix.length)}${suffix}`.trim();
      return {
        ...item,
        channel: "threads_general",
        postText,
        intentKey: `${item.category}:${item.tone}:${item.audience}:${item.angleId}`,
        metadata: {
          category: item.category,
          tone: item.tone,
          audience: item.audience,
          topic: item.topic,
          patternLabel: item.patternLabel,
          angleId: item.angleId,
          rhythmId: item.rhythmId,
          robotRisk: item.robotRisk,
          voiceActive: item.voiceActive,
        },
      };
    });
    const saved = await recordPostPilotCopyHistoryBatch(pending);
    const savedByHash = new Map(saved.map((item) => [item.textHash, item]));
    const posts = pending.map((item, index) => {
      const record = savedByHash.get(item.textHash);
      return {
        id: record?.id || `viral-${Date.now()}-${index}-${Math.random().toString(16).slice(2)}`,
        postText: item.postText,
        characterCount: item.postText.length,
        category: item.category,
        tone: item.tone,
        audience: item.audience,
        topic: item.topic,
        structure: item.patternLabel,
        patternFamily: item.patternFamily,
        patternId: item.patternId,
        patternLabel: item.patternLabel,
        angleId: item.angleId,
        rhythmId: item.rhythmId,
        robotRisk: item.robotRisk,
        textHash: item.textHash,
        lengthBucket: item.lengthBucket,
        rating: "",
        createdAt,
      };
    });

    await prunePostPilotCopyHistory({ channel: "threads_general", keep: 500 });
    res.statusCode = 200;
    res.end(JSON.stringify({
      ok: true,
      count,
      posts,
      voice: {
        active: Boolean(generated.voiceProfile.active),
        sampleCount: Number(generated.voiceProfile.sampleCount || 0),
      },
    }));
  } catch (error) {
    res.statusCode = error.statusCode || 400;
    res.end(JSON.stringify({ ok: false, error: error?.message || String(error) }));
  }
};
