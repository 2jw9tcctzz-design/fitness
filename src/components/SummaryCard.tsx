type Props = { label: string; value: string };

export function SummaryCard({ label, value }: Props) {
  return (
    <div className="summary-card" role="group" aria-label={`${label}: ${value}`}>
      <div className="summary-value">{value}</div>
      <div className="summary-label">{label}</div>
    </div>
  );
}
