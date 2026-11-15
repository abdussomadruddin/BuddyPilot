async function publishThreadsInChrome(parts, username, photo = null) {
  if (location.origin !== "https://www.threads.com" || !/^[\w.]{1,30}$/.test(username) ||
      !Array.isArray(parts) || !parts.length || parts.length > 25 ||
      parts.some((part) => typeof part !== "string" || !part.trim() || part.length > 500)) return "failed:profile";

  const visible = (node) => node.getClientRects().length && getComputedStyle(node).visibility !== "hidden";
  const find = (root, selector) => [...root.querySelectorAll(selector)].filter(visible);
  const only = (list) => list.length === 1 ? list[0] : null;
  const label = (node) => (node.getAttribute("aria-label") || node.textContent || "").trim();
  const control = (root, pattern) => only(find(root, 'button,[role="button"]').filter((node) =>
    !node.disabled && node.getAttribute("aria-disabled") !== "true" && pattern.test(label(node))));
  const dialogs = () => find(document, '[role="dialog"]');
  const editors = (dialog) => {
    const fields = find(dialog, '[contenteditable="true"]').filter((node) =>
      !node.parentElement?.closest('[contenteditable="true"]') && !node.closest('[aria-hidden="true"]'));
    const preferred = fields.filter((node) => node.matches('[role="textbox"],[data-lexical-editor]'));
    return preferred.length ? preferred : fields;
  };
  const flatten = (text) => String(text || "").replace(/[\u200B\uFEFF]/gu, "").replace(/\s+/gu, " ").trim();
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
  if (dialogs().length) return "failed:composer";
  const open = await wait(() => control(document, /^new thread$/i) || control(document, /^start a thread$/i) || control(document, /^what.s new[?.]?$/i));
  if (!open || dialogs().length) return "failed:composer";
  open.click();
  const composer = await wait(() => only(dialogs()));
  if (!composer) return "failed:composer";
  if (!await wait(() => only(dialogs()) === composer && accounts(composer).length)) return "failed:profile";

  const previews = () => find(composer, "img[src]").filter((node) => /^(blob:|data:image\/)/i.test(node.src));
  const originalPreviews = photo ? new Set(previews().map((node) => node.src)) : null;
  let photoSrc = "";
  const firstPhoto = (first) => {
    if (!first) return "";
    const added = previews().filter((node) => !originalPreviews.has(node.src));
    const preview = only(added);
    if (!preview || !preview.complete || !preview.naturalWidth) return "";
    for (let row = first.parentElement; row && row !== composer; row = row.parentElement) {
      const fields = editors(row);
      if (fields.length !== 1 || fields[0] !== first) break;
      if (row.contains(preview)) return preview.src;
    }
    return "";
  };

  if (photo) {
    const imageLabel = /^(?:(?:add|attach|upload) (?:(?:an? )?(?:image|photo)(?: or video)?|media)|photo\/video|tambah gambar|muat naik gambar)$/i;
    const addImage = await wait(() => {
      if (only(dialogs()) !== composer) return null;
      return only(find(composer, 'button,[role="button"]').filter((node) => {
        if (node.disabled || node.getAttribute("aria-disabled") === "true") return false;
        const labels = [label(node), node.getAttribute("title"), node.querySelector("[aria-label]")?.getAttribute("aria-label")];
        return labels.some((value) => imageLabel.test((value || "").trim()));
      }));
    });
    if (!addImage || !["image/jpeg", "image/png"].includes(photo.type) || !photo.base64 || photo.base64.length > 5592408) return "failed:image";
    // Let Threads prepare its file input, but supply the file without the OS picker.
    const skipFilePicker = (event) => { if (event.target?.matches('input[type="file"]')) event.preventDefault(); };
    document.addEventListener("click", skipFilePicker, true);
    try {
      addImage.click();
      const input = await wait(() => only(dialogs()) === composer && only([...composer.querySelectorAll('input[type="file"]')].filter((node) =>
        !node.disabled && !node.files?.length && /(?:image\/|\.(?:jpg|jpeg|png)\b)/i.test(node.accept))));
      if (!input) return "failed:image";
      const bytes = Uint8Array.from(atob(photo.base64), (char) => char.charCodeAt(0));
      const data = new DataTransfer();
      data.items.add(new File([bytes], photo.type === "image/png" ? "buddypilot.png" : "buddypilot.jpg", { type: photo.type }));
      input.files = data.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    } catch { return "failed:image"; }
    finally { document.removeEventListener("click", skipFilePicker, true); }
    photoSrc = await wait(() => only(dialogs()) === composer && firstPhoto(editors(composer)[0]));
    if (!photoSrc) return "failed:image";
  }

  for (let index = 0; index < parts.length; index++) {
    if (only(dialogs()) !== composer) return "failed:composer";
    if (index) {
      const add = await wait(() => only(dialogs()) === composer && control(composer, /^(add to thread|tambah ke thread)$/i), 15);
      if (!add) return "failed:thread_part";
      add.click();
    }
    const fields = await wait(() => {
      const current = editors(composer);
      return current.length === index + 1 ? current : null;
    });
    if (!fields) return index ? "failed:thread_part" : "failed:composer";
    if (!fields.slice(0, index).every((field, i) => matches(field, parts[i])) || flatten(fields[index].innerText)) return "failed:text";
    fields[index].focus();
    document.execCommand("insertText", false, parts[index]);
    const textReady = () => {
      const current = editors(composer);
      return only(dialogs()) === composer && current.length === index + 1 && matches(current[index], parts[index]);
    };
    if (!await wait(textReady, 6)) {
      const current = editors(composer);
      if (only(dialogs()) !== composer || current.length !== index + 1 || flatten(current[index].innerText) ||
          !current.slice(0, index).every((field, i) => matches(field, parts[i]))) return "failed:text";
      try {
        const clipboardData = new DataTransfer();
        clipboardData.setData("text/plain", parts[index]);
        current[index].focus();
        current[index].dispatchEvent(new ClipboardEvent("paste", { clipboardData, bubbles: true, cancelable: true }));
      } catch { return "failed:text"; }
      if (!await wait(textReady, 8)) return "failed:text";
    }
  }

  const submit = await wait(() => only(dialogs()) === composer && control(composer, /^(post|siarkan)$/i), 15);
  const fields = editors(composer);
  if (!submit || only(dialogs()) !== composer) return "failed:post_button";
  if (!accounts(composer).length) return "failed:profile";
  if (fields.length !== parts.length || !fields.every((field, i) => matches(field, parts[i]))) return "failed:text";
  if (photo && firstPhoto(fields[0]) !== photoSrc) return "failed:image";

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
