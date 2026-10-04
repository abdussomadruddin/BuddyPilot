module.exports = function render() {
  return `    function threadsPayloadFromForm() {
      return {
        product_id: activePostPilotProductId,
        active_product_id: activePostPilotProductId,
        product_name: document.getElementById("threadsProductName").value,
        affiliate_link: document.getElementById("threadsAffiliateLink").value,
        post_mode: document.getElementById("threadsPostMode").value
      };
    }

    function updatePostPilotHookImageStatus() {
      if (!threadsHookImageStatus) return;
      const selected = threadsHookImage.files?.[0];
      const previewSrc = selected
        ? currentThreadsImagePreviewUrl
        : savedThreadsImage?.dataUrl || savedThreadsImage?.url || "";
      if (threadsHookImagePreview) {
        if (previewSrc) {
          threadsHookImagePreview.src = previewSrc;
          threadsHookImagePreview.hidden = false;
        } else {
          threadsHookImagePreview.removeAttribute("src");
          threadsHookImagePreview.hidden = true;
        }
      }
      if (selected) {
        threadsHookImageStatus.textContent = \`Dipilih sekarang: \${selected.name}\`;
        return;
      }
      if (savedThreadsImage?.name) {
        const source = savedThreadsImage.url ? "Supabase" : "browser";
        threadsHookImageStatus.textContent = \`Gambar terakhir tersimpan: \${savedThreadsImage.name} (\${source}). Akan digunakan semula selepas refresh.\`;
        return;
      }
      threadsHookImageStatus.textContent = "Belum ada gambar hook tersimpan.";
    }

    function setPostPilotSavedImage(image) {
      savedThreadsImage = image && (image.dataUrl || image.url) ? image : null;
      try {
        if (savedThreadsImage) {
          localStorage.setItem(POSTPILOT_IMAGE_STORAGE_KEY, JSON.stringify(savedThreadsImage));
        } else {
          localStorage.removeItem(POSTPILOT_IMAGE_STORAGE_KEY);
        }
      } catch {
        // If localStorage quota is full, keep the image in memory for the current send.
      }
      updatePostPilotHookImageStatus();
    }

    function restorePostPilotInputs() {
      try {
        const saved = JSON.parse(localStorage.getItem(POSTPILOT_INPUT_STORAGE_KEY) || "{}");
        const fields = {
          product_name: "threadsProductName",
          affiliate_link: "threadsAffiliateLink"
        };
        Object.entries(fields).forEach(([key, id]) => {
          const node = document.getElementById(id);
          if (node && typeof saved[key] === "string") node.value = saved[key];
        });
      } catch {
        localStorage.removeItem(POSTPILOT_INPUT_STORAGE_KEY);
      }

      const postMode = document.getElementById("threadsPostMode");
      if (postMode) postMode.value = "auto";

      try {
        const image = JSON.parse(localStorage.getItem(POSTPILOT_IMAGE_STORAGE_KEY) || "null");
        savedThreadsImage = image?.dataUrl || image?.url ? image : null;
      } catch {
        localStorage.removeItem(POSTPILOT_IMAGE_STORAGE_KEY);
        savedThreadsImage = null;
      }
      updatePostPilotHookImageStatus();
    }

    function applyPostPilotDraft(draft) {
      if (!draft) return;
      const values = {
        product_name: draft.productName,
        affiliate_link: draft.affiliateLink
      };
      const fields = {
        product_name: "threadsProductName",
        affiliate_link: "threadsAffiliateLink"
      };
      Object.entries(fields).forEach(([key, id]) => {
        const node = document.getElementById(id);
        if (node && typeof values[key] === "string") node.value = values[key];
      });
      const postMode = document.getElementById("threadsPostMode");
      if (postMode) postMode.value = "auto";
      if (draft.activeProductId && postPilotProducts.some((product) => product.id === draft.activeProductId)) {
        activePostPilotProductId = draft.activeProductId;
        threadsProductSelect.value = draft.activeProductId;
        const product = postPilotProducts.find((item) => item.id === draft.activeProductId);
        document.getElementById("threadsProductName").value = product.name;
        document.getElementById("threadsAffiliateLink").value = product.affiliateLink;
      }
      savePostPilotInputs();
      if (draft.hasHookImage) {
        const localDataUrl = savedThreadsImage?.savedAt === draft.hookImageUpdatedAt
          ? savedThreadsImage.dataUrl || ""
          : "";
        setPostPilotSavedImage({
          name: draft.hookImageName || "post-hook.jpg",
          type: draft.hookImageMime || "image/jpeg",
          url: \`/api/personal-post-hook-image?t=\${encodeURIComponent(draft.hookImageUpdatedAt || Date.now())}\`,
          dataUrl: localDataUrl,
          savedAt: draft.hookImageUpdatedAt || "",
        });
      }
    }

    async function loadPostPilotDraftFromSupabase() {
      try {
        const response = await fetch("/api/personal-post-draft");
        const json = await readApiJson(response);
        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }
        if (!response.ok || !json.ok) throw new Error(json.error || "Load Post Pilot draft failed.");
        applyPostPilotDraft(json.draft);
      } catch {
        // Local storage remains the fallback when Supabase is not configured yet.
      }
    }

    function savePostPilotInputs() {
      try {
        localStorage.setItem(POSTPILOT_INPUT_STORAGE_KEY, JSON.stringify(threadsPayloadFromForm()));
      } catch {
        // Ignore private browsing/quota issues; the current form still works.
      }
    }

    async function savePostPilotInputsToSupabase() {
      const response = await fetch("/api/personal-post-draft", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(threadsPayloadFromForm())
      });
      const json = await readApiJson(response);
      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!response.ok || !json.ok) throw new Error(json.error || "Save Post Pilot draft failed.");
      applyPostPilotDraft(json.draft);
    }

    function schedulePostPilotSave() {
      savePostPilotInputs();
      window.clearTimeout(postPilotSaveTimer);
      postPilotSaveTimer = window.setTimeout(() => {
        savePostPilotInputsToSupabase().catch(() => {});
      }, 650);
    }

    function renderPostPilotProducts() {
      threadsProductSelect.innerHTML = "";
      postPilotProducts.forEach((product) => {
        const option = document.createElement("option");
        option.value = product.id;
        option.textContent = product.name;
        threadsProductSelect.appendChild(option);
      });
      deleteProductButton.disabled = postPilotProducts.length <= 1;
      deleteProductButton.title = postPilotProducts.length <= 1
        ? "Tambah produk lain sebelum delete produk ini"
        : "Delete produk aktif dan semua gambar miliknya";
    }

    async function loadPostPilotProducts() {
      const response = await fetch("/api/personal-post-products");
      const json = await readApiJson(response);
      if (!response.ok || !json.ok) throw new Error(json.error || "Gagal load produk Post Pilot.");
      postPilotProducts = Array.isArray(json.products) ? json.products : [];
      renderPostPilotProducts();
    }

    async function loadPostPilotVoiceProfile() {
      if (!activePostPilotProductId) return;
      const response = await fetch(\`/api/postpilot-voice-profile?channel=promote&product_id=\${encodeURIComponent(activePostPilotProductId)}\`);
      const json = await readApiJson(response);
      if (!response.ok || !json.ok) throw new Error(json.error || "Gagal load Voice Lock.");
      const profile = json.profile || {};
      postPilotVoiceSlang.value = profile.slang || "moderate";
      postPilotVoiceEnglish.value = profile.englishMix || "light";
      postPilotVoicePreferred.value = (profile.preferredPhrases || []).join(", ");
      postPilotVoiceBanned.value = (profile.bannedPhrases || []).join(", ");
    }

    async function savePostPilotVoiceProfile() {
      if (!activePostPilotProductId) throw new Error("Pilih produk dahulu.");
      const response = await fetch(\`/api/postpilot-voice-profile?channel=promote&product_id=\${encodeURIComponent(activePostPilotProductId)}\`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          profile: {
            pronouns: "aku_kau",
            slang: postPilotVoiceSlang.value,
            englishMix: postPilotVoiceEnglish.value,
            emoji: false,
            preferredPhrases: postPilotVoicePreferred.value.split(",").map((value) => value.trim()).filter(Boolean),
            bannedPhrases: postPilotVoiceBanned.value.split(",").map((value) => value.trim()).filter(Boolean)
          }
        })
      });
      const json = await readApiJson(response);
      if (!response.ok || !json.ok) throw new Error(json.error || "Gagal save Voice Lock.");
      setMessage(threadsResult, "ok", "Voice Lock produk sudah disimpan.");
    }

    async function activatePostPilotProduct(productId, { persist = true } = {}) {
      const product = postPilotProducts.find((item) => item.id === productId);
      if (!product) return;
      activePostPilotProductId = product.id;
      threadsProductSelect.value = product.id;
      document.getElementById("threadsProductName").value = product.name;
      document.getElementById("threadsAffiliateLink").value = product.affiliateLink;
      postPilotGalleryImages = [];
      savedThreadsImage = null;
      threadsPreviewPanel.hidden = true;
      threadsPostPreview.value = "";
      renderPostPilotGallery();
      if (persist) await savePostPilotInputsToSupabase();
      await Promise.all([loadPostPilotGallery(), loadPostPilotVoiceProfile()]);
    }

    async function createPostPilotProductFromForm() {
      const response = await fetch("/api/personal-post-products", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: newProductName.value, affiliate_link: newProductLink.value }),
      });
      const json = await readApiJson(response);
      if (!response.ok || !json.ok) throw new Error(json.error || "Gagal tambah produk.");
      postPilotProducts.push(json.product);
      renderPostPilotProducts();
      addProductPanel.hidden = true;
      newProductName.value = "";
      newProductLink.value = "";
      await activatePostPilotProduct(json.product.id, { persist: false });
      setMessage(threadsResult, "ok", \`Produk \${json.product.name} ditambah dan diaktifkan.\`);
    }

    async function deleteActivePostPilotProduct() {
      const product = postPilotProducts.find((item) => item.id === activePostPilotProductId);
      if (!product) throw new Error("Pilih produk yang hendak dipadam.");
      if (postPilotProducts.length <= 1) throw new Error("Produk terakhir tidak boleh dipadam. Tambah produk lain dahulu.");
      if (!window.confirm(\`Delete produk \${product.name} dan semua gambar yang disimpan untuk produk ini?\`)) return;

      deleteProductButton.disabled = true;
      try {
        const response = await fetch("/api/personal-post-products", {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ product_id: product.id }),
        });
        const json = await readApiJson(response);
        if (!response.ok || !json.ok) throw new Error(json.error || "Gagal delete produk.");
        postPilotProducts = Array.isArray(json.products) ? json.products : [];
        renderPostPilotProducts();
        await activatePostPilotProduct(json.active_product.id, { persist: false });
        setMessage(threadsResult, "ok", \`Produk \${product.name} dan \${json.deleted_image_count || 0} gambar sudah dipadam.\`);
      } finally {
        deleteProductButton.disabled = postPilotProducts.length <= 1;
      }
    }

    async function setupPostPilotInputStorage() {
      restorePostPilotInputs();
      threadsForm.querySelectorAll("input:not([type='file']), textarea, select").forEach((node) => {
        node.addEventListener("input", schedulePostPilotSave);
        node.addEventListener("change", schedulePostPilotSave);
      });
      try {
        await loadPostPilotProducts();
        await loadPostPilotDraftFromSupabase();
        const initialId = activePostPilotProductId || postPilotProducts[0]?.id || "";
        if (initialId) await activatePostPilotProduct(initialId, { persist: false });
      } catch (error) {
        showThreadsError(error);
      }
    }

    function blobToDataUrl(blob) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("Gagal simpan gambar hook."));
        reader.readAsDataURL(blob);
      });
    }

    function normalizePostPilotMainTextForSend(value, link) {
      const safeLink = String(link || "https://swiy.co/kmethod").trim() || "https://swiy.co/kmethod";
      const lines = String(value || "")
        .replace(/https?:\\/\\/\\S+/gi, "")
        .split(/\\n{2,}|\\r?\\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .filter((line) => !/^klik\\s+sini\\b/i.test(line));
      const selected = [];
      let total = 0;
      for (const line of lines) {
        const nextTotal = total + line.length + (selected.length ? 2 : 0);
        if (nextTotal > 3700) break;
        selected.push(line);
        total = nextTotal;
      }
      return [
        ...selected,
        \`baca salespage penuh dekat sini,\\n\${safeLink}\`,
        "kalau rasa posting ni bermanfaat,\\nshare posting ni."
      ].join("\\n\\n").trim();
    }

    async function compressImageForPostPilotStorage(file) {
      if (!file || !file.type.startsWith("image/")) throw new Error("Gambar hook mesti image.");
      if (file.size <= POSTPILOT_SAVED_IMAGE_MAX_BYTES) return file;

      const image = await imageBitmapFromFile(file);
      const maxDims = [1200, 960, 720, 540];
      const qualities = [0.82, 0.74, 0.66, 0.58, 0.5, 0.42];

      for (const maxDim of maxDims) {
        const scale = Math.min(1, maxDim / Math.max(image.width, image.height));
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(image, 0, 0, width, height);

        for (const quality of qualities) {
          const blob = await canvasToBlob(canvas, "image/jpeg", quality);
          if (blob.size <= POSTPILOT_SAVED_IMAGE_MAX_BYTES) {
            return fileFromBlob(blob, file.name.replace(/\.[^.]+$/, "") + "-saved.jpg");
          }
        }
      }

      throw new Error("Gambar hook terlalu besar untuk disimpan. Pilih gambar lebih kecil.");
    }

    async function savePostPilotImageInput(file) {
      const storedFile = await compressImageForPostPilotStorage(file);
      const localImage = {
        name: storedFile.name || file.name || "post-hook.jpg",
        type: storedFile.type || file.type || "image/jpeg",
        dataUrl: await readFileAsDataUrl(storedFile),
        savedAt: new Date().toISOString()
      };
      setPostPilotSavedImage(localImage);

      const payload = new FormData();
      payload.append("hookImage", storedFile);
      let response;
      let json;
      try {
        response = await fetch("/api/personal-post-hook-image", {
          method: "POST",
          body: payload
        });
        json = await readApiJson(response);
      } catch (error) {
        threadsResult.className = "result ok";
        threadsResult.textContent = "Gambar hook sudah disimpan untuk Post Pilot. Extension akan guna gambar terakhir ini.";
        return;
      }
      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!response.ok || !json.ok) {
        threadsResult.className = "result ok";
        threadsResult.textContent = "Gambar hook sudah disimpan untuk Post Pilot. Extension akan guna gambar terakhir ini.";
        return;
      }
      if (json.storage === "browser") {
        setPostPilotSavedImage({
          ...localImage,
          savedAt: json.draft?.hookImageUpdatedAt || localImage.savedAt
        });
        threadsResult.className = "result ok";
        threadsResult.textContent = "Gambar hook sudah disimpan untuk Post Pilot. Extension akan guna gambar terakhir ini.";
        return;
      }
      const image = {
        name: json.draft?.hookImageName || storedFile.name || "post-hook.jpg",
        type: json.draft?.hookImageMime || storedFile.type || "image/jpeg",
        url: \`/api/personal-post-hook-image?t=\${encodeURIComponent(json.draft?.hookImageUpdatedAt || Date.now())}\`,
        dataUrl: localImage.dataUrl,
        savedAt: json.draft?.hookImageUpdatedAt || new Date().toISOString()
      };
      setPostPilotSavedImage(image);
      threadsResult.className = "result ok";
      threadsResult.textContent = "Gambar hook sudah disimpan dalam Supabase untuk Post Pilot.";
    }

    function postPilotGalleryImageUrl(image) {
      return image.url || \`/api/personal-post-hook-images?id=\${encodeURIComponent(image.id)}\`;
    }

    function renderPostPilotGallery() {
      if (!threadsHookGallery || !threadsHookImageStatus) return;
      threadsHookGallery.innerHTML = "";
      postPilotGalleryImages.forEach((image) => {
        const item = document.createElement("div");
        item.className = "postpilot-gallery-item";
        const preview = document.createElement("img");
        preview.src = postPilotGalleryImageUrl(image);
        preview.alt = image.name || "Gambar hook";
        preview.loading = "lazy";
        const remove = document.createElement("button");
        remove.type = "button";
        remove.textContent = "x";
        remove.title = \`Delete \${image.name || "gambar"}\`;
        remove.setAttribute("aria-label", remove.title);
        remove.addEventListener("click", () => deletePostPilotGalleryImage(image));
        item.append(preview, remove);
        threadsHookGallery.appendChild(item);
      });
      threadsHookImageStatus.textContent = postPilotGalleryImages.length
        ? \`\${postPilotGalleryImages.length}/20 gambar hook tersimpan. Rotation akan pilih gambar paling lama belum digunakan.\`
        : "Belum ada gambar dalam galeri. Upload sekurang-kurangnya satu gambar untuk POST NOW.";
      if (threadsHookImagePreview) threadsHookImagePreview.hidden = true;
    }

    async function loadPostPilotGallery() {
      if (!activePostPilotProductId) return;
      const response = await fetch(\`/api/personal-post-hook-images?product_id=\${encodeURIComponent(activePostPilotProductId)}\`);
      const json = await readApiJson(response);
      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!response.ok || !json.ok) throw new Error(json.error || "Gagal load galeri gambar hook.");
      postPilotGalleryImages = Array.isArray(json.images) ? json.images : [];
      renderPostPilotGallery();
    }

    async function uploadPostPilotGalleryFiles(files) {
      const available = Math.max(0, 20 - postPilotGalleryImages.length);
      if (!available) throw new Error("Galeri gambar hook sudah penuh (20). Delete satu gambar dahulu.");
      const selected = files.slice(0, available);
      const skipped = files.length - selected.length;
      for (let index = 0; index < selected.length; index += 1) {
        threadsHookImageStatus.textContent = \`Simpan gambar \${index + 1}/\${selected.length}...\`;
        const storedFile = await compressImageForPostPilotStorage(selected[index]);
        const payload = new FormData();
        payload.append("hookImage", storedFile);
        const response = await fetch(\`/api/personal-post-hook-images?product_id=\${encodeURIComponent(activePostPilotProductId)}\`, { method: "POST", body: payload });
        const json = await readApiJson(response);
        if (!response.ok || !json.ok) throw new Error(json.error || \`Gagal simpan \${selected[index].name}.\`);
        postPilotGalleryImages.push(json.image);
        renderPostPilotGallery();
      }
      threadsHookImage.value = "";
      threadsResult.className = "result ok";
      threadsResult.textContent = [
        \`\${selected.length} gambar hook disimpan dalam Supabase.\`,
        skipped ? \`\${skipped} gambar tidak dimuat naik kerana galeri maksimum 20.\` : "",
      ].filter(Boolean).join("\\n");
    }

    async function deletePostPilotGalleryImage(image) {
      const response = await fetch(\`/api/personal-post-hook-images?id=\${encodeURIComponent(image.id)}\`, { method: "DELETE" });
      const json = await readApiJson(response);
      if (!response.ok || !json.ok) throw new Error(json.error || "Gagal delete gambar hook.");
      postPilotGalleryImages = postPilotGalleryImages.filter((item) => item.id !== image.id);
      renderPostPilotGallery();
      threadsResult.className = "result ok";
      threadsResult.textContent = "Gambar hook sudah dibuang daripada galeri.";
    }

    async function buildPostPilotBatchDraft(count) {
      const response = await fetch("/api/personal-post-batch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...threadsPayloadFromForm(), count })
      });
      const json = await readApiJson(response);
      if (response.status === 401) {
        window.location.href = "/login";
        return null;
      }
      if (!response.ok || !json.ok) throw new Error(json.error || "Gagal jana batch Post Pilot.");
      const posts = [];
      for (const post of json.posts || []) {
        if (!post.image?.url) throw new Error(\`Gambar hook untuk \${post.id} tidak lengkap.\`);
        const imageResponse = await fetch(post.image.url);
        if (!imageResponse.ok) throw new Error(\`Gagal load gambar hook untuk \${post.id}.\`);
        const imageBlob = await imageResponse.blob();
        const imageDataUrl = await readFileAsDataUrl(fileFromBlob(imageBlob, post.image.name || "post-hook.jpg"));
        posts.push({
          ...post,
          image: {
            name: post.image.name,
            type: post.image.type,
            dataUrl: imageDataUrl
          }
        });
      }
      if (posts.length !== count) throw new Error("Batch Post Pilot tidak lengkap.");
      const automationId = \`postpilot-batch-\${Date.now()}\`;
      return {
        source: "postpilot-webapp",
        type: "POSTPILOT_BATCH_DRAFT",
        draft: { id: automationId, automationId, createdAt: new Date().toISOString(), autoPublish: true, batchDelayMs: 30000, posts }
      };
    }

    async function startPostPilotBatch(count) {
      const button = count === 5 ? threadsBatchPostButton : threadsPreviewButton;
      const otherButton = count === 5 ? threadsPreviewButton : threadsBatchPostButton;
      button.disabled = true;
      otherButton.disabled = true;
      button.textContent = count === 5 ? "Preparing 5 posts..." : "Preparing post...";
      threadsResult.className = "result";
      threadsResult.textContent = "";
      try {
        await savePostPilotInputsToSupabase();
        await createRemoteAutomationJob({
          type: "facebook_threads",
          count,
          personal: threadsPayloadFromForm()
        }, threadsResult);
        threadsResult.className = "result ok";
        threadsResult.textContent = count === 5
          ? "5 post unik masuk queue Mac. Facebook dan Threads akan bergerak satu demi satu, dengan jarak 30 saat."
          : "Post unik masuk queue Mac. Facebook akan post dahulu, kemudian Threads.";
      } catch (error) {
        showThreadsError(error);
      } finally {
        threadsPreviewButton.disabled = false;
        threadsBatchPostButton.disabled = false;
        threadsPreviewButton.textContent = "Generate Preview";
        threadsBatchPostButton.textContent = "POST 5 NOW";
      }
    }

    function showThreadsPreview(json, { reveal = true, message = "" } = {}) {
      currentThreadsPreview = json.preview;
      seenThreadsVariations = [Number(currentThreadsPreview.variation || 0)];
      threadsPostPreview.value = currentThreadsPreview.facebook_post_text || currentThreadsPreview.post_text || "";
      threadsPreviewMeta.textContent = [
        \`Produk: \${currentThreadsPreview.product_context?.product_name || currentThreadsPreview.product_name || "-"}\`,
        \`Concept: \${Number(currentThreadsPreview.variation || 0) + 1}/120\`,
        \`Style: \${currentThreadsPreview.style || "-"}\`
      ].join(" | ");
      threadsPreviewPanel.className = reveal ? "preview show" : "preview";
      threadsPreviewPanel.hidden = !reveal;
      setPostWorkflowStep(3);
      if (message || reveal) {
        threadsResult.className = "result ok";
        threadsResult.textContent = [
          message || "Preview Post Pilot siap. Caption panjang akan dipecahkan menjadi post berangkai di Threads jika perlu.",
          savedThreadsImage && !threadsHookImage.files[0] ? "Gambar hook last key in tersedia untuk extension." : "",
          preparedThreadsImageNotice || ""
        ].filter(Boolean).join("\\n\\n");
      }
    }

    async function buildThreadsExtensionDraft() {
      if (!currentThreadsPreview) throw new Error("Preview Post Pilot belum dijana.");
      const selectedImage = preparedThreadsImageFile || threadsHookImage.files[0] || null;
      let imageDataUrl = "";
      let imageNotice = "";
      if (selectedImage) {
        const imageForExtension = await prepareThreadsImageFile(selectedImage);
        if (imageForExtension && imageForExtension.size <= TARGET_UPLOAD_BYTES) {
          imageDataUrl = await readFileAsDataUrl(imageForExtension);
        } else if (imageForExtension) {
          imageNotice = "Gambar terlalu besar untuk dihantar ke extension. Pilih gambar secara manual di Facebook.";
        }
      } else if (savedThreadsImage?.dataUrl) {
        imageDataUrl = savedThreadsImage.dataUrl;
      } else if (savedThreadsImage?.url) {
        try {
          const response = await fetch(savedThreadsImage.url);
          if (!response.ok) throw new Error("Gagal load gambar hook dari Supabase.");
          imageDataUrl = await blobToDataUrl(await response.blob());
        } catch (error) {
          imageNotice = \`Gambar hook terakhir tidak dapat dibaca dari Supabase. Upload gambar secara manual di Facebook. Detail: \${error.message || String(error)}\`;
        }
      }

      return {
        source: "postpilot-webapp",
        type: "POSTPILOT_SAVE_DRAFT",
        draft: {
          id: \`postpilot-\${Date.now()}\`,
          createdAt: new Date().toISOString(),
          postText: normalizePostPilotMainTextForSend(
            threadsPostPreview.value,
            currentThreadsPreview.affiliate_link || document.getElementById("threadsAffiliateLink").value
          ),
          facebookPostText: normalizePostPilotMainTextForSend(
            threadsPostPreview.value,
            currentThreadsPreview.affiliate_link || document.getElementById("threadsAffiliateLink").value
          ),
          threadsPostText: currentThreadsPreview.threads_post_text || normalizePostPilotMainTextForSend(
            threadsPostPreview.value,
            currentThreadsPreview.affiliate_link || document.getElementById("threadsAffiliateLink").value
          ),
          productName: currentThreadsPreview.product_name || currentThreadsPreview.product_context?.product_name || "",
          affiliateLink: currentThreadsPreview.affiliate_link || "",
          postMode: currentThreadsPreview.post_mode || "soft",
          style: currentThreadsPreview.style || "",
          autoPublish: true,
          image: imageDataUrl ? {
            name: (preparedThreadsImageFile || selectedImage)?.name || savedThreadsImage?.name || "post-hook.jpg",
            type: (preparedThreadsImageFile || selectedImage)?.type || savedThreadsImage?.type || "image/jpeg",
            dataUrl: imageDataUrl
          } : null,
          imageNotice
        }
      };
    }

    async function sendThreadsDraftToExtension() {
      if (!currentThreadsPreview) throw new Error("Preview Post Pilot belum dijana.");
      const postText = normalizePostPilotMainTextForSend(
        threadsPostPreview.value,
        currentThreadsPreview.affiliate_link || document.getElementById("threadsAffiliateLink").value
      );
      if (!postText) throw new Error("Post utama kosong.");
      await createRemoteAutomationJob({
        type: "facebook_threads",
        product_id: activePostPilotProductId,
        posts: [{
          id: "postpilot-preview-" + Date.now(),
          postText,
          facebookPostText: postText,
          threadsPostText: currentThreadsPreview.threads_post_text || postText,
          postMode: currentThreadsPreview.post_mode || "custom",
          style: currentThreadsPreview.style || "custom"
        }]
      }, threadsResult);
      threadsResult.className = "result ok";
      threadsResult.textContent = "Draft masuk queue. Menunggu Chrome Mac buka Facebook, kemudian Threads.";
      setPostWorkflowStep(4);
      showToast("Post masuk queue Mac.");
      loadTodayDashboard({ silent: true, force: true });
    }

    function setPostWorkflowStep(step) {
      document.querySelectorAll(".workflow-steps span").forEach((item, index) => item.classList.toggle("active", index + 1 === step));
    }

    async function generatePostPilotPreview() {
      threadsPreviewButton.disabled = true;
      threadsBatchPostButton.disabled = true;
      threadsPreviewButton.textContent = "Generating...";
      setPostWorkflowStep(2);
      try {
        await savePostPilotInputsToSupabase();
        const response = await fetch("/api/personal-post-preview", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(threadsPayloadFromForm())
        });
        const json = await readApiJson(response);
        if (response.status === 401) return void (window.location.href = "/login");
        if (!response.ok || !json.ok) throw new Error(json.error || "Gagal jana preview Post Pilot.");
        showThreadsPreview(json);
      } catch (error) {
        setPostWorkflowStep(1);
        showThreadsError(error);
      } finally {
        threadsPreviewButton.disabled = false;
        threadsBatchPostButton.disabled = false;
        threadsPreviewButton.textContent = "Generate Preview";
      }
    }

    function pickRandom(list) {
      return list[Math.floor(Math.random() * list.length)] || "";
    }

    function fillSelectOptions(select, values, includeAllLabel) {
      if (!select) return;
      select.innerHTML = "";
      if (includeAllLabel) {
        const allOption = document.createElement("option");
        allOption.value = "";
        allOption.textContent = includeAllLabel;
        select.appendChild(allOption);
      }
      [...new Set(values)].forEach((value) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        select.appendChild(option);
      });
    }

    function normalizeWords(value) {
      return String(value || "")
        .toLowerCase()
        .replace(/https?:\\/\\/\\S+/g, " ")
        .replace(/[^a-z0-9\\u00c0-\\u024f\\u1e00-\\u1eff\\s-]/gi, " ")
        .split(/\\s+/)
        .map((word) => word.trim())
        .filter((word) => word.length >= 3);
    }

    function similarityScore(a, b) {
      const aWords = new Set(normalizeWords(a));
      const bWords = new Set(normalizeWords(b));
      if (!aWords.size || !bWords.size) return 0;
      const intersection = [...aWords].filter((word) => bWords.has(word)).length;
      const union = new Set([...aWords, ...bWords]).size;
      return intersection / union;
    }

    function tooSimilarToBatch(text, posts) {
      return posts.some((post) => similarityScore(text, post.postText || post.post_text || "") > 0.72);
    }

    function containsAnyPhrase(text, phrases) {
      const lower = String(text || "").toLowerCase();
      return phrases.some((phrase) => lower.includes(String(phrase || "").toLowerCase()));
    }

    function cleanViralText(value) {
      return String(value || "")
        .replace(/\\*\\*/g, "")
        .replace(/:/g, ",")
        .replace(/\\s+([?.!,])/g, "$1")
        .replace(/[ \\t]+/g, " ")
        .replace(/\\n{3,}/g, "\\n\\n")
        .trim();
    }

    function withTopic(template, topic) {
      return String(template || "").replace(/\\{topic\\}/g, topic);
    }

    function withViralContext(template, topic, audience) {
      return withTopic(template, topic).replace(/\\{audience\\}/g, audience);
    }

    function maybeHashtags(category, topic) {
      if (!viralHashtags.checked) return "";
      const raw = [category, topic, "ThreadsMY"]
        .map((item) => String(item || "").replace(/[^a-z0-9]/gi, ""))
        .filter(Boolean)
        .slice(0, 3);
      return raw.length ? "\\n\\n" + raw.map((item) => "#" + item).join(" ") : "";
    }

    function viralContextFor(category) {
      if (["business", "marketing", "sales", "side income", "ai automation", "tiktok ads", "facebook ads", "local brand", "content creation", "personal branding", "entrepreneurship", "startup", "freelancing", "finance", "investment", "ecommerce", "online business", "customer service", "leadership", "management", "technology"].includes(String(category || "").toLowerCase())) {
        return pickRandom(viralTemplates.businessContextPhrases);
      }
      return pickRandom(viralTemplates.malaysianContextPhrases);
    }

    function buildViralText(parts) {
      return buildThreadsGeneralText(parts);
    }

    function validateViralPost(text, existingPosts) {
      const safe = cleanViralText(text);
      if (!safe) return { ok: false, reason: "empty" };
      if (safe.length > 500) return { ok: false, reason: "over_500" };
      if (!viralHashtags.checked && /(^|\\s)#\\w+/i.test(safe)) return { ok: false, reason: "hashtag_disabled" };
      if (containsAnyPhrase(safe, VIRAL_BANNED_WORDS)) return { ok: false, reason: "banned_word" };
      if (containsAnyPhrase(safe, VIRAL_PROMO_PHRASES)) return { ok: false, reason: "too_promotional" };
      if (containsAnyPhrase(safe, VIRAL_ROBOTIC_PHRASES)) return { ok: false, reason: "robotic_phrase" };
      if (/\\*\\*|:/.test(safe)) return { ok: false, reason: "robotic_punctuation" };
      if (/\\?\\s*(?:#\\w+(?:\\s+#\\w+)*)?$/i.test(safe)) return { ok: false, reason: "question_ending" };
      if (tooSimilarToBatch(safe, existingPosts)) return { ok: false, reason: "too_similar" };
      return { ok: true, text: safe };
    }

    function makeViralPost(existingPosts = [], override = {}) {
      const category = String(override.category || viralCategory.value || "business").toLowerCase();
      const tone = override.tone || viralTone.value || "Casual";
      const audience = override.audience || viralAudience.value || pickRandom(viralTemplates.audienceTypes);
      const topic = (override.topic || category).trim();

      for (let attempt = 0; attempt < 160; attempt += 1) {
        const structure = pickRandom(viralTemplates.structures);
        const toneTemplates = viralTemplates.toneLeadIns?.[tone] || viralTemplates.toneLeadIns?.Casual || [];
        const parts = {
          angle: pickRandom(viralTemplates.contentAngles),
          audience,
          audienceLead: withViralContext(pickRandom(viralTemplates.audienceLeadIns || []), topic, audience),
          category,
          context: viralContextFor(category),
          emotion: pickRandom(viralTemplates.emotionalTriggers),
          hook: withTopic(pickRandom(viralTemplates.hooks), topic),
          middle: pickRandom(viralTemplates.middleSentencePatterns),
          opening: withTopic(pickRandom(viralTemplates.openingStyles), topic),
          pain: pickRandom(viralTemplates.painPoints),
          structure,
          tone,
          toneLead: withViralContext(pickRandom(toneTemplates), topic, audience),
          topic,
        };
        let text = buildViralText(parts) + maybeHashtags(category, topic);
        text = cleanViralText(text);
        const validation = validateViralPost(text, existingPosts);
        if (validation.ok) {
          return {
            id: "viral-" + Date.now() + "-" + Math.random().toString(16).slice(2),
            postText: validation.text,
            characterCount: validation.text.length,
            category,
            tone,
            audience,
            structure,
            createdAt: new Date().toISOString(),
          };
        }
      }

      const fallbackText = cleanViralText([
        "aku rasa " + topic + " tak perlu complicated.",
        "mula dengan satu benda yang paling senang nampak dulu."
      ].join("\\n\\n") + maybeHashtags(category, topic));
      return {
        id: "viral-" + Date.now() + "-" + Math.random().toString(16).slice(2),
        postText: fallbackText.slice(0, 500),
        characterCount: Math.min(fallbackText.length, 500),
        category,
        tone,
        audience,
        structure: "Recommendation",
        createdAt: new Date().toISOString(),
      };
    }

    async function requestViralPosts(count, randomize = false) {
      const response = await fetch("/api/threads-general", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          count,
          randomize,
          patternId: count === 1 ? viralPattern.value : "",
          category: viralCategory.value,
          tone: viralTone.value,
          audience: viralAudience.value,
          hashtags: viralHashtags.checked
        })
      });
      const json = await readApiJson(response);
      if (response.status === 401) return void (window.location.href = "/login");
      if (!response.ok || !json.ok) throw new Error(json.error || "Gagal jana Threads General.");
      return json.posts || [];
    }

    async function generateViralPosts(count) {
      viralGeneratedPosts = await requestViralPosts(count, false);
      renderViralPosts();
      loadViralHistory().catch(() => {});
      setMessage(viralResult, "ok", count + " Threads General post generated.");
    }

    function shuffledViralValues(values, count) {
      const source = [...new Set((values || []).filter(Boolean))];
      const output = [];
      while (output.length < count && source.length) {
        const round = [...source];
        for (let index = round.length - 1; index > 0; index -= 1) {
          const target = Math.floor(Math.random() * (index + 1));
          [round[index], round[target]] = [round[target], round[index]];
        }
        output.push(...round);
      }
      return output.slice(0, count);
    }

    function randomViralOverride() {
      return {
        audience: pickRandom(viralTemplates.audienceTypes || []),
        category: pickRandom(viralTemplates.categories || []),
        tone: pickRandom(viralTemplates.toneOptions || []),
        topic: pickRandom(viralTemplates.topicOptions || viralTemplates.categories || []),
      };
    }

    async function generateRandomViralPosts(count) {
      viralGeneratedPosts = await requestViralPosts(count, true);
      renderViralPosts();
      loadViralHistory().catch(() => {});
      setMessage(viralResult, "ok", count + " random Threads General post generated.");
    }

    async function ensureViralPostCount(count) {
      if (viralGeneratedPosts.length < count) {
        viralGeneratedPosts = await requestViralPosts(count, true);
      }
      renderViralPosts();
      return viralGeneratedPosts.slice(0, count);
    }

    function csvEscape(value) {
      return '"' + String(value || "").replace(/"/g, '""') + '"';
    }

    function exportViralCsv(posts, filename) {
      if (!posts.length) {
        setMessage(viralResult, "err", "Tiada post untuk export.");
        return;
      }
      const rows = [[
        "post_text",
        "character_count",
        "category",
        "tone",
        "pattern_id",
        "pattern_label",
        "angle_id",
        "rhythm_id",
        "robot_risk",
        "created_at"
      ]];
      posts.forEach((post) => {
        rows.push([
          post.postText,
          post.characterCount,
          post.category,
          post.tone,
          post.patternId,
          post.patternLabel || post.structure,
          post.angleId,
          post.rhythmId,
          post.robotRisk,
          post.createdAt
        ]);
      });
      const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    }

    async function copyText(text, button) {
      await navigator.clipboard.writeText(text);
      if (button) markButtonSuccess(button, "Copied");
    }

    function isViralSaved(post) {
      return viralSavedPosts.some((saved) => saved.postText === post.postText);
    }

    function saveViralPosts() {
      localStorage.setItem(VIRAL_SAVED_STORAGE_KEY, JSON.stringify(viralSavedPosts));
    }

    function loadViralPosts() {
      try {
        viralSavedPosts = JSON.parse(localStorage.getItem(VIRAL_SAVED_STORAGE_KEY) || "[]");
      } catch {
        viralSavedPosts = [];
        localStorage.removeItem(VIRAL_SAVED_STORAGE_KEY);
      }
    }

    function toggleViralFavorite(post) {
      if (isViralSaved(post)) {
        viralSavedPosts = viralSavedPosts.filter((saved) => saved.postText !== post.postText);
      } else {
        viralSavedPosts.unshift({ ...post, savedAt: new Date().toISOString() });
      }
      saveViralPosts();
      renderViralPosts();
      renderSavedViralPosts();
    }

    async function regenerateViralPost(postId) {
      const index = viralGeneratedPosts.findIndex((post) => post.id === postId);
      if (index < 0) return;
      const [replacement] = await requestViralPosts(1, false);
      if (replacement) viralGeneratedPosts[index] = replacement;
      renderViralPosts();
    }

    async function rateViralPost(post, rating) {
      const response = await fetch("/api/postpilot-copy-history", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: post.id, rating })
      });
      const json = await readApiJson(response);
      if (!response.ok || !json.ok) throw new Error(json.error || "Gagal simpan rating post.");
      post.rating = rating;
      renderViralPosts();
      loadViralHistory().catch(() => {});
      setMessage(viralResult, "ok", "Rating disimpan. Pattern engine akan belajar daripada pilihan ini.");
    }

    async function postViralToThreads(post) {
      try {
        await createRemoteAutomationJob({
          type: "threads_text",
          posts: [{
            id: post.id,
            postText: post.postText,
            category: post.category,
            tone: post.tone,
            structure: post.structure,
            textHash: post.textHash,
            patternId: post.patternId,
            patternLabel: post.patternLabel,
            angleId: post.angleId,
            rhythmId: post.rhythmId
          }],
          batchDelayMs: 30000
        }, viralResult);
        setMessage(viralResult, "ok", "Post Threads masuk queue Chrome Mac.");
      } catch (error) {
        setMessage(viralResult, "err", error.message || String(error));
      }
    }

    async function postViralBatchToThreads(count) {
      const posts = await ensureViralPostCount(count);
      try {
        await createRemoteAutomationJob({
          type: "threads_text",
          posts: posts.map((post) => ({
            id: post.id,
            postText: post.postText,
            category: post.category,
            tone: post.tone,
            structure: post.structure,
            textHash: post.textHash,
            patternId: post.patternId,
            patternLabel: post.patternLabel,
            angleId: post.angleId,
            rhythmId: post.rhythmId
          })),
          batchDelayMs: 30000
        }, viralResult);
        setMessage(viralResult, "ok", posts.length + " Threads posts masuk queue Chrome Mac.");
      } catch (error) {
        setMessage(viralResult, "err", error.message || String(error));
      }
    }

    function viralCard(post, options = {}) {
      const card = document.createElement("article");
      card.className = "viral-post-card" + (isViralSaved(post) ? " favorite" : "");

      const text = document.createElement("p");
      text.className = "viral-post-text";
      text.textContent = post.postText;

      const meta = document.createElement("div");
      meta.className = "viral-meta";
      [
        post.characterCount + " chars",
        post.patternLabel || post.structure,
        post.tone,
        post.category,
        "robot " + Number(post.robotRisk || 0)
      ].forEach((item) => {
        const span = document.createElement("span");
        span.textContent = item;
        meta.appendChild(span);
      });

      const actions = document.createElement("div");
      actions.className = "actions";

      const copyButton = document.createElement("button");
      copyButton.className = "secondary";
      copyButton.type = "button";
      copyButton.textContent = "Copy";
      copyButton.addEventListener("click", () => copyText(post.postText, copyButton).catch(showThreadsError));
      actions.appendChild(copyButton);

      if (!options.savedOnly) {
        const regenerateButton = document.createElement("button");
        regenerateButton.className = "regenerate";
        regenerateButton.type = "button";
        regenerateButton.textContent = "Regenerate";
        regenerateButton.addEventListener("click", () => regenerateViralPost(post.id).catch(showThreadsError));
        actions.appendChild(regenerateButton);
      }

      const favoriteButton = document.createElement("button");
      favoriteButton.className = "secondary";
      favoriteButton.type = "button";
      favoriteButton.textContent = isViralSaved(post) ? "Saved" : "Favorite";
      favoriteButton.addEventListener("click", () => toggleViralFavorite(post));
      actions.appendChild(favoriteButton);

      if (!options.savedOnly) {
        [["winner", "Winner"], ["average", "Average"], ["weak", "Weak"]].forEach(([rating, label]) => {
          const ratingButton = document.createElement("button");
          ratingButton.className = post.rating === rating ? "approve" : "secondary";
          ratingButton.type = "button";
          ratingButton.textContent = label;
          ratingButton.addEventListener("click", () => rateViralPost(post, rating).catch(showThreadsError));
          actions.appendChild(ratingButton);
        });
      }

      const postButton = document.createElement("button");
      postButton.className = "approve";
      postButton.type = "button";
      postButton.textContent = "Post to Threads";
      postButton.addEventListener("click", () => postViralToThreads(post));
      actions.appendChild(postButton);

      card.append(text, meta, actions);
      return card;
    }

    function renderViralPosts() {
      viralOutput.innerHTML = "";
      viralGeneratedPosts.forEach((post) => viralOutput.appendChild(viralCard(post)));
    }

    function filteredSavedViralPosts() {
      const query = String(viralSavedSearch.value || "").toLowerCase();
      const category = viralSavedCategoryFilter.value;
      const tone = viralSavedToneFilter.value;
      return viralSavedPosts.filter((post) => {
        if (query && !post.postText.toLowerCase().includes(query)) return false;
        if (category && post.category !== category) return false;
        if (tone && post.tone !== tone) return false;
        return true;
      });
    }

    function renderSavedViralPosts() {
      viralSavedOutput.innerHTML = "";
      const posts = filteredSavedViralPosts();
      posts.forEach((post) => viralSavedOutput.appendChild(viralCard(post, { savedOnly: true })));
      if (!posts.length) {
        const empty = document.createElement("p");
        empty.className = "note";
        empty.textContent = "Belum ada saved posts.";
        viralSavedOutput.appendChild(empty);
      }
    }

    function setupThreadsViralGenerator() {
      viralPattern.innerHTML = "";
      const autoPatternOption = document.createElement("option");
      autoPatternOption.value = "";
      autoPatternOption.textContent = "Auto rotate 300 patterns";
      viralPattern.appendChild(autoPatternOption);
      (viralTemplates.patterns || []).forEach((pattern, index) => {
        const option = document.createElement("option");
        option.value = pattern.id;
        option.textContent = String(index + 1).padStart(3, "0") + " · " + pattern.label;
        viralPattern.appendChild(option);
      });
      fillSelectOptions(viralCategory, viralTemplates.categories || [], "");
      fillSelectOptions(viralTone, viralTemplates.toneOptions || [], "");
      fillSelectOptions(viralAudience, viralTemplates.audienceTypes || [], "");
      fillSelectOptions(viralSavedCategoryFilter, viralTemplates.categories || [], "All categories");
      fillSelectOptions(viralSavedToneFilter, viralTemplates.toneOptions || [], "All tones");
      loadViralPosts();
      renderSavedViralPosts();
      loadViralHistory().catch(() => {});
    }

    async function loadViralHistory() {
      const response = await fetch("/api/postpilot-copy-history?channel=threads_general&limit=30");
      const json = await readApiJson(response);
      if (!response.ok || !json.ok) throw new Error(json.error || "Gagal load post history.");
      viralHistoryOutput.innerHTML = "";
      (json.posts || []).forEach((post) => {
        const card = document.createElement("article");
        card.className = "viral-post-card";
        const text = document.createElement("p");
        text.className = "viral-post-text";
        text.textContent = post.postText;
        const meta = document.createElement("div");
        meta.className = "viral-meta";
        [
          post.metadata?.patternLabel || post.patternFamily || "pattern",
          post.metadata?.publishedAt ? "Published" : (post.rating || "unrated"),
          new Date(post.createdAt).toLocaleDateString("ms-MY")
        ].forEach((value) => {
          const span = document.createElement("span");
          span.textContent = value;
          meta.appendChild(span);
        });
        const actions = document.createElement("div");
        actions.className = "actions";
        [["winner", "Winner"], ["average", "Average"], ["weak", "Weak"]].forEach(([rating, label]) => {
          const button = document.createElement("button");
          button.className = post.rating === rating ? "approve" : "secondary";
          button.type = "button";
          button.textContent = label;
          button.addEventListener("click", () => rateViralPost(post, rating).catch(showThreadsError));
          actions.appendChild(button);
        });
        card.append(text, meta, actions);
        viralHistoryOutput.appendChild(card);
      });
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
        await loadActivity();
      } catch (error) {
        showError(error);
      } finally {
        approveButton.disabled = false;
        regenerateButton.disabled = false;
        approveButton.textContent = "Approve & Post ke Facebook";
      }
    });

    threadsForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      await generatePostPilotPreview();
    });

    threadsBatchPostButton.addEventListener("click", () => startPostPilotBatch(5));

    regenerateThreadsButton.addEventListener("click", async () => {
      if (!currentThreadsPreview) return;
      threadsResult.className = "result";
      threadsResult.textContent = "";
      regenerateThreadsButton.disabled = true;
      regenerateThreadsButton.textContent = "Generating...";

      try {
        const response = await fetch("/api/personal-post-regenerate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            product_id: activePostPilotProductId,
            product_name: currentThreadsPreview.product_name,
            affiliate_link: currentThreadsPreview.affiliate_link,
            post_mode: currentThreadsPreview.post_mode,
            product_context: currentThreadsPreview.product_context?.raw,
            variation: currentThreadsPreview.variation,
            seen_variations: seenThreadsVariations
          })
        });
        const json = await readApiJson(response);
        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }
        if (!response.ok || !json.ok) throw new Error(json.error || "Post Pilot regenerate failed.");

        currentThreadsPreview = {
          ...currentThreadsPreview,
          post_text: json.preview.post_text,
          facebook_post_text: json.preview.facebook_post_text || json.preview.post_text,
          threads_post_text: json.preview.threads_post_text || json.preview.post_text,
          product_context: json.preview.product_context,
          variation: json.preview.variation,
          style: json.preview.style
        };
        seenThreadsVariations.push(Number(currentThreadsPreview.variation || 0));
        threadsPostPreview.value = currentThreadsPreview.facebook_post_text || currentThreadsPreview.post_text || "";
        threadsPreviewMeta.textContent = [
          \`Produk: \${currentThreadsPreview.product_context?.product_name || currentThreadsPreview.product_name || "-"}\`,
          \`Concept: \${Number(currentThreadsPreview.variation || 0) + 1}/120\`,
          \`Style: \${currentThreadsPreview.style || "-"}\`
        ].join(" | ");
        threadsResult.className = "result ok";
        threadsResult.textContent = "Variasi post baru sudah dijana.";
      } catch (error) {
        showThreadsError(error);
      } finally {
        regenerateThreadsButton.disabled = false;
        regenerateThreadsButton.textContent = "Jana Semula Post";
      }
    });

    generateViralOneButton.addEventListener("click", () => generateViralPosts(1).catch(showThreadsError));
    generateViralTenButton.addEventListener("click", () => generateRandomViralPosts(10).catch(showThreadsError));
    generateViralFiftyButton.addEventListener("click", () => generateRandomViralPosts(50).catch(showThreadsError));
    autoPostViralTenButton.addEventListener("click", () => postViralBatchToThreads(10));
    autoPostViralFiftyButton.addEventListener("click", () => postViralBatchToThreads(50));
    exportViralCsvButton.addEventListener("click", () => exportViralCsv(viralGeneratedPosts, "threads-viral-posts.csv"));
    exportSavedViralButton.addEventListener("click", () => exportViralCsv(filteredSavedViralPosts(), "threads-viral-saved-posts.csv"));
    clearSavedViralButton.addEventListener("click", () => {
      viralSavedPosts = [];
      saveViralPosts();
      renderViralPosts();
      renderSavedViralPosts();
    });
    viralSavedSearch.addEventListener("input", renderSavedViralPosts);
    viralSavedCategoryFilter.addEventListener("change", renderSavedViralPosts);
    viralSavedToneFilter.addEventListener("change", renderSavedViralPosts);
    refreshViralHistoryButton.addEventListener("click", () => loadViralHistory().catch(showThreadsError));

    sendThreadsExtensionButton.addEventListener("click", async () => {
      sendThreadsExtensionButton.disabled = true;
      sendThreadsExtensionButton.textContent = "Sending...";
      threadsResult.className = "result";
      threadsResult.textContent = "";

      try {
        await sendThreadsDraftToExtension();
      } catch (error) {
        showThreadsError(error);
      } finally {
        sendThreadsExtensionButton.disabled = false;
        sendThreadsExtensionButton.textContent = "POST NOW";
      }
    });

`;
};
