import type { FocusEntry } from "../services/focusService";
import { FocusItem } from "./FocusItem";
import { SectionCard } from "./SectionCard";

type Props = { items: FocusEntry[] };

export function FocusCard({ items }: Props) {
  return (
    <SectionCard title="Dagens fokus">
      <ul className="focus-list">
        {items.slice(0, 4).map((item) => (
          <FocusItem key={item.key} label={item.label} detail={item.detail} done={item.done} />
        ))}
      </ul>
    </SectionCard>
  );
}
