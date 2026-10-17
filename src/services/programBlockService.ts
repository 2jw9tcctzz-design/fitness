import { PROGRAM_BLOCKS, WORKOUT_CODES, getTemplate } from "../config/trainingProgram";
import type { ProgramSettings } from "../types/program";
import type { Prescription, ProgramBlock, WorkoutCode, WorkoutTemplate, WorkoutTemplateExercise } from "../types/training";
import { isoWeekday } from "../utils/dates";
import { getProgramDay, getProgramStatus } from "./programService";

/** Programvecka som används för träningens upplägg: 1 före start, 12 efter slutet. */
export function getTrainingWeek(date: string, settings: ProgramSettings): number {
  const status = getProgramStatus(date, settings);
  if (status === "upcoming") return 1;
  if (status === "finished") return settings.durationWeeks;
  return Math.ceil(getProgramDay(date, settings) / 7);
}

export function getBlockForWeek(week: number): ProgramBlock {
  const w = Math.min(Math.max(week, 1), PROGRAM_BLOCKS[PROGRAM_BLOCKS.length - 1].weekTo);
  return PROGRAM_BLOCKS.find((b) => w >= b.weekFrom && w <= b.weekTo) ?? PROGRAM_BLOCKS[0];
}

/** Pass A/B/C för en datumets veckodag: styrkedagarna från Settings får A, B, C i ordning. */
export function getWorkoutCodeForDate(date: string, settings: ProgramSettings): WorkoutCode | null {
  const days = [...settings.strengthDays].sort((a, b) => a - b);
  const idx = days.indexOf(isoWeekday(date));
  if (idx < 0) return null;
  return WORKOUT_CODES[idx % WORKOUT_CODES.length];
}

export function getTemplateForDate(date: string, settings: ProgramSettings): WorkoutTemplate | null {
  const code = getWorkoutCodeForDate(date, settings);
  return code ? getTemplate(code) : null;
}

/** Vad en övning ber om i ett visst block. Tidsövningar har sekunder i stället för reps. */
export function getPrescription(exercise: WorkoutTemplateExercise, block: ProgramBlock): Prescription {
  const scheme = exercise.kind === "main" ? block.main : block.other;
  const timed = exercise.durationSeconds ?? null;
  return {
    sets: exercise.fixedSets ?? scheme.sets,
    repMin: timed ? null : scheme.repMin,
    repMax: timed ? null : scheme.repMax,
    durationSeconds: timed,
    perSide: exercise.perSide ?? false,
    rirMin: scheme.rirMin,
    rirMax: scheme.rirMax,
  };
}

/** "3 x 8–12", "2 x 30–60 sek", "2 x 10–12 per sida" */
export function formatPrescription(p: Prescription): string {
  if (p.durationSeconds) {
    const { min, max } = p.durationSeconds;
    return `${p.sets} x ${min}–${max} sek`;
  }
  const range = p.repMin === p.repMax ? `${p.repMin}` : `${p.repMin}–${p.repMax}`;
  return `${p.sets} x ${range}${p.perSide ? " per sida" : ""}`;
}

/** "RIR 2–3 (cirka 2–3 bra reps kvar)" */
export function formatRir(rirMin: number, rirMax: number): string {
  const r = rirMin === rirMax ? `${rirMin}` : `${rirMin}–${rirMax}`;
  return `RIR ${r} (cirka ${r} bra reps kvar)`;
}
