// Fragments share one browser scope; assemble in dependency order.
module.exports = function browser() {
  return [require("./browser-state")(), require("./browser-navigation")(), require("./browser-postpilot")(), require("./browser-clients-reports")(), require("./browser-invoices")(), require("./browser-startup")()].join("");
};
