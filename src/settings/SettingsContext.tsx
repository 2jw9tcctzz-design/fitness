import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_APP_SETTINGS } from "../config/programDefaults";
import { getAppSettings, saveAppSettings } from "../db/repositories/settingsRepository";
import type { AppSettings } from "../types/program";

type SettingsContextValue = {
  settings: AppSettings;
  /** Sparar och uppdaterar hela appen direkt. Kastar vid fel så att skärmen kan visa det. */
  save: (next: AppSettings) => Promise<void>;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

function logError(error: unknown) {
  if (import.meta.env.DEV) console.warn("[Settings]", error);
}

/** Läser inställningarna en gång vid start. Går det inte faller appen tillbaka på standardvärden. */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    let cancelled = false;
    getAppSettings()
      .then((s) => !cancelled && setSettings(s))
      .catch((error) => {
        logError(error);
        if (!cancelled) setSettings(DEFAULT_APP_SETTINGS);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const save = useCallback(async (next: AppSettings) => {
    await saveAppSettings(next);
    setSettings(next);
  }, []);

  const value = useMemo(() => (settings ? { settings, save } : null), [settings, save]);

  if (!value) return <div className="boot" role="status" aria-label="Startar appen" />;
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings måste användas inom SettingsProvider");
  return ctx;
}
