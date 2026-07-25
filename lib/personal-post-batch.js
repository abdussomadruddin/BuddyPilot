const {
  buildPersonalPostPreview,
  defaultCommentCta,
  PERSONAL_POST_ANGLE_COUNT,
} = require("./personal-postpilot");
const {
  getPostPilotVoiceProfile,
  getPostPilotDraft,
  listPostPilotCopyHistory,
  prunePostPilotCopyHistory,
  recordPostPilotCopyHistory,
  reservePostPilotHookImages,
  upsertPostPilotDraft,
} = require("./supabase-db");
const { familyDeck } = require("./postpilot-pattern-engine");

const MODES = ["soft", "hard", "proof", "engagement", "objection"];

function randomItem(list) {
  return list[Math.floor(Math.random() * list.length)] || list[0];
}

function shuffled(values) {
  return [...values].sort(() => Math.random() - 0.5);
}

function pickVariation(mode, recent = []) {
  const used = new Set(recent.map((value) => String(value)));
  for (let attempt = 0; attempt < PERSONAL_POST_ANGLE_COUNT * 2; attempt += 1) {
    const variation = Math.floor(Math.random() * PERSONAL_POST_ANGLE_COUNT);
    if (!used.has(`${mode}:${variation}`)) return variation;
  }
  return Math.floor(Math.random() * PERSONAL_POST_ANGLE_COUNT);
}

async function buildPersonalPostBatch({ count = 1, productId = "", productName = "", affiliateLink = "", personalBackground = "", angleNote = "" } = {}) {
  const safeCount = Number(count) === 5 ? 5 : 1;
  const draft = await getPostPilotDraft();
  const activeProductId = productId || draft.activeProductId;
  const images = await reservePostPilotHookImages(safeCount, activeProductId);
  const history = await listPostPilotCopyHistory({ productId: activeProductId, limit: 300 });
  const voiceProfile = await getPostPilotVoiceProfile(activeProductId, "promote");
  const nextModes = MODES.filter((mode) => mode !== draft.postMode);
  const modes = safeCount === 5
    ? shuffled(MODES)
    : [randomItem(nextModes.length ? nextModes : MODES)];
  const families = familyDeck(safeCount, Math.random);
  let recent = Array.isArray(draft.recentVariations) ? draft.recentVariations.slice(-120) : [];
  const posts = [];

  for (let index = 0; index < safeCount; index += 1) {
    const mode = modes[index];
    const variation = pickVariation(mode, recent);
    const generated = await buildPersonalPostPreview({
      productName: productName || draft.productName,
      affiliateLink: affiliateLink || draft.affiliateLink,
      personalBackground,
      angleNote,
      postMode: mode,
      variation,
      history,
      voiceProfile,
      forcedFamily: families[index],
    });
    const key = `${mode}:${variation}`;
    recent = [...recent.filter((value) => String(value) !== key), key].slice(-120);
    posts.push({
      id: `postpilot-batch-${Date.now()}-${index}`,
      postText: generated.preview.post_text,
      facebookPostText: generated.preview.facebook_post_text,
      threadsPostText: generated.preview.threads_post_text,
      commentCta: defaultCommentCta(affiliateLink || draft.affiliateLink),
      postMode: mode,
      variation,
      style: generated.preview.style,
      pattern: generated.preview.pattern,
      image: {
        id: images[index].id,
        name: images[index].name,
        type: images[index].type || "image/jpeg",
        url: images[index].url,
      },
    });
    const records = [
      ["facebook", generated.preview.pattern.facebook, generated.preview.facebook_post_text],
      ["threads", generated.preview.pattern.threads, generated.preview.threads_post_text],
    ];
    for (const [channel, pattern, postText] of records) {
      await recordPostPilotCopyHistory({
        ...pattern,
        channel,
        productId: activeProductId,
        postText,
        intentKey: mode,
        metadata: { mode, batchSize: safeCount },
      });
      history.unshift({ ...pattern, channel, productId: activeProductId, postText });
    }
  }

  await upsertPostPilotDraft({
    productName: productName || draft.productName,
    affiliateLink: affiliateLink || draft.affiliateLink,
    activeProductId: productId || draft.activeProductId,
    postMode: modes[modes.length - 1],
    recentVariations: recent,
  });
  await Promise.all([
    prunePostPilotCopyHistory({ productId: activeProductId, channel: "facebook", keep: 500 }),
    prunePostPilotCopyHistory({ productId: activeProductId, channel: "threads", keep: 500 }),
  ]);

  return { count: safeCount, posts };
}

module.exports = {
  buildPersonalPostBatch,
};
