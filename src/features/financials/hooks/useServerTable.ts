import { useCallback, useEffect, useRef, useState } from "react";
import type { Page, PageParams } from "../api/financialService";

/* ─── Server-paged table state ────────────────────────────────────────────────
 *
 * All four Financials tabs kept the same eleven pieces of state and the same
 * "filter, sort, slice" pipeline over a list they had fetched whole. The list
 * now lives in the database, so what the component needs is the query, not the
 * pipeline: this holds the query, debounces the part a person types, and drops
 * responses that arrive after a newer one.
 */

export type SortDir = "asc" | "desc";

export interface ServerTableOptions {
  /** Database column the grid sorts by until the user picks another. */
  defaultSort: string;
  defaultSortDir?: SortDir;
  defaultPageSize?: number;
}

export interface ServerTableState<T> {
  rows: T[];
  total: number;
  /** First load — nothing on screen yet, so show skeletons. */
  loading: boolean;
  /** A later load — keep the current page visible and mark it stale. */
  refreshing: boolean;

  page: number;
  pageSize: number;
  search: string;
  status: string;
  type: string;
  dateFrom: string;
  dateTo: string;
  sortKey: string;
  sortDir: SortDir;

  setPage: (p: number) => void;
  setPageSize: (n: number) => void;
  setSearch: (v: string) => void;
  setStatus: (v: string) => void;
  setType: (v: string) => void;
  setDateFrom: (v: string) => void;
  setDateTo: (v: string) => void;
  toggleSort: (col: string) => void;
  reload: () => void;

  /** The query as sent — hand this straight to an export or summary fetcher. */
  params: PageParams;
}

const SEARCH_DEBOUNCE_MS = 350;

export function useServerTable<T>(
  fetcher: (p: PageParams) => Promise<Page<T>>,
  opts: ServerTableOptions,
): ServerTableState<T> {
  const [rows, setRows] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(opts.defaultPageSize ?? 25);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortKey, setSortKey] = useState(opts.defaultSort);
  const [sortDir, setSortDir] = useState<SortDir>(opts.defaultSortDir ?? "desc");
  const [nonce, setNonce] = useState(0);

  // Typing is not a query. Wait for a pause, then ask once.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  /* Narrowing the result set puts you back on page one — staying on page 7 of
   * a set that now has two pages shows an empty table. The page is corrected
   * for *this* render rather than in an effect afterwards, so the query never
   * goes out once for the old page and again for page one. */
  const filterSig = JSON.stringify({
    debouncedSearch,
    status,
    type,
    dateFrom,
    dateTo,
    pageSize,
  });
  const lastFilterSig = useRef(filterSig);
  const effectivePage = filterSig === lastFilterSig.current ? page : 1;

  useEffect(() => {
    if (filterSig !== lastFilterSig.current) {
      lastFilterSig.current = filterSig;
      setPage(1);
    }
  }, [filterSig]);

  const params: PageParams = {
    page: effectivePage,
    pageSize,
    search: debouncedSearch,
    status,
    type,
    dateFrom,
    dateTo,
    sortKey,
    sortDir,
  };

  // Serialised so the effect below compares values, not object identity.
  const key = JSON.stringify(params);

  const firstLoad = useRef(true);
  const latest = useRef(0);

  useEffect(() => {
    const req = ++latest.current;
    if (firstLoad.current) setLoading(true);
    else setRefreshing(true);

    fetcher(JSON.parse(key) as PageParams)
      .then((res) => {
        // A slower earlier request must never overwrite a newer answer.
        if (req !== latest.current) return;
        setRows(res.rows);
        setTotal(res.total);
      })
      .finally(() => {
        if (req !== latest.current) return;
        firstLoad.current = false;
        setLoading(false);
        setRefreshing(false);
      });
  }, [key, fetcher, nonce]);

  // Read in a callback that must not re-create itself on every sort change.
  const sortKeyRef = useRef(sortKey);
  sortKeyRef.current = sortKey;

  const toggleSort = useCallback((col: string) => {
    setPage(1);
    if (sortKeyRef.current === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(col);
      setSortDir("desc");
    }
  }, []);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  return {
    rows,
    total,
    loading,
    refreshing,
    page: effectivePage,
    pageSize,
    search,
    status,
    type,
    dateFrom,
    dateTo,
    sortKey,
    sortDir,
    setPage,
    setPageSize,
    setSearch,
    setStatus,
    setType,
    setDateFrom,
    setDateTo,
    toggleSort,
    reload,
    params,
  };
}

export default useServerTable;
