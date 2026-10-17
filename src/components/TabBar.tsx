import type { ReactNode } from "react";
import type { TabId } from "../hooks/useHashRoute";

type Props = { active: TabId; onChange: (tab: TabId) => void };

const icon = (path: ReactNode) => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {path}
  </svg>
);

const TABS: { id: TabId; label: string; icon: ReactNode }[] = [
  {
    id: "idag",
    label: "Idag",
    icon: icon(
      <>
        <rect x="3.5" y="5" width="17" height="15" rx="3" />
        <path d="M3.5 10h17M8 3v4M16 3v4" />
      </>
    ),
  },
  {
    id: "mat",
    label: "Mat",
    icon: icon(
      <>
        <path d="M7 3v8M4.5 3v5a2.5 2.5 0 005 0V3M7 11v10" />
        <path d="M16 21V3c-2.5 1.5-3.5 4.5-3.5 8H16" />
      </>
    ),
  },
  {
    id: "traning",
    label: "Träning",
    icon: icon(
      <>
        <path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11" />
      </>
    ),
  },
  {
    id: "progress",
    label: "Progress",
    icon: icon(<path d="M4 19V5M4 19h16M8 15l3-4 3 2 5-6" />),
  },
];

export function TabBar({ active, onChange }: Props) {
  return (
    <nav className="tab-bar" aria-label="Huvudmeny">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`tab ${active === tab.id ? "is-active" : ""}`}
          aria-current={active === tab.id ? "page" : undefined}
          aria-label={tab.label}
          onClick={() => onChange(tab.id)}
        >
          {tab.icon}
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
