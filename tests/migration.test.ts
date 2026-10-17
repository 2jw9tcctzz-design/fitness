// Körs i egen process (node --test kör varje fil separat) så databasen är orörd när testet börjar.
import "fake-indexeddb/auto";
import { test } from "node:test";
import assert from "node:assert/strict";

function openV1(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("daily-coach", 1);
    req.onupgradeneeded = () => {
      // Exakt så som version 1 skapade databasen
      const store = req.result.createObjectStore("daily_logs", { keyPath: "date" });
      store.createIndex("by_strength_moved_to", "strengthMovedTo", { unique: false });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

test("uppgradering v1 -> v2 behåller befintliga dagar och skapar inställningslagret", async () => {
  const v1 = await openV1();
  await new Promise<void>((resolve, reject) => {
    const tx = v1.transaction("daily_logs", "readwrite");
    tx.objectStore("daily_logs").put({
      id: "gammal",
      date: "2026-10-16",
      proteinG: 140,
      strengthStatus: "done",
      strengthMovedTo: null,
      createdAt: "2026-10-16T10:00:00.000Z",
      updatedAt: "2026-10-16T10:00:00.000Z",
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  v1.close();

  const { getDatabase } = await import("../src/db/database");
  const { LATEST_SCHEMA_VERSION } = await import("../src/db/migrations");
  const { getDailyLog, upsertDailyLog } = await import("../src/db/repositories/dailyLogRepository");
  const { getAppSettings, saveAppSettings } = await import("../src/db/repositories/settingsRepository");
  const { DEFAULT_APP_SETTINGS } = await import("../src/config/programDefaults");

  const db = await getDatabase();
  assert.equal(db.version, LATEST_SCHEMA_VERSION);
  assert.ok(db.objectStoreNames.contains("settings"));

  // Gammal dag finns kvar och kan läsas och uppdateras (nya mättfält saknas => null)
  const old = await getDailyLog("2026-10-16");
  assert.equal(old?.proteinG, 140);
  assert.equal(old?.strengthStatus, "done");
  const updated = await upsertDailyLog({ date: "2026-10-16", proteinG: 150, waistCm: 80.5 });
  assert.equal(updated.id, "gammal");
  assert.equal(updated.waistCm, 80.5);

  // Inställningar: standard först, sparade värden efteråt
  assert.deepEqual(await getAppSettings(), DEFAULT_APP_SETTINGS);
  const next = {
    program: { ...DEFAULT_APP_SETTINGS.program, calorieTarget: 2000 },
    baseline: { ...DEFAULT_APP_SETTINGS.baseline, startWeightKg: 72.4 },
  };
  await saveAppSettings(next);
  const read = await getAppSettings();
  assert.equal(read.program.calorieTarget, 2000);
  assert.equal(read.baseline.startWeightKg, 72.4);
});
