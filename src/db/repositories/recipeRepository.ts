import type { MealType, Recipe } from "../../types/meal";
import { getDatabase } from "../database";
import { done, request } from "../idb";
import { RECIPES_BY_MEAL_TYPE_INDEX, RECIPES_STORE } from "../migrations";

function byName(a: Recipe, b: Recipe): number {
  return a.name.localeCompare(b.name, "sv");
}

export async function getAllRecipes(): Promise<Recipe[]> {
  const db = await getDatabase();
  const rows = await request<Recipe[]>(db.transaction(RECIPES_STORE, "readonly").objectStore(RECIPES_STORE).getAll());
  return rows.sort(byName);
}

/** Recept för en måltidstyp, t.ex. bara luncher. Används av Byt och Veckoplan. */
export async function getRecipesByMealType(mealType: MealType): Promise<Recipe[]> {
  const db = await getDatabase();
  const rows = await request<Recipe[]>(
    db.transaction(RECIPES_STORE, "readonly").objectStore(RECIPES_STORE).index(RECIPES_BY_MEAL_TYPE_INDEX).getAll(mealType)
  );
  return rows.sort(byName);
}

export async function getRecipe(id: string): Promise<Recipe | null> {
  const db = await getDatabase();
  const row = await request<Recipe | undefined>(db.transaction(RECIPES_STORE, "readonly").objectStore(RECIPES_STORE).get(id));
  return row ?? null;
}

/** Skapar eller ersätter recept. Används av tester och återställning, inte av någon redigeringsvy. */
export async function putRecipes(recipes: Recipe[]): Promise<void> {
  const db = await getDatabase();
  const tx = db.transaction(RECIPES_STORE, "readwrite");
  for (const r of recipes) tx.objectStore(RECIPES_STORE).put(r);
  await done(tx);
}
