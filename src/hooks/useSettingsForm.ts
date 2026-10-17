import { useCallback, useEffect, useRef, useState } from "react";
import { formToSettings, settingsToForm, type SettingsForm } from "../services/settingsForm";
import type { AppSettings } from "../types/program";

export type SettingsSaveState = "idle" | "saving" | "saved" | "error";

const SAVED_FEEDBACK_MS = 2500;

/** Formulärlogik för Inställningar. Skärmen håller bara layout. */
export function useSettingsForm(settings: AppSettings, save: (next: AppSettings) => Promise<void>) {
  const [form, setForm] = useState<SettingsForm>(() => settingsToForm(settings));
  const [state, setState] = useState<SettingsSaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Håll formuläret i takt om inställningarna ändras utifrån.
  useEffect(() => {
    setForm(settingsToForm(settings));
  }, [settings]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  const clearFeedback = () => setState((prev) => (prev === "saved" || prev === "error" ? "idle" : prev));

  const update = useCallback(<K extends keyof SettingsForm>(key: K, value: SettingsForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    clearFeedback();
  }, []);

  const toggleStrengthDay = useCallback((day: number) => {
    setForm((prev) => ({
      ...prev,
      strengthDays: prev.strengthDays.includes(day)
        ? prev.strengthDays.filter((d) => d !== day)
        : [...prev.strengthDays, day].sort((a, b) => a - b),
    }));
    clearFeedback();
  }, []);

  const submit = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    const result = formToSettings(form, settings);
    if (!result.ok) {
      setError(result.error);
      setState("error");
      return;
    }
    setState("saving");
    setError(null);
    try {
      await save(result.settings);
      setState("saved");
      timer.current = setTimeout(() => setState("idle"), SAVED_FEEDBACK_MS);
    } catch (e) {
      if (import.meta.env.DEV) console.warn("[Settings] kunde inte spara", e);
      setError(null);
      setState("error");
    }
  }, [form, settings, save]);

  return { form, update, toggleStrengthDay, submit, state, error };
}
