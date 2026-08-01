const { supabaseRequest } = require("./supabase-db");

const SERVICE_STATUSES = new Set(["active", "paused", "completed"]);
const TASK_STATUSES = new Set(["todo", "in_progress", "done", "cancelled"]);
const TASK_PRIORITIES = new Set(["low", "normal", "high", "urgent"]);

function text(value, max = 500) {
  return String(value || "").trim().slice(0, max);
}

function date(value) {
  const clean = text(value, 10);
  if (!clean) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(clean)) throw new Error("Tarikh tidak sah.");
  return clean;
}

function money(value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount < 0) throw new Error("Amaun mesti 0 atau lebih.");
  return Math.round(amount * 100) / 100;
}

function uuid(value, label) {
  const clean = text(value, 40);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(clean)) {
    throw new Error(`${label} tidak sah.`);
  }
  return clean;
}

function clientCode(value) {
  const clean = text(value, 80).toUpperCase();
  if (!clean) throw new Error("Agency client wajib dipilih.");
  return clean;
}

function serviceRow(row) {
  return {
    id: row.id,
    clientCode: row.client_code,
    name: row.name || "",
    monthlyFee: Number(row.monthly_fee || 0),
    status: row.status || "active",
    startDate: row.start_date || "",
    renewalDate: row.renewal_date || "",
    owner: row.owner || "",
    notes: row.notes || "",
    createdAt: row.created_at || "",
    updatedAt: row.updated_at || "",
  };
}

function taskRow(row) {
  return {
    id: row.id,
    clientCode: row.client_code,
    serviceId: row.service_id || "",
    title: row.title || "",
    dueDate: row.due_date || "",
    priority: row.priority || "normal",
    status: row.status || "todo",
    owner: row.owner || "",
    notes: row.notes || "",
    completedAt: row.completed_at || "",
    createdAt: row.created_at || "",
    updatedAt: row.updated_at || "",
  };
}

async function listAgencyOperations(code = "") {
  const filter = code ? `&client_code=eq.${encodeURIComponent(clientCode(code))}` : "";
  const [serviceRows, taskRows] = await Promise.all([
    supabaseRequest(`agency_services?select=*&order=created_at.desc${filter}`),
    supabaseRequest(`agency_tasks?select=*&order=due_date.asc.nullslast,created_at.desc${filter}`),
  ]);
  return {
    services: (serviceRows || []).map(serviceRow),
    tasks: (taskRows || []).map(taskRow),
  };
}

async function createAgencyService(value = {}) {
  const name = text(value.name, 160);
  if (!name) throw new Error("Nama service wajib diisi.");
  const status = text(value.status, 20) || "active";
  if (!SERVICE_STATUSES.has(status)) throw new Error("Status service tidak sah.");
  const rows = await supabaseRequest("agency_services", {
    method: "POST",
    prefer: "return=representation",
    body: [{
      client_code: clientCode(value.clientCode),
      name,
      monthly_fee: money(value.monthlyFee),
      status,
      start_date: date(value.startDate),
      renewal_date: date(value.renewalDate),
      owner: text(value.owner, 120),
      notes: text(value.notes, 2000),
    }],
  });
  return serviceRow(rows?.[0] || {});
}

async function updateAgencyService(value = {}) {
  const id = uuid(value.id, "Service ID");
  const patch = {};
  if (value.name !== undefined) {
    patch.name = text(value.name, 160);
    if (!patch.name) throw new Error("Nama service wajib diisi.");
  }
  if (value.monthlyFee !== undefined) patch.monthly_fee = money(value.monthlyFee);
  if (value.status !== undefined) {
    patch.status = text(value.status, 20);
    if (!SERVICE_STATUSES.has(patch.status)) throw new Error("Status service tidak sah.");
  }
  if (value.startDate !== undefined) patch.start_date = date(value.startDate);
  if (value.renewalDate !== undefined) patch.renewal_date = date(value.renewalDate);
  if (value.owner !== undefined) patch.owner = text(value.owner, 120);
  if (value.notes !== undefined) patch.notes = text(value.notes, 2000);
  const rows = await supabaseRequest(`agency_services?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    prefer: "return=representation",
    body: patch,
  });
  if (!rows?.[0]) throw new Error("Service tidak dijumpai.");
  return serviceRow(rows[0]);
}

async function createAgencyTask(value = {}) {
  const title = text(value.title, 240);
  if (!title) throw new Error("Task wajib diisi.");
  const status = text(value.status, 20) || "todo";
  const priority = text(value.priority, 20) || "normal";
  if (!TASK_STATUSES.has(status)) throw new Error("Status task tidak sah.");
  if (!TASK_PRIORITIES.has(priority)) throw new Error("Priority task tidak sah.");
  const rows = await supabaseRequest("agency_tasks", {
    method: "POST",
    prefer: "return=representation",
    body: [{
      client_code: clientCode(value.clientCode),
      service_id: value.serviceId ? uuid(value.serviceId, "Service ID") : null,
      title,
      due_date: date(value.dueDate),
      priority,
      status,
      owner: text(value.owner, 120),
      notes: text(value.notes, 2000),
      completed_at: status === "done" ? new Date().toISOString() : null,
    }],
  });
  return taskRow(rows?.[0] || {});
}

async function updateAgencyTask(value = {}) {
  const id = uuid(value.id, "Task ID");
  const patch = {};
  if (value.title !== undefined) {
    patch.title = text(value.title, 240);
    if (!patch.title) throw new Error("Task wajib diisi.");
  }
  if (value.dueDate !== undefined) patch.due_date = date(value.dueDate);
  if (value.priority !== undefined) {
    patch.priority = text(value.priority, 20);
    if (!TASK_PRIORITIES.has(patch.priority)) throw new Error("Priority task tidak sah.");
  }
  if (value.status !== undefined) {
    patch.status = text(value.status, 20);
    if (!TASK_STATUSES.has(patch.status)) throw new Error("Status task tidak sah.");
    patch.completed_at = patch.status === "done" ? new Date().toISOString() : null;
  }
  if (value.owner !== undefined) patch.owner = text(value.owner, 120);
  if (value.notes !== undefined) patch.notes = text(value.notes, 2000);
  if (value.serviceId !== undefined) patch.service_id = value.serviceId ? uuid(value.serviceId, "Service ID") : null;
  const rows = await supabaseRequest(`agency_tasks?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    prefer: "return=representation",
    body: patch,
  });
  if (!rows?.[0]) throw new Error("Task tidak dijumpai.");
  return taskRow(rows[0]);
}

module.exports = {
  createAgencyService,
  createAgencyTask,
  listAgencyOperations,
  updateAgencyService,
  updateAgencyTask,
};
