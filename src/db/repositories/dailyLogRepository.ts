import type { DailyLog, DailyLogInput } from "../../types/dailyLog";
import { getDatabase } from "../database";
import { DAILY_LOGS_STORE, MOVED_TO_INDEX } from "../migrations";

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function orNull<T>(v: T | null | undefined): T | null {
  return v === undefined ? null : v;
}

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error("Transaktionen avbröts"));
  });
}

export async function getDailyLog(date: string): Promise<DailyLog | null> {
  const db = await getDatabase();
  const row = await request<DailyLog | undefined>(
    db.transaction(DAILY_LOGS_STORE, "readonly").objectStore(DAILY_LOGS_STORE).get(date)
  );
  return row ?? null;
}

/**
 * Skapar eller uppdaterar dagens logg. Datumet är primärnyckel, så samma dag
 * aldrig dupliceras; id och createdAt behålls vid uppdatering.
 */
export async function upsertDailyLog(log: DailyLogInput): Promise<DailyLog> {
  const db = await getDatabase();
  const tx = db.transaction(DAILY_LOGS_STORE, "readwrite");
  const store = tx.objectStore(DAILY_LOGS_STORE);

  const existing = await request<DailyLog | undefined>(store.get(log.date));
  const now = new Date().toISOString();

  const row: DailyLog = {
    id: existing?.id ?? newId(),
    date: log.date,
    weightKg: orNull(log.weightKg),
    calories: orNull(log.calories),
    proteinG: orNull(log.proteinG),
    fiberG: orNull(log.fiberG),
    walkMinutes: orNull(log.walkMinutes),
    steps: orNull(log.steps),
    sleepHours: orNull(log.sleepHours),
    energy: orNull(log.energy),
    strengthStatus: orNull(log.strengthStatus),
    strengthMovedTo: log.strengthStatus === "moved" ? orNull(log.strengthMovedTo) : null,
    mobilityMinutes: orNull(log.mobilityMinutes),
    note: orNull(log.note),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  store.put(row);
  await done(tx);
  return row;
}

/** Inklusive båda datumen, sorterat stigande. */
export async function getDailyLogsBetween(startDate: string, endDate: string): Promise<DailyLog[]> {
  const db = await getDatabase();
  return request<DailyLog[]>(
    db
      .transaction(DAILY_LOGS_STORE, "readonly")
      .objectStore(DAILY_LOGS_STORE)
      .getAll(IDBKeyRange.bound(startDate, endDate))
  );
}

export async function deleteDailyLog(date: string): Promise<void> {
  const db = await getDatabase();
  const tx = db.transaction(DAILY_LOGS_STORE, "readwrite");
  tx.objectStore(DAILY_LOGS_STORE).delete(date);
  await done(tx);
}

/** Loggen för det pass som flyttats TILL `date`, eller null. Bestämmer om dagen blir styrkedag. */
export async function getLogMovedTo(date: string): Promise<DailyLog | null> {
  const db = await getDatabase();
  const rows = await request<DailyLog[]>(
    db
      .transaction(DAILY_LOGS_STORE, "readonly")
      .objectStore(DAILY_LOGS_STORE)
      .index(MOVED_TO_INDEX)
      .getAll(date)
  );
  // Ett flyttat pass som sedan själv flyttats vidare/ändrats har status "moved"; bara dessa räknas.
  return rows.find((r) => r.strengthStatus === "moved") ?? null;
}

/** Alla datum som tar emot ett flyttat pass inom intervallet (för att undvika dubbelbokning). */
export async function getMoveTargetsTaken(startDate: string, endDate: string): Promise<Set<string>> {
  const db = await getDatabase();
  const rows = await request<DailyLog[]>(
    db.transaction(DAILY_LOGS_STORE, "readonly").objectStore(DAILY_LOGS_STORE).getAll()
  );
  const taken = new Set<string>();
  for (const r of rows) {
    if (r.strengthStatus === "moved" && r.strengthMovedTo && r.strengthMovedTo >= startDate && r.strengthMovedTo <= endDate) {
      taken.add(r.strengthMovedTo);
    }
  }
  return taken;
}
