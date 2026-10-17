import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getDailyLog, patchDailyLog } from "../db/repositories/dailyLogRepository";
import { EMPTY_FORM, formToInput, logToForm, type CheckInForm } from "../services/checkInForm";
import { buildFocusItems } from "../services/focusService";
import { getHeaderText } from "../services/headerText";
import { getWeekSummary, type WeekSummary } from "../services/weeklyScoreService";
import type { DailyLogInput } from "../types/dailyLog";
import type { AppSettings } from "../types/program";
import { useAppState } from "../state/AppStateContext";
import { useDayNutrition } from "./useDayNutrition";
import { useDayTraining } from "./useDayTraining";
import { addDays, todayString } from "../utils/dates";

/**
 * Fälten Idag äger. Träning äger mobility och styrka, Mat äger det som ätits; äldre inmatade
 * kalorier/protein/fiber bevaras. Sparar Idag bara sina egna fält skriver den aldrig över andras.
 */
function pickOwnedFields(i: DailyLogInput): Partial<DailyLogInput> {
  return {
    weightKg: i.weightKg,
    sleepHours: i.sleepHours,
    walkMinutes: i.walkMinutes,
    steps: i.steps,
    energy: i.energy,
    note: i.note,
    waistCm: i.waistCm,
    hipsCm: i.hipsCm,
    chestCm: i.chestCm,
    thighCm: i.thighCm,
    armCm: i.armCm,
  };
}

export type SaveState = "idle" | "saving" | "saved" | "error";

const SAVED_FEEDBACK_MS = 2500;

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
  const { date, setDate, mealRevision, trainingRevision } = useAppState();
  const dayNutrition = useDayNutrition(date);
  const dayTraining = useDayTraining(date, settings);
  const [form, setForm] = useState<CheckInForm>(EMPTY_FORM);
  const [week, setWeek] = useState<WeekSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Hämtar veckosammanfattningen. Fel här blockerar inte inmatning. */
  const refreshAux = useCallback(async (forDate: string) => {
    try {
      setWeek(await getWeekSummary(forDate, settingsRef.current));
    } catch (error) {
      logError("kunde inte läsa veckan", error);
      setWeek(null);
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

  // Ändras måltiderna (Äten i Mat) räknas veckan om.
  const firstMealRun = useRef(true);
  useEffect(() => {
    if (firstMealRun.current) {
      firstMealRun.current = false;
      return;
    }
    void refreshAux(date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mealRevision, trainingRevision]);

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
      await patchDailyLog(date, pickOwnedFields(result.input));
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
  const focusItems = useMemo(
    () =>
      buildFocusItems(
        date,
        form,
        settings,
        dayTraining?.receivedFrom ?? null,
        dayNutrition.source === "meals" ? dayNutrition.values : null,
        dayTraining
          ? {
              strengthStatus: dayTraining.status,
              movedTo: dayTraining.movedTo,
              movedInFrom: dayTraining.receivedFrom,
              mobilityMinutes: dayTraining.mobilityMinutes,
            }
          : null
      ),
    [date, form, settings, dayNutrition, dayTraining]
  );

  return {
    settings,
    baseline: appSettings.baseline,
    date,
    setDate,
    dayNutrition,
    isToday: date === todayString(),
    header,
    dayTraining,
    focusItems,
    form,
    updateForm,
    week,
    loading,
    loadError,
    saveState,
    saveError,
    save,
    goToPrevDay: () => setDate(addDays(date, -1)),
    goToNextDay: () => setDate(addDays(date, 1)),
    goToToday: () => setDate(todayString()),
  };
}
