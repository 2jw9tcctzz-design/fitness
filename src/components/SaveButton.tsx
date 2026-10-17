import type { SaveState } from "../hooks/useDailyCheckIn";

type Props = {
  state: SaveState;
  onPress: () => void;
  /** Visas vid state === "error". */
  errorMessage?: string | null;
};

export function SaveButton({ state, onPress, errorMessage }: Props) {
  const saving = state === "saving";
  return (
    <div className="save-wrap">
      <button
        type="button"
        className="save-button"
        onClick={onPress}
        disabled={saving}
        aria-label="Spara dagen"
        aria-busy={saving}
      >
        {saving ? "Sparar…" : "Spara dagen"}
      </button>
      {/* Diskret feedback direkt under knappen, ingen modal. */}
      <div className="feedback" aria-live="polite">
        {state === "saved" ? <span className="feedback-saved">Sparat</span> : null}
        {state === "error" ? (
          <span className="feedback-error">
            {errorMessage ?? "Det gick inte att spara just nu. Försök igen om en stund."}
          </span>
        ) : null}
      </div>
    </div>
  );
}
