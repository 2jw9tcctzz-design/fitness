import type { ReactNode } from "react";

type Props = {
  title?: string;
  /** Kort förklaring under rubriken. */
  subtitle?: string;
  children: ReactNode;
};

export function SectionCard({ title, subtitle, children }: Props) {
  return (
    <section className="card">
      {title ? <h2 className="card-title">{title}</h2> : null}
      {subtitle ? <p className="card-subtitle">{subtitle}</p> : null}
      {children}
    </section>
  );
}
