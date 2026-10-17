export type ProgramSettings = {
  /** YYYY-MM-DD. Dag 1 i programmet. */
  programStartDate: string;
  durationWeeks: number;
  calorieTarget: number;
  proteinTargetG: number;
  carbsTargetG: number;
  fatTargetG: number;
  fiberTargetG: number;
  walkTargetMin: number;
  sleepTargetHours: number;
  stepTarget: number;
  /** ISO-veckodagar: 1 = måndag ... 7 = söndag */
  strengthDays: number[];
  mobilityTargetMin: number;
};

export type ActivityType = "strength" | "mobility_walk";

export type ProgramStatus = "upcoming" | "active" | "finished";

export type BodyMeasurements = {
  waistCm: number | null;
  hipsCm: number | null;
  chestCm: number | null;
  thighCm: number | null;
  armCm: number | null;
};

/** Startvärden som dagens värden jämförs mot. null = inte angivet. */
export type BodyBaseline = {
  startWeightKg: number | null;
  startMeasurements: BodyMeasurements;
};

/** Allt som kan ändras i Inställningar. */
export type AppSettings = {
  program: ProgramSettings;
  baseline: BodyBaseline;
};
