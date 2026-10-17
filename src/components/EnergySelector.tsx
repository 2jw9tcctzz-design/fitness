type Props = {
  value: number | null;
  onChange: (value: number | null) => void;
};

const OPTIONS = [1, 2, 3, 4, 5];

/** Segmenterad kontroll 1–5. Ingen förvald; tryck på valt värde igen för att rensa. */
export function EnergySelector({ value, onChange }: Props) {
  return (
    <div className="segment-block">
      <div className="input-label" id="energy-label">
        Energi
      </div>
      <div className="segments" role="radiogroup" aria-labelledby="energy-label">
        {OPTIONS.map((n) => {
          const selected = value === n;
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`Energi ${n}`}
              className={`segment ${selected ? "is-selected" : ""}`}
              onClick={() => onChange(selected ? null : n)}
            >
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}
