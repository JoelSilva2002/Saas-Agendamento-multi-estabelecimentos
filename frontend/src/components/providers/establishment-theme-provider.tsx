"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import { normalizeHexColor, readableForeground } from "@/lib/color";

type EstablishmentThemeContextValue = {
  color: string | null;
  setColor: (hex: string | null) => void;
};

const EstablishmentThemeContext = createContext<EstablishmentThemeContextValue | null>(null);

function storageKey(establishmentKey: string): string {
  return `agendasaas:establishment-theme:${establishmentKey}`;
}

/**
 * Applies an establishment's brand color as CSS variable overrides, scoped to
 * this subtree so it never leaks into unrelated pages (e.g. another
 * establishment's public page, or the platform-admin shell).
 *
 * Persistence is a localStorage placeholder for now — `Establishment` has no
 * brand-color column in the backend yet, so there is nothing to fetch. Once
 * that field exists, swap the load/save below for an API call; the context
 * shape (`color` + `setColor`) is designed to stay the same.
 */
export function EstablishmentThemeProvider({
  establishmentKey,
  children,
}: {
  establishmentKey: string;
  children: ReactNode;
}) {
  const [color, setColorState] = useState<string | null>(null);

  useEffect(() => {
    // Reads localStorage (unavailable during SSR) to sync initial state after mount,
    // matching the server-rendered "no override" output to avoid a hydration mismatch.
    const stored = window.localStorage.getItem(storageKey(establishmentKey));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setColorState(stored);
  }, [establishmentKey]);

  const setColor = useCallback(
    (hex: string | null) => {
      if (hex) {
        const normalized = normalizeHexColor(hex);
        window.localStorage.setItem(storageKey(establishmentKey), normalized);
        setColorState(normalized);
      } else {
        window.localStorage.removeItem(storageKey(establishmentKey));
        setColorState(null);
      }
    },
    [establishmentKey],
  );

  const style = useMemo<CSSProperties | undefined>(() => {
    if (!color) return undefined;
    const foreground = readableForeground(color);
    return {
      "--primary": color,
      "--primary-foreground": foreground,
      "--ring": color,
      "--sidebar-primary": color,
      "--sidebar-primary-foreground": foreground,
      "--sidebar-ring": color,
    } as CSSProperties;
  }, [color]);

  const value = useMemo(() => ({ color, setColor }), [color, setColor]);

  return (
    <EstablishmentThemeContext.Provider value={value}>
      <div style={style} className="contents">
        {children}
      </div>
    </EstablishmentThemeContext.Provider>
  );
}

export function useEstablishmentTheme() {
  const ctx = useContext(EstablishmentThemeContext);
  if (!ctx) {
    throw new Error("useEstablishmentTheme must be used within an EstablishmentThemeProvider");
  }
  return ctx;
}
