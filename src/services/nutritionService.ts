import type { DailyLog } from "../types/dailyLog";
import { EMPTY_NUTRITION, type Nutrition, type PlannedMeal, type Recipe } from "../types/meal";
import type { ProgramSettings } from "../types/program";
import { addDays, diffInDays } from "../utils/dates";
import { formatNumber } from "../utils/format";

/** Rena beräkningar av näringsvärden. Ingen databas, inget UI. */

export function recipeNutrition(recipe: Recipe): Nutrition {
  return {
    calories: recipe.caloriesPerServing,
    proteinG: recipe.proteinGPerServing,
    carbsG: recipe.carbsGPerServing,
    fatG: recipe.fatGPerServing,
    fiberG: recipe.fiberGPerServing,
  };
}

export function sumNutrition(items: Nutrition[]): Nutrition {
  return items.reduce<Nutrition>(
    (acc, n) => ({
      calories: acc.calories + n.calories,
      proteinG: acc.proteinG + n.proteinG,
      carbsG: acc.carbsG + n.carbsG,
      fatG: acc.fatG + n.fatG,
      fiberG: acc.fiberG + n.fiberG,
    }),
    EMPTY_NUTRITION
  );
}

export type MealTotals = {
  planned: Nutrition;
  /** Bara måltider med status "eaten". */
  eaten: Nutrition;
  plannedCount: number;
  eatenCount: number;
};

/** Måltider vars recept saknas hoppas över (kan inte räknas). Varje måltid är en portion. */
export function computeMealTotals(meals: PlannedMeal[], recipes: Recipe[]): MealTotals {
  const byId = new Map(recipes.map((r) => [r.id, r]));
  const resolved = meals.flatMap((m) => {
    const recipe = byId.get(m.recipeId);
    return recipe ? [{ meal: m, nutrition: recipeNutrition(recipe) }] : [];
  });
  const eaten = resolved.filter((x) => x.meal.status === "eaten");
  return {
    planned: sumNutrition(resolved.map((x) => x.nutrition)),
    eaten: sumNutrition(eaten.map((x) => x.nutrition)),
    plannedCount: resolved.length,
    eatenCount: eaten.length,
  };
}

export type DayNutritionValues = {
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  fiberG: number | null;
};

export type DayNutrition = {
  /**
   * meals  = dagen har en måltidsplan; värdena är summan av ätna måltider.
   * manual = ingen måltidsplan men dagen har värden inmatade för hand (före Mat). Bevaras och visas.
   * none   = ingenting.
   */
  source: "meals" | "manual" | "none";
  values: DayNutritionValues;
  /** Finns det något registrerat? En plan där inget är ätet än är inte registrerat (null, inte 0). */
  registered: boolean;
  plannedCount: number;
  eatenCount: number;
};

const NO_VALUES: DayNutritionValues = { calories: null, proteinG: null, carbsG: null, fatG: null, fiberG: null };

export function resolveDayNutrition(meals: PlannedMeal[], recipes: Recipe[], log: DailyLog | null): DayNutrition {
  const totals = computeMealTotals(meals, recipes);
  if (totals.plannedCount > 0) {
    const e = totals.eaten;
    return {
      source: "meals",
      values: { calories: e.calories, proteinG: e.proteinG, carbsG: e.carbsG, fatG: e.fatG, fiberG: e.fiberG },
      registered: totals.eatenCount > 0,
      plannedCount: totals.plannedCount,
      eatenCount: totals.eatenCount,
    };
  }
  const manual = log && (log.calories != null || log.proteinG != null || log.fiberG != null);
  if (log && manual) {
    return {
      source: "manual",
      values: {
        calories: log.calories ?? null,
        proteinG: log.proteinG ?? null,
        carbsG: null,
        fatG: null,
        fiberG: log.fiberG ?? null,
      },
      registered: true,
      plannedCount: 0,
      eatenCount: 0,
    };
  }
  return { source: "none", values: NO_VALUES, registered: false, plannedCount: 0, eatenCount: 0 };
}

function blankLog(date: string): DailyLog {
  return { id: `meal-${date}`, date, createdAt: "", updatedAt: "" };
}

/**
 * Lägger måltidsdata över veckans dagloggar inför veckopoängen. Dagar med måltidsplan använder
 * ätna måltider i stället för det som matats in för hand. En plan där inget är ätet ger null.
 * Dagar utan plan lämnas orörda, så historisk manuell data räknas som förut.
 */
export function overlayMealNutrition(
  logs: DailyLog[],
  weekStart: string,
  weekEnd: string,
  meals: PlannedMeal[],
  recipes: Recipe[]
): DailyLog[] {
  const logByDate = new Map(logs.map((l) => [l.date, l]));
  const result: DailyLog[] = [];
  for (let i = 0; i <= diffInDays(weekStart, weekEnd); i++) {
    const date = addDays(weekStart, i);
    const log = logByDate.get(date) ?? null;
    const day = resolveDayNutrition(
      meals.filter((m) => m.date === date),
      recipes,
      log
    );
    if (day.source !== "meals") {
      if (log) result.push(log);
      continue;
    }
    const base = log ?? blankLog(date);
    result.push({
      ...base,
      calories: day.registered ? day.values.calories : null,
      proteinG: day.registered ? day.values.proteinG : null,
      fiberG: day.registered ? day.values.fiberG : null,
    });
  }
  return result;
}

/** "1 800 kcal • 135 g protein • 180 g kolhydrater • 60 g fett • 30+ g fiber" */
export function formatTargetsLine(p: ProgramSettings): string {
  return [
    `${formatNumber(p.calorieTarget)} kcal`,
    `${formatNumber(p.proteinTargetG)} g protein`,
    `${formatNumber(p.carbsTargetG)} g kolhydrater`,
    `${formatNumber(p.fatTargetG)} g fett`,
    `${formatNumber(p.fiberTargetG)}+ g fiber`,
  ].join(" • ");
}
