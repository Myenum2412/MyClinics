/**
 * Server-side pagination helpers for list endpoints.
 *
 * Query contract: `?page=1&pageSize=50&q=...`
 * Response contract when paginated: `{ rows, total, page, pageSize }`.
 * Without pagination params list endpoints return the legacy raw array,
 * capped at `DEFAULT_LIMIT` so no request is ever unbounded.
 */
export const DEFAULT_LIMIT = 200;
export const MAX_PAGE_SIZE = 200;

export interface Pagination {
  page: number;
  pageSize: number;
  skip: number;
}

export function parsePagination(
  searchParams: URLSearchParams
): Pagination | null {
  const rawPage = searchParams.get("page");
  const rawSize = searchParams.get("pageSize");
  if (!rawPage && !rawSize) return null;
  const page = Math.max(1, Number(rawPage) || 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number(rawSize) || 50)
  );
  return { page, pageSize, skip: (page - 1) * pageSize };
}

export interface PagedResult<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export function paged<T>(
  rows: T[],
  total: number,
  pagination: Pagination
): PagedResult<T> {
  return {
    rows,
    total,
    page: pagination.page,
    pageSize: pagination.pageSize,
    pageCount: Math.max(1, Math.ceil(total / pagination.pageSize)),
  };
}

/** Case-insensitive substring match for the `q` search param. */
export function textSearch(q: string | null, fields: string[]) {
  const value = (q ?? "").trim();
  if (!value) return null;
  const regex = { $regex: value, $options: "i" };
  return fields.length === 1
    ? { [fields[0]]: regex }
    : { $or: fields.map((f) => ({ [f]: regex })) };
}