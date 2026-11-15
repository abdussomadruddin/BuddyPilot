async function scanFacebookContentLibrary(cutoff) {
  const origin = "https://www.facebook.com";
  if (location.origin !== origin || !location.pathname.startsWith("/professional_dashboard/content/content_library")) {
    return { error: "Content Library Facebook tidak dapat dibuka." };
  }
  const pause = () => new Promise((resolve) => setTimeout(resolve, 600));
  const posts = new Map();
  const capturedAt = Date.now();
  const todayParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(capturedAt);
  const part = (type) => Number(todayParts.find((entry) => entry.type === type).value);
  const today = Date.UTC(part("year"), part("month") - 1, part("day"));
  const parseDate = (label) => {
    const relative = label.match(/^(Today|Yesterday)\s+at\s+(\d{1,2}):(\d{2})\s*([ap]m)?$/i);
    if (relative) {
      const hour = relative[4] ? Number(relative[2]) % 12 + (/pm/i.test(relative[4]) ? 12 : 0) : Number(relative[2]);
      const minute = Number(relative[3]);
      if (hour < 24 && minute < 60) {
        return today - (/yesterday/i.test(relative[1]) ? 86400000 : 0) + (hour * 60 + minute - 480) * 60000;
      }
      return NaN;
    }
    if (!/\b\d{4}\b/.test(label)) return NaN;
    return Date.parse(label.replace(/\s+at\s+/i, " ") + " GMT+0800");
  };
  const metric = (value) => {
    const match = value?.trim().match(/^(\d+(?:[,.]\d+)*)([KM])?$/i);
    if (!match) return undefined;
    const unit = match[2]?.toUpperCase();
    return Math.round(Number(unit ? match[1].replace(/,/g, "") : match[1].replace(/[,.]/g, "")) * (unit === "K" ? 1000 : unit === "M" ? 1000000 : 1));
  };
  const findTable = () => [...document.querySelectorAll("table")].find((table) =>
    [...table.querySelectorAll("th")].some((cell) => /^Engagement\b/i.test(cell.innerText.trim())));
  let table;
  for (let attempt = 0; attempt < 15 && !(table = findTable()); attempt++) await pause();
  if (!table) return { error: "Jadual Engagement Facebook tidak tersedia dalam Content Library." };

  for (let page = 0; page < 24 && posts.size < 80; page++) {
    table = findTable();
    if (!table) break;
    const headers = [...table.rows[0].cells].map((cell) => cell.innerText.trim());
    const index = (name) => headers.findIndex((value) => value === name || value.startsWith(name + "\n"));
    const previewIndex = index("Preview");
    const engagementIndex = index("Engagement");
    const viewsIndex = index("Views");
    const commentsIndex = index("Comments");
    for (const row of [...table.rows].slice(1)) {
      const preview = row.cells[previewIndex];
      const link = preview?.querySelector('a[href*="/content/insights/"]');
      if (!link) continue;
      const url = new URL(link.href);
      const id = url.searchParams.get("content_id");
      if (url.origin !== origin || !id || posts.has(id)) continue;
      const label = preview.innerText.trim();
      const published = label.match(/\bPublished\s*[•·]\s*(.+)$/is);
      if (!published) continue;
      const name = (link.getAttribute("aria-label") || "").replace(/^Post insights,\s*/i, "").trim();
      const text = name || label.slice(0, published.index).trim();
      if (!text || /^(?:photo|video|text) story$/i.test(text) || /(?:…|\.\.\.)$/.test(text)) continue;
      const date = parseDate(published[1].trim());
      if (!Number.isFinite(date) || date < cutoff || date > capturedAt) continue;
      const canonical = new URL("/content/insights/", origin);
      canonical.searchParams.set("content_id", id);
      posts.set(id, {
        platform: "personal", url: canonical.href, text: text.slice(0, 12000),
        postedAt: new Date(date).toISOString(),
        facebookEngagement: metric(row.cells[engagementIndex]?.innerText),
        views: metric(row.cells[viewsIndex]?.innerText),
        comments: metric(row.cells[commentsIndex]?.innerText),
      });
      if (posts.size >= 80) break;
    }
    const middle = table.getBoundingClientRect();
    const container = [...(function* () { for (let element = table.parentElement; element; element = element.parentElement) yield element; })()]
      .find((element) => /auto|scroll/.test(getComputedStyle(element).overflowY) && element.scrollHeight > element.clientHeight);
    const scroller = container || document.scrollingElement;
    const before = scroller.scrollTop;
    scroller.scrollBy(0, Math.max(300, Math.min(window.innerHeight, middle.height) * 0.85));
    await pause();
    if (scroller.scrollTop === before && page >= 3) break;
  }
  return {
    posts: [...posts.values()],
    note: "Facebook menggunakan julat tarikh yang dipaparkan dalam Content Library. Liputan 30 hari penuh belum disahkan.",
  };
}
