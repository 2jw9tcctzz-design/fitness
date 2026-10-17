import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { todayString } from "../utils/dates";

type AppState = {
  /** Valt datum, delat mellan Idag och Mat. */
  date: string;
  setDate: (date: string) => void;
  /** Ökar varje gång måltidsdata ändras, så att Idag (som hålls monterad) läser om. */
  mealRevision: number;
  notifyMealsChanged: () => void;
};

const Ctx = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [date, setDate] = useState<string>(() => todayString());
  const [mealRevision, setRevision] = useState(0);
  const notifyMealsChanged = useCallback(() => setRevision((r) => r + 1), []);
  const value = useMemo(() => ({ date, setDate, mealRevision, notifyMealsChanged }), [date, mealRevision, notifyMealsChanged]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppState(): AppState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAppState måste användas inom AppStateProvider");
  return ctx;
}
