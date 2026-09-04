export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;
export const MAX_SKIP = 10000;
export const MAX_QUERY_LENGTH = 100;

export interface PageQuery {
  skip: number;
  limit: number;
}

export function parsePagination(
  query: Record<string, unknown>,
  defaults: { limit?: number; maxLimit?: number } = {}
): PageQuery {
  const limitRaw = Number(query.limit ?? defaults.limit ?? DEFAULT_LIMIT);
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(Math.trunc(limitRaw), 1), defaults.maxLimit ?? MAX_LIMIT)
    : defaults.limit ?? DEFAULT_LIMIT;
  const pageRaw = Number(query.page ?? 1);
  const page = Number.isFinite(pageRaw) ? Math.max(Math.trunc(pageRaw), 1) : 1;
  const rawSkip = (page - 1) * limit;
  const skip = Math.min(rawSkip, MAX_SKIP);
  return { skip, limit };
}

/** Escape user input for use in $regex (prevents ReDoS / injection). */
export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").slice(0, MAX_QUERY_LENGTH);
}

export function sanitizeQuery(q: unknown): string | undefined {
  if (typeof q !== "string") return undefined;
  const trimmed = q.trim().slice(0, MAX_QUERY_LENGTH);
  if (!trimmed) return undefined;
  return escapeRegex(trimmed);
}
