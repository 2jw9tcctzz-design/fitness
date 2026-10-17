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
];

export const LATEST_SCHEMA_VERSION = migrations[migrations.length - 1].version;

/** Körs från onupgradeneeded: tillämpar alla migrationer nyare än den gamla versionen. */
export function applyMigrations(db: IDBDatabase, tx: IDBTransaction, oldVersion: number): void {
  for (const m of migrations) {
    if (m.version > oldVersion) m.up(db, tx);
  }
}
