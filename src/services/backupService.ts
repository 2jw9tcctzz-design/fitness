import { mergeWithDefaults } from "../db/repositories/settingsRepository";
import type { DailyLog } from "../types/dailyLog";
import { isMealType, type PlannedMeal, type Recipe } from "../types/meal";
import type { AppSettings } from "../types/program";
import type { ExerciseLog, ExerciseSet, OtherActivityLog, WorkoutSession } from "../types/training";
import { PROGRAM_VERSION } from "../config/trainingProgram";
import { isValidDateString, toDateString } from "../utils/dates";

/** Allt som ingår i en backup. Kroppsmått finns i dagloggarna (dagens mått) och i settings (startvärden). */
export type BackupData = {
  settings: AppSettings;
  dailyLogs: DailyLog[];
  recipes: Recipe[];
  plannedMeals: PlannedMeal[];
  /** Träning (Sprint 3). Saknas i äldre backuper och tolkas då som tomt. */
  workoutSessions: WorkoutSession[];
  exerciseLogs: ExerciseLog[];
  exerciseSets: ExerciseSet[];
  otherActivities: OtherActivityLog[];
};

export type BackupFile = {
  app: "daily-coach";
  formatVersion: 1 | 2;
  /** Passmallarnas version. Mallarna ligger i appen, inte i backupen. */
  programVersion?: number;
  /** Databasens schemaversion när backupen togs. */
  schemaVersion: number;
  exportedAt: string;
  data: BackupData;
};

export const BACKUP_APP = "daily-coach";
export const BACKUP_FORMAT_VERSION = 2;
const SUPPORTED_FORMAT_VERSIONS = [1, 2];

export function createBackup(data: BackupData, schemaVersion: number, now = new Date()): BackupFile {
  return {
    app: BACKUP_APP,
    formatVersion: BACKUP_FORMAT_VERSION,
    programVersion: PROGRAM_VERSION,
    schemaVersion,
    exportedAt: now.toISOString(),
    data,
  };
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

function validSession(v: unknown): v is WorkoutSession {
  return (
    isRec(v) &&
    isStr(v.id) &&
    isStr(v.plannedDate) &&
    isValidDateString(v.plannedDate) &&
    (v.performedDate == null || (isStr(v.performedDate) && isValidDateString(v.performedDate))) &&
    (v.movedToDate == null || (isStr(v.movedToDate) && isValidDateString(v.movedToDate))) &&
    (v.status === "planned" || v.status === "completed" || v.status === "moved" || v.status === "skipped") &&
    isStrOrNull(v.templateId) &&
    isStrOrNull(v.startedAt) &&
    isStrOrNull(v.completedAt) &&
    isStrOrNull(v.note) &&
    isStr(v.createdAt) &&
    isStr(v.updatedAt)
  );
}

function validExerciseLog(v: unknown): v is ExerciseLog {
  return isRec(v) && isStr(v.id) && isStr(v.workoutSessionId) && isStr(v.exerciseName) && isNum(v.order) && isStrOrNull(v.templateExerciseId) && isStrOrNull(v.note);
}

function validExerciseSet(v: unknown): v is ExerciseSet {
  return (
    isRec(v) &&
    isStr(v.id) &&
    isStr(v.exerciseLogId) &&
    isNum(v.setNumber) &&
    isNumOrNull(v.weightKg) &&
    isNumOrNull(v.reps) &&
    isNumOrNull(v.durationSeconds) &&
    typeof v.completed === "boolean"
  );
}

function validOtherActivity(v: unknown): v is OtherActivityLog {
  return isRec(v) && isStr(v.id) && isStr(v.date) && isValidDateString(v.date) && isStr(v.activityName) && isNumOrNull(v.durationMinutes) && isStrOrNull(v.note);
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
  if (typeof raw.formatVersion !== "number" || !SUPPORTED_FORMAT_VERSIONS.includes(raw.formatVersion)) {
    return fail("Backupen kommer från en version av appen som inte stöds. Inget har ändrats.");
  }
  const data = raw.data;
  if (!isRec(data)) return fail();
  const { settings, dailyLogs, recipes, plannedMeals } = data;
  // Träningsdata finns bara i nyare backuper; saknade listor blir tomma.
  const workoutSessions = data.workoutSessions ?? [];
  const exerciseLogs = data.exerciseLogs ?? [];
  const exerciseSets = data.exerciseSets ?? [];
  const otherActivities = data.otherActivities ?? [];
  if (!validSettings(settings)) return fail();
  if (!Array.isArray(dailyLogs) || !dailyLogs.every(validLog)) return fail();
  if (!Array.isArray(recipes) || !recipes.every(validRecipe)) return fail();
  if (!Array.isArray(plannedMeals) || !plannedMeals.every(validPlanned)) return fail();

  if (!Array.isArray(workoutSessions) || !workoutSessions.every(validSession)) return fail();
  if (!Array.isArray(exerciseLogs) || !exerciseLogs.every(validExerciseLog)) return fail();
  if (!Array.isArray(exerciseSets) || !exerciseSets.every(validExerciseSet)) return fail();
  if (!Array.isArray(otherActivities) || !otherActivities.every(validOtherActivity)) return fail();
  const sessionIds = new Set(workoutSessions.map((s) => s.id));
  if (sessionIds.size !== workoutSessions.length) return fail();
  if (new Set(workoutSessions.map((s) => s.plannedDate)).size !== workoutSessions.length) return fail();
  if (new Set(exerciseLogs.map((l) => l.id)).size !== exerciseLogs.length) return fail();
  if (!exerciseLogs.every((l) => sessionIds.has(l.workoutSessionId))) {
    return fail("Backupen innehåller övningar utan pass. Inget har ändrats.");
  }
  const logIds = new Set(exerciseLogs.map((l) => l.id));
  if (new Set(exerciseSets.map((x) => x.id)).size !== exerciseSets.length) return fail();
  if (!exerciseSets.every((x) => logIds.has(x.exerciseLogId))) {
    return fail("Backupen innehåller set utan övning. Inget har ändrats.");
  }
  if (new Set(otherActivities.map((a) => a.id)).size !== otherActivities.length) return fail();

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
      programVersion: isNum(raw.programVersion) ? raw.programVersion : undefined,
      schemaVersion: isNum(raw.schemaVersion) ? raw.schemaVersion : 0,
      exportedAt: isStr(raw.exportedAt) ? raw.exportedAt : "",
      data: {
        settings: mergeWithDefaults(settings as Partial<AppSettings>),
        dailyLogs: dailyLogs as DailyLog[],
        recipes: recipes as Recipe[],
        plannedMeals: plannedMeals as PlannedMeal[],
        workoutSessions: workoutSessions as WorkoutSession[],
        exerciseLogs: exerciseLogs as ExerciseLog[],
        exerciseSets: exerciseSets as ExerciseSet[],
        otherActivities: otherActivities as OtherActivityLog[],
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
