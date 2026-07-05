const { requireAuth } = require("../lib/auth");

function pageHtml() {
  return `<!doctype html>
<html lang="ms">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>PostPilot</title>
  <link rel="icon" href="/favicon.ico" sizes="any">
  <link rel="icon" href="/logo.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
  <link rel="manifest" href="/site.webmanifest">
  <meta name="theme-color" content="#0f172a">
  <style>
    :root {
      color-scheme: light;
      font-family: Arial, sans-serif;
      background: #f4f5f7;
      color: #111827;
    }

    body { margin: 0; }

    main {
      width: min(880px, calc(100% - 32px));
      margin: 40px auto;
    }

    .topbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      margin-bottom: 16px;
    }

    .brand {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      font-weight: 800;
    }

    .brand img {
      width: 34px;
      height: 34px;
      border-radius: 10px;
    }

    .card {
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 18px;
      box-shadow: 0 14px 35px rgba(15, 23, 42, 0.08);
      padding: 26px;
    }

    .hero {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .hero img {
      width: 64px;
      height: 64px;
      border-radius: 18px;
      box-shadow: 0 12px 30px rgba(15, 23, 42, 0.16);
    }

    h1 {
      margin: 0 0 8px;
      font-size: clamp(28px, 5vw, 42px);
      letter-spacing: -0.04em;
    }

    p {
      line-height: 1.55;
      color: #4b5563;
    }

    label {
      display: block;
      margin: 18px 0 8px;
      font-weight: 700;
    }

    input,
    textarea {
      width: 100%;
      box-sizing: border-box;
      border: 1px solid #cbd5e1;
      border-radius: 12px;
      padding: 13px 14px;
      font: inherit;
      background: #fff;
    }

    textarea {
      min-height: 110px;
      resize: vertical;
    }

    button {
      margin-top: 20px;
      border: 0;
      border-radius: 999px;
      padding: 14px 22px;
      background: #111827;
      color: #fff;
      font-weight: 800;
      cursor: pointer;
    }

    button.secondary {
      margin-top: 0;
      background: #e5e7eb;
      color: #111827;
    }

    button.approve {
      background: #15803d;
    }

    button.regenerate {
      background: #2563eb;
    }

    button:disabled {
      opacity: 0.65;
      cursor: wait;
    }

    .note { font-size: 14px; }

    .result {
      margin-top: 18px;
      border-radius: 14px;
      padding: 14px;
      white-space: pre-wrap;
      display: none;
    }

    .result.ok {
      display: block;
      background: #ecfdf5;
      border: 1px solid #86efac;
      color: #14532d;
    }

    .result.err {
      display: block;
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #7f1d1d;
    }

    .preview {
      display: none;
      margin-top: 22px;
      border-top: 1px solid #e5e7eb;
      padding-top: 22px;
    }

    .preview.show {
      display: block;
    }

    .preview-box {
      background: #f8fafc;
      border: 1px solid #dbe3ef;
      border-radius: 14px;
      padding: 14px;
      white-space: pre-wrap;
      line-height: 1.5;
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 16px;
    }

    .actions button {
      margin-top: 0;
    }
  </style>
</head>
<body>
  <main>
    <div class="topbar">
      <div class="brand">
        <img src="/logo.svg" alt="" width="34" height="34">
        <span>PostPilot</span>
      </div>
      <form method="post" action="/api/logout">
        <button class="secondary" type="submit">Logout</button>
      </form>
    </div>

    <section class="card">
      <div class="hero">
        <img src="/logo.svg" alt="" width="64" height="64">
        <h1>PostPilot</h1>
      </div>
      <p>Upload creative, masukkan salespage link, preview copywriting dahulu, kemudian approve untuk publish ke Facebook Page.</p>
      <p class="note">Copywriting akan ikut salespage yang kau beri, dengan aliran direct-response yang natural. Nota creative digunakan untuk angle poster/video.</p>

      <form id="postForm">
        <label for="creative">Creative gambar/video</label>
        <input id="creative" name="creative" type="file" accept="image/*,video/mp4,video/quicktime,video/webm" required>

        <label for="salespage_link">Salespage link</label>
        <input id="salespage_link" name="salespage_link" type="url" value="https://digitaldominate.com/" required>

        <label for="caption_note">Konteks poster/video / angle creative (optional)</label>
        <textarea id="caption_note" name="caption_note" placeholder="Contoh: Poster tunjuk founder penat packing order, angle: banyak kerja tapi salespage bantu automate workflow."></textarea>

        <label for="custom_caption">Custom caption penuh (optional)</label>
        <textarea id="custom_caption" name="custom_caption" placeholder="Kalau isi bahagian ini, sistem guna caption ini terus. Pastikan letak salespage link."></textarea>

        <label for="first_comment">First comment CTA (optional)</label>
        <textarea id="first_comment" name="first_comment" placeholder="Kosongkan untuk auto-generate first comment."></textarea>

        <button type="submit">Preview Copywriting</button>
      </form>

      <section id="previewPanel" class="preview">
        <h2>Preview Sebelum Posting</h2>
        <p class="note" id="previewMeta"></p>

        <label for="captionPreview">Caption yang akan dipost</label>
        <textarea id="captionPreview"></textarea>

        <label for="commentPreview">Komen CTA yang akan dijadikan first comment</label>
        <textarea id="commentPreview"></textarea>

        <div class="actions">
          <button class="approve" id="approveButton" type="button">Approve & Post ke Facebook</button>
          <button class="regenerate" id="regenerateButton" type="button">Jana Semula Copywriting</button>
        </div>
      </section>

      <div id="result" class="result"></div>
    </section>
  </main>

  <script>
    const form = document.getElementById("postForm");
    const result = document.getElementById("result");
    const button = form.querySelector("button");
    const previewPanel = document.getElementById("previewPanel");
    const previewMeta = document.getElementById("previewMeta");
    const captionPreview = document.getElementById("captionPreview");
    const commentPreview = document.getElementById("commentPreview");
    const approveButton = document.getElementById("approveButton");
    const regenerateButton = document.getElementById("regenerateButton");
    const MAX_DIRECT_UPLOAD_BYTES = 4 * 1024 * 1024;
    let currentPreview = null;
    let seenVariations = [];

    function showError(error) {
      result.className = "result err";
      result.textContent = error.message || String(error);
    }

    function uploadLimitMessage(file) {
      const sizeMb = (file.size / 1024 / 1024).toFixed(1);
      return \`File ini \${sizeMb}MB. Vercel Serverless Function ada request body limit sekitar 4.5MB, jadi video besar tidak boleh dihantar terus melalui route ini. Preview copywriting boleh dibuat, tapi untuk approve/post video besar perlu compress bawah 4MB atau gunakan flow chunked/direct storage.\`;
    }

    async function readApiJson(response) {
      const text = await response.text();
      try {
        return JSON.parse(text);
      } catch {
        const cleanText = text.trim() || response.statusText || "Unknown server response";
        throw new Error(\`Server balas bukan JSON: \${cleanText.slice(0, 220)}\`);
      }
    }

    function showPreview(json) {
      currentPreview = json.preview;
      seenVariations = [Number(currentPreview.variation || 0)];
      captionPreview.value = currentPreview.caption || "";
      commentPreview.value = currentPreview.comment_cta || "";
      previewMeta.textContent = [
        \`Salespage context: \${currentPreview.salespage_context?.product_name || "-"}\`,
        \`Concept: \${Number(currentPreview.variation || 0) + 1}/3000\`,
        \`Style: \${currentPreview.style || "-"}\`
      ].join(" | ");
      previewPanel.className = "preview show";
      result.className = "result ok";
      result.textContent = "Preview siap. Semak caption dan komen CTA. Klik Approve untuk post, atau Jana Semula untuk variasi baru.";
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      result.className = "result";
      result.textContent = "";
      previewPanel.className = "preview";
      button.disabled = true;
      button.textContent = "Generating preview...";

      try {
        const file = document.getElementById("creative").files[0];
        let response;
        if (file && file.size > MAX_DIRECT_UPLOAD_BYTES) {
          response = await fetch("/api/preview-metadata", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              filename: file.name,
              content_type: file.type,
              salespage_link: document.getElementById("salespage_link").value,
              caption_note: document.getElementById("caption_note").value,
              custom_caption: document.getElementById("custom_caption").value,
              first_comment: document.getElementById("first_comment").value
            })
          });
        } else {
          response = await fetch("/api/preview", {
            method: "POST",
            body: new FormData(form)
          });
        }
        const json = await readApiJson(response);
        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }
        if (!response.ok || !json.ok) {
          throw new Error(json.error || "Post failed.");
        }

        showPreview(json);
        if (file && file.size > MAX_DIRECT_UPLOAD_BYTES) {
          result.className = "result err";
          result.textContent = \`Preview siap, tapi file terlalu besar untuk direct approve/post dari Vercel.\\n\\n\${uploadLimitMessage(file)}\`;
        }
      } catch (error) {
        showError(error);
      } finally {
        button.disabled = false;
        button.textContent = "Preview Copywriting";
      }
    });

    regenerateButton.addEventListener("click", async () => {
      if (!currentPreview) return;
      result.className = "result";
      result.textContent = "";
      regenerateButton.disabled = true;
      regenerateButton.textContent = "Generating...";

      try {
        const response = await fetch("/api/regenerate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            salespage_link: currentPreview.salespage_link,
            creative_angle: currentPreview.creative_angle,
            media_type: currentPreview.media_type,
            salespage_context: currentPreview.salespage_context?.raw,
            variation: currentPreview.variation,
            seen_variations: seenVariations
          })
        });
        const json = await readApiJson(response);
        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }
        if (!response.ok || !json.ok) throw new Error(json.error || "Regenerate failed.");

        currentPreview = {
          ...currentPreview,
          caption: json.preview.caption,
          comment_cta: json.preview.comment_cta,
          salespage_context: json.preview.salespage_context,
          variation: json.preview.variation,
          style: json.preview.style
        };
        seenVariations.push(Number(currentPreview.variation || 0));
        captionPreview.value = currentPreview.caption || "";
        commentPreview.value = currentPreview.comment_cta || "";
        previewMeta.textContent = [
          \`Salespage context: \${currentPreview.salespage_context?.product_name || "-"}\`,
          \`Concept: \${Number(currentPreview.variation || 0) + 1}/3000\`,
          \`Style: \${currentPreview.style || "-"}\`
        ].join(" | ");
        result.className = "result ok";
        result.textContent = "Copywriting baru sudah dijana. Semak semula sebelum approve.";
      } catch (error) {
        showError(error);
      } finally {
        regenerateButton.disabled = false;
        regenerateButton.textContent = "Jana Semula Copywriting";
      }
    });

    approveButton.addEventListener("click", async () => {
      if (!currentPreview) return;
      const file = document.getElementById("creative").files[0];
      if (!file) {
        showError(new Error("Creative file tiada. Sila pilih semula file dan preview semula."));
        return;
      }
      if (file.size > MAX_DIRECT_UPLOAD_BYTES) {
        showError(new Error(uploadLimitMessage(file)));
        return;
      }

      const payload = new FormData();
      payload.append("creative", file);
      payload.append("caption", captionPreview.value);
      payload.append("first_comment", commentPreview.value);

      result.className = "result";
      result.textContent = "";
      approveButton.disabled = true;
      regenerateButton.disabled = true;
      approveButton.textContent = "Posting...";

      try {
        const response = await fetch("/api/post", {
          method: "POST",
          body: payload
        });
        const json = await readApiJson(response);
        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }
        if (!response.ok || !json.ok) throw new Error(json.error || "Post failed.");

        result.className = "result ok";
        result.textContent = [
          "Posted ke Facebook.",
          \`Post ID: \${json.post_id || "-"}\`,
          \`Link: \${json.permalink_url || "-"}\`,
          \`Comment ID: \${json.comment_id || "-"}\`
        ].join("\\n");
        form.reset();
        document.getElementById("salespage_link").value = "https://digitaldominate.com/";
        previewPanel.className = "preview";
        currentPreview = null;
        seenVariations = [];
      } catch (error) {
        showError(error);
      } finally {
        approveButton.disabled = false;
        regenerateButton.disabled = false;
        approveButton.textContent = "Approve & Post ke Facebook";
      }
    });
  </script>
</body>
</html>`;
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.end("Method not allowed.");
    return;
  }

  try {
    requireAuth(req);
    res.setHeader("content-type", "text/html; charset=utf-8");
    res.statusCode = 200;
    res.end(pageHtml());
  } catch (error) {
    if (error.statusCode === 500) {
      res.statusCode = 500;
      res.end(error.message);
      return;
    }

    res.statusCode = 302;
    res.setHeader("location", "/login");
    res.end("Redirecting to login.");
  }
};
