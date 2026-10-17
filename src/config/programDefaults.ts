import type { ProgramSettings } from "../types/program";

/**
 * Enda stället där programmets startdatum och mål definieras.
 * Byt PROGRAM_START_DATE här (YYYY-MM-DD) för att flytta programmet.
 *
 * OBS: startdatumet är en platshållare tills produktägaren bekräftat riktigt datum.
 */
export const PROGRAM_START_DATE = "2026-10-12";

export const DEFAULT_PROGRAM_SETTINGS: ProgramSettings = {
  programStartDate: PROGRAM_START_DATE,
  durationWeeks: 12,
  calorieTarget: 1800,
  proteinTargetG: 135,
  fiberTargetG: 30,
  walkTargetMin: 30,
  sleepTargetHours: 8,
  stepTarget: 10000,
  strengthDays: [1, 3, 6],
  mobilityTargetMin: 10,
};

/**
 * Sprint 1 använder bara defaults. En settings-modell (t.ex. tabell i SQLite)
 * kan senare ersätta denna funktion utan att anropare ändras.
 */
export function getProgramSettings(): ProgramSettings {
  return DEFAULT_PROGRAM_SETTINGS;
}
