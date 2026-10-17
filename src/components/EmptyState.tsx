type Props = { title: string; message: string };

export function EmptyState({ title, message }: Props) {
  return (
    <div className="empty-state">
      <h1 className="app-title">{title}</h1>
      <p className="empty-message">{message}</p>
    </div>
  );
}
