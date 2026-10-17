import { useEffect, useState } from "react";
import { getDailyLog } from "../db/repositories/dailyLogRepository";
import { getPlannedMealsForDate } from "../db/repositories/plannedMealRepository";
import { getAllRecipes } from "../db/repositories/recipeRepository";
import { resolveDayNutrition, type DayNutrition } from "../services/nutritionService";
import { useAppState } from "../state/AppStateContext";

const NONE: DayNutrition = {
  source: "none",
  values: { calories: null, proteinG: null, carbsG: null, fatG: null, fiberG: null },
  registered: false,
  plannedCount: 0,
  eatenCount: 0,
};

/** Dagens konsumerade näringsvärden för Idag: summan av ätna måltider (eller äldre manuell data). */
export function useDayNutrition(date: string): DayNutrition {
  const { mealRevision } = useAppState();
  const [value, setValue] = useState<DayNutrition>(NONE);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [meals, recipes, log] = await Promise.all([getPlannedMealsForDate(date), getAllRecipes(), getDailyLog(date)]);
        if (!cancelled) setValue(resolveDayNutrition(meals, recipes, log));
      } catch {
        if (!cancelled) setValue(NONE);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [date, mealRevision]);

  return value;
}
