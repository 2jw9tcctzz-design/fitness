import type { CheckInForm } from "./checkInForm";
import { parseNumber } from "./checkInForm";
import { getActivityType } from "./programService";
import type { ProgramSettings } from "../types/program";
import { formatDateShort } from "../utils/dates";

export type FocusEntry = {
  key: string;
  label: string;
  /** Aktuellt värde som text. Saknas när inget är registrerat. */
  detail?: string;
  done: boolean;
};

function valueOrNull(text: string, decimal = false): number | null {
  const parsed = parseNumber(text, decimal);
  return parsed === "invalid" ? null : parsed;
}

function atLeast(value: number | null, target: number): boolean {
  return value !== null && value >= target;
}

function strengthDetail(form: CheckInForm, movedInFrom: string | null): string | undefined {
  if (form.strengthStatus === "moved" && form.strengthMovedTo) {
    return `Flyttat till ${formatDateShort(form.strengthMovedTo)}`;
  }
  if (form.strengthStatus === "skipped") return "Inte gjort";
  if (form.strengthStatus === null && movedInFrom) return `Flyttat hit från ${formatDateShort(movedInFrom)}`;
  return undefined;
}

/**
 * Dagens fokus (max 4 punkter) utifrån veckodag, mål och formulärets aktuella värden.
 * `movedInFrom` = datumet ett styrkepass flyttats hit från (gör dagen till styrkedag).
 * Saknat värde ger done=false utan detail, vilket visas neutralt i UI.
 */
export function buildFocusItems(
  date: string,
  form: CheckInForm,
  settings: ProgramSettings,
  movedInFrom: string | null = null,
  nutrition: { proteinG: number | null; fiberG: number | null } | null = null
): FocusEntry[] {
  // Har dagen en måltidsplan kommer protein och fiber från ätna måltider, annars från formuläret.
  const protein = nutrition ? nutrition.proteinG : valueOrNull(form.proteinG);
  const fiber = nutrition ? nutrition.fiberG : valueOrNull(form.fiberG);
  const walk = valueOrNull(form.walkMinutes);

  const items: FocusEntry[] = [
    {
      key: "protein",
      label: `Protein ${settings.proteinTargetG} g`,
      detail: protein !== null ? `${Math.round(protein)} g` : undefined,
      done: atLeast(protein, settings.proteinTargetG),
    },
    {
      key: "fiber",
      label: `Fiber ${settings.fiberTargetG}+ g`,
      detail: fiber !== null ? `${Math.round(fiber)} g` : undefined,
      done: atLeast(fiber, settings.fiberTargetG),
    },
    {
      key: "walk",
      label: `${settings.walkTargetMin} min promenad`,
      detail: walk !== null ? `${walk} min` : undefined,
      done: atLeast(walk, settings.walkTargetMin),
    },
  ];

  if (getActivityType(date, settings, movedInFrom !== null) === "strength") {
    items.push({
      key: "strength",
      label: "Styrkepass",
      detail: strengthDetail(form, movedInFrom),
      done: form.strengthStatus === "done",
    });
  } else {
    const mobility = valueOrNull(form.mobilityMinutes);
    items.push({
      key: "mobility",
      label: `${settings.mobilityTargetMin}–${settings.mobilityTargetMin + 5} min mobility`,
      detail: mobility !== null ? `${mobility} min` : undefined,
      done: atLeast(mobility, settings.mobilityTargetMin),
    });
  }

  return items;
}
