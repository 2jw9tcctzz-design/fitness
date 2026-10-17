import { DEFAULT_APP_SETTINGS } from "../../config/programDefaults";
import type { AppSettings } from "../../types/program";
import { getDatabase } from "../database";
import { SETTINGS_STORE } from "../migrations";

const KEY = "app";

type Stored = { key: string; value: Partial<AppSettings>; updatedAt: string };

/** Fyller i fält som saknas i den sparade posten med standardvärden (t.ex. efter framtida tillägg). */
export function mergeWithDefaults(stored: Partial<AppSettings> | undefined): AppSettings {
  return {
    program: { ...DEFAULT_APP_SETTINGS.program, ...(stored?.program ?? {}) },
    baseline: {
      ...DEFAULT_APP_SETTINGS.baseline,
      ...(stored?.baseline ?? {}),
      startMeasurements: {
        ...DEFAULT_APP_SETTINGS.baseline.startMeasurements,
        ...(stored?.baseline?.startMeasurements ?? {}),
      },
    },
  };
}

export async function getAppSettings(): Promise<AppSettings> {
  const db = await getDatabase();
  const row = await new Promise<Stored | undefined>((resolve, reject) => {
    const req = db.transaction(SETTINGS_STORE, "readonly").objectStore(SETTINGS_STORE).get(KEY);
    req.onsuccess = () => resolve(req.result as Stored | undefined);
    req.onerror = () => reject(req.error);
  });
  return mergeWithDefaults(row?.value);
}

export async function saveAppSettings(settings: AppSettings): Promise<AppSettings> {
  const db = await getDatabase();
  const tx = db.transaction(SETTINGS_STORE, "readwrite");
  const row: Stored = { key: KEY, value: settings, updatedAt: new Date().toISOString() };
  tx.objectStore(SETTINGS_STORE).put(row);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error("Transaktionen avbröts"));
  });
  return settings;
}
