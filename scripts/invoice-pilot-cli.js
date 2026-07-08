#!/usr/bin/env node

const { spawnSync } = require("node:child_process");

const project = process.env.VERCEL_PROJECT || "invoice-pilot";

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    ...options,
  });

  if (result.status !== 0) process.exit(result.status || 1);
}

function vercel(args) {
  run("npx", ["vercel", ...args]);
}

function usage() {
  console.log(`InvoicePilot CLI

Usage:
  npm run ip -- <command>

Commands:
  check      Check JavaScript syntax
  link       Link this folder to the Vercel project (${project})
  pull       Pull Vercel production settings/env
  build      Build Vercel production output locally
  deploy     Deploy the current prebuilt output to production
  repair     Link, pull, check, build, and deploy production
  env        List Vercel environment variables
  env:add    Add a Vercel environment variable
  status     Show Vercel project/deployment status

Env:
  VERCEL_PROJECT  Override project name, default: invoice-pilot
`);
}

const command = process.argv[2] || "help";

if (command === "help" || command === "--help" || command === "-h") {
  usage();
} else if (command === "check") {
  run("npm", ["run", "check"]);
} else if (command === "link") {
  vercel(["link", "--yes", "--project", project]);
} else if (command === "pull") {
  vercel(["pull", "--yes", "--environment", "production", "--project", project]);
} else if (command === "build") {
  vercel(["build", "--prod"]);
} else if (command === "deploy") {
  vercel(["deploy", "--prebuilt", "--prod"]);
} else if (command === "repair") {
  vercel(["link", "--yes", "--project", project]);
  vercel(["pull", "--yes", "--environment", "production", "--project", project]);
  run("npm", ["run", "check"]);
  vercel(["build", "--prod"]);
  vercel(["deploy", "--prebuilt", "--prod"]);
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
