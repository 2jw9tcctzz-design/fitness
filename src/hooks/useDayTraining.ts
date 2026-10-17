import { useEffect, useState } from "react";
import { getDayTraining, type DayTrainingDetail } from "../services/trainingStatusService";
import { useAppState } from "../state/AppStateContext";
import type { ProgramSettings } from "../types/program";

/** Dagens träningsstatus (skrivskyddad) för Idag. Läser om när Träning ändrar något. */
export function useDayTraining(date: string, settings: ProgramSettings): DayTrainingDetail | null {
  const { trainingRevision } = useAppState();
  const [value, setValue] = useState<DayTrainingDetail | null>(null);

  useEffect(() => {
    let cancelled = false;
    getDayTraining(date, settings)
      .then((v) => !cancelled && setValue(v))
      .catch(() => !cancelled && setValue(null));
    return () => {
      cancelled = true;
    };
  }, [date, settings, trainingRevision]);

  return value;
}
