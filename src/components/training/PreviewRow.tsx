import type { PreviewExercise } from "../../hooks/useTrainingDay";
import { formatPrescription } from "../../services/programBlockService";
import { summarizeSets } from "../../services/progressionService";

/** Övning i förhandsvisningen innan passet startats: vad ska jag göra, och vad gjorde jag sist. */
export function PreviewRow({ item }: { item: PreviewExercise }) {
  return (
    <li className="preview-row">
      <div className="preview-name">{item.name}</div>
      <div className="preview-target">Mål: {formatPrescription(item.prescription)}</div>
      {item.previous ? <div className="preview-previous">Förra gången: {summarizeSets(item.previous.sets)}</div> : null}
    </li>
  );
}
