import { useCallback, useEffect, useState } from "react";
import { TabBar } from "./components/TabBar";
import { initDatabase, requestPersistentStorage } from "./db/database";
import { useHashRoute } from "./hooks/useHashRoute";
import { FoodScreen } from "./screens/FoodScreen";
import { ProgressScreen, TrainingScreen } from "./screens/PlaceholderScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { TodayScreen } from "./screens/TodayScreen";
import { SettingsProvider } from "./settings/SettingsContext";
import { AppStateProvider } from "./state/AppStateContext";

type DbState = "loading" | "ready" | "error";

export default function App() {
  const [dbState, setDbState] = useState<DbState>("loading");
  const [route, setRoute] = useHashRoute();

  const init = useCallback(async () => {
    setDbState("loading");
    try {
      await initDatabase();
      void requestPersistentStorage();
      setDbState("ready");
    } catch (error) {
      if (import.meta.env.DEV) console.warn("[DB] kunde inte starta databasen", error);
      setDbState("error");
    }
  }, []);

  useEffect(() => {
    void init();
  }, [init]);

  if (dbState === "loading") {
    return <div className="boot" role="status" aria-label="Startar appen" />;
  }

  if (dbState === "error") {
    return (
      <div className="boot">
        <h1 className="boot-title">Något gick fel vid start</h1>
        <p className="empty-message">Dina data är inte påverkade. Försök igen.</p>
        <button type="button" className="save-button boot-button" onClick={init} aria-label="Försök igen">
          Försök igen
        </button>
      </div>
    );
  }

  return (
    <SettingsProvider>
      <AppStateProvider>
      <main className="main">
        {/* Idag hålls monterad (bara dold) så att valt datum och osparad inmatning finns kvar när man
            tittar i Inställningar eller byter flik. */}
        <div hidden={route !== "idag"}>
          <TodayScreen onOpenSettings={() => setRoute("installningar")} onOpenFood={() => setRoute("mat")} />
        </div>
        {route === "installningar" ? <SettingsScreen onBack={() => setRoute("idag")} /> : null}
        {route === "mat" ? <FoodScreen onOpenSettings={() => setRoute("installningar")} /> : null}
        {route === "traning" ? <TrainingScreen /> : null}
        {route === "progress" ? <ProgressScreen /> : null}
      </main>
      <TabBar active={route} onChange={setRoute} />
      </AppStateProvider>
    </SettingsProvider>
  );
}
