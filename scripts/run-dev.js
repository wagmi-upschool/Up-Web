#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const TARGETS = {
  myenv: {
    REMOTE_URL: "https://ixoy0ncts9.execute-api.us-east-1.amazonaws.com/myenv",
    NEXT_PUBLIC_REMOTE_URL:
      "https://ixoy0ncts9.execute-api.us-east-1.amazonaws.com/myenv",
    NEXT_PUBLIC_DASHBOARD_REMOTE_URL:
      "https://ixoy0ncts9.execute-api.us-east-1.amazonaws.com/myenv",
  },
  upwagmitec: {
    REMOTE_URL: "https://dj56p3u1qe.execute-api.us-east-1.amazonaws.com/upwagmitec",
    NEXT_PUBLIC_REMOTE_URL:
      "https://dj56p3u1qe.execute-api.us-east-1.amazonaws.com/upwagmitec",
    NEXT_PUBLIC_DASHBOARD_REMOTE_URL:
      "https://dj56p3u1qe.execute-api.us-east-1.amazonaws.com/upwagmitec",
  },
};

function resolveTarget(args) {
  if (args.includes("--myenv")) {
    return "myenv";
  }

  if (args.includes("--upwagmitec")) {
    return "upwagmitec";
  }

  return null;
}

const args = process.argv.slice(2);
const target = resolveTarget(args);
const forwardedArgs = args.filter(
  (arg) => arg !== "--myenv" && arg !== "--upwagmitec",
);

const env = {
  ...process.env,
  ...(target ? TARGETS[target] : {}),
  // Polling avoids macOS watch descriptor exhaustion in this workspace,
  // which was causing Next dev to miss the entire app route tree.
  WATCHPACK_POLLING: process.env.WATCHPACK_POLLING || "true",
  CHOKIDAR_USEPOLLING: process.env.CHOKIDAR_USEPOLLING || "true",
};

const logPath = path.join(process.cwd(), "dev.log");
const logStream = fs.createWriteStream(logPath, { flags: "w" });

if (target) {
  const banner = `Starting Next.js dev server with target: ${target}\n`;
  process.stdout.write(banner);
  logStream.write(banner);
}

const nextBin =
  process.platform === "win32"
    ? path.join(process.cwd(), "node_modules", ".bin", "next.cmd")
    : path.join(process.cwd(), "node_modules", ".bin", "next");

const child = spawn(nextBin, ["dev", ...forwardedArgs], {
  cwd: process.cwd(),
  env,
  stdio: ["inherit", "pipe", "pipe"],
});

child.stdout.on("data", (chunk) => {
  process.stdout.write(chunk);
  logStream.write(chunk);
});

child.stderr.on("data", (chunk) => {
  process.stderr.write(chunk);
  logStream.write(chunk);
});

child.on("close", (code) => {
  logStream.end();
  process.exit(code ?? 0);
});

child.on("error", (error) => {
  logStream.write(`${error.stack || error.message}\n`);
  logStream.end();
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exit(1);
});
