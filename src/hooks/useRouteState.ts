import { useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { SetStateAction } from "react";

type RouteState = Record<string, unknown>;

function isRouteState(value: unknown): value is RouteState {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Store view state on the current history entry, keeping private filters out of the URL. */
export function useRouteState<T>(key: string, initialValue: () => T, parse: (value: unknown) => T) {
  const location = useLocation();
  const navigate = useNavigate();
  const routeState = useMemo(() => isRouteState(location.state) ? location.state : {}, [location.state]);
  const storedValue = routeState[key];
  const value = useMemo(
    () => storedValue === undefined ? initialValue() : parse(storedValue),
    [initialValue, parse, storedValue],
  );

  const setValue = useCallback((action: SetStateAction<T>) => {
    const current = storedValue === undefined ? initialValue() : parse(storedValue);
    const next = typeof action === "function"
      ? (action as (previous: T) => T)(current)
      : action;
    if (storedValue !== undefined && JSON.stringify(current) === JSON.stringify(next)) return;

    navigate(`${location.pathname}${location.search}${location.hash}`, {
      replace: true,
      state: { ...routeState, [key]: next },
    });
  }, [initialValue, key, location.hash, location.pathname, location.search, navigate, parse, routeState, storedValue]);

  return [value, setValue] as const;
}
