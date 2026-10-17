import type { DayTrainingDetail } from "../services/trainingStatusService";
import type { ProgramSettings } from "../types/program";
import { formatDateShort } from "../utils/dates";
import { SectionCard } from "./SectionCard";

type Props = {
  training: DayTrainingDetail | null;
  settings: ProgramSettings;
  onOpenTraining: () => void;
  children?: React.ReactNode;
};

/** "Genomförd träning" på Idag: skrivskyddad status från Träning. Ingen dubbel incheckning. */
export function TrainingStatusCard({ training, settings, onOpenTraining, children }: Props) {
  let heading = "Träning";
  let line = "";
  let done = false;
  let showGo = false;

  if (training) {
    if (training.kind === "strength") {
      heading = training.templateCode ? `Styrkepass ${training.templateCode}` : "Styrkepass";
      const n = training.exerciseCount;
      const exercises = n > 0 ? `${n} övningar` : "";
      switch (training.status) {
        case "completed":
          line = ["Genomfört", exercises].filter(Boolean).join(" · ");
          done = true;
          break;
        case "started":
          line = ["Pågår", exercises].filter(Boolean).join(" · ");
          showGo = true;
          break;
        case "skipped":
          line = "Inte gjort";
          break;
        case "moved":
          line = training.movedTo ? `Flyttat till ${formatDateShort(training.movedTo)}` : "Flyttat";
          break;
        default:
          line = training.receivedFrom
            ? `Flyttat hit från ${formatDateShort(training.receivedFrom)}. Inte genomfört ännu`
            : "Inte genomfört ännu";
          showGo = true;
      }
    } else {
      heading = "Mobility";
      const minutes = training.mobilityMinutes;
      const target = settings.mobilityTargetMin;
      done = minutes != null && minutes >= target;
      line = minutes != null ? `${minutes} / ${target} min` : `Mål ${target}–${target + 5} min`;
      showGo = !done;
    }
  }

  return (
    <SectionCard title="Genomförd träning" subtitle="Styrka och mobility loggas i Träning.">
      <div className="training-status" aria-label={`${heading}: ${line}`}>
        <div className="training-status-heading">{heading}</div>
        <div className={`training-status-line ${done ? "is-done" : ""}`}>
          {done ? <span className="check-mark" aria-hidden="true">✓ </span> : null}
          {line || "…"}
          {done && training?.kind === "mobility" ? " · Klart" : ""}
        </div>
        {showGo ? (
          <button type="button" className="secondary-button wide" onClick={onOpenTraining}>
            Gå till Träning
          </button>
        ) : null}
      </div>
      {children}
    </SectionCard>
  );
}
