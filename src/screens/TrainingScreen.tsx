import { useState } from "react";
import { AppHeader } from "../components/AppHeader";
import { SectionCard } from "../components/SectionCard";
import { ViewToggle, type MatView } from "../components/meal/ViewToggle";
import { ExerciseCard } from "../components/training/ExerciseCard";
import { PreviewRow } from "../components/training/PreviewRow";
import { AddExerciseSheet, MoveSheet, OtherActivitySheet, SubstitutionSheet } from "../components/training/TrainingSheets";
import { getTemplate } from "../config/trainingProgram";
import { useTrainingDay } from "../hooks/useTrainingDay";
import { useTrainingWeek } from "../hooks/useTrainingWeek";
import { formatRir } from "../services/programBlockService";
import { useSettings } from "../settings/SettingsContext";
import { useAppState } from "../state/AppStateContext";
import { addDays, formatDateLong, formatDateShort, todayString } from "../utils/dates";
import { parseNumber } from "../services/checkInForm";

type Props = { onOpenSettings: () => void };

const OPTIONS: { id: MatView; label: string }[] = [
  { id: "day", label: "Dagens pass" },
  { id: "week", label: "Veckans plan" },
];

export function TrainingScreen({ onOpenSettings }: Props) {
  const { settings } = useSettings();
  const { date, setDate } = useAppState();
  const [view, setView] = useState<MatView>("day");
  const program = settings.program;
  const t = useTrainingDay(date, program);
  const w = useTrainingWeek(date, program);

  const strengthText = w.summary ? `${w.summary.strengthCount}/${w.summary.strengthTarget}` : "–";
  const subtitle = `Vecka ${t.week} av ${program.durationWeeks} · ${t.block.group}`;

  return (
    <div className="screen">
      <AppHeader
        title="Träning"
        subtitle={subtitle}
        dateLabel={formatDateLong(date)}
        date={date}
        isToday={date === todayString()}
        onPrevDay={() => setDate(addDays(date, -1))}
        onNextDay={() => setDate(addDays(date, 1))}
        onGoToToday={() => setDate(todayString())}
        onPickDate={setDate}
        onOpenSettings={onOpenSettings}
      />
      <p className="week-line">
        Denna vecka: <strong>{strengthText}</strong> styrkepass
      </p>
      <ViewToggle value={view} onChange={setView} options={OPTIONS} />
      {t.error ? <p className="notice">{t.error}</p> : null}

      {view === "week" ? (
        <WeekPlan
          days={w.days}
          today={todayString()}
          onOpen={(d) => {
            setDate(d);
            setView("day");
          }}
        />
      ) : (
        <DayView t={t} date={date} program={program} />
      )}
    </div>
  );
}

function WeekPlan({ days, today, onOpen }: { days: ReturnType<typeof useTrainingWeek>["days"]; today: string; onOpen: (d: string) => void }) {
  const labelFor = (d: (typeof days)[number]) => (d.kind === "strength" ? `Pass ${d.templateCode ?? ""}`.trim() : "Mobility + promenad");
  const markFor = (d: (typeof days)[number]) => {
    switch (d.status) {
      case "completed":
        return "✓";
      case "skipped":
        return "Inte gjort";
      case "moved":
        return d.movedTo ? `→ ${formatDateShort(d.movedTo)}` : "Flyttat";
      case "started":
        return "Pågår";
      default:
        return d.kind === "mobility" && d.mobilityMinutes != null ? `${d.mobilityMinutes} min` : "";
    }
  };
  return (
    <SectionCard title="Veckans plan">
      <ul className="week-plan">
        {days.map((d) => (
          <li key={d.date}>
            <button
              type="button"
              className={`week-plan-row ${d.kind === "strength" ? "is-strength" : ""} ${d.date === today ? "is-today" : ""}`}
              onClick={() => onOpen(d.date)}
              aria-label={`${formatDateLong(d.date)}: ${labelFor(d)} ${markFor(d)}`}
            >
              <span className="week-plan-day">{formatDateShort(d.date).split(" ")[0]}</span>
              <span className="week-plan-name">
                {d.date === today ? <span className="today-tag">Idag</span> : null}
                {labelFor(d)}
                {d.receivedFrom ? <span className="week-plan-sub"> (flyttat hit)</span> : null}
              </span>
              <span className={`week-plan-mark ${d.status === "completed" ? "is-done" : ""}`}>{markFor(d)}</span>
            </button>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

function DayView({ t, date, program }: { t: ReturnType<typeof useTrainingDay>; date: string; program: import("../types/program").ProgramSettings }) {
  const d = t.detail;
  const [sheet, setSheet] = useState<null | "move" | "add" | "other" | { swap: string }>(null);
  const [confirmComplete, setConfirmComplete] = useState(false);
  if (!d || d.date !== date) return t.loading ? <p className="notice">Läser träningen…</p> : null;

  const template = d.templateCode ? getTemplate(d.templateCode) : null;
  const otherSheetNode = (
    <>
      <div className="other-actions">
        <button type="button" className="link-button wide-link" onClick={() => setSheet("other")}>
          Logga annan träning
        </button>
      </div>
      {t.activities.length > 0 ? (
        <SectionCard title="Annan träning">
          <ul className="activity-list">
            {t.activities.map((a) => (
              <li key={a.id}>
                <span>
                  <strong>{a.activityName}</strong>
                  {a.durationMinutes != null ? ` · ${a.durationMinutes} min` : ""}
                  {a.note ? <span className="activity-note"> · {a.note}</span> : null}
                </span>
                <button type="button" className="link-button" onClick={() => void t.removeOtherActivity(a.id)} aria-label={`Ta bort ${a.activityName}`}>
                  Ta bort
                </button>
              </li>
            ))}
          </ul>
        </SectionCard>
      ) : null}
    </>
  );

  const walk = (
    <p className="walk-line">
      Promenad: <strong>{d.walkMinutes != null ? d.walkMinutes : "–"}</strong> / {program.walkTargetMin} min
      <span className="walk-sub"> · fylls i på Idag</span>
    </p>
  );

  const sheets = (
    <>
      {sheet === "move" ? (
        <MoveSheet
          candidates={t.candidates}
          onClose={() => setSheet(null)}
          onPick={(target) => {
            setSheet(null);
            void t.move(target);
          }}
        />
      ) : null}
      {sheet === "add" ? (
        <AddExerciseSheet
          suggestions={t.knownNames}
          onClose={() => setSheet(null)}
          onAdd={(name, sets) => {
            setSheet(null);
            void t.addManualExercise(name, sets);
          }}
        />
      ) : null}
      {sheet === "other" ? (
        <OtherActivitySheet
          onClose={() => setSheet(null)}
          onSave={(input) => {
            setSheet(null);
            void t.logOtherActivity(input);
          }}
        />
      ) : null}
      {typeof sheet === "object" && sheet && "swap" in sheet
        ? (() => {
            const ex = t.exercises.find((e) => e.log.id === sheet.swap);
            if (!ex?.template) return null;
            return (
              <SubstitutionSheet
                current={ex.log.exerciseName}
                options={ex.template.substitutions ?? [ex.template.name]}
                onClose={() => setSheet(null)}
                onPick={(name) => {
                  setSheet(null);
                  void t.changeExercise(ex.log.id, name);
                }}
              />
            );
          })()
        : null}
    </>
  );

  // ---------- Mobility-dag ----------
  if (d.kind === "mobility") {
    return (
      <>
        <MobilityCard minutes={d.mobilityMinutes} target={program.mobilityTargetMin} onSave={t.saveMobility} />
        <SectionCard>{walk}</SectionCard>
        {otherSheetNode}
        {sheets}
      </>
    );
  }

  // ---------- Styrkedag ----------
  const status = d.status;
  const started = status === "started";
  const completed = status === "completed";
  const showExercises = !!d.session && t.exercises.length > 0 && (started || completed);
  const rirMain = t.block.main;
  const heading = template ? `Pass ${template.code} · ${template.name}` : "Styrkepass";
  const legacyNote = d.legacy ? "Registrerat före Träning fanns." : null;

  return (
    <>
      <SectionCard title={heading} subtitle={`${t.block.name} · vecka ${t.week} av ${program.durationWeeks}`}>
        <div className="status-line">
          {completed ? <span className="status-pill is-done">✓ Genomfört</span> : null}
          {started ? <span className="status-pill">Pågår</span> : null}
          {status === "skipped" ? <span className="status-pill">Inte gjort</span> : null}
          {status === "moved" ? <span className="status-pill">{d.movedTo ? `Flyttat till ${formatDateShort(d.movedTo)}` : "Flyttat"}</span> : null}
          {status === "none" && d.receivedFrom ? <span className="status-pill">Flyttat hit från {formatDateShort(d.receivedFrom)}</span> : null}
          {started && d.receivedFrom ? <span className="status-note">Flyttat hit från {formatDateShort(d.receivedFrom)}</span> : null}
          {completed && d.session && d.session.plannedDate !== date ? (
            <span className="status-note">Planerat {formatDateShort(d.session.plannedDate)}</span>
          ) : null}
          {legacyNote ? <span className="status-note">{legacyNote}</span> : null}
        </div>

        <p className="block-note">{t.block.note}</p>
        <p className="rir-note">
          Intensitet: {formatRir(rirMain.rirMin, rirMain.rirMax)}. Du behöver inte logga RIR.
        </p>

        {!started && !completed ? (
          <div className="action-stack">
            <button type="button" className="save-button" onClick={() => void t.start()}>
              {status === "none" ? "Starta pass" : "Starta pass ändå"}
            </button>
            {status === "none" ? (
              <div className="split-actions">
                <button type="button" className="secondary-button" onClick={() => setSheet("move")}>
                  Flytta
                </button>
                <button type="button" className="secondary-button" onClick={() => void t.skip()}>
                  Inte gjort
                </button>
              </div>
            ) : null}
            {(status === "skipped" || status === "moved") && !d.legacy ? (
              <button type="button" className="secondary-button" onClick={() => void t.undo()}>
                {status === "skipped" ? "Ångra" : "Ångra flytt"}
              </button>
            ) : null}
          </div>
        ) : null}
      </SectionCard>

      {status === "none" && t.preview.length > 0 ? (
        <SectionCard title="Dagens övningar">
          <ul className="preview-list">
            {t.preview.map((p) => (
              <PreviewRow key={p.template.id} item={p} />
            ))}
          </ul>
        </SectionCard>
      ) : null}

      {showExercises ? (
        <>
          {t.exercises.map((ex) => (
            <ExerciseCard
              key={ex.log.id}
              view={ex}
              isDeload={!!t.block.isDeload}
              onUpdateSet={t.updateSet}
              onAddSet={() => void t.addSet(ex.log.id)}
              onRemoveSet={(id) => void t.removeSet(id)}
              onApplyPrevious={() => void t.applyPreviousResult(ex.log.id)}
              onChangeExercise={() => setSheet({ swap: ex.log.id })}
              onNote={(n) => void t.setExerciseNote(ex.log.id, n)}
              onRemoveExercise={() => void t.removeExercise(ex.log.id)}
            />
          ))}
          <button type="button" className="secondary-button" onClick={() => setSheet("add")}>
            + Lägg till övning
          </button>

          {started ? (
            <div className="action-stack">
              <button type="button" className="save-button" onClick={() => setConfirmComplete(true)}>
                Slutför pass
              </button>
              <div className="split-actions">
                <button type="button" className="secondary-button" onClick={() => setSheet("move")}>
                  Flytta
                </button>
                <button type="button" className="secondary-button" onClick={() => void t.skip()}>
                  Inte gjort
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className="secondary-button" onClick={() => void t.reopen()}>
              Öppna igen
            </button>
          )}
        </>
      ) : null}

      {confirmComplete ? (
        <CompleteSheet
          onCancel={() => setConfirmComplete(false)}
          onConfirm={() => {
            setConfirmComplete(false);
            void t.complete();
          }}
          openSets={t.exercises.reduce((n, e) => n + e.sets.filter((s) => !s.completed).length, 0)}
        />
      ) : null}

      <SectionCard>{walk}</SectionCard>
      {otherSheetNode}
      {sheets}
    </>
  );
}

function CompleteSheet({ onConfirm, onCancel, openSets }: { onConfirm: () => void; onCancel: () => void; openSets: number }) {
  return (
    <div className="sheet-backdrop is-center" onClick={onCancel}>
      <div className="dialog" role="alertdialog" aria-modal="true" aria-label="Slutför passet" onClick={(e) => e.stopPropagation()}>
        <h2 className="sheet-title">Slutföra passet?</h2>
        <div className="dialog-body">
          {openSets > 0 ? <p>{openSets} set är inte markerade som klara. Det går bra, de räknas bara inte som gjorda.</p> : <p>Alla set är markerade som klara.</p>}
        </div>
        <div className="dialog-actions">
          <button type="button" className="secondary-button" onClick={onCancel}>
            Tillbaka
          </button>
          <button type="button" className="save-button dialog-confirm" onClick={onConfirm}>
            Slutför
          </button>
        </div>
      </div>
    </div>
  );
}

function MobilityCard({ minutes, target, onSave }: { minutes: number | null; target: number; onSave: (m: number | null) => void }) {
  const [text, setText] = useState(minutes == null ? "" : String(minutes));
  const [prev, setPrev] = useState(minutes);
  if (prev !== minutes) {
    setPrev(minutes);
    setText(minutes == null ? "" : String(minutes));
  }
  const done = minutes != null && minutes >= target;
  const save = () => {
    const n = parseNumber(text, false);
    if (n === "invalid" || (n !== null && n > 1440)) return;
    if (n !== minutes) onSave(n);
  };
  return (
    <SectionCard title="Mobility" subtitle={`Mål: ${target}–${target + 5} min`}>
      <div className="mobility-row">
        <div className="set-field">
          <input
            className="set-input"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            maxLength={4}
            placeholder="–"
            value={text}
            aria-label="Mobility minuter"
            onFocus={(e) => e.currentTarget.select()}
            onChange={(e) => setText(e.target.value)}
            onBlur={save}
          />
          <span className="set-unit">min</span>
        </div>
        <button
          type="button"
          className={`secondary-button ${done ? "is-done" : ""}`}
          onClick={() => {
            setText(String(done ? minutes : target));
            onSave(done ? minutes : target);
          }}
        >
          {done ? "✓ Klart" : `Klart (${target} min)`}
        </button>
      </div>
      {done ? <p className="status-note">Klart</p> : null}
    </SectionCard>
  );
}
