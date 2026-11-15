async function publishFacebookInChrome(text, name) {
  if (location.origin !== "https://www.facebook.com" || !text?.trim() || !name) return "failed";
  const compact = (value) => String(value || "").replace(/\s+/gu, " ").trim();
  const visible = (node) => node.getClientRects().length && getComputedStyle(node).visibility !== "hidden";
  const find = (root, selector) => [...root.querySelectorAll(selector)].filter(visible);
  const only = (list) => list.length === 1 ? list[0] : null;
  const label = (node) => compact(node.getAttribute("aria-label") || node.textContent);
  const control = (root, pattern) => only(find(root, 'button,[role="button"]').filter((node) =>
    !node.disabled && node.getAttribute("aria-disabled") !== "true" && pattern.test(label(node))));
  const dialogs = () => find(document, '[role="dialog"]');
  const field = (dialog) => only(find(dialog, '[contenteditable="true"]').filter((node) =>
    !node.parentElement?.closest('[contenteditable="true"]') && !node.matches('[aria-hidden="true"]')));
  const account = (dialog) => find(dialog, 'a,span,strong').some((node) =>
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

  if (dialogs().length) return "failed";
  const open = await wait(() => control(document, /^(what.s on your mind|apa yang anda fikirkan)([?,].*)?$/i));
  if (!open || dialogs().length) return "failed";
  open.click();
  const composer = await wait(() => {
    const dialog = only(dialogs());
    return dialog && account(dialog) && field(dialog) ? dialog : null;
  });
  if (!composer || compact(field(composer).innerText)) return "failed";
  field(composer).focus();
  document.execCommand("insertText", false, text);
  if (!await wait(() => only(dialogs()) === composer && account(composer) && verifyText(composer), 15)) return "failed";
  let finalDialog = composer;
  let submit = control(composer, /^(post|siarkan)$/i);
  if (!submit) {
    const next = await wait(() => control(composer, /^(next|seterusnya)$/i), 15);
    if (!next || only(dialogs()) !== composer || !verifyText(composer)) return "failed";
    next.click();
    finalDialog = await wait(() => {
      const dialog = only(dialogs());
      return dialog && (dialog === composer || account(dialog)) &&
        verifyText(dialog) && control(dialog, /^(post|siarkan)$/i) ? dialog : null;
    });
    if (!finalDialog) return "failed";
    submit = control(finalDialog, /^(post|siarkan)$/i);
  }
  if (!submit || only(dialogs()) !== finalDialog || !verifyText(finalDialog)) return "failed";
  const confirmations = () => find(document, '[role="alert"],[role="status"],[aria-live]').filter((node) =>
    /^(post published|your post was published|your post is now published|posted)[.!]?$/i.test(label(node)));
  const before = new Set(confirmations());
  try {
    submit.click();
    return await wait(() => !finalDialog.isConnected && confirmations().some((notice) => !before.has(notice)), 60) ? "posted" : "uncertain";
  } catch {
    return "uncertain";
  }
}
