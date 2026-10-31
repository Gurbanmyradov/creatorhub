"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import { money, toCents } from "@/lib/format";

export function AddPartnershipForm({
  campaignId,
  deadline,
  remainingCents,
  creators,
}: {
  campaignId: number;
  deadline: string;
  remainingCents: number;
  creators: { id: number; name: string; niche: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    setPending(true);
    setError(null);
    try {
      const deliverables = String(f.get("deliverables") ?? "")
        .split("\n")
        .map((t) => t.trim())
        .filter(Boolean)
        .map((title) => ({ title, type: "post", dueDate: deadline }));
      await api("/api/partnerships", "POST", {
        campaignId,
        creatorId: Number(f.get("creatorId")),
        feeCents: toCents(String(f.get("fee"))),
        status: f.get("status"),
        deliverables,
      });
      form.reset();
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  if (creators.length === 0)
    return (
      <p className="muted">Every creator is already part of this campaign.</p>
    );

  return (
    <form onSubmit={onSubmit} className="form">
      <div className="grid-3">
        <label>
          Creator
          <select name="creatorId" required defaultValue="">
            <option value="" disabled>
              Select…
            </option>
            {creators.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} · {c.niche}
              </option>
            ))}
          </select>
        </label>
        <label>
          Agreed fee (USD){" "}
          <span className="muted small">— {money(remainingCents)} left</span>
          <input name="fee" type="number" min={0} step="0.01" required />
        </label>
        <label>
          Status
          <select name="status" defaultValue="proposed">
            <option>proposed</option>
            <option>agreed</option>
            <option>in_progress</option>
          </select>
        </label>
      </div>
      <label>
        Deliverables{" "}
        <span className="muted small">
          — one per line, due on the campaign deadline
        </span>
        <textarea
          name="deliverables"
          rows={2}
          placeholder={"Launch reel\nProduct story"}
        />
      </label>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button className="btn primary" disabled={pending}>
        {pending ? "Adding…" : "Add creator to campaign"}
      </button>
    </form>
  );
}
