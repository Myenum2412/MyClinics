export interface MtPagination {
  page: number;
  pageSize: number;
  skip: number;
}

export const MT_DEFAULT_PAGE_SIZE = 20;
export const MT_MAX_PAGE_SIZE = 100;

export function parseMtPagination(query: URLSearchParams): MtPagination {
  const rawPage = Number(query.get("page") ?? 1);
  const rawSize = Number(query.get("pageSize") ?? MT_DEFAULT_PAGE_SIZE);
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const pageSize =
    Number.isInteger(rawSize) && rawSize > 0
      ? Math.min(rawSize, MT_MAX_PAGE_SIZE)
      : MT_DEFAULT_PAGE_SIZE;
  return { page, pageSize, skip: (page - 1) * pageSize };
}

export function mtPaged<T>(
  items: T[],
  total: number,
  pagination: MtPagination
): { items: T[]; total: number; page: number; pageSize: number; pages: number } {
  return {
    items,
    total,
    page: pagination.page,
    pageSize: pagination.pageSize,
    pages: Math.ceil(total / pagination.pageSize) || 1,
  };
}

/** Builds a URLSearchParams from a partially-defined zod-parsed query. */
export function queryParamsFromRecord(record: Record<string, unknown>): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(record)) {
    if (value === undefined || value === null) continue;
    params.set(key, String(value));
  }
  return params;
}
