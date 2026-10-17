export type MatView = "day" | "week";

export type ToggleOption = { id: MatView; label: string };

const MEAL_OPTIONS: ToggleOption[] = [
  { id: "day", label: "Dagens meny" },
  { id: "week", label: "Veckoplan" },
];

export function ViewToggle({
  value,
  onChange,
  options = MEAL_OPTIONS,
}: {
  value: MatView;
  onChange: (v: MatView) => void;
  options?: ToggleOption[];
}) {
  return (
    <div className="view-toggle" role="radiogroup" aria-label="Visa">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          className={`view-segment ${value === o.id ? "is-selected" : ""}`}
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
