import { useCallback, useState } from "react";
import { exportBackup, replaceAllData } from "../db/repositories/backupRepository";
import { backupFileName, parseBackupText, type BackupFile } from "../services/backupService";

export type BackupMessage = { kind: "ok" | "error"; text: string };

/** Hämtar en JSON-fil till användaren. På iPhone öppnas delningsbladet ("Spara i Filer") när det finns. */
async function deliverFile(name: string, json: string): Promise<void> {
  const file = new File([json], name, { type: "application/json" });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare?.({ files: [file] }) && nav.share) {
    try {
      await nav.share({ files: [file], title: "Daily Coach-backup" });
      return;
    } catch (e) {
      if ((e as Error).name === "AbortError") return; // användaren stängde bladet
      // annars: försök med vanlig nedladdning
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function useBackup() {
  const [message, setMessage] = useState<BackupMessage | null>(null);
  const [pending, setPending] = useState<BackupFile | null>(null);
  const [busy, setBusy] = useState(false);

  const exportData = useCallback(async () => {
    setMessage(null);
    try {
      const backup = await exportBackup();
      await deliverFile(backupFileName(), JSON.stringify(backup, null, 2));
      setMessage({ kind: "ok", text: "Backupen är skapad." });
    } catch {
      setMessage({ kind: "error", text: "Det gick inte att skapa backupen. Försök igen." });
    }
  }, []);

  /** Läser och kontrollerar filen. Inget ersätts förrän användaren bekräftat. */
  const chooseFile = useCallback(async (file: File) => {
    setMessage(null);
    let text: string;
    try {
      text = await file.text();
    } catch {
      setMessage({ kind: "error", text: "Filen kunde inte läsas. Inget har ändrats." });
      return;
    }
    const result = parseBackupText(text);
    if (!result.ok) {
      setMessage({ kind: "error", text: result.error });
      return;
    }
    setPending(result.backup);
  }, []);

  const cancelImport = useCallback(() => setPending(null), []);

  const confirmImport = useCallback(async () => {
    if (!pending) return;
    setBusy(true);
    try {
      await replaceAllData(pending.data);
      setPending(null);
      setMessage({ kind: "ok", text: "Backupen är återställd." });
      // Läs om appen så att alla skärmar utgår från den återställda datan.
      setTimeout(() => window.location.reload(), 700);
    } catch {
      setPending(null);
      setMessage({ kind: "error", text: "Återställningen misslyckades. Din befintliga data är orörd." });
    } finally {
      setBusy(false);
    }
  }, [pending]);

  return { message, pending, busy, exportData, chooseFile, cancelImport, confirmImport };
}
