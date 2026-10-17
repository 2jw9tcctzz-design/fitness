# Daily Coach – Sprint 1 (PWA)

React + TypeScript + Vite. Lagring lokalt på telefonen (IndexedDB). Ingen backend, ingen inloggning.

## Lägga appen på iPhone

1. Skapa ett GitHub-repo och ladda upp innehållet i den här mappen (utan `node_modules`).
2. I repot: **Settings → Pages → Source: GitHub Actions**.
3. Push till `main` bygger och publicerar automatiskt (fliken *Actions* visar förloppet).
4. Öppna adressen `https://<ditt-användarnamn>.github.io/<repo-namn>/` i **Safari** på iPhone.
5. Tryck på Dela-ikonen → **Lägg till på hemskärmen**.
6. Använd därefter bara ikonen på hemskärmen.

> Viktigt på iPhone: appen på hemskärmen och Safari har **separata lagringsutrymmen**. Data du
> skriver in i Safari syns inte i hemskärmsappen. Installera först och logga sedan bara där.
> Rensar du Safaris webbplatsdata kan appens data försvinna. Det finns ingen export än.

## Köra lokalt

```bash
npm install
npm run dev        # utveckling
npm test           # 33 tester (logik, inställningar, IndexedDB, uppgradering v1→v2)
npm run build      # produktionsbygge i dist/
```

## Inställningar

Kugghjulet uppe till höger i Idag öppnar Inställningar: dagliga mål (kalorier, protein, fiber, promenad,
sömn, steg, mobility), startvikt, startmått, programstart och styrkedagar. Allt sparas på telefonen och
slår igenom direkt i Idag. Standardvärden finns i `src/config/programDefaults.ts`.

## Test på riktig iPhone (acceptans, ca 10 min)

1. Hemskärmsappen öppnas utan webbläsarfält och visar fyra flikar.
2. Idag visar rätt dag/vecka och fyra delar: Morgonens check-in, Under dagen, Genomförd träning, Kvällens
   check-out. Fyll i bara *Protein* och tryck **Spara dagen** → "Sparat".
3. Stäng appen helt (svep bort) och öppna igen → protein finns kvar.
4. Gå till en måndag, välj **Flytta** → välj en dag → spara. Gå till den dagen: den visar styrkepass
   ("Flyttat hit från …"). Markera **Gjort** → spara → *Träning* visar 1/3.
5. Tryck på datumet i toppen: iOS kalender öppnas. Välj ett tidigare datum, ändra och spara.
6. Kugghjulet: ändra kalorimålet, spara, gå tillbaka. Idag visar nya målet som hjälptext.
7. Fliken Mat/Träning/Progress visar "Kommer i Sprint 2/3/4".
8. Flygplansläge: appen startar och fungerar.

## Struktur

```
src/
  components/   AppHeader, SummaryCard, FocusCard, FocusItem, NumberInputRow, EnergySelector,
                ActivityInput, StrengthInput, NoteField, SaveButton, EmptyState, SectionCard, TabBar
  screens/      TodayScreen, SettingsScreen, PlaceholderScreen (Mat, Träning, Progress)
  settings/     SettingsContext (läser och sparar inställningar)
  hooks/        useDailyCheckIn (all logik för Idag), useSettingsForm, useHashRoute
  db/           database.ts, migrations.ts, repositories/dailyLogRepository.ts
  services/     programService, weeklyScoreCalc, weeklyScoreService, checkInForm,
                focusService, strengthPlanService, headerText, settingsForm
  config/ types/ utils/
tests/          logic.test.ts, db.test.ts, settings.test.ts, migration.test.ts
```

## Flytt till Expo senare

Oförändrat portbart: `src/services`, `src/types`, `src/config`, `src/utils`, `tests/logic.test.ts`.
Byts: `src/db` (IndexedDB → SQLite bakom samma funktioner) och UI (`components`, `screens`, `hooks`
rörande React DOM → React Native). Ett färdigt Expo-bygge av Sprint 1 (utan flyttat pass) finns separat.
