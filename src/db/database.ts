import { applyMigrations, LATEST_SCHEMA_VERSION } from "./migrations";

const DB_NAME = "daily-coach";

let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * Öppnar databasen och kör migrationer exakt en gång per sidladdning.
 * Alla anropare delar samma promise, så ingen kan nå databasen före migrationerna.
 */
export function getDatabase(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, LATEST_SCHEMA_VERSION);
      request.onupgradeneeded = (event) => {
        applyMigrations(request.result, request.transaction as IDBTransaction, event.oldVersion);
      };
      request.onsuccess = () => {
        const db = request.result;
        // Om en annan flik uppgraderar databasen stänger vi vår anslutning i stället för att blockera.
        db.onversionchange = () => {
          db.close();
          dbPromise = null;
        };
        resolve(db);
      };
      request.onerror = () => reject(request.error ?? new Error("Kunde inte öppna databasen"));
      request.onblocked = () => reject(new Error("Databasen är blockerad av en annan flik"));
    }).catch((error) => {
      // Låt nästa anrop försöka igen i stället för att fastna i ett felat läge.
      dbPromise = null;
      throw error;
    });
  }
  return dbPromise;
}

/** Anropas vid appstart så att eventuella fel syns tidigt. */
export async function initDatabase(): Promise<void> {
  await getDatabase();
}

/** Ber webbläsaren behålla datat även vid lagringsbrist. Bästa försök; fel ignoreras. */
export async function requestPersistentStorage(): Promise<void> {
  try {
    await navigator.storage?.persist?.();
  } catch {
    /* inget att göra */
  }
}
