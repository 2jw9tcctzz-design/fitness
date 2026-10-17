import type { Nutrition } from "../../types/meal";
import { formatRounded } from "../../utils/format";

/** Fem näringsvärden i en rad: kcal, protein, kolhydrater, fett, fiber. */
export function MacroLine({ n }: { n: Nutrition }) {
  const cells: [string, string][] = [
    [formatRounded(n.calories), "kcal"],
    [`${formatRounded(n.proteinG)} g`, "protein"],
    [`${formatRounded(n.carbsG)} g`, "kolhydrater"],
    [`${formatRounded(n.fatG)} g`, "fett"],
    [`${formatRounded(n.fiberG)} g`, "fiber"],
  ];
  return (
    <dl className="macro-line">
      {cells.map(([value, label]) => (
        <div className="macro-cell" key={label}>
          <dd className="macro-value">{value}</dd>
          <dt className="macro-label">{label}</dt>
        </div>
      ))}
    </dl>
  );
}
