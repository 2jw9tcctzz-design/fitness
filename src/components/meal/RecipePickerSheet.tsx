import { useEffect, useState } from "react";
import { getRecipesByMealType } from "../../db/repositories/recipeRepository";
import { MEAL_TYPE_LABELS, type MealType, type Recipe } from "../../types/meal";
import { formatRounded } from "../../utils/format";
import { Sheet } from "../Sheet";

type Props = {
  mealType: MealType;
  currentRecipeId: string | null;
  /** t.ex. "tis 13 okt" */
  dayLabel: string;
  onPick: (recipe: Recipe) => void;
  onClose: () => void;
};

/** Visar bara recept av samma måltidstyp som måltiden som byts eller planeras. */
export function RecipePickerSheet({ mealType, currentRecipeId, dayLabel, onPick, onClose }: Props) {
  const [recipes, setRecipes] = useState<Recipe[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getRecipesByMealType(mealType)
      .then((r) => !cancelled && setRecipes(r))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [mealType]);

  return (
    <Sheet title={`Välj ${MEAL_TYPE_LABELS[mealType].toLowerCase()}`} onClose={onClose}>
      <p className="sheet-sub">{dayLabel}</p>
      {failed ? <p className="notice">Det gick inte att läsa recepten.</p> : null}
      {recipes && recipes.length === 0 ? <p className="meal-empty">Inga recept för den här måltiden.</p> : null}
      <ul className="picker-list">
        {(recipes ?? []).map((r) => {
          const current = r.id === currentRecipeId;
          return (
            <li key={r.id}>
              <button type="button" className={`picker-item ${current ? "is-current" : ""}`} onClick={() => onPick(r)} aria-label={`Välj ${r.name}`}>
                <span className="picker-name">
                  {r.name}
                  {current ? <span className="picker-badge">Vald</span> : null}
                </span>
                <span className="picker-meta">
                  {formatRounded(r.caloriesPerServing)} kcal · {formatRounded(r.proteinGPerServing)} g protein ·{" "}
                  {formatRounded(r.fiberGPerServing)} g fiber
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}
