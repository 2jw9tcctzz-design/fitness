import { useState } from "react";
import type { ExerciseView } from "../../hooks/useTrainingDay";
import { formatPrescription } from "../../services/programBlockService";
import { progressionAdvice, summarizeSets } from "../../services/progressionService";
import { formatDateShort } from "../../utils/dates";
import { SetRow } from "./SetRow";
import type { ExerciseSet } from "../../types/training";

type Props = {
  view: ExerciseView;
  isDeload: boolean;
  onUpdateSet: (setId: string, patch: Partial<Pick<ExerciseSet, "weightKg" | "reps" | "durationSeconds" | "completed">>, immediate?: boolean) => void;
  onAddSet: () => void;
  onRemoveSet: (setId: string) => void;
  onApplyPrevious: () => void;
  onChangeExercise: () => void;
  onNote: (note: string) => void;
  onRemoveExercise: () => void;
};

export function ExerciseCard({ view, isDeload, onUpdateSet, onAddSet, onRemoveSet, onApplyPrevious, onChangeExercise, onNote, onRemoveExercise }: Props) {
  const { log, sets, template, prescription, previous } = view;
  const timed = !!template?.durationSeconds;
  const [noteOpen, setNoteOpen] = useState(!!log.note);
  const advice = prescription ? progressionAdvice(previous?.sets ?? null, prescription, isDeload) : null;
  const canSwap = !!template && (template.substitutions?.length ?? 0) > 1;
  const manual = !template;

  return (
    <section className="card exercise-card" aria-label={log.exerciseName}>
      <div className="exercise-head">
        <h3 className="exercise-name">{log.exerciseName}</h3>
        {canSwap ? (
          <button type="button" className="link-button" onClick={onChangeExercise} aria-label={`Byt övning ${log.exerciseName}`}>
            Byt
          </button>
        ) : null}
        {manual ? (
          <button type="button" className="link-button" onClick={onRemoveExercise} aria-label={`Ta bort övning ${log.exerciseName}`}>
            Ta bort
          </button>
        ) : null}
      </div>

      {prescription ? (
        <p className="exercise-target">
          Mål: {formatPrescription(prescription)} · RIR {prescription.rirMin === prescription.rirMax ? prescription.rirMin : `${prescription.rirMin}–${prescription.rirMax}`}
          {template?.hint ? <span className="exercise-hint"> {template.hint}</span> : null}
        </p>
      ) : (
        <p className="exercise-target">Egen övning</p>
      )}

      {previous ? (
        <div className="previous-box">
          <div className="previous-label">Förra gången · {formatDateShort(previous.date)}</div>
          <div className="previous-value">{summarizeSets(previous.sets)}</div>
          <button type="button" className="secondary-button small" onClick={onApplyPrevious} aria-label={`Använd förra gången för ${log.exerciseName}`}>
            Använd förra gången
          </button>
        </div>
      ) : null}

      {advice ? (
        <p className={`advice advice-${advice.kind}`}>
          <strong>{advice.title}</strong> {advice.text}
        </p>
      ) : null}

      <div className="set-list">
        {sets.map((s) => (
          <SetRow
            key={s.id}
            set={s}
            timed={timed}
            label={`Set ${s.setNumber}`}
            onChange={(patch, immediate) => onUpdateSet(s.id, patch, immediate)}
            onRemove={sets.length > 1 && s.setNumber === sets[sets.length - 1].setNumber ? () => onRemoveSet(s.id) : undefined}
          />
        ))}
      </div>

      <div className="exercise-footer">
        <button type="button" className="link-button" onClick={onAddSet} aria-label={`Lägg till set på ${log.exerciseName}`}>
          + Set
        </button>
        <button type="button" className="link-button" onClick={() => setNoteOpen((o) => !o)}>
          {noteOpen ? "Dölj anteckning" : "Anteckning"}
        </button>
      </div>
      {noteOpen ? (
        <input
          className="note-input"
          type="text"
          defaultValue={log.note ?? ""}
          placeholder="t.ex. Kändes lätt, Maskin nr 8"
          aria-label={`Anteckning ${log.exerciseName}`}
          onBlur={(e) => onNote(e.target.value)}
        />
      ) : null}
    </section>
  );
}

