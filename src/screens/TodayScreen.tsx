import { ActivityInput } from "../components/ActivityInput";
import { AppHeader } from "../components/AppHeader";
import { EnergySelector } from "../components/EnergySelector";
import { FocusCard } from "../components/FocusCard";
import { MeasurementsInput } from "../components/MeasurementsInput";
import { NutritionRows } from "../components/NutritionRows";
import { NoteField } from "../components/NoteField";
import { NumberInputRow } from "../components/NumberInputRow";
import { SaveButton } from "../components/SaveButton";
import { SectionCard } from "../components/SectionCard";
import { SummaryCard } from "../components/SummaryCard";
import { useDailyCheckIn } from "../hooks/useDailyCheckIn";
import { useSettings } from "../settings/SettingsContext";
import { formatDateLong } from "../utils/dates";
import { formatNumber } from "../utils/format";

type Props = { onOpenSettings: () => void; onOpenFood: () => void };

export function TodayScreen({ onOpenSettings, onOpenFood }: Props) {
  const { settings: appSettings } = useSettings();
  const t = useDailyCheckIn(appSettings);
  const { form, updateForm, week, settings, baseline } = t;

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
        onOpenSettings={onOpenSettings}
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

      <SectionCard title="Morgonens check-in">
        <NumberInputRow
          label="Vikt"
          unit="kg"
          decimal
          hint={baseline.startWeightKg != null ? `Start ${formatNumber(baseline.startWeightKg)} kg` : undefined}
          value={form.weightKg}
          onChange={(v) => updateForm("weightKg", v)}
        />
        <NumberInputRow
          label="Sömn"
          unit="h"
          decimal
          hint={`Mål ${formatNumber(settings.sleepTargetHours)} h`}
          value={form.sleepHours}
          onChange={(v) => updateForm("sleepHours", v)}
        />
        <MeasurementsInput
          values={{
            waistCm: form.waistCm,
            hipsCm: form.hipsCm,
            chestCm: form.chestCm,
            thighCm: form.thighCm,
            armCm: form.armCm,
          }}
          baseline={baseline.startMeasurements}
          onChange={(key, text) => updateForm(key, text)}
        />
      </SectionCard>

      <NutritionRows nutrition={t.dayNutrition} targets={settings} onOpenFood={onOpenFood} />

      <SectionCard title="Genomförd träning" subtitle="Fylls i här tills Träning är klar (Sprint 3).">
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
        <NumberInputRow
          label="Powerwalk"
          unit="min"
          hint={`Mål ${formatNumber(settings.walkTargetMin)} min`}
          value={form.walkMinutes}
          onChange={(v) => updateForm("walkMinutes", v)}
        />
      </SectionCard>

      <SectionCard title="Kvällens check-out">
        <NumberInputRow
          label="Steg"
          hint={`Mål ${formatNumber(settings.stepTarget)}`}
          value={form.steps}
          onChange={(v) => updateForm("steps", v)}
        />
        <EnergySelector value={form.energy} onChange={(v) => updateForm("energy", v)} />
        <div className="note-block">
          <div className="input-label">Anteckning</div>
          <NoteField value={form.note} onChange={(v) => updateForm("note", v)} />
        </div>
      </SectionCard>

      <SaveButton state={t.saveState} onPress={t.save} errorMessage={t.saveError} />
    </div>
  );
}
