import { useState } from "react";
import { formatDateShort } from "../../utils/dates";
import { Sheet } from "../Sheet";

export function SubstitutionSheet({ current, options, onPick, onClose }: { current: string; options: string[]; onPick: (name: string) => void; onClose: () => void }) {
  return (
    <Sheet title="Byt övning" onClose={onClose}>
      <p className="sheet-sub">Samma rörelse, annan maskin eller variant. Valet minns appen till nästa pass.</p>
      <ul className="picker-list">
        {options.map((name) => (
          <li key={name}>
            <button type="button" className={`picker-item ${name === current ? "is-current" : ""}`} onClick={() => onPick(name)} aria-label={`Välj ${name}`}>
              <span className="picker-name">
                {name}
                {name === current ? <span className="picker-badge">Vald</span> : null}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}

export function MoveSheet({ candidates, onPick, onClose }: { candidates: string[]; onPick: (date: string) => void; onClose: () => void }) {
  return (
    <Sheet title="Flytta passet" onClose={onClose}>
      <p className="sheet-sub">Välj en dag framåt. Samma pass följer med, och dagen det var planerat för ligger kvar.</p>
      {candidates.length === 0 ? <p className="meal-empty">Inga lediga dagar de närmaste sju dagarna.</p> : null}
      <ul className="picker-list">
        {candidates.map((d) => (
          <li key={d}>
            <button type="button" className="picker-item" onClick={() => onPick(d)} aria-label={`Flytta till ${formatDateShort(d)}`}>
              <span className="picker-name">{formatDateShort(d)}</span>
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}

export function AddExerciseSheet({ suggestions, onAdd, onClose }: { suggestions: string[]; onAdd: (name: string, sets: number) => void; onClose: () => void }) {
  const [name, setName] = useState("");
  const [sets, setSets] = useState(3);
  const trimmed = name.trim();
  return (
    <Sheet title="Lägg till övning" onClose={onClose}>
      <label className="field-label" htmlFor="new-exercise-name">
        Övning
      </label>
      <input
        id="new-exercise-name"
        className="text-input"
        type="text"
        list="exercise-suggestions"
        autoComplete="off"
        placeholder="t.ex. Bicepscurl"
        value={name}
        onChange={(e) => setName(e.target.value)}
        aria-label="Övningens namn"
      />
      <datalist id="exercise-suggestions">
        {suggestions.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>
      <div className="field-label" id="sets-label">
        Antal set
      </div>
      <div className="chips" role="radiogroup" aria-labelledby="sets-label">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={sets === n} className={`chip ${sets === n ? "is-selected" : ""}`} onClick={() => setSets(n)} aria-label={`${n} set`}>
            {n}
          </button>
        ))}
      </div>
      <button type="button" className="save-button" disabled={trimmed === ""} onClick={() => onAdd(trimmed, sets)}>
        Lägg till
      </button>
    </Sheet>
  );
}

const ACTIVITY_SUGGESTIONS = ["Cykling", "Skidåkning", "MTB", "Långpromenad", "Annat gympass"];

export function OtherActivitySheet({ onSave, onClose }: { onSave: (input: { activityName: string; durationMinutes: number | null; note: string | null }) => void; onClose: () => void }) {
  const [name, setName] = useState("");
  const [minutes, setMinutes] = useState("");
  const [note, setNote] = useState("");
  const trimmed = name.trim();
  const dur = minutes.trim() === "" ? null : Number(minutes.replace(",", "."));
  const invalid = dur !== null && (!Number.isFinite(dur) || dur < 0 || dur > 1440);
  return (
    <Sheet title="Logga annan träning" onClose={onClose}>
      <p className="sheet-sub">Räknas inte som styrkepass och påverkar inte styrkemålet.</p>
      <div className="chips">
        {ACTIVITY_SUGGESTIONS.map((a) => (
          <button key={a} type="button" className={`chip ${name === a ? "is-selected" : ""}`} onClick={() => setName(a)}>
            {a}
          </button>
        ))}
      </div>
      <label className="field-label" htmlFor="activity-name">
        Aktivitet
      </label>
      <input id="activity-name" className="text-input" type="text" autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} aria-label="Aktivitet" placeholder="t.ex. Cykling" />
      <label className="field-label" htmlFor="activity-minutes">
        Minuter (valfritt)
      </label>
      <input id="activity-minutes" className="text-input" type="text" inputMode="numeric" autoComplete="off" value={minutes} onChange={(e) => setMinutes(e.target.value)} aria-label="Minuter" placeholder="–" />
      <label className="field-label" htmlFor="activity-note">
        Anteckning (valfritt)
      </label>
      <input id="activity-note" className="text-input" type="text" autoComplete="off" value={note} onChange={(e) => setNote(e.target.value)} aria-label="Anteckning" />
      {invalid ? <p className="notice">Minuter: ange ett giltigt tal eller lämna tomt.</p> : null}
      <button
        type="button"
        className="save-button"
        disabled={trimmed === "" || invalid}
        onClick={() => onSave({ activityName: trimmed, durationMinutes: dur === null ? null : Math.round(dur), note: note.trim() === "" ? null : note.trim() })}
      >
        Spara
      </button>
    </Sheet>
  );
}
