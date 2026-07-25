const PANEL_ID = "postpilot-assist-panel";
const RUN_LOCK_KEY = "postpilotRunLock";
const STARTED_AUTOMATION_KEY = "postpilotStartedAutomationId";
const COMPLETED_AUTOMATION_KEY = "postpilotCompletedAutomationId";
const LOCK_TTL_MS = 7 * 60_000;
const STEP_RETRY_MS = 5 * 60_000;
const STEP_RETRY_INTERVAL_MS = 5_000;

let inPageRun = false;

function facebookCaption(draft) {
  return String(draft?.facebookPostText || draft?.facebook_post_text || draft?.postText || "").trim();
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function now() {
  return Date.now();
}

function visible(element) {
  if (!element) return false;
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
}

function attrOf(element, name) {
  return typeof element?.getAttribute === "function" ? element.getAttribute(name) || "" : "";
}

function hasAttr(element, name) {
  return typeof element?.hasAttribute === "function" && element.hasAttribute(name);
}

function textOf(element) {
  return String(element?.innerText || element?.textContent || attrOf(element, "aria-label") || "").trim();
}

function normalized(value) {
  return String(value || "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, "")
    .trim();
}

function countNeedle(haystack, needle) {
  const safeNeedle = normalized(needle);
  if (!safeNeedle) return 0;
  return normalized(haystack).split(safeNeedle).length - 1;
}

function disabled(element) {
  return Boolean(element?.disabled)
    || attrOf(element, "aria-disabled") === "true"
    || hasAttr(element, "disabled");
}

async function waitUntil(check, { timeout = 8_000, interval = 180, label = "Step" } = {}) {
  const started = now();
  while (now() - started <= timeout) {
    const result = await check();
    if (result) return result;
    await sleep(interval);
  }
  throw new Error(`${label} belum siap.`);
}

function dataUrlToFile(dataUrl, name, type) {
  const [header, data] = String(dataUrl || "").split(",");
  const mime = type || header.match(/data:([^;]+)/)?.[1] || "image/jpeg";
  const binary = atob(data || "");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], name || "post-hook.jpg", { type: mime });
}

function activeDialog() {
  const dialogs = [...document.querySelectorAll('[role="dialog"], [aria-modal="true"]')].filter(visible);
  return dialogs.find((dialog) => /create post|buat siaran|what's on your mind|apa yang anda fikir|post/i.test(textOf(dialog)))
    || dialogs[dialogs.length - 1]
    || null;
}

function activeComposerScope() {
  return activeDialog() || document;
}

function findClickableIn(scope, patterns) {
  const regexes = patterns.map((pattern) => new RegExp(pattern, "i"));
  const nodes = [...scope.querySelectorAll("button, a, div[role='button'], span[role='button']")]
    .filter((node) => visible(node) && !disabled(node) && !node.closest(`#${PANEL_ID}`));
  return nodes.find((node) => regexes.some((regex) => regex.test(textOf(node))));
}

function findClickable(patterns) {
  return findClickableIn(document, patterns);
}

function findFileInput(scope = activeComposerScope()) {
  return [...scope.querySelectorAll("input[type='file']"), ...document.querySelectorAll("input[type='file']")]
    .find((node) => !node.disabled && (!node.accept || /image|\*/i.test(node.accept)));
}

function findPhotoVideoButton(scope = document) {
  return findClickableIn(scope, [
    "^photo/video$",
    "^gambar/video$",
    "^foto/video$",
    "photo/video",
    "gambar/video",
    "foto/video",
    "add photo",
    "tambah foto",
    "tambah gambar",
  ]);
}

function findTextboxIn(scope, purpose = "post") {
  const candidates = [
    ...scope.querySelectorAll('[contenteditable="true"][role="textbox"]'),
    ...scope.querySelectorAll('[contenteditable="true"]'),
    ...scope.querySelectorAll("textarea"),
  ].filter((node) => visible(node) && !node.closest(`#${PANEL_ID}`));

  return candidates.find((node) => {
    const label = String(attrOf(node, "aria-label") || "").toLowerCase();
    const placeholder = String(attrOf(node, "aria-placeholder") || attrOf(node, "placeholder") || "").toLowerCase();
    const text = textOf(node).toLowerCase();
    const combined = `${label} ${placeholder}`;
    if (combined.includes("search")) return false;
    if (purpose === "comment") {
      return combined.includes("comment")
        || combined.includes("reply")
        || combined.includes("komen")
        || combined.includes("balas")
        || text.length < 120;
    }
    if (combined.includes("comment") || combined.includes("reply") || combined.includes("komen") || combined.includes("balas")) return false;
    return combined.includes("what")
      || combined.includes("mind")
      || combined.includes("post")
      || combined.includes("apa")
      || text.length < 120;
  }) || candidates[0] || null;
}

function selectContents(target) {
  const range = document.createRange();
  range.selectNodeContents(target);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
}

async function clearTextBox(target, label) {
  target.click();
  target.focus();
  if (target.tagName === "TEXTAREA" || target.tagName === "INPUT") {
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(target), "value")?.set;
    if (setter) setter.call(target, "");
    else target.value = "";
    target.dispatchEvent(new Event("input", { bubbles: true }));
    target.dispatchEvent(new Event("change", { bubbles: true }));
  } else {
    document.execCommand("selectAll", false);
    document.execCommand("delete", false);
    selectContents(target);
    document.execCommand("delete", false);
    target.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "deleteContentBackward" }));
  }
  await waitUntil(() => normalized(textOf(target)).length === 0, {
    timeout: 2_500,
    interval: 120,
    label: `${label} kosong`,
  });
}

async function fillOnce(target, text, label) {
  const content = String(text || "").trim();
  if (!content) throw new Error(`${label} kosong.`);

  await clearTextBox(target, label);
  target.click();
  target.focus();

  if (target.tagName === "TEXTAREA" || target.tagName === "INPUT") {
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(target), "value")?.set;
    if (setter) setter.call(target, content);
    else target.value = content;
    target.dispatchEvent(new Event("input", { bubbles: true }));
    target.dispatchEvent(new Event("change", { bubbles: true }));
  } else {
    document.execCommand("insertText", false, content);
    target.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: content }));
    target.dispatchEvent(new Event("change", { bubbles: true }));
  }

  await waitUntil(() => countNeedle(textOf(target), content) === 1, {
    timeout: 3_500,
    interval: 120,
    label,
  });
  if (countNeedle(textOf(target), content) !== 1) {
    throw new Error(`${label} tidak clean. Auto-post dibatalkan supaya tidak duplicate.`);
  }
}

function visibleLargeImageCount(scope) {
  return [...scope.querySelectorAll("img")].filter((node) => {
    if (!visible(node)) return false;
    const rect = node.getBoundingClientRect();
    return rect.width >= 140 && rect.height >= 90;
  }).length;
}

function visibleBlobImageCount(scope) {
  return [...scope.querySelectorAll("img")].filter((node) => {
    if (!visible(node)) return false;
    const src = String(node.currentSrc || node.src || "");
    return /^blob:|^data:image\//i.test(src);
  }).length;
}

function visibleBackgroundImageCount(scope) {
  return [...scope.querySelectorAll("div, span")].filter((node) => {
    if (!visible(node) || node.closest(`#${PANEL_ID}`)) return false;
    const rect = node.getBoundingClientRect();
    const background = window.getComputedStyle(node).backgroundImage || "";
    return rect.width >= 140 && rect.height >= 90 && background !== "none" && /url\(/i.test(background);
  }).length;
}

function visibleMediaCount(scope) {
  return visibleLargeImageCount(scope) + visibleBlobImageCount(scope) + visibleBackgroundImageCount(scope);
}

function findAttachmentControl(scope) {
  return [...scope.querySelectorAll("button, div[role='button'], span[role='button'], a")]
    .filter((node) => visible(node) && !node.closest(`#${PANEL_ID}`))
    .find((node) => /remove.*(photo|image|attachment)|edit.*(photo|image)|buang.*(gambar|lampiran)|edit.*gambar|remove all/i
      .test(`${textOf(node)} ${attrOf(node, "aria-label") || ""}`));
}

function uploadTextSeen(scope) {
  return /uploading|processing|preparing|memuat naik|sedang diproses|menyediakan/i.test(textOf(scope));
}

function composerHasAttachment(scope, initialImageCount) {
  const text = textOf(scope).toLowerCase();
  if (text.includes("remove post attachment") || text.includes("remove all")) return true;
  if (text.includes("edit") && (text.includes("photo") || text.includes("image") || text.includes("gambar"))) return true;
  if (findAttachmentControl(scope)) return true;
  if (uploadTextSeen(scope)) return true;
  return visibleMediaCount(scope) > initialImageCount;
}

function attachmentReadyStatus(scope, initialImageCount, input, uploadedAt) {
  if (composerHasAttachment(scope, initialImageCount)) return "preview";
  if (input?.files?.length && now() - uploadedAt >= 6_000) return "file-input";
  return "";
}

function dispatchFileToFacebook(input, file) {
  const transfer = new DataTransfer();
  transfer.items.add(file);

  try {
    input.files = transfer.files;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  } catch (error) {
    // Keep going with drop/paste events. Some Facebook inputs are wrapped by custom upload UI.
  }

  const targets = [
    input,
    input.parentElement,
    activeComposerScope(),
    findTextboxIn(activeComposerScope(), "post"),
    document.body,
  ].filter(Boolean);

  for (const target of targets) {
    try {
      for (const eventName of ["dragenter", "dragover", "drop"]) {
        target.dispatchEvent(new DragEvent(eventName, {
          bubbles: true,
          cancelable: true,
          dataTransfer: transfer,
        }));
      }
    } catch (error) {
      // File input/change is still the main route; drag/drop is best-effort.
    }
    try {
      target.dispatchEvent(new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData: transfer,
      }));
    } catch (error) {
      // Some Chrome builds reject synthetic clipboard payloads. File input remains the primary path.
    }
  }

  return transfer;
}

function findActionInComposer(scope, labels) {
  const regexes = labels.map((label) => new RegExp(label, "i"));
  const root = scope || document;
  const nodes = [...root.querySelectorAll("button, div[role='button'], span[role='button']")]
    .filter((node) => visible(node) && !disabled(node) && !node.closest(`#${PANEL_ID}`));
  return nodes.find((node) => regexes.some((regex) => regex.test(textOf(node))));
}

function findActionButton(scope, labels) {
  return findActionInComposer(scope, labels)
    || (scope !== document ? findActionInComposer(document, labels) : null);
}

function postTextProbe(text) {
  return String(text || "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .find((line) => !/^klik\s+sini\s*:/i.test(line) && !/^https?:\/\//i.test(line))
    || String(text || "").trim().slice(0, 50);
}

function postTextProbes(text) {
  const lines = String(text || "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length >= 8)
    .filter((line) => !/^klik\s+sini\s*:/i.test(line) && !/^https?:\/\//i.test(line));
  const probes = lines.slice(0, 3);
  const fallback = postTextProbe(text);
  if (fallback && !probes.includes(fallback)) probes.push(fallback);
  return probes.map(normalized).filter(Boolean);
}

function meaningfulWords(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 3)
    .filter((word) => !["klik", "sini", "https", "http", "www", "com"].includes(word));
}

function feedArticles() {
  return [...document.querySelectorAll('[role="article"], div[data-pagelet*="FeedUnit"], div[data-ft]')]
    .filter((article) => visible(article) && !article.closest(`#${PANEL_ID}`))
    .filter((article) => {
      const text = textOf(article).toLowerCase();
      return !text.includes("sponsored")
        && !text.includes("try suno today")
        && !text.includes("create story")
        && !text.includes("your story")
        && !text.includes("friend requests");
    });
}

function captionWordHits(articleText, postText) {
  const targetWords = meaningfulWords(postText).slice(0, 12);
  if (!targetWords.length) return 0;
  const articleWords = new Set(meaningfulWords(articleText));
  return targetWords.filter((word) => articleWords.has(word)).length;
}

function scoreFeedPost(article, postText) {
  const articleText = textOf(article);
  const probes = postTextProbes(postText);
  const haystack = normalized(articleText);
  let score = 0;
  if (probes.some((probe) => haystack.includes(probe))) score += 90;
  const wordHits = captionWordHits(articleText, postText);
  if (wordHits >= 4) score += 60;
  else if (wordHits >= 2) score += 25;
  if (/just now|baru sahaja|baru sebentar|1m|2m/i.test(articleText)) score += 25;
  if (findCommentButtonForPost(article)) score += 15;
  if (visibleMediaCount(article) > 0) score += 10;
  return score;
}

function findNewestPostByCaption(postText, { allowFallback = false } = {}) {
  const scored = feedArticles()
    .map((article, index) => ({ article, index, score: scoreFeedPost(article, postText) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index);
  const matched = scored.find((entry) => entry.score >= 60);
  if (matched) return matched.article;
  if (!allowFallback) return null;
  const likelyNewest = scored.find((entry) => entry.score >= 25);
  return likelyNewest?.article || feedArticles()[0] || null;
}

function findCommentButtonForPost(postNode) {
  return findClickableIn(postNode, [
    "^comment$",
    "comment$",
    "leave a comment",
    "write a comment",
    "^komen$",
    "komen$",
    "tulis komen",
    "^reply$",
    "^balas$",
  ]);
}

function scrollPostTowardActions(postNode, attempt = 1) {
  if (!postNode) return;
  postNode.scrollIntoView({ block: "center", inline: "nearest" });
  const rect = postNode.getBoundingClientRect();
  const neededToBottom = rect.bottom - window.innerHeight + 140;
  const progressiveStep = 180 + Math.min(720, attempt * 120);
  const top = neededToBottom > 0 ? Math.min(neededToBottom, progressiveStep) : progressiveStep;
  window.scrollBy({ top: Math.max(120, top), left: 0, behavior: "instant" });
}

function findSubmitCommentButton(scope) {
  const regexes = ["^comment$", "^post$", "^reply$", "^send$", "^komen$", "^siar$", "^balas$"]
    .map((pattern) => new RegExp(pattern, "i"));
  const nodes = [...scope.querySelectorAll("button, div[role='button'], span[role='button']")]
    .filter((node) => visible(node) && !disabled(node) && !node.closest(`#${PANEL_ID}`));
  return nodes.reverse().find((node) => regexes.some((regex) => regex.test(textOf(node))));
}

function commentSubmitScope(commentBox) {
  let node = commentBox;
  for (let depth = 0; node && depth < 7; depth += 1) {
    const submit = findSubmitCommentButton(node);
    if (submit) return node;
    node = node.parentElement;
  }
  return commentBox.closest('[role="article"]') || document;
}

async function getDraft() {
  const { currentDraft } = await chrome.storage.local.get("currentDraft");
  if (!facebookCaption(currentDraft)) throw new Error("Tiada draft Post Pilot. Hantar draft dari webapp dahulu.");
  return currentDraft;
}

async function shouldAutoStartDraft(draft) {
  if (!draft?.autoPublish) return false;
  const automationId = draft.automationId || draft.id || "";
  const state = await chrome.storage.local.get([RUN_LOCK_KEY, STARTED_AUTOMATION_KEY, COMPLETED_AUTOMATION_KEY]);
  if (state[RUN_LOCK_KEY]?.startedAt && now() - Number(state[RUN_LOCK_KEY].startedAt) < LOCK_TTL_MS) return false;
  if (automationId && state[STARTED_AUTOMATION_KEY] === automationId) return false;
  if (automationId && state[COMPLETED_AUTOMATION_KEY] === automationId) return false;
  return true;
}

async function acquireRunLock(label, automationId, manual = false) {
  if (inPageRun) throw new Error("Post Pilot sedang jalan. Tunggu step sekarang siap dulu.");

  const state = await chrome.storage.local.get([RUN_LOCK_KEY, COMPLETED_AUTOMATION_KEY, STARTED_AUTOMATION_KEY]);
  const lock = state[RUN_LOCK_KEY];
  if (lock?.startedAt && now() - Number(lock.startedAt) < LOCK_TTL_MS) {
    throw new Error(`Post Pilot sedang jalan (${lock.label || "automation"}). Tunggu siap dulu.`);
  }
  if (!manual && automationId && state[COMPLETED_AUTOMATION_KEY] === automationId) {
    throw new Error("Automation ini sudah selesai. Hantar draft baru untuk run lagi.");
  }
  if (!manual && automationId && state[STARTED_AUTOMATION_KEY] === automationId) {
    throw new Error("Automation ini sudah pernah start. Hantar draft baru untuk elak duplicate.");
  }

  inPageRun = true;
  await chrome.storage.local.set({
    [RUN_LOCK_KEY]: { label, automationId, startedAt: now() },
    ...(automationId ? { [STARTED_AUTOMATION_KEY]: automationId } : {}),
  });
}

async function releaseRunLock() {
  inPageRun = false;
  await chrome.storage.local.remove(RUN_LOCK_KEY).catch(() => {});
}

function showPanel(status, draft) {
  chrome.storage?.local?.set?.({ postpilotAutomationStatus: status || "Draft ready." }).catch(() => {});
  const existing = document.getElementById(PANEL_ID);
  if (existing) existing.remove();

  const panel = document.createElement("div");
  panel.id = PANEL_ID;
  panel.style.cssText = [
    "position:fixed",
    "right:16px",
    "bottom:16px",
    "z-index:2147483647",
    "width:min(360px,calc(100vw - 32px))",
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
    button("Auto Full Flow", async () => {
      try {
        const nextDraft = { ...(draft || await getDraft()), autoPublish: true };
        await chrome.storage.local.set({ currentDraft: nextDraft, [STARTED_AUTOMATION_KEY]: "", [COMPLETED_AUTOMATION_KEY]: "" });
        await runFullAutomation({ manual: true });
      } catch (error) {
        showPanel(error.message, draft);
      }
    }),
    button("Copy CTA", async () => {
      await navigator.clipboard.writeText(draft?.commentCta || "");
      showPanel("CTA komen sudah dicopy.", draft);
    }),
    button("Close", () => panel.remove())
  );

  for (const action of actions.querySelectorAll("button")) {
    action.style.cssText = "border:0;border-radius:999px;background:#111827;color:#fff;padding:8px 10px;font-weight:700;cursor:pointer";
  }

  panel.append(title, body, actions);
  document.documentElement.appendChild(panel);
}

function button(label, handler) {
  const node = document.createElement("button");
  node.type = "button";
  node.textContent = label;
  node.addEventListener("click", handler);
  return node;
}

function notifyFacebookDone(automationId) {
  try {
    chrome.runtime.sendMessage({ type: "POSTPILOT_FACEBOOK_DONE", automationId }, () => {
      void chrome.runtime.lastError;
    });
  } catch {
    // Background wake-up is best effort; Facebook post has already completed.
  }
}

function notifyBatchFailed(automationId, error) {
  try {
    chrome.runtime.sendMessage({
      type: "POSTPILOT_BATCH_FAILED",
      automationId,
      error: error?.message || String(error),
    }, () => { void chrome.runtime.lastError; });
  } catch {
    // Best effort status update only.
  }
}

function progress(steps, current) {
  return [...steps, current].join("\n");
}

async function waitStep(check, { timeout = STEP_RETRY_MS, interval = STEP_RETRY_INTERVAL_MS, label = "Step", draft = null } = {}) {
  const started = now();
  let attempt = 0;
  let lastError = "";
  while (now() - started <= timeout) {
    attempt += 1;
    try {
      const result = await check(attempt);
      if (result) return result;
      lastError = "";
    } catch (error) {
      lastError = error?.message || String(error);
    }
    const remainingSeconds = Math.max(0, Math.ceil((timeout - (now() - started)) / 1000));
    showPanel(`${label} belum ready. Cuba lagi dalam 5s...\nAttempt ${attempt}. Baki ${remainingSeconds}s.${lastError ? `\nLast error: ${lastError}` : ""}`, draft);
    await sleep(interval);
  }
  throw new Error(`${label} belum siap selepas 5 minit.${lastError ? ` Last error: ${lastError}` : ""}`);
}

async function clickPhotoVideo(draft) {
  const inputBeforeClick = findFileInput(activeComposerScope());
  if (inputBeforeClick) return inputBeforeClick;

  let photoButton = await waitStep(() => findPhotoVideoButton(document), {
    timeout: STEP_RETRY_MS,
    interval: STEP_RETRY_INTERVAL_MS,
    label: "1/5 Button Photo/video",
    draft,
  }).catch(() => null);

  if (!photoButton) {
    const composerPrompt = await waitStep(() => findClickable([
      "what's on your mind",
      "what is on your mind",
      "apa yang anda fikir",
      "create post",
      "buat siaran",
    ]), {
      timeout: STEP_RETRY_MS,
      interval: STEP_RETRY_INTERVAL_MS,
      label: "1/5 Composer Facebook",
      draft,
    });
    composerPrompt.click();
    await sleep(700);

    photoButton = await waitStep(() => findPhotoVideoButton(activeComposerScope()) || findFileInput(activeComposerScope()), {
      timeout: STEP_RETRY_MS,
      interval: STEP_RETRY_INTERVAL_MS,
      label: "1/5 Button Photo/video dalam composer",
      draft,
    });
  }

  if (typeof photoButton.click === "function") {
    photoButton.click();
    await sleep(800);
  }

  return waitStep(() => findFileInput(activeComposerScope()) || findFileInput(document), {
    timeout: STEP_RETRY_MS,
    interval: STEP_RETRY_INTERVAL_MS,
    label: "1/5 Input gambar selepas Photo/video",
    draft,
  });
}

async function ensureComposerOpen(draft) {
  const textbox = await waitStep(() => {
    const scope = activeComposerScope();
    const found = findTextboxIn(scope, "post");
    if (found) return found;
    const prompt = findClickableIn(scope, ["what's on your mind", "what is on your mind", "apa yang anda fikir", "write something"]);
    if (prompt) prompt.click();
    return null;
  }, {
    timeout: STEP_RETRY_MS,
    interval: STEP_RETRY_INTERVAL_MS,
    label: "3/5 Composer Facebook",
    draft,
  });
  return { scope: activeComposerScope(), textbox };
}

async function fillOnceWithRetry(targetProvider, text, fillLabel, stepLabel, draft) {
  return waitStep(async () => {
    const target = typeof targetProvider === "function" ? await targetProvider() : targetProvider;
    if (!target) return null;
    await fillOnce(target, text, fillLabel);
    return target;
  }, {
    timeout: STEP_RETRY_MS,
    interval: STEP_RETRY_INTERVAL_MS,
    label: stepLabel,
    draft,
  });
}

async function attachHookImageFromDraft(draft) {
  if (!draft.image?.dataUrl) throw new Error("Gambar hook tiada dalam draft. Auto-post dibatalkan.");
  const file = dataUrlToFile(draft.image.dataUrl, draft.image.name, draft.image.type);
  const baselineMediaCount = visibleMediaCount(activeComposerScope());
  let lastInput = null;
  let uploadedAt = 0;

  await waitStep(() => {
    const scope = activeComposerScope();
    const readyStatus = attachmentReadyStatus(scope, baselineMediaCount, lastInput, uploadedAt);
    if (readyStatus) {
      if (readyStatus === "file-input") {
        showPanel("2/5 Gambar hook sudah dihantar ke Facebook.\nPreview visual tidak dapat dibaca, teruskan tunggu button Next/Post ready.", draft);
      }
      return true;
    }

    const input = findFileInput(scope) || findFileInput(document);
    if (!input) {
      const photoButton = findPhotoVideoButton(scope) || findPhotoVideoButton(document);
      if (photoButton) photoButton.click();
      return null;
    }

    if (lastInput === input && input.files?.length) return null;
    dispatchFileToFacebook(input, file);
    lastInput = input;
    uploadedAt = now();
    return null;
  }, {
    timeout: STEP_RETRY_MS,
    interval: STEP_RETRY_INTERVAL_MS,
    label: "2/5 Attach gambar hook",
    draft,
  });
}

async function removeLinkPreviewIfPresent() {
  const scope = activeComposerScope();
  const removeButton = findClickableIn(scope, [
    "^remove link preview",
    "remove link preview from your post",
    "^remove preview",
    "buang pratonton pautan",
  ]);
  if (removeButton) {
    removeButton.click();
    await sleep(350);
  }
}

function findNextButton(scope) {
  return findActionButton(scope, [/^next$/i, /^continue$/i, /^done$/i, /^seterusnya$/i, /^teruskan$/i, /^selesai$/i].map((r) => r.source));
}

function findPostButton(scope) {
  return findActionButton(scope, [/^post$/i, /^publish$/i, /^siar$/i, /^siarkan$/i, /^kongsi$/i, /^kongsikan$/i].map((r) => r.source));
}

async function clickNextStep(draft) {
  const result = await waitStep(() => {
    const scope = activeComposerScope();
    const nextButton = findNextButton(scope);
    if (nextButton) return { button: nextButton, type: "next" };
    const postButton = findPostButton(scope);
    if (postButton) return { button: postButton, type: "post" };
    return null;
  }, {
    timeout: STEP_RETRY_MS,
    interval: STEP_RETRY_INTERVAL_MS,
    label: "4/5 Button Next",
    draft,
  });

  if (result.type === "post") {
    return "skipped";
  }

  result.button.click();
  await sleep(750);
  return "clicked";
}

async function clickPostStep(draft) {
  const postButton = await waitStep(() => findPostButton(activeComposerScope()), {
    timeout: STEP_RETRY_MS,
    interval: STEP_RETRY_INTERVAL_MS,
    label: "5/5 Button Post",
    draft,
  });
  postButton.click();
}

async function waitForPostPublished(draft) {
  await waitStep(() => !activeDialog(), {
    timeout: STEP_RETRY_MS,
    interval: STEP_RETRY_INTERVAL_MS,
    label: "5/5 Composer tutup selepas Post",
    draft,
  }).catch(() => {});

  return waitStep(() => {
    const matchedPost = findNewestPostByCaption(facebookCaption(draft), { allowFallback: true });
    if (matchedPost) return matchedPost;
    if (activeDialog()) return null;
    window.scrollTo({ top: 0, behavior: "instant" });
    return findNewestPostByCaption(facebookCaption(draft), { allowFallback: true });
  }, {
    timeout: STEP_RETRY_MS,
    interval: STEP_RETRY_INTERVAL_MS,
    label: "5/5 Post baru dalam feed",
    draft,
  });
}

async function openCommentBoxForPost(postNode, draft) {
  return waitStep(async (attempt) => {
    const freshPost = facebookCaption(draft)
      ? findNewestPostByCaption(facebookCaption(draft), { allowFallback: true }) || postNode
      : postNode;
    if (!freshPost) return null;
    const existingBox = findTextboxIn(freshPost, "comment") || findTextboxIn(document, "comment");
    if (existingBox) return existingBox;
    const commentButton = findCommentButtonForPost(freshPost);
    if (!commentButton) {
      scrollPostTowardActions(freshPost, attempt);
      return null;
    }
    commentButton.scrollIntoView({ block: "center", inline: "nearest" });
    await sleep(250);
    commentButton.click();
    await sleep(700);
    return findTextboxIn(freshPost, "comment") || findTextboxIn(document, "comment");
  }, {
    timeout: STEP_RETRY_MS,
    interval: STEP_RETRY_INTERVAL_MS,
    label: "Ruang komen",
    draft,
  });
}

async function fillCommentOnce(commentBox, ctaText, draft) {
  await fillOnceWithRetry(() => (visible(commentBox) ? commentBox : findTextboxIn(document, "comment")), ctaText, "CTA komen", "Isi CTA komen", draft);
}

async function submitCommentButtonOnce(commentBox, draft) {
  const submit = await waitStep(() => {
    const scope = commentSubmitScope(commentBox);
    return findSubmitCommentButton(scope) || findSubmitCommentButton(document);
  }, {
    timeout: STEP_RETRY_MS,
    interval: STEP_RETRY_INTERVAL_MS,
    label: "Button post komen",
    draft,
  });
  submit.click();
  await sleep(600);
}

async function runFullAutomation({ manual = false } = {}) {
  const draft = await getDraft();
  const automationId = draft.automationId || draft.id || `postpilot-${Date.now()}`;
  await acquireRunLock("full-auto-flow", automationId, manual);
  const steps = [];
  try {
    if (draft.remoteJobId) {
      window.scrollTo({ top: 0, behavior: "instant" });
      await sleep(500);
      if (findNewestPostByCaption(facebookCaption(draft))) {
        steps.push("Caption ini sudah live di Facebook. Skip supaya tidak duplicate.");
        await chrome.storage.local.set({ [COMPLETED_AUTOMATION_KEY]: automationId, autoPublishedDraftId: draft.id || automationId });
        notifyFacebookDone(automationId);
        showPanel(steps.join("\n"), draft);
        return { ok: true, message: steps.join("\n"), skipped: true };
      }
    }
    showPanel(progress(steps, "1/5 Facebook tab baru sudah dibuka. Cari Photo/video..."), draft);
    await waitStep(() => document.readyState === "complete" || document.readyState === "interactive", {
      timeout: STEP_RETRY_MS,
      interval: STEP_RETRY_INTERVAL_MS,
      label: "1/5 Facebook page",
      draft,
    });
    await clickPhotoVideo(draft);
    steps.push("1/5 Facebook ready dan Photo/video ditekan.");

    showPanel(progress(steps, "2/5 Pilih/attach gambar hook dari draft tersimpan..."), draft);
    await attachHookImageFromDraft(draft);
    steps.push("2/5 Gambar hook sudah dihantar ke composer.");

    showPanel(progress(steps, "3/5 Isi personal post sekali sahaja..."), draft);
    await ensureComposerOpen(draft);
    await fillOnceWithRetry(() => findTextboxIn(activeComposerScope(), "post"), facebookCaption(draft), "Personal post", "3/5 Isi personal post", draft);
    await removeLinkPreviewIfPresent();
    steps.push("3/5 Personal post clean, tiada duplicate.");

    showPanel(progress(steps, "4/5 Tekan Next..."), draft);
    const nextStatus = await clickNextStep(draft);
    steps.push(nextStatus === "skipped"
      ? "4/5 Next tidak diperlukan, terus ke Post."
      : "4/5 Next ditekan.");

    showPanel(progress(steps, "5/5 Tekan Post..."), draft);
    await clickPostStep(draft);
    steps.push("5/5 Post ditekan.");

    showPanel(progress(steps, "5/5 Tunggu post baru muncul..."), draft);
    await waitForPostPublished(draft);
    steps.push("5/5 Post live dijumpai. Auto comment CTA dibuang.");

    await chrome.storage.local.set({ [COMPLETED_AUTOMATION_KEY]: automationId, autoPublishedDraftId: draft.id || automationId });
    notifyFacebookDone(automationId);
    steps.push("Full flow selesai. Komen CTA tidak dipost secara automatik.");
    showPanel(steps.join("\n"), draft);
    return { ok: true, message: steps.join("\n") };
  } catch (error) {
    notifyBatchFailed(automationId, error);
    throw error;
  } finally {
    await releaseRunLock();
  }
}

async function fillPostOnly() {
  const draft = await getDraft();
  await acquireRunLock("fill-post", draft.automationId || draft.id || "", true);
  try {
    await clickPhotoVideo(draft);
    await attachHookImageFromDraft(draft);
    await ensureComposerOpen(draft);
    await fillOnceWithRetry(() => findTextboxIn(activeComposerScope(), "post"), facebookCaption(draft), "Personal post", "3/5 Isi personal post", draft);
    await removeLinkPreviewIfPresent();
    showPanel("Post personal sudah diisi sekali sahaja. Semak composer.", draft);
    return { ok: true };
  } finally {
    await releaseRunLock();
  }
}

async function fillCommentOnly() {
  const draft = await getDraft();
  await acquireRunLock("fill-comment", draft.automationId || draft.id || "", true);
  try {
    const postNode = findNewestPostByCaption(facebookCaption(draft)) || document;
    const commentBox = await openCommentBoxForPost(postNode, draft);
    await fillCommentOnce(commentBox, draft.commentCta, draft);
    showPanel("CTA komen sudah diisi sekali sahaja. Semak sebelum post komen.", draft);
    return { ok: true };
  } finally {
    await releaseRunLock();
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    if (message?.type === "POSTPILOT_FILL_POST") {
      sendResponse(await fillPostOnly());
      return;
    }
    if (message?.type === "POSTPILOT_AUTO_POST") {
      const draft = await getDraft().catch(() => null);
      const autoBlocked = draft?.autoPublish && !(await shouldAutoStartDraft(draft));
      if (inPageRun || autoBlocked) {
        sendResponse({ ok: true, message: "Full auto flow already running." });
        return;
      }
      runFullAutomation({ manual: true }).catch((error) => {
        showPanel(error?.message || String(error), null);
      });
      sendResponse({ ok: true, message: "Full auto flow started." });
      return;
    }
    if (message?.type === "POSTPILOT_FILL_COMMENT") {
      sendResponse(await fillCommentOnly());
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
    if (await shouldAutoStartDraft(draft)) {
      showPanel("Draft diterima. Auto flow mula sekarang...", draft);
      window.setTimeout(() => {
        shouldAutoStartDraft(draft)
          .then((ready) => {
            if (!ready) return null;
            return runFullAutomation({ manual: false });
          })
          .catch((error) => {
            showPanel(error?.message || String(error), draft);
          });
      }, 800);
      return;
    }
    showPanel(draft.autoPublish
      ? "Draft diterima. Auto flow sudah start atau sedang berjalan."
      : "Draft diterima. Tekan Auto Full Flow bila ready.", draft);
  } catch (error) {
    if (!String(error?.message || error).includes("Tiada draft") && !String(error?.message || error).includes("sudah pernah start")) {
      showPanel(error?.message || String(error), null);
    }
  }
})();
