const FACEBOOK_HOME_URL = "https://www.facebook.com/";
const FACEBOOK_URL_PATTERN = /^https:\/\/(www\.)?facebook\.com\//;
const THREADS_HOME_URL = "https://www.threads.com/";
const THREADS_URL_PATTERN = /^https:\/\/(www\.)?threads\.(com|net)\//;
const THREADS_LAUNCH_KEY = "postpilotThreadsLaunchAutomationId";
const THREADS_STARTED_KEY = "postpilotThreadsStartedAutomationId";
const THREADS_COMPLETED_KEY = "postpilotThreadsCompletedAutomationId";
const THREADS_RUN_LOCK_KEY = "postpilotThreadsRunLock";
const POSTPILOT_BATCH_KEY = "postpilotCrossPlatformBatch";
const POSTPILOT_BATCH_ALARM = "postpilotCrossPlatformBatchNext";
const POSTPILOT_BATCH_FACEBOOK_TAB_KEY = "postpilotCrossBatchFacebookTabId";
const POSTPILOT_BATCH_THREADS_TAB_KEY = "postpilotCrossBatchThreadsTabId";
const REMOTE_CONFIG_KEY = "postpilotRemoteConfig";
const REMOTE_ACTIVE_JOB_KEY = "postpilotRemoteActiveJob";
const REMOTE_RECOVERY_KEY = "postpilotRemoteRecovery";
const REMOTE_RECOVERY_ALARM = "postpilotRemoteRecoveryAlarm";
const LEGACY_REMOTE_POLL_ALARM = "postpilotRemotePoll";
const REMOTE_RUN_SESSION_KEY = "postpilotRemoteRunSession";
const REMOTE_RUN_LEASE_MS = 7 * 60_000;
const REMOTE_RECOVERY_DELAYS_MS = [5_000, 15_000];
const DEFAULT_API_BASE_URL = "https://buddypilot.vercel.app";

let remoteClaimInFlight = false;
let remoteSocket = null;
let remoteHeartbeatTimer = null;
let remoteReconnectTimer = null;
let remoteSocketRef = 1;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getRemoteConfig() {
  const state = await chrome.storage.local.get(REMOTE_CONFIG_KEY);
  return state[REMOTE_CONFIG_KEY] || null;
}

async function getRemoteRunSession() {
  const state = await chrome.storage.session.get(REMOTE_RUN_SESSION_KEY);
  return state[REMOTE_RUN_SESSION_KEY] || null;
}

async function touchRemoteRunSession(jobId) {
  if (!jobId) return;
  await chrome.storage.session.set({
    [REMOTE_RUN_SESSION_KEY]: { jobId, touchedAt: Date.now() },
  });
}

async function clearRemoteRunSession() {
  await chrome.storage.session.remove(REMOTE_RUN_SESSION_KEY).catch(() => {});
}

async function remoteRunnerIsActive() {
  const session = await getRemoteRunSession();
  return Boolean(session?.jobId && Date.now() - Number(session.touchedAt || 0) < REMOTE_RUN_LEASE_MS);
}

async function remoteFetch(path, options = {}) {
  const remote = await getRemoteConfig();
  if (!remote?.token) throw new Error("Extension belum dipasangkan dengan BuddyPilot.");
  const response = await fetch(`${remote.apiBaseUrl || DEFAULT_API_BASE_URL}${path}`, {
    method: options.method || "POST",
    headers: {
      authorization: `Bearer ${remote.token}`,
      ...(options.body === undefined ? {} : { "content-type": "application/json" }),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  if (!response.ok) {
    let detail = "";
    try {
      detail = (await response.json()).error || "";
    } catch {
      detail = await response.text();
    }
    throw new Error(detail || `Remote API failed (${response.status}).`);
  }
  return options.raw ? response : response.json();
}

async function pairRemoteExtension(code, name = "Mac Chrome") {
  const response = await fetch(`${DEFAULT_API_BASE_URL}/api/postpilot-extension/pair`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code, name }),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok || !json.ok) throw new Error(json.error || "Pairing gagal.");
  const remote = {
    token: json.token,
    device: json.device,
    apiBaseUrl: json.apiBaseUrl || DEFAULT_API_BASE_URL,
    realtime: json.realtime || null,
    pairedAt: new Date().toISOString(),
  };
  await chrome.storage.local.set({
    [REMOTE_CONFIG_KEY]: remote,
    postpilotAutomationStatus: "Mac extension berjaya dipasangkan. Menunggu arahan phone.",
    postpilotLastError: "",
  });
  await chrome.alarms.clear(LEGACY_REMOTE_POLL_ALARM);
  connectRemoteRealtime().catch(() => {});
  processRemoteQueue().catch(() => {});
  return remote;
}

function clearRemoteSocket() {
  if (remoteHeartbeatTimer) clearInterval(remoteHeartbeatTimer);
  if (remoteReconnectTimer) clearTimeout(remoteReconnectTimer);
  remoteHeartbeatTimer = null;
  remoteReconnectTimer = null;
  if (remoteSocket) {
    try { remoteSocket.close(); } catch { /* Connection is already closed. */ }
  }
  remoteSocket = null;
}

async function connectRemoteRealtime() {
  const remote = await getRemoteConfig();
  if (!remote?.realtime?.url || !remote?.realtime?.key || !remote?.realtime?.topic) return;
  clearRemoteSocket();
  const wsUrl = remote.realtime.url.replace(/^http/, "ws") + `/realtime/v1/websocket?apikey=${encodeURIComponent(remote.realtime.key)}&vsn=1.0.0`;
  const socket = new WebSocket(wsUrl);
  remoteSocket = socket;
  const topic = `realtime:${remote.realtime.topic}`;
  socket.onopen = () => {
    const ref = String(remoteSocketRef++);
    socket.send(JSON.stringify({
      topic,
      event: "phx_join",
      payload: {
        config: { broadcast: { ack: false, self: false }, presence: { enabled: false }, postgres_changes: [], private: false },
        access_token: remote.realtime.key,
      },
      ref,
      join_ref: ref,
    }));
    processRemoteQueue().catch(() => {});
    remoteHeartbeatTimer = setInterval(() => {
      if (socket.readyState !== WebSocket.OPEN) return;
      socket.send(JSON.stringify({ topic: "phoenix", event: "heartbeat", payload: {}, ref: String(remoteSocketRef++) }));
    }, 20_000);
  };
  socket.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      const broadcastEvent = message.payload?.event || message.event;
      if (message.event === "broadcast" && broadcastEvent === "job-ready") processRemoteQueue().catch(() => {});
    } catch {
      // Polling remains the fallback for malformed or unsupported Realtime frames.
    }
  };
  socket.onclose = () => {
    if (remoteHeartbeatTimer) clearInterval(remoteHeartbeatTimer);
    remoteHeartbeatTimer = null;
    remoteSocket = null;
    remoteReconnectTimer = setTimeout(() => connectRemoteRealtime().catch(() => {}), 5_000);
  };
}

async function clearLegacyRemotePolling() {
  await chrome.alarms.clear(LEGACY_REMOTE_POLL_ALARM);
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

async function hydrateRemoteImage(jobId, post, index) {
  const response = post.image?.url
    ? await fetch(post.image.url)
    : await remoteFetch(`/api/postpilot-extension/image?job_id=${encodeURIComponent(jobId)}&index=${index}`, { method: "GET", raw: true });
  if (!response.ok) throw new Error(`Gagal muat turun gambar hook (${response.status}).`);
  const type = response.headers.get("content-type") || post.image?.type || "image/jpeg";
  const dataUrl = `data:${type};base64,${arrayBufferToBase64(await response.arrayBuffer())}`;
  return { id: post.image?.id, name: post.image?.name || `post-hook-${index + 1}.jpg`, type, dataUrl };
}

async function updateRemoteProgress(jobId, progress) {
  await touchRemoteRunSession(jobId);
  const response = await remoteFetch("/api/postpilot-extension/progress", { body: { job_id: jobId, progress } });
  if (response.cancelRequested) {
    if (!response.terminalStatus) {
      await remoteFetch("/api/postpilot-extension/complete", { body: { job_id: jobId, status: "cancelled", progress: { ...progress, message: "Automation dibatalkan dari phone." } } });
    }
    await chrome.storage.local.remove(REMOTE_ACTIVE_JOB_KEY);
    await clearRemoteRunSession();
  }
  return Boolean(response.cancelRequested);
}

async function completeRemoteJob(jobId, progress = {}) {
  await remoteFetch("/api/postpilot-extension/complete", { body: { job_id: jobId, status: "completed", progress } });
  await clearRemoteRecovery();
  await chrome.storage.local.remove(REMOTE_ACTIVE_JOB_KEY);
  await clearRemoteRunSession();
}

async function failRemoteJob(jobId, error, progress = {}) {
  if (!jobId) return;
  await remoteFetch("/api/postpilot-extension/fail", {
    body: { job_id: jobId, error: error?.message || String(error), progress },
  }).catch(() => {});
  await clearRemoteRecovery();
  await chrome.storage.local.remove(REMOTE_ACTIVE_JOB_KEY);
  await clearRemoteRunSession();
}

function remoteFailureClass(error) {
  const message = String(error?.message || error || "");
  if (/unauthori[sz]ed|forbidden|permission|login|log in|selector|composer|button|caption.*duplicate|caption.*clean|gambar.*ready|belum siap|tidak dijumpai|not found/i.test(message)) {
    return "manual";
  }
  if (/timeout|timed out|fetch failed|network|socket|ECONN|ENOTFOUND|EAI_AGAIN|HTTP (408|425|429|5\d\d)|Remote API failed \((408|425|429|5\d\d)\)|Receiving end does not exist|tab.*closed|frame.*removed/i.test(message)) {
    return "transient";
  }
  return "manual";
}

async function clearRemoteRecovery() {
  await chrome.alarms.clear(REMOTE_RECOVERY_ALARM);
  await chrome.storage.local.remove(REMOTE_RECOVERY_KEY);
}

async function scheduleRemoteRecovery({ jobId, error, progress = {}, kind }) {
  if (!jobId || remoteFailureClass(error) !== "transient") return false;
  const state = await chrome.storage.local.get(REMOTE_RECOVERY_KEY);
  const previous = state[REMOTE_RECOVERY_KEY];
  const identity = `${jobId}:${Number(progress.itemIndex) || 0}:${progress.resumePhase || progress.phase || kind}`;
  const attempt = previous?.identity === identity ? Number(previous.attempt || 0) + 1 : 1;
  if (attempt > REMOTE_RECOVERY_DELAYS_MS.length) return false;
  const waitMs = REMOTE_RECOVERY_DELAYS_MS[attempt - 1];
  const recovery = {
    identity,
    jobId,
    kind,
    attempt,
    progress,
    error: error?.message || String(error),
    nextRetryAt: Date.now() + waitMs,
  };
  await chrome.storage.local.set({
    [REMOTE_RECOVERY_KEY]: recovery,
    postpilotLastError: "",
    postpilotAutomationStatus: `Auto recovery ${attempt}/2 dalam ${Math.ceil(waitMs / 1000)}s...`,
  });
  await updateRemoteProgress(jobId, {
    ...progress,
    recoveryAttempt: attempt,
    failureClass: "transient",
    nextRetryAt: new Date(recovery.nextRetryAt).toISOString(),
    message: `Auto recovery ${attempt}/2 dijadualkan.`,
  }).catch(() => {});
  await chrome.alarms.clear(REMOTE_RECOVERY_ALARM);
  chrome.alarms.create(REMOTE_RECOVERY_ALARM, { when: recovery.nextRetryAt });
  return true;
}

async function resumeRemoteRecovery() {
  const state = await chrome.storage.local.get([REMOTE_RECOVERY_KEY, "currentDraft"]);
  const recovery = state[REMOTE_RECOVERY_KEY];
  if (!recovery?.jobId) return;
  await chrome.storage.local.set({ postpilotAutomationStatus: `Auto recovery ${recovery.attempt}/2 sedang berjalan...` });
  if (recovery.kind === "cross-platform") {
    const batch = await getPostPilotBatch();
    if (!batch?.remoteJobId || batch.remoteJobId !== recovery.jobId) throw new Error("State batch recovery tidak dijumpai.");
    batch.phase = recovery.progress.resumePhase === "threads" ? "threads" : "facebook";
    await chrome.storage.local.set({ [POSTPILOT_BATCH_KEY]: batch });
    if (batch.phase === "threads") await startBatchThreads();
    else await startBatchFacebook();
    return;
  }
  const draft = state.currentDraft;
  if (!draft?.remoteJobId || draft.remoteJobId !== recovery.jobId) throw new Error("State Threads recovery tidak dijumpai.");
  draft.resumeIndex = Math.max(0, Number(recovery.progress.itemIndex) || 0);
  await chrome.storage.local.set({
    currentDraft: draft,
    [THREADS_LAUNCH_KEY]: "",
    [THREADS_STARTED_KEY]: "",
    [THREADS_COMPLETED_KEY]: "",
    [THREADS_RUN_LOCK_KEY]: null,
  });
  await openThreadsAndRunAutomation(draft.automationId, "POSTPILOT_THREADS_TEXT_BATCH_POST");
}

async function startRemoteFacebookThreads(job) {
  const posts = [];
  for (let index = 0; index < job.payload.posts.length; index += 1) {
    const post = job.payload.posts[index];
    posts.push({ ...post, image: await hydrateRemoteImage(job.id, post, index) });
  }
  const saved = await getPostPilotBatch();
  const batch = saved?.remoteJobId === job.id ? saved : {
    automationId: `remote-${job.id}`,
    remoteJobId: job.id,
    posts,
    index: Math.max(0, Number(job.progress?.itemIndex) || 0),
    phase: ["facebook", "threads", "waiting"].includes(job.progress?.phase) ? job.progress.phase : "facebook",
    batchDelayMs: Math.max(30_000, Number(job.payload.batchDelayMs) || 30_000),
  };
  batch.posts = posts;
  batch.index = Math.max(0, Math.min(posts.length - 1, Number(job.progress?.itemIndex ?? batch.index) || 0));
  if (batch.phase === "paused" || batch.phase === "completed") {
    batch.phase = job.progress?.resumePhase || batch.resumePhase || "facebook";
  }
  await chrome.storage.local.set({ [REMOTE_ACTIVE_JOB_KEY]: job, [POSTPILOT_BATCH_KEY]: batch });
  if (batch.phase === "threads") await startBatchThreads();
  else if (batch.phase === "waiting") {
    await chrome.alarms.clear(POSTPILOT_BATCH_ALARM);
    chrome.alarms.create(POSTPILOT_BATCH_ALARM, { when: Date.now() + batch.batchDelayMs });
  } else await startBatchFacebook();
}

async function startRemoteThreadsText(job) {
  const posts = job.payload.posts || [];
  const draft = {
    id: `remote-${job.id}`,
    automationId: `remote-${job.id}`,
    remoteJobId: job.id,
    createdAt: new Date().toISOString(),
    posts,
    postText: posts[0]?.postText || "",
    autoPublish: true,
    threadsTextBatch: true,
    batchDelayMs: Math.max(30_000, Number(job.payload.batchDelayMs) || 30_000),
    resumeIndex: Math.max(0, Number(job.progress?.itemIndex) || 0),
  };
  await chrome.storage.local.set({
    [REMOTE_ACTIVE_JOB_KEY]: job,
    currentDraft: draft,
    [THREADS_LAUNCH_KEY]: "",
    [THREADS_STARTED_KEY]: "",
    [THREADS_COMPLETED_KEY]: "",
    [THREADS_RUN_LOCK_KEY]: null,
  });
  const cancelled = await updateRemoteProgress(job.id, { index: draft.resumeIndex, itemIndex: draft.resumeIndex, total: posts.length, phase: "threads", message: "Chrome Mac membuka Threads." });
  if (cancelled) return;
  await openThreadsAndRunAutomation(draft.automationId, "POSTPILOT_THREADS_TEXT_BATCH_POST");
}

async function processRemoteQueue() {
  if (remoteClaimInFlight) return;
  const remote = await getRemoteConfig();
  if (!remote?.token) return;
  if (await remoteRunnerIsActive()) return;
  remoteClaimInFlight = true;
  try {
    const response = await remoteFetch("/api/postpilot-extension/claim", { body: {} });
    const job = response.job;
    if (!job) {
      await chrome.storage.local.remove(REMOTE_ACTIVE_JOB_KEY);
      await clearRemoteRunSession();
      return;
    }
    await touchRemoteRunSession(job.id);
    await chrome.storage.local.set({ [REMOTE_ACTIVE_JOB_KEY]: job, postpilotAutomationStatus: "Remote job diterima dari phone." });
    if (job.type === "facebook_threads") await startRemoteFacebookThreads(job);
    else if (job.type === "threads_text") await startRemoteThreadsText(job);
  } catch (error) {
    const state = await chrome.storage.local.get(REMOTE_ACTIVE_JOB_KEY);
    const activeJob = state[REMOTE_ACTIVE_JOB_KEY];
    if (activeJob?.id) {
      const progress = {
        ...(activeJob.progress || {}),
        itemIndex: Number(activeJob.progress?.itemIndex) || 0,
        resumePhase: activeJob.progress?.resumePhase || activeJob.progress?.phase || (activeJob.type === "threads_text" ? "threads" : "facebook"),
      };
      const recovering = await scheduleRemoteRecovery({
        jobId: activeJob.id,
        error,
        progress,
        kind: activeJob.type === "threads_text" ? "threads-text" : "cross-platform",
      });
      if (!recovering) {
        const failureClass = remoteFailureClass(error);
        await failRemoteJob(activeJob.id, error, { ...progress, failureClass, recoveryAttempt: failureClass === "transient" ? 2 : 0 });
      }
    }
    await chrome.storage.local.set({
      postpilotLastError: activeJob ? "" : error?.message || String(error),
      postpilotAutomationStatus: activeJob ? "Remote automation sedang cuba pulih." : "Remote queue tidak dapat diperiksa. Realtime akan cuba semasa reconnect.",
    });
  } finally {
    remoteClaimInFlight = false;
  }
}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0] || null;
}

async function getReusableTab(storageKey, url, pattern) {
  const state = await chrome.storage.local.get(storageKey);
  const id = Number(state[storageKey]);
  if (id) {
    try {
      const tab = await chrome.tabs.get(id);
      if (tab?.id && pattern.test(tab.url || "")) {
        await chrome.tabs.update(tab.id, { active: true });
        return tab;
      }
    } catch {
      // Closed tabs are recreated below.
    }
  }
  const tab = await chrome.tabs.create({ url, active: true });
  if (!tab?.id) throw new Error(`Gagal buka tab ${url}.`);
  await chrome.storage.local.set({ [storageKey]: tab.id });
  return tab;
}

async function getPostPilotBatch() {
  const state = await chrome.storage.local.get(POSTPILOT_BATCH_KEY);
  return state[POSTPILOT_BATCH_KEY] || null;
}

async function savePostPilotBatch(batch, status) {
  await chrome.storage.local.set({
    [POSTPILOT_BATCH_KEY]: batch,
    postpilotAutomationStatus: status || `Post Pilot batch ${batch.index + 1}/${batch.posts.length}: ${batch.phase}`,
    postpilotLastError: "",
  });
  if (batch.remoteJobId) {
    const cancelRequested = await updateRemoteProgress(batch.remoteJobId, {
      index: batch.index + 1,
      itemIndex: batch.index,
      total: batch.posts.length,
      phase: batch.phase,
      message: status || `Post Pilot ${batch.index + 1}/${batch.posts.length}: ${batch.phase}`,
    });
    if (cancelRequested) {
      batch.phase = "paused";
      await chrome.storage.local.set({ [POSTPILOT_BATCH_KEY]: batch, postpilotAutomationStatus: "Remote automation dibatalkan dari phone." });
      return true;
    }
  }
  return false;
}

function currentBatchDraft(batch) {
  const post = batch?.posts?.[batch.index];
  if (!post) throw new Error("Batch post tidak dijumpai.");
  return {
    ...post,
    id: `${batch.automationId}-${batch.index + 1}`,
    automationId: `${batch.automationId}-${batch.index + 1}`,
    remoteJobId: batch.remoteJobId || "",
    createdAt: new Date().toISOString(),
    autoPublish: true,
  };
}

async function startBatchFacebook() {
  const batch = await getPostPilotBatch();
  if (!batch || batch.phase === "completed" || batch.phase === "paused") return;
  const draft = currentBatchDraft(batch);
  batch.phase = "facebook";
  if (await savePostPilotBatch(batch, `Post Pilot ${batch.index + 1}/${batch.posts.length}: posting ke Facebook...`)) return;
  await chrome.storage.local.set({
    currentDraft: draft,
    postpilotStartedAutomationId: "",
    postpilotCompletedAutomationId: "",
    postpilotRunLock: null,
  });
  const tab = await getReusableTab(POSTPILOT_BATCH_FACEBOOK_TAB_KEY, FACEBOOK_HOME_URL, FACEBOOK_URL_PATTERN);
  await sendToFacebookTabWithRetry(tab.id, "POSTPILOT_AUTO_POST");
}

async function startBatchThreads() {
  const batch = await getPostPilotBatch();
  if (!batch || batch.phase === "completed" || batch.phase === "paused") return;
  const draft = currentBatchDraft(batch);
  batch.phase = "threads";
  if (await savePostPilotBatch(batch, `Post Pilot ${batch.index + 1}/${batch.posts.length}: posting ke Threads...`)) return;
  await chrome.storage.local.set({
    currentDraft: draft,
    [THREADS_LAUNCH_KEY]: "",
    [THREADS_STARTED_KEY]: "",
    [THREADS_COMPLETED_KEY]: "",
    [THREADS_RUN_LOCK_KEY]: null,
  });
  const tab = await getReusableTab(POSTPILOT_BATCH_THREADS_TAB_KEY, THREADS_HOME_URL, THREADS_URL_PATTERN);
  await sendToThreadsTabWithRetry(tab.id, "POSTPILOT_THREADS_AUTO_POST");
}

async function scheduleNextBatchPost(batch) {
  if (batch.index + 1 >= batch.posts.length) {
    batch.phase = "completed";
    await savePostPilotBatch(batch, `Post Pilot batch selesai: ${batch.posts.length}/${batch.posts.length} posted.`);
    if (batch.remoteJobId) {
      await completeRemoteJob(batch.remoteJobId, {
        index: batch.posts.length,
        itemIndex: batch.posts.length,
        total: batch.posts.length,
        phase: "completed",
        message: `${batch.posts.length}/${batch.posts.length} Facebook + Threads post selesai.`,
      });
    }
    return;
  }
  batch.phase = "waiting";
  const delayMs = Math.max(30_000, Number(batch.batchDelayMs) || 30_000);
  await savePostPilotBatch(batch, `Post Pilot ${batch.index + 1}/${batch.posts.length} selesai. Post seterusnya dalam 30 saat.`);
  await chrome.alarms.clear(POSTPILOT_BATCH_ALARM);
  chrome.alarms.create(POSTPILOT_BATCH_ALARM, { when: Date.now() + delayMs });
}

async function sendToActiveFacebookTab(type) {
  const tab = await getActiveTab();
  if (!tab?.id) throw new Error("No active tab found.");
  if (!FACEBOOK_URL_PATTERN.test(tab.url || "")) {
    throw new Error("Open a Facebook tab first.");
  }
  return chrome.tabs.sendMessage(tab.id, { type });
}

async function sendToTabWithRetry(tabId, type, label) {
  let lastError = "";
  for (let attempt = 0; attempt < 90; attempt += 1) {
    try {
      const response = await chrome.tabs.sendMessage(tabId, { type });
      if (response?.ok) return response;
      if (/sedang jalan|already running/i.test(response?.error || "")) return { ok: true, message: response.error };
      lastError = response?.error || `${label} content script belum ready.`;
    } catch (error) {
      lastError = error?.message || String(error);
    }
    await chrome.storage.local.set({ postpilotAutomationStatus: `Waiting ${label} content script... attempt ${attempt + 1}` });
    await delay(1000);
  }
  throw new Error(lastError || "Post Pilot content script tidak respond.");
}

async function sendToFacebookTabWithRetry(tabId, type) {
  return sendToTabWithRetry(tabId, type, "Facebook");
}

async function sendToThreadsTabWithRetry(tabId, type) {
  return sendToTabWithRetry(tabId, type, "Threads");
}

async function openFacebookAndRunAutomation() {
  await chrome.storage.local.set({ postpilotAutomationStatus: "Opening Facebook..." });
  const tab = await chrome.tabs.create({ url: FACEBOOK_HOME_URL, active: true });
  if (!tab?.id) throw new Error("Gagal buka tab Facebook.");
  await chrome.storage.local.set({ postpilotAutomationStatus: "Facebook opened. Starting auto flow..." });
  await chrome.storage.local.set({ postpilotAutomationStatus: "Starting auto flow in Facebook..." });
  const response = await sendToFacebookTabWithRetry(tab.id, "POSTPILOT_AUTO_POST");
  await chrome.storage.local.set({ postpilotAutomationStatus: "Facebook auto flow started. Threads akan mula selepas Facebook post live." });
  return response;
}

async function openThreadsAndRunAutomation(automationId = "", command = "POSTPILOT_THREADS_AUTO_POST") {
  const state = await chrome.storage.local.get([THREADS_LAUNCH_KEY, THREADS_COMPLETED_KEY]);
  if (automationId && (state[THREADS_LAUNCH_KEY] === automationId || state[THREADS_COMPLETED_KEY] === automationId)) {
    return { ok: true, message: "Threads flow already started or completed." };
  }

  try {
    const isTextOnly = command === "POSTPILOT_THREADS_TEXT_ONLY_POST";
    const isTextBatch = command === "POSTPILOT_THREADS_TEXT_BATCH_POST";
    await chrome.storage.local.set({
      [THREADS_LAUNCH_KEY]: automationId || `threads-${Date.now()}`,
      postpilotAutomationStatus: isTextBatch
        ? "Opening Threads viral batch..."
        : isTextOnly
          ? "Opening Threads viral post..."
          : "Facebook post live. Opening Threads...",
      postpilotLastError: "",
    });
    const tab = await chrome.tabs.create({ url: THREADS_HOME_URL, active: true });
    if (!tab?.id) throw new Error("Gagal buka tab Threads.");
    await chrome.storage.local.set({
      postpilotAutomationStatus: isTextBatch
        ? "Starting Threads batch flow..."
        : isTextOnly
          ? "Starting Threads text-only flow..."
          : "Starting auto flow in Threads...",
    });
    const response = await sendToThreadsTabWithRetry(tab.id, command);
    await chrome.storage.local.set({
      postpilotAutomationStatus: isTextBatch
        ? "Threads batch flow started."
        : isTextOnly
          ? "Threads text-only flow started."
          : "Threads auto flow started.",
    });
    return response;
  } catch (error) {
    await chrome.storage.local.remove(THREADS_LAUNCH_KEY).catch(() => {});
    throw error;
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    if (message?.type === "PAIR_REMOTE_EXTENSION") {
      const remote = await pairRemoteExtension(message.code, message.name || "Mac Chrome");
      sendResponse({ ok: true, remote: { device: remote.device, pairedAt: remote.pairedAt, realtime: Boolean(remote.realtime) } });
      return;
    }

    if (message?.type === "GET_REMOTE_STATE") {
      const state = await chrome.storage.local.get([REMOTE_CONFIG_KEY, REMOTE_ACTIVE_JOB_KEY, "postpilotAutomationStatus", "postpilotLastError"]);
      const remote = state[REMOTE_CONFIG_KEY];
      sendResponse({
        ok: true,
        paired: Boolean(remote?.token),
        device: remote?.device || null,
        realtime: Boolean(remote?.realtime),
        activeJob: state[REMOTE_ACTIVE_JOB_KEY] || null,
        status: state.postpilotAutomationStatus || "",
        error: state.postpilotLastError || "",
      });
      return;
    }

    if (message?.type === "CHECK_REMOTE_NOW") {
      await processRemoteQueue();
      sendResponse({ ok: true, message: "Remote queue diperiksa." });
      return;
    }

    if (message?.type === "UNPAIR_REMOTE_EXTENSION") {
      clearRemoteSocket();
      await clearLegacyRemotePolling();
      await clearRemoteRecovery();
      await chrome.storage.local.remove([REMOTE_CONFIG_KEY, REMOTE_ACTIVE_JOB_KEY]);
      await clearRemoteRunSession();
      sendResponse({ ok: true, message: "Extension dibuang daripada pairing lokal." });
      return;
    }

    if (message?.type === "POSTPILOT_THREADS_BATCH_PROGRESS") {
      const state = await chrome.storage.local.get("currentDraft");
      const draft = state.currentDraft;
      if (!draft?.remoteJobId || message.automationId !== draft.automationId) {
        sendResponse({ ok: true, cancelRequested: false });
        return;
      }
      const cancelRequested = await updateRemoteProgress(draft.remoteJobId, {
        index: Number(message.index) || 0,
        itemIndex: Number(message.index) || 0,
        total: Number(message.total) || draft.posts?.length || 1,
        phase: "threads",
        message: message.message || `${message.index}/${message.total} Threads post selesai.`,
      });
      draft.resumeIndex = Math.max(0, Number(message.index) || 0);
      await chrome.storage.local.set({ currentDraft: draft });
      await clearRemoteRecovery();
      sendResponse({ ok: true, cancelRequested });
      return;
    }

    if (message?.type === "SAVE_POSTPILOT_BATCH_AND_OPEN_FACEBOOK") {
      const posts = Array.isArray(message.draft?.posts) ? message.draft.posts.slice(0, 5) : [];
      if (!posts.length || posts.length > 5) throw new Error("Post Pilot batch perlu ada 1 hingga 5 post.");
      if (posts.some((post) => !post?.postText || !post?.image?.dataUrl)) {
        throw new Error("Setiap post batch mesti ada caption dan gambar hook.");
      }
      const batch = {
        automationId: message.draft?.automationId || `postpilot-batch-${Date.now()}`,
        posts,
        index: 0,
        phase: "facebook",
        batchDelayMs: Math.max(30_000, Number(message.draft?.batchDelayMs) || 30_000),
      };
      await chrome.alarms.clear(POSTPILOT_BATCH_ALARM);
      await savePostPilotBatch(batch, `Post Pilot batch 1/${posts.length}: mula Facebook...`);
      await startBatchFacebook();
      sendResponse({ ok: true, message: `Post Pilot batch ${posts.length} sedang bermula.` });
      return;
    }

    if (message?.type === "SAVE_DRAFT_AND_OPEN_FACEBOOK") {
      const draft = {
        ...message.draft,
        automationId: message.draft?.automationId || `postpilot-auto-${Date.now()}`,
        autoPublish: true,
      };
      if (!draft?.postText) throw new Error("Draft is missing post text.");
      await chrome.storage.local.set({
        currentDraft: draft,
        postpilotStartedAutomationId: "",
        postpilotCompletedAutomationId: "",
        [THREADS_LAUNCH_KEY]: "",
        [THREADS_STARTED_KEY]: "",
        [THREADS_COMPLETED_KEY]: "",
        postpilotRunLock: null,
        [THREADS_RUN_LOCK_KEY]: null,
        postpilotLastError: "",
        postpilotAutomationStatus: "Draft saved. Preparing Facebook...",
      });
      const response = await openFacebookAndRunAutomation();
      sendResponse(response || { ok: true });
      return;
    }

    if (message?.type === "SAVE_THREADS_TEXT_ONLY_AND_OPEN_THREADS") {
      const draft = {
        ...message.draft,
        automationId: message.draft?.automationId || `postpilot-threads-text-${Date.now()}`,
        autoPublish: true,
        threadsTextOnly: true,
      };
      if (!draft?.postText) throw new Error("Draft is missing Threads post text.");
      await chrome.storage.local.set({
        currentDraft: draft,
        [THREADS_LAUNCH_KEY]: "",
        [THREADS_STARTED_KEY]: "",
        [THREADS_COMPLETED_KEY]: "",
        [THREADS_RUN_LOCK_KEY]: null,
        postpilotLastError: "",
        postpilotAutomationStatus: "Draft saved. Preparing Threads...",
      });
      const response = await openThreadsAndRunAutomation(draft.automationId, "POSTPILOT_THREADS_TEXT_ONLY_POST");
      sendResponse(response || { ok: true });
      return;
    }

    if (message?.type === "SAVE_THREADS_TEXT_BATCH_AND_OPEN_THREADS") {
      const posts = Array.isArray(message.draft?.posts) ? message.draft.posts.slice(0, 50) : [];
      if (!posts.length || posts.length > 50) throw new Error("Threads batch needs 1 to 50 posts.");
      if (posts.some((post) => !post?.postText)) throw new Error("Threads batch has empty post text.");
      const draft = {
        ...message.draft,
        posts,
        postText: posts[0].postText,
        automationId: message.draft?.automationId || `postpilot-threads-batch-${Date.now()}`,
        autoPublish: true,
        threadsTextBatch: true,
        batchDelayMs: Number(message.draft?.batchDelayMs) || 30000,
      };
      await chrome.storage.local.set({
        currentDraft: draft,
        [THREADS_LAUNCH_KEY]: "",
        [THREADS_STARTED_KEY]: "",
        [THREADS_COMPLETED_KEY]: "",
        [THREADS_RUN_LOCK_KEY]: null,
        postpilotLastError: "",
        postpilotAutomationStatus: "Draft batch saved. Preparing Threads...",
      });
      const response = await openThreadsAndRunAutomation(draft.automationId, "POSTPILOT_THREADS_TEXT_BATCH_POST");
      sendResponse(response || { ok: true });
      return;
    }

    if (message?.type === "POSTPILOT_FACEBOOK_DONE") {
      const batch = await getPostPilotBatch();
      const expectedId = batch ? `${batch.automationId}-${batch.index + 1}` : "";
      if (batch && batch.phase === "facebook" && message.automationId === expectedId) {
        await clearRemoteRecovery();
        await startBatchThreads();
        sendResponse({ ok: true, message: "Facebook siap. Teruskan Threads untuk item semasa." });
        return;
      }
      const response = await openThreadsAndRunAutomation(message.automationId || "");
      sendResponse(response || { ok: true });
      return;
    }

    if (message?.type === "POSTPILOT_THREADS_DONE") {
      const batch = await getPostPilotBatch();
      const expectedId = batch ? `${batch.automationId}-${batch.index + 1}` : "";
      if (batch && batch.phase === "threads" && message.automationId === expectedId) {
        await clearRemoteRecovery();
        await scheduleNextBatchPost(batch);
        sendResponse({ ok: true, message: "Threads siap. Batch dikemaskini." });
        return;
      }
      const state = await chrome.storage.local.get("currentDraft");
      if (state.currentDraft?.remoteJobId && message.automationId === state.currentDraft.automationId) {
        const total = state.currentDraft.posts?.length || 1;
        await completeRemoteJob(state.currentDraft.remoteJobId, {
          index: total,
          itemIndex: total,
          total,
          phase: "completed",
          message: `${total}/${total} Threads post selesai.`,
        });
      }
      await clearRemoteRecovery();
      await chrome.storage.local.set({
        [THREADS_COMPLETED_KEY]: message.automationId || "",
        postpilotAutomationStatus: message.threadsTextBatch
          ? "Threads viral batch selesai."
          : message.threadsTextOnly
            ? "Threads viral post selesai."
            : "Facebook + Threads flow selesai.",
      });
      sendResponse({ ok: true });
      return;
    }

    if (message?.type === "POSTPILOT_BATCH_FAILED") {
      const batch = await getPostPilotBatch();
      const expectedId = batch ? `${batch.automationId}-${batch.index + 1}` : "";
      if (batch && message.automationId === expectedId) {
        const failedPhase = batch.phase;
        batch.phase = "paused";
        batch.resumePhase = failedPhase;
        await chrome.storage.local.set({
          [POSTPILOT_BATCH_KEY]: batch,
          postpilotLastError: message.error || "Batch item gagal.",
          postpilotAutomationStatus: `Post Pilot ${batch.index + 1}/${batch.posts.length} gagal. Tekan retry di extension.`,
        });
        if (batch.remoteJobId) {
          const error = new Error(message.error || "Batch item gagal.");
          const progress = {
            index: batch.index + 1,
            itemIndex: batch.index,
            total: batch.posts.length,
            resumePhase: failedPhase,
            message: message.error || "Batch item gagal.",
          };
          const recovering = await scheduleRemoteRecovery({ jobId: batch.remoteJobId, error, progress, kind: "cross-platform" });
          if (!recovering) {
            const failureClass = remoteFailureClass(error);
            await failRemoteJob(batch.remoteJobId, error, { ...progress, failureClass, recoveryAttempt: failureClass === "transient" ? 2 : 0 });
          }
        }
      } else {
        const state = await chrome.storage.local.get("currentDraft");
        if (state.currentDraft?.remoteJobId && message.automationId === state.currentDraft.automationId) {
          const error = new Error(message.error || "Threads batch gagal.");
          const progress = {
            index: Number(message.index) || 0,
            itemIndex: Number(message.index) || 0,
            total: state.currentDraft.posts?.length || 1,
            resumePhase: "threads",
            message: message.error || "Threads batch gagal.",
          };
          state.currentDraft.resumeIndex = progress.itemIndex;
          await chrome.storage.local.set({ currentDraft: state.currentDraft });
          const recovering = await scheduleRemoteRecovery({ jobId: state.currentDraft.remoteJobId, error, progress, kind: "threads-text" });
          if (!recovering) {
            const failureClass = remoteFailureClass(error);
            await failRemoteJob(state.currentDraft.remoteJobId, error, { ...progress, failureClass, recoveryAttempt: failureClass === "transient" ? 2 : 0 });
          }
        }
      }
      sendResponse({ ok: true });
      return;
    }

    if (message?.type === "RESUME_POSTPILOT_BATCH") {
      const batch = await getPostPilotBatch();
      if (!batch || batch.phase !== "paused") throw new Error("Tiada Post Pilot batch yang sedang pause.");
      batch.phase = message.target === "threads" ? "threads" : "facebook";
      await savePostPilotBatch(batch, `Retry Post Pilot ${batch.index + 1}/${batch.posts.length}...`);
      if (batch.phase === "threads") await startBatchThreads();
      else await startBatchFacebook();
      sendResponse({ ok: true });
      return;
    }

    if (message?.type === "GET_CURRENT_DRAFT") {
      const { currentDraft, postpilotLastError, postpilotAutomationStatus } = await chrome.storage.local.get([
        "currentDraft",
        "postpilotLastError",
        "postpilotAutomationStatus",
      ]);
      sendResponse({
        ok: true,
        draft: currentDraft || null,
        lastError: postpilotLastError || "",
        automationStatus: postpilotAutomationStatus || "",
      });
      return;
    }

    if (message?.type === "OPEN_FACEBOOK") {
      await chrome.tabs.create({ url: FACEBOOK_HOME_URL });
      sendResponse({ ok: true });
      return;
    }

    if (message?.type === "FILL_ACTIVE_POST" || message?.type === "FILL_ACTIVE_COMMENT" || message?.type === "AUTO_POST_ACTIVE") {
      const result = await sendToActiveFacebookTab(message.type === "FILL_ACTIVE_COMMENT"
        ? "POSTPILOT_FILL_COMMENT"
        : message.type === "AUTO_POST_ACTIVE"
          ? "POSTPILOT_AUTO_POST"
          : "POSTPILOT_FILL_POST");
      sendResponse(result || { ok: true });
      return;
    }

    sendResponse({ ok: false, error: "Unknown message." });
  })().catch(async (error) => {
    await chrome.storage.local.set({
      postpilotLastError: error?.message || String(error),
      postpilotAutomationStatus: "Auto flow failed.",
    }).catch(() => {});
    sendResponse({ ok: false, error: error?.message || String(error) });
  });

  return true;
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === REMOTE_RECOVERY_ALARM) {
    resumeRemoteRecovery().catch(async (error) => {
      const state = await chrome.storage.local.get(REMOTE_RECOVERY_KEY);
      const recovery = state[REMOTE_RECOVERY_KEY];
      if (!recovery?.jobId) return;
      const recovering = await scheduleRemoteRecovery({
        jobId: recovery.jobId,
        error,
        progress: recovery.progress,
        kind: recovery.kind,
      });
      if (!recovering) {
        const failureClass = remoteFailureClass(error);
        await failRemoteJob(recovery.jobId, error, {
          ...recovery.progress,
          failureClass,
          recoveryAttempt: failureClass === "transient" ? Math.max(2, Number(recovery.attempt) || 0) : Number(recovery.attempt) || 0,
        });
      }
    });
    return;
  }
  if (alarm.name !== POSTPILOT_BATCH_ALARM) return;
  (async () => {
    const batch = await getPostPilotBatch();
    if (!batch || batch.phase !== "waiting") return;
    batch.index += 1;
    batch.phase = "facebook";
    await savePostPilotBatch(batch, `Post Pilot ${batch.index + 1}/${batch.posts.length}: mula Facebook...`);
    await startBatchFacebook();
  })().catch(async (error) => {
    const batch = await getPostPilotBatch();
    if (batch) {
      const failedPhase = batch.phase;
      batch.phase = "paused";
      batch.resumePhase = failedPhase;
      await chrome.storage.local.set({
        [POSTPILOT_BATCH_KEY]: batch,
        postpilotLastError: error?.message || String(error),
        postpilotAutomationStatus: "Post Pilot batch berhenti. Retry item semasa dari extension.",
      });
      if (batch.remoteJobId) {
        await failRemoteJob(batch.remoteJobId, error, {
          index: batch.index + 1,
          itemIndex: batch.index,
          total: batch.posts.length,
          resumePhase: failedPhase,
          message: error?.message || String(error),
        });
      }
    }
  });
});

chrome.runtime.onInstalled.addListener(() => {
  clearLegacyRemotePolling().then(() => connectRemoteRealtime()).then(() => processRemoteQueue()).catch(() => {});
});

chrome.runtime.onStartup.addListener(() => {
  clearLegacyRemotePolling().then(() => connectRemoteRealtime()).then(() => processRemoteQueue()).catch(() => {});
});

clearLegacyRemotePolling().then(() => connectRemoteRealtime()).then(() => processRemoteQueue()).catch(() => {});
