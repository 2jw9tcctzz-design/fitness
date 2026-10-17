import "fake-indexeddb/auto";
import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_APP_SETTINGS } from "../src/config/programDefaults";
import { PROGRAM_BLOCKS, WORKOUT_TEMPLATES } from "../src/config/trainingProgram";
import { getDatabase } from "../src/db/database";
import { LATEST_SCHEMA_VERSION } from "../src/db/migrations";
import { exportBackup, replaceAllData } from "../src/db/repositories/backupRepository";
import { getDailyLog, patchDailyLog, upsertDailyLog } from "../src/db/repositories/dailyLogRepository";
import {
  addExercise,
  addOtherActivity,
  getAllSessions,
  getOtherActivitiesForDate,
  getPreviousPerformance,
  getSessionsTouching,
  getWorkoutDetail,
  putSets,
} from "../src/db/repositories/workoutRepository";
import { parseBackupText, validateBackup } from "../src/services/backupService";
import {
  formatPrescription,
  getBlockForWeek,
  getPrescription,
  getTemplateForDate,
  getTrainingWeek,
  getWorkoutCodeForDate,
} from "../src/services/programBlockService";
import { applyPrevious, progressionAdvice, summarizeSets } from "../src/services/progressionService";
import { getDayTraining, overlayWorkoutStatus, resolveDayTraining } from "../src/services/trainingStatusService";
import { getWeekSummary } from "../src/services/weeklyScoreService";
import { buildFocusItems } from "../src/services/focusService";
import { EMPTY_FORM } from "../src/services/checkInForm";
import {
  completeWorkout,
  moveWorkout,
  reopenWorkout,
  setMobilityMinutes,
  skipWorkout,
  startWorkout,
  undoSkipOrMove,
} from "../src/services/workoutService";
import type { ExerciseSet, WorkoutSession } from "../src/types/training";

const P = DEFAULT_APP_SETTINGS.program; // programstart 2026-10-12 (måndag), styrkedagar mån/ons/lör
const set = (n: number, weight: number | null, reps: number | null, completed = true): ExerciseSet => ({
  id: `s${n}`,
  exerciseLogId: "l",
  setNumber: n,
  weightKg: weight,
  reps,
  durationSeconds: null,
  completed,
});

// ---------- Program ----------

test("program: måndag ger pass A, onsdag B, lördag C, övriga dagar mobility", () => {
  assert.equal(getWorkoutCodeForDate("2026-10-19", P), "A"); // mån
  assert.equal(getWorkoutCodeForDate("2026-10-21", P), "B"); // ons
  assert.equal(getWorkoutCodeForDate("2026-10-24", P), "C"); // lör
  for (const d of ["2026-10-20", "2026-10-22", "2026-10-23", "2026-10-25"]) {
    assert.equal(getWorkoutCodeForDate(d, P), null, d);
    assert.equal(getTemplateForDate(d, P), null);
  }
  assert.equal(getTemplateForDate("2026-10-19", P)?.name, "Fullkropp A");
  // Styrkedagarna kommer från inställningarna
  assert.equal(getWorkoutCodeForDate("2026-10-23", { ...P, strengthDays: [2, 5] }), "B"); // fre = andra dagen
});

test("program: tre passmallar med sex övningar var, och alternativ finns", () => {
  assert.deepEqual(WORKOUT_TEMPLATES.map((t) => t.code), ["A", "B", "C"]);
  for (const t of WORKOUT_TEMPLATES) {
    assert.equal(t.exercises.length, 6);
    assert.ok(t.exercises.every((e) => (e.substitutions?.length ?? 0) >= 1));
  }
  const squat = WORKOUT_TEMPLATES[0].exercises[0];
  assert.deepEqual(squat.substitutions, ["Knäböj", "Goblet squat", "Leg press", "EGYM squat"]);
});

test("program: rätt block väljs vecka 1, 3, 5, 9 och 12", () => {
  assert.equal(getBlockForWeek(1).id, "1A");
  assert.equal(getBlockForWeek(2).id, "1A");
  assert.equal(getBlockForWeek(3).id, "1B");
  assert.equal(getBlockForWeek(5).id, "2");
  assert.equal(getBlockForWeek(8).id, "2");
  assert.equal(getBlockForWeek(9).id, "3");
  assert.equal(getBlockForWeek(11).id, "3");
  assert.equal(getBlockForWeek(12).id, "deload");
  assert.equal(PROGRAM_BLOCKS.length, 5);
  // Programvecka utifrån datum: start 2026-10-12
  assert.equal(getTrainingWeek("2026-10-12", P), 1);
  assert.equal(getTrainingWeek("2026-11-09", P), 5);
  assert.equal(getTrainingWeek("2026-10-01", P), 1); // före start
  assert.equal(getTrainingWeek("2027-06-01", P), 12); // efter slut
});

test("program: set och reps följer blocket (huvudövning, övrig, tidsbaserad)", () => {
  const [a1, , , , a5, a6] = WORKOUT_TEMPLATES[0].exercises; // knäböj (main), hip thrust (accessory), planka (core)
  const fmt = (ex: typeof a1, week: number) => formatPrescription(getPrescription(ex, getBlockForWeek(week)));
  assert.equal(fmt(a1, 1), "2 x 10–12");
  assert.equal(fmt(a1, 3), "3 x 10–12");
  assert.equal(fmt(a5, 3), "2 x 10–12"); // accessories 2–3 set i vecka 3–4 (nedre gränsen)
  assert.equal(fmt(a1, 5), "3 x 8–12");
  assert.equal(fmt(a5, 5), "3 x 10–15");
  assert.equal(fmt(a1, 9), "3 x 6–10");
  assert.equal(fmt(a5, 9), "3 x 8–12");
  assert.equal(fmt(a1, 12), "2 x 8–12");
  assert.equal(fmt(a6, 5), "2 x 30–60 sek");
  const rir = (w: number) => getPrescription(a1, getBlockForWeek(w));
  assert.deepEqual([rir(1).rirMin, rir(1).rirMax], [3, 4]);
  assert.deepEqual([rir(3).rirMin, rir(3).rirMax], [2, 3]);
  assert.deepEqual([rir(9).rirMin, rir(9).rirMax], [1, 2]);
  assert.deepEqual([rir(12).rirMin, rir(12).rirMax], [3, 4]);
  assert.equal(getBlockForWeek(12).isDeload, true);
});

// ---------- Progression ----------

test("progression: max reps i alla set ger förslag att öka, annars inte", () => {
  const p = getPrescription(WORKOUT_TEMPLATES[0].exercises[3], getBlockForWeek(5)); // 3 x 8–12
  const top = progressionAdvice([set(1, 20, 12), set(2, 20, 12), set(3, 20, 12)], p);
  assert.equal(top?.kind, "ready");
  assert.match(top?.text ?? "", /Överväg nästa viktsteg/);
  const notTop = progressionAdvice([set(1, 20, 12), set(2, 20, 11), set(3, 20, 10)], p);
  assert.equal(notTop?.kind, "beat");
  assert.match(notTop?.text ?? "", /slå minst ett set/);
  // Ej klara set räknas inte, och ett enda set räcker inte för ett öknings-förslag
  assert.equal(progressionAdvice([set(1, 20, 12), set(2, 20, 12, false)], p)?.kind, "beat");
  assert.equal(progressionAdvice(null, p), null);
  assert.equal(progressionAdvice([], p), null);
  assert.equal(progressionAdvice([set(1, 20, 12), set(2, 20, 12)], p, true)?.kind, "deload"); // deload föreslår aldrig ökning
});

test("förra gången: sammanfattning och 'Använd förra gången'", () => {
  assert.equal(summarizeSets([set(1, 10, 12), set(2, 10, 11), set(3, 10, 10)]).replace(/\s/g, " "), "10 kg · 12 / 11 / 10");
  assert.equal(summarizeSets([set(1, 10, 12), set(2, 12, 10)]).replace(/\s/g, " "), "10 kg × 12 / 12 kg × 10");
  assert.equal(summarizeSets([set(1, 26, 12), set(2, 26, 12), set(3, 26, 11)]).replace(/\s/g, " "), "26 kg · 12 / 12 / 11");
  assert.equal(summarizeSets([]), "");
  const current = [set(1, null, null, false), set(2, null, null, false), set(3, null, null, false), set(4, null, null, false)];
  const patches = applyPrevious(current, [set(1, 26, 12), set(2, 26, 12), set(3, 26, 11)]);
  assert.equal(patches.length, 4);
  assert.deepEqual(patches.map((x) => x.weightKg), [26, 26, 26, 26]);
  assert.deepEqual(patches.map((x) => x.reps), [12, 12, 11, 11]);
});

// ---------- Träningslogg i databasen ----------

const MON = "2026-10-19"; // pass A, programvecka 2 (block 1A)

test("träningslogg: databasen har träningslagren och passet kan startas", async () => {
  const db = await getDatabase();
  assert.equal(db.version, LATEST_SCHEMA_VERSION);
  for (const s of ["workout_sessions", "exercise_logs", "exercise_sets", "other_activities"]) assert.ok(db.objectStoreNames.contains(s), s);

  const session = await startWorkout(MON, P);
  assert.equal(session.status, "planned");
  assert.equal(session.plannedDate, MON);
  assert.equal(session.performedDate ?? null, null);
  assert.equal(session.templateId, "A");
  assert.ok(session.startedAt);

  const detail = await getWorkoutDetail(session.id);
  assert.equal(detail.length, 6);
  assert.equal(detail[0].log.exerciseName, "Knäböj");
  assert.equal(detail[0].sets.length, 2); // vecka 2: två arbetsset
  assert.ok(detail.every((d) => d.sets.every((s) => !s.completed && s.weightKg == null && s.reps == null)));

  // Start två gånger skapar inget dubbelt
  await startWorkout(MON, P);
  assert.equal((await getAllSessions()).filter((s) => s.plannedDate === MON).length, 1);
  assert.equal((await getWorkoutDetail(session.id)).length, 6);
});

test("träningslogg: vikt och reps sparas och finns kvar efter omstart", async () => {
  const detail = await getWorkoutDetail(`ws_${MON}`);
  const first = detail[0];
  await putSets([
    { ...first.sets[0], weightKg: 40, reps: 12, completed: true },
    { ...first.sets[1], weightKg: 40, reps: 11, completed: true },
  ]);
  // Läs med en helt ny anslutning (som när appen öppnas igen)
  const raw = await new Promise<ExerciseSet[]>((resolve, reject) => {
    const open = indexedDB.open("daily-coach");
    open.onsuccess = () => {
      const req = open.result.transaction("exercise_sets", "readonly").objectStore("exercise_sets").getAll();
      req.onsuccess = () => {
        open.result.close();
        resolve(req.result as ExerciseSet[]);
      };
      req.onerror = () => reject(req.error);
    };
    open.onerror = () => reject(open.error);
  });
  const saved = raw.filter((s) => s.exerciseLogId === first.log.id).sort((a, b) => a.setNumber - b.setNumber);
  assert.deepEqual(saved.map((s) => [s.weightKg, s.reps, s.completed]), [[40, 12, true], [40, 11, true]]);
});

test("träningslogg: manuell övning kan läggas till med egna set", async () => {
  await addExercise({
    log: { id: "manual-1", workoutSessionId: `ws_${MON}`, exerciseName: "Bicepscurl", templateExerciseId: null, order: 7, note: "Maskin nr 8" },
    sets: [1, 2, 3].map((n) => ({ id: `man-s${n}`, exerciseLogId: "manual-1", setNumber: n, weightKg: 8, reps: 12, durationSeconds: null, completed: true })),
  });
  const detail = await getWorkoutDetail(`ws_${MON}`);
  const manual = detail.find((d) => d.log.exerciseName === "Bicepscurl");
  assert.ok(manual);
  assert.equal(manual?.sets.length, 3);
  assert.equal(manual?.log.templateExerciseId, null);
  assert.equal(manual?.log.note, "Maskin nr 8");
});

test("träningslogg: att slutföra sätter status, performedDate och completedAt; öppna igen återställer", async () => {
  const done = await completeWorkout(MON, `ws_${MON}`);
  assert.equal(done.status, "completed");
  assert.equal(done.performedDate, MON);
  assert.equal(done.plannedDate, MON);
  assert.ok(done.completedAt);

  const dt = await getDayTraining(MON, P);
  assert.equal(dt.status, "completed");
  assert.equal(dt.exerciseCount, 7);

  const re = await reopenWorkout(`ws_${MON}`);
  assert.equal(re.status, "planned");
  assert.equal(re.performedDate, null);
  assert.equal((await getDayTraining(MON, P)).status, "started");
  await completeWorkout(MON, `ws_${MON}`);
});

test("förra gången: hämtar senaste genomförda passet, inte framtida eller ofullständiga", async () => {
  const prev = await getPreviousPerformance("Knäböj", "2026-10-21");
  assert.equal(prev?.date, MON);
  assert.deepEqual(prev?.sets.map((s) => [s.weightKg, s.reps]), [[40, 12], [40, 11]]);
  assert.equal(await getPreviousPerformance("Knäböj", MON), null); // samma dag räknas inte
  assert.equal(await getPreviousPerformance("Finns inte", "2026-12-01"), null);

  // Ett pass som inte slutförts räknas inte
  const wed = "2026-10-21";
  await startWorkout(wed, P);
  const w = await getWorkoutDetail(`ws_${wed}`);
  await putSets([{ ...w[0].sets[0], weightKg: 50, reps: 10, completed: true }]);
  assert.equal(await getPreviousPerformance(w[0].log.exerciseName, "2026-10-23"), null);
  await completeWorkout(wed, `ws_${wed}`);
  const after = await getPreviousPerformance(w[0].log.exerciseName, "2026-10-23");
  assert.equal(after?.date, wed);
  assert.equal(after?.sets.length, 1); // bara klara set
});

test("träningslogg: ett valt alternativ minns till nästa gång passet startas", async () => {
  // Byt A1 till Leg press i dagens pass, slutför och starta nästa vecka
  const { putExerciseLog } = await import("../src/db/repositories/workoutRepository");
  const detail = await getWorkoutDetail(`ws_${MON}`);
  await putExerciseLog({ ...detail[0].log, exerciseName: "Leg press" });
  const next = "2026-10-26";
  await startWorkout(next, P);
  const d = await getWorkoutDetail(`ws_${next}`);
  assert.equal(d[0].log.exerciseName, "Leg press");
  assert.equal(d[1].log.exerciseName, "Bröstpress");
});

// ---------- Flytt ----------

test("flytt: plannedDate bevaras, performedDate sätts när passet görs, ingen dubblett", async () => {
  const sat = "2026-10-24"; // pass C
  const moved = await moveWorkout(sat, "2026-10-27", P); // tisdag
  assert.equal(moved.status, "moved");
  assert.equal(moved.plannedDate, sat);
  assert.equal(moved.movedToDate, "2026-10-27");
  assert.equal(moved.templateId, "C");
  assert.equal(moved.performedDate ?? null, null);

  // Lördagen visar flyttat, tisdagen tar emot passet och blir en styrkedag
  const satDt = await getDayTraining(sat, P);
  assert.equal(satDt.status, "moved");
  assert.equal(satDt.movedTo, "2026-10-27");
  const tueDt = await getDayTraining("2026-10-27", P);
  assert.equal(tueDt.kind, "strength");
  assert.equal(tueDt.templateCode, "C");
  assert.equal(tueDt.receivedFrom, sat);
  assert.equal(tueDt.status, "none");

  // Passet genomförs på tisdagen med samma session
  const started = await startWorkout("2026-10-27", P);
  assert.equal(started.id, `ws_${sat}`);
  assert.equal(started.plannedDate, sat);
  assert.equal((await getWorkoutDetail(started.id))[0].log.templateExerciseId, "C1");
  const done = await completeWorkout("2026-10-27", started.id);
  assert.equal(done.plannedDate, sat);
  assert.equal(done.performedDate, "2026-10-27");
  assert.equal(done.templateId, "C");
  assert.equal((await getAllSessions()).filter((s) => s.plannedDate === sat).length, 1);

  assert.equal((await getDayTraining("2026-10-27", P)).status, "completed");
  assert.equal((await getDayTraining(sat, P)).status, "moved"); // planerad dag visar fortfarande flytten
});

test("flytt: bara framåt, och måldagen måste vara giltig", async () => {
  await assert.rejects(() => moveWorkout("2026-10-31", "2026-10-30", P)); // bakåt
  await assert.rejects(() => moveWorkout("2026-10-31", "2026-10-31", P)); // samma dag
  await assert.rejects(() => moveWorkout("2026-10-31", "inte-datum", P));
  await assert.rejects(() => moveWorkout("2026-10-29", "2026-10-30", P)); // 29 okt (torsdag) har inget pass att flytta
  const ok = await moveWorkout("2026-10-31", "2026-11-03", P);
  assert.equal(ok.movedToDate, "2026-11-03");
  // Ångra flytt utan loggad träning tar bort passet helt
  await undoSkipOrMove(ok.id);
  assert.equal((await getAllSessions()).find((s) => s.plannedDate === "2026-10-31"), undefined);
});

test("inte gjort: sparas som skipped och kan ångras", async () => {
  const s = await skipWorkout("2026-11-02", P);
  assert.equal(s.status, "skipped");
  assert.equal((await getDayTraining("2026-11-02", P)).status, "skipped");
  await undoSkipOrMove(s.id);
  assert.equal((await getDayTraining("2026-11-02", P)).status, "none");
});

// ---------- Integration: Idag, veckopoäng, äldre data ----------

test("Idag: slutfört pass från WorkoutSession ger status, antal övningar och fokus", async () => {
  const dt = await getDayTraining(MON, P);
  assert.equal(dt.status, "completed");
  assert.equal(dt.templateCode, "A");
  assert.equal(dt.exerciseCount, 7);
  const focus = buildFocusItems(MON, EMPTY_FORM, P, null, null, {
    strengthStatus: dt.status,
    movedTo: dt.movedTo,
    movedInFrom: dt.receivedFrom,
    mobilityMinutes: dt.mobilityMinutes,
  });
  assert.equal(focus.length, 4);
  const strength = focus.find((f) => f.key === "strength");
  assert.equal(strength?.done, true);
  assert.equal(strength?.detail, "Genomfört");
});

test("Idag: mobility lagras i dagens logg och sparande på Idag skriver inte över det", async () => {
  const tue = "2026-10-20";
  await setMobilityMinutes(tue, 12);
  assert.equal((await getDailyLog(tue))?.mobilityMinutes, 12);
  const dt = await getDayTraining(tue, P);
  assert.equal(dt.kind, "mobility");
  assert.equal(dt.mobilityMinutes, 12);
  // Idag sparar bara sina egna fält med patch
  await patchDailyLog(tue, { weightKg: 71.5, steps: 9000 });
  const log = await getDailyLog(tue);
  assert.equal(log?.mobilityMinutes, 12);
  assert.equal(log?.weightKg, 71.5);
  // Äldre manuellt inmatade värden bevaras vid patch
  await upsertDailyLog({ date: "2026-10-22", calories: 1750, proteinG: 155, fiberG: 31 });
  await patchDailyLog("2026-10-22", { steps: 8000 });
  const old = await getDailyLog("2026-10-22");
  assert.deepEqual([old?.calories, old?.proteinG, old?.fiberG, old?.steps], [1750, 155, 31, 8000]);
});

test("veckopoäng: styrketräning hämtas från WorkoutSession, äldre strengthStatus gäller bara dagar utan pass", async () => {
  // Vecka 19–25 okt: pass A genomfört mån (session), pass C flyttat till tis och genomfört (session)
  const w = await getWeekSummary("2026-10-21", P);
  assert.equal(w.strengthCount, 2);
  assert.equal(w.strengthTarget, 3);
  assert.ok(w.score !== null);

  // En äldre dagslogg som säger "done" på en dag utan pass räknas fortfarande (veckan 2–8 nov)
  await upsertDailyLog({ date: "2026-11-04", strengthStatus: "done", sleepHours: 8 });
  await upsertDailyLog({ date: "2026-11-05", sleepHours: 8 });
  assert.equal((await getWeekSummary("2026-11-04", P)).strengthCount, 1);
  // Ett pass på samma dag styr över gammal logg: "inte gjort" i sessionen ersätter "done" i loggen
  await skipWorkout("2026-11-04", P);
  assert.equal((await getWeekSummary("2026-11-04", P)).strengthCount, 0);
});

test("veckopoäng: inte gjort och flyttat sänker inte poängen", () => {
  const mk = (date: string, status: WorkoutSession["status"], extra: Partial<WorkoutSession> = {}): WorkoutSession => ({
    id: `ws_${date}`, plannedDate: date, status, templateId: "A", createdAt: "", updatedAt: "", ...extra,
  });
  const logs = [{ id: "a", date: "2026-11-09", createdAt: "", updatedAt: "", sleepHours: 8 }];
  const over = overlayWorkoutStatus(logs, "2026-11-09", "2026-11-15", [
    mk("2026-11-09", "skipped"),
    mk("2026-11-11", "moved", { movedToDate: "2026-11-12" }),
    mk("2026-11-14", "completed", { performedDate: "2026-11-14" }),
  ]);
  const by = (d: string) => over.find((l) => l.date === d);
  assert.equal(by("2026-11-09")?.strengthStatus, "skipped");
  assert.equal(by("2026-11-11")?.strengthStatus, "moved");
  assert.equal(by("2026-11-11")?.strengthMovedTo, "2026-11-12");
  assert.equal(by("2026-11-14")?.strengthStatus, "done");
  assert.equal(over.filter((l) => l.strengthStatus === "done").length, 1);
});

test("äldre data: dagslogg utan pass visas som legacy-status, flyttat hit fungerar", () => {
  const log = { id: "x", date: "2026-10-12", createdAt: "", updatedAt: "", strengthStatus: "done" as const };
  const dt = resolveDayTraining({ date: "2026-10-12", settings: P, sessions: [], log });
  assert.equal(dt.status, "completed");
  assert.equal(dt.legacy, true);
  const moved = resolveDayTraining({ date: "2026-10-13", settings: P, sessions: [], log: null, legacyMovedInFrom: "2026-10-12" });
  assert.equal(moved.kind, "strength");
  assert.equal(moved.receivedFrom, "2026-10-12");
  assert.equal(moved.templateCode, "A");
});

// ---------- Annan träning ----------

test("annan träning: sparas utan att påverka styrkemålet", async () => {
  await addOtherActivity({ id: "oa1", date: "2026-10-23", activityName: "Cykling", durationMinutes: 90, note: null });
  const list = await getOtherActivitiesForDate("2026-10-23");
  assert.equal(list.length, 1);
  assert.equal(list[0].activityName, "Cykling");
  const sessions = await getSessionsTouching("2026-10-23", "2026-10-23");
  assert.equal(sessions.length, 0);
  assert.equal((await getDayTraining("2026-10-23", P)).status, "none");
});

// ---------- Backup ----------

test("backup: träningsdata exporteras", async () => {
  const b = await exportBackup();
  assert.equal(b.schemaVersion, LATEST_SCHEMA_VERSION);
  assert.equal(b.programVersion, 1);
  assert.ok(b.data.workoutSessions.length >= 4);
  assert.ok(b.data.exerciseLogs.length >= 7);
  assert.ok(b.data.exerciseSets.length >= 10);
  assert.equal(b.data.otherActivities.length, 1);
  assert.ok(parseBackupText(JSON.stringify(b)).ok);
});

test("backup: träningsdata återställs (och det som inte finns i backupen försvinner)", async () => {
  const snapshot = await exportBackup();
  await upsertDailyLog({ date: "2026-12-01", weightKg: 60 });
  await skipWorkout("2026-12-02", P);
  await addOtherActivity({ id: "oa2", date: "2026-12-03", activityName: "MTB", durationMinutes: 60, note: null });

  const parsed = parseBackupText(JSON.stringify(snapshot));
  assert.ok(parsed.ok);
  if (!parsed.ok) return;
  await replaceAllData(parsed.backup.data);

  const after = await exportBackup();
  assert.deepEqual(after.data.workoutSessions, snapshot.data.workoutSessions);
  assert.deepEqual(after.data.exerciseLogs, snapshot.data.exerciseLogs);
  assert.deepEqual(after.data.exerciseSets, snapshot.data.exerciseSets);
  assert.deepEqual(after.data.otherActivities, snapshot.data.otherActivities);
  assert.equal((await getDayTraining(MON, P)).status, "completed");
  assert.equal((await getDayTraining("2026-12-02", P)).status, "none");
  const prev = await getPreviousPerformance("Leg press", "2026-10-21");
  assert.deepEqual(prev?.sets.map((s) => s.weightKg), [40, 40]);
});

test("backup: äldre backup utan träningsdata hanteras säkert (tom träning), trasig träningsdata avvisas", async () => {
  const base = await exportBackup();
  const old = structuredClone(base) as unknown as Record<string, unknown>;
  old.formatVersion = 1;
  delete old.programVersion;
  const data = old.data as Record<string, unknown>;
  for (const k of ["workoutSessions", "exerciseLogs", "exerciseSets", "otherActivities"]) delete data[k];
  const r = validateBackup(old);
  assert.ok(r.ok);
  if (r.ok) {
    assert.deepEqual(r.backup.data.workoutSessions, []);
    assert.deepEqual(r.backup.data.exerciseSets, []);
  }

  const bad = (mutate: (b: typeof base) => unknown) => validateBackup(mutate(structuredClone(base))).ok;
  assert.equal(bad((b) => { b.data.exerciseLogs[0].workoutSessionId = "finns-inte"; return b; }), false);
  assert.equal(bad((b) => { b.data.exerciseSets[0].exerciseLogId = "finns-inte"; return b; }), false);
  assert.equal(bad((b) => { b.data.workoutSessions[0].status = "konstig" as never; return b; }), false);
  assert.equal(bad((b) => { b.data.workoutSessions.push({ ...b.data.workoutSessions[0], id: "annat-id" }); return b; }), false); // samma plannedDate
  assert.equal(bad((b) => { b.data.otherActivities[0].date = "x" as never; return b; }), false);
  assert.equal(bad((b) => ({ ...b, formatVersion: 99 })), false);
});
