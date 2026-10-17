import type { ReactNode } from "react";

type Props = { title?: string; children: ReactNode };

export function SectionCard({ title, children }: Props) {
  return (
    <section className="card">
      {title ? <h2 className="card-title">{title}</h2> : null}
      {children}
    </section>
  );
}
