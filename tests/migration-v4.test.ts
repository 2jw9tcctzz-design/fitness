// Egen process: databasen skapas som version 3 (efter Mat) och uppgraderas till träning.
import "fake-indexeddb/auto";
import { test } from "node:test";
import assert from "node:assert/strict";

const LOG = { id: "l1", date: "2026-10-16", proteinG: 150, mobilityMinutes: 12, strengthStatus: "done", strengthMovedTo: null, createdAt: "t", updatedAt: "t" };
const SETTINGS = { key: "app", value: { program: { calorieTarget: 1900, carbsTargetG: 190, fatTargetG: 62 }, baseline: { startWeightKg: 72.4 } }, updatedAt: "t" };
const RECIPE = {
  id: "mitt-recept", name: "Mitt recept", mealType: "lunch", servings: 1, caloriesPerServing: 500, proteinGPerServing: 40,
  carbsGPerServing: 50, fatGPerServing: 15, fiberGPerServing: 8, ingredients: [], createdAt: "t", updatedAt: "t",
};
const PLANNED = { id: "2026-10-16_lunch", date: "2026-10-16", mealType: "lunch", recipeId: "mitt-recept", status: "eaten", eatenAt: "t", createdAt: "t", updatedAt: "t" };

function openV3(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("daily-coach", 3);
    req.onupgradeneeded = () => {
      const db = req.result;
      const logs = db.createObjectStore("daily_logs", { keyPath: "date" });
      logs.createIndex("by_strength_moved_to", "strengthMovedTo", { unique: false });
      db.createObjectStore("settings", { keyPath: "key" });
      const recipes = db.createObjectStore("recipes", { keyPath: "id" });
      recipes.createIndex("by_meal_type", "mealType", { unique: false });
      const planned = db.createObjectStore("planned_meals", { keyPath: "id" });
      planned.createIndex("by_date", "date", { unique: false });
      planned.createIndex("by_slot", ["date", "mealType"], { unique: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

test("uppgradering v3 -> v4 behåller dagloggar, inställningar, recept och måltider och lägger till träningslagren", async () => {
  const v3 = await openV3();
  await new Promise<void>((resolve, reject) => {
    const tx = v3.transaction(["daily_logs", "settings", "recipes", "planned_meals"], "readwrite");
    tx.objectStore("daily_logs").put(LOG);
    tx.objectStore("settings").put(SETTINGS);
    tx.objectStore("recipes").put(RECIPE);
    tx.objectStore("planned_meals").put(PLANNED);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  v3.close();

  const { getDatabase } = await import("../src/db/database");
  const { getDailyLog } = await import("../src/db/repositories/dailyLogRepository");
  const { getPlannedMealsBetween } = await import("../src/db/repositories/plannedMealRepository");
  const { getAllRecipes } = await import("../src/db/repositories/recipeRepository");
  const { getAppSettings } = await import("../src/db/repositories/settingsRepository");
  const { getAllSessions, getOtherActivitiesForDate } = await import("../src/db/repositories/workoutRepository");
  const { getDayTraining } = await import("../src/services/trainingStatusService");
  const { DEFAULT_APP_SETTINGS } = await import("../src/config/programDefaults");

  const db = await getDatabase();
  assert.equal(db.version, 4);
  for (const s of ["workout_sessions", "exercise_logs", "exercise_sets", "other_activities"]) assert.ok(db.objectStoreNames.contains(s), s);

  assert.deepEqual(await getDailyLog("2026-10-16"), LOG); // oförändrad
  const raw = await new Promise<unknown>((resolve, reject) => {
    const req = db.transaction("settings", "readonly").objectStore("settings").get("app");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  assert.deepEqual(raw, SETTINGS);
  const settings = await getAppSettings();
  assert.equal(settings.program.calorieTarget, 1900);
  assert.equal(settings.program.carbsTargetG, 190);
  assert.equal(settings.baseline.startWeightKg, 72.4);
  assert.equal((await getAllRecipes()).length, 1);
  assert.equal((await getPlannedMealsBetween("2026-10-01", "2026-10-31"))[0].status, "eaten");

  // Träningen börjar tom, och en äldre dagslogg visas som äldre status
  assert.deepEqual(await getAllSessions(), []);
  assert.deepEqual(await getOtherActivitiesForDate("2026-10-16"), []);
  const dt = await getDayTraining("2026-10-16", DEFAULT_APP_SETTINGS.program);
  assert.equal(dt.kind, "mobility"); // fredag är mobility
  assert.equal(dt.mobilityMinutes, 12);
  const mon = await getDayTraining("2026-10-16", { ...DEFAULT_APP_SETTINGS.program, strengthDays: [5] });
  assert.equal(mon.status, "completed");
  assert.equal(mon.legacy, true);
});
