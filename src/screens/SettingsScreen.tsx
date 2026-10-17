import { MEASUREMENT_FIELDS } from "../config/measurements";
import { DateInputRow } from "../components/DateInputRow";
import { NumberInputRow } from "../components/NumberInputRow";
import { BackupSection } from "../components/BackupSection";
import { SectionCard } from "../components/SectionCard";
import { useSettingsForm } from "../hooks/useSettingsForm";
import { useSettings } from "../settings/SettingsContext";

type Props = { onBack: () => void };

const WEEKDAYS: { day: number; label: string }[] = [
  { day: 1, label: "Mån" },
  { day: 2, label: "Tis" },
  { day: 3, label: "Ons" },
  { day: 4, label: "Tors" },
  { day: 5, label: "Fre" },
  { day: 6, label: "Lör" },
  { day: 7, label: "Sön" },
];

export function SettingsScreen({ onBack }: Props) {
  const { settings, save } = useSettings();
  const f = useSettingsForm(settings, save);
  const { form, update } = f;

  return (
    <div className="screen">
      <header className="app-header">
        <button type="button" className="back-button" onClick={onBack} aria-label="Tillbaka till Idag">
          ‹ Idag
        </button>
        <h1 className="app-title">Inställningar</h1>
      </header>

      <SectionCard title="Dagliga mål" subtitle="Visas som hjälptext i Idag och styr vad som räknas som uppnått.">
        <NumberInputRow label="Kalorier" unit="kcal" value={form.calorieTarget} onChange={(v) => update("calorieTarget", v)} />
        <NumberInputRow label="Protein" unit="g" value={form.proteinTargetG} onChange={(v) => update("proteinTargetG", v)} />
        <NumberInputRow label="Kolhydrater" unit="g" value={form.carbsTargetG} onChange={(v) => update("carbsTargetG", v)} />
        <NumberInputRow label="Fett" unit="g" value={form.fatTargetG} onChange={(v) => update("fatTargetG", v)} />
        <NumberInputRow label="Fiber" unit="g" value={form.fiberTargetG} onChange={(v) => update("fiberTargetG", v)} />
        <NumberInputRow label="Promenad" unit="min" value={form.walkTargetMin} onChange={(v) => update("walkTargetMin", v)} />
        <NumberInputRow label="Sömn" unit="h" decimal value={form.sleepTargetHours} onChange={(v) => update("sleepTargetHours", v)} />
        <NumberInputRow label="Steg" value={form.stepTarget} onChange={(v) => update("stepTarget", v)} />
        <NumberInputRow label="Mobility" unit="min" value={form.mobilityTargetMin} onChange={(v) => update("mobilityTargetMin", v)} />
      </SectionCard>

      <SectionCard title="Startvärden" subtitle="Valfritt. Visas som jämförelse när du loggar.">
        <NumberInputRow label="Startvikt" unit="kg" decimal value={form.startWeightKg} onChange={(v) => update("startWeightKg", v)} />
        {MEASUREMENT_FIELDS.map((m) => (
          <NumberInputRow
            key={m.key}
            label={m.label}
            unit="cm"
            decimal
            value={form[m.key]}
            onChange={(v) => update(m.key, v)}
          />
        ))}
      </SectionCard>

      <SectionCard title="Program">
        <DateInputRow
          label="Programstart"
          hint="Dag 1 i programmet"
          value={form.programStartDate}
          onChange={(v) => update("programStartDate", v)}
        />
        <div className="segment-block">
          <div className="input-label" id="strength-days-label">
            Styrkedagar
          </div>
          <div className="chips" role="group" aria-labelledby="strength-days-label">
            {WEEKDAYS.map((d) => {
              const selected = form.strengthDays.includes(d.day);
              return (
                <button
                  key={d.day}
                  type="button"
                  aria-pressed={selected}
                  className={`chip ${selected ? "is-selected" : ""}`}
                  onClick={() => f.toggleStrengthDay(d.day)}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
        </div>
      </SectionCard>

      <div className="save-wrap">
        <button
          type="button"
          className="save-button"
          onClick={f.submit}
          disabled={f.state === "saving"}
          aria-label="Spara inställningar"
        >
          {f.state === "saving" ? "Sparar…" : "Spara inställningar"}
        </button>
        <div className="feedback" aria-live="polite">
          {f.state === "saved" ? <span className="feedback-saved">Sparat</span> : null}
          {f.state === "error" ? (
            <span className="feedback-error">
              {f.error ?? "Det gick inte att spara just nu. Försök igen om en stund."}
            </span>
          ) : null}
        </div>
      </div>

      <BackupSection />
    </div>
  );
}
