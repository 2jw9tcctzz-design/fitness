import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_APP_SETTINGS } from "../src/config/programDefaults";
import { formToSettings, settingsToForm } from "../src/services/settingsForm";
import { mergeWithDefaults } from "../src/db/repositories/settingsRepository";
import { EMPTY_FORM, formToInput, logToForm } from "../src/services/checkInForm";
import { calcPreliminaryWeeklyScore } from "../src/services/weeklyScoreCalc";
import type { DailyLog } from "../src/types/dailyLog";

const D = DEFAULT_APP_SETTINGS;

test("inställningar: standardvärden går runt formuläret oförändrade", () => {
  const r = formToSettings(settingsToForm(D), D);
  assert.ok(r.ok);
  if (r.ok) assert.deepEqual(r.settings, D);
});

test("inställningar: ändrade mål, startvikt, startmått och programstart sparas som tal", () => {
  const form = {
    ...settingsToForm(D),
    calorieTarget: "2000",
    proteinTargetG: "150",
    sleepTargetHours: "7,5",
    startWeightKg: "72,4",
    waistCm: "80,5",
    programStartDate: "2026-11-02",
    strengthDays: [5, 1],
  };
  const r = formToSettings(form, D);
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.equal(r.settings.program.calorieTarget, 2000);
  assert.equal(r.settings.program.proteinTargetG, 150);
  assert.equal(r.settings.program.sleepTargetHours, 7.5);
  assert.equal(r.settings.program.programStartDate, "2026-11-02");
  assert.deepEqual(r.settings.program.strengthDays, [1, 5]); // sorterade
  assert.equal(r.settings.program.durationWeeks, 12); // orört
  assert.equal(r.settings.baseline.startWeightKg, 72.4);
  assert.equal(r.settings.baseline.startMeasurements.waistCm, 80.5);
  assert.equal(r.settings.baseline.startMeasurements.hipsCm, null); // tomt = inte angivet
});

test("inställningar: orimliga eller saknade värden avvisas", () => {
  const base = settingsToForm(D);
  const bad = (patch: Partial<typeof base>) => formToSettings({ ...base, ...patch }, D).ok;
  assert.equal(bad({ calorieTarget: "" }), false); // mål måste anges
  assert.equal(bad({ calorieTarget: "100" }), false);
  assert.equal(bad({ proteinTargetG: "abc" }), false);
  assert.equal(bad({ sleepTargetHours: "20" }), false);
  assert.equal(bad({ startWeightKg: "5" }), false);
  assert.equal(bad({ waistCm: "9000" }), false);
  assert.equal(bad({ programStartDate: "2026-02-31" }), false);
  assert.equal(bad({ strengthDays: [] }), false);
  assert.equal(bad({ startWeightKg: "" }), true); // startvikt är valfri
});

test("inställningar: sparad post utan nyare fält fylls på med standardvärden", () => {
  const merged = mergeWithDefaults({ program: { ...D.program, calorieTarget: 2100 } });
  assert.equal(merged.program.calorieTarget, 2100);
  assert.equal(merged.program.proteinTargetG, D.program.proteinTargetG);
  assert.equal(merged.baseline.startWeightKg, null);
  assert.deepEqual(mergeWithDefaults(undefined), D);
});

test("dagens mått: sparas som tal, tomt är null, kommatecken fungerar", () => {
  const r = formToInput("2026-10-12", { ...EMPTY_FORM, waistCm: "81,5", armCm: "30" });
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.equal(r.input.waistCm, 81.5);
  assert.equal(r.input.armCm, 30);
  assert.equal(r.input.hipsCm, null);
  assert.equal(formToInput("2026-10-12", { ...EMPTY_FORM, waistCm: "8" }).ok, false);

  const form = logToForm({ ...r.input, id: "x", createdAt: "", updatedAt: "" });
  assert.equal(form.waistCm, "81,5");
  assert.equal(form.hipsCm, "");
});

test("veckopoäng: en dag med bara mått räknas som loggad dag men sänker inget", () => {
  const log = (date: string, extra: Partial<DailyLog>): DailyLog => ({ id: date, date, createdAt: "", updatedAt: "", ...extra });
  const logs = [log("2026-10-12", { waistCm: 80 }), log("2026-10-13", { proteinG: 135 })];
  assert.equal(calcPreliminaryWeeklyScore(logs, D.program), 100);
});
