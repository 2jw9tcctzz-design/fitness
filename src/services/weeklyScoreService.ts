import { getDailyLogsBetween } from "../db/repositories/dailyLogRepository";
import { getProgramSettings } from "../config/programDefaults";
import type { ProgramSettings } from "../types/program";
import { getWeekDateRange } from "../utils/dates";
import { calcPreliminaryWeeklyScore, countStrengthCompleted, countWalkGoalDays } from "./weeklyScoreCalc";

export { getWeekDateRange };

export type WeekSummary = {
  weekStart: string;
  weekEnd: string;
  strengthCount: number;
  strengthTarget: number;
  walkGoalDays: number;
  /** 0–100 eller null när det inte finns tillräckligt med data */
  score: number | null;
};

/** Hämtar veckans loggar en gång och räknar ut allt Idag-skärmen behöver. */
export async function getWeekSummary(
  date: string,
  settings: ProgramSettings = getProgramSettings()
): Promise<WeekSummary> {
  const { start, end } = getWeekDateRange(date);
  const logs = await getDailyLogsBetween(start, end);
  return {
    weekStart: start,
    weekEnd: end,
    strengthCount: countStrengthCompleted(logs),
    strengthTarget: settings.strengthDays.length,
    walkGoalDays: countWalkGoalDays(logs, settings),
    score: calcPreliminaryWeeklyScore(logs, settings),
  };
}

export async function getStrengthCountForWeek(date: string): Promise<number> {
  const { start, end } = getWeekDateRange(date);
  return countStrengthCompleted(await getDailyLogsBetween(start, end));
}

export async function getWalkGoalDaysForWeek(
  date: string,
  settings: ProgramSettings = getProgramSettings()
): Promise<number> {
  const { start, end } = getWeekDateRange(date);
  return countWalkGoalDays(await getDailyLogsBetween(start, end), settings);
}

export async function getPreliminaryWeeklyScore(
  date: string,
  settings: ProgramSettings = getProgramSettings()
): Promise<number | null> {
  const { start, end } = getWeekDateRange(date);
  return calcPreliminaryWeeklyScore(await getDailyLogsBetween(start, end), settings);
}
