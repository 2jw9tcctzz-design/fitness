import type { AppSettings, BodyBaseline, ProgramSettings } from "../types/program";
import { EMPTY_MEASUREMENTS } from "./measurements";

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

/** Standardvärden. De faktiska inställningarna läses från databasen (settingsRepository). */
export function getProgramSettings(): ProgramSettings {
  return DEFAULT_PROGRAM_SETTINGS;
}

export const DEFAULT_BASELINE: BodyBaseline = {
  startWeightKg: null,
  startMeasurements: { ...EMPTY_MEASUREMENTS },
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  program: DEFAULT_PROGRAM_SETTINGS,
  baseline: DEFAULT_BASELINE,
};
