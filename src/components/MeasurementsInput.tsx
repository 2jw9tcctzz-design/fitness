import { useState } from "react";
import { MEASUREMENT_FIELDS, type MeasurementKey } from "../config/measurements";
import type { BodyMeasurements } from "../types/program";
import { formatNumber } from "../utils/format";
import { NumberInputRow } from "./NumberInputRow";

type Props = {
  values: Record<MeasurementKey, string>;
  baseline: BodyMeasurements;
  onChange: (key: MeasurementKey, text: string) => void;
};

/** Nya kroppsmått. Dolda tills man vill mäta; öppnas automatiskt om dagen redan har mått. */
export function MeasurementsInput({ values, baseline, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const hasValues = MEASUREMENT_FIELDS.some((f) => values[f.key].trim() !== "");
  const expanded = open || hasValues;

  return (
    <div className="measurements">
      <button
        type="button"
        className="disclosure"
        aria-expanded={expanded}
        onClick={() => setOpen(!expanded)}
      >
        <span>Nya mått</span>
        <span className="disclosure-hint">{expanded ? "Dölj" : "Lägg till"}</span>
      </button>
      {expanded
        ? MEASUREMENT_FIELDS.map((f) => {
            const start = baseline[f.key];
            return (
              <NumberInputRow
                key={f.key}
                label={f.label}
                unit="cm"
                decimal
                hint={start != null ? `Start ${formatNumber(start)} cm` : undefined}
                value={values[f.key]}
                onChange={(v) => onChange(f.key, v)}
              />
            );
          })
        : null}
    </div>
  );
}
