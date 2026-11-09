const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const source = fs.readFileSync(path.join(__dirname, "../scripts/invoice-pilot-cli.js"), "utf8");

function invoke(args, failAt) {
  const calls = [];
  let exitCode = 0;
  const exit = new Error("exit");
  try {
    vm.runInNewContext(source, {
      require: () => ({ spawnSync: (command, argv) => {
        calls.push([command, ...argv]);
        return { status: calls.length === failAt ? 1 : 0 };
      } }),
      process: { argv: ["node", "cli", ...args], env: {}, platform: "darwin", exit: (code) => { exitCode = code; throw exit; } },
      console: { log() {}, error() {} },
    });
  } catch (error) {
    if (error !== exit) throw error;
  }
  return { calls: JSON.parse(JSON.stringify(calls)), exitCode };
}

test("repair runs install/check/test before deploying preview in the intended team", () => {
  const { calls, exitCode } = invoke(["repair"]);
  assert.equal(exitCode, 0);
  assert.deepEqual(calls.slice(2, 5), [["npm", "ci"], ["npm", "run", "check"], ["npm", "test"]]);
  assert.ok(calls[1].includes("preview"));
  assert.ok(!calls.flat().includes("--prod"));
  assert.ok(calls.at(-1).includes("--prebuilt"));
  for (const call of calls.filter(([command]) => command === "npx")) {
    assert.ok(call.includes("vercel@65.12.1"));
    assert.deepEqual(call.slice(-2), ["--scope", "abdussomadruddin-projects"]);
  }
});

test("production requires preview confirmation and is staged without domain assignment", () => {
  assert.deepEqual(invoke(["repair", "--production"]), { calls: [], exitCode: 1 });
  const { calls } = invoke(["repair", "--production", "--preview-verified"]);
  assert.ok(calls[1].includes("production"));
  assert.ok(calls.at(-1).includes("--prod"));
  assert.ok(calls.at(-1).includes("--skip-domain"));
  assert.ok(!calls.flat().includes("promote"));
});

test("a failing check or test stops repair before build/deploy", () => {
  for (const failAt of [3, 4, 5]) {
    const { calls, exitCode } = invoke(["repair"], failAt);
    assert.equal(exitCode, 1);
    assert.ok(!calls.flat().includes("deploy"));
    assert.ok(!calls.flat().includes("build"));
  }
});

test("deploy also checks and tests, and production deploy never auto-promotes", () => {
  assert.equal(invoke(["deploy", "--production"]).exitCode, 1);
  const { calls } = invoke(["deploy", "--production", "--preview-verified"]);
  assert.deepEqual(calls.slice(0, 2), [["npm", "run", "check"], ["npm", "test"]]);
  assert.ok(calls.at(-1).includes("--skip-domain"));
  assert.equal(invoke(["deploy"], 2).calls.length, 2);
});
