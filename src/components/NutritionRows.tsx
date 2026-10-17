import { SectionCard } from "./SectionCard";
import type { DayNutrition } from "../services/nutritionService";
import type { ProgramSettings } from "../types/program";
import { formatRounded } from "../utils/format";

type Props = { nutrition: DayNutrition; targets: ProgramSettings; onOpenFood: () => void };

/** "Under dagen" på Idag: skrivskyddad, läser summan av ätna måltider från Mat. */
export function NutritionRows({ nutrition, targets, onOpenFood }: Props) {
  const v = nutrition.values;
  const rows: { label: string; value: number | null; target: number; unit: string; suffix?: string }[] = [
    { label: "Kalorier", value: v.calories, target: targets.calorieTarget, unit: "kcal" },
    { label: "Protein", value: v.proteinG, target: targets.proteinTargetG, unit: "g" },
    { label: "Kolhydrater", value: v.carbsG, target: targets.carbsTargetG, unit: "g" },
    { label: "Fett", value: v.fatG, target: targets.fatTargetG, unit: "g" },
    { label: "Fiber", value: v.fiberG, target: targets.fiberTargetG, unit: "g", suffix: "+" },
  ];

  let subtitle: string;
  if (nutrition.source === "meals") {
    subtitle = `Från Mat · ${nutrition.eatenCount} av ${nutrition.plannedCount} måltider ätna`;
  } else if (nutrition.source === "manual") {
    subtitle = "Inmatat för hand innan Mat fanns. Planera dagen i Mat för att räkna automatiskt.";
  } else {
    subtitle = "Ingen måltid planerad den här dagen.";
  }

  return (
    <SectionCard title="Under dagen" subtitle={subtitle}>
      <ul className="nutrition-rows">
        {rows.map((r) => (
          <li className="nutrition-row" key={r.label}>
            <span className="nutrition-label">{r.label}</span>
            <span className="nutrition-value" aria-label={`${r.label} ${r.value ?? "inte registrerat"} av ${r.target}`}>
              <strong>{r.value == null ? "–" : formatRounded(r.value)}</strong>
              <span className="nutrition-target">
                {" "}
                / {formatRounded(r.target)}
                {r.suffix ?? ""} {r.unit}
              </span>
            </span>
          </li>
        ))}
      </ul>
      <button type="button" className="secondary-button wide" onClick={onOpenFood}>
        {nutrition.source === "meals" ? "Öppna Mat" : "Planera i Mat"}
      </button>
    </SectionCard>
  );
}
