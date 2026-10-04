const originals = new WeakMap();
module.exports = function setEnv(t, key, value) {
  if (!originals.has(t)) {
    const values = new Map();
    originals.set(t, values);
    t.after(() => {
      for (const [name, original] of values) {
        if (original === undefined) delete process.env[name];
        else process.env[name] = original;
      }
    });
  }
  const values = originals.get(t);
  if (!values.has(key)) values.set(key, process.env[key]);
  process.env[key] = value;
};
