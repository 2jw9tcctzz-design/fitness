import "fake-indexeddb/auto";
import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_APP_SETTINGS } from "../src/config/programDefaults";
import { SEED_RECIPES } from "../src/config/seedRecipes";
import { getDatabase } from "../src/db/database";
import { LATEST_SCHEMA_VERSION } from "../src/db/migrations";
import { exportBackup, replaceAllData } from "../src/db/repositories/backupRepository";
import { getDailyLog, getDailyLogsBetween, upsertDailyLog } from "../src/db/repositories/dailyLogRepository";
import {
  getPlannedMealsBetween,
  getPlannedMealsForDate,
  setMealEaten,
  setPlannedMeal,
} from "../src/db/repositories/plannedMealRepository";
import { getAllRecipes, getRecipesByMealType } from "../src/db/repositories/recipeRepository";
import { getAppSettings, saveAppSettings } from "../src/db/repositories/settingsRepository";
import { parseBackupText, validateBackup } from "../src/services/backupService";
import {
  computeMealTotals,
  formatTargetsLine,
  overlayMealNutrition,
  resolveDayNutrition,
} from "../src/services/nutritionService";
import { formToSettings, settingsToForm } from "../src/services/settingsForm";
import { buildFocusItems } from "../src/services/focusService";
import { EMPTY_FORM } from "../src/services/checkInForm";
import { calcPreliminaryWeeklyScore } from "../src/services/weeklyScoreCalc";
import { getWeekSummary } from "../src/services/weeklyScoreService";
import type { PlannedMeal } from "../src/types/meal";

const R = (id: string) => {
  const r = SEED_RECIPES.find((x) => x.id === id);
  assert.ok(r, id);
  return r;
};
const oats = R("seed-overnight-oats");
const bowl = R("seed-chicken-quinoa-bowl");
const skyr = R("seed-skyr-bar-mandlar");
const lax = R("seed-lax-potatis");
const DAY = "2026-10-19"; // måndag

const meal = (mealType: PlannedMeal["mealType"], recipeId: string, status: PlannedMeal["status"], date = DAY): PlannedMeal => ({
  id: `${date}_${mealType}`,
  date,
  mealType,
  recipeId,
  status,
  eatenAt: status === "eaten" ? "2026-10-19T08:00:00.000Z" : null,
  createdAt: "",
  updatedAt: "",
});

// ---------- Seed-recept ----------

test("seed: minst 12 recept, tre per måltidstyp, per portion, inklusive de fyra namngivna", () => {
  assert.ok(SEED_RECIPES.length >= 12);
  for (const t of ["breakfast", "lunch", "snack", "dinner"] as const) {
    assert.ok(SEED_RECIPES.filter((r) => r.mealType === t).length >= 3, t);
  }
  assert.equal(new Set(SEED_RECIPES.map((r) => r.id)).size, SEED_RECIPES.length);
  const names = SEED_RECIPES.map((r) => r.name.toLowerCase()).join("|");
  for (const part of ["overnight oats", "chicken quinoa bowl", "skyr, bär och mandlar", "lax, potatis, broccoli och yoghurtsås"]) {
    assert.ok(names.includes(part), part);
  }
  for (const r of SEED_RECIPES) {
    assert.ok(r.caloriesPerServing > 0 && r.ingredients.length > 0 && r.instructions, r.name);
  }
});

test("seed: en dags exempelmeny landar nära standardmålen", () => {
  const t = computeMealTotals([meal("breakfast", oats.id, "eaten"), meal("lunch", bowl.id, "eaten"), meal("snack", skyr.id, "eaten"), meal("dinner", lax.id, "eaten")], SEED_RECIPES);
  assert.ok(Math.abs(t.eaten.calories - 1800) <= 100, String(t.eaten.calories));
  assert.ok(t.eaten.proteinG >= 135);
});

// ---------- Nutrition ----------

test("nutrition: ätna måltider räknas in, bara planerade räknas inte", () => {
  const t = computeMealTotals([meal("breakfast", oats.id, "eaten"), meal("lunch", bowl.id, "planned")], SEED_RECIPES);
  assert.equal(t.eatenCount, 1);
  assert.equal(t.eaten.calories, oats.caloriesPerServing);
  assert.equal(t.planned.calories, oats.caloriesPerServing + bowl.caloriesPerServing);
});

test("nutrition: avmarkering minskar totalsumman", () => {
  const before = computeMealTotals([meal("breakfast", oats.id, "eaten"), meal("lunch", bowl.id, "eaten")], SEED_RECIPES);
  const after = computeMealTotals([meal("breakfast", oats.id, "eaten"), meal("lunch", bowl.id, "planned")], SEED_RECIPES);
  assert.equal(before.eaten.calories - after.eaten.calories, bowl.caloriesPerServing);
  assert.equal(after.eaten.calories, oats.caloriesPerServing);
});

test("nutrition: flera ätna måltider summeras rätt för kalorier, protein, kolhydrater, fett och fiber", () => {
  const t = computeMealTotals([meal("breakfast", oats.id, "eaten"), meal("lunch", bowl.id, "eaten"), meal("snack", skyr.id, "eaten")], SEED_RECIPES);
  const all = [oats, bowl, skyr];
  assert.equal(t.eaten.calories, all.reduce((a, r) => a + r.caloriesPerServing, 0));
  assert.equal(t.eaten.proteinG, all.reduce((a, r) => a + r.proteinGPerServing, 0));
  assert.equal(t.eaten.carbsG, all.reduce((a, r) => a + r.carbsGPerServing, 0));
  assert.equal(t.eaten.fatG, all.reduce((a, r) => a + r.fatGPerServing, 0));
  assert.equal(t.eaten.fiberG, all.reduce((a, r) => a + r.fiberGPerServing, 0));
  // Fast kontrollsumma så att ett fel i receptdatan också syns
  assert.deepEqual(t.eaten, { calories: 1300, proteinG: 111, carbsG: 132, fatG: 37, fiberG: 27 });
});

test("nutrition: måltid vars recept saknas hoppas över i stället för att krascha", () => {
  const t = computeMealTotals([meal("lunch", "finns-inte", "eaten")], SEED_RECIPES);
  assert.equal(t.eatenCount, 0);
  assert.equal(t.eaten.calories, 0);
});

test("dagens nutrition: plan utan ätna måltider är inte registrerat; äldre manuell data visas när ingen plan finns", () => {
  const planOnly = resolveDayNutrition([meal("lunch", bowl.id, "planned")], SEED_RECIPES, null);
  assert.equal(planOnly.source, "meals");
  assert.equal(planOnly.registered, false);

  const log = { id: "x", date: DAY, createdAt: "", updatedAt: "", calories: 1750, proteinG: 155, fiberG: 31 };
  const manual = resolveDayNutrition([], SEED_RECIPES, log);
  assert.equal(manual.source, "manual");
  assert.equal(manual.values.calories, 1750);
  assert.equal(manual.values.carbsG, null);

  // En plan går före gammal manuell inmatning
  const both = resolveDayNutrition([meal("lunch", bowl.id, "eaten")], SEED_RECIPES, log);
  assert.equal(both.source, "meals");
  assert.equal(both.values.proteinG, bowl.proteinGPerServing);

  assert.equal(resolveDayNutrition([], SEED_RECIPES, null).source, "none");
});

test("veckopoäng: ätna måltider ersätter manuell data på planerade dagar, andra dagar är orörda", () => {
  const p = DEFAULT_APP_SETTINGS.program;
  const logs = [
    { id: "a", date: "2026-10-19", createdAt: "", updatedAt: "", proteinG: 20, sleepHours: 8 },
    { id: "b", date: "2026-10-20", createdAt: "", updatedAt: "", proteinG: 135, sleepHours: 8 },
  ];
  const meals = [meal("lunch", bowl.id, "eaten", "2026-10-19"), meal("dinner", lax.id, "eaten", "2026-10-19"), meal("snack", skyr.id, "eaten", "2026-10-19")];
  const merged = overlayMealNutrition(logs, "2026-10-19", "2026-10-25", meals, SEED_RECIPES);
  const monday = merged.find((l) => l.date === "2026-10-19");
  assert.equal(monday?.proteinG, bowl.proteinGPerServing + lax.proteinGPerServing + skyr.proteinGPerServing);
  assert.equal(merged.find((l) => l.date === "2026-10-20")?.proteinG, 135);
  assert.ok((calcPreliminaryWeeklyScore(merged, p) ?? 0) > (calcPreliminaryWeeklyScore(logs, p) ?? 0));

  // Plan utan ätna måltider: gammal manuell data på den dagen ska inte räknas
  const unEaten = overlayMealNutrition(logs, "2026-10-19", "2026-10-25", [meal("lunch", bowl.id, "planned", "2026-10-19")], SEED_RECIPES);
  assert.equal(unEaten.find((l) => l.date === "2026-10-19")?.proteinG, null);

  // En dag som bara har ätna måltider (ingen logg) blir en loggad dag
  const onlyMeals = overlayMealNutrition([], "2026-10-19", "2026-10-25", meals, SEED_RECIPES);
  assert.equal(onlyMeals.length, 1);
});

test("dagens fokus: protein och fiber följer ätna måltider när dagen har en plan", () => {
  const items = buildFocusItems("2026-10-19", EMPTY_FORM, DEFAULT_APP_SETTINGS.program, null, { proteinG: 140, fiberG: 12 });
  assert.equal(items.length, 4);
  assert.deepEqual(items.map((i) => i.key).slice(0, 3), ["protein", "fiber", "walk"]);
  assert.equal(items.find((i) => i.key === "protein")?.done, true);
  assert.equal(items.find((i) => i.key === "fiber")?.done, false);
  assert.ok(!items.some((i) => ["calories", "carbs", "fat", "steps"].includes(i.key)));
});

// ---------- Databas: migration, receptlager, måltidsplan ----------

test("databasen har recept och planerade måltider, seedade med 12+ recept", async () => {
  const db = await getDatabase();
  assert.ok(LATEST_SCHEMA_VERSION >= 3);
  assert.equal(db.version, LATEST_SCHEMA_VERSION);
  assert.ok(db.objectStoreNames.contains("recipes") && db.objectStoreNames.contains("planned_meals"));
  assert.ok((await getAllRecipes()).length >= 12);
});

test("måltidsplan: en måltid kan planeras, och ligger kvar", async () => {
  const m = await setPlannedMeal(DAY, "lunch", bowl.id);
  assert.equal(m.status, "planned");
  assert.equal(m.eatenAt, null);
  const day = await getPlannedMealsForDate(DAY);
  assert.equal(day.length, 1);
  assert.equal(day[0].recipeId, bowl.id);
});

test("måltidsplan: recept filtreras på måltidstyp och fel typ nekas", async () => {
  const lunches = await getRecipesByMealType("lunch");
  assert.ok(lunches.length >= 3 && lunches.every((r) => r.mealType === "lunch"));
  const dinners = await getRecipesByMealType("dinner");
  assert.ok(dinners.every((r) => r.mealType === "dinner"));
  await assert.rejects(() => setPlannedMeal(DAY, "lunch", lax.id)); // middagsrecept i lunchluckan
  await assert.rejects(() => setPlannedMeal(DAY, "lunch", "finns-inte"));
  assert.equal((await getPlannedMealsForDate(DAY)).length, 1);
});

test("måltidsplan: byte ger nytt recept, nollställer ätet och påverkar inte andra måltider; en per plats", async () => {
  await setPlannedMeal(DAY, "breakfast", oats.id);
  await setMealEaten(DAY, "breakfast", true);
  await setMealEaten(DAY, "lunch", true);
  const swapped = await setPlannedMeal(DAY, "lunch", R("seed-tonfisk-bonsallad").id);
  assert.equal(swapped.status, "planned");
  assert.equal(swapped.eatenAt, null);
  const day = await getPlannedMealsForDate(DAY);
  assert.equal(day.length, 2); // ingen dubblett
  assert.equal(day.find((m) => m.mealType === "breakfast")?.status, "eaten"); // orörd
  // Väljer man samma recept igen ändras ingenting
  await setMealEaten(DAY, "lunch", true);
  const same = await setPlannedMeal(DAY, "lunch", R("seed-tonfisk-bonsallad").id);
  assert.equal(same.status, "eaten");
});

test("måltidsplan: status kan växlas, eatenAt sätts och tas bort, och sparas i databasen", async () => {
  const on = await setMealEaten(DAY, "breakfast", true);
  assert.equal(on?.status, "eaten");
  assert.ok(on?.eatenAt);
  // Läs med en helt ny anslutning, som efter att appen stängts och öppnats igen
  const raw = await new Promise<PlannedMeal[]>((resolve, reject) => {
    const open = indexedDB.open("daily-coach");
    open.onsuccess = () => {
      const req = open.result.transaction("planned_meals", "readonly").objectStore("planned_meals").getAll();
      req.onsuccess = () => {
        open.result.close();
        resolve(req.result as PlannedMeal[]);
      };
      req.onerror = () => reject(req.error);
    };
    open.onerror = () => reject(open.error);
  });
  assert.equal(raw.find((m) => m.id === `${DAY}_breakfast`)?.status, "eaten");

  const off = await setMealEaten(DAY, "breakfast", false);
  assert.equal(off?.status, "planned");
  assert.equal(off?.eatenAt, null);
  assert.equal(await setMealEaten(DAY, "dinner", true), null); // inget planerat => inget händer
  assert.equal((await getPlannedMealsBetween(DAY, DAY)).length, 2);
});

test("veckosammanfattning läser ätna måltider via databasen", async () => {
  await setPlannedMeal("2026-10-20", "dinner", lax.id);
  await setMealEaten("2026-10-20", "dinner", true);
  await upsertDailyLog({ date: "2026-10-20", sleepHours: 8 });
  await upsertDailyLog({ date: "2026-10-21", sleepHours: 8 });
  const w = await getWeekSummary("2026-10-21", DEFAULT_APP_SETTINGS.program);
  assert.ok(w.score !== null && w.score > 0);
});

// ---------- Settings ----------

test("settings: kolhydrat- och fettmål har standard 180/60 och sparas", async () => {
  assert.equal(DEFAULT_APP_SETTINGS.program.carbsTargetG, 180);
  assert.equal(DEFAULT_APP_SETTINGS.program.fatTargetG, 60);
  const form = { ...settingsToForm(DEFAULT_APP_SETTINGS), carbsTargetG: "200", fatTargetG: "65", calorieTarget: "2000" };
  const r = formToSettings(form, DEFAULT_APP_SETTINGS);
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.equal(r.settings.program.carbsTargetG, 200);
  assert.equal(r.settings.program.fatTargetG, 65);
  await saveAppSettings(r.settings);
  const read = await getAppSettings();
  assert.equal(read.program.carbsTargetG, 200);
  assert.equal(read.program.fatTargetG, 65);
});

test("settings: orimliga eller tomma kolhydrat- och fettmål avvisas", () => {
  const base = settingsToForm(DEFAULT_APP_SETTINGS);
  assert.equal(formToSettings({ ...base, carbsTargetG: "" }, DEFAULT_APP_SETTINGS).ok, false);
  assert.equal(formToSettings({ ...base, fatTargetG: "5" }, DEFAULT_APP_SETTINGS).ok, false);
  assert.equal(formToSettings({ ...base, carbsTargetG: "abc" }, DEFAULT_APP_SETTINGS).ok, false);
});

test("settings: ändrade mål slår igenom i texten under Dagens meny", async () => {
  assert.equal(formatTargetsLine(DEFAULT_APP_SETTINGS.program).replace(/\s/g, " "), "1 800 kcal • 135 g protein • 180 g kolhydrater • 60 g fett • 30+ g fiber");
  const next = (await getAppSettings()).program;
  assert.match(formatTargetsLine(next).replace(/\s/g, " "), /^2 000 kcal • 135 g protein • 200 g kolhydrater • 65 g fett • 30\+ g fiber$/);
});

// ---------- Backup ----------

test("backup: export ger giltig data med settings, loggar, recept och planerade måltider", async () => {
  const backup = await exportBackup();
  assert.equal(backup.app, "daily-coach");
  assert.equal(backup.schemaVersion, LATEST_SCHEMA_VERSION);
  assert.ok(backup.data.dailyLogs.length >= 2);
  assert.ok(backup.data.recipes.length >= 12);
  assert.ok(backup.data.plannedMeals.length >= 3);
  assert.equal(backup.data.settings.program.carbsTargetG, 200);
  const parsed = parseBackupText(JSON.stringify(backup));
  assert.ok(parsed.ok);
});

test("backup: import återställer data (ersätter allt) och mått följer med", async () => {
  await upsertDailyLog({ date: "2026-10-22", waistCm: 80.5, weightKg: 71.8 });
  const snapshot = await exportBackup();
  const json = JSON.stringify(snapshot);

  // Ändra allt efter backupen
  await upsertDailyLog({ date: "2026-10-22", waistCm: 99 });
  await upsertDailyLog({ date: "2026-12-01", weightKg: 60 });
  await setMealEaten(DAY, "breakfast", true);
  await saveAppSettings({ ...DEFAULT_APP_SETTINGS });

  const parsed = parseBackupText(json);
  assert.ok(parsed.ok);
  if (!parsed.ok) return;
  await replaceAllData(parsed.backup.data);

  assert.equal((await getDailyLog("2026-10-22"))?.waistCm, 80.5);
  assert.equal(await getDailyLog("2026-12-01"), null); // fanns inte i backupen => borta
  assert.equal((await getPlannedMealsForDate(DAY)).find((m) => m.mealType === "breakfast")?.status, "planned");
  assert.equal((await getAppSettings()).program.carbsTargetG, 200);
  assert.deepEqual(await getDailyLogsBetween("2026-10-01", "2026-12-31"), snapshot.data.dailyLogs);
});

test("backup: ogiltiga filer avvisas med ett begripligt fel och rör ingenting", async () => {
  const good = await exportBackup();
  const bad = (mutate: (b: typeof good) => unknown) => validateBackup(mutate(structuredClone(good)));

  assert.equal(parseBackupText("det här är inte json").ok, false);
  assert.equal(parseBackupText("[]").ok, false);
  assert.equal(validateBackup({ app: "annan-app" }).ok, false);
  assert.equal(bad((b) => ({ ...b, formatVersion: 99 })).ok, false);
  assert.equal(bad((b) => ({ ...b, data: { ...b.data, dailyLogs: [{ date: "inte-datum" }] } })).ok, false);
  assert.equal(bad((b) => ({ ...b, data: { ...b.data, recipes: [{ id: "x" }] } })).ok, false);
  assert.equal(bad((b) => { b.data.plannedMeals[0].recipeId = "finns-inte"; return b; }).ok, false);
  assert.equal(bad((b) => { b.data.plannedMeals.push({ ...b.data.plannedMeals[0], id: "dubblett" }); return b; }).ok, false);
  const r = parseBackupText("{");
  assert.ok(!r.ok && r.error.length > 10);

  // Ingenting ändrades
  assert.deepEqual(await exportBackup().then((b) => b.data.dailyLogs), good.data.dailyLogs);
});

test("backup: äldre backup utan kolhydrat- och fettmål fylls på med standardvärden", () => {
  const oldSettings = { program: { ...DEFAULT_APP_SETTINGS.program, calorieTarget: 1900 }, baseline: DEFAULT_APP_SETTINGS.baseline } as Record<string, unknown>;
  delete (oldSettings.program as Record<string, unknown>).carbsTargetG;
  delete (oldSettings.program as Record<string, unknown>).fatTargetG;
  const r = validateBackup({
    app: "daily-coach",
    formatVersion: 1,
    schemaVersion: 2,
    exportedAt: "2026-10-16T10:00:00.000Z",
    data: { settings: oldSettings, dailyLogs: [], recipes: [], plannedMeals: [] },
  });
  assert.ok(r.ok);
  if (r.ok) {
    assert.equal(r.backup.data.settings.program.calorieTarget, 1900);
    assert.equal(r.backup.data.settings.program.carbsTargetG, 180);
  }
});

test("backup: misslyckad återställning är allt-eller-inget, befintlig data finns kvar", async () => {
  const before = await exportBackup();
  const broken = structuredClone(before.data);
  // Två olika id:n på samma plats bryter det unika indexet mitt i skrivningen
  broken.plannedMeals = [
    { ...broken.plannedMeals[0], id: "a" },
    { ...broken.plannedMeals[0], id: "b" },
  ];
  await assert.rejects(() => replaceAllData(broken));
  const after = await exportBackup();
  assert.deepEqual(after.data.dailyLogs, before.data.dailyLogs);
  assert.deepEqual(after.data.plannedMeals, before.data.plannedMeals);
  assert.equal(after.data.recipes.length, before.data.recipes.length);
});
