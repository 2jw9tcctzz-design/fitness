import { SEED_RECIPES } from "../config/seedRecipes";

/**
 * Versionerade migrationer för IndexedDB. Schemaversionen är databasens version.
 * Lägg till nya migrationer sist i listan; ändra aldrig en migration som redan släppts.
 */
export type Migration = {
  version: number;
  up: (db: IDBDatabase, tx: IDBTransaction) => void;
};

export const DAILY_LOGS_STORE = "daily_logs";
export const MOVED_TO_INDEX = "by_strength_moved_to";
export const SETTINGS_STORE = "settings";
export const RECIPES_STORE = "recipes";
export const RECIPES_BY_MEAL_TYPE_INDEX = "by_meal_type";
export const PLANNED_MEALS_STORE = "planned_meals";
export const PLANNED_BY_DATE_INDEX = "by_date";
export const PLANNED_BY_SLOT_INDEX = "by_slot";
export const WORKOUT_SESSIONS_STORE = "workout_sessions";
export const SESSIONS_BY_PLANNED_INDEX = "by_planned_date";
export const SESSIONS_BY_PERFORMED_INDEX = "by_performed_date";
export const SESSIONS_BY_MOVED_TO_INDEX = "by_moved_to_date";
export const EXERCISE_LOGS_STORE = "exercise_logs";
export const LOGS_BY_SESSION_INDEX = "by_session";
export const LOGS_BY_NAME_INDEX = "by_exercise_name";
export const EXERCISE_SETS_STORE = "exercise_sets";
export const SETS_BY_LOG_INDEX = "by_log";
export const OTHER_ACTIVITIES_STORE = "other_activities";
export const ACTIVITIES_BY_DATE_INDEX = "by_date";

export const migrations: Migration[] = [
  {
    version: 1,
    up: (db) => {
      // date är primärnyckel => en logg per dag, upsert via put()
      const store = db.createObjectStore(DAILY_LOGS_STORE, { keyPath: "date" });
      // Hittar passet som flyttats TILL ett visst datum. Rader utan värde (null) hamnar inte i indexet.
      store.createIndex(MOVED_TO_INDEX, "strengthMovedTo", { unique: false });
    },
  },
  {
    version: 2,
    // Inställningar (mål, programstart, startvikt/startmått). En enda post med nyckeln "app".
    // Dagloggen berörs inte; befintlig data finns kvar vid uppgradering.
    up: (db) => {
      db.createObjectStore(SETTINGS_STORE, { keyPath: "key" });
    },
  },
  {
    version: 3,
    // Mat (Sprint 2A): recept och planerade måltider. Dagloggar och inställningar berörs inte.
    // Nya mål för kolhydrater och fett ligger i inställningsposten och fylls på med standardvärden
    // när den läses (mergeWithDefaults), så ingen sparad post skrivs om här.
    up: (db) => {
      const recipes = db.createObjectStore(RECIPES_STORE, { keyPath: "id" });
      recipes.createIndex(RECIPES_BY_MEAL_TYPE_INDEX, "mealType", { unique: false });
      for (const recipe of SEED_RECIPES) recipes.put(recipe);

      const planned = db.createObjectStore(PLANNED_MEALS_STORE, { keyPath: "id" });
      planned.createIndex(PLANNED_BY_DATE_INDEX, "date", { unique: false });
      // Högst en planerad måltid per dag och måltidstyp.
      planned.createIndex(PLANNED_BY_SLOT_INDEX, ["date", "mealType"], { unique: true });
    },
  },
  {
    version: 4,
    // Träning (Sprint 3): pass, övningar, set och annan träning. Programmallarna ligger i koden
    // (config/trainingProgram.ts), inte i databasen. Befintliga lager berörs inte.
    up: (db) => {
      const sessions = db.createObjectStore(WORKOUT_SESSIONS_STORE, { keyPath: "id" });
      sessions.createIndex(SESSIONS_BY_PLANNED_INDEX, "plannedDate", { unique: true });
      sessions.createIndex(SESSIONS_BY_PERFORMED_INDEX, "performedDate", { unique: false });
      sessions.createIndex(SESSIONS_BY_MOVED_TO_INDEX, "movedToDate", { unique: false });

      const logs = db.createObjectStore(EXERCISE_LOGS_STORE, { keyPath: "id" });
      logs.createIndex(LOGS_BY_SESSION_INDEX, "workoutSessionId", { unique: false });
      logs.createIndex(LOGS_BY_NAME_INDEX, "exerciseName", { unique: false });

      const sets = db.createObjectStore(EXERCISE_SETS_STORE, { keyPath: "id" });
      sets.createIndex(SETS_BY_LOG_INDEX, "exerciseLogId", { unique: false });

      const activities = db.createObjectStore(OTHER_ACTIVITIES_STORE, { keyPath: "id" });
      activities.createIndex(ACTIVITIES_BY_DATE_INDEX, "date", { unique: false });
    },
  },
];

export const LATEST_SCHEMA_VERSION = migrations[migrations.length - 1].version;

/** Körs från onupgradeneeded: tillämpar alla migrationer nyare än den gamla versionen. */
export function applyMigrations(db: IDBDatabase, tx: IDBTransaction, oldVersion: number): void {
  for (const m of migrations) {
    if (m.version > oldVersion) m.up(db, tx);
  }
}
