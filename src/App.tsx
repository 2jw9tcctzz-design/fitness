import { useCallback, useEffect, useState } from "react";
import { TabBar } from "./components/TabBar";
import { initDatabase, requestPersistentStorage } from "./db/database";
import { useHashRoute } from "./hooks/useHashRoute";
import { FoodScreen, ProgressScreen, TrainingScreen } from "./screens/PlaceholderScreen";
import { TodayScreen } from "./screens/TodayScreen";

type DbState = "loading" | "ready" | "error";

export default function App() {
  const [dbState, setDbState] = useState<DbState>("loading");
  const [tab, setTab] = useHashRoute();

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
    <>
      <main className="main">
        {tab === "idag" ? <TodayScreen /> : null}
        {tab === "mat" ? <FoodScreen /> : null}
        {tab === "traning" ? <TrainingScreen /> : null}
        {tab === "progress" ? <ProgressScreen /> : null}
      </main>
      <TabBar active={tab} onChange={setTab} />
    </>
  );
}
