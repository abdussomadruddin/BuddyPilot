// Post Pilot learns by itself. One cycle, run daily by cron (or on demand):
// pull old posts from the connected accounts, refresh engagement numbers,
// score every post against the others on its platform, then let the AI update
// the Writing DNA (voice and "what earns engagement") from the best and worst
// posts. Each update is a new DNA version, so it can be reviewed and restored.
const story = require("./storytelling");
const publish = require("./storytelling-publish");
const { generateLearningOpenRouter, parseJson } = require("./storytelling-ai");

const DAY = 86400000;
const REFRESH_DAYS = 30;
const MIN_POSTS = 3;
const { clean } = story;

// Comments and shares are worth more than a reaction: they are what spreads a post.
function engagementOf(metrics = {}) {
  if (Number.isFinite(metrics.facebookEngagement)) return metrics.facebookEngagement;
  return (Number(metrics.reactions) || 0) + 3 * (Number(metrics.comments) || 0) + 4 * (Number(metrics.shares) || 0);
}

// Score 0 to 100 for each post: its rank among posts on the same platform.
// When most posts on a platform have reach or views, the rate per person
// reached is ranked; otherwise the raw engagement is.
function scorePublications(items) {
  const scores = new Map();
  for (const platform of Object.keys(publish.PLATFORMS)) {
    let posts = items.filter((item) => item.platform === platform && item.metrics && !item.pending);
    if (platform === "personal" && posts.some((item) => item.remoteId?.startsWith("insights-"))) {
      posts = posts.filter((item) => Number.isFinite(item.metrics.facebookEngagement));
    }
    const audience = (item) => Number(item.metrics.reach) || Number(item.metrics.views) || 0;
    const withAudience = posts.filter((item) => audience(item) > 0);
    const useRate = platform !== "personal" && posts.length > 0 && withAudience.length / posts.length >= 0.6;
    const ranked = (useRate ? withAudience : posts).map((item) => ({ id: item.id, value: useRate ? engagementOf(item.metrics) / audience(item) : engagementOf(item.metrics) }));
    if (ranked.length < MIN_POSTS) continue;
    for (const post of ranked) {
      const below = ranked.filter((other) => other.value < post.value).length;
      const equal = ranked.filter((other) => other.value === post.value).length - 1;
      scores.set(post.id, Math.round(((below + equal / 2) / (ranked.length - 1)) * 100));
    }
  }
  return scores;
}

function defaultOptions() {
  const credentials = require("./social-credentials");
  const social = require("./social-publish");
  return {
    ai: generateLearningOpenRouter,
    now: () => new Date(),
    social: { resolve: (provider) => credentials.resolveSocial(provider), page: social.facebookPage, threads: social.threads, save: (provider, value) => credentials.saveSocial(provider, value) },
    notify: async (payload) => require("./push-notifications").sendPushPayload(payload),
  };
}

// Threads tokens expire after 60 days; renew while there is still time.
async function renewThreadsToken(options) {
  const account = await options.social.resolve("threads");
  if (!account || account.source !== "app" || !options.social.threads.refresh) return false;
  const expires = Date.parse(account.expiresAt || "");
  if (Number.isFinite(expires) && expires - options.now().getTime() > 20 * DAY) return false;
  const fresh = await options.social.threads.refresh(account);
  await options.social.save("threads", { token: fresh.token, accountId: account.accountId, expiresAt: fresh.expiresAt });
  return true;
}

async function refreshMetrics(store, options) {
  const now = options.now();
  const items = (await store.list("publication", { limit: 400 }))
    .filter((item) => ["page", "threads"].includes(item.platform) && item.remoteId && !item.pending)
    .filter((item) => !item.metrics || now.getTime() - Date.parse(item.postedAt || item.createdAt) < REFRESH_DAYS * DAY)
    .slice(0, 60);
  const accounts = {};
  const blocked = new Set();
  let updated = 0;
  for (const item of items) {
    if (blocked.has(item.platform)) continue;
    try {
      accounts[item.platform] ??= await options.social.resolve(publish.PLATFORMS[item.platform].provider);
      if (!accounts[item.platform]) { blocked.add(item.platform); continue; }
      const metrics = await options.social[item.platform].metrics(accounts[item.platform], item.remoteId);
      await store.update("publication", item.id, { data: { ...publish.dataOf(item), metrics, metricsAt: now.toISOString() } });
      updated += 1;
    } catch (error) {
      // A bad token or a rate limit will fail every post: stop that platform for this run.
      if (["auth", "permission", "rate_limit", "network", "settings_unavailable"].includes(error.code)) blocked.add(item.platform);
    }
  }
  return updated;
}

function describe(item, score, length) {
  const m = item.metrics || {};
  const audience = m.reach ? `, reach ${m.reach}` : m.views ? `, views ${m.views}` : "";
  return `[${publish.PLATFORMS[item.platform]?.label || item.platform} · skor ${score}/100 · ${m.reactions || 0} reaction, ${m.comments || 0} komen, ${m.shares || 0} share${audience} · ${clean(item.text).length} aksara]\n${clean(item.text).slice(0, length)}`;
}

function buildLearnPrompt(dna, best, worst) {
  const fields = story.DNA_FIELDS.map(([key]) => `"${key}"`).join(", ");
  return {
    system: "Kau menyelenggara profil gaya penulisan seorang penulis Malaysia berdasarkan prestasi sebenar post dia di Facebook dan Threads. Tulis dalam bahasa Melayu Malaysia. Jangan reka corak yang tidak disokong oleh post yang diberi. Jawab JSON sahaja.",
    prompt: [
      "PROFIL SEMASA", story.dnaBlock(dna), "",
      "CORAK ENGAGEMENT SEMASA", dna.engagement || "(belum ada)", "",
      "POST YANG DAPAT ENGAGEMENT PALING TINGGI", ...best.map(([item, score], index) => `--- Terbaik ${index + 1} ${describe(item, score, 1500)}`), "",
      ...(worst.length ? ["POST YANG DAPAT ENGAGEMENT PALING RENDAH", ...worst.map(([item, score], index) => `--- Terlemah ${index + 1} ${describe(item, score, 600)}`), ""] : []),
      `Pulangkan objek JSON dengan kunci ${fields}, "engagement" dan "changes".`,
      "Kunci profil: kekalkan perkataan demi perkataan, kecuali di mana post terbaik menunjukkan dengan jelas suara atau corak yang berbeza; di situ kemas kini supaya profil menggambarkan cara penulis ini benar-benar menulis.",
      "\"engagement\": maksimum 1200 aksara. Arahan konkrit untuk draf akan datang berdasarkan beza antara post terbaik dan terlemah: jenis dan panjang hook, cara membuka, struktur, sudut topik, panjang, cara menutup dan ajakan. Sertakan apa yang perlu dielakkan. Bukan nasihat umum.",
      "\"changes\": senarai ringkas (maksimum 5) apa yang kau pelajari atau ubah.",
    ].join("\n"),
  };
}

// The strongest posts become writing examples, so new drafts are shown what worked.
async function promoteSamples(store, ranked) {
  const samples = await store.list("sample", { limit: 200 });
  const promoted = samples.filter((sample) => sample.source === "engagement");
  const known = new Set(promoted.map((sample) => sample.publicationId));
  let added = 0;
  for (const [item, score] of ranked) {
    if (added >= 3 || score < 80) break;
    const text = clean(item.text, story.LIMITS.sample);
    if (known.has(item.id) || text.length < 300) continue;
    await store.insert("sample", { title: text.split("\n")[0].slice(0, 80), data: { content: text, category: "Engagement tinggi", selected: true, characters: text.length, source: "engagement", publicationId: item.id } });
    added += 1;
  }
  // Keep the set small and current: the oldest promoted examples make way.
  for (const old of promoted.slice(Math.max(0, 12 - added))) await store.remove("sample", old.id).catch(() => {});
  return added;
}

async function lastLearning(store) {
  const versions = await store.list("dna", { limit: 30 });
  const last = versions.find((row) => row.source === "engagement");
  return last ? { at: last.createdAt, version: last.version, note: last.note || "", postIds: last.meta?.postIds || [] } : null;
}

// Learns when there is enough new evidence: three posts never seen before, or
// one after a week. `force` skips that wait but still needs three scored posts.
async function learnFromEngagement(store, { force = false, publicationIds } = {}, options = defaultOptions()) {
  const now = options.now();
  const eligible = publicationIds ? new Set(publicationIds) : null;
  const items = (await store.list("publication", { limit: 400 })).filter((item) =>
    (!eligible || eligible.has(item.id)) && item.metrics && !item.pending && now.getTime() - Date.parse(item.postedAt || item.createdAt) >= DAY);
  const scores = scorePublications(items);
  const ranked = items.filter((item) => scores.has(item.id)).map((item) => [item, scores.get(item.id)]).sort((a, b) => b[1] - a[1]);
  if (ranked.length < MIN_POSTS) {
    const all = (await store.list("publication", { limit: 400 })).filter((item) => (!eligible || eligible.has(item.id)) && !item.pending);
    const young = all.filter((item) => item.metrics && now.getTime() - Date.parse(item.postedAt || item.createdAt) < DAY).length;
    const noNumbers = all.filter((item) => !item.metrics).length;
    const detail = [young && `${young} terlalu baru (kurang sehari)`, noNumbers && `${noNumbers} tiada angka engagement`].filter(Boolean).join(", ");
    return { learned: false, reason: `${all.length} post dibaca: ${items.length} layak${detail ? `, ${detail}` : ""}. Perlu sekurang-kurangnya ${MIN_POSTS} post layak pada satu platform.` };
  }
  const last = await lastLearning(store);
  const fresh = ranked.filter(([item]) => !last?.postIds.includes(item.id)).length;
  const weekOld = !last || now.getTime() - Date.parse(last.at) >= 7 * DAY;
  if (!force && last && !(fresh >= 3 || (fresh >= 1 && weekOld))) return { learned: false, reason: "Belum cukup post baru sejak kali terakhir belajar." };

  const half = Math.floor(ranked.length / 2);
  const best = ranked.slice(0, Math.min(5, Math.max(1, ranked.length - half)));
  const worst = ranked.slice(-Math.min(4, half)).filter(([item]) => !best.some(([top]) => top.id === item.id));
  const current = await story.activeDna(store);
  const result = await story.callAi(store, "engagement_learn", { ...buildLearnPrompt(current.profile, best, worst), json: true, temperature: 0.3, maxOutputTokens: 6144 }, options.ai);
  const parsed = parseJson(result.text);
  const engagement = clean(parsed.engagement, 2000);
  if (!engagement) return { learned: false, reason: "AI tidak memulangkan corak engagement. Akan dicuba lagi." };
  const changes = (Array.isArray(parsed.changes) ? parsed.changes : []).map((item) => clean(item, 200)).filter(Boolean).slice(0, 5);
  const profile = { ...current.profile, ...Object.fromEntries(story.DNA_FIELDS.map(([key]) => [key, clean(parsed[key], 1500) || current.profile[key]])), engagement };
  const note = changes.join(" ") || `Dipelajari daripada ${ranked.length} post.`;
  const dna = await story.saveDna(store, profile, "engagement", note, { postIds: ranked.map(([item]) => item.id).slice(0, 300), posts: ranked.length });
  const samples = await promoteSamples(store, ranked);
  return { learned: true, version: dna.version, posts: ranked.length, changes, samples };
}

async function runCycle(store, { force = false } = {}, options = defaultOptions()) {
  const summary = { imported: 0, refreshed: 0, learned: false, notes: [] };
  const step = async (label, work) => {
    try { return await work(); } catch (error) { summary.notes.push(`${label}: ${error.message}`); return null; }
  };
  await step("Token Threads", () => renewThreadsToken(options));
  for (const platform of ["page", "threads"]) {
    const account = await step(publish.PLATFORMS[platform].label, () => options.social.resolve(publish.PLATFORMS[platform].provider));
    if (!account) continue;
    const result = await step(`Import ${publish.PLATFORMS[platform].label}`, () => publish.importPosts(store, { platform }, options));
    summary.imported += result?.added || 0;
  }
  summary.refreshed = (await step("Angka engagement", () => refreshMetrics(store, options))) || 0;
  const learning = await step("Belajar", () => learnFromEngagement(store, { force }, options));
  if (learning?.learned) {
    Object.assign(summary, learning);
    await options.notify({ title: "Post Pilot dah belajar daripada engagement", body: clean(learning.changes[0] || `Gaya dikemas kini daripada ${learning.posts} post.`, 180), url: "/?tab=postpilot", tag: "postpilot-learning" }).catch(() => {});
  } else if (learning?.reason) summary.reason = learning.reason;
  return summary;
}

// What the settings screen shows about learning: counts and the last update.
async function learningStatus(store) {
  const [items, last] = await Promise.all([store.list("publication", { limit: 400 }), lastLearning(store)]);
  const counts = {};
  for (const item of items) if (!item.pending) counts[item.platform] = (counts[item.platform] || 0) + 1;
  return { posts: counts, total: Object.values(counts).reduce((sum, count) => sum + count, 0), last: last ? { at: last.at, version: last.version, note: last.note } : null };
}

// The owner's edits are the clearest daily signal: what they changed in the
// AI's draft before posting is what the next draft should already do. The
// final text also becomes a voice example. An unchanged draft costs no AI call.
const POSTED_SAMPLES = 12;

function buildEditPrompt(generated, posted) {
  return {
    system: "Kau editor yang membandingkan draf AI dengan versi akhir yang penulis post. Tulis dalam bahasa Melayu Malaysia. Jawab JSON sahaja.",
    prompt: [
      "Senaraikan maksimum 3 perubahan gaya yang penulis buat, sebagai arahan ringkas untuk draf akan datang (contoh: \"Buang pembuka berbentuk soalan\", \"Ayat lebih pendek\").",
      "Abaikan pembetulan ejaan kecil dan perubahan fakta khusus topik ini. Jika tiada perubahan gaya yang jelas, pulangkan senarai kosong.",
      "Pulangkan {\"changes\": [..]}.",
      "", "DRAF AI", generated.slice(0, 6000), "", "VERSI AKHIR PENULIS", posted.slice(0, 6000),
    ].join("\n"),
  };
}

const normalizeText = (text) => clean(text).replace(/\s+/g, " ").toLowerCase();

async function learnFromEdit(store, { generated = "", content = "", topic = "" } = {}, options = defaultOptions()) {
  const posted = clean(content, story.LIMITS.post);
  if (posted.length < 80) return { learned: false, sample: false };
  const samples = await store.list("sample", { limit: 200 });
  let sample = false;
  if (!samples.some((item) => normalizeText(item.content) === normalizeText(posted))) {
    await store.insert("sample", { title: posted.split("\n")[0].slice(0, 80), data: { content: posted, category: "Dipost", selected: true, characters: posted.length, source: "posted" } });
    sample = true;
    const own = samples.filter((item) => item.source === "posted");
    for (const old of own.slice(POSTED_SAMPLES - 1)) await store.remove("sample", old.id).catch(() => {});
  }
  const draft = clean(generated, story.LIMITS.post);
  if (draft.length < 80 || normalizeText(draft) === normalizeText(posted)) return { learned: false, sample };
  const result = await story.callAi(store, "edit_learn", { ...buildEditPrompt(draft, posted), json: true, temperature: 0.2, maxOutputTokens: 1024 }, options.ai);
  const changes = (Array.isArray(parseJson(result.text).changes) ? parseJson(result.text).changes : []).map((item) => clean(item, 200)).filter(Boolean).slice(0, 3);
  if (!changes.length) return { learned: false, sample };
  // Stored as feedback, which every new draft already reads (feedbackNotes).
  await store.insert("feedback", { title: "edit", data: { tags: [], note: changes.join(" "), text: "", topic: clean(topic, story.LIMITS.topic), source: "edit" } });
  return { learned: true, sample, changes };
}

module.exports = { defaultOptions, engagementOf, learnFromEdit, learnFromEngagement, learningStatus, refreshMetrics, runCycle, scorePublications };
