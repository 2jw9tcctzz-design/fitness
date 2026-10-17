import { useCallback, useEffect, useState } from "react";

export type TabId = "idag" | "mat" | "traning" | "progress";
/** Flikarna plus skärmar som inte är flikar. */
export type RouteId = TabId | "installningar";

const ROUTE_IDS: RouteId[] = ["idag", "mat", "traning", "progress", "installningar"];

function readHash(): RouteId {
  const id = window.location.hash.replace(/^#\/?/, "") as RouteId;
  return ROUTE_IDS.includes(id) ? id : "idag";
}

/** Enkel hash-router (#/idag, #/mat ...). Fungerar på GitHub Pages utan serverkonfiguration. */
export function useHashRoute(): [RouteId, (route: RouteId) => void] {
  const [route, setRouteState] = useState<RouteId>(readHash);

  useEffect(() => {
    const onChange = () => setRouteState(readHash());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  const setRoute = useCallback((next: RouteId) => {
    window.location.hash = `/${next}`;
  }, []);

  return [route, setRoute];
}
