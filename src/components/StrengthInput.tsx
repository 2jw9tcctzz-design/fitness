import type { StrengthStatus } from "../types/dailyLog";
import { formatDateShort } from "../utils/dates";

type Props = {
  status: StrengthStatus | null;
  movedTo: string | null;
  /** Dagar passet kan flyttas till. */
  candidates: string[];
  /** Datum ett pass flyttats hit från (visas som information). */
  movedInFrom: string | null;
  onStatusChange: (status: StrengthStatus | null) => void;
  onMovedToChange: (date: string) => void;
};

const OPTIONS: { status: StrengthStatus; label: string }[] = [
  { status: "done", label: "Gjort" },
  { status: "skipped", label: "Inte gjort" },
  { status: "moved", label: "Flytta" },
];

/**
 * Styrkepass: gjort / inte gjort / flytta till annan dag.
 * Tryck på valt alternativ igen för att rensa (inte registrerat).
 */
export function StrengthInput({ status, movedTo, candidates, movedInFrom, onStatusChange, onMovedToChange }: Props) {
  return (
    <div className="segment-block">
      <div className="input-label" id="strength-label">
        Styrkepass
      </div>
      {movedInFrom ? (
        <p className="hint">Flyttat hit från {formatDateShort(movedInFrom)}</p>
      ) : null}

      <div className="segments three" role="radiogroup" aria-labelledby="strength-label">
        {OPTIONS.map((o) => {
          const selected = status === o.status;
          const cls = `segment ${selected ? (o.status === "done" ? "is-done" : "is-selected") : ""}`;
          return (
            <button
              key={o.status}
              type="button"
              role="radio"
              aria-checked={selected}
              className={cls}
              onClick={() => onStatusChange(selected ? null : o.status)}
            >
              {o.label}
            </button>
          );
        })}
      </div>

      {status === "moved" ? (
        <div className="move-picker">
          <p className="hint" id="move-hint">
            {movedTo ? `Flyttas till ${formatDateShort(movedTo)}` : "Välj vilken dag passet ska flyttas till"}
          </p>
          <div className="chips" role="radiogroup" aria-labelledby="move-hint">
            {candidates.map((d) => {
              const selected = movedTo === d;
              return (
                <button
                  key={d}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className={`chip ${selected ? "is-selected" : ""}`}
                  onClick={() => onMovedToChange(d)}
                >
                  {formatDateShort(d)}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
