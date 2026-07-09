const PANEL_ID = "postpilot-assist-panel";

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

function dataUrlToFile(dataUrl, name, type) {
  const [header, data] = String(dataUrl || "").split(",");
  const mime = type || header.match(/data:([^;]+)/)?.[1] || "image/jpeg";
  const binary = atob(data || "");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], name || "post-hook.jpg", { type: mime });
}

function setText(target, text) {
  target.focus();
  if (target.tagName === "TEXTAREA" || target.tagName === "INPUT") {
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(target), "value")?.set;
    if (setter) setter.call(target, text);
    else target.value = text;
    target.dispatchEvent(new Event("input", { bubbles: true }));
    target.dispatchEvent(new Event("change", { bubbles: true }));
    return;
  }

  const range = document.createRange();
  range.selectNodeContents(target);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
  document.execCommand("insertText", false, text);
  target.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: text }));
}

function findTextbox() {
  const candidates = [
    ...document.querySelectorAll('[contenteditable="true"][role="textbox"]'),
    ...document.querySelectorAll('[contenteditable="true"]'),
    ...document.querySelectorAll("textarea"),
  ].filter(visible);
  return candidates.find((node) => {
    const label = String(node.getAttribute("aria-label") || "").toLowerCase();
    const text = textOf(node).toLowerCase();
    return label.includes("what") || label.includes("mind") || label.includes("post") || label.includes("comment") || label.includes("reply") || label.includes("apa") || label.includes("komen") || text.length < 200;
  }) || candidates[0] || null;
}

function findClickableByText(patterns) {
  const regexes = patterns.map((pattern) => new RegExp(pattern, "i"));
  const nodes = [...document.querySelectorAll("button, a, div[role='button'], span[role='button']")].filter(visible);
  return nodes.find((node) => regexes.some((regex) => regex.test(textOf(node))));
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
  const input = [...document.querySelectorAll("input[type='file']")]
    .find((node) => !node.disabled && (!node.accept || /image|\*/i.test(node.accept)));

  if (!input) return "Image input tidak dijumpai. Upload gambar hook secara manual.";

  const transfer = new DataTransfer();
  transfer.items.add(file);
  input.files = transfer.files;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
  await sleep(700);
  return "Gambar hook cuba diattach. Semak preview sebelum publish.";
}

async function getDraft() {
  const { currentDraft } = await chrome.storage.local.get("currentDraft");
  if (!currentDraft?.postText) throw new Error("Tiada draft PostPilot. Hantar draft dari webapp dahulu.");
  return currentDraft;
}

async function fillPost() {
  const draft = await getDraft();
  const textbox = await openComposer();
  setText(textbox, draft.postText);
  const imageStatus = await attachImage(draft.image);
  showPanel(`${imageStatus}\n\nPost sudah diisi. Semak, kemudian klik Post sendiri.`, draft);
  return { ok: true, message: imageStatus };
}

async function fillComment() {
  const draft = await getDraft();
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
  setText(textbox, draft.commentCta);
  showPanel("CTA komen sudah diisi. Semak, kemudian klik Reply sendiri.", draft);
  return { ok: true };
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
  title.textContent = "PostPilot Assist";
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
    showPanel("Draft diterima dari webapp. Tekan Fill Personal Post bila composer Facebook sudah ready.", draft);
    await sleep(1200);
    await fillPost();
  } catch (error) {
    if (!String(error?.message || error).includes("Tiada draft")) {
      showPanel(error?.message || String(error), null);
    }
  }
})();
