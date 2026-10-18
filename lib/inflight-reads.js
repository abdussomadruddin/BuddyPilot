const { createHash } = require("node:crypto");

function createInflightReads() {
  const pending = new Map();
  return {
    invalidate() { pending.clear(); },
    async run(scope, path, operation) {
      const key = createHash("sha256").update(JSON.stringify([scope, path])).digest("hex");
      let work = pending.get(key);
      if (!work) {
        work = Promise.resolve().then(operation);
        pending.set(key, work);
      }
      try {
        // Results are isolated per caller and never cached after completion.
        return structuredClone(await work);
      } finally {
        if (pending.get(key) === work) pending.delete(key);
      }
    },
  };
}

module.exports = { createInflightReads };
