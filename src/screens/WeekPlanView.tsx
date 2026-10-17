import { useMemo, useState } from "react";
import { RecipePickerSheet } from "../components/meal/RecipePickerSheet";
import { ViewToggle, type MatView } from "../components/meal/ViewToggle";
import { usePlannedMeals } from "../hooks/usePlannedMeals";
import { computeMealTotals } from "../services/nutritionService";
import { useAppState } from "../state/AppStateContext";
import { MEAL_TYPES, MEAL_TYPE_LABELS, type MealType } from "../types/meal";
import { addDays, formatDateLong, formatDateShort, getWeekDateRange, todayString } from "../utils/dates";
import { formatRounded } from "../utils/format";

type Props = { view: MatView; onViewChange: (v: MatView) => void; onOpenDay: (date: string) => void };

function capitalizeFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Enkel veckovy: sju dagar med fyra måltider vardera. Tryck på en måltid för att välja eller byta recept. */
export function WeekPlanView({ view, onViewChange, onOpenDay }: Props) {
  const { date, setDate } = useAppState();
  const { start, end } = getWeekDateRange(date);
  const { meals, recipes, error, assign } = usePlannedMeals(start, end);
  const [picker, setPicker] = useState<{ date: string; mealType: MealType } | null>(null);
  const recipeById = useMemo(() => new Map(recipes.map((r) => [r.id, r])), [recipes]);
  const today = todayString();
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));

  const pickerMeal = picker ? meals.find((m) => m.date === picker.date && m.mealType === picker.mealType) ?? null : null;

  return (
    <div className="screen">
      <header className="app-header">
        <h1 className="app-title">Veckoplan</h1>
        <p className="app-subtitle">Välj recept för varje måltid</p>
      </header>
      <ViewToggle value={view} onChange={onViewChange} />

      <div className="date-row">
        <button type="button" className="icon-button" onClick={() => setDate(addDays(date, -7))} aria-label="Föregående vecka">
          ‹
        </button>
        <div className="date-center">
          <span className="date-label">
            {formatDateShort(start)} – {formatDateShort(end)}
          </span>
          {start > today || end < today ? (
            <button type="button" className="link-button" onClick={() => setDate(today)} aria-label="Gå till denna vecka">
              Till denna vecka
            </button>
          ) : null}
        </div>
        <button type="button" className="icon-button" onClick={() => setDate(addDays(date, 7))} aria-label="Nästa vecka">
          ›
        </button>
      </div>

      {error ? <p className="notice">{error}</p> : null}

      {days.map((day) => {
        const dayMeals = meals.filter((m) => m.date === day);
        const totals = computeMealTotals(dayMeals, recipes);
        return (
          <section className="card week-day" key={day} aria-label={formatDateLong(day)}>
            <div className="week-day-head">
              <h2 className="card-title">
                {capitalizeFirst(formatDateLong(day))}
                {day === today ? <span className="today-tag">Idag</span> : null}
              </h2>
              <button type="button" className="link-button" onClick={() => onOpenDay(day)} aria-label={`Öppna ${formatDateLong(day)}`}>
                Öppna dag
              </button>
            </div>
            <p className="week-day-total">
              {totals.plannedCount > 0 ? `Planerat ${formatRounded(totals.planned.calories)} kcal · ${formatRounded(totals.planned.proteinG)} g protein` : "Inget planerat"}
            </p>
            <ul className="week-slots">
              {MEAL_TYPES.map((mealType) => {
                const meal = dayMeals.find((m) => m.mealType === mealType) ?? null;
                const recipe = meal ? recipeById.get(meal.recipeId) : undefined;
                return (
                  <li key={mealType}>
                    <button
                      type="button"
                      className="week-slot"
                      onClick={() => setPicker({ date: day, mealType })}
                      aria-label={`${MEAL_TYPE_LABELS[mealType]} ${formatDateLong(day)}: ${recipe ? recipe.name : "välj recept"}`}
                    >
                      <span className="week-slot-type">{MEAL_TYPE_LABELS[mealType]}</span>
                      <span className={`week-slot-name ${recipe ? "" : "is-empty"}`}>
                        {recipe ? recipe.name : "Välj recept"}
                      </span>
                      {meal?.status === "eaten" ? <span className="week-slot-check" aria-label="Äten">✓</span> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      {picker ? (
        <RecipePickerSheet
          mealType={picker.mealType}
          currentRecipeId={pickerMeal?.recipeId ?? null}
          dayLabel={capitalizeFirst(formatDateLong(picker.date))}
          onClose={() => setPicker(null)}
          onPick={(recipe) => {
            void assign(picker.date, picker.mealType, recipe.id);
            setPicker(null);
          }}
        />
      ) : null}
    </div>
  );
}
