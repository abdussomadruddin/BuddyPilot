const PANEL_ID = "postpilot-assist-panel";
const RUN_LOCK_KEY = "postpilotRunLock";
let isRunningPostPilot = false;

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function visible(element) {
  if (!element) return false;
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
}

function textOf(element) {
  return String(element?.innerText || element?.textContent || element?.getAttribute("aria-label") || "").trim();
}

function now() {
  return Date.now();
}

async function waitUntil(check, { timeout = 6000, interval = 180, label = "step" } = {}) {
  const started = now();
  while (now() - started <= timeout) {
    const result = await check();
    if (result) return result;
    await sleep(interval);
  }
  throw new Error(`${label} belum siap. Auto-post dibatalkan.`);
}

function compactText(value) {
  return String(value || "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, "")
    .trim();
}

function disabled(element) {
  return element?.disabled
    || element?.getAttribute("aria-disabled") === "true"
    || element?.getAttribute("disabled") !== null;
}

function activeComposerScope() {
  const dialogs = [
    ...document.querySelectorAll('[role="dialog"], [aria-modal="true"]'),
  ].filter(visible);
  return dialogs.find((dialog) => /create post|buat siaran|what's on your mind|apa yang anda fikir|post/i.test(textOf(dialog)))
    || dialogs[dialogs.length - 1]
    || document;
}

function dataUrlToFile(dataUrl, name, type) {
  const [header, data] = String(dataUrl || "").split(",");
  const mime = type || header.match(/data:([^;]+)/)?.[1] || "image/jpeg";
  const binary = atob(data || "");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], name || "post-hook.jpg", { type: mime });
}

function countCompactOccurrences(haystack, needle) {
  const safeNeedle = compactText(needle);
  if (!safeNeedle) return 0;
  return compactText(haystack).split(safeNeedle).length - 1;
}

function selectEditableContents(target) {
  const range = document.createRange();
  range.selectNodeContents(target);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
}

async function clearEditable(target) {
  target.click();
  target.focus();
  document.execCommand("selectAll", false);
  document.execCommand("delete", false);
  selectEditableContents(target);
  document.execCommand("delete", false);
  target.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "deleteContentBackward" }));
  await sleep(250);
}

function pastePlainText(target, content) {
  const data = new DataTransfer();
  data.setData("text/plain", content);
  const event = new ClipboardEvent("paste", {
    bubbles: true,
    cancelable: true,
    clipboardData: data,
  });
  const notHandled = target.dispatchEvent(event);
  if (notHandled) document.execCommand("insertText", false, content);
  target.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: content }));
  target.dispatchEvent(new Event("change", { bubbles: true }));
}

async function verifyTextboxText(target, content) {
  const expected = compactText(content);
  await waitUntil(() => {
    const actual = compactText(textOf(target));
    if (actual === expected) return true;
    if (actual.includes(expected) && countCompactOccurrences(textOf(target), content) === 1) return true;
    return false;
  }, { timeout: 2500, interval: 120, label: "Caption Facebook" });
  if (countCompactOccurrences(textOf(target), content) !== 1) {
    throw new Error("Composer text tidak clean. Auto-post dibatalkan supaya caption tidak duplicate.");
  }
}

async function setText(target, text) {
  const content = String(text || "").trim();
  target.focus();
  if (target.tagName === "TEXTAREA" || target.tagName === "INPUT") {
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(target), "value")?.set;
    if (setter) setter.call(target, content);
    else target.value = content;
    target.dispatchEvent(new Event("input", { bubbles: true }));
    target.dispatchEvent(new Event("change", { bubbles: true }));
    await verifyTextboxText(target, content);
    return;
  }

  if (countCompactOccurrences(textOf(target), content) === 1) return;

  await clearEditable(target);
  await waitUntil(() => compactText(textOf(target)).length === 0, {
    timeout: 2500,
    interval: 120,
    label: "Kosongkan composer",
  });
  pastePlainText(target, content);
  await verifyTextboxText(target, content);
}

function findTextbox() {
  const scope = activeComposerScope();
  const candidates = [
    ...scope.querySelectorAll('[contenteditable="true"][role="textbox"]'),
    ...scope.querySelectorAll('[contenteditable="true"]'),
    ...scope.querySelectorAll("textarea"),
  ].filter((node) => visible(node) && !node.closest(`#${PANEL_ID}`));
  return candidates.find((node) => {
    const label = String(node.getAttribute("aria-label") || "").toLowerCase();
    const placeholder = String(node.getAttribute("aria-placeholder") || node.getAttribute("placeholder") || "").toLowerCase();
    const text = textOf(node).toLowerCase();
    if (label.includes("search") || placeholder.includes("search")) return false;
    if (label.includes("comment") || label.includes("reply") || label.includes("komen") || label.includes("balas")) return false;
    return label.includes("what")
      || label.includes("mind")
      || label.includes("post")
      || label.includes("apa")
      || placeholder.includes("what")
      || placeholder.includes("mind")
      || placeholder.includes("apa")
      || text.length < 200;
  }) || candidates[0] || null;
}

function findClickableByText(patterns) {
  const regexes = patterns.map((pattern) => new RegExp(pattern, "i"));
  const nodes = [...document.querySelectorAll("button, a, div[role='button'], span[role='button']")].filter(visible);
  return nodes.find((node) => regexes.some((regex) => regex.test(textOf(node))));
}

function findClickableByTextIn(scope, patterns) {
  const regexes = patterns.map((pattern) => new RegExp(pattern, "i"));
  const nodes = [...scope.querySelectorAll("button, a, div[role='button'], span[role='button']")].filter(visible);
  return nodes.find((node) => regexes.some((regex) => regex.test(textOf(node))));
}

function findActionButton(textbox, labels) {
  const scope = textbox?.closest("[role='dialog']")
    || textbox?.closest("[aria-modal='true']")
    || activeComposerScope()
    || document;
  const nodes = [...scope.querySelectorAll("button, div[role='button'], span[role='button']")]
    .filter((node) => visible(node) && !disabled(node));
  return nodes.find((node) => labels.some((regex) => regex.test(textOf(node))));
}

function findPostButton(textbox) {
  return findActionButton(textbox, [/^post$/i, /^publish$/i, /^siar$/i, /^siarkan$/i, /^kongsi$/i, /^kongsikan$/i]);
}

function findNextButton(textbox) {
  return findActionButton(textbox, [/^next$/i, /^done$/i, /^continue$/i, /^seterusnya$/i, /^berikutnya$/i, /^selesai$/i, /^teruskan$/i]);
}

async function clickFacebookPostButton(textbox, draft) {
  const existing = await chrome.storage.local.get("autoPublishedDraftId");
  if (existing.autoPublishedDraftId === draft.id && !findPostButton(textbox) && !findNextButton(textbox)) {
    return "Draft ini sudah pernah auto-click Post. Hantar draft baru untuk post lagi.";
  }

  let intermediateClicks = 0;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const postButton = findPostButton(textbox);
    if (postButton) {
      postButton.click();
      await chrome.storage.local.set({ autoPublishedDraftId: draft.id });
      return "Butang Post Facebook sudah diklik automatik.";
    }

    const nextButton = findNextButton(textbox);
    if (nextButton && intermediateClicks < 3) {
      nextButton.click();
      intermediateClicks += 1;
      await sleep(450);
      continue;
    }

    await sleep(220);
  }

  throw new Error("Butang Post Facebook tidak dijumpai atau masih disabled selepas cuba Next. Semak composer, kemudian tekan Auto Post Now dari panel extension.");
}

async function removeLinkPreview(textbox) {
  const scope = textbox?.closest("[role='dialog']")
    || textbox?.closest("[aria-modal='true']")
    || activeComposerScope()
    || document;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const removePreview = findClickableByTextIn(scope, [
      "^remove link preview",
      "remove link preview from your post",
      "^remove preview",
      "buang pratonton pautan",
    ]);
    if (removePreview) {
      removePreview.click();
      await sleep(500);
      return true;
    }
    await sleep(300);
  }
  return false;
}

function visibleLargeImageCount(scope) {
  return [...scope.querySelectorAll("img")]
    .filter((node) => {
      if (!visible(node)) return false;
      const rect = node.getBoundingClientRect();
      return rect.width >= 140 && rect.height >= 90;
    }).length;
}

function composerHasImageAttachment(scope, initialImageCount) {
  const text = textOf(scope).toLowerCase();
  if (text.includes("remove post attachment")) return true;
  return visibleLargeImageCount(scope) > initialImageCount;
}

async function waitForImageAttachment(scope, initialImageCount) {
  return waitUntil(() => composerHasImageAttachment(scope, initialImageCount), {
    timeout: 9000,
    interval: 220,
    label: "Gambar hook",
  });
}

async function openComposer() {
  let textbox = findTextbox();
  if (textbox) return textbox;

  const trigger = findClickableByText([
    "what's on your mind",
    "what is on your mind",
    "create post",
    "buat siaran",
    "apa yang anda fikir",
    "post",
    "photo/video",
  ]);
  if (trigger) {
    trigger.click();
    await sleep(900);
  }

  textbox = findTextbox();
  if (!textbox) throw new Error("Composer Facebook personal tidak dijumpai. Buka composer secara manual, kemudian tekan Fill Personal Post dari extension.");
  return textbox;
}

async function attachImage(image) {
  if (!image?.dataUrl) return "No image in draft.";
  const file = dataUrlToFile(image.dataUrl, image.name, image.type);
  const scope = activeComposerScope();
  const initialImageCount = visibleLargeImageCount(scope);
  let input = [...scope.querySelectorAll("input[type='file']")]
    .find((node) => !node.disabled && (!node.accept || /image|\*/i.test(node.accept)));

  if (!input) {
    const photoButton = findClickableByTextIn(scope, ["^photo/video$", "^gambar/video$", "^foto/video$"]);
    if (photoButton) {
      photoButton.click();
      await sleep(350);
    }
    input = [...scope.querySelectorAll("input[type='file']"), ...document.querySelectorAll("input[type='file']")]
      .find((node) => !node.disabled && (!node.accept || /image|\*/i.test(node.accept)));
  }

  if (!input) throw new Error("Image input tidak dijumpai. Auto-post dibatalkan supaya post tidak publish tanpa gambar hook.");

  const transfer = new DataTransfer();
  transfer.items.add(file);
  input.files = transfer.files;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
  await waitForImageAttachment(scope, initialImageCount);
  return "Gambar hook sudah diattach dan ready.";
}

async function getDraft() {
  const { currentDraft } = await chrome.storage.local.get("currentDraft");
  if (!currentDraft?.postText) throw new Error("Tiada draft Post Pilot. Hantar draft dari webapp dahulu.");
  return currentDraft;
}

async function runExclusive(label, task) {
  if (isRunningPostPilot) {
    throw new Error("Post Pilot sedang jalan. Tunggu step sekarang siap dulu.");
  }
  isRunningPostPilot = true;
  await chrome.storage.local.set({ [RUN_LOCK_KEY]: { label, startedAt: Date.now() } }).catch(() => {});
  try {
    return await task();
  } finally {
    isRunningPostPilot = false;
    await chrome.storage.local.remove(RUN_LOCK_KEY).catch(() => {});
  }
}

function statusLine(lines, next) {
  return [...lines, next].join("\n");
}

async function fillPost({ forceAuto = false } = {}) {
  const draft = await getDraft();
  return runExclusive(forceAuto || draft.autoPublish ? "auto-post" : "fill-post", async () => {
  const steps = [];
  showPanel(statusLine(steps, "1/5 Buka composer Facebook..."), draft);
  const textbox = await openComposer();
  steps.push("1/5 Composer ready.");
  showPanel(statusLine(steps, "2/5 Isi caption sekali sahaja..."), draft);
  await setText(textbox, draft.postText);
  steps.push("2/5 Caption siap dan clean.");
  showPanel(statusLine(steps, "3/5 Buang link preview jika ada..."), draft);
  await removeLinkPreview(textbox);
  steps.push("3/5 Link preview checked.");
  showPanel(statusLine(steps, "4/5 Attach gambar hook..."), draft);
  const imageStatus = await attachImage(draft.image);
  steps.push(`4/5 ${imageStatus}`);
  if (forceAuto || draft.autoPublish) {
    showPanel(statusLine(steps, "5/5 Tunggu button Next/Post..."), draft);
    const postStatus = await clickFacebookPostButton(textbox, draft);
    steps.push(`5/5 ${postStatus}`);
    showPanel(steps.join("\n"), draft);
    return { ok: true, message: steps.join("\n") };
  }
  showPanel(`${steps.join("\n")}\n\nPost sudah diisi.`, draft);
  return { ok: true, message: imageStatus };
  });
}

async function fillComment() {
  const draft = await getDraft();
  return runExclusive("fill-comment", async () => {
  let textbox = findTextbox();
  if (!textbox) {
    const replyTrigger = findClickableByText(["reply", "balas", "comment", "komen"]);
    if (replyTrigger) {
      replyTrigger.click();
      await sleep(700);
      textbox = findTextbox();
    }
  }
  if (!textbox) throw new Error("Reply composer tidak dijumpai. Buka post/reply box dahulu, kemudian tekan Fill CTA Comment.");
  await setText(textbox, draft.commentCta);
  showPanel("CTA komen sudah diisi. Semak, kemudian klik Reply sendiri.", draft);
  return { ok: true };
  });
}

function button(label, handler) {
  const node = document.createElement("button");
  node.type = "button";
  node.textContent = label;
  node.addEventListener("click", handler);
  return node;
}

function showPanel(status, draft) {
  const existing = document.getElementById(PANEL_ID);
  if (existing) existing.remove();

  const panel = document.createElement("div");
  panel.id = PANEL_ID;
  panel.style.cssText = [
    "position:fixed",
    "right:16px",
    "bottom:16px",
    "z-index:2147483647",
    "width:min(330px,calc(100vw - 32px))",
    "padding:14px",
    "border-radius:16px",
    "background:#ffffff",
    "color:#111827",
    "box-shadow:0 16px 45px rgba(0,0,0,.22)",
    "font:14px/1.4 Arial,Helvetica,sans-serif",
    "border:1px solid #e5e7eb",
  ].join(";");

  const title = document.createElement("strong");
  title.textContent = "Post Pilot Assist";
  title.style.display = "block";

  const body = document.createElement("p");
  body.textContent = status || "Draft ready.";
  body.style.whiteSpace = "pre-wrap";
  body.style.margin = "8px 0 10px";
  body.style.color = "#374151";

  const actions = document.createElement("div");
  actions.style.cssText = "display:flex;flex-wrap:wrap;gap:8px";
  actions.append(
    button("Fill Personal Post", () => fillPost().catch((error) => showPanel(error.message, draft))),
    button("Auto Post Now", async () => {
      try {
        const nextDraft = { ...(draft || await getDraft()), autoPublish: true };
        await chrome.storage.local.set({ currentDraft: nextDraft, autoPublishedDraftId: "" });
        await fillPost({ forceAuto: true });
      } catch (error) {
        showPanel(error.message, draft);
      }
    }),
    button("Copy CTA", async () => {
      await navigator.clipboard.writeText(draft?.commentCta || "");
      showPanel("CTA komen sudah dicopy.", draft);
    }),
    button("Fill CTA Comment", () => fillComment().catch((error) => showPanel(error.message, draft))),
    button("Close", () => panel.remove())
  );

  for (const action of actions.querySelectorAll("button")) {
    action.style.cssText = "border:0;border-radius:999px;background:#111827;color:#fff;padding:8px 10px;font-weight:700;cursor:pointer";
  }

  panel.append(title, body, actions);
  document.documentElement.appendChild(panel);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    if (message?.type === "POSTPILOT_FILL_POST") {
      sendResponse(await fillPost());
      return;
    }
    if (message?.type === "POSTPILOT_AUTO_POST") {
      const draft = await getDraft();
      await chrome.storage.local.set({ currentDraft: { ...draft, autoPublish: true }, autoPublishedDraftId: "" });
      sendResponse(await fillPost({ forceAuto: true }));
      return;
    }
    if (message?.type === "POSTPILOT_FILL_COMMENT") {
      sendResponse(await fillComment());
      return;
    }
    sendResponse({ ok: false, error: "Unknown message." });
  })().catch((error) => {
    showPanel(error?.message || String(error), null);
    sendResponse({ ok: false, error: error?.message || String(error) });
  });
  return true;
});

(async () => {
  try {
    const draft = await getDraft();
    showPanel("Draft diterima dari webapp. Facebook akan cuba auto post sekarang.", draft);
    await sleep(500);
    await fillPost();
  } catch (error) {
    if (!String(error?.message || error).includes("Tiada draft")) {
      showPanel(error?.message || String(error), null);
    }
  }
})();
