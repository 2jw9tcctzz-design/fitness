type Props = {
  label: string;
  /** Aktuellt värde, t.ex. "98 g". Utelämnas när data saknas. */
  detail?: string;
  done: boolean;
};

/** Saknade värden visas neutralt (tom cirkel), aldrig rött. */
export function FocusItem({ label, detail, done }: Props) {
  return (
    <li className="focus-item" aria-label={`${label}${detail ? `, ${detail}` : ""}${done ? ", uppnått" : ""}`}>
      <span className={`focus-mark ${done ? "is-done" : ""}`} aria-hidden="true">
        {done ? (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        ) : null}
      </span>
      <span className="focus-label">{label}</span>
      {detail ? <span className="focus-detail">{detail}</span> : null}
    </li>
  );
}
