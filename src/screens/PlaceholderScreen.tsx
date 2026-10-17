import { EmptyState } from "../components/EmptyState";

export function FoodScreen() {
  return <EmptyState title="Mat" message="Kommer i Sprint 2" />;
}

export function TrainingScreen() {
  return <EmptyState title="Träning" message="Kommer i Sprint 3" />;
}

export function ProgressScreen() {
  return <EmptyState title="Progress" message="Kommer i Sprint 4" />;
}
