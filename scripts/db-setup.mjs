import { existsSync, mkdirSync, closeSync, openSync } from "node:fs";
import { dirname, resolve, isAbsolute } from "node:path";
import { spawnSync } from "node:child_process";
if (existsSync(".env")) process.loadEnvFile(".env");
const url = process.env.DATABASE_URL ?? "file:./parley.db";
if (!url.startsWith("file:"))
  throw new Error("This prototype expects a SQLite file: DATABASE_URL");
const name = url.slice(5);
const file = isAbsolute(name) ? name : resolve("prisma", name);
mkdirSync(dirname(file), { recursive: true });
closeSync(openSync(file, "a"));
const result = spawnSync(
  process.execPath,
  ["node_modules/prisma/build/index.js", "migrate", "deploy"],
  { stdio: "inherit", env: { ...process.env, DATABASE_URL: url } },
);
process.exitCode = result.status ?? 1;
