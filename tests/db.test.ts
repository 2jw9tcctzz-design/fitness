import "fake-indexeddb/auto";
import { test } from "node:test";
import assert from "node:assert/strict";
import { getDatabase } from "../src/db/database";
import { LATEST_SCHEMA_VERSION } from "../src/db/migrations";
import {
  deleteDailyLog,
  getDailyLog,
  getDailyLogsBetween,
  getLogMovedTo,
  getMoveTargetsTaken,
  upsertDailyLog,
} from "../src/db/repositories/dailyLogRepository";
import { getWeekSummary } from "../src/services/weeklyScoreService";
import { DEFAULT_PROGRAM_SETTINGS } from "../src/config/programDefaults";
import type { DailyLogInput } from "../src/types/dailyLog";

const base = (date: string, extra: Partial<DailyLogInput> = {}): DailyLogInput => ({ date, ...extra });

test("databasen öppnas med senaste schemaversion och delas mellan anrop", async () => {
  const db = await getDatabase();
  assert.equal(db.version, LATEST_SCHEMA_VERSION);
  assert.equal(await getDatabase(), db);
});

test("saknad dag ger null, inte krasch", async () => {
  assert.equal(await getDailyLog("2026-01-01"), null);
});

test("partiell logg: ett enda fält sparas, resten är null (inte 0)", async () => {
  const saved = await upsertDailyLog(base("2026-10-12", { weightKg: 71.5 }));
  assert.equal(saved.weightKg, 71.5);
  assert.equal(saved.proteinG, null);
  assert.equal(saved.strengthStatus, null);
  assert.equal(saved.walkMinutes, null);
  assert.deepEqual(await getDailyLog("2026-10-12"), saved);
});

test("upsert uppdaterar samma datum utan att duplicera, behåller id och createdAt", async () => {
  const first = await upsertDailyLog(base("2026-10-13", { proteinG: 100 }));
  await new Promise((r) => setTimeout(r, 5));
  const second = await upsertDailyLog(base("2026-10-13", { proteinG: 140, energy: 4 }));
  assert.equal(second.id, first.id);
  assert.equal(second.createdAt, first.createdAt);
  assert.notEqual(second.updatedAt, first.updatedAt);
  assert.equal(second.proteinG, 140);
  const all = await getDailyLogsBetween("2026-10-13", "2026-10-13");
  assert.equal(all.length, 1);
});

test("0 minuter skiljs från inte registrerat", async () => {
  const a = await upsertDailyLog(base("2026-10-14", { walkMinutes: 0 }));
  assert.equal(a.walkMinutes, 0);
  const b = await upsertDailyLog(base("2026-10-14", {}));
  assert.equal(b.walkMinutes, null);
});

test("styrkestatus: gjort, inte gjort och flyttat sparas och läses tillbaka", async () => {
  const done = await upsertDailyLog(base("2026-11-02", { strengthStatus: "done" }));
  assert.equal(done.strengthStatus, "done");
  assert.equal(done.strengthMovedTo, null);
  const skipped = await upsertDailyLog(base("2026-11-02", { strengthStatus: "skipped" }));
  assert.equal(skipped.strengthStatus, "skipped");
  const moved = await upsertDailyLog(base("2026-11-02", { strengthStatus: "moved", strengthMovedTo: "2026-11-03" }));
  assert.equal(moved.strengthStatus, "moved");
  assert.equal(moved.strengthMovedTo, "2026-11-03");
  // Ändras status bort från "moved" rensas måldatumet
  const back = await upsertDailyLog(base("2026-11-02", { strengthStatus: "done", strengthMovedTo: "2026-11-03" }));
  assert.equal(back.strengthMovedTo, null);
});

test("flyttat pass hittas på måldagen och försvinner när det ändras", async () => {
  assert.equal(await getLogMovedTo("2026-11-10"), null);
  await upsertDailyLog(base("2026-11-09", { strengthStatus: "moved", strengthMovedTo: "2026-11-10" }));
  const incoming = await getLogMovedTo("2026-11-10");
  assert.equal(incoming?.date, "2026-11-09");
  assert.deepEqual([...(await getMoveTargetsTaken("2026-11-09", "2026-11-15"))], ["2026-11-10"]);
  assert.equal((await getMoveTargetsTaken("2026-11-11", "2026-11-15")).size, 0);

  await upsertDailyLog(base("2026-11-09", { strengthStatus: "done" }));
  assert.equal(await getLogMovedTo("2026-11-10"), null);
  assert.equal((await getMoveTargetsTaken("2026-11-09", "2026-11-15")).size, 0);
});

test("getDailyLogsBetween är inklusivt och sorterat; delete tar bort", async () => {
  await upsertDailyLog(base("2026-10-20", { proteinG: 1 }));
  await upsertDailyLog(base("2026-10-22", { proteinG: 2 }));
  await upsertDailyLog(base("2026-10-21", { proteinG: 3 }));
  const logs = await getDailyLogsBetween("2026-10-20", "2026-10-22");
  assert.deepEqual(logs.map((l) => l.date), ["2026-10-20", "2026-10-21", "2026-10-22"]);
  await deleteDailyLog("2026-10-21");
  assert.equal(await getDailyLog("2026-10-21"), null);
  assert.equal((await getDailyLogsBetween("2026-10-20", "2026-10-22")).length, 2);
});

test("veckosammanfattning läser från databasen", async () => {
  const S = { ...DEFAULT_PROGRAM_SETTINGS, programStartDate: "2026-10-12" };
  await upsertDailyLog(base("2026-10-12", { strengthStatus: "done", walkMinutes: 40, proteinG: 135 }));
  await upsertDailyLog(base("2026-10-15", { walkMinutes: 30, proteinG: 135 }));
  const w = await getWeekSummary("2026-10-16", S);
  assert.equal(w.weekStart, "2026-10-12");
  assert.equal(w.weekEnd, "2026-10-18");
  assert.equal(w.strengthCount, 1);
  assert.equal(w.strengthTarget, 3);
  assert.equal(w.walkGoalDays, 2);
  assert.ok(w.score !== null && w.score > 0 && w.score <= 100);
});
