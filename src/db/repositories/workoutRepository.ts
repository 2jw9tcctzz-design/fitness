import type { ExerciseLog, ExerciseSet, OtherActivityLog, WorkoutSession } from "../../types/training";
import { getDatabase } from "../database";
import { done, request } from "../idb";
import {
  ACTIVITIES_BY_DATE_INDEX,
  EXERCISE_LOGS_STORE,
  EXERCISE_SETS_STORE,
  LOGS_BY_NAME_INDEX,
  LOGS_BY_SESSION_INDEX,
  OTHER_ACTIVITIES_STORE,
  SESSIONS_BY_MOVED_TO_INDEX,
  SESSIONS_BY_PERFORMED_INDEX,
  SESSIONS_BY_PLANNED_INDEX,
  SETS_BY_LOG_INDEX,
  WORKOUT_SESSIONS_STORE,
} from "../migrations";

export function newId(prefix = ""): string {
  return `${prefix}${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function sessionIdForDate(plannedDate: string): string {
  return `ws_${plannedDate}`;
}

const ALL_STORES = [WORKOUT_SESSIONS_STORE, EXERCISE_LOGS_STORE, EXERCISE_SETS_STORE];

// ---------- Pass ----------

/** Alla pass som berör intervallet: planerade, genomförda eller flyttade dit. */
export async function getSessionsTouching(startDate: string, endDate: string): Promise<WorkoutSession[]> {
  const db = await getDatabase();
  const store = db.transaction(WORKOUT_SESSIONS_STORE, "readonly").objectStore(WORKOUT_SESSIONS_STORE);
  const range = IDBKeyRange.bound(startDate, endDate);
  const [a, b, c] = await Promise.all([
    request<WorkoutSession[]>(store.index(SESSIONS_BY_PLANNED_INDEX).getAll(range)),
    request<WorkoutSession[]>(store.index(SESSIONS_BY_PERFORMED_INDEX).getAll(range)),
    request<WorkoutSession[]>(store.index(SESSIONS_BY_MOVED_TO_INDEX).getAll(range)),
  ]);
  const byId = new Map<string, WorkoutSession>();
  for (const s of [...a, ...b, ...c]) byId.set(s.id, s);
  return [...byId.values()].sort((x, y) => x.plannedDate.localeCompare(y.plannedDate));
}

export async function getSession(id: string): Promise<WorkoutSession | null> {
  const db = await getDatabase();
  const row = await request<WorkoutSession | undefined>(
    db.transaction(WORKOUT_SESSIONS_STORE, "readonly").objectStore(WORKOUT_SESSIONS_STORE).get(id)
  );
  return row ?? null;
}

export async function getAllSessions(): Promise<WorkoutSession[]> {
  const db = await getDatabase();
  return request<WorkoutSession[]>(db.transaction(WORKOUT_SESSIONS_STORE, "readonly").objectStore(WORKOUT_SESSIONS_STORE).getAll());
}

export async function putSession(session: WorkoutSession): Promise<void> {
  const db = await getDatabase();
  const tx = db.transaction(WORKOUT_SESSIONS_STORE, "readwrite");
  tx.objectStore(WORKOUT_SESSIONS_STORE).put(session);
  await done(tx);
}

/** Tar bort ett pass med alla övningar och set (t.ex. när en flytt ångras utan loggad träning). */
export async function deleteSession(id: string): Promise<void> {
  const db = await getDatabase();
  const tx = db.transaction(ALL_STORES, "readwrite");
  const logs = await request<ExerciseLog[]>(tx.objectStore(EXERCISE_LOGS_STORE).index(LOGS_BY_SESSION_INDEX).getAll(id));
  for (const log of logs) {
    const sets = await request<ExerciseSet[]>(tx.objectStore(EXERCISE_SETS_STORE).index(SETS_BY_LOG_INDEX).getAll(log.id));
    for (const s of sets) tx.objectStore(EXERCISE_SETS_STORE).delete(s.id);
    tx.objectStore(EXERCISE_LOGS_STORE).delete(log.id);
  }
  tx.objectStore(WORKOUT_SESSIONS_STORE).delete(id);
  await done(tx);
}

// ---------- Övningar och set ----------

export type LoggedExercise = { log: ExerciseLog; sets: ExerciseSet[] };

export async function getWorkoutDetail(sessionId: string): Promise<LoggedExercise[]> {
  const db = await getDatabase();
  const tx = db.transaction([EXERCISE_LOGS_STORE, EXERCISE_SETS_STORE], "readonly");
  const logs = await request<ExerciseLog[]>(tx.objectStore(EXERCISE_LOGS_STORE).index(LOGS_BY_SESSION_INDEX).getAll(sessionId));
  logs.sort((a, b) => a.order - b.order);
  const result: LoggedExercise[] = [];
  for (const log of logs) {
    const sets = await request<ExerciseSet[]>(tx.objectStore(EXERCISE_SETS_STORE).index(SETS_BY_LOG_INDEX).getAll(log.id));
    sets.sort((a, b) => a.setNumber - b.setNumber);
    result.push({ log, sets });
  }
  return result;
}

export async function countExerciseLogs(sessionId: string): Promise<number> {
  const db = await getDatabase();
  return request<number>(db.transaction(EXERCISE_LOGS_STORE, "readonly").objectStore(EXERCISE_LOGS_STORE).index(LOGS_BY_SESSION_INDEX).count(sessionId));
}

/** Skapar passet med övningar och tomma set i en transaktion. */
export async function createWorkout(session: WorkoutSession, exercises: LoggedExercise[]): Promise<void> {
  const db = await getDatabase();
  const tx = db.transaction(ALL_STORES, "readwrite");
  tx.objectStore(WORKOUT_SESSIONS_STORE).put(session);
  for (const e of exercises) {
    tx.objectStore(EXERCISE_LOGS_STORE).put(e.log);
    for (const s of e.sets) tx.objectStore(EXERCISE_SETS_STORE).put(s);
  }
  await done(tx);
}

export async function putSets(sets: ExerciseSet[]): Promise<void> {
  if (sets.length === 0) return;
  const db = await getDatabase();
  const tx = db.transaction(EXERCISE_SETS_STORE, "readwrite");
  for (const s of sets) tx.objectStore(EXERCISE_SETS_STORE).put(s);
  await done(tx);
}

export async function putExerciseLog(log: ExerciseLog): Promise<void> {
  const db = await getDatabase();
  const tx = db.transaction(EXERCISE_LOGS_STORE, "readwrite");
  tx.objectStore(EXERCISE_LOGS_STORE).put(log);
  await done(tx);
}

export async function addExercise(exercise: LoggedExercise): Promise<void> {
  const db = await getDatabase();
  const tx = db.transaction([EXERCISE_LOGS_STORE, EXERCISE_SETS_STORE], "readwrite");
  tx.objectStore(EXERCISE_LOGS_STORE).put(exercise.log);
  for (const s of exercise.sets) tx.objectStore(EXERCISE_SETS_STORE).put(s);
  await done(tx);
}

export async function deleteSet(id: string): Promise<void> {
  const db = await getDatabase();
  const tx = db.transaction(EXERCISE_SETS_STORE, "readwrite");
  tx.objectStore(EXERCISE_SETS_STORE).delete(id);
  await done(tx);
}

export async function deleteExercise(logId: string): Promise<void> {
  const db = await getDatabase();
  const tx = db.transaction([EXERCISE_LOGS_STORE, EXERCISE_SETS_STORE], "readwrite");
  const sets = await request<ExerciseSet[]>(tx.objectStore(EXERCISE_SETS_STORE).index(SETS_BY_LOG_INDEX).getAll(logId));
  for (const s of sets) tx.objectStore(EXERCISE_SETS_STORE).delete(s.id);
  tx.objectStore(EXERCISE_LOGS_STORE).delete(logId);
  await done(tx);
}

export type PreviousPerformance = {
  sessionId: string;
  date: string;
  exerciseName: string;
  sets: ExerciseSet[];
};

/**
 * Senaste genomförda gången en övning med samma namn gjordes före `beforeDate`, med klara set.
 * Matchar på namn: ett bytt alternativ (t.ex. Leg press i stället för Knäböj) jämförs mot sig själv.
 */
export async function getPreviousPerformance(
  exerciseName: string,
  beforeDate: string,
  excludeSessionId?: string | null
): Promise<PreviousPerformance | null> {
  const db = await getDatabase();
  const tx = db.transaction(ALL_STORES, "readonly");
  const logs = await request<ExerciseLog[]>(tx.objectStore(EXERCISE_LOGS_STORE).index(LOGS_BY_NAME_INDEX).getAll(exerciseName));
  let best: { session: WorkoutSession; log: ExerciseLog } | null = null;
  for (const log of logs) {
    if (log.workoutSessionId === excludeSessionId) continue;
    const session = await request<WorkoutSession | undefined>(tx.objectStore(WORKOUT_SESSIONS_STORE).get(log.workoutSessionId));
    if (!session || session.status !== "completed" || !session.performedDate) continue;
    if (session.performedDate >= beforeDate) continue;
    if (!best || session.performedDate > (best.session.performedDate as string)) best = { session, log };
  }
  if (!best) return null;
  const sets = await request<ExerciseSet[]>(tx.objectStore(EXERCISE_SETS_STORE).index(SETS_BY_LOG_INDEX).getAll(best.log.id));
  const completed = sets.filter((s) => s.completed).sort((a, b) => a.setNumber - b.setNumber);
  if (completed.length === 0) return null;
  return { sessionId: best.session.id, date: best.session.performedDate as string, exerciseName, sets: completed };
}

/** Senast använda övningsnamn per mallövning (så ett valt alternativ minns till nästa gång). */
export async function getLastNameByTemplateExercise(): Promise<Map<string, string>> {
  const db = await getDatabase();
  const tx = db.transaction([EXERCISE_LOGS_STORE, WORKOUT_SESSIONS_STORE], "readonly");
  const [logs, sessions] = await Promise.all([
    request<ExerciseLog[]>(tx.objectStore(EXERCISE_LOGS_STORE).getAll()),
    request<WorkoutSession[]>(tx.objectStore(WORKOUT_SESSIONS_STORE).getAll()),
  ]);
  const when = new Map(sessions.map((s) => [s.id, s.startedAt ?? s.plannedDate]));
  const latest = new Map<string, { at: string; name: string }>();
  for (const l of logs) {
    if (!l.templateExerciseId) continue;
    const at = when.get(l.workoutSessionId);
    if (!at) continue;
    const cur = latest.get(l.templateExerciseId);
    if (!cur || at > cur.at) latest.set(l.templateExerciseId, { at, name: l.exerciseName });
  }
  return new Map([...latest].map(([k, v]) => [k, v.name]));
}

/** Alla övningsnamn som loggats (för förslag när man lägger till en egen övning). */
export async function getLoggedExerciseNames(): Promise<string[]> {
  const db = await getDatabase();
  const logs = await request<ExerciseLog[]>(db.transaction(EXERCISE_LOGS_STORE, "readonly").objectStore(EXERCISE_LOGS_STORE).getAll());
  return [...new Set(logs.map((l) => l.exerciseName))].sort((a, b) => a.localeCompare(b, "sv"));
}

// ---------- Annan träning ----------

export async function addOtherActivity(activity: OtherActivityLog): Promise<void> {
  const db = await getDatabase();
  const tx = db.transaction(OTHER_ACTIVITIES_STORE, "readwrite");
  tx.objectStore(OTHER_ACTIVITIES_STORE).put(activity);
  await done(tx);
}

export async function getOtherActivitiesForDate(date: string): Promise<OtherActivityLog[]> {
  const db = await getDatabase();
  return request<OtherActivityLog[]>(
    db.transaction(OTHER_ACTIVITIES_STORE, "readonly").objectStore(OTHER_ACTIVITIES_STORE).index(ACTIVITIES_BY_DATE_INDEX).getAll(date)
  );
}

export async function deleteOtherActivity(id: string): Promise<void> {
  const db = await getDatabase();
  const tx = db.transaction(OTHER_ACTIVITIES_STORE, "readwrite");
  tx.objectStore(OTHER_ACTIVITIES_STORE).delete(id);
  await done(tx);
}
