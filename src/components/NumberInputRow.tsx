import { useId } from "react";

type Props = {
  label: string;
  unit?: string;
  value: string;
  onChange: (text: string) => void;
  /** Decimaltangentbord för vikt och sömn; heltalstangentbord för övriga. */
  decimal?: boolean;
  placeholder?: string;
};

export function NumberInputRow({ label, unit, value, onChange, decimal = false, placeholder }: Props) {
  const id = useId();
  return (
    <div className="input-row">
      <label className="input-label" htmlFor={id}>
        {label}
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
