const meta = document.getElementById("meta");
const postText = document.getElementById("postText");
const statusBox = document.getElementById("status");
const openFacebookButton = document.getElementById("openFacebookButton");
const fillPostButton = document.getElementById("fillPostButton");
const autoPostButton = document.getElementById("autoPostButton");
const retryBatchButton = document.getElementById("retryBatchButton");
const extensionVersion = document.getElementById("extensionVersion");
const remoteMeta = document.getElementById("remoteMeta");
const pairCode = document.getElementById("pairCode");
const pairButton = document.getElementById("pairButton");
const checkRemoteButton = document.getElementById("checkRemoteButton");
const resetAutomationButton = document.getElementById("resetAutomationButton");
const unpairButton = document.getElementById("unpairButton");

let currentDraft = null;

extensionVersion.textContent = `v${chrome.runtime.getManifest().version}`;

function setStatus(message, isError = false) {
  statusBox.hidden = false;
  statusBox.className = isError ? "status err" : "status";
  statusBox.textContent = message;
}

function sendMessage(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (!response?.ok) {
        reject(new Error(response?.error || "Action failed."));
        return;
      }
      resolve(response);
    });
  });
}

async function loadDraft() {
  try {
    const response = await sendMessage({ type: "GET_CURRENT_DRAFT" });
    currentDraft = response.draft;
    if (response.lastError) {
      setStatus(response.lastError, true);
    } else if (response.automationStatus) {
      setStatus(response.automationStatus);
    }
    if (!currentDraft) {
      meta.textContent = "Belum ada draft. Hantar dari tab Post Pilot di webapp.";
      postText.value = "";
      return;
    }
    meta.textContent = [
      currentDraft.postMode || "facebook-personal",
      currentDraft.style || "",
      currentDraft.image ? "gambar hook ready" : "tiada gambar"
    ].filter(Boolean).join(" | ");
    postText.value = currentDraft.postText || "";
  } catch (error) {
    setStatus(error.message || String(error), true);
  }
}

async function loadRemoteState() {
  try {
    const response = await sendMessage({ type: "GET_REMOTE_STATE" });
    if (response.paired) {
      remoteMeta.textContent = `${response.device?.name || "Mac Chrome"} paired${response.realtime ? " | realtime ready" : " | health sync ready"}. ${response.status || "Menunggu arahan phone."}`;
      pairCode.hidden = true;
      pairButton.hidden = true;
      unpairButton.hidden = false;
    } else {
      remoteMeta.textContent = "Masukkan code 8 aksara dari panel Mac Automation dalam webapp.";
      pairCode.hidden = false;
      pairButton.hidden = false;
      unpairButton.hidden = true;
    }
    if (response.error) setStatus(response.error, true);
  } catch (error) {
    setStatus(error.message || String(error), true);
  }
}

pairButton.addEventListener("click", async () => {
  pairButton.disabled = true;
  pairButton.textContent = "Pairing...";
  try {
    const code = pairCode.value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (code.length !== 8) throw new Error("Masukkan pairing code 8 aksara.");
    pairCode.value = code;
    remoteMeta.textContent = "Sedang sambungkan extension dengan BuddyPilot...";
    await sendMessage({ type: "PAIR_REMOTE_EXTENSION", code, name: "Mac Chrome" });
    setStatus("Mac berjaya dipasangkan. Arahan phone akan diterima automatik.");
    await loadRemoteState();
  } catch (error) {
    const message = error.message || String(error);
    remoteMeta.textContent = "Pairing belum berjaya. Semak code yang dipaparkan dalam webapp.";
    setStatus(message, true);
  } finally {
    pairButton.disabled = false;
    pairButton.textContent = "Pair Mac";
  }
});

checkRemoteButton.addEventListener("click", async () => {
  try {
    await sendMessage({ type: "CHECK_REMOTE_NOW" });
    setStatus("Remote queue sudah diperiksa.");
    await loadRemoteState();
  } catch (error) {
    setStatus(error.message || String(error), true);
  }
});

resetAutomationButton.addEventListener("click", async () => {
  resetAutomationButton.disabled = true;
  resetAutomationButton.textContent = "Resetting...";
  try {
    const response = await sendMessage({ type: "RESET_POSTPILOT_AUTOMATION" });
    setStatus(response.message || "Automation sudah direset.");
    await loadRemoteState();
    await loadDraft();
  } catch (error) {
    setStatus(error.message || String(error), true);
  } finally {
    resetAutomationButton.disabled = false;
    resetAutomationButton.textContent = "Reset Automation";
  }
});

unpairButton.addEventListener("click", async () => {
  try {
    await sendMessage({ type: "UNPAIR_REMOTE_EXTENSION" });
    pairCode.value = "";
    setStatus("Pairing lokal dibuang.");
    await loadRemoteState();
  } catch (error) {
    setStatus(error.message || String(error), true);
  }
});

openFacebookButton.addEventListener("click", async () => {
  try {
    await sendMessage({ type: "OPEN_FACEBOOK" });
    setStatus("Facebook dibuka.");
  } catch (error) {
    setStatus(error.message || String(error), true);
  }
});

fillPostButton.addEventListener("click", async () => {
  try {
    await sendMessage({ type: "FILL_ACTIVE_POST" });
    setStatus("Post personal cuba diisi.");
  } catch (error) {
    setStatus(error.message || String(error), true);
  }
});

autoPostButton.addEventListener("click", async () => {
  try {
    await sendMessage({ type: "AUTO_POST_ACTIVE" });
    setStatus("Full auto flow sedang dicuba di tab Facebook aktif.");
  } catch (error) {
    setStatus(error.message || String(error), true);
  }
});

retryBatchButton.addEventListener("click", async () => {
  try {
    await sendMessage({ type: "RESUME_POSTPILOT_BATCH" });
    setStatus("Retry batch item semasa dimulakan.");
  } catch (error) {
    setStatus(error.message || String(error), true);
  }
});

Promise.all([loadDraft(), loadRemoteState()]);
