import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getDailyLog,
  getLogMovedTo,
  getMoveTargetsTaken,
  upsertDailyLog,
} from "../db/repositories/dailyLogRepository";
import { EMPTY_FORM, formToInput, logToForm, type CheckInForm } from "../services/checkInForm";
import { buildFocusItems } from "../services/focusService";
import { getHeaderText } from "../services/headerText";
import { getActivityType } from "../services/programService";
import { getMoveTargetCandidates } from "../services/strengthPlanService";
import { getWeekSummary, type WeekSummary } from "../services/weeklyScoreService";
import type { StrengthStatus } from "../types/dailyLog";
import type { AppSettings } from "../types/program";
import { addDays, todayString } from "../utils/dates";

export type SaveState = "idle" | "saving" | "saved" | "error";

const SAVED_FEEDBACK_MS = 2500;
const MOVE_WINDOW_DAYS = 7;

function logError(context: string, error: unknown) {
  if (import.meta.env.DEV) console.warn(`[DailyCheckIn] ${context}`, error);
}

/**
 * All logik bakom Idag-skärmen: valt datum, formulär, laddning, sparande, veckosammanfattning
 * och styrkepassets flytt. Skärmen själv håller bara layout.
 */
export function useDailyCheckIn(appSettings: AppSettings) {
  const settings = appSettings.program;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const [date, setDate] = useState<string>(() => todayString());
  const [form, setForm] = useState<CheckInForm>(EMPTY_FORM);
  const [week, setWeek] = useState<WeekSummary | null>(null);
  const [movedInFrom, setMovedInFrom] = useState<string | null>(null);
  const [takenTargets, setTakenTargets] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Hämtar det som hänger ihop med dagen men inte är själva loggen. Fel här blockerar inte inmatning. */
  const refreshAux = useCallback(async (forDate: string) => {
    try {
      const [summary, incoming, taken] = await Promise.all([
        getWeekSummary(forDate, settingsRef.current),
        getLogMovedTo(forDate),
        getMoveTargetsTaken(addDays(forDate, 1), addDays(forDate, MOVE_WINDOW_DAYS)),
      ]);
      setWeek(summary);
      setMovedInFrom(incoming?.date ?? null);
      setTakenTargets(taken);
    } catch (error) {
      logError("kunde inte läsa veckan/flyttade pass", error);
      setWeek(null);
      setMovedInFrom(null);
      setTakenTargets(new Set());
    }
  }, []);

  // Ändras inställningarna (mål, styrkedagar) räknas veckan om utan att dagens inmatning laddas om.
  const firstSettingsRun = useRef(true);
  useEffect(() => {
    if (firstSettingsRun.current) {
      firstSettingsRun.current = false;
      return;
    }
    void refreshAux(date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  // Ladda loggen för valt datum. `cancelled` hindrar att ett långsamt svar skriver över en nyare dag.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    setSaveState("idle");
    setSaveError(null);

    (async () => {
      try {
        const log = await getDailyLog(date);
        if (cancelled) return;
        setForm(logToForm(log));
      } catch (error) {
        logError("kunde inte läsa dagens logg", error);
        if (cancelled) return;
        setForm(EMPTY_FORM);
        setLoadError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
      if (!cancelled) await refreshAux(date);
    })();

    return () => {
      cancelled = true;
    };
  }, [date, refreshAux]);

  useEffect(
    () => () => {
      if (savedTimer.current) clearTimeout(savedTimer.current);
    },
    []
  );

  const resetFeedback = () => setSaveState((prev) => (prev === "saved" || prev === "error" ? "idle" : prev));

  const updateForm = useCallback(<K extends keyof CheckInForm>(key: K, value: CheckInForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    resetFeedback();
  }, []);

  /** Sätter styrkepassets status. Att välja samma status igen rensar den (inte registrerat). */
  const setStrengthStatus = useCallback((status: StrengthStatus | null) => {
    setForm((prev) => ({
      ...prev,
      strengthStatus: status,
      strengthMovedTo: status === "moved" ? prev.strengthMovedTo : null,
    }));
    resetFeedback();
  }, []);

  const setStrengthMovedTo = useCallback((target: string | null) => {
    setForm((prev) => ({ ...prev, strengthStatus: "moved", strengthMovedTo: target }));
    resetFeedback();
  }, []);

  const save = useCallback(async () => {
    if (savedTimer.current) clearTimeout(savedTimer.current);
    const result = formToInput(date, form);
    if (!result.ok) {
      setSaveError(result.error);
      setSaveState("error");
      return;
    }

    setSaveState("saving");
    setSaveError(null);
    try {
      await upsertDailyLog(result.input);
      setSaveState("saved");
      savedTimer.current = setTimeout(() => setSaveState("idle"), SAVED_FEEDBACK_MS);
      await refreshAux(date);
    } catch (error) {
      logError("kunde inte spara", error);
      setSaveError(null); // standardtexten i SaveButton
      setSaveState("error");
    }
  }, [date, form, refreshAux]);

  const header = useMemo(() => getHeaderText(date, settings), [date, settings]);
  const activityType = useMemo(
    () => getActivityType(date, settings, movedInFrom !== null),
    [date, settings, movedInFrom]
  );
  const focusItems = useMemo(
    () => buildFocusItems(date, form, settings, movedInFrom),
    [date, form, settings, movedInFrom]
  );
  const moveCandidates = useMemo(() => {
    const list = getMoveTargetCandidates(date, settings, takenTargets, MOVE_WINDOW_DAYS);
    // Ett redan valt måldatum ska alltid synas, även om det räknas som "taget" av just detta pass.
    if (form.strengthMovedTo && !list.includes(form.strengthMovedTo)) {
      list.push(form.strengthMovedTo);
      list.sort();
    }
    return list;
  }, [date, settings, takenTargets, form.strengthMovedTo]);

  return {
    settings,
    baseline: appSettings.baseline,
    date,
    setDate,
    isToday: date === todayString(),
    header,
    activityType,
    focusItems,
    form,
    updateForm,
    setStrengthStatus,
    setStrengthMovedTo,
    moveCandidates,
    movedInFrom,
    week,
    loading,
    loadError,
    saveState,
    saveError,
    save,
    goToPrevDay: () => setDate((d) => addDays(d, -1)),
    goToNextDay: () => setDate((d) => addDays(d, 1)),
    goToToday: () => setDate(todayString()),
  };
}
