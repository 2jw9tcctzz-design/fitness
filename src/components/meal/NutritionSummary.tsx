import type { Nutrition } from "../../types/meal";
import type { ProgramSettings } from "../../types/program";
import { formatRounded } from "../../utils/format";

type Props = { planned: Nutrition; eaten: Nutrition; targets: ProgramSettings; eatenCount: number; plannedCount: number };

/** Överst i Mat: Planerat (dagens plan) vid sidan av Ätit (det som räknas som konsumerat hittills). */
export function NutritionSummary({ planned, eaten, targets, eatenCount, plannedCount }: Props) {
  const rows: { label: string; unit: string; planned: number; eaten: number; target: number }[] = [
    { label: "kcal", unit: "", planned: planned.calories, eaten: eaten.calories, target: targets.calorieTarget },
    { label: "protein", unit: "g", planned: planned.proteinG, eaten: eaten.proteinG, target: targets.proteinTargetG },
    { label: "kolhydrater", unit: "g", planned: planned.carbsG, eaten: eaten.carbsG, target: targets.carbsTargetG },
    { label: "fett", unit: "g", planned: planned.fatG, eaten: eaten.fatG, target: targets.fatTargetG },
    { label: "fiber", unit: "g", planned: planned.fiberG, eaten: eaten.fiberG, target: targets.fiberTargetG },
  ];
  return (
    <div className="nutrition-summary">
      <section className="sum-card is-planned" aria-label="Planerat idag">
        <h2 className="sum-title">Planerat</h2>
        <p className="sum-sub">Dagens plan, {plannedCount} av 4 måltider</p>
        <ul className="sum-list">
          {rows.map((r) => (
            <li key={r.label}>
              <span className="sum-num">{formatRounded(r.planned)}</span>
              <span className="sum-unit">{r.unit ? `${r.unit} ${r.label}` : r.label}</span>
            </li>
          ))}
        </ul>
      </section>
      <section className="sum-card is-eaten" aria-label="Ätit idag">
        <h2 className="sum-title">Ätit</h2>
        <p className="sum-sub">Räknas hittills, {eatenCount} måltider</p>
        <ul className="sum-list">
          {rows.map((r) => (
            <li key={r.label}>
              <span className="sum-num">
                {formatRounded(r.eaten)}
                <span className="sum-of"> / {formatRounded(r.target)}</span>
              </span>
              <span className="sum-unit">{r.unit ? `${r.unit} ${r.label}` : r.label}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
