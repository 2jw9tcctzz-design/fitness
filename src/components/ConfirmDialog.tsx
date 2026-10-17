import { useId, type ReactNode } from "react";

type Props = {
  title: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
  children: ReactNode;
};

export function ConfirmDialog({ title, confirmLabel, cancelLabel = "Avbryt", onConfirm, onCancel, busy, children }: Props) {
  const titleId = useId();
  return (
    <div className="sheet-backdrop is-center" onClick={busy ? undefined : onCancel}>
      <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby={titleId} onClick={(e) => e.stopPropagation()}>
        <h2 className="sheet-title" id={titleId}>
          {title}
        </h2>
        <div className="dialog-body">{children}</div>
        <div className="dialog-actions">
          <button type="button" className="secondary-button" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </button>
          <button type="button" className="save-button dialog-confirm" onClick={onConfirm} disabled={busy}>
            {busy ? "Återställer…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
