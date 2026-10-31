"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { api } from "@/lib/client";

/** Button that calls the API, then refreshes server data (or navigates). */
export function ApiButton({
  url,
  method = "PATCH",
  body,
  children,
  confirm,
  redirectTo,
  variant = "secondary",
}: {
  url: string;
  method?: string;
  body?: unknown;
  children: ReactNode;
  confirm?: string;
  redirectTo?: string;
  variant?: "primary" | "secondary" | "danger" | "ghost";
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    if (confirm && !window.confirm(confirm)) return;
    setPending(true);
    setError(null);
    try {
      await api(url, method, body);
      if (redirectTo) router.push(redirectTo);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <span className="inline-action">
      <button
        type="button"
        className={`btn ${variant} sm`}
        onClick={onClick}
        disabled={pending}
      >
        {pending ? "…" : children}
      </button>
      {error && (
        <span className="error small" role="alert">
          {error}
        </span>
      )}
    </span>
  );
}

/** <select> that PATCHes one field when changed. */
export function StatusSelect({
  url,
  field,
  value,
  options,
  ariaLabel,
}: {
  url: string;
  field: string;
  value: string;
  options: readonly string[];
  ariaLabel: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onChange(next: string) {
    setPending(true);
    setError(null);
    try {
      await api(url, "PATCH", { [field]: next });
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <span className="inline-action">
      <select
        aria-label={ariaLabel}
        value={value}
        disabled={pending}
        onChange={(e) => onChange(e.target.value)}
        className="sm"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o.replace(/_/g, " ")}
          </option>
        ))}
      </select>
      {error && (
        <span className="error small" role="alert">
          {error}
        </span>
      )}
    </span>
  );
}

/** Approval controls for one deliverable. */
export function DeliverableActions({
  id,
  status,
}: {
  id: number;
  status: string;
}) {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function patch(body: Record<string, unknown>) {
    setError(null);
    try {
      await api(`/api/deliverables/${id}`, "PATCH", body);
      setAsking(false);
      setFeedback("");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="deliverable-actions">
      {status !== "submitted" && status !== "approved" && (
        <button
          className="btn ghost sm"
          onClick={() => patch({ status: "submitted" })}
        >
          Mark submitted
        </button>
      )}
      {status !== "approved" && (
        <button
          className="btn secondary sm"
          onClick={() => patch({ status: "approved" })}
        >
          Approve
        </button>
      )}
      {status !== "changes_requested" && status !== "approved" && !asking && (
        <button className="btn ghost sm" onClick={() => setAsking(true)}>
          Request changes
        </button>
      )}
      {asking && (
        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault();
            patch({ status: "changes_requested", feedback });
          }}
        >
          <input
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="What should change?"
            aria-label="Feedback"
            required
          />
          <button className="btn primary sm">Send</button>
          <button
            type="button"
            className="btn ghost sm"
            onClick={() => setAsking(false)}
          >
            Cancel
          </button>
        </form>
      )}
      {status === "approved" && (
        <button
          className="btn ghost sm"
          onClick={() => patch({ status: "pending" })}
        >
          Reopen
        </button>
      )}
      {error && (
        <span className="error small" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
