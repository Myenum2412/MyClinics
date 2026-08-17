export const DEFAULT_CLINIC_NAME = "My Clinic";

let cachedName: string | null = null;

/**
 * Fetches the clinic's configured name from the API once, caching the result
 * for the lifetime of the page. Safe to call from client components.
 */
export function fetchClinicName(): Promise<string> {
  if (cachedName) return Promise.resolve(cachedName);
  return fetch("/api/organization", { cache: "no-store" })
    .then((res) => (res.ok ? (res.json() as Promise<{ company?: { name?: string | null } }>) : null))
    .then((data) => {
      cachedName = data?.company?.name?.trim() || DEFAULT_CLINIC_NAME;
      return cachedName;
    })
    .catch(() => {
      cachedName = DEFAULT_CLINIC_NAME;
      return cachedName;
    });
}
