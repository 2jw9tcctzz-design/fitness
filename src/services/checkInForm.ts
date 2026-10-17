import type { DailyLog, DailyLogInput, StrengthStatus } from "../types/dailyLog";
import { isValidDateString } from "../utils/dates";

/**
 * Översättning mellan DailyLog och formulärets textvärden.
 * Tomt fält => null (inte registrerat), aldrig 0.
 */

export type CheckInForm = {
  weightKg: string;
  calories: string;
  proteinG: string;
  fiberG: string;
  walkMinutes: string;
  steps: string;
  sleepHours: string;
  energy: number | null;
  strengthStatus: StrengthStatus | null;
  /** Datum passet flyttats till; bara satt när strengthStatus === "moved". */
  strengthMovedTo: string | null;
  mobilityMinutes: string;
  waistCm: string;
  hipsCm: string;
  chestCm: string;
  thighCm: string;
  armCm: string;
  note: string;
};

export const EMPTY_FORM: CheckInForm = {
  weightKg: "",
  calories: "",
  proteinG: "",
  fiberG: "",
  walkMinutes: "",
  steps: "",
  sleepHours: "",
  energy: null,
  strengthStatus: null,
  strengthMovedTo: null,
  mobilityMinutes: "",
  waistCm: "",
  hipsCm: "",
  chestCm: "",
  thighCm: "",
  armCm: "",
  note: "",
};

function numToText(n: number | null | undefined): string {
  return n == null ? "" : String(n).replace(".", ",");
}

export function logToForm(log: DailyLog | null): CheckInForm {
  if (!log) return EMPTY_FORM;
  return {
    weightKg: numToText(log.weightKg),
    calories: numToText(log.calories),
    proteinG: numToText(log.proteinG),
    fiberG: numToText(log.fiberG),
    walkMinutes: numToText(log.walkMinutes),
    steps: numToText(log.steps),
    sleepHours: numToText(log.sleepHours),
    energy: log.energy ?? null,
    strengthStatus: log.strengthStatus ?? null,
    strengthMovedTo: log.strengthMovedTo ?? null,
    mobilityMinutes: numToText(log.mobilityMinutes),
    waistCm: numToText(log.waistCm),
    hipsCm: numToText(log.hipsCm),
    chestCm: numToText(log.chestCm),
    thighCm: numToText(log.thighCm),
    armCm: numToText(log.armCm),
    note: log.note ?? "",
  };
}

/** Tolkar text som tal. Accepterar både komma och punkt som decimaltecken. */
export function parseNumber(text: string, decimal: boolean): number | null | "invalid" {
  const trimmed = text.trim();
  if (trimmed === "") return null;
  const normalized = trimmed.replace(",", ".");
  const pattern = decimal ? /^\d+(\.\d+)?$/ : /^\d+$/;
  if (!pattern.test(normalized)) return "invalid";
  const n = Number(normalized);
  return Number.isFinite(n) ? n : "invalid";
}

type FieldSpec = {
  key:
    | "weightKg"
    | "calories"
    | "proteinG"
    | "fiberG"
    | "walkMinutes"
    | "steps"
    | "sleepHours"
    | "mobilityMinutes"
    | "waistCm"
    | "hipsCm"
    | "chestCm"
    | "thighCm"
    | "armCm";
  label: string;
  decimal: boolean;
  min: number;
  max: number;
};

const FIELDS: FieldSpec[] = [
  { key: "weightKg", label: "Vikt", decimal: true, min: 20, max: 400 },
  { key: "calories", label: "Kalorier", decimal: false, min: 0, max: 20000 },
  { key: "proteinG", label: "Protein", decimal: false, min: 0, max: 1000 },
  { key: "fiberG", label: "Fiber", decimal: false, min: 0, max: 500 },
  { key: "walkMinutes", label: "Powerwalk", decimal: false, min: 0, max: 1440 },
  { key: "steps", label: "Steg", decimal: false, min: 0, max: 200000 },
  { key: "sleepHours", label: "Sömn", decimal: true, min: 0, max: 24 },
  { key: "mobilityMinutes", label: "Mobility", decimal: false, min: 0, max: 1440 },
  { key: "waistCm", label: "Midja", decimal: true, min: 10, max: 300 },
  { key: "hipsCm", label: "Höft", decimal: true, min: 10, max: 300 },
  { key: "chestCm", label: "Bröst", decimal: true, min: 10, max: 300 },
  { key: "thighCm", label: "Lår", decimal: true, min: 10, max: 300 },
  { key: "armCm", label: "Överarm", decimal: true, min: 10, max: 300 },
];

export type FormResult = { ok: true; input: DailyLogInput } | { ok: false; error: string };

export function formToInput(date: string, form: CheckInForm): FormResult {
  const values: Record<string, number | null> = {};

  for (const field of FIELDS) {
    const parsed = parseNumber(form[field.key], field.decimal);
    if (parsed === "invalid") {
      return { ok: false, error: `${field.label}: ange ett giltigt tal eller lämna fältet tomt.` };
    }
    if (parsed !== null && (parsed < field.min || parsed > field.max)) {
      return { ok: false, error: `${field.label}: värdet ser inte rimligt ut.` };
    }
    values[field.key] = parsed;
  }

  if (form.energy !== null && (form.energy < 1 || form.energy > 5)) {
    return { ok: false, error: "Energi ska vara mellan 1 och 5." };
  }

  // Flyttat pass kräver en giltig annan dag. Övriga statusar har aldrig ett måldatum.
  let movedTo: string | null = null;
  if (form.strengthStatus === "moved") {
    if (!form.strengthMovedTo) {
      return { ok: false, error: "Välj vilken dag styrkepasset ska flyttas till." };
    }
    if (!isValidDateString(form.strengthMovedTo) || form.strengthMovedTo === date) {
      return { ok: false, error: "Välj en annan dag för styrkepasset." };
    }
    movedTo = form.strengthMovedTo;
  }

  const note = form.note.trim();

  return {
    ok: true,
    input: {
      date,
      weightKg: values.weightKg,
      calories: values.calories,
      proteinG: values.proteinG,
      fiberG: values.fiberG,
      walkMinutes: values.walkMinutes,
      steps: values.steps,
      sleepHours: values.sleepHours,
      energy: form.energy,
      strengthStatus: form.strengthStatus,
      strengthMovedTo: movedTo,
      mobilityMinutes: values.mobilityMinutes,
      waistCm: values.waistCm,
      hipsCm: values.hipsCm,
      chestCm: values.chestCm,
      thighCm: values.thighCm,
      armCm: values.armCm,
      note: note === "" ? null : note,
    },
  };
}
