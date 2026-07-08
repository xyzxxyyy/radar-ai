import { spawn } from "node:child_process";
import { join } from "node:path";

const viteBin = join("node_modules", "vite", "bin", "vite.js");
const children = [
  spawn("node", ["server.js"], {
    env: { ...process.env, API_PORT: process.env.API_PORT || "8787" },
    stdio: "inherit",
  }),
  spawn("node", [viteBin, "--host", "127.0.0.1"], {
    env: process.env,
    stdio: "inherit",
  }),
];

let shuttingDown = false;

function stopAll(code = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) {
      child.kill();
    }
  }
  process.exit(code);
}

for (const child of children) {
  child.on("exit", (code) => {
    if (!shuttingDown && code !== 0) {
      stopAll(code ?? 1);
    }
  });
}

process.on("SIGINT", () => stopAll(0));
process.on("SIGTERM", () => stopAll(0));
