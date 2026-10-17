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
];

export const LATEST_SCHEMA_VERSION = migrations[migrations.length - 1].version;

/** Körs från onupgradeneeded: tillämpar alla migrationer nyare än den gamla versionen. */
export function applyMigrations(db: IDBDatabase, tx: IDBTransaction, oldVersion: number): void {
  for (const m of migrations) {
    if (m.version > oldVersion) m.up(db, tx);
  }
}
