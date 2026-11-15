async function publishThreadsInChrome(parts, username) {
  if (location.origin !== "https://www.threads.com" || !/^[\w.]{1,30}$/.test(username) ||
      !Array.isArray(parts) || !parts.length || parts.length > 25 ||
      parts.some((part) => typeof part !== "string" || !part.trim() || part.length > 500)) return "failed";

  const visible = (node) => node.getClientRects().length && getComputedStyle(node).visibility !== "hidden";
  const find = (root, selector) => [...root.querySelectorAll(selector)].filter(visible);
  const only = (list) => list.length === 1 ? list[0] : null;
  const label = (node) => (node.getAttribute("aria-label") || node.textContent || "").trim();
  const control = (root, pattern) => only(find(root, 'button,[role="button"]').filter((node) =>
    !node.disabled && node.getAttribute("aria-disabled") !== "true" && pattern.test(label(node))));
  const dialogs = () => find(document, '[role="dialog"]');
  const editors = (dialog) => find(dialog, '[contenteditable="true"][role="textbox"],[contenteditable="true"][data-lexical-editor]');
  const flatten = (text) => String(text || "").replace(/\s+/gu, " ").trim();
  const matches = (node, part) => flatten(node.innerText) === flatten(part);
  const wait = async (check, tries = 40) => {
    for (let i = 0; i < tries; i++) {
      const result = check();
      if (result) return result;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    return null;
  };
  const accounts = (dialog) => find(dialog, 'a[href],span').filter((node) =>
    !node.closest('[contenteditable]') && (
      (node.matches("a[href]") && new URL(node.href).origin === location.origin && new URL(node.href).pathname.replace(/\/$/, "").toLowerCase() === "/@" + username) ||
      (!node.children.length && label(node).replace(/^@/, "").toLowerCase() === username)
    ));
  if (dialogs().length) return "failed";
  const open = await wait(() => control(document, /^new thread$/i) || control(document, /^start a thread$/i) || control(document, /^what.s new[?.]?$/i));
  if (!open || dialogs().length) return "failed";
  open.click();
  const composer = await wait(() => only(dialogs()));
  if (!composer || !accounts(composer).length) return "failed";

  for (let index = 0; index < parts.length; index++) {
    if (only(dialogs()) !== composer) return "failed";
    if (index) {
      const add = control(composer, /^add to thread$/i);
      if (!add) return "failed";
      add.click();
    }
    const fields = await wait(() => {
      const current = editors(composer);
      return current.length === index + 1 ? current : null;
    });
    if (!fields || !fields.slice(0, index).every((field, i) => matches(field, parts[i])) || flatten(fields[index].innerText)) return "failed";
    fields[index].focus();
    document.execCommand("insertText", false, parts[index]);
    if (!await wait(() => editors(composer).length === index + 1 && matches(editors(composer)[index], parts[index]), 10)) return "failed";
  }

  const submit = control(composer, /^post$/i);
  const fields = editors(composer);
  if (!submit || only(dialogs()) !== composer || !accounts(composer).length ||
      fields.length !== parts.length || !fields.every((field, i) => matches(field, parts[i]))) return "failed";

  const confirmed = () => find(document, '[role="status"],[role="alert"],[aria-live]').filter((node) =>
    /^(?:posted|thread posted|your thread was posted)[.!]?$/i.test(label(node)));
  const existing = new Set(confirmed());
  // Once clicked, never try again if Chrome cannot confirm the result.
  try {
    submit.click();
    return await wait(() => !composer.isConnected && confirmed().some((notice) => !existing.has(notice)), 60) ? "posted" : "uncertain";
  } catch {
    return "uncertain";
  }
}
