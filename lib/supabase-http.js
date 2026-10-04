const TIMEOUT_MS = 10000;
function serviceError(message, statusCode = 503) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}
async function request(url, options = {}) {
  const { binary = false, ...fetchOptions } = options;
  const method = String(options.method || "GET").toUpperCase();
  // Only reads may be retried: a failed write could already have committed.
  const retries = method === "GET" || method === "HEAD" ? 1 : 0;
  for (let attempt = 0; ; attempt++) {
    let response;
    try {
      response = await fetch(url, {
        ...fetchOptions,
        signal: options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(TIMEOUT_MS)]) : AbortSignal.timeout(TIMEOUT_MS),
      });
      // Consume inside the timeout window, including slow response bodies.
      const data = await response.arrayBuffer();
      if (response.ok)
        return binary
          ? { response, data }
          : { response, text: Buffer.from(data).toString("utf8") };
      const text = Buffer.from(data).toString("utf8");
      if (attempt < retries && [502, 503, 504].includes(response.status))
        continue;
      let detail = text;
      let upstreamCode = "";
      try {
        const data = JSON.parse(text);
        upstreamCode = data.code || "";
        detail = data.message || data.details || data.error || text;
      } catch {
        /* Non-JSON upstream errors. */
      }
      const error = serviceError(
        /<\/?(?:html|!doctype)/i.test(detail) ? `Supabase tidak tersedia (HTTP ${response.status}). Semak status project dan cuba semula.` : detail || `Supabase request failed (${response.status}).`,
        response.status === 429 ? 429 : response.status >= 500 ? 503 : 502,
      );
      error.upstreamStatus = response.status;
      error.upstreamCode = upstreamCode;
      throw error;
    } catch (error) {
      if (error.upstreamStatus) throw error;
      if (attempt < retries) continue;
      throw serviceError(
        error.name === "TimeoutError" || error.name === "AbortError"
          ? "Supabase mengambil masa terlalu lama. Cuba semula."
          : "Tidak dapat menghubungi Supabase. Cuba semula.",
      );
    }
  }
}
module.exports = { request };
