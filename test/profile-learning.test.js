// The Chrome extension's profile reader, run against small fake pages built to
// match what Threads and Facebook actually render (recorded 2026-11-16):
// Threads action buttons carry no aria-label, their name is the icon's <title>
// and the count is the button's text, empty when zero; facebook.com/me turns
// into the profile's own address after the page has loaded.
const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const vm = require("node:vm");
const source = readFileSync("chrome-post-pilot/profile-learning.js", "utf8");

function el(tag, attrs = {}, ...children) {
  const node = { tag, attrs, children: [], parentElement: null, text: "" };
  for (const child of children) {
    if (typeof child === "string") node.text += child;
    else { child.parentElement = node; node.children.push(child); }
  }
  const all = (root) => root.children.flatMap((child) => [child, ...all(child)]);
  const matches = (item, selector) => selector.split(",").some((part) => {
    const simple = part.trim();
    const name = simple.match(/^[a-z0-9]+/i)?.[0];
    if (name && item.tag !== name) return false;
    return [...simple.matchAll(/\[([\w-]+)(?:=["']?([^"'\]]*)["']?)?\]/g)].every(([, key, value]) =>
      Object.hasOwn(item.attrs, key) && (value === undefined || String(item.attrs[key]) === value));
  });
  const rendered = (item) => item.tag === "svg" ? "" : item.text + item.children.map(rendered).join("");
  Object.assign(node, {
    getAttribute: (key) => (Object.hasOwn(attrs, key) ? String(attrs[key]) : null),
    querySelectorAll: (selector) => all(node).filter((item) => matches(item, selector)),
    querySelector: (selector) => all(node).find((item) => matches(item, selector)) || null,
    closest(selector) {
      for (let item = node; item; item = item.parentElement) if (matches(item, selector)) return item;
      return null;
    },
  });
  Object.defineProperties(node, {
    innerText: { get: () => rendered(node) },
    textContent: { get: () => node.text + node.children.map((child) => child.textContent).join("") },
    href: { get: () => attrs.href },
    dateTime: { get: () => attrs.datetime },
  });
  return node;
}

const icon = (name) => el("svg", {}, el("title", {}, name));
const action = (name, number = "") => el("div", { role: "button" }, icon(name), el("span", {}, number));

async function scan(platform, owner, body, { paths, origin }) {
  let ticks = 0;
  const location = {
    origin,
    get pathname() { return paths[Math.min(ticks, paths.length - 1)]; },
    get href() { return origin + this.pathname; },
  };
  const context = vm.createContext({
    location, document: body, URL, Date, Number, String, Math, Object, Map, Promise,
    window: { scrollY: 0, innerHeight: 800, scrollBy() {} },
    setTimeout: (callback) => { ticks += 1; queueMicrotask(callback); },
  });
  vm.runInContext(source, context);
  return context.scanLearningProfile(platform, owner, Date.now() - 30 * 86400000);
}

function threadsPost(id, text, hoursAgo, ...buttons) {
  const stamp = new Date(Date.now() - hoursAgo * 3600000).toISOString();
  return el("div", { "data-pressable-container": "true" },
    el("a", { href: "https://www.threads.com/@owner.name" }, "owner.name"),
    el("a", { href: `https://www.threads.com/@owner.name/post/${id}` }, el("time", { datetime: stamp }, `${hoursAgo}h`)),
    el("div", { "data-testid": "post-text" }, text),
    ...buttons);
}

test("Threads: counts come from the button text, zero is a result, and unrelated labels are ignored", async () => {
  const body = el("body", {},
    el("div", { role: "button" }, "Edit profile"),
    threadsPost("AAA1", "Post dengan satu like sahaja, tiada yang lain.", 30, action("Like", "1"), action("Reply"), action("Repost"), action("Share")),
    threadsPost("BBB2", "Post yang belum dapat apa-apa sambutan langsung.", 50, action("Like"), action("Reply"), action("Repost"), action("Share")),
    threadsPost("CCC3", "Post yang ramai orang suka dan kongsi semula.", 80, action("Unlike", "1.2K"), action("Reply", "34"), action("Repost", "5"), action("Share", "2")),
    threadsPost("DDD4", "Balasan dalam thread orang lain, tanpa bar tindakan.", 90, el("div", {}, el("svg", { "aria-label": "Replied" }))));
  const { posts, error } = await scan("threads", "Owner.Name", body, { origin: "https://www.threads.com", paths: ["/@owner.name"] });
  assert.equal(error, undefined);
  const byId = Object.fromEntries(posts.map((post) => [post.remoteId, post]));
  assert.deepEqual([byId.AAA1.reactions, byId.AAA1.comments, byId.AAA1.shares], [1, 0, 0]);
  assert.deepEqual([byId.BBB2.reactions, byId.BBB2.comments, byId.BBB2.shares], [0, 0, 0], "no numbers on a post with an action bar means zero, not missing");
  assert.deepEqual([byId.CCC3.reactions, byId.CCC3.comments, byId.CCC3.shares], [1200, 34, 7], "repost and share both count as shares");
  assert.equal(Object.hasOwn(byId.DDD4, "reactions"), false, "a card with no action bar reports no engagement at all");
  assert.equal(byId.AAA1.platform, "threads");
  assert.equal(byId.AAA1.url, "https://www.threads.com/@owner.name/post/AAA1");
});

function facebookPost(id, text, age, ...extra) {
  return el("div", { role: "article" },
    el("a", { href: "https://www.facebook.com/owner.name" }, "Owner Name"),
    el("a", { href: `https://www.facebook.com/owner.name/posts/${id}`, "aria-label": age }, age),
    el("div", { "data-ad-preview": "message" }, text),
    el("div", { role: "button" }, "Like"), el("div", { role: "button" }, "Comment"),
    ...extra);
}

test("Facebook personal: the profile is verified after /me becomes the real address, and totals are read", async () => {
  const body = el("body", {},
    el("h1", {}, "Owner Name "),
    facebookPost("pfbid0abc", "Post Facebook yang dapat banyak reaksi dan komen.", "2d",
      el("span", { "aria-label": "Like: 12 people" }), el("span", { "aria-label": "Love: 3 people" }), el("span", {}, "3 comments"), el("span", {}, "1 share")),
    facebookPost("pfbid0def", "Post Facebook yang baru dan belum ada sambutan.", "5h"));
  const page = { origin: "https://www.facebook.com", paths: ["/me", "/me", "/owner.name/"] };
  const { posts, error } = await scan("facebook", "Owner Name", body, page);
  assert.equal(error, undefined, "the address is read live, so /me at first does not fail the check");
  const byId = Object.fromEntries(posts.map((post) => [post.remoteId, post]));
  assert.deepEqual([byId.pfbid0abc.reactions, byId.pfbid0abc.comments, byId.pfbid0abc.shares], [15, 3, 1]);
  assert.deepEqual([byId.pfbid0def.reactions, byId.pfbid0def.comments, byId.pfbid0def.shares], [0, 0, 0]);
  assert.equal(byId.pfbid0abc.platform, "personal");

  // The saved name may be the username in the address, or the heading may carry a nickname.
  assert.equal((await scan("facebook", "owner.name", body, page)).error, undefined);
  const nick = el("body", {}, el("h1", {}, "Owner Name (Nama Lain)"), facebookPost("pfbid0xyz", "Post dengan nama panggilan pada tajuk profil.", "1d"));
  assert.equal((await scan("facebook", "Owner Name", nick, page)).posts.length, 1);
});

test("a different profile is refused, and the message says which one was opened", async () => {
  const body = el("body", {}, el("h1", {}, "Orang Lain"), facebookPost("pfbid0abc", "Post milik orang lain yang tidak patut dibaca.", "2d"));
  const result = await scan("facebook", "Owner Name", body, { origin: "https://www.facebook.com", paths: ["/me", "/orang.lain"] });
  assert.equal(result.posts, undefined);
  assert.match(result.error, /Profil yang dibuka ialah "orang lain", tetapi extension disetkan kepada "Owner Name"/);

  const login = await scan("facebook", "Owner Name", el("body", {}), { origin: "https://www.facebook.com", paths: ["/login"] });
  assert.match(login.error, /Sesi Facebook perlu disahkan/);
  const elsewhere = await scan("threads", "owner.name", el("body", {}), { origin: "https://example.com", paths: ["/@owner.name"] });
  assert.match(elsewhere.error, /tidak dapat dibuka/);
});

// ---- server side: learning from edits, the daily automatic run, clear reasons
const story = require("../lib/storytelling");
const learning = require("../lib/storytelling-learning");
const { dispatch } = require("../api_handlers/storytelling");
const { createMemoryStore } = require("./storytelling-memory-store");
const DRAFT = "Kebanyakan advertiser Malaysia sedang buang duit. Adakah anda tahu kenapa? Ramai orang ingat masalah ads dia sebab budget kecil, sebenarnya bukan.";
const FINAL = "Kebanyakan advertiser Malaysia sedang buang duit. Ramai ingat sebab budget kecil. Bukan. Masalahnya mereka tak faham apa platform nak.";

test("an edited draft teaches the next drafts; an unchanged one becomes an example without an AI call", async () => {
  const store = createMemoryStore();
  const calls = [];
  const ai = async (request) => { calls.push(request); return { text: JSON.stringify({ changes: ["Buang pembuka berbentuk soalan.", "Ayat lebih pendek."] }), model: "mock" }; };
  const edited = await dispatch(store, { method: "POST", body: { action: "learn.edit", generated: DRAFT, content: FINAL, topic: "Ads" }, options: { learning: { ai } } });
  assert.equal(edited.learned, true);
  assert.equal(edited.sample, true);
  assert.match(calls[0].prompt, /DRAF AI[\s\S]*Adakah anda tahu[\s\S]*VERSI AKHIR PENULIS/);
  const notes = (await store.list("feedback")).map((item) => item.note);
  assert.deepEqual(notes, ["Buang pembuka berbentuk soalan. Ayat lebih pendek."]);
  // Every new draft already reads feedback notes, so this reaches the next prompt.
  const built = story.buildGenerationPrompt({ topic: "Topik", dna: story.normalizeDna(story.PRESET_DNA), feedbackNotes: notes });
  assert.match(built.prompt, /MAKLUM BALAS TERKINI[\s\S]*Buang pembuka berbentuk soalan/);
  assert.equal((await store.list("sample"))[0].source, "posted");

  const same = await learning.learnFromEdit(store, { generated: `${FINAL} lagi satu ayat untuk panjang.`, content: `${FINAL} lagi satu ayat untuk panjang.` }, { ai });
  assert.deepEqual(same, { learned: false, sample: true });
  assert.equal(calls.length, 1, "no AI call when nothing was changed");
  const again = await learning.learnFromEdit(store, { generated: "", content: FINAL }, { ai });
  assert.equal(again.sample, false, "the same post is not added twice");

  for (let index = 0; index < 14; index += 1) await learning.learnFromEdit(store, { content: `${FINAL} Versi ${index}.` }, { ai });
  assert.equal((await store.list("sample")).filter((item) => item.source === "posted").length, 12, "only the 12 newest posts are kept as examples");
  assert.equal((await learning.learnFromEdit(store, { content: "pendek" }, { ai })).sample, false);
});

test("the daily automatic run learns only on new evidence; including posts with no engagement", async () => {
  const store = createMemoryStore();
  const now = () => new Date("2026-11-16T12:00:00Z");
  let aiCalls = 0;
  const requests = [];
  const ai = async (request) => { aiCalls += 1; requests.push(request); return { text: JSON.stringify({ hook: "Pembuka satu ayat.", engagement: "Hook satu ayat.", changes: ["Perhatikan hook satu ayat."] }), model: "mock" }; };
  const post = (i, hoursAgo, likes) => ({ platform: "threads", url: `https://www.threads.com/@owner/post/P${i}`, text: `Post nombor ${i} yang cukup panjang untuk dibaca.`, postedAt: new Date(now().getTime() - hoursAgo * 3600000).toISOString(), ...(likes == null ? {} : { reactions: likes, comments: 0, shares: 0 }) });
  const send = (posts, auto) => dispatch(store, { method: "POST", body: { action: "learn.chrome", posts, ...(auto ? { auto: true } : {}) }, options: { learning: { now, ai } } });

  const early = await send([post(1, 40, 0), post(2, 5, 3), post(3, 50)], false);
  assert.equal(early.cycle.learned, true);
  assert.equal(early.cycle.posts, 3);
  assert.match(requests[0].prompt, /Post nombor 3/);

  const ready = await send([post(4, 30, 2), post(5, 60, 0), post(6, 70, 9)], true);
  assert.equal(ready.cycle.learned, true, "zero likes still counts, so three day-old posts are enough");
  assert.equal(aiCalls, 2);
  assert.match(requests[1].prompt, /score|skor 100/);
  const repeat = await send([post(4, 30, 2), post(5, 60, 0), post(6, 70, 9)], true);
  assert.equal(repeat.cycle.learned, false, "the automatic run waits for new posts");
  assert.equal(aiCalls, 2);
  const button = await send([post(4, 30, 2), post(5, 60, 0), post(6, 70, 9)], false);
  assert.equal(button.cycle.learned, true, "the button still learns on demand");
});

test("the extension runs the profile check once a day from the app tab, and only reads", () => {
  const worker = readFileSync("chrome-post-pilot/worker.js", "utf8");
  assert.match(worker, /const LEARN_EVERY = 20 \* 60 \* 60 \* 1000/);
  assert.match(worker, /void dailyLearning\(app\.id\)/);
  assert.match(worker, /action: "learn\.chrome", posts: items, auto: true/);
  const client = readFileSync("public/buddypilot-storytelling.js", "utf8");
  assert.match(client, /post\("learn\.edit", \{ generated: state\.current\.generated/);
});

test("Facebook Content Library reads publication date and named metric columns", async () => {
  const assert = require("node:assert/strict");
  const { readFileSync } = require("node:fs");
  const { runInNewContext } = require("node:vm");
  const label = { innerText: "Contoh post Facebook\nPublished •\n15 November 2026 at 23:59",
    querySelector: () => ({ href: "https://www.facebook.com/content/insights/?content_id=fixture", getAttribute: () => "Post insights, Contoh post Facebook" }) };
  const cell = (innerText) => ({ innerText });
  const headers = ["Views", "Preview", "Comments", "Engagement"].map(cell);
  const table = {
    rows: [{ cells: headers }, { cells: [cell("55"), label, cell("--"), cell("0")] }],
    querySelectorAll: () => headers,
    getBoundingClientRect: () => ({ height: 800 }),
  };
  const origin = "https://www.facebook.com";
  const scanLibrary = runInNewContext(readFileSync("chrome-post-pilot/facebook-learning.js", "utf8") + "\nscanFacebookContentLibrary", {
    location: new URL(origin + "/professional_dashboard/content/content_library/"),
    URL, Intl, Date: class extends Date { static now() { return Date.parse("2026-11-15T17:00:00Z"); } },
    document: { querySelectorAll: () => [table], scrollingElement: { scrollTop: 0, scrollBy() {} } },
    window: { innerHeight: 700 }, setTimeout: (resolve) => resolve(),
  });
  const { posts } = await scanLibrary(Date.parse("2026-10-16T17:00:00Z"));
  assert.equal(posts.length, 1);
  assert.equal(posts[0].postedAt, "2026-11-15T15:59:00.000Z");
  assert.equal(posts[0].facebookEngagement, 0);
  assert.equal(posts[0].views, 55);
  assert.equal(posts[0].comments, undefined);
});
