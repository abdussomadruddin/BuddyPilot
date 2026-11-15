// BuddyPilot Poster popup. Reads the posts queued for personal Facebook, puts
// one into Facebook's post box, and sends back the engagement visible on the
// owner's own profile. It never presses Facebook's Post button.
const API = "https://buddypilot.vercel.app/api/storytelling-extension";
const $ = (id) => document.getElementById(id);
let token = "";

function status(message, tone = "") {
  $("status").className = tone;
  $("status").textContent = message;
}

async function api(body) {
  const response = await fetch(API, { method: body ? "POST" : "GET", cache: "no-store", headers: { authorization: "Bearer " + token, ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const json = await response.json().catch(() => ({}));
  if (!response.ok || !json.ok) throw Object.assign(new Error(json.error || "BuddyPilot tidak dapat dihubungi (" + response.status + ")."), { status: response.status });
  return json;
}

async function facebookTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab && /^https:\/\/www\.facebook\.com\//.test(tab.url || "") ? tab : null;
}

function show(paired) {
  $("pair").hidden = paired;
  $("main").hidden = !paired;
}

async function loadQueue() {
  status("Memuatkan...");
  try {
    const { queue } = await api();
    $("queue").replaceChildren(...queue.map((item) => {
      const row = document.createElement("li");
      const title = document.createElement("strong");
      title.textContent = item.topic || "Post";
      const size = document.createElement("small");
      size.textContent = item.characters.toLocaleString("en-MY") + " aksara" + (item.image ? " · ada gambar" : "");
      const actions = document.createElement("div");
      actions.className = "row";
      const fill = document.createElement("button");
      fill.textContent = "Isi di Facebook";
      fill.addEventListener("click", () => fillPost(item));
      const done = document.createElement("button");
      done.className = "secondary";
      done.textContent = "Dah post";
      done.addEventListener("click", () => markDone(item));
      actions.append(fill, done);
      row.append(title, size, actions);
      return row;
    }));
    status(queue.length ? "" : "Tiada post menunggu. Hantar dari BuddyPilot dengan butang Facebook personal.");
  } catch (error) {
    if (error.status === 401) { show(false); }
    status(error.message, "err");
  }
}

// The photo is fetched here (the popup may read BuddyPilot's image storage) and
// handed to the Facebook page as a data URL.
async function photoOf(item) {
  if (!/^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\/postpilot\//.test(item.image || "")) return "";
  try {
    const blob = await (await fetch(item.image)).blob();
    return await new Promise((resolve) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => resolve(""); reader.readAsDataURL(blob); });
  } catch {
    return "";
  }
}

async function fillPost(item) {
  // The text is also copied, so it can be pasted by hand if Facebook's box is not found.
  try { await navigator.clipboard.writeText(item.content); } catch {}
  const image = await photoOf(item);
  const tab = await facebookTab();
  if (!tab) {
    await chrome.storage.local.set({ pendingFill: { text: item.content, image, at: Date.now() } });
    status("Membuka Facebook...");
    await chrome.tabs.create({ url: "https://www.facebook.com/" });
    return;
  }
  status("Mengisi kotak post...");
  try {
    const result = await chrome.tabs.sendMessage(tab.id, { type: "buddypilot-fill", text: item.content, image });
    status(result?.ok ? "Dah diisi. Semak teks" + (item.image ? " dan gambar (tambah sendiri jika gambar tiada)" : "") + ", kemudian tekan Post di Facebook sendiri. Lepas itu tekan Dah post di sini." : "Kotak post tidak dijumpai. Teks dah disalin: buka kotak post dan tampal (Cmd+V).", result?.ok ? "ok" : "err");
  } catch {
    status("Muat semula halaman Facebook, kemudian cuba lagi. Teks dah disalin untuk ditampal.", "err");
  }
}

async function markDone(item) {
  try {
    const tab = await facebookTab();
    await api({ action: "done", id: item.id, url: tab?.url || "" });
    status("Ditanda sebagai dah post.", "ok");
    await loadQueue();
  } catch (error) {
    status(error.message, "err");
  }
}

async function sync() {
  const tab = await facebookTab();
  if (!tab) { status("Buka profile Facebook kau dalam tab ini dahulu, scroll supaya post kelihatan, kemudian tekan Sync.", "err"); return; }
  status("Membaca post di halaman ini...");
  try {
    const result = await chrome.tabs.sendMessage(tab.id, { type: "buddypilot-scan" });
    if (!result?.posts?.length) { status("Tiada post dibaca. Pastikan kau di profile sendiri dan post kelihatan di skrin.", "err"); return; }
    const saved = await api({ action: "sync", posts: result.posts });
    status(result.posts.length + " post dibaca: " + saved.updated + " dikemas kini, " + saved.added + " baru.", "ok");
  } catch (error) {
    status(error.status ? error.message : "Muat semula halaman Facebook, kemudian cuba lagi.", "err");
  }
}

$("save").addEventListener("click", async () => {
  token = $("token").value.trim();
  if (!/^bp_[A-Za-z0-9_-]{40,60}$/.test(token)) { status("Token tidak sah. Salin semula dari BuddyPilot.", "err"); return; }
  await chrome.storage.local.set({ token });
  $("token").value = "";
  show(true);
  loadQueue();
});
$("unpair").addEventListener("click", async () => {
  await chrome.storage.local.remove("token");
  token = "";
  show(false);
  status("");
});
$("sync").addEventListener("click", sync);

chrome.storage.local.get("token").then((saved) => {
  token = saved.token || "";
  show(Boolean(token));
  if (token) loadQueue();
});
