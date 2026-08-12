import { config } from "dotenv";

// Load .env.local first (Next.js convention), then fall back to .env.
// Must be imported BEFORE any module that reads process.env at import time
// (e.g. lib/db).
config({ path: ".env.local" });
config();
