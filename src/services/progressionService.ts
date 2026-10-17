import type { ExerciseSet, Prescription } from "../types/training";
import { formatNumber } from "../utils/format";

/** Regelbaserad progression och "förra gången". Rena funktioner, ingen automatisk viktändring. */

function workingSets(sets: ExerciseSet[]): ExerciseSet[] {
  return sets.filter((s) => s.completed).sort((a, b) => a.setNumber - b.setNumber);
}

/**
 * "10 kg · 12 / 11 / 10". Olika vikter per set visas som "10 kg × 12 / 12 kg × 10".
 * Tidsövningar: "45 / 40 sek".
 */
export function summarizeSets(sets: ExerciseSet[]): string {
  const done = workingSets(sets);
  if (done.length === 0) return "";
  if (done.every((s) => s.durationSeconds != null && s.reps == null)) {
    return `${done.map((s) => s.durationSeconds).join(" / ")} sek`;
  }
  const weights = done.map((s) => s.weightKg ?? null);
  const sameWeight = weights.every((w) => w === weights[0]);
  const reps = (s: ExerciseSet) => (s.reps == null ? "–" : String(s.reps));
  if (sameWeight) {
    const head = weights[0] != null ? `${formatNumber(weights[0])} kg · ` : "";
    return head + done.map(reps).join(" / ");
  }
  return done.map((s) => `${s.weightKg != null ? `${formatNumber(s.weightKg)} kg × ` : ""}${reps(s)}`).join(" / ");
}

export type Advice = { kind: "ready" | "beat" | "deload"; title: string; text: string };

/**
 * Förslag utifrån förra gången:
 * - alla klara set nådde toppen av rep-intervallet => överväg nästa viktsteg
 * - annars => försök slå minst ett set
 * Ingen rådgivning utan föregående resultat, och inget för tidsövningar.
 */
export function progressionAdvice(
  previous: ExerciseSet[] | null,
  prescription: Prescription,
  isDeload = false
): Advice | null {
  if (!previous || prescription.repMax == null) return null;
  const done = workingSets(previous).filter((s) => s.reps != null);
  if (done.length === 0) return null;
  if (isDeload) {
    return { kind: "deload", title: "Lättare vecka", text: "Använd cirka 80–90 % av förra vikten, eller en tydligt lättare ansträngning." };
  }
  const reachedTop = done.length >= 2 && done.every((s) => (s.reps as number) >= (prescription.repMax as number));
  if (reachedTop) {
    return {
      kind: "ready",
      title: "Redo att öka?",
      text: `Du klarade ${prescription.repMax} reps i alla set förra gången. Överväg nästa viktsteg.`,
    };
  }
  return { kind: "beat", title: "Nästa mål", text: "Försök slå minst ett set från förra gången." };
}

export type SetPatch = { setId: string; weightKg: number | null; reps: number | null; durationSeconds: number | null };

/**
 * "Använd förra gången": fyller dagens set med förra gångens vikt och reps (set för set; extra set får
 * sista settets värden). Ingenting markeras som klart.
 */
export function applyPrevious(current: ExerciseSet[], previous: ExerciseSet[]): SetPatch[] {
  const prev = workingSets(previous);
  if (prev.length === 0) return [];
  const ordered = [...current].sort((a, b) => a.setNumber - b.setNumber);
  return ordered.map((s, i) => {
    const p = prev[Math.min(i, prev.length - 1)];
    return { setId: s.id, weightKg: p.weightKg ?? null, reps: p.reps ?? null, durationSeconds: p.durationSeconds ?? null };
  });
}
