import { MEASUREMENT_FIELDS, type MeasurementKey } from "../config/measurements";
import type { AppSettings, BodyMeasurements } from "../types/program";
import { isValidDateString } from "../utils/dates";
import { parseNumber } from "./checkInForm";

/** Textvärden för inställningsformuläret. Tomt = inte angivet (bara för startvärden). */
export type SettingsForm = {
  programStartDate: string;
  strengthDays: number[];
  calorieTarget: string;
  proteinTargetG: string;
  carbsTargetG: string;
  fatTargetG: string;
  fiberTargetG: string;
  walkTargetMin: string;
  sleepTargetHours: string;
  stepTarget: string;
  mobilityTargetMin: string;
  startWeightKg: string;
} & Record<MeasurementKey, string>;

function numToText(n: number | null | undefined): string {
  return n == null ? "" : String(n).replace(".", ",");
}

export function settingsToForm(s: AppSettings): SettingsForm {
  const m = s.baseline.startMeasurements;
  return {
    programStartDate: s.program.programStartDate,
    strengthDays: [...s.program.strengthDays],
    calorieTarget: numToText(s.program.calorieTarget),
    proteinTargetG: numToText(s.program.proteinTargetG),
    carbsTargetG: numToText(s.program.carbsTargetG),
    fatTargetG: numToText(s.program.fatTargetG),
    fiberTargetG: numToText(s.program.fiberTargetG),
    walkTargetMin: numToText(s.program.walkTargetMin),
    sleepTargetHours: numToText(s.program.sleepTargetHours),
    stepTarget: numToText(s.program.stepTarget),
    mobilityTargetMin: numToText(s.program.mobilityTargetMin),
    startWeightKg: numToText(s.baseline.startWeightKg),
    waistCm: numToText(m.waistCm),
    hipsCm: numToText(m.hipsCm),
    chestCm: numToText(m.chestCm),
    thighCm: numToText(m.thighCm),
    armCm: numToText(m.armCm),
  };
}

type TargetSpec = {
  key: "calorieTarget" | "proteinTargetG" | "carbsTargetG" | "fatTargetG" | "fiberTargetG" | "walkTargetMin" | "sleepTargetHours" | "stepTarget" | "mobilityTargetMin";
  label: string;
  decimal: boolean;
  min: number;
  max: number;
};

/** Mål måste anges och ligga inom rimliga gränser. */
const TARGETS: TargetSpec[] = [
  { key: "calorieTarget", label: "Kalorier", decimal: false, min: 800, max: 6000 },
  { key: "proteinTargetG", label: "Protein", decimal: false, min: 20, max: 400 },
  { key: "carbsTargetG", label: "Kolhydrater", decimal: false, min: 20, max: 800 },
  { key: "fatTargetG", label: "Fett", decimal: false, min: 10, max: 400 },
  { key: "fiberTargetG", label: "Fiber", decimal: false, min: 5, max: 100 },
  { key: "walkTargetMin", label: "Promenad", decimal: false, min: 5, max: 300 },
  { key: "sleepTargetHours", label: "Sömn", decimal: true, min: 4, max: 12 },
  { key: "stepTarget", label: "Steg", decimal: false, min: 1000, max: 50000 },
  { key: "mobilityTargetMin", label: "Mobility", decimal: false, min: 1, max: 120 },
];

export type SettingsResult = { ok: true; settings: AppSettings } | { ok: false; error: string };

/** `current` behövs för värden som inte kan ändras i formuläret (veckor i programmet). */
export function formToSettings(form: SettingsForm, current: AppSettings): SettingsResult {
  if (!isValidDateString(form.programStartDate)) {
    return { ok: false, error: "Programstart: välj ett giltigt datum." };
  }
  if (form.strengthDays.length === 0) {
    return { ok: false, error: "Välj minst en styrkedag." };
  }

  const targets: Record<string, number> = {};
  for (const t of TARGETS) {
    const parsed = parseNumber(form[t.key], t.decimal);
    if (parsed === "invalid" || parsed === null) {
      return { ok: false, error: `${t.label}: ange ett mål som tal.` };
    }
    if (parsed < t.min || parsed > t.max) {
      return { ok: false, error: `${t.label}: målet ser inte rimligt ut (${t.min}–${t.max}).` };
    }
    targets[t.key] = parsed;
  }

  const startWeight = parseNumber(form.startWeightKg, true);
  if (startWeight === "invalid") return { ok: false, error: "Startvikt: ange ett giltigt tal eller lämna tomt." };
  if (startWeight !== null && (startWeight < 20 || startWeight > 400)) {
    return { ok: false, error: "Startvikt: värdet ser inte rimligt ut." };
  }

  const measurements = {} as BodyMeasurements;
  for (const f of MEASUREMENT_FIELDS) {
    const parsed = parseNumber(form[f.key], true);
    if (parsed === "invalid") return { ok: false, error: `${f.label}: ange ett giltigt tal eller lämna tomt.` };
    if (parsed !== null && (parsed < 10 || parsed > 300)) {
      return { ok: false, error: `${f.label}: värdet ser inte rimligt ut.` };
    }
    measurements[f.key] = parsed;
  }

  return {
    ok: true,
    settings: {
      program: {
        ...current.program,
        programStartDate: form.programStartDate,
        strengthDays: [...form.strengthDays].sort((a, b) => a - b),
        calorieTarget: targets.calorieTarget,
        proteinTargetG: targets.proteinTargetG,
        carbsTargetG: targets.carbsTargetG,
        fatTargetG: targets.fatTargetG,
        fiberTargetG: targets.fiberTargetG,
        walkTargetMin: targets.walkTargetMin,
        sleepTargetHours: targets.sleepTargetHours,
        stepTarget: targets.stepTarget,
        mobilityTargetMin: targets.mobilityTargetMin,
      },
      baseline: { startWeightKg: startWeight, startMeasurements: measurements },
    },
  };
}
