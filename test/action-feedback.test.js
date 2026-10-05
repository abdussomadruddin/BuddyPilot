const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const source = fs.readFileSync(path.join(__dirname, "../public/action-feedback.js"), "utf8");

function harness(fetch) {
  const listeners = {};
  const timers = [];
  let observer;
  class Element {
    constructor() {
      this.classes = new Set();
      this.attributes = new Map();
      this.children = [];
      this.disabled = false;
      this.classList = {
        add: (name) => this.classes.add(name),
        remove: (name) => this.classes.delete(name),
        toggle: (name, enabled) => enabled ? this.classes.add(name) : this.classes.delete(name),
      };
    }
    setAttribute(key, value) { this.attributes.set(key, value); }
    getAttribute(key) { return this.attributes.get(key) ?? null; }
    removeAttribute(key) { this.attributes.delete(key); }
    append(node) { this.children.push(node); node.parent = this; }
    contains(node) { return this.children.includes(node); }
    remove() { this.parent.children = this.parent.children.filter((node) => node !== this); }
    closest() { return this; }
  }
  const body = new Element();
  const document = {
    body,
    createElement: () => new Element(),
    addEventListener: (type, fn) => { listeners[type] = fn; },
  };
  const window = { fetch, setTimeout: (fn) => { timers.push(fn); } };
  vm.runInNewContext(source, {
    window, document,
    MutationObserver: class { constructor(fn) { observer = fn; } observe() {} },
  });
  const click = (button, detail = 1) => {
    const event = { target: button, detail, prevented: false, stopped: false,
      preventDefault() { this.prevented = true; },
      stopImmediatePropagation() { this.stopped = true; },
    };
    listeners.click(event);
    return event;
  };
  return { window, body, Element, listeners, click,
    flush: () => { while (timers.length) timers.shift()(); },
    mutate: (button) => observer([{ target: button }]),
  };
}

test("tap feedback and network start are immediate, not timer-gated", async () => {
  let calls = 0;
  const h = harness(() => { calls++; return Promise.resolve({ json: async () => ({ ok: true }) }); });
  const button = new h.Element();
  h.listeners.pointerdown({ target: button });
  assert.ok(button.classes.has("bp-tap-feedback"));
  h.click(button);
  const pending = h.window.fetch("/mock");
  assert.equal(calls, 1);
  assert.equal(button.getAttribute("aria-busy"), "true");
  assert.equal(h.body.children[0].hidden, false);
  const response = await pending;
  assert.deepEqual(await response.json(), { ok: true });
  assert.equal(button.getAttribute("aria-busy"), null);
  assert.equal(h.body.children[0].hidden, true);
});

test("busy feedback lasts through slow body parsing and blocks only duplicate clicks", async () => {
  let release;
  const h = harness(async () => ({ json: () => new Promise((resolve) => { release = resolve; }) }));
  const button = new h.Element();
  h.click(button);
  const response = await h.window.fetch("/mock");
  const body = response.json();
  h.flush();
  assert.equal(h.body.children[0].hidden, false);
  assert.ok(h.click(button).stopped);
  assert.equal(h.click(new h.Element()).stopped, false);
  release({ ok: true });
  await body;
  assert.equal(h.body.children[0].hidden, true);
});

test("errors and aborts always release pending UI and retain original rejection", async () => {
  const error = new Error("aborted");
  const h = harness(() => Promise.reject(error));
  const button = new h.Element();
  button.setAttribute("aria-busy", "false");
  h.click(button);
  await assert.rejects(h.window.fetch("/mock"), (actual) => actual === error);
  assert.equal(h.body.children[0].hidden, true);
  assert.equal(button.getAttribute("aria-busy"), "false");
  assert.equal(h.click(button).stopped, false);
});

test("headers-only fetch does not leave animation stuck", async () => {
  const h = harness(async () => ({ json: async () => ({}) }));
  h.click(new h.Element());
  await h.window.fetch("/mock");
  h.flush();
  assert.equal(h.body.children[0].hidden, true);
});

test("disabled-state loading survives label updates and clears on re-enable", () => {
  const h = harness(async () => ({ json: async () => ({}) }));
  const button = new h.Element();
  h.click(button, 0);
  assert.ok(button.classes.has("bp-tap-feedback"));
  button.disabled = true;
  h.mutate(button);
  const indicator = button.children[0];
  button.children = [];
  h.mutate(button);
  assert.equal(button.children[0], indicator);
  button.disabled = false;
  h.mutate(button);
  assert.equal(button.children.length, 0);
  assert.equal(button.getAttribute("aria-busy"), null);
});

test("overlapping requests keep the global animation until the final request completes", async () => {
  const releases = [];
  const h = harness(() => new Promise((resolve) => releases.push(resolve)));
  const first = h.window.fetch("/one");
  const second = h.window.fetch("/two");
  releases[0]({ json: async () => ({}) });
  await (await first).json();
  assert.equal(h.body.children[0].hidden, false);
  releases[1]({ json: async () => ({}) });
  await (await second).json();
  assert.equal(h.body.children[0].hidden, true);
});

test("application wires feedback assets and removes artificial action waits", () => {
  const app = fs.readFileSync(path.join(__dirname, "../api_handlers/app.js"), "utf8");
  assert.ok(app.includes("/action-feedback.js?v=1"));
  assert.ok(app.includes("/action-feedback.css?v=1"));
  assert.doesNotMatch(app, /await sleep\((250|350|450)\)/);
  const css = fs.readFileSync(path.join(__dirname, "../public/action-feedback.css"), "utf8");
  assert.ok(css.includes("prefers-reduced-motion: reduce"));
});
