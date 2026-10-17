import { countExerciseLogs, getSessionsTouching } from "../db/repositories/workoutRepository";
import { getDailyLog, getLogMovedTo, getMoveTargetsTaken } from "../db/repositories/dailyLogRepository";
import type { DailyLog, StrengthStatus } from "../types/dailyLog";
import type { ProgramSettings } from "../types/program";
import type { WorkoutCode, WorkoutSession } from "../types/training";
import { addDays, diffInDays } from "../utils/dates";
import { getWorkoutCodeForDate } from "./programBlockService";
import { isStrengthDay } from "./programService";

/**
 * Träningsstatus per dag. WorkoutSession är primär källa. Äldre dagar som bara har ett
 * `strengthStatus` i dagloggen (före Sprint 3) visas fortfarande, som "legacy".
 */

export type TrainingStatus = "none" | "started" | "completed" | "skipped" | "moved";

export type DayTraining = {
  date: string;
  kind: "strength" | "mobility";
  templateCode: WorkoutCode | null;
  /** Passet som hör till dagen (egen planerad dag, eller flyttat hit). */
  session: WorkoutSession | null;
  /** Planerat datum för ett pass som flyttats hit. */
  receivedFrom: string | null;
  status: TrainingStatus;
  movedTo: string | null;
  /** Statusen kommer från äldre dagslogg (före Sprint 3), inte från ett pass. */
  legacy: boolean;
};

export type ResolveInput = {
  date: string;
  settings: ProgramSettings;
  /** Pass som berör dagen (planerade, genomförda eller flyttade hit). */
  sessions: WorkoutSession[];
  log: DailyLog | null;
  /** Äldre flytt: datum ett pass flyttats hit från enligt dagloggen. */
  legacyMovedInFrom?: string | null;
};

function statusFor(session: WorkoutSession, date: string): TrainingStatus {
  const viewingTarget = session.plannedDate !== date && session.movedToDate === date;
  if (viewingTarget) {
    if (session.status === "completed") return "completed";
    return session.startedAt ? "started" : "none";
  }
  // Den planerade dagen: ett pass som flyttats vidare visas som flyttat, även om det sedan gjorts.
  if (session.movedToDate && session.movedToDate !== date) return "moved";
  switch (session.status) {
    case "completed":
      return "completed";
    case "skipped":
      return "skipped";
    case "moved":
      return "moved";
    default:
      return session.startedAt ? "started" : "none";
  }
}

/** Ren sammanfattning av dagens träning. */
export function resolveDayTraining(input: ResolveInput): DayTraining {
  const { date, settings, sessions, log, legacyMovedInFrom = null } = input;
  const own = sessions.find((s) => s.plannedDate === date) ?? null;
  const received =
    sessions.find(
      (s) =>
        s.plannedDate !== date &&
        s.movedToDate === date &&
        (s.status === "moved" || (s.status === "completed" && s.performedDate === date))
    ) ?? null;
  const session = received ?? own;
  const receivedFrom = received?.plannedDate ?? (session ? null : legacyMovedInFrom);

  const kind = isStrengthDay(date, settings) || receivedFrom !== null ? "strength" : "mobility";
  const templateCode =
    kind === "strength"
      ? ((session?.templateId as WorkoutCode | null | undefined) ??
        getWorkoutCodeForDate(date, settings) ??
        (receivedFrom ? getWorkoutCodeForDate(receivedFrom, settings) : null))
      : null;

  if (session) {
    const status = statusFor(session, date);
    return {
      date,
      kind,
      templateCode,
      session,
      receivedFrom,
      status,
      movedTo: status === "moved" ? (session.movedToDate ?? null) : null,
      legacy: false,
    };
  }

  const legacy: StrengthStatus | null = log?.strengthStatus ?? null;
  if (legacy) {
    const map: Record<StrengthStatus, TrainingStatus> = { done: "completed", skipped: "skipped", moved: "moved" };
    return {
      date,
      kind,
      templateCode,
      session: null,
      receivedFrom,
      status: map[legacy],
      movedTo: legacy === "moved" ? (log?.strengthMovedTo ?? null) : null,
      legacy: true,
    };
  }
  return { date, kind, templateCode, session: null, receivedFrom, status: "none", movedTo: null, legacy: false };
}

export type DayTrainingDetail = DayTraining & {
  exerciseCount: number;
  mobilityMinutes: number | null;
  walkMinutes: number | null;
};

export async function getDayTraining(date: string, settings: ProgramSettings): Promise<DayTrainingDetail> {
  const [sessions, log, legacyIn] = await Promise.all([getSessionsTouching(date, date), getDailyLog(date), getLogMovedTo(date)]);
  const dt = resolveDayTraining({ date, settings, sessions, log, legacyMovedInFrom: legacyIn?.date ?? null });
  const exerciseCount = dt.session ? await countExerciseLogs(dt.session.id) : 0;
  return { ...dt, exerciseCount, mobilityMinutes: log?.mobilityMinutes ?? null, walkMinutes: log?.walkMinutes ?? null };
}

/** Dagar som redan tar emot ett flyttat pass (pass eller äldre dagslogg) inom fönstret efter `fromDate`. */
export async function getTakenMoveTargets(fromDate: string, windowDays: number, exceptSessionId?: string | null): Promise<Set<string>> {
  const start = addDays(fromDate, 1);
  const end = addDays(fromDate, windowDays);
  const [sessions, legacy] = await Promise.all([getSessionsTouching(start, end), getMoveTargetsTaken(start, end)]);
  const taken = new Set(legacy);
  for (const s of sessions) {
    if (s.id !== exceptSessionId && s.movedToDate && s.movedToDate >= start && s.movedToDate <= end) taken.add(s.movedToDate);
  }
  return taken;
}

function blankLog(date: string): DailyLog {
  return { id: `wk-${date}`, date, createdAt: "", updatedAt: "" };
}

/**
 * Lägger passens status över veckans dagloggar inför veckopoängen. En dag som berörs av ett pass
 * styrs helt av passet; dagar utan pass behåller äldre `strengthStatus` från dagloggen.
 * Genomförda pass räknas på dagen de gjordes (performedDate).
 */
export function overlayWorkoutStatus(logs: DailyLog[], weekStart: string, weekEnd: string, sessions: WorkoutSession[]): DailyLog[] {
  const byDate = new Map(logs.map((l) => [l.date, l]));
  const result: DailyLog[] = [];
  const total = diffInDays(weekStart, weekEnd);
  for (let i = 0; i <= total; i++) {
    const date = addDays(weekStart, i);
    const log = byDate.get(date) ?? null;
    const touching = sessions.filter((s) => s.plannedDate === date || s.performedDate === date || s.movedToDate === date);
    if (touching.length === 0) {
      if (log) result.push(log);
      continue;
    }
    let status: StrengthStatus | null = null;
    let movedTo: string | null = null;
    if (touching.some((s) => s.status === "completed" && s.performedDate === date)) {
      status = "done";
    } else {
      const own = touching.find((s) => s.plannedDate === date);
      if (own) {
        if (own.status === "skipped") status = "skipped";
        else if (own.movedToDate && own.movedToDate !== date) {
          status = "moved";
          movedTo = own.movedToDate;
        }
      }
    }
    if (!log && status === null) continue;
    result.push({ ...(log ?? blankLog(date)), strengthStatus: status, strengthMovedTo: movedTo });
  }
  return result;
}
