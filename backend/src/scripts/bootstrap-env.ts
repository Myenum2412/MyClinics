import { config } from "dotenv";
import { existsSync } from "node:fs";
import { join } from "node:path";

// Load .env.local first (Next.js convention), then fall back to .env.
// Searches the current working directory first, then the monorepo root
// (../ from backend/), then the frontend/ directory (../frontend/), so the
// shared .env.local kept next to the Next.js app works for both the API
// server and the WhatsApp worker.
// Must be imported BEFORE any module that reads process.env at import time
// (e.g. lib/db).
const candidates = [
  ".env.local",
  ".env",
  "../.env.local",
  "../.env",
  "../frontend/.env.local",
  "../frontend/.env",
  "../../.env.local",
  "../../.env",
];

for (const path of candidates) {
  if (existsSync(join(process.cwd(), path))) {
    config({ path });
  }
}