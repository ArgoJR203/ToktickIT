import { PrismaClient } from "@prisma/client";

// Lazy singleton: the client is created on first use, not at import time.
// This keeps route modules and tests that don't touch the DB (e.g. /api/health)
// free of database side effects.
let client: PrismaClient | null = null;

import fs from "node:fs";
import path from "node:path";

export function getPrisma(): PrismaClient {
  if (!client) {
    if (!process.env.DATABASE_URL) {
      try {
        const envPath = path.resolve(process.cwd(), ".env");
        if (fs.existsSync(envPath)) {
          const content = fs.readFileSync(envPath, "utf-8");
          for (const line of content.split("\n")) {
            const match = line.match(/^\s*([\w.-]+)\s*=\s*["']?(.*?)["']?\s*$/);
            if (match && !process.env[match[1]]) {
              process.env[match[1]] = match[2];
            }
          }
        }
      } catch (err) {
        console.error("Failed to load .env in prisma.ts:", err);
      }
    }
    client = new PrismaClient();
  }
  return client;
}
