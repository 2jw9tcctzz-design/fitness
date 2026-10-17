import { useMemo, useState } from "react";
import { AppHeader } from "../components/AppHeader";
import { MealCard } from "../components/meal/MealCard";
import { NutritionSummary } from "../components/meal/NutritionSummary";
import { RecipeDetailSheet } from "../components/meal/RecipeDetailSheet";
import { RecipePickerSheet } from "../components/meal/RecipePickerSheet";
import { ViewToggle, type MatView } from "../components/meal/ViewToggle";
import { usePlannedMeals } from "../hooks/usePlannedMeals";
import { computeMealTotals, formatTargetsLine } from "../services/nutritionService";
import { useSettings } from "../settings/SettingsContext";
import { useAppState } from "../state/AppStateContext";
import { MEAL_TYPES, type MealType, type Recipe } from "../types/meal";
import { formatDateLong, todayString } from "../utils/dates";
import { WeekPlanView } from "./WeekPlanView";

type Props = { onOpenSettings: () => void };

export function FoodScreen({ onOpenSettings }: Props) {
  const [view, setView] = useState<MatView>("day");
  const { date, setDate } = useAppState();

  if (view === "week") {
    return (
      <WeekPlanView
        view={view}
        onViewChange={setView}
        onOpenDay={(d) => {
          setDate(d);
          setView("day");
        }}
      />
    );
  }
  return <DayMenu view={view} onViewChange={setView} date={date} onOpenSettings={onOpenSettings} />;
}

function DayMenu({ view, onViewChange, date, onOpenSettings }: { view: MatView; onViewChange: (v: MatView) => void; date: string; onOpenSettings: () => void }) {
  const { settings } = useSettings();
  const { setDate } = useAppState();
  const { meals, recipes, error, assign, setEaten } = usePlannedMeals(date, date);
  const [picker, setPicker] = useState<MealType | null>(null);
  const [detail, setDetail] = useState<Recipe | null>(null);

  const recipeById = useMemo(() => new Map(recipes.map((r) => [r.id, r])), [recipes]);
  const totals = useMemo(() => computeMealTotals(meals, recipes), [meals, recipes]);
  const program = settings.program;

  const shift = (days: number) => {
    const [y, m, d] = date.split("-").map(Number);
    const t = new Date(Date.UTC(y, m - 1, d + days));
    setDate(`${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}-${String(t.getUTCDate()).padStart(2, "0")}`);
  };

  const pickerMeal = picker ? meals.find((m) => m.mealType === picker) ?? null : null;

  return (
    <div className="screen">
      <AppHeader
        title="Dagens meny"
        subtitle={formatTargetsLine(program)}
        dateLabel={formatDateLong(date)}
        date={date}
        isToday={date === todayString()}
        onPrevDay={() => shift(-1)}
        onNextDay={() => shift(1)}
        onGoToToday={() => setDate(todayString())}
        onPickDate={setDate}
        onOpenSettings={onOpenSettings}
      />
      <ViewToggle value={view} onChange={onViewChange} />

      {error ? <p className="notice">{error}</p> : null}

      <NutritionSummary
        planned={totals.planned}
        eaten={totals.eaten}
        targets={program}
        plannedCount={totals.plannedCount}
        eatenCount={totals.eatenCount}
      />

      {MEAL_TYPES.map((mealType) => {
        const meal = meals.find((m) => m.mealType === mealType) ?? null;
        return (
          <MealCard
            key={mealType}
            mealType={mealType}
            meal={meal}
            recipe={meal ? recipeById.get(meal.recipeId) ?? null : null}
            onOpenRecipe={setDetail}
            onToggleEaten={(eaten) => void setEaten(date, mealType, eaten)}
            onSwap={() => setPicker(mealType)}
          />
        );
      })}

      {picker ? (
        <RecipePickerSheet
          mealType={picker}
          currentRecipeId={pickerMeal?.recipeId ?? null}
          dayLabel={formatDateLong(date)}
          onClose={() => setPicker(null)}
          onPick={(recipe) => {
            void assign(date, picker, recipe.id);
            setPicker(null);
          }}
        />
      ) : null}
      {detail ? <RecipeDetailSheet recipe={detail} onClose={() => setDetail(null)} /> : null}
    </div>
  );
}
