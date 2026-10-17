import type { DailyLog } from "../types/dailyLog";
import type { ProgramSettings } from "../types/program";

/**
 * Rena veckoberäkningar (inga databasanrop). Isolerade här så att
 * poängalgoritmen kan bytas ut i Sprint 4 utan att något annat ändras.
 */

export const WEEKLY_SCORE_WEIGHTS = {
  strength: 0.25,
  walk: 0.2,
  protein: 0.2,
  fiber: 0.15,
  sleep: 0.2,
} as const;

/** Minsta antal loggade dagar i veckan innan vi visar en poäng. */
export const MIN_LOGGED_DAYS_FOR_SCORE = 2;

/** Genomförda pass räknas på den dag de gjordes (även ett flyttat pass). */
export function countStrengthCompleted(logs: DailyLog[]): number {
  return logs.filter((l) => l.strengthStatus === "done").length;
}

/** Dagar där promenaden nådde målet. Saknad data räknas inte. */
export function countWalkGoalDays(logs: DailyLog[], settings: ProgramSettings): number {
  return logs.filter((l) => l.walkMinutes != null && l.walkMinutes >= settings.walkTargetMin).length;
}

function hasAnyData(log: DailyLog): boolean {
  return (
    log.weightKg != null ||
    log.calories != null ||
    log.proteinG != null ||
    log.fiberG != null ||
    log.walkMinutes != null ||
    log.steps != null ||
    log.sleepHours != null ||
    log.energy != null ||
    log.strengthStatus != null ||
    log.mobilityMinutes != null ||
    log.waistCm != null ||
    log.hipsCm != null ||
    log.chestCm != null ||
    log.thighCm != null ||
    log.armCm != null ||
    (log.note != null && log.note.trim() !== "")
  );
}

/** Snitt av min(1, värde/mål) över de dagar som har värdet. null om inga dagar har det. */
function averageProgress(values: (number | null | undefined)[], target: number): number | null {
  const present = values.filter((v): v is number => v != null);
  if (present.length === 0 || target <= 0) return null;
  const sum = present.reduce((acc, v) => acc + Math.min(1, Math.max(0, v) / target), 0);
  return sum / present.length;
}

/**
 * Preliminär veckopoäng 0–100, eller null när underlaget är för litet.
 *
 * - Varje delmått räknas bara över dagar som faktiskt har det värdet.
 * - Delmått utan data utelämnas och vikterna normaliseras om; tom data är aldrig ett misslyckande.
 * - Styrka = genomförda pass / veckomål (antal planerade styrkedagar) och räknas först när minst
 *   ett pass är genomfört. "Inte gjort" och "flyttat" sänker inte poängen.
 */
export function calcPreliminaryWeeklyScore(logs: DailyLog[], settings: ProgramSettings): number | null {
  const loggedDays = logs.filter(hasAnyData).length;
  if (loggedDays < MIN_LOGGED_DAYS_FOR_SCORE) return null;

  const strengthDone = countStrengthCompleted(logs);
  const strengthTarget = settings.strengthDays.length;

  const components: { weight: number; value: number | null }[] = [
    {
      weight: WEEKLY_SCORE_WEIGHTS.strength,
      value: strengthDone > 0 && strengthTarget > 0 ? Math.min(1, strengthDone / strengthTarget) : null,
    },
    {
      weight: WEEKLY_SCORE_WEIGHTS.walk,
      value: averageProgress(logs.map((l) => l.walkMinutes), settings.walkTargetMin),
    },
    {
      weight: WEEKLY_SCORE_WEIGHTS.protein,
      value: averageProgress(logs.map((l) => l.proteinG), settings.proteinTargetG),
    },
    {
      weight: WEEKLY_SCORE_WEIGHTS.fiber,
      value: averageProgress(logs.map((l) => l.fiberG), settings.fiberTargetG),
    },
    {
      weight: WEEKLY_SCORE_WEIGHTS.sleep,
      value: averageProgress(logs.map((l) => l.sleepHours), settings.sleepTargetHours),
    },
  ];

  const used = components.filter((c) => c.value !== null);
  if (used.length === 0) return null;

  const totalWeight = used.reduce((acc, c) => acc + c.weight, 0);
  const score = used.reduce((acc, c) => acc + c.weight * (c.value as number), 0) / totalWeight;
  return Math.round(score * 100);
}
