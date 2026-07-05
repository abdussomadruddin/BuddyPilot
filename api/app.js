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
    const creativeInput = document.getElementById("creative");
    const MAX_DIRECT_UPLOAD_BYTES = 4 * 1024 * 1024;
    const TARGET_UPLOAD_BYTES = Math.floor(3.75 * 1024 * 1024);
    let currentPreview = null;
    let seenVariations = [];
    let preparedCreativeFile = null;
    let preparedCreativeNotice = "";

    creativeInput.addEventListener("change", () => {
      currentPreview = null;
      seenVariations = [];
      preparedCreativeFile = null;
      preparedCreativeNotice = "";
      previewPanel.className = "preview";
      result.className = "result";
      result.textContent = "";
    });

    function showError(error) {
      result.className = "result err";
      result.textContent = error.message || String(error);
    }

    function formatMb(bytes) {
      return (bytes / 1024 / 1024).toFixed(1);
    }

    function fileFromBlob(blob, filename) {
      return new File([blob], filename, { type: blob.type || "application/octet-stream", lastModified: Date.now() });
    }

    function uploadLimitMessage(file) {
      return \`File ini \${formatMb(file.size)}MB. Auto-compress tidak berjaya turunkan file bawah 4MB. Vercel Serverless Function ada request body limit sekitar 4.5MB, jadi file besar tidak boleh dihantar terus melalui route ini. Cuba video lebih pendek/resolution lebih rendah, atau guna flow chunked/direct storage.\`;
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

    function canvasToBlob(canvas, type, quality) {
      return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Gagal compress image."));
        }, type, quality);
      });
    }

    async function imageBitmapFromFile(file) {
      if ("createImageBitmap" in window) return createImageBitmap(file);

      return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const image = new Image();
        image.onload = () => {
          URL.revokeObjectURL(url);
          resolve(image);
        };
        image.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error("Gagal baca image untuk compression."));
        };
        image.src = url;
      });
    }

    async function compressImageFile(file) {
      const image = await imageBitmapFromFile(file);
      const originalWidth = image.width;
      const originalHeight = image.height;
      const maxDims = [1800, 1440, 1200, 1080, 900, 720, 540];
      const qualities = [0.86, 0.78, 0.7, 0.62, 0.54, 0.46, 0.38];

      for (const maxDim of maxDims) {
        const scale = Math.min(1, maxDim / Math.max(originalWidth, originalHeight));
        const width = Math.max(1, Math.round(originalWidth * scale));
        const height = Math.max(1, Math.round(originalHeight * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(image, 0, 0, width, height);

        for (const quality of qualities) {
          const blob = await canvasToBlob(canvas, "image/jpeg", quality);
          if (blob.size <= TARGET_UPLOAD_BYTES) {
            const name = file.name.replace(/\.[^.]+$/, "") + "-compressed.jpg";
            return fileFromBlob(blob, name);
          }
        }
      }

      throw new Error("Image terlalu besar untuk dicompress bawah 4MB.");
    }

    function getVideoMetadata(file) {
      return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const video = document.createElement("video");
        video.preload = "metadata";
        video.muted = true;
        video.playsInline = true;
        video.onloadedmetadata = () => {
          const metadata = {
            duration: Math.max(1, video.duration || 1),
            width: video.videoWidth || 720,
            height: video.videoHeight || 1280,
          };
          URL.revokeObjectURL(url);
          resolve(metadata);
        };
        video.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error("Gagal baca video untuk compression."));
        };
        video.src = url;
      });
    }

    function recorderMimeType() {
      const candidates = [
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm",
        "video/mp4",
      ];
      return candidates.find((type) => window.MediaRecorder && MediaRecorder.isTypeSupported(type)) || "";
    }

    async function compressVideoPass(file, maxWidth, videoBitsPerSecond) {
      if (!window.MediaRecorder) throw new Error("Browser ini tidak support video compression.");
      const mimeType = recorderMimeType();
      if (!mimeType) throw new Error("Browser ini tidak support output video WebM/MP4 compression.");

      const url = URL.createObjectURL(file);
      const video = document.createElement("video");
      video.src = url;
      video.muted = true;
      video.playsInline = true;
      video.preload = "auto";
      await new Promise((resolve, reject) => {
        video.onloadedmetadata = resolve;
        video.onerror = () => reject(new Error("Gagal load video untuk compression."));
      });

      const scale = Math.min(1, maxWidth / Math.max(video.videoWidth || maxWidth, video.videoHeight || maxWidth));
      const width = Math.max(2, Math.round((video.videoWidth || maxWidth) * scale / 2) * 2);
      const height = Math.max(2, Math.round((video.videoHeight || maxWidth) * scale / 2) * 2);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      const stream = canvas.captureStream(24);
      const chunks = [];
      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond });

      let drawTimer = null;
      const drawFrame = () => {
        if (!video.paused && !video.ended) {
          ctx.drawImage(video, 0, 0, width, height);
          drawTimer = requestAnimationFrame(drawFrame);
        }
      };

      const done = new Promise((resolve, reject) => {
        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size) chunks.push(event.data);
        };
        recorder.onerror = () => reject(new Error("Gagal record compressed video."));
        recorder.onstop = () => {
          if (drawTimer) cancelAnimationFrame(drawTimer);
          stream.getTracks().forEach((track) => track.stop());
          URL.revokeObjectURL(url);
          resolve(new Blob(chunks, { type: mimeType.split(";")[0] || "video/webm" }));
        };
      });

      recorder.start(1000);
      video.currentTime = 0;
      await video.play();
      drawFrame();
      await new Promise((resolve) => {
        video.onended = resolve;
      });
      if (recorder.state !== "inactive") recorder.stop();
      return done;
    }

    async function compressVideoFile(file) {
      const metadata = await getVideoMetadata(file);
      const baseBitrate = Math.max(140000, Math.floor((TARGET_UPLOAD_BYTES * 8 * 0.78) / metadata.duration));
      const attempts = [
        { maxWidth: 720, bitrate: Math.min(baseBitrate, 1200000) },
        { maxWidth: 540, bitrate: Math.min(Math.floor(baseBitrate * 0.72), 800000) },
        { maxWidth: 360, bitrate: Math.min(Math.floor(baseBitrate * 0.48), 420000) },
      ];

      for (const attempt of attempts) {
        const blob = await compressVideoPass(file, attempt.maxWidth, attempt.bitrate);
        if (blob.size <= TARGET_UPLOAD_BYTES) {
          const extension = blob.type.includes("mp4") ? "mp4" : "webm";
          const name = file.name.replace(/\.[^.]+$/, "") + \`-compressed.\${extension}\`;
          return fileFromBlob(blob, name);
        }
      }

      throw new Error("Video terlalu besar/panjang untuk dicompress bawah 4MB dalam browser.");
    }

    async function prepareCreativeFile(file) {
      preparedCreativeFile = null;
      preparedCreativeNotice = "";
      if (!file || file.size <= MAX_DIRECT_UPLOAD_BYTES) {
        preparedCreativeFile = file;
        return file;
      }

      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      if (!isImage && !isVideo) throw new Error("Format tidak disokong untuk auto-compress.");

      const compressed = isImage
        ? await compressImageFile(file)
        : await compressVideoFile(file);

      if (compressed.size > MAX_DIRECT_UPLOAD_BYTES) throw new Error(uploadLimitMessage(compressed));

      preparedCreativeFile = compressed;
      preparedCreativeNotice = \`Auto-compress siap: \${formatMb(file.size)}MB -> \${formatMb(compressed.size)}MB (\${compressed.name}).\`;
      return compressed;
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
        const file = creativeInput.files[0];
        let uploadFile = file;
        if (file && file.size > MAX_DIRECT_UPLOAD_BYTES) {
          button.textContent = "Compressing creative...";
          try {
            uploadFile = await prepareCreativeFile(file);
          } catch (compressionError) {
            preparedCreativeFile = null;
            preparedCreativeNotice = compressionError.message || String(compressionError);
          }
        } else {
          preparedCreativeFile = file || null;
          preparedCreativeNotice = "";
        }

        let response;
        if (uploadFile && uploadFile.size > MAX_DIRECT_UPLOAD_BYTES) {
          response = await fetch("/api/preview-metadata", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              filename: uploadFile.name,
              content_type: uploadFile.type,
              salespage_link: document.getElementById("salespage_link").value,
              caption_note: document.getElementById("caption_note").value,
              custom_caption: document.getElementById("custom_caption").value,
              first_comment: document.getElementById("first_comment").value
            })
          });
        } else {
          const previewForm = new FormData(form);
          if (uploadFile) previewForm.set("creative", uploadFile);
          response = await fetch("/api/preview", {
            method: "POST",
            body: previewForm
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
        if (preparedCreativeNotice && preparedCreativeFile) {
          result.className = "result ok";
          result.textContent = \`Preview siap. \${preparedCreativeNotice}\\n\\nSemak caption dan komen CTA. Klik Approve untuk post.\`;
        } else if (uploadFile && uploadFile.size > MAX_DIRECT_UPLOAD_BYTES) {
          result.className = "result err";
          result.textContent = \`Preview siap, tapi file terlalu besar untuk direct approve/post dari Vercel.\\n\\n\${uploadLimitMessage(uploadFile)}\`;
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
      const file = creativeInput.files[0];
      if (!file) {
        showError(new Error("Creative file tiada. Sila pilih semula file dan preview semula."));
        return;
      }
      const uploadFile = preparedCreativeFile || file;
      if (uploadFile.size > MAX_DIRECT_UPLOAD_BYTES) {
        showError(new Error(uploadLimitMessage(uploadFile)));
        return;
      }

      const payload = new FormData();
      payload.append("creative", uploadFile);
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
          \`Media ID: \${json.media_id || "-"}\`,
          \`Post Link: \${json.permalink_url || "-"}\`,
          json.media_permalink_url ? \`Media/Reel Link: \${json.media_permalink_url}\` : "",
          \`Comment ID: \${json.comment_id || "-"}\`,
          json.processing_note ? \`Nota: \${json.processing_note}\` : ""
        ].filter(Boolean).join("\\n");
        form.reset();
        document.getElementById("salespage_link").value = "https://digitaldominate.com/";
        previewPanel.className = "preview";
        currentPreview = null;
        seenVariations = [];
        preparedCreativeFile = null;
        preparedCreativeNotice = "";
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
