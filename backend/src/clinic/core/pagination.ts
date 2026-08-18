export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

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
  return { skip: (page - 1) * limit, limit };
}
