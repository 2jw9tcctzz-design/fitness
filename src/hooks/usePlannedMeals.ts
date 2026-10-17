import { useCallback, useEffect, useRef, useState } from "react";
import { getPlannedMealsBetween, setMealEaten, setPlannedMeal } from "../db/repositories/plannedMealRepository";
import { getAllRecipes } from "../db/repositories/recipeRepository";
import { useAppState } from "../state/AppStateContext";
import type { MealType, PlannedMeal, Recipe } from "../types/meal";

/**
 * Planerade måltider (och recepten de pekar på) för ett datumintervall. Alla ändringar går via
 * repositoryt och meddelar resten av appen, så Idag uppdateras direkt.
 */
export function usePlannedMeals(start: string, end: string) {
  const { mealRevision, notifyMealsChanged } = useAppState();
  const [meals, setMeals] = useState<PlannedMeal[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    const id = ++requestId.current;
    (async () => {
      try {
        const [m, r] = await Promise.all([getPlannedMealsBetween(start, end), getAllRecipes()]);
        if (id !== requestId.current) return; // ett nyare anrop gäller
        setMeals(m);
        setRecipes(r);
        setError((prev) => (prev === LOAD_ERROR ? null : prev));
      } catch {
        if (id === requestId.current) setError(LOAD_ERROR);
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    })();
  }, [start, end, mealRevision]);

  const run = useCallback(
    async (action: () => Promise<unknown>) => {
      try {
        await action();
        setError(null);
        notifyMealsChanged();
      } catch {
        setError(SAVE_ERROR);
      }
    },
    [notifyMealsChanged]
  );

  const assign = useCallback(
    (date: string, mealType: MealType, recipeId: string) => run(() => setPlannedMeal(date, mealType, recipeId)),
    [run]
  );
  const setEaten = useCallback(
    (date: string, mealType: MealType, eaten: boolean) => run(() => setMealEaten(date, mealType, eaten)),
    [run]
  );

  return { meals, recipes, loading, error, assign, setEaten };
}

const LOAD_ERROR = "Det gick inte att läsa måltiderna.";
const SAVE_ERROR = "Det gick inte att spara just nu. Försök igen om en stund.";
