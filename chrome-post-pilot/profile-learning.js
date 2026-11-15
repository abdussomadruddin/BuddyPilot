async function scanLearningProfile(platform, owner, cutoff) {
  const threads = platform === "threads";
  const expectedOrigin = threads ? "https://www.threads.com" : "https://www.facebook.com";
  const pause = () => new Promise((resolve) => setTimeout(resolve, 700));
  const normalize = (value) => String(value || "").replace(/\s+/g, " ").trim().toLowerCase();
  const name = normalize(owner);
  const profilePath = location.pathname.replace(/\/$/, "").toLowerCase();
  const profileId = new URL(location.href).searchParams.get("id");
  const verified = () => threads
    ? profilePath === "/@" + name && [...document.querySelectorAll('a[href], [role="button"], button')].some((node) => /^(edit profile|edit profil|sunting profil)$/i.test(node.innerText?.trim() || ""))
    : !/^\/(?:login|checkpoint|me)?$/.test(profilePath) && [...document.querySelectorAll("h1, [role=heading][aria-level='1']")].some((heading) => normalize(heading.textContent) === name);

  if (location.origin !== expectedOrigin) return { error: "Halaman profil tidak dapat dibuka." };
  for (let attempt = 0; attempt < 10 && !verified(); attempt++) await pause();
  if (!verified()) return { error: "Profil tidak dapat disahkan. Semak akaun yang log masuk di Chrome." };

  const dateFrom = (link) => {
    const time = link.querySelector("time");
    for (const value of [time?.dateTime, link.getAttribute("title"), link.getAttribute("aria-label"), time?.textContent, link.innerText]) {
      if (!value) continue;
      const label = normalize(value);
      if (/^(just now|baru sahaja)$/.test(label)) return Date.now();
      const relative = label.match(/^(\d+)\s*(m|min(?:ute)?s?|h|hours?|d|days?|w|weeks?|minit|jam|hari|minggu)(?:\s+ago)?$/);
      if (relative) {
        const unit = relative[2];
        const minutes = /^(h$|hour|jam)/.test(unit) ? 60 : /^(d|hari)/.test(unit) ? 1440 : /^(w|minggu)/.test(unit) ? 10080 : 1;
        return Date.now() - Number(relative[1]) * minutes * 60000;
      }
      if (/\b\d{4}\b/.test(value)) {
        const date = Date.parse(value);
        if (Number.isFinite(date)) return date;
      }
    }
    return NaN;
  };
  const readMetrics = (card) => {
    const metrics = {};
    const tags = { reactions: /(?:like|reaction|suka|reaksi)/i, comments: /(?:comment|repl|komen|balasan)/i, shares: /(?:share|repost|kongsi)/i };
    for (const control of card.querySelectorAll('button, [role="button"], [aria-label]')) {
      const label = control.getAttribute("aria-label") || "";
      const visible = control.innerText?.trim() || "";
      for (const [key, pattern] of Object.entries(tags)) {
        if (Object.hasOwn(metrics, key) || !pattern.test(label + " " + visible)) continue;
        const number = (label + " " + visible).match(/(?:^|\D)(\d+(?:[,.]\d+)*)(\s*[km])?(?=\b)/i);
        if (number) metrics[key] = Math.round(Number(number[1].replace(/,/g, "")) * ({ k: 1000, m: 1000000 }[number[2]?.trim().toLowerCase()] || 1));
      }
    }
    return metrics;
  };
  const records = new Map();
  const toUrl = (link) => {
    try { return new URL(link.href, location.href); } catch { return null; }
  };
  const isOwner = (link) => {
    const url = toUrl(link);
    return url?.origin === expectedOrigin && url.pathname.replace(/\/$/, "").toLowerCase() === profilePath &&
      (!profileId || url.searchParams.get("id") === profileId);
  };

  for (let page = 0; page < 28 && records.size < 80; page++) {
    let crossedCutoff = false;
    for (const link of document.querySelectorAll("a[href]")) {
      const url = toUrl(link);
      if (url?.origin !== expectedOrigin) continue;
      const match = threads
        ? url.pathname.match(/^\/@([^/]+)\/post\/([\w-]+)\/?$/)
        : url.pathname.match(/\/(?:posts|videos|reel)\/([\w-]+)\/?$/);
      const id = (threads ? match?.[2] : match?.[1]) || (!threads ? url.searchParams.get("story_fbid") : "");
      if (!id || records.has(id) || (threads && normalize(match[1]) !== name)) continue;
      const date = dateFrom(link);
      if (!Number.isFinite(date) || date > Date.now() + 60000) continue;
      let card = link.closest(threads ? "article,[role=article],[data-pressable-container]" : "article,[role=article]");
      if (threads && !card) {
        for (let parent = link.parentElement, depth = 0; parent && depth < 8; parent = parent.parentElement, depth++) {
          if (parent.querySelector('[data-testid="post-text"],[dir="auto"]') && [...parent.querySelectorAll("a[href]")].some(isOwner)) {
            card = parent;
            break;
          }
        }
      }
      if (!card || ![...card.querySelectorAll("a[href]")].some(isOwner)) continue;
      if (date < cutoff) { crossedCutoff = true; continue; }
      const content = threads
        ? card.querySelector('[data-testid="post-text"]') || [...card.querySelectorAll('[dir="auto"]')].find((node) => !node.closest("a,button,[role=button]") && node.innerText?.trim().length >= 10)
        : card.querySelector('[data-ad-preview="message"],[data-ad-comet-preview="message"]');
      const text = content?.innerText?.trim().slice(0, 12000);
      if (!text) continue;
      records.set(id, { platform: threads ? "threads" : "personal", url: url.origin + url.pathname + (match ? "" : "?story_fbid=" + encodeURIComponent(id)), remoteId: id, text, postedAt: new Date(date).toISOString(), ...readMetrics(card) });
      if (records.size >= 80) break;
    }
    if (crossedCutoff && page >= 3) break;
    const top = window.scrollY;
    window.scrollBy(0, Math.max(300, window.innerHeight * 0.85));
    await pause();
    if (window.scrollY === top && page > 3) break;
  }
  return { posts: [...records.values()] };
}
