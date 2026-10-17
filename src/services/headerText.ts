import { formatDateWithYear } from "../utils/dates";
import { getProgramDay, getProgramStatus, getProgramWeek, getTotalDays } from "./programService";
import type { ProgramSettings } from "../types/program";

export type HeaderText = { title: string; subtitle: string };

/** Texterna i Idag-headern för valt datum: före start, aktivt eller avslutat. */
export function getHeaderText(date: string, settings: ProgramSettings): HeaderText {
  const title = `${settings.durationWeeks} veckor`;
  const status = getProgramStatus(date, settings);

  if (status === "upcoming") {
    return { title, subtitle: `Programmet startar ${formatDateWithYear(settings.programStartDate)}` };
  }
  if (status === "finished") {
    return { title, subtitle: `${settings.durationWeeks}-veckorsprogrammet är avslutat` };
  }
  return {
    title,
    subtitle: `Konsekvens före perfektion • Dag ${getProgramDay(date, settings)} av ${getTotalDays(settings)} • vecka ${getProgramWeek(date, settings)}`,
  };
}
