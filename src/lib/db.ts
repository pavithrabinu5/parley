import { PrismaClient } from "@prisma/client";
const globalDb = globalThis as unknown as { parleyDb?: PrismaClient };
export const db =
  globalDb.parleyDb ??
  new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL ?? "file:./parley.db",
  });
if (process.env.NODE_ENV !== "production") globalDb.parleyDb = db;
