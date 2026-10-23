import { lazy, type ComponentType } from "react";

const RELOAD_FLAG = "page-module-reload-at";
const RELOAD_COOLDOWN_MS = 10_000;

/**
 * Lazy-loads a screen. If its file can no longer be fetched (the app was updated
 * while the tab stayed open), reload once to pick up the new version instead of
 * leaving a blank screen. A short cooldown prevents reload loops.
 */
export function lazyPage<T extends ComponentType<unknown>>(load: () => Promise<{ default: T }>) {
  return lazy(async () => {
    try {
      const module = await load();
      sessionStorage.removeItem(RELOAD_FLAG);
      return module;
    } catch (error) {
      const lastReload = Number(sessionStorage.getItem(RELOAD_FLAG) || 0);
      if (Date.now() - lastReload > RELOAD_COOLDOWN_MS) {
        sessionStorage.setItem(RELOAD_FLAG, String(Date.now()));
        window.location.reload();
        return new Promise<{ default: T }>(() => {});
      }
      throw error;
    }
  });
}
