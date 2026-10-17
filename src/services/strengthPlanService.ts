import type { ProgramSettings } from "../types/program";
import { addDays } from "../utils/dates";
import { isStrengthDay } from "./programService";

/**
 * Dagar ett styrkepass kan flyttas till: de kommande `windowDays` dagarna efter `fromDate`
 * som inte redan är planerade styrkedagar och inte redan tagits emot av ett annat flyttat pass.
 */
export function getMoveTargetCandidates(
  fromDate: string,
  settings: ProgramSettings,
  takenTargets: ReadonlySet<string> = new Set(),
  windowDays = 7
): string[] {
  const result: string[] = [];
  for (let i = 1; i <= windowDays; i++) {
    const d = addDays(fromDate, i);
    if (isStrengthDay(d, settings)) continue;
    if (takenTargets.has(d)) continue;
    result.push(d);
  }
  return result;
}
