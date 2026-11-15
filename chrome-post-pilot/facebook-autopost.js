async function publishFacebookInChrome(text, name, photo = null) {
  if (location.origin !== "https://www.facebook.com" || !text?.trim() || !name) return "failed:profile";
  const compact = (value) => String(value || "").replace(/[\u200B\uFEFF]/gu, "").replace(/\s+/gu, " ").trim();
  const visible = (node) => node.getClientRects().length && getComputedStyle(node).visibility !== "hidden";
  const find = (root, selector) => [...root.querySelectorAll(selector)].filter(visible);
  const only = (list) => list.length === 1 ? list[0] : null;
  const label = (node) => compact(node.getAttribute("aria-label") || node.textContent);
  const control = (root, pattern) => only(find(root, 'button,[role="button"]').filter((node) =>
    !node.disabled && node.getAttribute("aria-disabled") !== "true" && pattern.test(label(node))));
  const dialogs = () => {
    const visibleDialogs = find(document, '[role="dialog"]');
    return visibleDialogs.filter((dialog) =>
      !visibleDialogs.includes(dialog.parentElement?.closest('[role="dialog"]')));
  };
  const field = (dialog) => {
    const fields = find(dialog, '[contenteditable="true"]').filter((node) =>
      !node.parentElement?.closest('[contenteditable="true"]') && !node.closest('[aria-hidden="true"]'));
    const preferred = fields.filter((node) => node.matches('[role="textbox"],[data-lexical-editor],[data-editor]'));
    return preferred.length ? only(preferred) : only(fields);
  };
  const account = (dialog) => find(dialog, 'a,span,strong,b,div[dir="auto"]').some((node) =>
    !node.closest('[contenteditable]') && compact(node.textContent).toLowerCase() === name.toLowerCase());
  const verifyText = (dialog) => {
    const editor = field(dialog);
    if (editor) return compact(editor.innerText) === compact(text);
    return find(dialog, '[dir="auto"]').some((node) => compact(node.innerText) === compact(text));
  };
  const wait = async (check, tries = 40) => {
    for (let i = 0; i < tries; i++) {
      const result = check();
      if (result) return result;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    return null;
  };

  if (dialogs().length) return "failed:composer";
  const open = await wait(() => control(document, /^(what.s on your mind|apa yang anda fikirkan)([?,].*)?$/i)
    || control(document, /^(create post|cipta siaran)$/i));
  if (!open || dialogs().length) return "failed:composer";
  open.click();
  const composer = await wait(() => {
    const dialog = only(dialogs());
    return dialog && field(dialog) ? dialog : null;
  });
  if (!composer || compact(field(composer).innerText)) return "failed:composer";
  if (!await wait(() => only(dialogs()) === composer && account(composer))) return "failed:profile";
  let photoSrc = "";
  const previews = (dialog) => find(dialog, "img[src]").filter((node) =>
    /^(blob:|data:image\/)/i.test(node.src) && node.complete && node.naturalWidth > 0);
  if (photo) {
    if (!["image/jpeg", "image/png"].includes(photo.type) || !photo.base64 || photo.base64.length > 5592408) return "failed:image";
    const existing = new Set(previews(composer).map((node) => node.src));
    const inputForPhoto = () => only([...composer.querySelectorAll('input[type="file"]')].filter((node) =>
      !node.disabled && !node.files?.length && /(?:image\/|\.(?:jpg|jpeg|png)\b)/i.test(node.accept)));
    const skipPicker = (event) => { if (event.target?.matches('input[type="file"]')) event.preventDefault(); };
    document.addEventListener("click", skipPicker, true);
    try {
      const add = control(composer, /^(photo\s*\/\s*video|photo or video|foto\s*\/\s*video)$/i);
      if (add) add.click();
      const input = await wait(() => only(dialogs()) === composer && inputForPhoto());
      if (!input) return "failed:image";
      const bytes = Uint8Array.from(atob(photo.base64), (char) => char.charCodeAt(0));
      const data = new DataTransfer();
      data.items.add(new File([bytes], photo.type === "image/png" ? "buddypilot.png" : "buddypilot.jpg", { type: photo.type }));
      input.files = data.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    } catch { return "failed:image"; }
    finally { document.removeEventListener("click", skipPicker, true); }
    photoSrc = await wait(() => only(dialogs()) === composer && only(previews(composer).filter((node) => !existing.has(node.src)))?.src);
    if (!photoSrc || !field(composer) || compact(field(composer).innerText)) return "failed:image";
  }
  const photoReady = (dialog) => !photo || previews(dialog).some((node) => node.src === photoSrc);
  field(composer).focus();
  // Facebook's editor strips line breaks from insertText. Its paste handler
  // preserves paragraphs when given plain text.
  if (!/[\r\n]/.test(text)) document.execCommand("insertText", false, text);
  const textReady = () => only(dialogs()) === composer && account(composer) && verifyText(composer);
  if (!await wait(textReady, 6)) {
    const editor = only(dialogs()) === composer ? field(composer) : null;
    if (!editor || compact(editor.innerText) || !account(composer)) return "failed:text";
    try {
      const clipboardData = new DataTransfer();
      clipboardData.setData("text/plain", text);
      editor.focus();
      editor.dispatchEvent(new ClipboardEvent("paste", { clipboardData, bubbles: true, cancelable: true }));
    } catch { return "failed:text"; }
    if (!await wait(textReady, 8)) return "failed:text";
  }
  let finalDialog = composer;
  let submit = control(composer, /^(post|siarkan)$/i);
  if (!submit) {
    const next = await wait(() => control(composer, /^(next|seterusnya)$/i), 15);
    if (!next || only(dialogs()) !== composer || !verifyText(composer)) return "failed:next";
    if (!photoReady(composer)) return "failed:image";
    next.click();
    finalDialog = await wait(() => {
      const dialog = only(dialogs());
      return dialog && (dialog === composer || account(dialog)) &&
        verifyText(dialog) && control(dialog, /^(post|siarkan)$/i) ? dialog : null;
    });
    if (!finalDialog) return "failed:next";
    submit = control(finalDialog, /^(post|siarkan)$/i);
  }
  if (!submit || only(dialogs()) !== finalDialog || !verifyText(finalDialog)) return "failed:post_button";
  if (!await wait(() => only(dialogs()) === finalDialog && photoReady(finalDialog), 15)) return "failed:image";
  if (!verifyText(finalDialog) || control(finalDialog, /^(post|siarkan)$/i) !== submit) return "failed:post_button";
  const confirmations = () => find(document, '[role="alert"],[role="status"],[aria-live]').filter((node) =>
    /^(post published|your post (?:was|has been|is now) published|posted)[.!]?$/i.test(label(node)));
  const before = new Set(confirmations());
  try {
    submit.click();
    return await wait(() => !finalDialog.isConnected && confirmations().some((notice) => !before.has(notice)), 60) ? "posted" : "uncertain";
  } catch {
    return "uncertain";
  }
}
