import type { MealType, Recipe, RecipeIngredient } from "../types/meal";

/**
 * Testrecept som följer med appen (Sprint 2A). Näringsvärdena är avrundade uppskattningar per portion
 * utifrån vanliga livsmedelstabeller, tillräckligt rimliga för att testa flödet men inget facit.
 * Fasta id:n och tidsstämpel gör att de blir identiska i alla installationer.
 */
const SEED_TIME = "2026-10-17T00:00:00.000Z";

type Seed = {
  id: string;
  name: string;
  mealType: MealType;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  prepMinutes: number;
  ingredients: [string, number, string][];
  instructions: string;
  tags?: string[];
};

const SEEDS: Seed[] = [
  // Frukost
  {
    id: "seed-overnight-oats",
    name: "Overnight oats med chia, whey och äpple",
    mealType: "breakfast",
    kcal: 520,
    protein: 40,
    carbs: 67,
    fat: 11,
    fiber: 12,
    prepMinutes: 5,
    ingredients: [
      ["Havregryn", 50, "g"],
      ["Chiafrön", 10, "g"],
      ["Vassleprotein (vanilj)", 30, "g"],
      ["Mjölk 1,5 %", 2, "dl"],
      ["Äpple", 1, "st"],
    ],
    instructions:
      "Blanda havregryn, chiafrön, vassleprotein och mjölk i en burk. Ställ i kylen över natten. Riv eller tärna äpplet och rör ner det på morgonen.",
    tags: ["högt protein", "förbereds kvällen innan"],
  },
  {
    id: "seed-egg-keso-avokado",
    name: "Äggröra, keso och avokado på fullkornsbröd",
    mealType: "breakfast",
    kcal: 460,
    protein: 29,
    carbs: 31,
    fat: 25,
    fiber: 9,
    prepMinutes: 10,
    ingredients: [
      ["Ägg", 2, "st"],
      ["Keso", 100, "g"],
      ["Avokado", 80, "g"],
      ["Fullkornsbröd", 1, "skiva"],
      ["Tomat", 50, "g"],
    ],
    instructions: "Rör äggen i en non-stick-panna på medelvärme. Servera på rostat bröd med keso, skivad avokado och tomat.",
  },
  {
    id: "seed-yoghurt-musli",
    name: "Grekisk yoghurt med müsli och banan",
    mealType: "breakfast",
    kcal: 410,
    protein: 24,
    carbs: 55,
    fat: 7,
    fiber: 6,
    prepMinutes: 3,
    ingredients: [
      ["Grekisk yoghurt 2 %", 200, "g"],
      ["Osötad müsli", 40, "g"],
      ["Banan", 1, "st"],
    ],
    instructions: "Lägg yoghurten i en skål, toppa med müsli och skivad banan.",
  },

  // Lunch
  {
    id: "seed-chicken-quinoa-bowl",
    name: "Chicken quinoa bowl",
    mealType: "lunch",
    kcal: 520,
    protein: 46,
    carbs: 46,
    fat: 17,
    fiber: 10,
    prepMinutes: 25,
    ingredients: [
      ["Kycklingbröst, tillagat", 120, "g"],
      ["Quinoa, kokt", 130, "g"],
      ["Broccoli", 80, "g"],
      ["Babyspenat", 30, "g"],
      ["Avokado", 35, "g"],
      ["Olivolja", 1, "tsk"],
    ],
    instructions:
      "Koka quinoan enligt paketet. Stek eller grilla kycklingen och skiva den. Ånga broccolin. Lägg allt i en skål på spenaten, toppa med avokado och ringla över olivolja.",
    tags: ["högt protein"],
  },
  {
    id: "seed-tonfisk-bonsallad",
    name: "Tonfisksallad med kikärtor och fullkornsbröd",
    mealType: "lunch",
    kcal: 480,
    protein: 41,
    carbs: 44,
    fat: 14,
    fiber: 11,
    prepMinutes: 10,
    ingredients: [
      ["Tonfisk i vatten, avrunnen", 120, "g"],
      ["Kikärtor, konserv", 100, "g"],
      ["Blandade grönsaker", 150, "g"],
      ["Olivolja", 1, "msk"],
      ["Fullkornsbröd", 1, "skiva"],
    ],
    instructions: "Blanda tonfisk, kikärtor och grönsaker. Dressa med olivolja, citron, salt och peppar. Servera med brödet.",
  },
  {
    id: "seed-linssoppa",
    name: "Röd linssoppa med keso och fullkornsbröd",
    mealType: "lunch",
    kcal: 460,
    protein: 31,
    carbs: 63,
    fat: 8,
    fiber: 12,
    prepMinutes: 25,
    ingredients: [
      ["Röd linssoppa", 350, "ml"],
      ["Keso", 100, "g"],
      ["Fullkornsbröd", 1, "skiva"],
    ],
    instructions: "Värm soppan. Servera med en klick keso och bröd. Soppan går bra att laga i större sats och frysa.",
  },

  // Mellanmål
  {
    id: "seed-skyr-bar-mandlar",
    name: "Skyr, bär och mandlar",
    mealType: "snack",
    kcal: 260,
    protein: 25,
    carbs: 19,
    fat: 9,
    fiber: 5,
    prepMinutes: 2,
    ingredients: [
      ["Skyr naturell", 200, "g"],
      ["Bär (blåbär/jordgubbar)", 100, "g"],
      ["Mandlar", 15, "g"],
    ],
    instructions: "Lägg skyr i en skål, toppa med bär och hackade mandlar.",
    tags: ["högt protein"],
  },
  {
    id: "seed-keso-knacke",
    name: "Keso med gurka och knäckebröd",
    mealType: "snack",
    kcal: 195,
    protein: 19,
    carbs: 17,
    fat: 4,
    fiber: 4,
    prepMinutes: 3,
    ingredients: [
      ["Keso", 150, "g"],
      ["Fullkornsknäckebröd", 2, "st"],
      ["Gurka", 80, "g"],
    ],
    instructions: "Servera kesot med gurkskivor och knäckebröd.",
  },
  {
    id: "seed-proteinshake",
    name: "Proteinshake med banan",
    mealType: "snack",
    kcal: 295,
    protein: 32,
    carbs: 33,
    fat: 5,
    fiber: 2,
    prepMinutes: 3,
    ingredients: [
      ["Vassleprotein", 30, "g"],
      ["Banan", 1, "st"],
      ["Mjölk 1,5 %", 2, "dl"],
    ],
    instructions: "Mixa allt tills det blir slätt.",
  },

  // Middag
  {
    id: "seed-lax-potatis",
    name: "Lax, potatis, broccoli och yoghurtsås",
    mealType: "dinner",
    kcal: 540,
    protein: 40,
    carbs: 43,
    fat: 22,
    fiber: 8,
    prepMinutes: 30,
    ingredients: [
      ["Laxfilé", 150, "g"],
      ["Potatis", 200, "g"],
      ["Broccoli", 150, "g"],
      ["Naturell yoghurt", 50, "g"],
      ["Citron och dill", 1, "port"],
    ],
    instructions:
      "Koka potatisen. Baka laxen i ugnen på 200 °C i cirka 12 minuter. Ånga broccolin. Rör ihop yoghurt, citronsaft och dill till en sås.",
    tags: ["omega-3"],
  },
  {
    id: "seed-kycklinggryta",
    name: "Kycklinggryta med grönsaker och fullkornsris",
    mealType: "dinner",
    kcal: 530,
    protein: 50,
    carbs: 50,
    fat: 12,
    fiber: 8,
    prepMinutes: 35,
    ingredients: [
      ["Kycklingbröst, tillagat", 140, "g"],
      ["Fullkornsris, kokt", 150, "g"],
      ["Paprika, zucchini, lök", 200, "g"],
      ["Passerade tomater", 100, "ml"],
      ["Olivolja", 1, "tsk"],
    ],
    instructions:
      "Fräs grönsakerna i olivolja, tillsätt kycklingen och passerade tomater och låt sjuda i 15 minuter. Servera med riset.",
  },
  {
    id: "seed-bon-chili",
    name: "Vegetarisk chili med bönor och ris",
    mealType: "dinner",
    kcal: 520,
    protein: 33,
    carbs: 68,
    fat: 11,
    fiber: 20,
    prepMinutes: 35,
    ingredients: [
      ["Kidney- och svarta bönor", 150, "g"],
      ["Krossade tomater", 150, "g"],
      ["Grönsaker (lök, paprika, morot)", 150, "g"],
      ["Vegofärs", 80, "g"],
      ["Riven ost", 20, "g"],
      ["Fullkornsris, kokt", 100, "g"],
    ],
    instructions:
      "Fräs grönsaker och vegofärs, tillsätt bönor, tomat och chilikrydda. Sjud i 20 minuter. Servera med ris och ost.",
    tags: ["vegetarisk", "mycket fiber"],
  },
];

export const SEED_RECIPES: Recipe[] = SEEDS.map((s) => ({
  id: s.id,
  name: s.name,
  mealType: s.mealType,
  servings: 1,
  caloriesPerServing: s.kcal,
  proteinGPerServing: s.protein,
  carbsGPerServing: s.carbs,
  fatGPerServing: s.fat,
  fiberGPerServing: s.fiber,
  prepMinutes: s.prepMinutes,
  ingredients: s.ingredients.map(([name, quantity, unit]): RecipeIngredient => ({ name, quantity, unit })),
  instructions: s.instructions,
  tags: s.tags ?? [],
  createdAt: SEED_TIME,
  updatedAt: SEED_TIME,
}));
