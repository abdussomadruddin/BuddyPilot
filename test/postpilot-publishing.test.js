// Post Pilot publishing and engagement learning. Every network call is a fake:
// nothing here can reach Facebook, Threads or an AI provider.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const story = require("../lib/storytelling");
const social = require("../lib/social-publish");
const publishing = require("../lib/storytelling-publish");
const learning = require("../lib/storytelling-learning");
const credentials = require("../lib/social-credentials");
const { dispatch } = require("../api_handlers/storytelling");
const extension = require("../api_handlers/storytelling-extension");
const { createMemoryStore } = require("./storytelling-memory-store");

const LONG = Array.from({ length: 14 }, (_, index) => `Perenggan ${index + 1}. Ramai orang ingat masalah ads dia sebab budget kecil. Sebenarnya bukan. Masalahnya dia tak faham apa yang platform tu nak, jadi setiap kali result jatuh dia tukar benda yang salah.`).join("\n\n");
const ACCOUNT = { token: "token-rahsia-untuk-ujian-1234567890", accountId: "1201743546357100", source: "app" };

function fakeFetch(handler) {
  const requests = [];
  const fetchImpl = async (url, init = {}) => {
    requests.push({ url: String(url), init });
    const answer = await handler(String(url), init, requests.length);
    return { ok: (answer.status || 200) < 400, status: answer.status || 200, json: async () => answer.body ?? {} };
  };
  return { fetchImpl, requests, deps: { fetch: fetchImpl, sleep: async () => {} } };
}

// A fake social layer that records what would have been posted.
function fakeSocial(overrides = {}) {
  const sent = [];
  const api = {
    sent,
    accounts: { facebook_page: ACCOUNT, threads: { ...ACCOUNT, accountId: "777000111" } },
    resolve: async (provider) => api.accounts[provider] || null,
    page: {
      publish: async (account, text, extra) => { sent.push({ platform: "page", text, image: extra?.image || "" }); return { remoteId: `page_${sent.length}`, url: `https://www.facebook.com/page_${sent.length}` }; },
      metrics: async () => ({ reactions: 10, comments: 2, shares: 1, reach: 500 }),
      list: async () => [],
    },
    threads: {
      publish: async (account, parts, extra) => { sent.push({ platform: "threads", parts, image: extra?.image || "" }); return { remoteId: "th_1", partIds: parts.map((_, index) => `th_${index + 1}`), url: "https://www.threads.net/@demo/post/1" }; },
      metrics: async () => ({ reactions: 5, comments: 1, shares: 0, views: 300 }),
      list: async () => [],
    },
    save: async () => {},
    ...overrides,
  };
  return api;
}

async function approvedDraft(store, content = LONG) {
  return story.saveDraft(store, { topic: "Meta Ads", content, status: "approved" });
}

const post = (store, action, body = {}, options = {}) => dispatch(store, { method: "POST", body: { action, ...body }, options });

test("Threads can publish an approved draft in one action without supplied parts", async () => {
  const store = createMemoryStore();
  const draft = await approvedDraft(store);
  const api = fakeSocial();
  const result = await post(store, "publish.threads", { id: draft.id }, { publishing: { social: api } });
  assert.equal(api.sent.length, 1);
  assert.equal(api.sent[0].parts.join(" ").replace(/\s+/g, " "), LONG.replace(/\s+/g, " "));
  assert.equal(result.publication.parts, api.sent[0].parts.length);
});

test("thread parts stay within the Threads limit, in order, with nothing dropped", () => {
  const parts = social.splitForThreads(LONG);
  assert.ok(parts.length > 1);
  assert.ok(parts.every((part) => part.length <= 480));
  assert.equal(parts.join(" ").replace(/\s+/g, " "), LONG.replace(/\s+/g, " "));
  const oneHugeSentence = `${"perkataan ".repeat(200).trim()}.`;
  assert.ok(social.splitForThreads(oneHugeSentence).every((part) => part.length <= 480));
  const longWord = "x".repeat(1200);
  assert.equal(social.splitForThreads(longWord).join(""), longWord);
  assert.throws(() => social.validateParts(["a".repeat(501)]), /had Threads ialah 500/);
  assert.throws(() => social.validateParts([]), /kosong/);
  assert.deepEqual(social.validateParts([" satu ", "", "dua"]), ["satu", "dua"]);
});

test("Facebook Page: the token travels in a header, never the URL; reach is optional", async () => {
  const fake = fakeFetch((url, init) => {
    if (init.method === "POST") return { body: { id: "120_55" } };
    if (url.includes("insights.metric")) return { status: 403, body: { error: { code: 200 } } };
    if (url.includes("/posts")) return { body: { data: [{ id: "120_1", message: LONG, created_time: "2026-11-01T00:00:00+0000", permalink_url: "https://www.facebook.com/p/1", reactions: { summary: { total_count: 40 } }, comments: { summary: { total_count: 6 } }, shares: { count: 3 } }, { id: "120_2", message: "pendek" }] } };
    return { body: { permalink_url: "https://www.facebook.com/p/55", reactions: { summary: { total_count: 9 } }, comments: { summary: { total_count: 2 } } } };
  });
  const result = await social.facebookPage.publish(ACCOUNT, "Teks post", {}, fake.deps);
  assert.deepEqual(result, { remoteId: "120_55", url: "https://www.facebook.com/p/55" });
  assert.equal(fake.requests[0].init.headers.authorization, `Bearer ${ACCOUNT.token}`);
  assert.match(fake.requests[0].url, /\/1201743546357100\/feed$/);
  assert.equal(new URLSearchParams(fake.requests[0].init.body).get("message"), "Teks post");
  assert.ok(fake.requests.every((request) => !request.url.includes(ACCOUNT.token)));

  assert.deepEqual(await social.facebookPage.metrics(ACCOUNT, "120_55", fake.deps), { reactions: 9, comments: 2, shares: 0 });
  const old = await social.facebookPage.list(ACCOUNT, {}, fake.deps);
  assert.equal(old.length, 1, "short posts are not worth learning from");
  assert.deepEqual(old[0].metrics, { reactions: 40, comments: 6, shares: 3 });

  const expired = fakeFetch(() => ({ status: 400, body: { error: { code: 190, message: "token EAAB-secret expired" } } }));
  await assert.rejects(social.facebookPage.publish(ACCOUNT, "Teks", {}, expired.deps), (error) => error.code === "auth" && !/EAAB/.test(error.message));
});

test("Threads: parts are chained as replies; a failure midway reports how far it got", async () => {
  let created = 0;
  const fake = fakeFetch((url, init) => {
    if (url.endsWith("/threads")) return { body: { id: `c${(created += 1)}` } };
    if (url.endsWith("/threads_publish")) return { body: { id: `m${new URLSearchParams(init.body).get("creation_id").slice(1)}` } };
    return { body: { permalink: "https://www.threads.net/@demo/post/m1" } };
  });
  const result = await social.threads.publish({ ...ACCOUNT, accountId: "777" }, ["satu", "dua", "tiga"], {}, fake.deps);
  assert.deepEqual(result, { remoteId: "m1", partIds: ["m1", "m2", "m3"], url: "https://www.threads.net/@demo/post/m1" });
  const containers = fake.requests.filter((request) => request.url.endsWith("/threads")).map((request) => Object.fromEntries(new URLSearchParams(request.init.body)));
  assert.deepEqual(containers.map((item) => item.reply_to_id || ""), ["", "m1", "m2"]);
  assert.deepEqual(containers.map((item) => item.text), ["satu", "dua", "tiga"]);

  let count = 0;
  const broken = fakeFetch((url) => {
    if (url.endsWith("/threads")) return (count += 1) === 2 ? { status: 429, body: { error: { code: 4 } } } : { body: { id: "c1" } };
    return { body: { id: "m1" } };
  });
  await assert.rejects(social.threads.publish({ ...ACCOUNT, accountId: "777" }, ["satu", "dua"], {}, broken.deps), (error) => error.code === "partial" && error.postedIds.join() === "m1" && /bahagian 1 daripada 2/.test(error.message));
});

test("posting needs approval and a connected account, is recorded once, and never repeats by accident", async () => {
  const store = createMemoryStore();
  const api = fakeSocial();
  const options = { publishing: { social: api } };
  const draft = await story.saveDraft(store, { topic: "Meta Ads", content: LONG });
  await assert.rejects(post(store, "publish.page", { id: draft.id }, options), (error) => error.code === "not_approved");
  assert.equal(api.sent.length, 0);

  await story.saveDraft(store, { id: draft.id, content: LONG, status: "approved" });
  const result = await post(store, "publish.page", { id: draft.id }, options);
  assert.equal(api.sent.length, 1);
  assert.equal(api.sent[0].text, LONG);
  assert.equal(result.publication.platform, "page");
  assert.equal(result.draft.status, "published");
  assert.deepEqual(result.draft.platforms, ["page"]);
  const saved = await store.get("draft", draft.id);
  assert.equal(saved.published.page.url, "https://www.facebook.com/page_1");

  await assert.rejects(post(store, "publish.page", { id: draft.id }, options), (error) => error.code === "already_published");
  assert.equal(api.sent.length, 1, "a second click does not post twice");

  // An edit after posting keeps the record of where it went.
  const edited = await story.saveDraft(store, { id: draft.id, content: `${LONG}\n\nTambahan.`, status: "approved" });
  assert.equal(edited.published.page.url, "https://www.facebook.com/page_1");

  api.accounts.threads = null;
  await assert.rejects(post(store, "publish.threads", { id: draft.id, parts: ["satu", "dua"] }, options), (error) => error.code === "not_connected");
});

test("a failed post leaves no record; a partly posted thread is kept so it is not reposted", async () => {
  const store = createMemoryStore();
  const draft = await approvedDraft(store);
  const down = fakeSocial({ page: { publish: async () => { throw new social.SocialError("unavailable", "Facebook tidak tersedia buat sementara. Cuba semula.", 503); } } });
  await assert.rejects(post(store, "publish.page", { id: draft.id }, { publishing: { social: down } }), (error) => error.code === "unavailable");
  assert.equal((await store.list("publication")).length, 0);
  assert.equal((await store.get("draft", draft.id)).status, "approved");

  const partial = fakeSocial({ threads: { publish: async () => { throw Object.assign(new social.SocialError("partial", "Threads berhenti selepas bahagian 1 daripada 2: had dicapai", 502), { postedIds: ["th_9"] }); } } });
  const result = await post(store, "publish.threads", { id: draft.id, parts: ["satu", "dua"] }, { publishing: { social: partial } });
  assert.match(result.warning, /bahagian 1 daripada 2/);
  assert.equal(result.publication.partial, true);
  assert.equal((await store.list("publication"))[0].remoteId, "th_9");
  await assert.rejects(post(store, "publish.threads", { id: draft.id, parts: ["satu", "dua"] }, { publishing: { social: partial } }), (error) => error.code === "already_published");
});

test("the thread is drafted by AI, and split as it stands when the AI answer is unusable", async () => {
  const store = createMemoryStore();
  const draft = await approvedDraft(store);
  const good = async () => ({ text: JSON.stringify({ parts: ["Hook yang kuat.", "Isi kedua.", `${"panjang ".repeat(80)}`, "Takeaway. Repost kalau bermanfaat."] }), model: "mock" });
  const drafted = await post(store, "threads.split", { id: draft.id }, { ai: good });
  assert.equal(drafted.source, "ai");
  assert.ok(drafted.parts.length >= 5, "an over-long AI part is split, not rejected");
  assert.ok(drafted.parts.every((part) => part.length <= 500));

  const broken = async () => ({ text: "maaf, bukan JSON", model: "mock" });
  const fallback = await post(store, "threads.split", { id: draft.id }, { ai: broken });
  assert.equal(fallback.source, "auto");
  assert.ok(fallback.parts.every((part) => part.length <= 480));
  assert.match(fallback.warnings[0], /sunting sebelum post/);

  const short = await approvedDraft(store, "Post pendek yang muat dalam satu post Threads sahaja, tanpa perlu dipecahkan langsung kepada beberapa bahagian.");
  assert.deepEqual((await post(store, "threads.split", { id: short.id })).parts.length, 1);
});

test("personal Facebook: queue, the extension reads only the queue, marks it posted and syncs engagement", async () => {
  const store = createMemoryStore();
  const draft = await approvedDraft(store);
  const other = await story.saveDraft(store, { topic: "Rahsia", content: `${LONG} lain` });
  await post(store, "personal.queue", { id: draft.id });
  const { queue } = await extension.dispatch(store, { method: "GET" });
  assert.deepEqual(queue.map((item) => item.id), [draft.id]);
  assert.equal(queue[0].content, LONG);
  assert.ok(!JSON.stringify(queue).includes(other.id), "drafts that are not queued are not exposed");

  const done = await extension.dispatch(store, { method: "POST", body: { action: "done", id: draft.id, url: "https://evil.example/x" } });
  assert.equal(done.publication.platform, "personal");
  assert.equal(done.publication.url, "", "only facebook.com links are kept");
  assert.equal((await store.get("draft", draft.id)).status, "published");
  assert.equal((await extension.dispatch(store, { method: "GET" })).queue.length, 0);
  await assert.rejects(extension.dispatch(store, { method: "POST", body: { action: "done", id: draft.id } }), (error) => error.code === "not_queued");

  const synced = await extension.dispatch(store, { method: "POST", body: { action: "sync", posts: [
    { text: LONG, reactions: 120, comments: "14", shares: 9 },
    { text: `Post lama yang ditulis terus di Facebook. ${LONG}`, reactions: 30, comments: 1, shares: 0, url: "https://www.facebook.com/me/posts/1" },
    { text: "terlalu pendek" },
  ] } });
  assert.deepEqual(synced, { updated: 1, added: 1 });
  const items = await store.list("publication");
  assert.deepEqual(items.find((item) => item.draftId === draft.id).metrics, { reactions: 120, comments: 14, shares: 9 });
  assert.equal(items.find((item) => item.source === "import").url, "https://www.facebook.com/me/posts/1");
  await assert.rejects(extension.dispatch(store, { method: "POST", body: { action: "sync", posts: [] } }), /Tiada post dibaca/);
  await assert.rejects(extension.dispatch(store, { method: "POST", body: { action: "padam" } }), /Tindakan tidak sah/);
});

test("the extension token is checked against a hash and can be replaced", async () => {
  const rows = new Map();
  const deps = {
    env: { FACEBOOK_PAGE_ACCESS_TOKEN: "env-page-token-abcdefghijklmnop", FACEBOOK_PAGE_ID: "1201743546357100" },
    encrypt: (provider, value) => `enc:${provider}:${Buffer.from(value).toString("base64")}`,
    decrypt: (provider, value) => Buffer.from(value.split(":")[2], "base64").toString(),
    request: async (pathname, options) => {
      if (options?.method === "POST") { rows.set(options.body[0].provider, options.body[0]); return []; }
      const provider = /provider=eq\.([a-z_]+)/.exec(pathname)[1];
      return rows.has(provider) ? [rows.get(provider)] : [];
    },
  };
  const { token } = await credentials.createExtensionToken(deps);
  assert.match(token, /^bp_[A-Za-z0-9_-]{43}$/);
  assert.ok(!JSON.stringify([...rows.values()]).includes(token), "only a hash is stored");
  assert.equal(await credentials.verifyExtensionToken(token, deps), true);
  assert.equal(await credentials.verifyExtensionToken(`${token.slice(0, -1)}x`, deps), false);
  assert.equal(await credentials.verifyExtensionToken("", deps), false);
  const next = await credentials.createExtensionToken(deps);
  assert.equal(await credentials.verifyExtensionToken(token, deps), false, "the old token stops working");
  assert.equal(await credentials.verifyExtensionToken(next.token, deps), true);

  // Page falls back to the server environment; a saved token wins and is never listed.
  assert.equal((await credentials.resolveSocial("facebook_page", deps)).source, "environment");
  assert.equal(await credentials.resolveSocial("threads", deps), null);
  const status = await credentials.saveSocial("threads", { token: "threads-token-abcdefghijklmnop", accountId: "777000111" }, deps);
  assert.deepEqual(status.threads, { configured: true, source: "app", accountId: "777000111", updatedAt: status.threads.updatedAt, expiresAt: null });
  assert.ok(!JSON.stringify(status).includes("threads-token"));
  assert.equal((await credentials.resolveSocial("threads", deps)).token, "threads-token-abcdefghijklmnop");
  await assert.rejects(credentials.saveSocial("threads", { token: "pendek", accountId: "777" }, deps), /token yang sah/);
  await assert.rejects(credentials.saveSocial("threads", { token: "threads-token-abcdefghijklmnop", accountId: "bukan nombor" }, deps), /nombor sahaja/);
});

function publication(store, platform, text, metrics, daysAgo, now) {
  return publishing.insertPublication(store, { platform, draftId: "", text, parts: [], source: "import", remoteId: `${platform}_${Math.random()}`, postedAt: new Date(now.getTime() - daysAgo * 86400000).toISOString(), metrics });
}

test("posts are ranked within their own platform; too few posts are not scored", () => {
  const item = (id, platform, metrics) => ({ id, platform, metrics });
  const scores = learning.scorePublications([
    item("a", "page", { reactions: 100, comments: 10, shares: 5, reach: 1000 }),
    item("b", "page", { reactions: 300, comments: 0, shares: 0, reach: 30000 }),
    item("c", "page", { reactions: 20, comments: 1, shares: 0, reach: 1000 }),
    item("t1", "threads", { reactions: 1, comments: 0, shares: 0 }),
    item("t2", "threads", { reactions: 50, comments: 9, shares: 4 }),
    item("x", "personal", null),
  ]);
  assert.equal(scores.get("a"), 100, "the best rate per person reached wins, not the biggest raw number");
  assert.equal(scores.get("b"), 0);
  assert.equal(scores.get("c"), 50);
  assert.equal(scores.has("t1"), false, "two posts on a platform are not enough to rank");
  assert.equal(learning.engagementOf({ reactions: 10, comments: 2, shares: 1 }), 20);
});

test("learning writes a new DNA version from the best and worst posts, then waits for new evidence", async () => {
  const store = createMemoryStore();
  const now = new Date("2026-12-01T00:00:00Z");
  const calls = [];
  const ai = async (request) => { calls.push(request); return { text: JSON.stringify({ hooks: "Hook yang menang: kenyataan berani dalam satu ayat.", engagement: "Buka dengan kenyataan yang mencabar dalam satu ayat pendek. Elak pembuka berbentuk soalan.", changes: ["Hook satu ayat menang."] }), model: "mock" }; };
  const options = { ...fakeSocial(), ai, now: () => now, social: fakeSocial(), notify: async () => {} };

  await publication(store, "page", `TERBAIK ${LONG}`, { reactions: 200, comments: 40, shares: 20, reach: 2000 }, 5, now);
  await publication(store, "page", `SEDERHANA ${LONG}`, { reactions: 40, comments: 3, shares: 1, reach: 2000 }, 6, now);
  const early = await learning.learnFromEngagement(store, {}, options);
  assert.equal(early.learned, true);
  assert.equal(early.posts, 2);
  assert.equal((await story.activeDna(store)).profile.engagement, "");

  await publication(store, "page", `TERLEMAH ${LONG}`, { reactions: 2, comments: 0, shares: 0, reach: 2000 }, 7, now);
  await publication(store, "page", `BARU SANGAT ${LONG}`, { reactions: 999, comments: 99, shares: 99, reach: 1000 }, 0.2, now);
  const result = await learning.learnFromEngagement(store, {}, options);
  assert.equal(result.learned, true);
  assert.equal(result.posts, 4, "young posts count toward voice");
  assert.match(calls[1].prompt, /CONTOH UTAMA[\s\S]*TERBAIK[\s\S]*PALING RENDAH[\s\S]*TERLEMAH/);
  assert.doesNotMatch(calls[1].prompt.split("CONTOH GAYA")[0], /BARU SANGAT/);
  assert.match(calls[1].prompt, /CONTOH GAYA[\s\S]*BARU SANGAT/);

  const dna = await story.activeDna(store);
  assert.equal(dna.source, "engagement");
  assert.match(dna.profile.engagement, /kenyataan yang mencabar/);
  assert.equal(dna.profile.hooks, "Hook yang menang: kenyataan berani dalam satu ayat.");
  assert.equal(dna.profile.rhythm, story.PRESET_DNA.rhythm, "fields the AI left out are kept");
  const samples = await store.list("sample");
  assert.equal(samples.length, 1);
  assert.equal(samples[0].source, "engagement");
  assert.match(samples[0].content, /^TERBAIK/);

  // The next draft is steered by what was learned, and leans on the winning post.
  const built = story.buildGenerationPrompt({ topic: "Topik baru", dna: dna.profile, samples });
  assert.match(built.system, /CORAK ENGAGEMENT TINGGI[\s\S]*kenyataan yang mencabar/);
  assert.match(built.prompt, /TERBAIK/);

  const again = await learning.learnFromEngagement(store, {}, options);
  assert.equal(again.learned, false, "nothing new, so no second AI call");
  assert.equal(calls.length, 2);
  assert.equal((await learning.learnFromEngagement(store, { force: true }, options)).learned, true);

  // Manual DNA edits and a reset keep what was learned.
  await post(store, "dna.save", { profile: { ...story.PRESET_DNA, personality: "Disunting." } });
  assert.match((await story.activeDna(store)).profile.engagement, /kenyataan yang mencabar/);
  await post(store, "dna.reset");
  assert.match((await story.activeDna(store)).profile.engagement, /kenyataan yang mencabar/);
});

test("the daily cycle imports old posts, refreshes numbers, renews the Threads token and never posts", async () => {
  const store = createMemoryStore();
  const now = new Date("2026-12-01T00:00:00Z");
  const old = (id, reactions) => ({ remoteId: id, url: `https://www.facebook.com/${id}`, text: `${id} ${LONG}`, postedAt: "2026-11-20T00:00:00.000Z", metrics: { reactions, comments: 1, shares: 0 } });
  const saved = [];
  const notices = [];
  const api = fakeSocial({ save: async (provider, value) => saved.push({ provider, ...value }) });
  api.page.list = async () => [old("p1", 5), old("p2", 50), old("p3", 500)];
  api.threads.refresh = async () => ({ token: "threads-token-baru-abcdefghijklmnop", expiresAt: "2027-01-30T00:00:00.000Z" });
  const ai = async () => ({ text: JSON.stringify({ engagement: "Tulis hook satu ayat.", changes: ["Belajar daripada 3 post."] }), model: "mock" });
  const options = { ai, now: () => now, social: api, notify: async (payload) => notices.push(payload) };

  const first = await learning.runCycle(store, {}, options);
  assert.equal(first.imported, 3);
  assert.equal(first.refreshed, 3);
  assert.equal(first.learned, true);
  assert.equal(api.sent.length, 0, "the cycle only reads");
  assert.deepEqual(saved.map((item) => item.provider), ["threads"]);
  assert.equal(notices.length, 1);
  assert.match(notices[0].url, /tab=postpilot/);

  const second = await learning.runCycle(store, {}, options);
  assert.equal(second.imported, 0, "posts already known are not imported twice");
  assert.equal(second.learned, false);
  const status = await learning.learningStatus(store);
  assert.equal(status.total, 3);
  assert.deepEqual(status.posts, { page: 3 });
  assert.equal(status.last.version, 1);

  // One broken platform does not stop the rest of the cycle.
  api.page.list = async () => { throw new social.SocialError("auth", "Token Facebook tamat tempoh atau tidak sah.", 502); };
  const third = await learning.runCycle(store, {}, options);
  assert.match(third.notes.join(" "), /Import Facebook Page: Token Facebook tamat tempoh/);
});

test("browser and extension files never hold a token, and the extension only fills the composer", () => {
  const root = path.join(__dirname, "..");
  const client = fs.readFileSync(path.join(root, "public/buddypilot-storytelling.js"), "utf8");
  assert.doesNotMatch(client, /graph\.facebook\.com|graph\.threads\.net|process\.env/);
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "extension/manifest.json"), "utf8"));
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.host_permissions.sort(), ["https://*.public.blob.vercel-storage.com/*", "https://buddypilot.vercel.app/*", "https://www.facebook.com/*"]);
  const scripts = ["popup.js", "facebook.js"].map((file) => fs.readFileSync(path.join(root, "extension", file), "utf8")).join("\n");
  assert.doesNotMatch(scripts, /aria-label="Post"\]'\)\.click|submit\(\)/, "the extension never presses Post");
  assert.match(scripts, /storytelling-extension/);
});

test("an optional photo is stored by the app and posted with the text; without one the post is text only", async () => {
  const image = require("../lib/storytelling-image");
  const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(2000, 7)]);
  const dataUrl = `data:image/jpeg;base64,${jpeg.toString("base64")}`;
  const puts = [];
  const put = async (pathname, bytes, options) => { puts.push({ pathname, size: bytes.length, options }); return { url: "https://abc123.public.blob.vercel-storage.com/postpilot/2026-12-01-x9Zk.jpg" }; };
  const stored = await post(createMemoryStore(), "image.upload", { image: dataUrl }, { image: { put, now: () => new Date("2026-12-01T00:00:00Z") } });
  assert.equal(stored.image, "https://abc123.public.blob.vercel-storage.com/postpilot/2026-12-01-x9Zk.jpg");
  assert.deepEqual(puts[0].options, { access: "public", addRandomSuffix: true, contentType: "image/jpeg" });
  await assert.rejects(image.saveImage({ image: "data:image/jpeg;base64,AAAA" }, { put }), /bukan gambar yang sah/);
  await assert.rejects(image.saveImage({ image: "data:text/html;base64,PGI+" }, { put }), /Gambar tidak sah/);
  assert.equal(image.safeImageUrl("https://evil.example/postpilot/a.jpg"), "", "only pictures this app stored can be attached");

  const store = createMemoryStore();
  const api = fakeSocial();
  const draft = await story.saveDraft(store, { topic: "Gambar", content: LONG, status: "approved", image: stored.image });
  await post(store, "publish.page", { id: draft.id }, { publishing: { social: api } });
  await post(store, "publish.threads", { id: draft.id, parts: ["satu", "dua"] }, { publishing: { social: api } });
  assert.deepEqual(api.sent.map((item) => item.image), [stored.image, stored.image]);

  const plain = await story.saveDraft(store, { topic: "Tanpa gambar", content: `${LONG} lagi`, status: "approved", image: "https://evil.example/x.jpg" });
  await post(store, "publish.page", { id: plain.id }, { publishing: { social: api } });
  assert.equal(api.sent[2].image, "", "no photo, or a foreign address, posts text only");
  assert.equal((await story.saveDraft(store, { id: draft.id, content: LONG, image: "" })).image, undefined, "the photo can be removed");

  // Page photo posts use the photos endpoint; Threads puts the photo on the first part only.
  const fb = fakeFetch((url, init) => (init.method === "POST" ? { body: { id: "ph_1", post_id: "120_77" } } : { body: { permalink_url: "https://www.facebook.com/p/77" } }));
  assert.equal((await social.facebookPage.publish(ACCOUNT, "Teks", { image: stored.image }, fb.deps)).remoteId, "120_77");
  assert.match(fb.requests[0].url, /\/photos$/);
  assert.deepEqual(Object.fromEntries(new URLSearchParams(fb.requests[0].init.body)), { url: stored.image, caption: "Teks" });
  let n = 0;
  const th = fakeFetch((url, init) => (url.endsWith("/threads") ? { body: { id: `c${(n += 1)}` } } : url.endsWith("/threads_publish") ? { body: { id: `m${new URLSearchParams(init.body).get("creation_id").slice(1)}` } } : { body: {} }));
  await social.threads.publish({ ...ACCOUNT, accountId: "777" }, ["satu", "dua"], { image: stored.image }, th.deps);
  const made = th.requests.filter((request) => request.url.endsWith("/threads")).map((request) => Object.fromEntries(new URLSearchParams(request.init.body)));
  assert.deepEqual(made.map((item) => [item.media_type, item.image_url || ""]), [["IMAGE", stored.image], ["TEXT", ""]]);
});
