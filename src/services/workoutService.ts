import { getTemplate } from "../config/trainingProgram";
import { patchDailyLog } from "../db/repositories/dailyLogRepository";
import {
  createWorkout,
  deleteSession,
  getLastNameByTemplateExercise,
  getSession,
  newId,
  putSession,
  sessionIdForDate,
  countExerciseLogs,
  type LoggedExercise,
} from "../db/repositories/workoutRepository";
import type { ProgramSettings } from "../types/program";
import type { WorkoutCode, WorkoutSession } from "../types/training";
import { isValidDateString } from "../utils/dates";
import { getBlockForWeek, getPrescription, getTrainingWeek } from "./programBlockService";
import { getDayTraining } from "./trainingStatusService";

/** Alla förändringar av träningspass. UI går via dessa funktioner. */

const nowIso = () => new Date().toISOString();

async function sessionForDay(date: string, settings: ProgramSettings) {
  const dt = await getDayTraining(date, settings);
  if (dt.kind !== "strength" || !dt.templateCode) {
    throw new Error("Dagen har inget styrkepass.");
  }
  return dt;
}

function newSession(plannedDate: string, templateId: WorkoutCode): WorkoutSession {
  const now = nowIso();
  return {
    id: sessionIdForDate(plannedDate),
    plannedDate,
    performedDate: null,
    templateId,
    status: "planned",
    movedToDate: null,
    startedAt: null,
    completedAt: null,
    note: null,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Startar dagens pass: skapar passet (om det inte finns) med mallens övningar och tomma set.
 * Ett val av alternativ övning från förra gången följer med. Startar man ett pass som flyttats
 * eller markerats "inte gjort" öppnas det på nytt.
 */
export async function startWorkout(date: string, settings: ProgramSettings): Promise<WorkoutSession> {
  const dt = await sessionForDay(date, settings);
  const template = getTemplate(dt.templateCode as string);
  if (!template) throw new Error("Passmallen saknas.");

  let session = dt.session ?? newSession(date, dt.templateCode as WorkoutCode);
  const atTarget = session.plannedDate !== date;
  session = {
    ...session,
    status: atTarget ? "moved" : "planned",
    movedToDate: atTarget ? session.movedToDate : null,
    startedAt: session.startedAt ?? nowIso(),
    updatedAt: nowIso(),
  };

  if ((await countExerciseLogs(session.id)) > 0) {
    await putSession(session);
    return session;
  }

  const block = getBlockForWeek(getTrainingWeek(date, settings));
  const remembered = await getLastNameByTemplateExercise();
  const exercises: LoggedExercise[] = template.exercises.map((te, i) => {
    const logId = newId("el_");
    const p = getPrescription(te, block);
    return {
      log: {
        id: logId,
        workoutSessionId: session.id,
        exerciseName: remembered.get(te.id) ?? te.name,
        templateExerciseId: te.id,
        order: i + 1,
        note: null,
      },
      sets: Array.from({ length: p.sets }, (_, n) => ({
        id: newId("es_"),
        exerciseLogId: logId,
        setNumber: n + 1,
        weightKg: null,
        reps: null,
        durationSeconds: null,
        completed: false,
      })),
    };
  });
  await createWorkout(session, exercises);
  return session;
}

/** Slutför passet. performedDate = dagen det gjordes, plannedDate ligger kvar. */
export async function completeWorkout(date: string, sessionId: string): Promise<WorkoutSession> {
  const s = await getSession(sessionId);
  if (!s) throw new Error("Passet finns inte.");
  const next: WorkoutSession = { ...s, status: "completed", performedDate: date, completedAt: nowIso(), updatedAt: nowIso() };
  await putSession(next);
  return next;
}

/** Öppnar ett slutfört pass igen. Ett pass som flyttats hit blir "flyttat" (väntar) igen. */
export async function reopenWorkout(sessionId: string): Promise<WorkoutSession> {
  const s = await getSession(sessionId);
  if (!s) throw new Error("Passet finns inte.");
  const next: WorkoutSession = {
    ...s,
    status: s.movedToDate ? "moved" : "planned",
    performedDate: null,
    completedAt: null,
    updatedAt: nowIso(),
  };
  await putSession(next);
  return next;
}

/** "Inte gjort". Räknas inte som misslyckande och sänker inte veckopoängen. */
export async function skipWorkout(date: string, settings: ProgramSettings): Promise<WorkoutSession> {
  const dt = await sessionForDay(date, settings);
  const base = dt.session ?? newSession(date, dt.templateCode as WorkoutCode);
  const next: WorkoutSession = { ...base, status: "skipped", movedToDate: null, performedDate: null, completedAt: null, updatedAt: nowIso() };
  await putSession(next);
  return next;
}

/**
 * Flyttar passet framåt till ett annat datum. Samma pass följer med: mall och plannedDate ändras inte,
 * och performedDate sätts först när passet genomförs.
 */
export async function moveWorkout(date: string, target: string, settings: ProgramSettings): Promise<WorkoutSession> {
  if (!isValidDateString(target) || target <= date) {
    throw new Error("Passet kan bara flyttas till en senare dag.");
  }
  const dt = await sessionForDay(date, settings);
  const base = dt.session ?? newSession(date, dt.templateCode as WorkoutCode);
  const next: WorkoutSession = { ...base, status: "moved", movedToDate: target, performedDate: null, completedAt: null, updatedAt: nowIso() };
  await putSession(next);
  return next;
}

/** Ångrar "inte gjort" eller flytt. Passet tas bort om inget loggats i det, annars öppnas det igen. */
export async function undoSkipOrMove(sessionId: string): Promise<void> {
  const s = await getSession(sessionId);
  if (!s) return;
  if (!s.startedAt && (await countExerciseLogs(s.id)) === 0) {
    await deleteSession(s.id);
    return;
  }
  await putSession({ ...s, status: "planned", movedToDate: null, updatedAt: nowIso() });
}

/** Mobility-minuter lagras i dagens logg (befintlig modell). null = inte registrerat. */
export async function setMobilityMinutes(date: string, minutes: number | null): Promise<void> {
  await patchDailyLog(date, { mobilityMinutes: minutes });
}
