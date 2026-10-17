import type { MealType, PlannedMeal } from "../../types/meal";
import { getDatabase } from "../database";
import { done, request } from "../idb";
import { PLANNED_BY_DATE_INDEX, PLANNED_MEALS_STORE, RECIPES_STORE } from "../migrations";
import type { Recipe } from "../../types/meal";

export function plannedMealId(date: string, mealType: MealType): string {
  return `${date}_${mealType}`;
}

/** Inklusive båda datumen. */
export async function getPlannedMealsBetween(startDate: string, endDate: string): Promise<PlannedMeal[]> {
  const db = await getDatabase();
  return request<PlannedMeal[]>(
    db
      .transaction(PLANNED_MEALS_STORE, "readonly")
      .objectStore(PLANNED_MEALS_STORE)
      .index(PLANNED_BY_DATE_INDEX)
      .getAll(IDBKeyRange.bound(startDate, endDate))
  );
}

export function getPlannedMealsForDate(date: string): Promise<PlannedMeal[]> {
  return getPlannedMealsBetween(date, date);
}

/**
 * Planerar ett recept för en måltid, eller byter recept om måltiden redan finns.
 * Ett nytt recept återställer statusen till "planned"; väljer man samma recept igen ändras ingenting.
 */
export async function setPlannedMeal(date: string, mealType: MealType, recipeId: string): Promise<PlannedMeal> {
  const db = await getDatabase();
  const tx = db.transaction([PLANNED_MEALS_STORE, RECIPES_STORE], "readwrite");
  const store = tx.objectStore(PLANNED_MEALS_STORE);
  const id = plannedMealId(date, mealType);
  // Bara recept av samma måltidstyp får planeras (lunch i lunch-luckan osv.).
  const recipe = await request<Recipe | undefined>(tx.objectStore(RECIPES_STORE).get(recipeId));
  if (!recipe || recipe.mealType !== mealType) {
    tx.abort();
    throw new Error("Receptet finns inte eller passar inte måltidstypen");
  }
  const existing = await request<PlannedMeal | undefined>(store.get(id));
  if (existing && existing.recipeId === recipeId) {
    await done(tx);
    return existing;
  }
  const now = new Date().toISOString();
  const row: PlannedMeal = {
    id,
    date,
    mealType,
    recipeId,
    status: "planned",
    eatenAt: null,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  store.put(row);
  await done(tx);
  return row;
}

/** Markerar en planerad måltid som äten eller inte. Returnerar null om måltiden inte är planerad. */
export async function setMealEaten(date: string, mealType: MealType, eaten: boolean): Promise<PlannedMeal | null> {
  const db = await getDatabase();
  const tx = db.transaction(PLANNED_MEALS_STORE, "readwrite");
  const store = tx.objectStore(PLANNED_MEALS_STORE);
  const existing = await request<PlannedMeal | undefined>(store.get(plannedMealId(date, mealType)));
  if (!existing) {
    await done(tx);
    return null;
  }
  const now = new Date().toISOString();
  const row: PlannedMeal = {
    ...existing,
    status: eaten ? "eaten" : "planned",
    eatenAt: eaten ? now : null,
    updatedAt: now,
  };
  store.put(row);
  await done(tx);
  return row;
}
