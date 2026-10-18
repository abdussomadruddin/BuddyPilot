const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

test("precomputed similarity retains exact text comparison scores", () => {
  const { semanticTokens, semanticSimilarity } = require("../lib/postpilot-pattern-engine");
  for (const a of ["", "aku nak belajar ads hari ini", "test https://example.com satu dua tiga empat"]) {
    for (const b of ["", "aku nak belajar ads esok", a]) {
      assert.equal(semanticSimilarity(semanticTokens(a), semanticTokens(b)), semanticSimilarity(a, b));
    }
  }
});

test("router loads only the requested handler and rejects unknown routes", async () => {
  const loaded = [];
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../api/app.js"), "utf8"), {
    module, URL,
    require(name) { loaded.push(name); return async () => "handled"; },
  });
  assert.equal(loaded.length, 0);
  assert.equal(await module.exports({ url: "/api/postpilot-extension/claim" }, {}), "handled");
  assert.deepEqual(loaded, ["../api_handlers/postpilot-extension/claim"]);
  const response = { setHeader() {}, end(value) { this.body = value; } };
  await module.exports({ url: "/api/unknown" }, response);
  assert.equal(response.statusCode, 404);
  assert.equal(loaded.length, 1);
  await module.exports({ url: "/?route=login" }, {});
  assert.equal(loaded[1], "../api_handlers/login");
});

test("invoice helpers do not load PDF or Google SDKs at module initialization", () => {
  const loaded = [];
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../lib/invoices.js"), "utf8"), {
    module, Buffer, console, process,
    require(name) {
      loaded.push(name);
      if (name.startsWith("node:")) return require(name);
      if (name === "pdfkit" || name === "googleapis") throw new Error("Heavy import at initialization");
      return {};
    },
  });
  assert.ok(!loaded.includes("pdfkit"));
  assert.ok(!loaded.includes("googleapis"));
  assert.equal(typeof module.exports.generateInvoicePdf, "function");
});
