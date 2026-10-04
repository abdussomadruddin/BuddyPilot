const fs = require("node:fs");
const path = require("node:path");
module.exports = () =>
  fs
    .readdirSync(path.join(__dirname, "../../lib/ui"))
    .filter((name) => name.endsWith(".js"))
    .map((name) =>
      fs.readFileSync(path.join(__dirname, "../../lib/ui", name), "utf8"),
    )
    .join("\n");
