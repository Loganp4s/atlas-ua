import { useSyncExternalStore } from "react";
import { defaultAtlasState, type AtlasState } from "./types";

/**
 * Local, SSR-safe store for the Atlas MVP.
 *
 * All persistence lives behind this module so a future migration to
 * Lovable Cloud only touches this file plus the hooks that consume it.
 */

const STORAGE_KEY = "atlas:v1";

type Listener = () => void;
const listeners = new Set<Listener>();

let state: AtlasState = defaultAtlasState;
let hydrated = false;

function isBrowser() {
  return typeof window !== "undefined";
}

function loadFromStorage(): AtlasState {
  if (!isBrowser()) return defaultAtlasState;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultAtlasState;
    const parsed = JSON.parse(raw) as Partial<AtlasState>;
    return { ...defaultAtlasState, ...parsed };
  } catch {
    return defaultAtlasState;
  }
}

function persist(next: AtlasState) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* quota / private mode – ignore */
  }
}

function hydrateOnce() {
  if (hydrated || !isBrowser()) return;
  state = loadFromStorage();
  hydrated = true;
}

function emit() {
  for (const l of listeners) l();
}

export const atlasStore = {
  getState(): AtlasState {
    hydrateOnce();
    return state;
  },
  getServerState(): AtlasState {
    return defaultAtlasState;
  },
  subscribe(listener: Listener) {
    hydrateOnce();
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  setState(updater: (prev: AtlasState) => AtlasState) {
    hydrateOnce();
    state = updater(state);
    persist(state);
    emit();
  },
};

export function useAtlasState<T>(selector: (s: AtlasState) => T): T {
  return useSyncExternalStore(
    atlasStore.subscribe,
    () => selector(atlasStore.getState()),
    () => selector(atlasStore.getServerState()),
  );
}

export function createId(): string {
  if (isBrowser() && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}