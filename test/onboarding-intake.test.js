const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const intake = require("../lib/onboarding-intake");
const { composeTodo } = require("../lib/today-todo");

const env = { APP_PASSWORD: "test-password" };
const good = { brandClient: "Kedai Baru", contactName: "Ali", phone: "+60 12-345 6789", email: "ali@example.com", companyName: "Kedai Baru Sdn Bhd" };

function memory() {
  const rows = [];
  const pushes = [];
  return {
    rows, pushes,
    deps: {
      record: async (activity) => { const row = { id: `a${rows.length + 1}`, createdAt: new Date().toISOString(), ...activity }; rows.push(row); return row; },
      list: async (types) => rows.filter((row) => types.includes(row.type)),
      push: async (payload) => { pushes.push(payload); },
    },
  };
}

test("only the secret link opens the form, and the link changes with the app password", () => {
  const token = intake.intakeToken(env);
  assert.equal(token.length, 24);
  assert.equal(intake.validToken(token, env), true);
  assert.equal(intake.validToken("wrong", env), false);
  assert.equal(intake.validToken(token, { APP_PASSWORD: "other" }), false);
  assert.equal(intake.intakeToken({}), "");
});

test("a submission is saved, notifies the owner, and waits until reviewed", async () => {
  const db = memory();
  const { id } = await intake.submitIntake({ token: intake.intakeToken(env), body: good, env, deps: db.deps });
  assert.ok(id);
  assert.equal(db.pushes.length, 1);
  assert.match(db.pushes[0].body, /Kedai Baru/);
  let pending = await intake.listPendingIntakes({ deps: db.deps });
  assert.deepEqual(pending.map((entry) => [entry.brandClient, entry.phone]), [["Kedai Baru", "+60 12-345 6789"]]);
  await intake.reviewIntake({ id, action: "used", deps: db.deps });
  pending = await intake.listPendingIntakes({ deps: db.deps });
  assert.deepEqual(pending, []);
  await assert.rejects(intake.reviewIntake({ id, action: "approve", deps: db.deps }), /tidak sah/);
});

test("bad links, missing fields, bots and floods are refused; a failed push still saves", async () => {
  const db = memory();
  const token = intake.intakeToken(env);
  await assert.rejects(intake.submitIntake({ token: "nope", body: good, env, deps: db.deps }), (error) => error.statusCode === 404);
  await assert.rejects(intake.submitIntake({ token, body: { ...good, phone: "" }, env, deps: db.deps }), /telefon/);
  await assert.rejects(intake.submitIntake({ token, body: { ...good, email: "bukan-emel" }, env, deps: db.deps }), /Emel tidak sah/);
  await assert.rejects(intake.submitIntake({ token, body: { ...good, website: "spam.example" }, env, deps: db.deps }), /tidak sah/);
  db.deps.push = async () => { throw new Error("push down"); };
  await intake.submitIntake({ token, body: good, env, deps: db.deps });
  assert.equal(db.rows.length, 1);
  for (let index = 0; index < 29; index += 1) db.rows.push({ id: `x${index}`, type: intake.SUBMITTED });
  await assert.rejects(intake.submitIntake({ token, body: good, env, deps: db.deps }), (error) => error.statusCode === 429);
});

test("pending forms appear in the Today list, and the public page is routed without sign-in", () => {
  const todo = composeTodo({ intakes: [{ id: "1", brandClient: "Kedai Baru" }], now: new Date("2026-11-20T04:00:00Z") });
  const entry = todo.items.find((item) => item.id === "clients:intake");
  assert.equal(entry.title, "1 borang onboarding baru");
  assert.equal(entry.action.subtab, "client-add-panel");
  const vercel = JSON.parse(fs.readFileSync(path.join(__dirname, "../vercel.json"), "utf8"));
  assert.ok(vercel.routes.some((route) => route.src === "/daftar" && route.dest === "/api/app?route=onboarding-form"));
  const form = fs.readFileSync(path.join(__dirname, "../api_handlers/onboarding-form.js"), "utf8");
  assert.doesNotMatch(form, /requireAuth/);
  assert.match(form, /noindex/);
});
