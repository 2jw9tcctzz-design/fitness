type Props = {
  title: string;
  subtitle: string;
  /** Valt datum i klartext, t.ex. "fredag 16 oktober". */
  dateLabel: string;
  /** Valt datum som YYYY-MM-DD (styr den inbyggda datumväljaren). */
  date: string;
  isToday: boolean;
  onPrevDay: () => void;
  onNextDay: () => void;
  onGoToToday: () => void;
  onPickDate: (date: string) => void;
};

/** "måndag 12 oktober" -> "Måndag 12 oktober" (bara första bokstaven). */
function capitalizeFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={dir === "left" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
    </svg>
  );
}

export function AppHeader({ title, subtitle, dateLabel, date, isToday, onPrevDay, onNextDay, onGoToToday, onPickDate }: Props) {
  return (
    <header className="app-header">
      <h1 className="app-title">{title}</h1>
      <p className="app-subtitle">{subtitle}</p>

      <div className="date-row">
        <button type="button" className="icon-button" onClick={onPrevDay} aria-label="Föregående dag">
          <Chevron dir="left" />
        </button>

        <div className="date-center">
          {/* Datumväljaren ligger osynligt ovanpå texten så att ett tryck öppnar iOS egen kalender. */}
          <label className="date-label">
            <span aria-live="polite">{isToday ? `Idag · ${dateLabel}` : capitalizeFirst(dateLabel)}</span>
            <input
              type="date"
              className="date-input"
              value={date}
              aria-label="Välj datum"
              onChange={(e) => e.target.value && onPickDate(e.target.value)}
            />
          </label>
          {!isToday ? (
            <button type="button" className="link-button" onClick={onGoToToday} aria-label="Gå till idag">
              Till idag
            </button>
          ) : null}
        </div>

        <button type="button" className="icon-button" onClick={onNextDay} aria-label="Nästa dag">
          <Chevron dir="right" />
        </button>
      </div>
    </header>
  );
}
