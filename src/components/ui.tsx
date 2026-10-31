import Link from "next/link";
import type { ReactNode } from "react";
import { label } from "@/lib/format";

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
      {actions && <div className="actions">{actions}</div>}
    </header>
  );
}

export function StatCard({
  title,
  value,
  hint,
}: {
  title: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="card stat">
      <span className="stat-title">{title}</span>
      <strong className="stat-value">{value}</strong>
      {hint && <span className="muted small">{hint}</span>}
    </div>
  );
}

const TONES: Record<string, string> = {
  active: "blue",
  in_progress: "blue",
  submitted: "blue",
  agreed: "blue",
  completed: "green",
  approved: "green",
  paid: "green",
  draft: "gray",
  proposed: "gray",
  pending: "gray",
  unpaid: "amber",
  none: "gray",
  changes_requested: "amber",
  cancelled: "red",
};
export function Badge({ value }: { value: string }) {
  return (
    <span className={`badge ${TONES[value] ?? "gray"}`}>{label(value)}</span>
  );
}

export function Progress({
  value,
  max = 100,
  tone,
}: {
  value: number;
  max?: number;
  tone?: "warn";
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div
      className="progress"
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={tone === "warn" ? "warn" : undefined}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function Empty({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="card empty">
      <strong>{title}</strong>
      {children && <p className="muted">{children}</p>}
    </div>
  );
}

export function Pagination({
  page,
  totalPages,
  href,
}: {
  page: number;
  totalPages: number;
  href: (page: number) => string;
}) {
  if (totalPages <= 1) return null;
  return (
    <nav className="pagination" aria-label="Pagination">
      {page > 1 ? <Link href={href(page - 1)}>← Previous</Link> : <span />}
      <span className="muted small">
        Page {page} of {totalPages}
      </span>
      {page < totalPages ? <Link href={href(page + 1)}>Next →</Link> : <span />}
    </nav>
  );
}
