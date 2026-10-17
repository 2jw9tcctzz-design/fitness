import { MEAL_TYPE_LABELS, type Recipe } from "../../types/meal";
import { recipeNutrition } from "../../services/nutritionService";
import { formatNumber } from "../../utils/format";
import { Sheet } from "../Sheet";
import { MacroLine } from "./MacroLine";

/** Skrivskyddad receptvy (ingen redigering i Sprint 2A). */
export function RecipeDetailSheet({ recipe, onClose }: { recipe: Recipe; onClose: () => void }) {
  return (
    <Sheet title={recipe.name} onClose={onClose}>
      <p className="sheet-sub">
        {MEAL_TYPE_LABELS[recipe.mealType]}
        {recipe.prepMinutes != null ? ` · ${recipe.prepMinutes} min` : ""}
        {" · 1 portion"}
      </p>
      <MacroLine n={recipeNutrition(recipe)} />

      <h3 className="detail-heading">Ingredienser</h3>
      <ul className="ingredient-list">
        {recipe.ingredients.map((i, idx) => (
          <li key={`${i.name}-${idx}`}>
            <span>{i.name}</span>
            <span className="ingredient-qty">
              {formatNumber(i.quantity)} {i.unit}
            </span>
          </li>
        ))}
      </ul>

      {recipe.instructions ? (
        <>
          <h3 className="detail-heading">Gör så här</h3>
          <p className="detail-text">{recipe.instructions}</p>
        </>
      ) : null}
      <p className="detail-note">Näringsvärdena är ungefärliga uppskattningar per portion.</p>
    </Sheet>
  );
}
