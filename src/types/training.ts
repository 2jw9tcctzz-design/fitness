export type WorkoutCode = "A" | "B" | "C";

export type ExerciseKind = "main" | "accessory" | "core";

/** Hur många set, vilket rep-intervall och hur nära failure ett block ber om. */
export type SetScheme = {
  sets: number;
  repMin: number;
  repMax: number;
  rirMin: number;
  rirMax: number;
};

/** Ett avsnitt av programmet (t.ex. vecka 5–8). Samma passmallar återanvänds i alla block. */
export type ProgramBlock = {
  id: string;
  weekFrom: number;
  weekTo: number;
  /** "Block 1A" */
  name: string;
  /** Det användaren ser överst: "Block 1", "Block 2", "Block 3" eller "Deload". */
  group: string;
  main: SetScheme;
  other: SetScheme;
  isDeload?: boolean;
  note?: string;
};

export type WorkoutTemplateExercise = {
  id: string;
  /** Standardnamn. Det användaren valt senast för övningen minns appen (se exerciseChoice). */
  name: string;
  kind: ExerciseKind;
  /** Nyckel i SUBSTITUTIONS: vilka alternativ som går att välja. */
  movementPattern: string;
  /** Tidsbaserad övning (planka, farmer carry): mål i sekunder i stället för reps. */
  durationSeconds?: { min: number; max: number } | null;
  perSide?: boolean;
  /** Kort extra instruktion. */
  hint?: string;
  /** Överstyr antal set oavsett block (t.ex. core = 2). */
  fixedSets?: number;
  targetSets?: number;
  substitutions?: string[];
};

export type WorkoutTemplate = {
  id: string;
  name: string;
  code: WorkoutCode;
  exercises: WorkoutTemplateExercise[];
};

/** Vad en övning ber om just den här programveckan. */
export type Prescription = {
  sets: number;
  repMin: number | null;
  repMax: number | null;
  durationSeconds: { min: number; max: number } | null;
  perSide: boolean;
  rirMin: number;
  rirMax: number;
};

export type WorkoutStatus = "planned" | "completed" | "moved" | "skipped";

/** Ett planerat eller genomfört styrkepass. plannedDate ändras aldrig; performedDate sätts när passet görs. */
export type WorkoutSession = {
  /** `ws_<plannedDate>`: ett pass per planerad dag. */
  id: string;
  plannedDate: string;
  performedDate?: string | null;
  templateId?: string | null;
  status: WorkoutStatus;
  /** Måldatum när status är "moved" (kvar även efter att passet genomförts där). */
  movedToDate?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  note?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ExerciseLog = {
  id: string;
  workoutSessionId: string;
  exerciseName: string;
  templateExerciseId?: string | null;
  order: number;
  note?: string | null;
};

/** Samma post skapas av manuell loggning idag och av en framtida foto-/AI-loggning. */
export type ExerciseSet = {
  id: string;
  exerciseLogId: string;
  setNumber: number;
  weightKg?: number | null;
  reps?: number | null;
  durationSeconds?: number | null;
  completed: boolean;
};

export type OtherActivityLog = {
  id: string;
  date: string;
  activityName: string;
  durationMinutes?: number | null;
  note?: string | null;
};
