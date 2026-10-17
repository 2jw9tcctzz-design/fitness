import { useId } from "react";

type Props = {
  label: string;
  unit?: string;
  value: string;
  onChange: (text: string) => void;
  /** Decimaltangentbord för vikt och sömn; heltalstangentbord för övriga. */
  decimal?: boolean;
  placeholder?: string;
  /** Liten hjälptext under etiketten, t.ex. "Mål 135 g". */
  hint?: string;
};

export function NumberInputRow({ label, unit, value, onChange, decimal = false, placeholder, hint }: Props) {
  const id = useId();
  return (
    <div className="input-row">
      <label className="input-label" htmlFor={id}>
        <span>{label}</span>
        {hint ? <span className="input-hint">{hint}</span> : null}
      </label>
      <div className="input-wrap">
        <input
          id={id}
          className="input"
          type="text"
          inputMode={decimal ? "decimal" : "numeric"}
          autoComplete="off"
          enterKeyHint="done"
          maxLength={8}
          value={value}
          placeholder={placeholder ?? "–"}
          aria-label={unit ? `${label} (${unit})` : label}
          onChange={(e) => onChange(e.target.value)}
          onFocus={(e) => e.currentTarget.select()}
        />
        <span className="input-unit" aria-hidden="true">
          {unit ?? ""}
        </span>
      </div>
    </div>
  );
}
