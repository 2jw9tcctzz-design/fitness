import { useEffect, useId, type ReactNode } from "react";

type Props = { title: string; onClose: () => void; children: ReactNode };

/** Enkel bottenpanel (modal) som används för receptval och receptdetalj. */
export function Sheet({ title, onClose, children }: Props) {
  const titleId = useId();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-header">
          <h2 className="sheet-title" id={titleId}>
            {title}
          </h2>
          <button type="button" className="link-button" onClick={onClose} aria-label="Stäng">
            Stäng
          </button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}
