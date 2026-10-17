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
  onOpenSettings: () => void;
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

export function AppHeader({
  title,
  subtitle,
  dateLabel,
  date,
  isToday,
  onPrevDay,
  onNextDay,
  onGoToToday,
  onPickDate,
  onOpenSettings,
}: Props) {
  return (
    <header className="app-header">
      <div className="title-row">
        <h1 className="app-title">{title}</h1>
        <button type="button" className="icon-button" onClick={onOpenSettings} aria-label="Inställningar">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="3.2" />
            <path d="M19.4 14.5a1.6 1.6 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.6 1.6 0 00-1.8-.3 1.6 1.6 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.6 1.6 0 00-1-1.5 1.6 1.6 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.6 1.6 0 00.3-1.8 1.6 1.6 0 00-1.5-1H3a2 2 0 110-4h.1a1.6 1.6 0 001.5-1 1.6 1.6 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.6 1.6 0 001.8.3h0a1.6 1.6 0 001-1.5V3a2 2 0 114 0v.1a1.6 1.6 0 001 1.5h0a1.6 1.6 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.6 1.6 0 00-.3 1.8v0a1.6 1.6 0 001.5 1H21a2 2 0 110 4h-.1a1.6 1.6 0 00-1.5 1z" />
          </svg>
        </button>
      </div>
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
