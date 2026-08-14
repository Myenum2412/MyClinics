"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface ServerPage<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

/**
 * Server-side pagination + debounced search against the API server.
 * The backend list endpoints return `{ [dataKey]: { rows, total, page,
 * pageSize, pageCount } }` when a `page` param is present.
 */
export function useServerPagination<T>({
  path,
  dataKey,
  initialData,
  initialTotal = initialData.length,
  pageSize = 6,
  debounceMs = 300,
}: {
  path: string;
  dataKey: string;
  initialData: T[];
  initialTotal?: number;
  pageSize?: number;
  debounceMs?: number;
}) {
  const [rows, setRows] = useState(initialData);
  const [total, setTotal] = useState(initialTotal);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageCount, setPageCount] = useState(
    Math.max(1, Math.ceil(initialTotal / pageSize))
  );
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  const requestSeq = useRef(0);
  const queryRef = useRef("");
  const pageRef = useRef(0);

  useEffect(() => {
    pageRef.current = pageIndex;
  }, [pageIndex]);

  // Debounced fetch: search changes wait debounceMs and reset to page 0;
  // page navigation refetches immediately.
  useEffect(() => {
    let cancelled = false;
    const queryChanged = q.trim() !== queryRef.current;
    const timer = setTimeout(
      () => {
        if (cancelled) return;
        const query = q.trim();
        queryRef.current = query;
        const page = queryChanged ? 0 : pageRef.current;
        const seq = ++requestSeq.current;
        const params = new URLSearchParams({
          page: String(page + 1),
          pageSize: String(pageSize),
        });
        if (query) params.set("q", query);
        setLoading(true);
        void fetch(`${path}?${params.toString()}`, { cache: "no-store" })
          .then(async (res) => {
            if (!res.ok || seq !== requestSeq.current) return;
            const body = await res.json();
            const pageData = body[dataKey] as ServerPage<T> | undefined;
            if (!pageData || seq !== requestSeq.current) return;
            setRows(pageData.rows);
            setTotal(pageData.total);
            setPageCount(pageData.pageCount);
            setPageIndex(pageData.page - 1);
            pageRef.current = pageData.page - 1;
          })
          .finally(() => {
            if (seq === requestSeq.current) setLoading(false);
          });
      },
      queryChanged ? debounceMs : 0
    );
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [q, pageIndex, path, dataKey, pageSize, debounceMs]);

  const refresh = useCallback((): Promise<void> => {
    return (async () => {
      const page = pageRef.current;
      const query = queryRef.current;
      const seq = ++requestSeq.current;
      const params = new URLSearchParams({
        page: String(page + 1),
        pageSize: String(pageSize),
      });
      if (query) params.set("q", query);
      setLoading(true);
      try {
        const res = await fetch(`${path}?${params.toString()}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const body = await res.json();
        const pageData = body[dataKey] as ServerPage<T> | undefined;
        if (!pageData) return;
        setRows(pageData.rows);
        setTotal(pageData.total);
        setPageCount(pageData.pageCount);
      } finally {
        if (seq === requestSeq.current) setLoading(false);
      }
    })();
  }, [path, dataKey, pageSize]);

  return {
    rows,
    total,
    pageIndex,
    pageCount,
    loading,
    search: q,
    setSearch: setQ,
    setPageIndex,
    refresh,
  };
}
