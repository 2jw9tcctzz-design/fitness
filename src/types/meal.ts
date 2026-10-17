export type MealType = "breakfast" | "lunch" | "snack" | "dinner";

/** Ordningen måltiderna visas i under en dag. */
export const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "snack", "dinner"];

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: "Frukost",
  lunch: "Lunch",
  snack: "Mellanmål",
  dinner: "Middag",
};

export type RecipeIngredient = {
  name: string;
  quantity: number;
  unit: string;
};

/** Näringsvärden lagras per portion. En planerad måltid = 1 portion (Sprint 2A). */
export type Recipe = {
  id: string;
  name: string;
  mealType: MealType;
  servings: number;
  caloriesPerServing: number;
  proteinGPerServing: number;
  carbsGPerServing: number;
  fatGPerServing: number;
  fiberGPerServing: number;
  prepMinutes?: number | null;
  ingredients: RecipeIngredient[];
  instructions?: string | null;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
};

export type MealStatus = "planned" | "eaten";

export type PlannedMeal = {
  /** `${date}_${mealType}`: en planerad måltid per dag och måltidstyp. */
  id: string;
  /** YYYY-MM-DD */
  date: string;
  mealType: MealType;
  recipeId: string;
  status: MealStatus;
  eatenAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Nutrition = {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
};

export const EMPTY_NUTRITION: Nutrition = { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0 };

export function isMealType(v: unknown): v is MealType {
  return v === "breakfast" || v === "lunch" || v === "snack" || v === "dinner";
}
