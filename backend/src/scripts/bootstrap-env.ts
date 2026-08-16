import { config } from "dotenv";
import { existsSync } from "node:fs";
import { join } from "node:path";

// Load only .env.local files (Next.js convention). Searches the current
// working directory first, then the frontend/ directory (../frontend/), so
// the API server and the WhatsApp worker pick up their own backend/.env.local
// or a shared frontend/.env.local when run from the monorepo root.
// Must be imported BEFORE any module that reads process.env at import time
// (e.g. lib/db).
const candidates = [
  ".env.local",
  "../.env.local",
  "../frontend/.env.local",
  "../../.env.local",
];

for (const path of candidates) {
  if (existsSync(join(process.cwd(), path))) {
    config({ path });
  }
}