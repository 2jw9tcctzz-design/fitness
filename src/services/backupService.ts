import { mergeWithDefaults } from "../db/repositories/settingsRepository";
import type { DailyLog } from "../types/dailyLog";
import { isMealType, type PlannedMeal, type Recipe } from "../types/meal";
import type { AppSettings } from "../types/program";
import { isValidDateString, toDateString } from "../utils/dates";

/** Allt som ingår i en backup. Kroppsmått finns i dagloggarna (dagens mått) och i settings (startvärden). */
export type BackupData = {
  settings: AppSettings;
  dailyLogs: DailyLog[];
  recipes: Recipe[];
  plannedMeals: PlannedMeal[];
};

export type BackupFile = {
  app: "daily-coach";
  formatVersion: 1;
  /** Databasens schemaversion när backupen togs. */
  schemaVersion: number;
  exportedAt: string;
  data: BackupData;
};

export const BACKUP_APP = "daily-coach";
export const BACKUP_FORMAT_VERSION = 1;

export function createBackup(data: BackupData, schemaVersion: number, now = new Date()): BackupFile {
  return { app: BACKUP_APP, formatVersion: BACKUP_FORMAT_VERSION, schemaVersion, exportedAt: now.toISOString(), data };
}

export function backupFileName(now = new Date()): string {
  return `daily-coach-backup-${toDateString(now)}.json`;
}

export type BackupResult = { ok: true; backup: BackupFile } | { ok: false; error: string };

const INVALID = "Filen ser inte ut som en Daily Coach-backup. Inget har ändrats.";
const fail = (error = INVALID): BackupResult => ({ ok: false, error });

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => typeof v === "object" && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === "string";
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isNumOrNull = (v: unknown): boolean => v === undefined || v === null || isNum(v);
const isStrOrNull = (v: unknown): boolean => v === undefined || v === null || isStr(v);

const LOG_NUMBER_FIELDS = [
  "weightKg", "calories", "proteinG", "fiberG", "walkMinutes", "steps", "sleepHours", "energy",
  "mobilityMinutes", "waistCm", "hipsCm", "chestCm", "thighCm", "armCm",
] as const;

function validLog(v: unknown): v is DailyLog {
  if (!isRec(v) || !isStr(v.date) || !isValidDateString(v.date)) return false;
  if (!isStr(v.id) || !isStr(v.createdAt) || !isStr(v.updatedAt)) return false;
  if (!LOG_NUMBER_FIELDS.every((k) => isNumOrNull(v[k]))) return false;
  if (!isStrOrNull(v.note)) return false;
  const s = v.strengthStatus;
  if (!(s === undefined || s === null || s === "done" || s === "skipped" || s === "moved")) return false;
  const moved = v.strengthMovedTo;
  if (!(moved === undefined || moved === null || (isStr(moved) && isValidDateString(moved)))) return false;
  return true;
}

function validRecipe(v: unknown): v is Recipe {
  if (!isRec(v) || !isStr(v.id) || !isStr(v.name) || !isMealType(v.mealType)) return false;
  if (!isNum(v.servings) || !isStr(v.createdAt) || !isStr(v.updatedAt)) return false;
  const nums = [v.caloriesPerServing, v.proteinGPerServing, v.carbsGPerServing, v.fatGPerServing, v.fiberGPerServing];
  if (!nums.every((n) => isNum(n) && n >= 0)) return false;
  if (!isNumOrNull(v.prepMinutes) || !isStrOrNull(v.instructions)) return false;
  if (v.tags !== undefined && !(Array.isArray(v.tags) && v.tags.every(isStr))) return false;
  return (
    Array.isArray(v.ingredients) &&
    v.ingredients.every((i) => isRec(i) && isStr(i.name) && isNum(i.quantity) && isStr(i.unit))
  );
}

function validPlanned(v: unknown): v is PlannedMeal {
  return (
    isRec(v) &&
    isStr(v.id) &&
    isStr(v.date) &&
    isValidDateString(v.date) &&
    isMealType(v.mealType) &&
    isStr(v.recipeId) &&
    (v.status === "planned" || v.status === "eaten") &&
    isStrOrNull(v.eatenAt) &&
    isStr(v.createdAt) &&
    isStr(v.updatedAt)
  );
}

const PROGRAM_NUMBERS = [
  "durationWeeks", "calorieTarget", "proteinTargetG", "carbsTargetG", "fatTargetG", "fiberTargetG",
  "walkTargetMin", "sleepTargetHours", "stepTarget", "mobilityTargetMin",
];

function validSettings(v: unknown): boolean {
  if (!isRec(v) || !isRec(v.program) || !isRec(v.baseline)) return false;
  const p = v.program;
  // Saknade fält (t.ex. kolhydratmål i en äldre backup) fylls på med standardvärden; felaktiga avvisas.
  if (!PROGRAM_NUMBERS.every((k) => p[k] === undefined || (isNum(p[k]) && (p[k] as number) > 0))) return false;
  if (p.programStartDate !== undefined && !(isStr(p.programStartDate) && isValidDateString(p.programStartDate))) return false;
  if (p.strengthDays !== undefined && !(Array.isArray(p.strengthDays) && p.strengthDays.every((d) => Number.isInteger(d) && d >= 1 && d <= 7))) return false;
  const b = v.baseline;
  if (!isNumOrNull(b.startWeightKg)) return false;
  if (b.startMeasurements !== undefined) {
    if (!isRec(b.startMeasurements)) return false;
    if (!Object.values(b.startMeasurements).every(isNumOrNull)) return false;
  }
  return true;
}

/** Kontrollerar en inläst backup. Allt eller inget: en enda felaktig rad avvisar hela filen. */
export function validateBackup(raw: unknown): BackupResult {
  if (!isRec(raw) || raw.app !== BACKUP_APP) return fail();
  if (raw.formatVersion !== BACKUP_FORMAT_VERSION) {
    return fail("Backupen kommer från en version av appen som inte stöds. Inget har ändrats.");
  }
  const data = raw.data;
  if (!isRec(data)) return fail();
  const { settings, dailyLogs, recipes, plannedMeals } = data;
  if (!validSettings(settings)) return fail();
  if (!Array.isArray(dailyLogs) || !dailyLogs.every(validLog)) return fail();
  if (!Array.isArray(recipes) || !recipes.every(validRecipe)) return fail();
  if (!Array.isArray(plannedMeals) || !plannedMeals.every(validPlanned)) return fail();

  const dates = new Set(dailyLogs.map((l) => l.date));
  if (dates.size !== dailyLogs.length) return fail();
  const recipeIds = new Set(recipes.map((r) => r.id));
  if (recipeIds.size !== recipes.length) return fail();
  const slots = new Set<string>();
  for (const m of plannedMeals) {
    if (!recipeIds.has(m.recipeId)) return fail("Backupen innehåller måltider med recept som saknas. Inget har ändrats.");
    const slot = `${m.date}_${m.mealType}`;
    if (slots.has(slot)) return fail();
    slots.add(slot);
  }

  return {
    ok: true,
    backup: {
      app: BACKUP_APP,
      formatVersion: BACKUP_FORMAT_VERSION,
      schemaVersion: isNum(raw.schemaVersion) ? raw.schemaVersion : 0,
      exportedAt: isStr(raw.exportedAt) ? raw.exportedAt : "",
      data: {
        settings: mergeWithDefaults(settings as Partial<AppSettings>),
        dailyLogs: dailyLogs as DailyLog[],
        recipes: recipes as Recipe[],
        plannedMeals: plannedMeals as PlannedMeal[],
      },
    },
  };
}

export function parseBackupText(text: string): BackupResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return fail("Filen kunde inte läsas som JSON. Inget har ändrats.");
  }
  return validateBackup(raw);
}
