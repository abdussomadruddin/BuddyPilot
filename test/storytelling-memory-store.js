// In-memory stand-in for the storytelling_items table, with the same interface
// as createStore() in lib/storytelling.js. Used by tests and the local UI stub.
const crypto = require("node:crypto");

function createMemoryStore() {
  const rows = [];
  let tick = Date.parse("2026-11-14T00:00:00Z");
  const flat = (row) => ({ id: row.id, kind: row.kind, parentId: row.parentId || "", title: row.title, status: row.status, createdAt: row.createdAt, updatedAt: row.updatedAt, ...row.data });
  const find = (kind, id) => {
    const row = rows.find((item) => item.kind === kind && item.id === id);
    if (!row) throw Object.assign(new Error("Rekod tidak dijumpai."), { statusCode: 404, code: "not_found" });
    return row;
  };
  return {
    rows,
    async list(kind, { limit = 200, parentId = "" } = {}) {
      return rows.filter((row) => row.kind === kind && (!parentId || row.parentId === parentId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit).map(flat);
    },
    async get(kind, id) { return flat(find(kind, id)); },
    async insert(kind, { title = "", status = "", parentId = "", data = {} }) {
      const stamp = new Date((tick += 1000)).toISOString();
      const row = { id: crypto.randomUUID(), kind, parentId, title, status, data, createdAt: stamp, updatedAt: stamp };
      rows.push(row);
      return flat(row);
    },
    async update(kind, id, { title, status, data }) {
      const row = find(kind, id);
      if (title !== undefined) row.title = title;
      if (status !== undefined) row.status = status;
      if (data !== undefined) row.data = data;
      row.updatedAt = new Date((tick += 1000)).toISOString();
      return flat(row);
    },
    async remove(kind, id) {
      const index = rows.findIndex((row) => row.kind === kind && row.id === id);
      if (index >= 0) rows.splice(index, 1);
      for (let i = rows.length - 1; i >= 0; i -= 1) if (rows[i].parentId === id) rows.splice(i, 1);
    },
    async countSince(kind, sinceIso) { return rows.filter((row) => row.kind === kind && row.createdAt >= sinceIso).length; },
  };
}

module.exports = { createMemoryStore };
