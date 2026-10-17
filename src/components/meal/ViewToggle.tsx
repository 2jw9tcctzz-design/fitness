export type MatView = "day" | "week";

export function ViewToggle({ value, onChange }: { value: MatView; onChange: (v: MatView) => void }) {
  const options: { id: MatView; label: string }[] = [
    { id: "day", label: "Dagens meny" },
    { id: "week", label: "Veckoplan" },
  ];
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
