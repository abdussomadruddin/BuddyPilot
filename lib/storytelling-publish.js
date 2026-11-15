// Post Pilot publishing: sends an approved draft to the Facebook Page or
// Threads, queues it for the Chrome extension (personal Facebook), and keeps
// one "publication" row per post per platform so its engagement can be tracked.
// A post is only ever sent by an explicit action for that platform.
const story = require("./storytelling");
const social = require("./social-publish");
const { generateText, parseJson } = require("./storytelling-ai");

const PLATFORMS = {
  page: { label: "Facebook Page", provider: "facebook_page" },
  threads: { label: "Threads", provider: "threads" },
  personal: { label: "Facebook personal", provider: "" },
};
const MIGRATION = "supabase/migrations/20261115000100_postpilot_publishing.sql";
const META_KEYS = ["id", "kind", "parentId", "title", "status", "createdAt", "updatedAt"];

const { clean, fail } = story;

function defaultSocial() {
  const credentials = require("./social-credentials");
  return { resolve: (provider) => credentials.resolveSocial(provider), page: social.facebookPage, threads: social.threads };
}

// The stored jsonb of an item, without the row columns the store mixes in.
function dataOf(item) {
  return Object.fromEntries(Object.entries(item).filter(([key]) => !META_KEYS.includes(key)));
}

function cleanMetrics(value = {}) {
  const metrics = {};
  for (const key of ["reactions", "comments", "shares", "reach", "views"]) {
    const number = Number(value[key]);
    if (value[key] !== "" && value[key] != null && Number.isFinite(number) && number >= 0) metrics[key] = Math.min(1e9, Math.round(number));
  }
  return metrics;
}

function publicationSummary(item) {
  return {
    id: item.id, platform: item.platform, draftId: item.draftId || "", url: item.url || "", source: item.source || "app",
    title: item.title, excerpt: clean(item.text).slice(0, 220), characters: clean(item.text).length, parts: (item.parts || []).length,
    postedAt: item.postedAt || item.createdAt, metrics: item.metrics || null, metricsAt: item.metricsAt || "", partial: item.partial === true,
  };
}

async function insertPublication(store, data) {
  try {
    return await store.insert("publication", { title: clean(data.text).split("\n")[0].slice(0, 80), status: data.platform, data });
  } catch (error) {
    // The kind check constraint rejects the row until the migration has run.
    if (/23514|check constraint|storytelling_items_kind_check/i.test(`${error?.message} ${error?.code}`)) throw fail(`Jadual belum dikemas kini untuk publishing. Jalankan migration ${MIGRATION} dahulu.`, 503, "setup_required");
    throw error;
  }
}

async function approvedDraft(store, id) {
  const draft = await store.get("draft", id);
  if (!["approved", "published"].includes(draft.status)) throw fail("Luluskan (Approve) draf ini dahulu sebelum post.", 400, "not_approved");
  if (clean(draft.content).length < 80) throw fail("Draf terlalu pendek untuk dipost.");
  return draft;
}

async function markPublished(store, draft, platform, publication) {
  const data = dataOf(draft);
  const published = { ...(data.published || {}), [platform]: { publicationId: publication.id, url: publication.url || "", at: publication.postedAt } };
  const next = { ...data, published };
  if (platform === "personal") delete next.personalQueued;
  return store.update("draft", draft.id, { status: "published", data: next });
}

// Publishes one approved draft to the Page or to Threads. The record is
// written before anything is sent, so a post can never go out untracked.
async function publishDraft(store, { id, platform, parts, again = false } = {}, { social: api = defaultSocial(), now = () => new Date() } = {}) {
  if (!["page", "threads"].includes(platform)) throw fail("Platform tidak sah.");
  const draft = await approvedDraft(store, id);
  if (draft.published?.[platform] && !again) throw fail(`Draf ini sudah dipost ke ${PLATFORMS[platform].label}.`, 409, "already_published");
  const threadParts = platform === "threads" ? social.validateParts(
    parts ?? (draft.content.length <= social.THREADS_LIMIT ? [draft.content] : social.splitForThreads(draft.content))
  ) : [];
  const account = await api.resolve(PLATFORMS[platform].provider);
  if (!account) throw fail(`${PLATFORMS[platform].label} belum disambung. Masukkan token di Tetapan > Akaun sosial.`, 400, "not_connected");

  const postedAt = now().toISOString();
  const image = draft.image || "";
  const base = { platform, draftId: draft.id, text: draft.content, parts: threadParts, topic: draft.topic || "", style: draft.style || "", source: "app", postedAt, metrics: null, ...(image ? { image } : {}), pending: true };
  const row = await insertPublication(store, base);
  let result;
  let warning = "";
  try {
    result = platform === "page" ? await api.page.publish(account, draft.content, { image }) : await api.threads.publish(account, threadParts, { image });
  } catch (error) {
    if (error.code !== "partial" || !error.postedIds?.length) {
      await store.remove("publication", row.id).catch(() => {});
      throw error;
    }
    // Some parts are live: keep the record so they are tracked and not reposted.
    result = { remoteId: error.postedIds[0], partIds: error.postedIds, url: "" };
    warning = error.message;
  }
  const { pending, ...rest } = base;
  const publication = await store.update("publication", row.id, { data: { ...rest, remoteId: result.remoteId, url: result.url || "", ...(result.partIds ? { partIds: result.partIds } : {}), ...(warning ? { partial: true } : {}) } });
  const updated = await markPublished(store, draft, platform, publication);
  return { publication: publicationSummary(publication), draft: story.draftSummary(updated), ...(warning ? { warning } : {}) };
}

function buildThreadPrompt(text) {
  return {
    system: "Kau editor media sosial untuk seorang penulis Malaysia. Tukar post Facebook panjang kepada satu thread Threads berangkai, dalam suara penulis yang sama. Kekalkan hujah dan fakta; jangan tambah fakta, angka atau pengalaman baru. Tiada emoji, tiada hashtag, tiada penomboran seperti 1/8. Jawab JSON sahaja.",
    prompt: [
      "Pulangkan objek JSON {\"parts\": [..]} dengan 6 hingga 10 bahagian.",
      "Setiap bahagian mesti kurang daripada 450 aksara termasuk ruang, dan boleh difahami bila dibaca sendiri.",
      "Bahagian 1 ialah hook paling kuat, yang buat orang berhenti scroll dan mahu baca sambungan.",
      "Bahagian akhir ialah takeaway yang spesifik dan ajakan bersahaja untuk repost atau share.",
      "",
      "POST",
      text,
    ].join("\n"),
  };
}

// Thread parts for review. The AI condenses the post into a thread; if its
// answer is unusable, the post is split as it stands so nothing blocks posting.
async function splitThread(store, { id, text } = {}, { ai = generateText } = {}) {
  const body = clean(text, story.LIMITS.post) || (await approvedDraft(store, id)).content;
  if (body.length < 80) throw fail("Tiada teks untuk dipecahkan.");
  if (body.length <= social.THREADS_LIMIT) return { parts: [body], source: "single", warnings: [] };
  try {
    const result = await story.callAi(store, "threads_split", { ...buildThreadPrompt(body), json: true, temperature: 0.5, maxOutputTokens: 4096 }, ai);
    const raw = parseJson(result.text).parts;
    const parts = (Array.isArray(raw) ? raw : []).map((part) => story.cleanPost(part)).filter(Boolean)
      .flatMap((part) => (part.length > social.THREADS_LIMIT ? social.splitForThreads(part) : [part]));
    if (parts.length >= 2 && parts.length <= social.THREADS_MAX_PARTS) return { parts, source: "ai", warnings: [] };
    throw fail("Jawapan AI tidak lengkap.");
  } catch (error) {
    if (error.code === "app_rate_limit") throw error;
    return { parts: social.splitForThreads(body).slice(0, social.THREADS_MAX_PARTS), source: "auto", warnings: [`AI tidak dapat menyusun thread (${error.message}) Post dipecahkan ikut perenggan; sunting sebelum post.`] };
  }
}

// ---------- personal Facebook through the Chrome extension ----------

async function queuePersonal(store, { id, queued = true } = {}) {
  const draft = await approvedDraft(store, id);
  const data = dataOf(draft);
  if (queued) data.personalQueued = true; else delete data.personalQueued;
  return { draft: story.draftSummary(await store.update("draft", draft.id, { data })) };
}

async function extensionQueue(store) {
  const drafts = await store.list("draft", { limit: 200 });
  return { queue: drafts.filter((draft) => draft.personalQueued === true).map((draft) => ({ id: draft.id, topic: draft.topic || draft.title, content: draft.content, characters: clean(draft.content).length, image: draft.image || "" })) };
}

function facebookUrl(value) {
  const url = clean(value, 500);
  return /^https:\/\/(www\.|m\.|web\.)?facebook\.com\//.test(url) ? url : "";
}

async function extensionDone(store, { id, url } = {}, { now = () => new Date() } = {}) {
  const draft = await store.get("draft", id);
  if (!draft.personalQueued) throw fail("Draf ini tiada dalam giliran.", 409, "not_queued");
  const publication = await insertPublication(store, { platform: "personal", draftId: draft.id, text: draft.content, parts: [], topic: draft.topic || "", style: draft.style || "", source: "app", postedAt: now().toISOString(), url: facebookUrl(url), remoteId: "", metrics: null, ...(draft.image ? { image: draft.image } : {}) });
  await markPublished(store, draft, "personal", publication);
  return { publication: publicationSummary(publication) };
}

const fingerprint = (text) => clean(text).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim().slice(0, 90);

// Engagement the extension read from the owner's own profile. A post already
// known (same opening words) gets its numbers updated; others are added as
// imported posts so they count toward learning.
async function extensionSync(store, { posts } = {}, { now = () => new Date() } = {}) {
  const incoming = (Array.isArray(posts) ? posts : []).slice(0, 80)
    .map((post) => ({ text: clean(post?.text, story.LIMITS.post), metrics: cleanMetrics(post), url: facebookUrl(post?.url), postedAt: Number.isNaN(Date.parse(post?.postedAt)) ? "" : new Date(post.postedAt).toISOString() }))
    .filter((post) => post.text.length >= 80);
  if (!incoming.length) throw fail("Tiada post dibaca. Buka profile Facebook kau, scroll supaya post kelihatan, kemudian cuba lagi.");
  const existing = (await store.list("publication", { limit: 400 })).filter((item) => item.platform === "personal");
  const byPrint = new Map(existing.map((item) => [fingerprint(item.text), item]));
  const stamp = now().toISOString();
  let updated = 0;
  let added = 0;
  for (const post of incoming) {
    const known = byPrint.get(fingerprint(post.text));
    if (known) {
      await store.update("publication", known.id, { data: { ...dataOf(known), metrics: { ...(known.metrics || {}), ...post.metrics }, metricsAt: stamp, ...(post.url && !known.url ? { url: post.url } : {}) } });
      updated += 1;
    } else {
      const row = await insertPublication(store, { platform: "personal", draftId: "", text: post.text, parts: [], source: "import", postedAt: post.postedAt || stamp, url: post.url, remoteId: "", metrics: post.metrics, metricsAt: stamp });
      byPrint.set(fingerprint(post.text), row);
      added += 1;
    }
  }
  return { updated, added };
}

// ---------- records ----------

// Old posts from the Page or Threads, so learning does not start from zero.
async function importPosts(store, { platform } = {}, { social: api = defaultSocial(), now = () => new Date() } = {}) {
  if (!["page", "threads"].includes(platform)) throw fail("Platform tidak sah.");
  const account = await api.resolve(PLATFORMS[platform].provider);
  if (!account) throw fail(`${PLATFORMS[platform].label} belum disambung. Masukkan token di Tetapan > Akaun sosial.`, 400, "not_connected");
  const posts = await api[platform].list(account, { limit: 50 });
  const known = new Set((await store.list("publication", { limit: 400 })).filter((item) => item.platform === platform).flatMap((item) => [item.remoteId, ...(item.partIds || [])]).filter(Boolean));
  const stamp = now().toISOString();
  let added = 0;
  for (const post of posts) {
    if (known.has(post.remoteId)) continue;
    await insertPublication(store, { platform, draftId: "", text: clean(post.text, story.LIMITS.post), parts: [], source: "import", postedAt: post.postedAt || stamp, url: post.url, remoteId: post.remoteId, metrics: post.metrics, ...(post.metrics ? { metricsAt: stamp } : {}) });
    added += 1;
  }
  return { added, found: posts.length };
}

module.exports = {
  MIGRATION, PLATFORMS,
  cleanMetrics, dataOf, extensionDone, extensionQueue, extensionSync, importPosts, insertPublication, publicationSummary, publishDraft, queuePersonal, splitThread,
};
