import { MEAL_TYPE_LABELS, type MealType, type PlannedMeal, type Recipe } from "../../types/meal";
import { recipeNutrition } from "../../services/nutritionService";
import { MacroLine } from "./MacroLine";

type Props = {
  mealType: MealType;
  meal: PlannedMeal | null;
  recipe: Recipe | null;
  onOpenRecipe: (recipe: Recipe) => void;
  onToggleEaten: (eaten: boolean) => void;
  onSwap: () => void;
};

export function MealCard({ mealType, meal, recipe, onOpenRecipe, onToggleEaten, onSwap }: Props) {
  const label = MEAL_TYPE_LABELS[mealType];

  if (!meal || !recipe) {
    return (
      <section className="card meal-card is-empty" aria-label={label}>
        <div className="meal-type">{label}</div>
        <p className="meal-empty">Ingen måltid planerad</p>
        <button type="button" className="secondary-button" onClick={onSwap} aria-label={`Välj recept för ${label.toLowerCase()}`}>
          Välj recept
        </button>
      </section>
    );
  }

  const eaten = meal.status === "eaten";
  return (
    <section className={`card meal-card ${eaten ? "is-eaten" : ""}`} aria-label={label}>
      <div className="meal-head">
        <div className="meal-type">{label}</div>
        <button type="button" className="link-button" onClick={onSwap} aria-label={`Byt ${label.toLowerCase()}`}>
          Byt
        </button>
      </div>
      <h3 className="meal-name">{recipe.name}</h3>
      <MacroLine n={recipeNutrition(recipe)} />
      <div className="meal-actions">
        <button type="button" className="secondary-button" onClick={() => onOpenRecipe(recipe)} aria-label={`Öppna recept ${recipe.name}`}>
          Öppna recept
        </button>
        <button
          type="button"
          role="checkbox"
          aria-checked={eaten}
          className={`eaten-toggle ${eaten ? "is-on" : ""}`}
          onClick={() => onToggleEaten(!eaten)}
          aria-label={`Äten: ${label}`}
        >
          <span className="eaten-box" aria-hidden="true">
            {eaten ? (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            ) : null}
          </span>
          Äten
        </button>
      </div>
    </section>
  );
}
