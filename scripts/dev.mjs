// One command to run everything in BACKEND mode: backend + frontend, with login enforced.
// Usage: cd frontend && npm run dev:full   (or: node scripts/dev.mjs from the repo root)
// Needs: pip install -r backend/requirements.txt  and  npm install (in frontend/)
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

const py = process.env.PYTHON || (process.platform === "win32" ? "python" : "python3");
const pass = process.env.IL_PASSWORD || randomBytes(6).toString("base64url");
const env = {
  ...process.env,
  JWT_SECRET: process.env.JWT_SECRET || randomBytes(32).toString("hex"),
  DEV_OTP_LOG: "1",
  USERS_JSON: process.env.USERS_JSON || JSON.stringify([
    { username: "officer1", password: pass, role: "officer" },
    { username: "admin1", password: pass, role: "admin" },
  ]),
};
if (!existsSync(join(ROOT, "backend/app/main.py")) || !existsSync(join(ROOT, "frontend/node_modules"))) { console.error("Run `npm install` in frontend/ first, and make sure backend/ exists."); process.exit(1); }

console.log("\n=== IntelliLand (backend mode) ===");
console.log(`Officer login:  officer1 / ${pass}`);
console.log(`Admin login:    admin1   / ${pass}`);
console.log("Landowner:      any 10-digit phone; the OTP is printed below in the [api] lines.");
console.log("Open http://localhost:8443 and check the green badge at the bottom left.\n");

const run = (name, cmd, args, opts) => {
  const p = spawn(cmd, args, { ...opts, shell: process.platform === "win32" });
  const tag = (d) => String(d).split("\n").filter(Boolean).forEach((l) => console.log(`[${name}] ${l}`));
  p.stdout.on("data", tag); p.stderr.on("data", tag);
  p.on("exit", (c) => { console.log(`[${name}] exited (${c})`); process.exit(c ?? 1); });
  return p;
};
const api = run("api", py, ["-m", "uvicorn", "app.main:app", "--port", "8000"], { cwd: join(ROOT, "backend"), env });
const web = run("web", "npx", ["vite"], { cwd: join(ROOT, "frontend"), env: { ...env, VITE_API_BASE: "http://localhost:8000" } });
for (const s of ["SIGINT", "SIGTERM"]) process.on(s, () => { api.kill(); web.kill(); process.exit(0); });
