#!/usr/bin/env node

const { spawnSync } = require("node:child_process");

const project = process.env.VERCEL_PROJECT || "invoice-pilot";
const scope = process.env.VERCEL_SCOPE || "abdussomadruddin-projects";
const production = process.argv.includes("--production");
const previewVerified = process.argv.includes("--preview-verified");

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    ...options,
  });

  if (result.status !== 0) process.exit(result.status || 1);
}

function vercel(args) {
  run("npx", ["--yes", "vercel@65.12.1", ...args, "--scope", scope]);
}

function usage() {
  console.log(`InvoicePilot CLI

Usage:
  npm run ip -- <command>

Commands:
  check      Check JavaScript syntax
  link       Link this folder to the Vercel project (${project})
  pull       Pull Vercel preview settings/env
  build      Build Vercel preview output locally
  deploy     Check, test, and deploy prebuilt output to preview
  repair     Install, check, test, build, and deploy preview
  db:setup   Create Supabase tables using SUPABASE_DB_URL
  db:migrate Import old Drive JSON client/settings data into Supabase
  env        List Vercel environment variables
  env:add    Add a Vercel environment variable
  status     Show Vercel project/deployment status

Env:
  VERCEL_PROJECT  Override project name, default: invoice-pilot
  VERCEL_SCOPE    Override team, default: abdussomadruddin-projects

Production:
  pull/build accept --production for production configuration.
  deploy/repair require --production --preview-verified after preview smoke checks.
  Production deployments are staged with --skip-domain; promote separately
  only after smoke checks and explicit production authorization.
`);
}

const command = process.argv[2] || "help";

if (production && ["deploy", "repair"].includes(command) && !previewVerified) {
  console.error("Production requires a verified preview. Complete CLOUD_SETUP.md checks, then use --production --preview-verified with explicit production authorization.");
  process.exit(1);
}

function checkAndTest() {
  run("npm", ["run", "check"]);
  run("npm", ["test"]);
}

function build() {
  vercel(production ? ["build", "--prod"] : ["build"]);
}

function deploy() {
  vercel(production
    ? ["deploy", "--prebuilt", "--prod", "--skip-domain"]
    : ["deploy", "--prebuilt"]);
}

if (command === "help" || command === "--help" || command === "-h") {
  usage();
} else if (command === "check") {
  run("npm", ["run", "check"]);
} else if (command === "link") {
  vercel(["link", "--yes", "--project", project]);
} else if (command === "pull") {
  vercel(["pull", "--yes", "--environment", production ? "production" : "preview"]);
} else if (command === "build") {
  build();
} else if (command === "deploy") {
  checkAndTest();
  deploy();
} else if (command === "repair") {
  vercel(["link", "--yes", "--project", project]);
  vercel(["pull", "--yes", "--environment", production ? "production" : "preview"]);
  run("npm", ["ci"]);
  checkAndTest();
  build();
  deploy();
} else if (command === "db:setup") {
  run("node", ["scripts/setup-supabase.js"]);
} else if (command === "db:migrate") {
  run("node", ["scripts/migrate-drive-to-supabase.js"]);
} else if (command === "env") {
  vercel(["env", "ls"]);
} else if (command === "env:add") {
  const name = process.argv[3];
  const environment = process.argv[4] || "production";
  if (!name) {
    console.error("Usage: npm run ip -- env:add NAME [production|preview|development]");
    process.exit(1);
  }
  vercel(["env", "add", name, environment]);
} else if (command === "status") {
  vercel(["projects", "ls"]);
  vercel(["ls"]);
} else {
  console.error(`Unknown command: ${command}\n`);
  usage();
  process.exit(1);
}
