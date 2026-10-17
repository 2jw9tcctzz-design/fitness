import { useRef } from "react";
import { useBackup } from "../hooks/useBackup";
import { formatDateWithYear } from "../utils/dates";
import { ConfirmDialog } from "./ConfirmDialog";
import { SectionCard } from "./SectionCard";

export function BackupSection() {
  const b = useBackup();
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <SectionCard title="Backup" subtitle="All data finns bara på den här telefonen. Spara en backup ibland, till exempel i Filer.">
      <div className="backup-actions">
        <button type="button" className="secondary-button" onClick={() => void b.exportData()}>
          Exportera backup
        </button>
        <button type="button" className="secondary-button" onClick={() => fileRef.current?.click()}>
          Importera backup
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          className="visually-hidden"
          aria-label="Välj backupfil"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = ""; // så att samma fil kan väljas igen
            if (file) void b.chooseFile(file);
          }}
        />
      </div>
      <div className="feedback" aria-live="polite">
        {b.message ? <span className={b.message.kind === "ok" ? "feedback-saved" : "feedback-error"}>{b.message.text}</span> : null}
      </div>

      {b.pending ? (
        <ConfirmDialog
          title="Ersätta all data?"
          confirmLabel="Ersätt med backup"
          onConfirm={() => void b.confirmImport()}
          onCancel={b.cancelImport}
          busy={b.busy}
        >
          <p>
            Allt som finns i appen nu ersätts med innehållet i backupen
            {b.pending.exportedAt ? ` från ${formatDateWithYear(b.pending.exportedAt.slice(0, 10))}` : ""}:
          </p>
          <ul>
            <li>{b.pending.data.dailyLogs.length} dagar</li>
            <li>{b.pending.data.plannedMeals.length} planerade måltider</li>
            <li>{b.pending.data.recipes.length} recept</li>
          </ul>
          <p>Det går inte att ångra.</p>
        </ConfirmDialog>
      ) : null}
    </SectionCard>
  );
}
