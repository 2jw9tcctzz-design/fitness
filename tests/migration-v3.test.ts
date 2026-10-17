// Egen process: databasen skapas som version 2 (som den såg ut före Mat) och uppgraderas sedan.
import "fake-indexeddb/auto";
import { test } from "node:test";
import assert from "node:assert/strict";

const OLD_SETTINGS_ROW = {
  key: "app",
  value: {
    program: {
      programStartDate: "2026-10-12",
      durationWeeks: 12,
      calorieTarget: 1900,
      proteinTargetG: 140,
      fiberTargetG: 32,
      walkTargetMin: 30,
      sleepTargetHours: 8,
      stepTarget: 10000,
      strengthDays: [1, 3, 6],
      mobilityTargetMin: 10,
    },
    baseline: { startWeightKg: 72.4, startMeasurements: { waistCm: 80.5, hipsCm: null, chestCm: null, thighCm: null, armCm: null } },
  },
  updatedAt: "2026-10-16T12:00:00.000Z",
};

const OLD_LOG = {
  id: "gammal",
  date: "2026-10-16",
  calories: 1750,
  proteinG: 155,
  fiberG: 31,
  waistCm: 79.5,
  strengthStatus: "moved",
  strengthMovedTo: "2026-10-17",
  note: "Bra dag",
  createdAt: "2026-10-16T10:00:00.000Z",
  updatedAt: "2026-10-16T10:00:00.000Z",
};

function openV2(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("daily-coach", 2);
    req.onupgradeneeded = () => {
      // Exakt så som version 1 och 2 skapade databasen
      const store = req.result.createObjectStore("daily_logs", { keyPath: "date" });
      store.createIndex("by_strength_moved_to", "strengthMovedTo", { unique: false });
      req.result.createObjectStore("settings", { keyPath: "key" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

test("uppgradering v2 -> v3 behåller dagloggar och inställningar orörda och lägger till recept och måltider", async () => {
  const v2 = await openV2();
  await new Promise<void>((resolve, reject) => {
    const tx = v2.transaction(["daily_logs", "settings"], "readwrite");
    tx.objectStore("daily_logs").put(OLD_LOG);
    tx.objectStore("settings").put(OLD_SETTINGS_ROW);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  v2.close();

  const { getDatabase } = await import("../src/db/database");
  const { getDailyLog, getLogMovedTo } = await import("../src/db/repositories/dailyLogRepository");
  const { getAppSettings } = await import("../src/db/repositories/settingsRepository");
  const { getAllRecipes } = await import("../src/db/repositories/recipeRepository");
  const { getPlannedMealsBetween } = await import("../src/db/repositories/plannedMealRepository");

  const db = await getDatabase();
  assert.equal(db.version, 3);
  assert.ok(db.objectStoreNames.contains("recipes"));
  assert.ok(db.objectStoreNames.contains("planned_meals"));

  // Tidigare dagloggar finns kvar, helt oförändrade (inklusive manuella värden och flyttat pass)
  assert.deepEqual(await getDailyLog("2026-10-16"), OLD_LOG);
  assert.equal((await getLogMovedTo("2026-10-17"))?.id, "gammal");

  // Den sparade inställningsposten är orörd; nya mål fylls på vid läsning
  const raw = await new Promise<unknown>((resolve, reject) => {
    const req = db.transaction("settings", "readonly").objectStore("settings").get("app");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  assert.deepEqual(raw, OLD_SETTINGS_ROW);
  const settings = await getAppSettings();
  assert.equal(settings.program.calorieTarget, 1900);
  assert.equal(settings.program.proteinTargetG, 140);
  assert.equal(settings.program.carbsTargetG, 180);
  assert.equal(settings.program.fatTargetG, 60);
  assert.equal(settings.baseline.startWeightKg, 72.4);
  assert.equal(settings.baseline.startMeasurements.waistCm, 80.5);

  // Recepten är på plats, planen är tom
  assert.ok((await getAllRecipes()).length >= 12);
  assert.deepEqual(await getPlannedMealsBetween("2026-01-01", "2026-12-31"), []);
});
