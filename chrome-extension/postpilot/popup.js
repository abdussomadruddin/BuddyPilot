const meta = document.getElementById("meta");
const postText = document.getElementById("postText");
const commentCta = document.getElementById("commentCta");
const statusBox = document.getElementById("status");
const openFacebookButton = document.getElementById("openFacebookButton");
const fillPostButton = document.getElementById("fillPostButton");
const copyCtaButton = document.getElementById("copyCtaButton");
const fillCommentButton = document.getElementById("fillCommentButton");

let currentDraft = null;

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
    if (!currentDraft) {
      meta.textContent = "Belum ada draft. Hantar dari tab Post Pilot di webapp.";
      postText.value = "";
      commentCta.value = "";
      return;
    }
    meta.textContent = [
      currentDraft.postMode || "facebook-personal",
      currentDraft.style || "",
      currentDraft.image ? "gambar hook ready" : "tiada gambar"
    ].filter(Boolean).join(" | ");
    postText.value = currentDraft.postText || "";
    commentCta.value = currentDraft.commentCta || "";
  } catch (error) {
    setStatus(error.message || String(error), true);
  }
}

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
    setStatus("Post personal cuba diisi. Semak composer sebelum klik Post.");
  } catch (error) {
    setStatus(error.message || String(error), true);
  }
});

copyCtaButton.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(currentDraft?.commentCta || commentCta.value || "");
    setStatus("CTA komen sudah dicopy.");
  } catch (error) {
    setStatus(error.message || String(error), true);
  }
});

fillCommentButton.addEventListener("click", async () => {
  try {
    await sendMessage({ type: "FILL_ACTIVE_COMMENT" });
    setStatus("CTA komen cuba diisi. Semak sebelum reply.");
  } catch (error) {
    setStatus(error.message || String(error), true);
  }
});

loadDraft();
