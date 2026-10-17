export type ProgramSettings = {
  /** YYYY-MM-DD. Dag 1 i programmet. */
  programStartDate: string;
  durationWeeks: number;
  calorieTarget: number;
  proteinTargetG: number;
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
