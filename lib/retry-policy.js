const TRANSIENT_STATUS = new Set([408, 425, 429]);

function errorStatus(error) {
  const value = Number(error?.statusCode || error?.status || error?.response?.status || 0);
  return Number.isFinite(value) ? value : 0;
}

function isTransientError(error) {
  const status = errorStatus(error);
  if (TRANSIENT_STATUS.has(status) || status >= 500) return true;
  const message = String(error?.message || error || "");
  return /AbortError|timeout|timed out|fetch failed|network|socket|ECONN|ECONNRESET|ENOTFOUND|EAI_AGAIN|HTTP (408|425|429|5\d\d)|rate limit|too many requests/i.test(message);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withTransientRetry(operation, {
  retries = 2,
  delays = [1000, 3000],
  onRetry = null,
} = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await operation({ attempt: attempt + 1, retry: attempt });
    } catch (error) {
      lastError = error;
      if (attempt >= retries || !isTransientError(error)) throw error;
      const waitMs = Math.max(0, Number(delays[attempt] ?? delays.at(-1) ?? 0));
      if (typeof onRetry === "function") await onRetry({ error, retry: attempt + 1, waitMs });
      if (waitMs) await delay(waitMs);
    }
  }
  throw lastError;
}

module.exports = {
  errorStatus,
  isTransientError,
  withTransientRetry,
};
