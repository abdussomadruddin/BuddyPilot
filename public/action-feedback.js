(() => {
  "use strict";
  if (window.buddyActionFeedback) return;
  window.buddyActionFeedback = true;

  const states = new WeakMap();
  let activeButton = null;
  let requests = 0;
  const bar = document.createElement("div");
  bar.id = "bp-network-progress";
  bar.hidden = true;
  bar.setAttribute("aria-hidden", "true");
  document.body.append(bar);

  function render(button, state) {
    const pending = state.requests > 0 || state.disabled;
    button.classList.toggle("bp-action-pending", pending);
    if (pending && !state.indicator) {
      state.previousBusy = button.getAttribute("aria-busy");
      button.setAttribute("aria-busy", "true");
      state.indicator = document.createElement("span");
      state.indicator.className = "bp-action-progress";
      state.indicator.setAttribute("aria-hidden", "true");
      button.append(state.indicator);
    } else if (pending && !button.contains(state.indicator)) {
      button.append(state.indicator);
    } else if (!pending && state.indicator) {
      state.indicator.remove();
      state.indicator = null;
      if (state.previousBusy === null) button.removeAttribute("aria-busy");
      else button.setAttribute("aria-busy", state.previousBusy);
    }
  }

  function stateFor(button) {
    if (!states.has(button)) states.set(button, { requests: 0, disabled: false, indicator: null });
    return states.get(button);
  }

  function pulse(button) {
    button.classList.remove("bp-tap-feedback");
    // Restart a short compositor animation without delaying the action handler.
    void button.offsetWidth;
    button.classList.add("bp-tap-feedback");
  }

  document.addEventListener("animationend", (event) => {
    if (event.animationName === "bp-tap") event.target.classList.remove("bp-tap-feedback");
  });

  document.addEventListener("pointerdown", (event) => {
    const button = event.target.closest?.("button, [role='button']");
    if (button && !button.disabled && button.getAttribute("aria-disabled") !== "true") pulse(button);
  }, true);

  document.addEventListener("click", (event) => {
    const button = event.target.closest?.("button, [role='button']");
    if (!button || button.disabled || button.getAttribute("aria-disabled") === "true") return;
    if (states.get(button)?.requests > 0) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    if (event.detail === 0) pulse(button);
    activeButton = button;
    // Only associate requests started by this event; background loads remain global.
    window.setTimeout(() => { if (activeButton === button) activeButton = null; }, 0);
  }, true);

  document.addEventListener("submit", (event) => {
    if (!event.submitter) return;
    const button = event.submitter;
    activeButton = button;
    window.setTimeout(() => { if (activeButton === button) activeButton = null; }, 0);
  }, true);

  new MutationObserver((records) => {
    for (const record of records) {
      const button = record.target;
      if (!states.has(button) && button !== activeButton) continue;
      const state = stateFor(button);
      state.disabled = button.disabled;
      render(button, state);
    }
  }).observe(document.body, { subtree: true, attributes: true, childList: true, attributeFilter: ["disabled"] });

  const originalFetch = window.fetch.bind(window);
  window.fetch = (...args) => {
    const button = activeButton;
    const state = button ? stateFor(button) : null;
    if (state) {
      state.requests += 1;
      render(button, state);
    }
    requests += 1;
    bar.hidden = false;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      requests -= 1;
      bar.hidden = requests === 0;
      if (state) {
        state.requests -= 1;
        state.disabled = button.disabled;
        render(button, state);
      }
    };
    let request;
    try { request = originalFetch(...args); }
    catch (error) { finish(); throw error; }
    return request.then((response) => {
      let consuming = false;
      for (const method of ["json", "text", "blob", "arrayBuffer", "formData"]) {
        if (typeof response[method] !== "function") continue;
        const original = response[method].bind(response);
        response[method] = (...bodyArgs) => {
          consuming = true;
          try { return original(...bodyArgs).finally(finish); }
          catch (error) { finish(); throw error; }
        };
      }
      // A caller may intentionally use headers only. Never leave an idle bar stuck.
      window.setTimeout(() => { if (!consuming) finish(); }, 0);
      return response;
    }, (error) => { finish(); throw error; });
  };
})();
