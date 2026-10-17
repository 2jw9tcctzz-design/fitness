/** Styrkepassets status en given dag. null = inte registrerat. */
export type StrengthStatus = "done" | "skipped" | "moved";

/**
 * En dags registrering. null = "inte registrerat" (aldrig samma sak som 0).
 *
 * Avvikelse från Sprint 1-specen: `strengthCompleted: boolean` är ersatt av
 * `strengthStatus` (gjort / inte gjort / flyttat) + `strengthMovedTo`.
 */
export type DailyLog = {
  id: string;
  /** YYYY-MM-DD, unik */
  date: string;
  weightKg?: number | null;
  calories?: number | null;
  proteinG?: number | null;
  fiberG?: number | null;
  walkMinutes?: number | null;
  steps?: number | null;
  sleepHours?: number | null;
  /** 1-5 */
  energy?: number | null;
  strengthStatus?: StrengthStatus | null;
  /** Datum (YYYY-MM-DD) passet flyttats till. Satt bara när strengthStatus === "moved". */
  strengthMovedTo?: string | null;
  mobilityMinutes?: number | null;
  /** Valfria kroppsmått i cm. Loggas när man mäter, inte varje dag. */
  waistCm?: number | null;
  hipsCm?: number | null;
  chestCm?: number | null;
  thighCm?: number | null;
  armCm?: number | null;
  note?: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Det UI:t skickar in vid sparande. id och tidsstämplar sätts av repositoryt. */
export type DailyLogInput = Omit<DailyLog, "id" | "createdAt" | "updatedAt">;
