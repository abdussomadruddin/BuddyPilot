async function scanLearningProfile(platform, owner, cutoff, findContentLibrary = false, suggestedLabels = []) {
  const threads = platform === "threads";
  const expectedOrigin = threads ? "https://www.threads.com" : "https://www.facebook.com";
  const pause = () => new Promise((resolve) => setTimeout(resolve, 700));
  const normalize = (value) => String(value || "").replace(/\s+/g, " ").trim().toLowerCase();
  const name = normalize(owner);
  // Read live: facebook.com/me turns into the real profile address after the
  // page has loaded, so a path captured once would still say "/me".
  const currentPath = () => location.pathname.replace(/\/$/, "").toLowerCase();
  const headings = () => [...document.querySelectorAll("h1, h2, [role=heading][aria-level='1'], [role=heading][aria-level='2']")].map((heading) => normalize(heading.textContent)).filter(Boolean);
  // Facebook shows "Name" or "Name (nickname)"; the saved name may also be the username in the address.
  const verified = () => threads
    ? currentPath() === "/@" + name && [...document.querySelectorAll('a[href], [role="button"], button')].some((node) => /^(edit profile|edit profil|sunting profil)$/i.test(node.innerText?.trim() || ""))
    : !/^\/(?:login|checkpoint|me)?$/.test(currentPath()) && (currentPath() === "/" + name || headings().some((heading) => heading === name || heading.startsWith(name + " (")));

  if (location.origin !== expectedOrigin) return { error: "Halaman profil tidak dapat dibuka." };
  const needsFacebookSignIn = () => !threads && (
    /^\/(?:login|checkpoint|recover)(?:[/.]|$)/i.test(currentPath()) ||
    (!currentPath() && (
      document.querySelector('input[type="password"], a[href^="/login/"]') ||
      [...document.querySelectorAll('button,[role="button"]')].some((button) => {
        const label = normalize(button.getAttribute("aria-label") || button.innerText);
        return label === "continue " + name || label === "teruskan " + name ||
          /^(use another profile|guna profil lain)$/.test(label);
      })
    ))
  );
  for (let attempt = 0; attempt < 20 && !verified(); attempt++) {
    if (needsFacebookSignIn()) return { error: "Sesi Facebook perlu disahkan. Buka Facebook di Chrome dan cuba Belajar sekarang semula." };
    await pause();
  }
  if (!verified()) {
    const found = threads ? currentPath().replace(/^\/@?/, "") : headings()[0] || "";
    return { error: found && !/^\/(?:login|checkpoint)/.test(currentPath())
      ? `Profil yang dibuka ialah "${found}", tetapi extension disetkan kepada "${owner}". Betulkan nama dalam extension Post Pilot.`
      : "Profil tidak dapat disahkan. Semak akaun yang log masuk di Chrome." };
  }
  const readProfileText = !threads && findContentLibrary;
  const libraryUrl = readProfileText ? [...document.querySelectorAll('a[href*="/professional_dashboard/content/content_library"]')]
    .find((node) => node.getClientRects().length)?.href : undefined;
  const profilePath = currentPath();
  const profileId = new URL(location.href).searchParams.get("id");

  const renderedTimestamp = (link) => {
    if (threads || !link.getBoundingClientRect) return "";
    const bounds = link.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return "";
    return [...link.querySelectorAll("span")].filter((node) => !node.children.length)
      .map((node) => ({ text: node.textContent.replace(/\u034f/g, ""), rect: node.getBoundingClientRect() }))
      .filter(({ rect }) => rect.width && rect.height && rect.x >= bounds.x - 2 && rect.right <= bounds.right + 2 &&
        rect.y >= bounds.y - 2 && rect.y < bounds.bottom)
      .sort((a, b) => a.rect.x - b.rect.x)
      .map(({ text }) => text).join("");
  };
  const dateFrom = (link) => {
    const time = link.querySelector("time");
    for (const value of [time?.dateTime, link.getAttribute("title"), link.getAttribute("aria-label"), time?.textContent, link.innerText, renderedTimestamp(link)]) {
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
        const date = Date.parse(value.replace(/\s+at\s+/i, " "));
        if (Number.isFinite(date)) return date;
      }
    }
    return NaN;
  };
  // "1.2K" → 1200, "3,410" → 3410; null when the text holds no number.
  const count = (value) => {
    const match = String(value || "").match(/(\d+(?:[.,]\d+)*)\s*([km])?(?![a-z])/i);
    if (!match) return null;
    const unit = { k: 1000, m: 1000000 }[(match[2] || "").toLowerCase()] || 1;
    const number = Number(unit === 1 ? match[1].replace(/[.,]/g, "") : match[1].replace(",", ".")) * unit;
    return Number.isFinite(number) ? Math.round(number) : null;
  };
  const ACTIONS = { reactions: /^(?:un)?like$|^suka$|^tidak suka$/i, comments: /^(?:reply|comment|balas|komen)$/i, shares: /^(?:repost|share|kongsi|siar semula)$/i };
  // Engagement of one post card. A post with an action bar and no numbers has
  // zero engagement, which is a result, not missing data: it is reported as 0.
  const readMetrics = (card) => {
    const metrics = {};
    let bar = false;
    // Threads (and Facebook's buttons): the action's name is the button's
    // aria-label, its icon's aria-label, or the icon's <title>; the number,
    // when there is one, is the button's text.
    for (const control of card.querySelectorAll('button, [role="button"]')) {
      if (control.querySelector('button, [role="button"]')) continue; // count the innermost button only
      const visible = control.innerText?.trim() || "";
      const labels = [control.getAttribute("aria-label"), ...[...control.querySelectorAll("svg")].flatMap((icon) => [icon.getAttribute("aria-label"), icon.querySelector("title")?.textContent]), visible.replace(/[\d.,\s]+[km]?$/i, "")]
        .map((label) => String(label || "").trim()).filter(Boolean);
      for (const [key, pattern] of Object.entries(ACTIONS)) {
        if (!labels.some((label) => pattern.test(label))) continue;
        bar = true;
        metrics[key] = (metrics[key] || 0) + (count(visible) || 0);
      }
    }
    // Facebook: totals sit beside the bar as "12 comments", "1 share", and
    // reactions as "Like: 12 people" labels or a number beside "All reactions".
    const texts = [...card.querySelectorAll("span, [aria-label]")];
    const phrase = (pattern) => {
      for (const node of texts) {
        const value = (node.getAttribute("aria-label") || node.textContent || "").trim();
        if (value.length < 40 && pattern.test(value)) return count(value);
      }
      return null;
    };
    const comments = phrase(/^[\d.,]+\s*[km]?\s*(?:comments?|komen)$/i);
    const shares = phrase(/^[\d.,]+\s*[km]?\s*(?:shares?|perkongsian|kongsian)$/i);
    let reactions = null;
    for (const node of texts) {
      const label = node.getAttribute("aria-label") || "";
      const each = label.match(/^(?:like|love|care|haha|wow|sad|angry|suka|sayang|peduli|sedih|marah)[^:]*:\s*([\d.,]+\s*[km]?)/i);
      if (each) reactions = (reactions || 0) + (count(each[1]) || 0);
      else if (reactions == null && /^(?:all reactions|semua reaksi)/i.test(label)) reactions = count(label) ?? count(node.parentElement?.textContent);
    }
    if (comments != null) metrics.comments = Math.max(metrics.comments || 0, comments);
    if (shares != null) metrics.shares = Math.max(metrics.shares || 0, shares);
    if (reactions != null) metrics.reactions = Math.max(metrics.reactions || 0, reactions);
    if (!bar && !Object.keys(metrics).length) return {};
    return { reactions: metrics.reactions || 0, comments: metrics.comments || 0, shares: metrics.shares || 0 };
  };
  const records = new Map();
  const unresolvedLabels = new Set();
  if (readProfileText && suggestedLabels.length) window.scrollTo(0, 0);
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
      if ((!readProfileText && !Number.isFinite(date)) || date > Date.now() + 60000) continue;
      let card = link.closest(threads ? "article,[role=article],[data-pressable-container]" : "article,[role=article]");
      if (!threads) {
        const message = '[data-ad-preview="message"],[data-ad-comet-preview="message"]';
        if (card && !card.querySelector(message)) continue;
        if (!card && match && url.pathname.toLowerCase().startsWith(profilePath + "/posts/")) {
          for (let parent = link.parentElement, depth = 0; parent && depth < 18; parent = parent.parentElement, depth++) {
            const messages = parent.querySelectorAll(message);
            if (messages.length > 1) break;
            if (messages.length === 1 && [...parent.querySelectorAll("a[href]")].some(isOwner)) {
              card = parent;
              break;
            }
          }
        }
      }
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
      const messageSelector = '[data-ad-preview="message"],[data-ad-comet-preview="message"]';
      const readContent = () => threads
        ? card.querySelector('[data-testid="post-text"]') || [...card.querySelectorAll('[dir="auto"]')].find((node) => !node.closest("a,button,[role=button]") && node.innerText?.trim().length >= 10)
        : card.querySelector(messageSelector);
      if (readProfileText) {
        for (let attempt = 0; attempt < 3; attempt++) {
          const content = readContent();
          const scope = content?.parentElement && content.parentElement.querySelectorAll(messageSelector).length === 1
            ? content.parentElement : content;
          const controls = [...(scope?.querySelectorAll('button,[role="button"]') || [])].filter((button) =>
            button.getClientRects().length && !button.closest("a[href],form,[role=menu]") &&
            !button.disabled && button.getAttribute("aria-disabled") !== "true");
          const labelOf = (button) => normalize(button.innerText || button.getAttribute("aria-label"));
          const known = /^(see more|lihat lagi|lihat selanjutnya)$/i;
          const safeAlternative = (button) => {
            const label = labelOf(button);
            return label.length <= 65 &&
              /^(?:read|show|view|see|expand|baca|papar|lihat|tunjuk|kembangkan)\b/.test(label) &&
              !/comment|repl|share|reaction|link|profile|photo|video|komen|balas|kongsi|profil|gambar|media|insight/.test(label);
          };
          const truncated = /(?:…|\.\.\.)/.test(content?.innerText || "");
          const expand = controls.find((button) => known.test(labelOf(button)) ||
            (truncated && safeAlternative(button) && suggestedLabels.includes(labelOf(button))));
          if (!expand) {
            if (truncated && unresolvedLabels.size < 12) {
              for (const button of controls.filter(safeAlternative).slice(0, 12 - unresolvedLabels.size)) unresolvedLabels.add(labelOf(button));
            }
            break;
          }
          const before = content.innerText;
          expand.click();
          for (let settle = 0; settle < 3 && readContent()?.innerText === before; settle++) {
            await new Promise((resolve) => setTimeout(resolve, 180));
          }
          if (readContent()?.innerText === before) break;
        }
      }
      const rawText = readContent()?.innerText?.trim();
      if (!rawText || (readProfileText && /(?:…|\.\.\.)\s*(?:see more|lihat lagi|lihat selanjutnya)?$/i.test(rawText))) continue;
      const text = rawText.slice(0, 12000);
      records.set(id, { platform: threads ? "threads" : "personal", url: url.origin + url.pathname + (match ? "" : "?story_fbid=" + encodeURIComponent(id)), remoteId: id, text,
        ...(Number.isFinite(date) ? { postedAt: new Date(date).toISOString() } : {}), ...(!readProfileText ? readMetrics(card) : {}) });
      if (records.size >= 80) break;
    }
    if (!readProfileText && crossedCutoff && page >= 3) break;
    const top = window.scrollY;
    window.scrollBy(0, Math.max(300, window.innerHeight * 0.85));
    await pause();
    if (window.scrollY === top && page > (threads || records.size ? 3 : 9)) break;
  }
  return { posts: [...records.values()], ...(readProfileText ? { libraryUrl, unresolvedLabels: [...unresolvedLabels] } : {}) };
}
