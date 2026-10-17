type Props = { value: string; onChange: (value: string) => void };

export function NoteField({ value, onChange }: Props) {
  return (
    <textarea
      className="note"
      value={value}
      placeholder="Hur kändes dagen?"
      aria-label="Anteckning"
      rows={3}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
