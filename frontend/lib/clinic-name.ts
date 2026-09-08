import { cache } from "react";
import { apiFetch } from "@/lib/server-api";
import { DEFAULT_CLINIC_NAME } from "@/lib/clinic-name-client";

/**
 * Resolves the clinic's configured name for server components:
 * database (organizations collection) → ORG_NAME env → "My Clinic".
 */
export const getClinicName = cache(async (): Promise<string> => {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 1500);
    const res = await apiFetch<{ company?: { name?: string | null } }>("/api/organization", {
      signal: controller.signal,
    });
    clearTimeout(t);
    const name = res.data?.company?.name?.trim();
    if (name) return name;
  } catch {
    // fall through to env / default
  }
  return process.env.ORG_NAME?.trim() || DEFAULT_CLINIC_NAME;
});
