import { useId } from "react";

type Props = { label: string; value: string; onChange: (date: string) => void; hint?: string };

export function DateInputRow({ label, value, onChange, hint }: Props) {
  const id = useId();
  return (
    <div className="input-row">
      <label className="input-label" htmlFor={id}>
        <span>{label}</span>
        {hint ? <span className="input-hint">{hint}</span> : null}
      </label>
      <input
        id={id}
        type="date"
        className="input date-field"
        value={value}
        aria-label={label}
        onChange={(e) => e.target.value && onChange(e.target.value)}
      />
    </div>
  );
}
