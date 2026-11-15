// Runs on facebook.com for BuddyPilot Poster. Two jobs, both started by the
// owner from the popup: put an approved post into Facebook's post box, and
// read the engagement numbers shown on the owner's own posts. It does not
// press Post, react, comment or read anything else.
(() => {
  const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
  const composer = () => document.querySelector('div[role="dialog"] div[contenteditable="true"][role="textbox"]');
  const opener = () => [...document.querySelectorAll('div[role="button"]')].find((node) => /what's on your mind|apa yang .{0,24}fikirkan/i.test(node.textContent || "") && (node.textContent || "").length < 80);

  async function waitFor(find, ms) {
    for (const end = Date.now() + ms; Date.now() < end; await sleep(250)) {
      const found = find();
      if (found) return found;
    }
    return null;
  }

  // Pasting a picture file is how a photo is added to the post box by hand too.
  async function pastePhoto(box, dataUrl) {
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const data = new DataTransfer();
      data.items.add(new File([blob], "gambar.jpg", { type: blob.type || "image/jpeg" }));
      box.focus();
      box.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }));
      await sleep(1200);
    } catch {}
  }

  async function fill(text, image = "") {
    let box = composer();
    if (!box) {
      const button = await waitFor(opener, 6000);
      if (!button) return { ok: false };
      button.click();
      box = await waitFor(composer, 8000);
    }
    if (!box) return { ok: false };
    box.focus();
    await sleep(300);
    const data = new DataTransfer();
    data.setData("text/plain", text);
    box.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }));
    await sleep(700);
    if (!(box.innerText || "").trim()) document.execCommand("insertText", false, text);
    await sleep(300);
    const ok = (box.innerText || "").trim().length > 0;
    if (ok && image) await pastePhoto(box, image);
    return { ok };
  }

  // "1.2K" → 1200, "3,410" → 3410.
  function number(value) {
    const match = /([\d.,]+)\s*([KkMm])?/.exec(String(value || ""));
    if (!match) return 0;
    const base = match[2] ? Number(match[1].replace(",", ".")) : Number(match[1].replace(/[.,]/g, ""));
    return Math.round((Number.isFinite(base) ? base : 0) * (/k/i.test(match[2] || "") ? 1000 : /m/i.test(match[2] || "") ? 1000000 : 1));
  }

  function scan() {
    const posts = [];
    for (const article of document.querySelectorAll('div[role="article"]')) {
      if (article.parentElement?.closest('div[role="article"]')) continue; // a comment, not a post
      const message = article.querySelector('[data-ad-preview="message"], [data-ad-comet-preview="message"]');
      const text = (message?.innerText || "").replace(/\s*(See more|Lihat lagi|Lihat selanjutnya)\s*$/i, "").trim();
      if (text.length < 80) continue;
      const labels = [...article.querySelectorAll("[aria-label]")].map((node) => node.getAttribute("aria-label") || "");
      const texts = [...article.querySelectorAll("span")].map((node) => (node.textContent || "").trim()).filter((value) => value.length < 40);
      const find = (pattern) => number((texts.find((value) => pattern.test(value)) || "").replace(pattern, "$1"));
      const reacted = labels.map((label) => /^(?:Like|Love|Care|Haha|Wow|Sad|Angry|Suka|Sayang|Peduli|Sedih|Marah)[^:]*:\s*([\d.,]+\s*[KkMm]?)/.exec(label)).filter(Boolean);
      const link = article.querySelector('a[href*="/posts/"], a[href*="story_fbid"], a[href*="/permalink/"]');
      posts.push({
        text,
        reactions: reacted.reduce((sum, match) => sum + number(match[1]), 0),
        comments: find(/^([\d.,]+\s*[KkMm]?)\s*(?:comments?|komen)\b.*$/i),
        shares: find(/^([\d.,]+\s*[KkMm]?)\s*(?:shares?|perkongsian|kongsian)\b.*$/i),
        url: link ? link.href.split("?")[0] : "",
      });
    }
    return { posts: posts.slice(0, 60) };
  }

  chrome.runtime.onMessage.addListener((message, sender, respond) => {
    if (message?.type === "buddypilot-fill") { fill(String(message.text || ""), String(message.image || "")).then(respond); return true; }
    if (message?.type === "buddypilot-scan") { respond(scan()); return false; }
    return false;
  });

  // Facebook was opened from the popup with a post waiting: fill it once.
  chrome.storage.local.get("pendingFill").then(async ({ pendingFill }) => {
    if (!pendingFill || Date.now() - pendingFill.at > 120000) return;
    await chrome.storage.local.remove("pendingFill");
    await fill(pendingFill.text, pendingFill.image || "");
  });
})();
