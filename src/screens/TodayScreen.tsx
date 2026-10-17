import { ActivityInput } from "../components/ActivityInput";
import { AppHeader } from "../components/AppHeader";
import { EnergySelector } from "../components/EnergySelector";
import { FocusCard } from "../components/FocusCard";
import { NoteField } from "../components/NoteField";
import { NumberInputRow } from "../components/NumberInputRow";
import { SaveButton } from "../components/SaveButton";
import { SectionCard } from "../components/SectionCard";
import { SummaryCard } from "../components/SummaryCard";
import { useDailyCheckIn } from "../hooks/useDailyCheckIn";
import { formatDateLong } from "../utils/dates";

export function TodayScreen() {
  const t = useDailyCheckIn();
  const { form, updateForm, week, settings } = t;

  const weekScore = week?.score != null ? String(week.score) : "—";
  const strengthText = week ? `${week.strengthCount}/${week.strengthTarget}` : "—";
  const walkText = week ? `${week.walkGoalDays}/7` : "—";

  return (
    <div className="screen">
      <AppHeader
        title={t.header.title}
        subtitle={t.header.subtitle}
        dateLabel={formatDateLong(t.date)}
        date={t.date}
        isToday={t.isToday}
        onPrevDay={t.goToPrevDay}
        onNextDay={t.goToNextDay}
        onGoToToday={t.goToToday}
        onPickDate={t.setDate}
      />

      <div className="summary-row">
        <SummaryCard label="Veckopoäng" value={weekScore} />
        <SummaryCard label="Träning" value={strengthText} />
        <SummaryCard label="Promenad" value={walkText} />
      </div>

      <FocusCard items={t.focusItems} />

      {t.loadError ? (
        <p className="notice">Det gick inte att läsa den sparade dagen. Du kan fortfarande fylla i och spara.</p>
      ) : null}

      <SectionCard title="Dagens check-in">
        <NumberInputRow label="Vikt" unit="kg" decimal value={form.weightKg} onChange={(v) => updateForm("weightKg", v)} />
        <NumberInputRow
          label="Kalorier"
          unit="kcal"
          value={form.calories}
          placeholder={String(settings.calorieTarget)}
          onChange={(v) => updateForm("calories", v)}
        />
        <NumberInputRow label="Protein" unit="g" value={form.proteinG} onChange={(v) => updateForm("proteinG", v)} />
        <NumberInputRow label="Fiber" unit="g" value={form.fiberG} onChange={(v) => updateForm("fiberG", v)} />
        <NumberInputRow label="Powerwalk" unit="min" value={form.walkMinutes} onChange={(v) => updateForm("walkMinutes", v)} />
        <NumberInputRow
          label="Steg"
          value={form.steps}
          placeholder={String(settings.stepTarget)}
          onChange={(v) => updateForm("steps", v)}
        />
        <NumberInputRow label="Sömn" unit="h" decimal value={form.sleepHours} onChange={(v) => updateForm("sleepHours", v)} />
        <EnergySelector value={form.energy} onChange={(v) => updateForm("energy", v)} />
        <ActivityInput
          activityType={t.activityType}
          strengthStatus={form.strengthStatus}
          strengthMovedTo={form.strengthMovedTo}
          moveCandidates={t.moveCandidates}
          movedInFrom={t.movedInFrom}
          onStrengthStatusChange={t.setStrengthStatus}
          onStrengthMovedToChange={t.setStrengthMovedTo}
          mobilityMinutes={form.mobilityMinutes}
          onMobilityChange={(v) => updateForm("mobilityMinutes", v)}
        />
      </SectionCard>

      <SectionCard title="Anteckning">
        <NoteField value={form.note} onChange={(v) => updateForm("note", v)} />
      </SectionCard>

      <SaveButton state={t.saveState} onPress={t.save} errorMessage={t.saveError} />
    </div>
  );
}
