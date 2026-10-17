import { useCallback, useEffect, useRef, useState } from "react";
import { getTemplate } from "../config/trainingProgram";
import {
  addExercise,
  addOtherActivity,
  deleteExercise,
  deleteOtherActivity,
  deleteSet,
  getLastNameByTemplateExercise,
  getLoggedExerciseNames,
  getOtherActivitiesForDate,
  getPreviousPerformance,
  getWorkoutDetail,
  newId,
  putExerciseLog,
  putSets,
  type PreviousPerformance,
} from "../db/repositories/workoutRepository";
import { getBlockForWeek, getPrescription, getTrainingWeek } from "../services/programBlockService";
import { applyPrevious } from "../services/progressionService";
import { getMoveTargetCandidates } from "../services/strengthPlanService";
import { getDayTraining, getTakenMoveTargets, type DayTrainingDetail } from "../services/trainingStatusService";
import {
  completeWorkout,
  moveWorkout,
  reopenWorkout,
  setMobilityMinutes,
  skipWorkout,
  startWorkout,
  undoSkipOrMove,
} from "../services/workoutService";
import { useAppState } from "../state/AppStateContext";
import type { ProgramSettings } from "../types/program";
import type {
  ExerciseLog,
  ExerciseSet,
  OtherActivityLog,
  Prescription,
  WorkoutTemplateExercise,
} from "../types/training";

export type ExerciseView = {
  log: ExerciseLog;
  sets: ExerciseSet[];
  template: WorkoutTemplateExercise | null;
  prescription: Prescription | null;
  previous: PreviousPerformance | null;
};

export type PreviewExercise = {
  template: WorkoutTemplateExercise;
  name: string;
  prescription: Prescription;
  previous: PreviousPerformance | null;
};

const MOVE_WINDOW_DAYS = 7;
const SAVE_DELAY_MS = 400;

/** All logik bakom Träning för en dag: pass, övningar, set, förra gången, flytt och mobility. */
export function useTrainingDay(date: string, settings: ProgramSettings) {
  const { notifyTrainingChanged } = useAppState();
  const [detail, setDetail] = useState<DayTrainingDetail | null>(null);
  const [exercises, setExercises] = useState<ExerciseView[]>([]);
  const [preview, setPreview] = useState<PreviewExercise[]>([]);
  const [activities, setActivities] = useState<OtherActivityLog[]>([]);
  const [candidates, setCandidates] = useState<string[]>([]);
  const [knownNames, setKnownNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const pending = useRef(new Map<string, ExerciseSet>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const week = getTrainingWeek(date, settings);
  const block = getBlockForWeek(week);

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const sets = [...pending.current.values()];
    pending.current.clear();
    if (sets.length > 0) await putSets(sets);
  }, []);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    try {
      await flush();
      const dt = await getDayTraining(date, settings);
      const blockNow = getBlockForWeek(getTrainingWeek(date, settings));
      const template = dt.templateCode ? getTemplate(dt.templateCode) : null;

      let views: ExerciseView[] = [];
      let previews: PreviewExercise[] = [];
      if (dt.session && dt.exerciseCount > 0) {
        const logged = await getWorkoutDetail(dt.session.id);
        views = await Promise.all(
          logged.map(async ({ log, sets }) => {
            const te = template?.exercises.find((e) => e.id === log.templateExerciseId) ?? null;
            return {
              log,
              sets,
              template: te,
              prescription: te ? getPrescription(te, blockNow) : null,
              previous: await getPreviousPerformance(log.exerciseName, date, dt.session?.id),
            };
          })
        );
      } else if (template && dt.kind === "strength") {
        const names = await getLastNameByTemplateExercise();
        previews = await Promise.all(
          template.exercises.map(async (te) => {
            const name = names.get(te.id) ?? te.name;
            return { template: te, name, prescription: getPrescription(te, blockNow), previous: await getPreviousPerformance(name, date) };
          })
        );
      }

      const [acts, taken, suggestions] = await Promise.all([
        getOtherActivitiesForDate(date),
        dt.kind === "strength" ? getTakenMoveTargets(date, MOVE_WINDOW_DAYS, dt.session?.id) : Promise.resolve(new Set<string>()),
        getLoggedExerciseNames(),
      ]);
      if (id !== requestId.current) return;
      setDetail(dt);
      setExercises(views);
      setPreview(previews);
      setActivities(acts);
      setCandidates(dt.kind === "strength" ? getMoveTargetCandidates(date, settings, taken, MOVE_WINDOW_DAYS) : []);
      setKnownNames(suggestions);
      setError(null);
    } catch {
      if (id === requestId.current) setError("Det gick inte att läsa träningen.");
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [date, settings, flush]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  // Spara väntande ändringar när skärmen stängs eller appen hamnar i bakgrunden.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") void flush();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
      void flush();
    };
  }, [flush]);

  /** Kör en ändring, läser om och meddelar Idag. Fel visas lugnt. */
  const run = useCallback(
    async (action: () => Promise<unknown>) => {
      try {
        await flush();
        await action();
        await load();
        notifyTrainingChanged();
      } catch (e) {
        setError(e instanceof Error && e.message ? e.message : "Det gick inte att spara just nu.");
      }
    },
    [flush, load, notifyTrainingChanged]
  );

  // ----- pass -----
  const start = useCallback(() => run(() => startWorkout(date, settings)), [run, date, settings]);
  const complete = useCallback(
    () => run(async () => detail?.session && completeWorkout(date, detail.session.id)),
    [run, date, detail]
  );
  const reopen = useCallback(() => run(async () => detail?.session && reopenWorkout(detail.session.id)), [run, detail]);
  const skip = useCallback(() => run(() => skipWorkout(date, settings)), [run, date, settings]);
  const move = useCallback((target: string) => run(() => moveWorkout(date, target, settings)), [run, date, settings]);
  const undo = useCallback(() => run(async () => detail?.session && undoSkipOrMove(detail.session.id)), [run, detail]);

  // ----- set (sparas direkt i gränssnittet, till databasen efter en kort paus) -----
  const updateSet = useCallback(
    (setId: string, patch: Partial<Pick<ExerciseSet, "weightKg" | "reps" | "durationSeconds" | "completed">>, immediate = false) => {
      setExercises((prev) =>
        prev.map((ex) => ({
          ...ex,
          sets: ex.sets.map((s) => {
            if (s.id !== setId) return s;
            const next = { ...s, ...patch };
            pending.current.set(setId, next);
            return next;
          }),
        }))
      );
      if (timer.current) clearTimeout(timer.current);
      if (immediate) void flush();
      else timer.current = setTimeout(() => void flush(), SAVE_DELAY_MS);
    },
    [flush]
  );

  const addSet = useCallback(
    async (logId: string) => {
      const ex = exercises.find((e) => e.log.id === logId);
      if (!ex) return;
      await flush();
      const last = ex.sets[ex.sets.length - 1];
      const set: ExerciseSet = {
        id: newId("es_"),
        exerciseLogId: logId,
        setNumber: (last?.setNumber ?? 0) + 1,
        weightKg: last?.weightKg ?? null,
        reps: null,
        durationSeconds: null,
        completed: false,
      };
      await putSets([set]);
      await load();
    },
    [exercises, flush, load]
  );

  const removeSet = useCallback(async (setId: string) => run(() => deleteSet(setId)), [run]);

  const setExerciseNote = useCallback(
    async (logId: string, note: string) => {
      const ex = exercises.find((e) => e.log.id === logId);
      if (!ex) return;
      const log = { ...ex.log, note: note.trim() === "" ? null : note };
      setExercises((prev) => prev.map((e) => (e.log.id === logId ? { ...e, log } : e)));
      await putExerciseLog(log);
    },
    [exercises]
  );

  /** Byter till ett alternativ (t.ex. Leg press i stället för Knäböj). Minns till nästa pass. */
  const changeExercise = useCallback(
    (logId: string, name: string) =>
      run(async () => {
        const ex = exercises.find((e) => e.log.id === logId);
        if (ex) await putExerciseLog({ ...ex.log, exerciseName: name });
      }),
    [run, exercises]
  );

  /** "Använd förra gången": samma vikt och reps som sist, inget markeras som klart. */
  const applyPreviousResult = useCallback(
    async (logId: string) => {
      const ex = exercises.find((e) => e.log.id === logId);
      if (!ex?.previous) return;
      const patches = applyPrevious(ex.sets, ex.previous.sets);
      setExercises((prev) =>
        prev.map((e) => {
          if (e.log.id !== logId) return e;
          const sets = e.sets.map((s) => {
            const p = patches.find((x) => x.setId === s.id);
            if (!p) return s;
            const next = { ...s, weightKg: p.weightKg, reps: p.reps, durationSeconds: p.durationSeconds };
            pending.current.set(s.id, next);
            return next;
          });
          return { ...e, sets };
        })
      );
      await flush();
    },
    [exercises, flush]
  );

  /** Egen övning på dagens pass: namn + antal set. */
  const addManualExercise = useCallback(
    (name: string, setCount: number) =>
      run(async () => {
        if (!detail?.session) return;
        const logId = newId("el_");
        const order = exercises.reduce((m, e) => Math.max(m, e.log.order), 0) + 1;
        await addExercise({
          log: { id: logId, workoutSessionId: detail.session.id, exerciseName: name.trim(), templateExerciseId: null, order, note: null },
          sets: Array.from({ length: setCount }, (_, i) => ({
            id: newId("es_"),
            exerciseLogId: logId,
            setNumber: i + 1,
            weightKg: null,
            reps: null,
            durationSeconds: null,
            completed: false,
          })),
        });
      }),
    [run, detail, exercises]
  );

  const removeExercise = useCallback((logId: string) => run(() => deleteExercise(logId)), [run]);

  // ----- mobility och annan träning -----
  const saveMobility = useCallback((minutes: number | null) => run(() => setMobilityMinutes(date, minutes)), [run, date]);

  const logOtherActivity = useCallback(
    (input: { activityName: string; durationMinutes: number | null; note: string | null }) =>
      run(() => addOtherActivity({ id: newId("oa_"), date, ...input })),
    [run, date]
  );
  const removeOtherActivity = useCallback((id: string) => run(() => deleteOtherActivity(id)), [run]);

  return {
    week,
    block,
    detail,
    exercises,
    preview,
    activities,
    candidates,
    knownNames,
    loading,
    error,
    start,
    complete,
    reopen,
    skip,
    move,
    undo,
    updateSet,
    addSet,
    removeSet,
    setExerciseNote,
    changeExercise,
    applyPreviousResult,
    addManualExercise,
    removeExercise,
    saveMobility,
    logOtherActivity,
    removeOtherActivity,
  };
}
