import type { BodyMeasurements } from "../types/program";

export type MeasurementKey = keyof BodyMeasurements;

/** Kroppsmått som kan loggas (cm). Ordningen är den som visas i appen. */
export const MEASUREMENT_FIELDS: { key: MeasurementKey; label: string }[] = [
  { key: "waistCm", label: "Midja" },
  { key: "hipsCm", label: "Höft" },
  { key: "chestCm", label: "Bröst" },
  { key: "thighCm", label: "Lår" },
  { key: "armCm", label: "Överarm" },
];

export const EMPTY_MEASUREMENTS: BodyMeasurements = {
  waistCm: null,
  hipsCm: null,
  chestCm: null,
  thighCm: null,
  armCm: null,
};
