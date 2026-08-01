const { supabaseRequest } = require("./supabase-db");

const SERVICE_STATUSES = new Set(["active", "paused", "completed"]);
const TASK_STATUSES = new Set(["todo", "in_progress", "done", "cancelled"]);
const TASK_PRIORITIES = new Set(["low", "normal", "high", "urgent"]);
const WORK_TYPES = new Set(["general", "report", "invoice", "creative", "campaign_review"]);
const TEMPLATE_CADENCES = new Set(["weekly", "monthly"]);
const RELATIONSHIP_STATUSES = new Set(["strong", "stable", "watch", "risk"]);
const RENEWAL_STAGES = new Set(["none", "upcoming", "proposed", "renewed", "churn_risk"]);
const OPPORTUNITY_TYPES = new Set(["upsell", "cross_sell", "renewal", "expansion"]);
const OPPORTUNITY_STAGES = new Set(["idea", "discovery", "proposal", "won", "lost"]);

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

function optionalMoney(value) {
  if (value === "" || value === null || value === undefined) return null;
  return money(value);
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
    internalMonthlyCost: row.internal_monthly_cost === null || row.internal_monthly_cost === undefined ? null : Number(row.internal_monthly_cost),
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
    estimatedMinutes: Number(row.estimated_minutes || 0),
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
    estimatedMinutes: Number(row.estimated_minutes || 0),
    owner: row.owner || "",
    notes: row.notes || "",
    isActive: row.is_active !== false,
    nextDueDate: row.next_due_date || "",
    lastGeneratedAt: row.last_generated_at || "",
    createdAt: row.created_at || "",
    updatedAt: row.updated_at || "",
  };
}

function healthRow(row) {
  return {
    clientCode: row.client_code,
    relationshipStatus: row.relationship_status || "stable",
    renewalStage: row.renewal_stage || "none",
    lastCheckIn: row.last_check_in || "",
    nextCheckIn: row.next_check_in || "",
    notes: row.notes || "",
    createdAt: row.created_at || "",
    updatedAt: row.updated_at || "",
  };
}

function opportunityRow(row) {
  return {
    id: row.id,
    clientCode: row.client_code,
    title: row.title || "",
    opportunityType: row.opportunity_type || "upsell",
    stage: row.stage || "idea",
    estimatedMonthlyValue: Number(row.estimated_monthly_value || 0),
    targetDate: row.target_date || "",
    owner: row.owner || "",
    notes: row.notes || "",
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

function calculateAgencyInsights(services, tasks) {
  const today = todayIso();
  const last30 = new Date(`${today}T00:00:00Z`);
  last30.setUTCDate(last30.getUTCDate() - 29);
  const last30Iso = last30.toISOString();
  const activeServices = services.filter((service) => service.status === "active");
  const revenue = activeServices.reduce((sum, service) => sum + service.monthlyFee, 0);
  const costReady = activeServices.length > 0 && activeServices.every((service) => Number.isFinite(service.internalMonthlyCost));
  const internalCost = activeServices.reduce((sum, service) => sum + (service.internalMonthlyCost || 0), 0);
  const grossProfit = costReady ? revenue - internalCost : null;
  const recentTasks = tasks.filter((task) => task.status !== "cancelled" && task.createdAt >= last30Iso);
  const completedRecent = recentTasks.filter((task) => task.status === "done").length;
  const openTasks = tasks.filter((task) => ["todo", "in_progress"].includes(task.status));
  const overdueTasks = openTasks.filter((task) => task.dueDate && task.dueDate < today);

  const ownerMap = new Map();
  for (const task of openTasks) {
    const owner = task.owner || "Unassigned";
    const current = ownerMap.get(owner) || { owner, taskCount: 0, estimatedMinutes: 0, overdueCount: 0 };
    current.taskCount += 1;
    current.estimatedMinutes += task.estimatedMinutes;
    if (task.dueDate && task.dueDate < today) current.overdueCount += 1;
    ownerMap.set(owner, current);
  }

  const clientMap = new Map();
  for (const service of activeServices) {
    const current = clientMap.get(service.clientCode) || { clientCode: service.clientCode, revenue: 0, internalCost: 0, serviceCount: 0, costCount: 0, grossProfit: null, marginPercent: null, openTasks: 0, overdueTasks: 0 };
    current.revenue += service.monthlyFee;
    current.internalCost += service.internalMonthlyCost || 0;
    current.serviceCount += 1;
    if (Number.isFinite(service.internalMonthlyCost)) current.costCount += 1;
    clientMap.set(service.clientCode, current);
  }
  for (const task of openTasks) {
    const current = clientMap.get(task.clientCode) || { clientCode: task.clientCode, revenue: 0, internalCost: 0, serviceCount: 0, costCount: 0, grossProfit: null, marginPercent: null, openTasks: 0, overdueTasks: 0 };
    current.openTasks += 1;
    if (task.dueDate && task.dueDate < today) current.overdueTasks += 1;
    clientMap.set(task.clientCode, current);
  }
  const clients = [...clientMap.values()].map((client) => {
    client.costReady = client.serviceCount > 0 && client.costCount === client.serviceCount;
    client.grossProfit = client.costReady ? client.revenue - client.internalCost : null;
    client.marginPercent = client.costReady && client.revenue > 0 ? Math.round((client.grossProfit / client.revenue) * 1000) / 10 : null;
    return client;
  }).sort((left, right) => right.revenue - left.revenue || left.clientCode.localeCompare(right.clientCode));

  return {
    revenue,
    internalCost,
    grossProfit,
    costReady,
    marginPercent: costReady && revenue > 0 ? Math.round((grossProfit / revenue) * 1000) / 10 : null,
    completionRate: recentTasks.length ? Math.round((completedRecent / recentTasks.length) * 1000) / 10 : 0,
    recentTaskCount: recentTasks.length,
    openTaskCount: openTasks.length,
    overdueTaskCount: overdueTasks.length,
    owners: [...ownerMap.values()].sort((left, right) => right.estimatedMinutes - left.estimatedMinutes || right.taskCount - left.taskCount),
    clients,
  };
}

function calculateClientHealth(clientRows, healthRows, services, tasks, insights) {
  const today = todayIso();
  const next30 = new Date(`${today}T12:00:00Z`);
  next30.setUTCDate(next30.getUTCDate() + 30);
  const next30Iso = next30.toISOString().slice(0, 10);
  const healthMap = new Map(healthRows.map((row) => [row.clientCode, row]));
  const performanceMap = new Map((insights.clients || []).map((row) => [row.clientCode, row]));
  const clients = clientRows
    .filter((client) => !["archived", "completed"].includes(client.agency_status || "active"))
    .map((client) => {
      const saved = healthMap.get(client.code);
      const performance = performanceMap.get(client.code) || {};
      const clientTasks = tasks.filter((task) => task.clientCode === client.code && ["todo", "in_progress"].includes(task.status));
      const overdueTasks = clientTasks.filter((task) => task.dueDate && task.dueDate < today).length;
      const renewals = services.filter((service) => service.clientCode === client.code && service.status === "active" && service.renewalDate && service.renewalDate >= today && service.renewalDate <= next30Iso);
      const reasons = [];
      let score = 100;

      if (!saved) {
        score -= 15;
        reasons.push("Health check belum diset");
      } else if (saved.relationshipStatus === "watch") {
        score -= 15;
        reasons.push("Relationship perlu dipantau");
      } else if (saved.relationshipStatus === "risk") {
        score -= 35;
        reasons.push("Relationship berisiko");
      }
      if ((client.agency_status || "active") === "paused") {
        score -= 20;
        reasons.push("Service paused");
      }
      if (overdueTasks) {
        score -= Math.min(30, overdueTasks * 10);
        reasons.push(`${overdueTasks} task overdue`);
      }
      if (performance.costReady && Number.isFinite(performance.marginPercent) && performance.marginPercent < 30) {
        score -= performance.marginPercent < 0 ? 25 : 15;
        reasons.push("Margin rendah");
      }
      if (saved?.nextCheckIn && saved.nextCheckIn < today) {
        score -= 10;
        reasons.push("Check-in overdue");
      }
      if (renewals.length && (!saved || saved.renewalStage === "none")) {
        score -= 10;
        reasons.push("Renewal belum dimulakan");
      }

      score = Math.max(0, Math.min(100, score));
      const status = saved?.relationshipStatus === "risk" || score < 50 ? "risk" : (!saved || saved.relationshipStatus === "watch" || score < 75 ? "watch" : "healthy");
      return {
        clientCode: client.code,
        score,
        status,
        configured: Boolean(saved),
        relationshipStatus: saved?.relationshipStatus || "stable",
        renewalStage: saved?.renewalStage || "none",
        lastCheckIn: saved?.lastCheckIn || "",
        nextCheckIn: saved?.nextCheckIn || "",
        notes: saved?.notes || "",
        overdueTasks,
        renewalDate: renewals[0]?.renewalDate || "",
        reasons: reasons.length ? reasons : ["Client berada dalam keadaan baik"],
      };
    })
    .sort((left, right) => left.score - right.score || left.clientCode.localeCompare(right.clientCode));

  return {
    records: healthRows,
    clients,
    summary: {
      healthy: clients.filter((client) => client.status === "healthy").length,
      watch: clients.filter((client) => client.status === "watch").length,
      risk: clients.filter((client) => client.status === "risk").length,
      checkInsDue: clients.filter((client) => client.nextCheckIn && client.nextCheckIn <= today).length,
    },
  };
}

function calculateGrowthPipeline(services, healthRows, opportunities) {
  const today = todayIso();
  const horizon = new Date(`${today}T12:00:00Z`);
  horizon.setUTCDate(horizon.getUTCDate() + 90);
  const horizonIso = horizon.toISOString().slice(0, 10);
  const weights = { idea: 0.1, discovery: 0.3, proposal: 0.6 };
  const open = opportunities.filter((item) => Object.hasOwn(weights, item.stage));
  const renewals = services
    .filter((service) => service.status === "active" && service.renewalDate && service.renewalDate >= today && service.renewalDate <= horizonIso)
    .sort((left, right) => left.renewalDate.localeCompare(right.renewalDate));
  const atRiskClients = new Set(healthRows
    .filter((health) => health.relationshipStatus === "risk" || health.renewalStage === "churn_risk")
    .map((health) => health.clientCode));
  const atRiskRevenue = services
    .filter((service) => service.status === "active" && atRiskClients.has(service.clientCode))
    .reduce((sum, service) => sum + service.monthlyFee, 0);
  const pipelineValue = open.reduce((sum, item) => sum + item.estimatedMonthlyValue, 0);
  const weightedForecast = open.reduce((sum, item) => sum + item.estimatedMonthlyValue * weights[item.stage], 0);
  const wonValue = opportunities.filter((item) => item.stage === "won").reduce((sum, item) => sum + item.estimatedMonthlyValue, 0);

  return {
    summary: {
      renewalValue90Days: renewals.reduce((sum, service) => sum + service.monthlyFee, 0),
      renewalCount90Days: renewals.length,
      pipelineValue,
      weightedForecast: Math.round(weightedForecast * 100) / 100,
      atRiskRevenue,
      openCount: open.length,
      wonValue,
    },
    renewals,
    opportunities: [...opportunities].sort((left, right) => {
      const leftDate = left.targetDate || "9999-12-31";
      const rightDate = right.targetDate || "9999-12-31";
      return leftDate.localeCompare(rightDate) || right.estimatedMonthlyValue - left.estimatedMonthlyValue;
    }),
  };
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
          estimated_minutes: template.estimatedMinutes,
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
  const clientFilter = code ? `&code=eq.${encodeURIComponent(clientCode(code))}` : "";
  const [serviceRows, taskRows, templateRows, healthRows, opportunityRows, clientRows] = await Promise.all([
    supabaseRequest(`agency_services?select=*&order=created_at.desc${filter}`),
    supabaseRequest(`agency_tasks?select=*&order=due_date.asc.nullslast,created_at.desc${filter}`),
    supabaseRequest(`agency_task_templates?select=*&order=created_at.desc${filter}`),
    supabaseRequest(`agency_client_health?select=*&order=updated_at.desc${filter}`),
    supabaseRequest(`agency_opportunities?select=*&order=target_date.asc.nullslast,created_at.desc${filter}`),
    supabaseRequest(`invoice_clients?select=code,agency_status,service_status,onboarding_status&order=brand_client.asc${clientFilter}`),
  ]);
  const services = (serviceRows || []).map(serviceRow);
  const tasks = (taskRows || []).map(taskRow);
  const templates = (templateRows || []).map(templateRow);
  const healthRecords = (healthRows || []).map(healthRow);
  const opportunities = (opportunityRows || []).map(opportunityRow);
  const insights = calculateAgencyInsights(services, tasks);
  return {
    services,
    tasks,
    templates,
    insights,
    health: calculateClientHealth(clientRows || [], healthRecords, services, tasks, insights),
    growth: calculateGrowthPipeline(services, healthRecords, opportunities),
    generated,
  };
}

async function createAgencyOpportunity(value = {}) {
  const title = text(value.title, 200);
  const opportunityType = text(value.opportunityType, 30) || "upsell";
  const stage = text(value.stage, 20) || "idea";
  if (!title) throw new Error("Nama opportunity wajib diisi.");
  if (!OPPORTUNITY_TYPES.has(opportunityType)) throw new Error("Jenis opportunity tidak sah.");
  if (!OPPORTUNITY_STAGES.has(stage)) throw new Error("Stage opportunity tidak sah.");
  const rows = await supabaseRequest("agency_opportunities", {
    method: "POST",
    prefer: "return=representation",
    body: [{
      client_code: clientCode(value.clientCode),
      title,
      opportunity_type: opportunityType,
      stage,
      estimated_monthly_value: money(value.estimatedMonthlyValue),
      target_date: date(value.targetDate),
      owner: text(value.owner, 120),
      notes: text(value.notes, 2000),
    }],
  });
  return opportunityRow(rows?.[0] || {});
}

async function updateAgencyOpportunity(value = {}) {
  const id = uuid(value.id, "Opportunity ID");
  const patch = {};
  if (value.title !== undefined) {
    patch.title = text(value.title, 200);
    if (!patch.title) throw new Error("Nama opportunity wajib diisi.");
  }
  if (value.opportunityType !== undefined) {
    patch.opportunity_type = text(value.opportunityType, 30);
    if (!OPPORTUNITY_TYPES.has(patch.opportunity_type)) throw new Error("Jenis opportunity tidak sah.");
  }
  if (value.stage !== undefined) {
    patch.stage = text(value.stage, 20);
    if (!OPPORTUNITY_STAGES.has(patch.stage)) throw new Error("Stage opportunity tidak sah.");
  }
  if (value.estimatedMonthlyValue !== undefined) patch.estimated_monthly_value = money(value.estimatedMonthlyValue);
  if (value.targetDate !== undefined) patch.target_date = date(value.targetDate);
  if (value.owner !== undefined) patch.owner = text(value.owner, 120);
  if (value.notes !== undefined) patch.notes = text(value.notes, 2000);
  const rows = await supabaseRequest(`agency_opportunities?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    prefer: "return=representation",
    body: patch,
  });
  if (!rows?.[0]) throw new Error("Opportunity tidak dijumpai.");
  return opportunityRow(rows[0]);
}

async function saveAgencyHealth(value = {}) {
  const relationshipStatus = text(value.relationshipStatus, 20) || "stable";
  const renewalStage = text(value.renewalStage, 20) || "none";
  if (!RELATIONSHIP_STATUSES.has(relationshipStatus)) throw new Error("Relationship status tidak sah.");
  if (!RENEWAL_STAGES.has(renewalStage)) throw new Error("Renewal stage tidak sah.");
  const rows = await supabaseRequest("agency_client_health?on_conflict=client_code", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=representation",
    body: [{
      client_code: clientCode(value.clientCode),
      relationship_status: relationshipStatus,
      renewal_stage: renewalStage,
      last_check_in: date(value.lastCheckIn),
      next_check_in: date(value.nextCheckIn),
      notes: text(value.notes, 3000),
    }],
  });
  return healthRow(rows?.[0] || {});
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
      internal_monthly_cost: optionalMoney(value.internalMonthlyCost),
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
  if (value.internalMonthlyCost !== undefined) patch.internal_monthly_cost = optionalMoney(value.internalMonthlyCost);
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
      estimated_minutes: integer(Number(value.estimatedMinutes || 0), 0, 10080, "Anggaran masa"),
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
  if (value.estimatedMinutes !== undefined) patch.estimated_minutes = integer(Number(value.estimatedMinutes || 0), 0, 10080, "Anggaran masa");
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
      estimated_minutes: integer(Number(value.estimatedMinutes || 0), 0, 10080, "Anggaran masa"),
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
  if (value.estimatedMinutes !== undefined) patch.estimated_minutes = integer(Number(value.estimatedMinutes || 0), 0, 10080, "Anggaran masa");
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
  createAgencyOpportunity,
  createAgencyService,
  createAgencyTask,
  createAgencyTemplate,
  generateDueAgencyTasks,
  listAgencyOperations,
  saveAgencyHealth,
  updateAgencyService,
  updateAgencyOpportunity,
  updateAgencyTask,
  updateAgencyTemplate,
};
