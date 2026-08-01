const { supabaseRequest } = require("./supabase-db");

const SERVICE_STATUSES = new Set(["active", "paused", "completed"]);
const TASK_STATUSES = new Set(["todo", "in_progress", "done", "cancelled"]);
const TASK_PRIORITIES = new Set(["low", "normal", "high", "urgent"]);
const WORK_TYPES = new Set(["general", "report", "invoice", "creative", "campaign_review"]);
const TEMPLATE_CADENCES = new Set(["weekly", "monthly"]);

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

function integer(value, min, max, label) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) throw new Error(`${label} tidak sah.`);
  return number;
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

function todayIso() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
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
    templateId: row.template_id || "",
    workType: row.work_type || "general",
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

function templateRow(row) {
  return {
    id: row.id,
    clientCode: row.client_code,
    serviceId: row.service_id || "",
    title: row.title || "",
    workType: row.work_type || "general",
    cadence: row.cadence || "weekly",
    weekday: Number(row.weekday ?? 1),
    monthDay: Number(row.month_day ?? 1),
    priority: row.priority || "normal",
    owner: row.owner || "",
    notes: row.notes || "",
    isActive: row.is_active !== false,
    nextDueDate: row.next_due_date || "",
    lastGeneratedAt: row.last_generated_at || "",
    createdAt: row.created_at || "",
    updatedAt: row.updated_at || "",
  };
}

function validateWorkType(value) {
  const clean = text(value, 30) || "general";
  if (!WORK_TYPES.has(clean)) throw new Error("Jenis kerja tidak sah.");
  return clean;
}

function nextOccurrence(current, cadence, monthDay) {
  const value = new Date(`${current}T12:00:00Z`);
  if (cadence === "weekly") value.setUTCDate(value.getUTCDate() + 7);
  else {
    value.setUTCMonth(value.getUTCMonth() + 1, 1);
    const lastDay = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + 1, 0)).getUTCDate();
    value.setUTCDate(Math.min(monthDay, lastDay));
  }
  return value.toISOString().slice(0, 10);
}

async function generateDueAgencyTasks(code = "") {
  const today = todayIso();
  const filter = code ? `&client_code=eq.${encodeURIComponent(clientCode(code))}` : "";
  const rows = await supabaseRequest(`agency_task_templates?select=*&is_active=eq.true&next_due_date=lte.${today}&order=next_due_date.asc&limit=50${filter}`);
  let generated = 0;

  for (const raw of rows || []) {
    const template = templateRow(raw);
    const dueDates = [];
    let cursor = template.nextDueDate;
    let guard = 0;
    while (cursor && cursor <= today && guard < 36) {
      dueDates.push(cursor);
      cursor = nextOccurrence(cursor, template.cadence, template.monthDay);
      guard += 1;
    }

    for (const dueDate of dueDates.slice(-8)) {
      const inserted = await supabaseRequest("agency_tasks?on_conflict=template_id,due_date", {
        method: "POST",
        prefer: "resolution=ignore-duplicates,return=representation",
        body: [{
          client_code: template.clientCode,
          service_id: template.serviceId || null,
          template_id: template.id,
          work_type: template.workType,
          title: template.title,
          due_date: dueDate,
          priority: template.priority,
          status: "todo",
          owner: template.owner,
          notes: template.notes,
        }],
      });
      if (inserted?.length) generated += 1;
    }

    await supabaseRequest(`agency_task_templates?id=eq.${encodeURIComponent(template.id)}`, {
      method: "PATCH",
      prefer: "return=minimal",
      body: {
        next_due_date: cursor || nextOccurrence(today, template.cadence, template.monthDay),
        last_generated_at: dueDates.length ? new Date().toISOString() : template.lastGeneratedAt || null,
      },
    });
  }
  return generated;
}

async function listAgencyOperations(code = "", options = {}) {
  const generated = options.generate === false ? 0 : await generateDueAgencyTasks(code);
  const filter = code ? `&client_code=eq.${encodeURIComponent(clientCode(code))}` : "";
  const [serviceRows, taskRows, templateRows] = await Promise.all([
    supabaseRequest(`agency_services?select=*&order=created_at.desc${filter}`),
    supabaseRequest(`agency_tasks?select=*&order=due_date.asc.nullslast,created_at.desc${filter}`),
    supabaseRequest(`agency_task_templates?select=*&order=created_at.desc${filter}`),
  ]);
  return {
    services: (serviceRows || []).map(serviceRow),
    tasks: (taskRows || []).map(taskRow),
    templates: (templateRows || []).map(templateRow),
    generated,
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
      template_id: value.templateId ? uuid(value.templateId, "Template ID") : null,
      work_type: validateWorkType(value.workType),
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
  if (value.workType !== undefined) patch.work_type = validateWorkType(value.workType);
  if (value.serviceId !== undefined) patch.service_id = value.serviceId ? uuid(value.serviceId, "Service ID") : null;
  const rows = await supabaseRequest(`agency_tasks?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    prefer: "return=representation",
    body: patch,
  });
  if (!rows?.[0]) throw new Error("Task tidak dijumpai.");
  return taskRow(rows[0]);
}

async function createAgencyTemplate(value = {}) {
  const title = text(value.title, 240);
  if (!title) throw new Error("Nama recurring delivery wajib diisi.");
  const cadence = text(value.cadence, 20) || "weekly";
  const priority = text(value.priority, 20) || "normal";
  if (!TEMPLATE_CADENCES.has(cadence)) throw new Error("Cadence tidak sah.");
  if (!TASK_PRIORITIES.has(priority)) throw new Error("Priority task tidak sah.");
  const rows = await supabaseRequest("agency_task_templates", {
    method: "POST",
    prefer: "return=representation",
    body: [{
      client_code: clientCode(value.clientCode),
      service_id: value.serviceId ? uuid(value.serviceId, "Service ID") : null,
      title,
      work_type: validateWorkType(value.workType),
      cadence,
      weekday: integer(value.weekday ?? 1, 0, 6, "Hari minggu"),
      month_day: integer(value.monthDay ?? 1, 1, 28, "Hari bulan"),
      priority,
      owner: text(value.owner, 120),
      notes: text(value.notes, 2000),
      is_active: value.isActive !== false && value.isActive !== "false",
      next_due_date: date(value.nextDueDate) || todayIso(),
    }],
  });
  return templateRow(rows?.[0] || {});
}

async function updateAgencyTemplate(value = {}) {
  const id = uuid(value.id, "Template ID");
  const patch = {};
  if (value.title !== undefined) {
    patch.title = text(value.title, 240);
    if (!patch.title) throw new Error("Nama recurring delivery wajib diisi.");
  }
  if (value.serviceId !== undefined) patch.service_id = value.serviceId ? uuid(value.serviceId, "Service ID") : null;
  if (value.workType !== undefined) patch.work_type = validateWorkType(value.workType);
  if (value.cadence !== undefined) {
    patch.cadence = text(value.cadence, 20);
    if (!TEMPLATE_CADENCES.has(patch.cadence)) throw new Error("Cadence tidak sah.");
  }
  if (value.weekday !== undefined) patch.weekday = integer(value.weekday, 0, 6, "Hari minggu");
  if (value.monthDay !== undefined) patch.month_day = integer(value.monthDay, 1, 28, "Hari bulan");
  if (value.priority !== undefined) {
    patch.priority = text(value.priority, 20);
    if (!TASK_PRIORITIES.has(patch.priority)) throw new Error("Priority task tidak sah.");
  }
  if (value.owner !== undefined) patch.owner = text(value.owner, 120);
  if (value.notes !== undefined) patch.notes = text(value.notes, 2000);
  if (value.isActive !== undefined) patch.is_active = value.isActive !== false && value.isActive !== "false";
  if (value.nextDueDate !== undefined) patch.next_due_date = date(value.nextDueDate);
  const rows = await supabaseRequest(`agency_task_templates?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    prefer: "return=representation",
    body: patch,
  });
  if (!rows?.[0]) throw new Error("Recurring delivery tidak dijumpai.");
  return templateRow(rows[0]);
}

module.exports = {
  createAgencyService,
  createAgencyTask,
  createAgencyTemplate,
  generateDueAgencyTasks,
  listAgencyOperations,
  updateAgencyService,
  updateAgencyTask,
  updateAgencyTemplate,
};
