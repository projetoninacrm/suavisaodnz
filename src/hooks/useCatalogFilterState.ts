import { useCallback } from "react";
import { useRouteState } from "@/hooks/useRouteState";

export type CatalogFilterStatus = "all" | "active" | "inactive";

interface CatalogFilterState {
  query: string;
  status: CatalogFilterStatus;
}

function emptyCatalogFilterState(): CatalogFilterState {
  return { query: "", status: "all" };
}

function parseCatalogFilterState(value: unknown): CatalogFilterState {
  if (typeof value !== "object" || value === null) return emptyCatalogFilterState();
  const query = "query" in value && typeof value.query === "string" ? value.query : "";
  const status = "status" in value && (value.status === "active" || value.status === "inactive")
    ? value.status
    : "all";
  return { query, status };
}

/** Keep catalog search and status filters with the history entry, out of the URL. */
export function useCatalogFilterState(key: string) {
  const [filters, setFilters] = useRouteState<CatalogFilterState>(key, emptyCatalogFilterState, parseCatalogFilterState);
  const setQuery = useCallback((query: string) => {
    setFilters((current) => ({ ...current, query }));
  }, [setFilters]);
  const setStatus = useCallback((status: CatalogFilterStatus) => {
    setFilters((current) => ({ ...current, status }));
  }, [setFilters]);
  const clear = useCallback(() => {
    setFilters(emptyCatalogFilterState());
  }, [setFilters]);

  return { ...filters, setQuery, setStatus, clear };
}
