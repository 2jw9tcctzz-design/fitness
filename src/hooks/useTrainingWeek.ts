import { useEffect, useState } from "react";
import { getDailyLogsBetween } from "../db/repositories/dailyLogRepository";
import { getSessionsTouching } from "../db/repositories/workoutRepository";
import { resolveDayTraining, type DayTraining } from "../services/trainingStatusService";
import { getWeekSummary, type WeekSummary } from "../services/weeklyScoreService";
import { useAppState } from "../state/AppStateContext";
import type { ProgramSettings } from "../types/program";
import { addDays, getWeekDateRange } from "../utils/dates";

export type WeekDayTraining = DayTraining & { mobilityMinutes: number | null };

/** Veckans sju dagar med plan och status, plus veckosammanfattningen (X/3 styrkepass). */
export function useTrainingWeek(date: string, settings: ProgramSettings) {
  const { trainingRevision } = useAppState();
  const [days, setDays] = useState<WeekDayTraining[]>([]);
  const [summary, setSummary] = useState<WeekSummary | null>(null);
  const { start, end } = getWeekDateRange(date);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [sessions, logs, week] = await Promise.all([
          getSessionsTouching(start, end),
          getDailyLogsBetween(start, end),
          getWeekSummary(date, settings),
        ]);
        if (cancelled) return;
        const list: WeekDayTraining[] = Array.from({ length: 7 }, (_, i) => {
          const d = addDays(start, i);
          const log = logs.find((l) => l.date === d) ?? null;
          const legacyFrom = logs.find((l) => l.strengthStatus === "moved" && l.strengthMovedTo === d)?.date ?? null;
          const dt = resolveDayTraining({
            date: d,
            settings,
            sessions: sessions.filter((s) => s.plannedDate === d || s.performedDate === d || s.movedToDate === d),
            log,
            legacyMovedInFrom: legacyFrom,
          });
          return { ...dt, mobilityMinutes: log?.mobilityMinutes ?? null };
        });
        setDays(list);
        setSummary(week);
      } catch {
        if (!cancelled) {
          setDays([]);
          setSummary(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [start, end, date, settings, trainingRevision]);

  return { days, summary, start, end };
}
