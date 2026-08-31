import { useEffect } from "react";
import type { Density, ThemePref } from "@/lib/perfil/types";

const STORAGE_KEY = "atlas.appearance";

export interface AppearanceState {
  theme: ThemePref;
  animations: boolean;
  density: Density;
}

export function applyAppearance(state: AppearanceState) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const prefersDark =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  const dark = state.theme === "dark" || (state.theme === "system" && prefersDark);
  root.classList.toggle("dark", dark);
  root.classList.toggle("no-animations", !state.animations);
  root.dataset.density = state.density;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export function readStoredAppearance(): AppearanceState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AppearanceState) : null;
  } catch {
    return null;
  }
}

/** Applies the saved appearance settings and follows system theme changes. */
export function useAppearance(state: AppearanceState | null | undefined) {
  useEffect(() => {
    if (!state) {
      const stored = readStoredAppearance();
      if (stored) applyAppearance(stored);
      return;
    }
    applyAppearance(state);
    if (state.theme !== "system") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyAppearance(state);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [state?.theme, state?.animations, state?.density, state]);
}
