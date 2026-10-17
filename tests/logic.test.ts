import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_PROGRAM_SETTINGS } from "../src/config/programDefaults";
import {
  getActivityType,
  getDaysRemaining,
  getProgramDay,
  getProgramLastDate,
  getProgramStatus,
  getProgramWeek,
  isProgramActive,
  isStrengthDay,
} from "../src/services/programService";
import { calcPreliminaryWeeklyScore, countStrengthCompleted, countWalkGoalDays } from "../src/services/weeklyScoreCalc";
import { EMPTY_FORM, formToInput, logToForm, parseNumber } from "../src/services/checkInForm";
import { buildFocusItems } from "../src/services/focusService";
import { getMoveTargetCandidates } from "../src/services/strengthPlanService";
import { getHeaderText } from "../src/services/headerText";
import { addDays, getWeekDateRange, isoWeekday, diffInDays } from "../src/utils/dates";
import type { DailyLog } from "../src/types/dailyLog";

// Måndag 2026-10-12 = dag 1
const S = { ...DEFAULT_PROGRAM_SETTINGS, programStartDate: "2026-10-12" };

function log(date: string, extra: Partial<DailyLog> = {}): DailyLog {
  return { id: date, date, createdAt: "", updatedAt: "", ...extra };
}

test("datum: veckodag, addDays, diff över sommartidsbyte", () => {
  assert.equal(isoWeekday("2026-10-12"), 1); // måndag
  assert.equal(isoWeekday("2026-10-18"), 7); // söndag
  assert.equal(addDays("2026-10-31", 1), "2026-11-01");
  assert.equal(diffInDays("2026-10-24", "2026-10-26"), 2); // sommartid slutar 25 okt
  assert.deepEqual(getWeekDateRange("2026-10-16"), { start: "2026-10-12", end: "2026-10-18" });
  assert.deepEqual(getWeekDateRange("2026-10-18"), { start: "2026-10-12", end: "2026-10-18" });
});

test("programdag/vecka: dag 1, dag 7, dag 8, dag 84", () => {
  assert.equal(getProgramDay("2026-10-12", S), 1);
  assert.equal(getProgramWeek("2026-10-12", S), 1);
  assert.equal(getProgramWeek("2026-10-18", S), 1); // dag 7
  assert.equal(getProgramWeek("2026-10-19", S), 2); // dag 8
  const last = getProgramLastDate(S);
  assert.equal(getProgramDay(last, S), 84);
  assert.equal(getProgramWeek(last, S), 12);
  assert.equal(getDaysRemaining(last, S), 0);
  assert.equal(getDaysRemaining("2026-10-12", S), 83);
});

test("före start, aktivt och efter slut", () => {
  assert.equal(getProgramStatus("2026-10-11", S), "upcoming");
  assert.equal(getProgramWeek("2026-10-11", S), null);
  assert.equal(getDaysRemaining("2026-10-11", S), 84);
  assert.equal(isProgramActive("2026-10-12", S), true);
  const after = addDays(getProgramLastDate(S), 1);
  assert.equal(getProgramStatus(after, S), "finished");
  assert.equal(getProgramWeek(after, S), null);
  assert.equal(getDaysRemaining(after, S), 0);
});

test("styrkedagar: mån, ons, lör", () => {
  const expected = ["strength", "mobility_walk", "strength", "mobility_walk", "mobility_walk", "strength", "mobility_walk"];
  for (let i = 0; i < 7; i++) {
    assert.equal(getActivityType(addDays("2026-10-12", i), S), expected[i]);
  }
  assert.equal(isStrengthDay("2026-10-14", S), true);
  assert.equal(isStrengthDay("2026-10-15", S), false);
});

test("header-texter", () => {
  assert.equal(getHeaderText("2026-10-14", S).subtitle, "Konsekvens före perfektion • Dag 3 av 84 • vecka 1");
  assert.equal(getHeaderText("2026-10-01", S).subtitle, "Programmet startar 12 oktober 2026");
  assert.equal(getHeaderText("2027-06-01", S).subtitle, "12-veckorsprogrammet är avslutat");
  assert.equal(getHeaderText("2026-10-14", S).title, "12 veckor");
});

test("veckoräkning: träning och promenad, null räknas inte", () => {
  const logs = [
    log("2026-10-12", { strengthStatus: "done", walkMinutes: 35 }),
    log("2026-10-13", { walkMinutes: 30 }),
    log("2026-10-14", { strengthStatus: null, walkMinutes: null }),
    log("2026-10-15", { walkMinutes: 29 }),
  ];
  assert.equal(countStrengthCompleted(logs), 1);
  assert.equal(countWalkGoalDays(logs, S), 2);
});

test("veckopoäng: null vid för lite data, tom data är inte misslyckande", () => {
  assert.equal(calcPreliminaryWeeklyScore([], S), null);
  assert.equal(calcPreliminaryWeeklyScore([log("2026-10-12", { proteinG: 135 })], S), null);

  // Två dagar, bara protein loggat och nått målet => 100, inte sänkt av saknad sömn/fiber/etc.
  const two = [log("2026-10-12", { proteinG: 135 }), log("2026-10-13", { proteinG: 140 })];
  assert.equal(calcPreliminaryWeeklyScore(two, S), 100);

  // Halvt protein => 50
  const half = [log("2026-10-12", { proteinG: 67.5 }), log("2026-10-13", { proteinG: 67.5 })];
  assert.equal(calcPreliminaryWeeklyScore(half, S), 50);

  // Dagar utan data alls räknas inte som loggade dagar
  const empties = [log("2026-10-12"), log("2026-10-13", { proteinG: 135 })];
  assert.equal(calcPreliminaryWeeklyScore(empties, S), null);
});

test("veckopoäng: viktning över flera delmått", () => {
  const logs = [
    log("2026-10-12", { strengthStatus: "done", walkMinutes: 30, proteinG: 135, fiberG: 30, sleepHours: 8 }),
    log("2026-10-13", { walkMinutes: 30, proteinG: 135, fiberG: 30, sleepHours: 8 }),
  ];
  // styrka 1/3 => 33,3 %; övriga 100 % => 0,25*0,333 + 0,75 = 0,8333
  assert.equal(calcPreliminaryWeeklyScore(logs, S), 83);
});

test("formulär: tomt => null, 0 => 0, komma som decimal", () => {
  assert.equal(parseNumber("", true), null);
  assert.equal(parseNumber("  ", false), null);
  assert.equal(parseNumber("0", false), 0);
  assert.equal(parseNumber("72,4", true), 72.4);
  assert.equal(parseNumber("72.4", true), 72.4);
  assert.equal(parseNumber("72,4", false), "invalid");
  assert.equal(parseNumber("abc", true), "invalid");

  const r = formToInput("2026-10-12", { ...EMPTY_FORM, proteinG: "0" });
  assert.ok(r.ok);
  if (r.ok) {
    assert.equal(r.input.proteinG, 0); // registrerat 0
    assert.equal(r.input.calories, null); // inte registrerat
    assert.equal(r.input.energy, null);
    assert.equal(r.input.strengthStatus, null);
    assert.equal(r.input.strengthMovedTo, null);
    assert.equal(r.input.note, null);
  }
});

test("formulär: partiell logg med ett enda fält, ogiltiga och orimliga värden avvisas", () => {
  assert.ok(formToInput("2026-10-12", { ...EMPTY_FORM, weightKg: "71,5" }).ok);
  assert.equal(formToInput("2026-10-12", { ...EMPTY_FORM, steps: "tolv" }).ok, false);
  assert.equal(formToInput("2026-10-12", { ...EMPTY_FORM, sleepHours: "30" }).ok, false);
});

test("logToForm är omvändning av formToInput", () => {
  const input = formToInput("2026-10-12", {
    ...EMPTY_FORM,
    weightKg: "71,5",
    sleepHours: "7,5",
    energy: 4,
    note: " bra dag ",
  });
  assert.ok(input.ok);
  if (!input.ok) return;
  const form = logToForm({ ...input.input, id: "x", createdAt: "", updatedAt: "" });
  assert.equal(form.weightKg, "71,5");
  assert.equal(form.sleepHours, "7,5");
  assert.equal(form.energy, 4);
  assert.equal(form.note, "bra dag");
  assert.equal(form.calories, "");
});

test("dagens fokus: styrkedag vs övrig dag, saknat värde är neutralt", () => {
  const mon = buildFocusItems("2026-10-12", EMPTY_FORM, S);
  assert.deepEqual(mon.map((i) => i.key), ["protein", "fiber", "walk", "strength"]);
  assert.equal(mon[0].label, "Protein 135 g");
  assert.equal(mon[1].label, "Fiber 30+ g");
  assert.equal(mon[2].label, "30 min promenad");
  assert.ok(mon.every((i) => !i.done && i.detail === undefined));

  const tue = buildFocusItems("2026-10-13", { ...EMPTY_FORM, proteinG: "140", mobilityMinutes: "12" }, S);
  assert.deepEqual(tue.map((i) => i.key), ["protein", "fiber", "walk", "mobility"]);
  assert.equal(tue[3].label, "10–15 min mobility");
  assert.equal(tue[0].done, true);
  assert.equal(tue[3].done, true);
  assert.equal(tue[1].done, false);

  const monDone = buildFocusItems("2026-10-12", { ...EMPTY_FORM, strengthStatus: "done" }, S);
  assert.equal(monDone[3].done, true);
});

test("styrkestatus: gjort, inte gjort och flyttat valideras", () => {
  const ok = (form: Partial<typeof EMPTY_FORM>) => formToInput("2026-10-12", { ...EMPTY_FORM, ...form });

  const done = ok({ strengthStatus: "done" });
  assert.ok(done.ok);
  if (done.ok) assert.equal(done.input.strengthMovedTo, null);

  const skipped = ok({ strengthStatus: "skipped", strengthMovedTo: "2026-10-14" }); // måldatum ignoreras
  assert.ok(skipped.ok);
  if (skipped.ok) assert.equal(skipped.input.strengthMovedTo, null);

  const moved = ok({ strengthStatus: "moved", strengthMovedTo: "2026-10-13" });
  assert.ok(moved.ok);
  if (moved.ok) {
    assert.equal(moved.input.strengthStatus, "moved");
    assert.equal(moved.input.strengthMovedTo, "2026-10-13");
  }

  assert.equal(ok({ strengthStatus: "moved" }).ok, false); // måldag saknas
  assert.equal(ok({ strengthStatus: "moved", strengthMovedTo: "2026-10-12" }).ok, false); // samma dag
  assert.equal(ok({ strengthStatus: "moved", strengthMovedTo: "2026-13-45" }).ok, false); // ogiltigt datum
});

test("flyttat pass gör mobility-dagen till styrkedag", () => {
  // tisdag är normalt mobility
  assert.equal(getActivityType("2026-10-13", S), "mobility_walk");
  assert.equal(getActivityType("2026-10-13", S, true), "strength");

  const items = buildFocusItems("2026-10-13", EMPTY_FORM, S, "2026-10-12");
  assert.deepEqual(items.map((i) => i.key), ["protein", "fiber", "walk", "strength"]);
  assert.equal(items[3].detail, "Flyttat hit från mån 12 okt");
  assert.equal(items[3].done, false);
});

test("fokus visar status för styrkepass neutralt", () => {
  const moved = buildFocusItems("2026-10-12", { ...EMPTY_FORM, strengthStatus: "moved", strengthMovedTo: "2026-10-13" }, S);
  assert.equal(moved[3].detail, "Flyttat till tis 13 okt");
  assert.equal(moved[3].done, false);
  const skipped = buildFocusItems("2026-10-12", { ...EMPTY_FORM, strengthStatus: "skipped" }, S);
  assert.equal(skipped[3].detail, "Inte gjort");
  assert.equal(skipped[3].done, false);
});

test("poäng: inte gjort och flyttat sänker inte, gjort pass på flyttad dag räknas", () => {
  const logs = [
    log("2026-10-12", { strengthStatus: "moved", strengthMovedTo: "2026-10-13", proteinG: 135 }),
    log("2026-10-13", { strengthStatus: "done", proteinG: 135 }),
    log("2026-10-14", { strengthStatus: "skipped", proteinG: 135 }),
  ];
  assert.equal(countStrengthCompleted(logs), 1);
  // styrka 1/3 med vikt 0,25, protein 100 % => (0,25*0,333+0,2*1)/(0,45) = 0,6296
  assert.equal(calcPreliminaryWeeklyScore(logs, S), 63);
  // Bara "inte gjort"/"flyttat" => styrka utelämnas helt, ingen bestraffning
  const none = [
    log("2026-10-12", { strengthStatus: "skipped", proteinG: 135 }),
    log("2026-10-13", { strengthStatus: "moved", strengthMovedTo: "2026-10-15", proteinG: 135 }),
  ];
  assert.equal(calcPreliminaryWeeklyScore(none, S), 100);
});

test("måldagar för flytt: hoppar över styrkedagar och redan bokade dagar", () => {
  // från mån 12 okt: tis 13, ons 14 (styrka), tors 15, fre 16, lör 17 (styrka), sön 18, mån 19 (styrka)
  assert.deepEqual(getMoveTargetCandidates("2026-10-12", S), ["2026-10-13", "2026-10-15", "2026-10-16", "2026-10-18"]);
  assert.deepEqual(
    getMoveTargetCandidates("2026-10-12", S, new Set(["2026-10-15"])),
    ["2026-10-13", "2026-10-16", "2026-10-18"]
  );
});
