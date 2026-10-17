import { useEffect, useState } from "react";
import { parseNumber } from "../../services/checkInForm";
import type { ExerciseSet } from "../../types/training";

type Props = {
  set: ExerciseSet;
  timed: boolean;
  label: string;
  onChange: (patch: Partial<Pick<ExerciseSet, "weightKg" | "reps" | "durationSeconds" | "completed">>, immediate?: boolean) => void;
  onRemove?: () => void;
};

const text = (n: number | null | undefined) => (n == null ? "" : String(n).replace(".", ","));

/** En rad per set: vikt, reps (eller sekunder) och en stor klar-knapp. Tomt fält = inte registrerat. */
export function SetRow({ set, timed, label, onChange, onRemove }: Props) {
  const [weight, setWeight] = useState(text(set.weightKg));
  const [reps, setReps] = useState(text(timed ? set.durationSeconds : set.reps));

  // Följ ändringar utifrån (t.ex. "Använd förra gången") men rör inte text som motsvarar samma värde.
  useEffect(() => {
    if (parseNumber(weight, true) !== (set.weightKg ?? null)) setWeight(text(set.weightKg));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [set.weightKg]);
  useEffect(() => {
    const current = timed ? set.durationSeconds : set.reps;
    if (parseNumber(reps, false) !== (current ?? null)) setReps(text(current));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [set.reps, set.durationSeconds, timed]);

  return (
    <div className={`set-row ${set.completed ? "is-done" : ""}`}>
      <span className="set-label">{label}</span>
      {timed ? null : (
        <div className="set-field">
          <input
            className="set-input"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            enterKeyHint="next"
            maxLength={6}
            placeholder="–"
            value={weight}
            aria-label={`${label} vikt (kg)`}
            onFocus={(e) => e.currentTarget.select()}
            onChange={(e) => {
              setWeight(e.target.value);
              const n = parseNumber(e.target.value, true);
              if (n !== "invalid") onChange({ weightKg: n });
            }}
          />
          <span className="set-unit">kg</span>
        </div>
      )}
      <div className="set-field">
        <input
          className="set-input"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          enterKeyHint="done"
          maxLength={5}
          placeholder="–"
          value={reps}
          aria-label={`${label} ${timed ? "sekunder" : "reps"}`}
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => {
            setReps(e.target.value);
            const n = parseNumber(e.target.value, false);
            if (n !== "invalid") onChange(timed ? { durationSeconds: n } : { reps: n });
          }}
        />
        <span className="set-unit">{timed ? "sek" : "reps"}</span>
      </div>
      <button
        type="button"
        role="checkbox"
        aria-checked={set.completed}
        aria-label={`${label} klart`}
        className={`set-check ${set.completed ? "is-on" : ""}`}
        onClick={() => onChange({ completed: !set.completed }, true)}
      >
        {set.completed ? (
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        ) : null}
      </button>
      {onRemove ? (
        <button type="button" className="set-remove" onClick={onRemove} aria-label={`Ta bort ${label}`}>
          ✕
        </button>
      ) : null}
    </div>
  );
}
