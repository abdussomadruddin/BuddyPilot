const PANEL_ID = "postpilot-threads-assist-panel";
const RUN_LOCK_KEY = "postpilotThreadsRunLock";
const STARTED_AUTOMATION_KEY = "postpilotThreadsStartedAutomationId";
const COMPLETED_AUTOMATION_KEY = "postpilotThreadsCompletedAutomationId";
const LOCK_TTL_MS = 7 * 60_000;
const STEP_RETRY_MS = 5 * 60_000;
const STEP_RETRY_INTERVAL_MS = 5_000;

let inPageRun = false;

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

function disabled(element) {
  return Boolean(element?.disabled)
    || attrOf(element, "aria-disabled") === "true"
    || hasAttr(element, "disabled");
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
  return dialogs.find((dialog) => /new thread|start a thread|what's new|post/i.test(textOf(dialog)))
    || dialogs[dialogs.length - 1]
    || null;
}

function activeComposerScope() {
  return activeDialog() || document;
}

function findClickableIn(scope, patterns) {
  const regexes = patterns.map((pattern) => new RegExp(pattern, "i"));
  const root = scope || document;
  const nodes = [...root.querySelectorAll("button, a, label, div[role='button'], span[role='button']")]
    .filter((node) => visible(node) && !disabled(node) && !node.closest(`#${PANEL_ID}`));
  return nodes.find((node) => {
    const haystack = `${textOf(node)} ${attrOf(node, "aria-label")} ${attrOf(node, "title")}`.trim();
    return regexes.some((regex) => regex.test(haystack));
  });
}

function findNewThreadButton(scope = document) {
  return findClickableIn(scope, [
    "^new thread$",
    "new thread",
    "^create$",
    "create thread",
    "start a thread",
    "thread baru",
  ]);
}

function findPostButton(scope = activeComposerScope()) {
  return findClickableIn(scope, [
    "^post$",
    "^publish$",
    "^share$",
    "^siar$",
    "^siarkan$",
    "^kongsi$",
    "^kongsikan$",
  ]) || (scope !== document ? findClickableIn(document, ["^post$", "^publish$", "^share$"]) : null);
}

function findFileInput(scope = activeComposerScope()) {
  return [...scope.querySelectorAll("input[type='file']"), ...document.querySelectorAll("input[type='file']")]
    .find((node) => !node.disabled && (!node.accept || /image|\*/i.test(node.accept)));
}

function findUploadButton(scope = activeComposerScope()) {
  const labelled = findClickableIn(scope, [
    "attach",
    "attachment",
    "photo",
    "image",
    "media",
    "upload",
    "add media",
    "gambar",
    "foto",
  ]);
  if (labelled) return labelled;

  const root = scope || document;
  const iconButtons = [...root.querySelectorAll("button, label, div[role='button'], span[role='button']")]
    .filter((node) => visible(node) && !disabled(node) && !node.closest(`#${PANEL_ID}`))
    .filter((node) => node.querySelector("svg") || node.querySelector("img"))
    .filter((node) => !/post|publish|share|close|cancel|back|search/i.test(textOf(node)));
  return iconButtons[0] || null;
}

function findTextboxIn(scope = activeComposerScope()) {
  const root = scope || document;
  const candidates = [
    ...root.querySelectorAll('[contenteditable="true"][role="textbox"]'),
    ...root.querySelectorAll('[contenteditable="true"]'),
    ...root.querySelectorAll("textarea"),
  ].filter((node) => visible(node) && !node.closest(`#${PANEL_ID}`));

  return candidates.find((node) => {
    const label = `${attrOf(node, "aria-label")} ${attrOf(node, "aria-placeholder")} ${attrOf(node, "placeholder")}`.toLowerCase();
    if (label.includes("search")) return false;
    if (label.includes("reply") || label.includes("comment")) return false;
    return label.includes("thread")
      || label.includes("what")
      || label.includes("new")
      || textOf(node).length < 120;
  }) || candidates[0] || null;
}

function selectContents(target) {
  const range = document.createRange();
  range.selectNodeContents(target);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
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

function visibleMediaCount(scope) {
  const root = scope || document;
  const images = [...root.querySelectorAll("img, video")].filter((node) => {
    if (!visible(node)) return false;
    const rect = node.getBoundingClientRect();
    return rect.width >= 80 && rect.height >= 60;
  }).length;
  const backgrounds = [...root.querySelectorAll("div, span")].filter((node) => {
    if (!visible(node) || node.closest(`#${PANEL_ID}`)) return false;
    const rect = node.getBoundingClientRect();
    const background = window.getComputedStyle(node).backgroundImage || "";
    return rect.width >= 80 && rect.height >= 60 && background !== "none" && /url\(/i.test(background);
  }).length;
  return images + backgrounds;
}

function attachmentReadyStatus(scope, initialMediaCount, input, uploadedAt) {
  if (visibleMediaCount(scope) > initialMediaCount) return "preview";
  if (input?.files?.length && now() - uploadedAt >= 6_000) return "file-input";
  return "";
}

function dispatchFileToThreads(input, file) {
  const transfer = new DataTransfer();
  transfer.items.add(file);
  input.files = transfer.files;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

function showPanel(status, draft) {
  chrome.storage?.local?.set?.({ postpilotAutomationStatus: status || "Threads draft ready." }).catch(() => {});
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
  title.textContent = "Post Pilot Threads";
  title.style.display = "block";

  const body = document.createElement("p");
  body.textContent = status || "Threads draft ready.";
  body.style.whiteSpace = "pre-wrap";
  body.style.margin = "8px 0 10px";
  body.style.color = "#374151";

  const actions = document.createElement("div");
  actions.style.cssText = "display:flex;flex-wrap:wrap;gap:8px";
  actions.append(
    button("Auto Threads", async () => {
      try {
        const nextDraft = { ...(draft || await getDraft()), autoPublish: true };
        await chrome.storage.local.set({ currentDraft: nextDraft, [STARTED_AUTOMATION_KEY]: "", [COMPLETED_AUTOMATION_KEY]: "" });
        if (nextDraft.threadsTextOnly) await runThreadsTextOnlyAutomation({ manual: true });
        else await runThreadsAutomation({ manual: true });
      } catch (error) {
        showPanel(error.message, draft);
      }
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

async function getDraft() {
  const { currentDraft } = await chrome.storage.local.get("currentDraft");
  if (!currentDraft?.postText) throw new Error("Tiada draft Post Pilot. Hantar draft dari webapp dahulu.");
  return currentDraft;
}

async function acquireRunLock(label, automationId, manual = false) {
  if (inPageRun) throw new Error("Post Pilot Threads sedang jalan. Tunggu step sekarang siap dulu.");

  const state = await chrome.storage.local.get([RUN_LOCK_KEY, COMPLETED_AUTOMATION_KEY, STARTED_AUTOMATION_KEY]);
  const lock = state[RUN_LOCK_KEY];
  if (lock?.startedAt && now() - Number(lock.startedAt) < LOCK_TTL_MS) {
    throw new Error(`Post Pilot Threads sedang jalan (${lock.label || "automation"}). Tunggu siap dulu.`);
  }
  if (!manual && automationId && state[COMPLETED_AUTOMATION_KEY] === automationId) {
    throw new Error("Threads automation ini sudah selesai.");
  }
  if (!manual && automationId && state[STARTED_AUTOMATION_KEY] === automationId) {
    throw new Error("Threads automation ini sudah pernah start.");
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

async function shouldAutoStartDraft(draft) {
  if (!draft?.autoPublish) return false;
  const automationId = draft.automationId || draft.id || "";
  const state = await chrome.storage.local.get([RUN_LOCK_KEY, STARTED_AUTOMATION_KEY, COMPLETED_AUTOMATION_KEY]);
  if (state[RUN_LOCK_KEY]?.startedAt && now() - Number(state[RUN_LOCK_KEY].startedAt) < LOCK_TTL_MS) return false;
  if (automationId && state[STARTED_AUTOMATION_KEY] === automationId) return false;
  if (automationId && state[COMPLETED_AUTOMATION_KEY] === automationId) return false;
  return true;
}

async function openNewThread(draft) {
  return waitStep(async () => {
    const scope = activeComposerScope();
    const textbox = findTextboxIn(scope);
    if (textbox && activeDialog()) return activeDialog();
    const buttonNode = findNewThreadButton(document);
    if (buttonNode) {
      buttonNode.click();
      await sleep(900);
    }
    return activeDialog() || (findTextboxIn(document) ? document : null);
  }, {
    label: "Threads 1/6 New thread",
    draft,
  });
}

async function attachHookImage(draft) {
  if (!draft.image?.dataUrl) throw new Error("Gambar hook tiada dalam draft. Threads auto-post dibatalkan.");
  const file = dataUrlToFile(draft.image.dataUrl, draft.image.name, draft.image.type);
  const baselineMediaCount = visibleMediaCount(activeComposerScope());
  let lastInput = null;
  let uploadedAt = 0;
  let uploadCount = 0;

  await waitStep(() => {
    const scope = activeComposerScope();
    const readyStatus = attachmentReadyStatus(scope, baselineMediaCount, lastInput, uploadedAt);
    if (readyStatus) return true;

    let input = findFileInput(scope) || findFileInput(document);
    if (!input) {
      const uploadButton = findUploadButton(scope) || findUploadButton(document);
      if (uploadButton) uploadButton.click();
      input = findFileInput(scope) || findFileInput(document);
      if (!input) return null;
    }

    if (lastInput === input && input.files?.length) return null;
    if (uploadCount >= 2) return input.files?.length ? true : null;
    dispatchFileToThreads(input, file);
    uploadCount += 1;
    lastInput = input;
    uploadedAt = now();
    return null;
  }, {
    label: "Threads 2/6 Upload gambar hook",
    draft,
  });
}

async function fillCaptionOnce(draft) {
  await waitStep(async () => {
    const textbox = findTextboxIn(activeComposerScope()) || findTextboxIn(document);
    if (!textbox) return null;
    await fillOnce(textbox, draft.postText, "Threads caption");
    return textbox;
  }, {
    label: "Threads 3/6 Isi caption sekali sahaja",
    draft,
  });
}

async function clickThreadsPost(draft) {
  const postButton = await waitStep(() => findPostButton(activeComposerScope()) || findPostButton(document), {
    label: "Threads 4/6 Button Post",
    draft,
  });
  postButton.scrollIntoView({ block: "center", inline: "nearest" });
  await sleep(250);
  postButton.click();
}

async function waitThreadsPosted(draft) {
  await waitStep(() => !activeDialog(), {
    label: "Threads 5/6 Composer tutup selepas Post",
    draft,
  }).catch(() => {});
}

function notifyThreadsDone(automationId, threadsTextOnly = false) {
  try {
    chrome.runtime.sendMessage({ type: "POSTPILOT_THREADS_DONE", automationId, threadsTextOnly }, () => {
      void chrome.runtime.lastError;
    });
  } catch {
    // Best effort status update only.
  }
}

async function runThreadsAutomation({ manual = false } = {}) {
  const draft = await getDraft();
  const automationId = draft.automationId || draft.id || `postpilot-threads-${Date.now()}`;
  await acquireRunLock("threads-auto-flow", automationId, manual);
  const steps = [];
  try {
    showPanel(progress(steps, "Threads 1/6 Buka New thread..."), draft);
    await waitStep(() => document.readyState === "complete" || document.readyState === "interactive", {
      label: "Threads page",
      draft,
    });
    await openNewThread(draft);
    steps.push("Threads 1/6 New thread dibuka.");

    showPanel(progress(steps, "Threads 2/6 Upload gambar hook..."), draft);
    await attachHookImage(draft);
    steps.push("Threads 2/6 Gambar hook siap.");

    showPanel(progress(steps, "Threads 3/6 Isi caption sekali sahaja..."), draft);
    await fillCaptionOnce(draft);
    steps.push("Threads 3/6 Caption clean, tiada duplicate.");

    showPanel(progress(steps, "Threads 4/6 Tekan Post..."), draft);
    await clickThreadsPost(draft);
    steps.push("Threads 4/6 Post ditekan.");

    showPanel(progress(steps, "Threads 5/6 Tunggu composer tutup..."), draft);
    await waitThreadsPosted(draft);
    steps.push("Threads 5/6 Threads post selesai.");

    await chrome.storage.local.set({ [COMPLETED_AUTOMATION_KEY]: automationId });
    notifyThreadsDone(automationId, false);
    steps.push("Facebook + Threads flow selesai.");
    showPanel(steps.join("\n"), draft);
    return { ok: true, message: steps.join("\n") };
  } finally {
    await releaseRunLock();
  }
}

async function runThreadsTextOnlyAutomation({ manual = false } = {}) {
  const draft = await getDraft();
  const automationId = draft.automationId || draft.id || `postpilot-threads-text-${Date.now()}`;
  await acquireRunLock("threads-text-only-flow", automationId, manual);
  const steps = [];
  try {
    showPanel(progress(steps, "Threads text 1/4 Buka New thread..."), draft);
    await waitStep(() => document.readyState === "complete" || document.readyState === "interactive", {
      label: "Threads page",
      draft,
    });
    await openNewThread(draft);
    steps.push("Threads text 1/4 New thread dibuka.");

    showPanel(progress(steps, "Threads text 2/4 Isi caption sekali sahaja..."), draft);
    await fillCaptionOnce(draft);
    steps.push("Threads text 2/4 Caption clean, tiada duplicate.");

    showPanel(progress(steps, "Threads text 3/4 Tekan Post..."), draft);
    await clickThreadsPost(draft);
    steps.push("Threads text 3/4 Post ditekan.");

    showPanel(progress(steps, "Threads text 4/4 Tunggu composer tutup..."), draft);
    await waitThreadsPosted(draft);
    steps.push("Threads text 4/4 Threads post selesai.");

    await chrome.storage.local.set({ [COMPLETED_AUTOMATION_KEY]: automationId });
    notifyThreadsDone(automationId, true);
    steps.push("Threads text-only flow selesai.");
    showPanel(steps.join("\n"), draft);
    return { ok: true, message: steps.join("\n") };
  } finally {
    await releaseRunLock();
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    if (message?.type === "POSTPILOT_THREADS_AUTO_POST") {
      const draft = await getDraft().catch(() => null);
      const autoBlocked = draft?.autoPublish && !(await shouldAutoStartDraft(draft));
      if (inPageRun || autoBlocked) {
        sendResponse({ ok: true, message: "Threads auto flow already running." });
        return;
      }
      runThreadsAutomation({ manual: true }).catch((error) => {
        showPanel(error?.message || String(error), null);
      });
      sendResponse({ ok: true, message: "Threads auto flow started." });
      return;
    }
    if (message?.type === "POSTPILOT_THREADS_TEXT_ONLY_POST") {
      const draft = await getDraft().catch(() => null);
      const autoBlocked = draft?.autoPublish && !(await shouldAutoStartDraft(draft));
      if (inPageRun || autoBlocked) {
        sendResponse({ ok: true, message: "Threads text-only flow already running." });
        return;
      }
      runThreadsTextOnlyAutomation({ manual: true }).catch((error) => {
        showPanel(error?.message || String(error), null);
      });
      sendResponse({ ok: true, message: "Threads text-only flow started." });
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
      showPanel("Draft diterima. Threads auto flow mula sekarang...", draft);
      window.setTimeout(() => {
        shouldAutoStartDraft(draft)
          .then((ready) => {
            if (!ready) return null;
            return draft.threadsTextOnly
              ? runThreadsTextOnlyAutomation({ manual: false })
              : runThreadsAutomation({ manual: false });
          })
          .catch((error) => {
            showPanel(error?.message || String(error), draft);
          });
      }, 900);
      return;
    }
    showPanel(draft.autoPublish
      ? "Draft diterima. Threads auto flow sudah start atau sedang berjalan."
      : "Draft diterima. Tekan Auto Threads bila ready.", draft);
  } catch (error) {
    if (!String(error?.message || error).includes("Tiada draft") && !String(error?.message || error).includes("sudah pernah start")) {
      showPanel(error?.message || String(error), null);
    }
  }
})();
