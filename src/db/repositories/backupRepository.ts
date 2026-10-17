import type { DailyLog } from "../../types/dailyLog";
import type { PlannedMeal, Recipe } from "../../types/meal";
import { mergeWithDefaults } from "./settingsRepository";
import { getDatabase } from "../database";
import { done, request } from "../idb";
import { DAILY_LOGS_STORE, LATEST_SCHEMA_VERSION, PLANNED_MEALS_STORE, RECIPES_STORE, SETTINGS_STORE } from "../migrations";
import { createBackup, type BackupData, type BackupFile } from "../../services/backupService";

const STORES = [DAILY_LOGS_STORE, SETTINGS_STORE, RECIPES_STORE, PLANNED_MEALS_STORE];

/** Läser allt i en enda transaktion så att backupen är konsistent. */
export async function exportBackup(): Promise<BackupFile> {
  const db = await getDatabase();
  const tx = db.transaction(STORES, "readonly");
  const [dailyLogs, settingsRow, recipes, plannedMeals] = await Promise.all([
    request<DailyLog[]>(tx.objectStore(DAILY_LOGS_STORE).getAll()),
    request<{ value?: Partial<BackupData["settings"]> } | undefined>(tx.objectStore(SETTINGS_STORE).get("app")),
    request<Recipe[]>(tx.objectStore(RECIPES_STORE).getAll()),
    request<PlannedMeal[]>(tx.objectStore(PLANNED_MEALS_STORE).getAll()),
  ]);
  return createBackup(
    { settings: mergeWithDefaults(settingsRow?.value), dailyLogs, recipes, plannedMeals },
    LATEST_SCHEMA_VERSION
  );
}

/**
 * Ersätter ALL data med backupens innehåll i en enda transaktion. Går något fel avbryts hela
 * transaktionen och den befintliga datan är kvar som den var.
 */
export async function replaceAllData(data: BackupData): Promise<void> {
  const db = await getDatabase();
  const tx = db.transaction(STORES, "readwrite");
  for (const name of STORES) tx.objectStore(name).clear();
  for (const l of data.dailyLogs) tx.objectStore(DAILY_LOGS_STORE).put(l);
  for (const r of data.recipes) tx.objectStore(RECIPES_STORE).put(r);
  for (const m of data.plannedMeals) tx.objectStore(PLANNED_MEALS_STORE).put(m);
  tx.objectStore(SETTINGS_STORE).put({ key: "app", value: data.settings, updatedAt: new Date().toISOString() });
  await done(tx);
}
