import { useCallback, useEffect, useState } from "react";

export type TabId = "idag" | "mat" | "traning" | "progress";

const TAB_IDS: TabId[] = ["idag", "mat", "traning", "progress"];

function readHash(): TabId {
  const id = window.location.hash.replace(/^#\/?/, "") as TabId;
  return TAB_IDS.includes(id) ? id : "idag";
}

/** Enkel hash-router (#/idag, #/mat ...). Fungerar på GitHub Pages utan serverkonfiguration. */
export function useHashRoute(): [TabId, (tab: TabId) => void] {
  const [tab, setTabState] = useState<TabId>(readHash);

  useEffect(() => {
    const onChange = () => setTabState(readHash());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  const setTab = useCallback((next: TabId) => {
    window.location.hash = `/${next}`;
  }, []);

  return [tab, setTab];
}
