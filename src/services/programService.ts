import { addDays, diffInDays, isoWeekday } from "../utils/dates";
import type { ActivityType, ProgramSettings, ProgramStatus } from "../types/program";

/** Rena funktioner utan sidoeffekter; alla tar settings som argument. */

export function getTotalDays(settings: ProgramSettings): number {
  return settings.durationWeeks * 7;
}

/** Dag 1 = programStartDate. Kan vara <= 0 före start och > totalDays efter slut. */
export function getProgramDay(date: string, settings: ProgramSettings): number {
  return diffInDays(settings.programStartDate, date) + 1;
}

export function getProgramStatus(date: string, settings: ProgramSettings): ProgramStatus {
  const day = getProgramDay(date, settings);
  if (day < 1) return "upcoming";
  if (day > getTotalDays(settings)) return "finished";
  return "active";
}

export function isProgramActive(date: string, settings: ProgramSettings): boolean {
  return getProgramStatus(date, settings) === "active";
}

/** Programvecka 1..durationWeeks, eller null om programmet inte är aktivt. */
export function getProgramWeek(date: string, settings: ProgramSettings): number | null {
  if (!isProgramActive(date, settings)) return null;
  return Math.ceil(getProgramDay(date, settings) / 7);
}

/** Dagar kvar efter detta datum. Före start: hela programmet. Efter slut: 0. */
export function getDaysRemaining(date: string, settings: ProgramSettings): number {
  const status = getProgramStatus(date, settings);
  if (status === "upcoming") return getTotalDays(settings);
  if (status === "finished") return 0;
  return getTotalDays(settings) - getProgramDay(date, settings);
}

export function getProgramLastDate(settings: ProgramSettings): string {
  return addDays(settings.programStartDate, getTotalDays(settings) - 1);
}

/** Planerad styrkedag enligt veckodagen (1 = måndag), oberoende av om programmet är aktivt. */
export function isStrengthDay(date: string, settings: ProgramSettings): boolean {
  return settings.strengthDays.includes(isoWeekday(date));
}

/**
 * Dagens aktivitet. Ett styrkepass som flyttats hit från en annan dag (`hasMovedInStrength`)
 * gör dagen till en styrkedag, även om den normalt är en mobility-dag.
 */
export function getActivityType(
  date: string,
  settings: ProgramSettings,
  hasMovedInStrength = false
): ActivityType {
  return isStrengthDay(date, settings) || hasMovedInStrength ? "strength" : "mobility_walk";
}

/** Samma som getActivityType; namnet från specen. */
export const todaysActivityType = getActivityType;
