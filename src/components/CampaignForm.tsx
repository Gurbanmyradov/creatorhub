"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import { fromCents, toCents } from "@/lib/format";
import type { Campaign } from "@/lib/repos/campaigns";
import { CAMPAIGN_STATUSES } from "@/lib/schema";

export function CampaignForm({ campaign }: { campaign?: Campaign }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setPending(true);
    setError(null);
    try {
      const body = {
        name: f.get("name"),
        brand: f.get("brand"),
        description: f.get("description"),
        budgetCents: toCents(String(f.get("budget"))),
        startDate: f.get("startDate"),
        deadline: f.get("deadline"),
        status: f.get("status"),
      };
      const saved = campaign
        ? await api<Campaign>(`/api/campaigns/${campaign.id}`, "PUT", body)
        : await api<Campaign>("/api/campaigns", "POST", body);
      router.push(`/campaigns/${saved.id}`);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card form">
      <div className="grid-2">
        <label>
          Campaign name
          <input
            name="name"
            defaultValue={campaign?.name}
            required
            maxLength={120}
          />
        </label>
        <label>
          Brand
          <input
            name="brand"
            defaultValue={campaign?.brand}
            required
            maxLength={120}
          />
        </label>
        <label>
          Budget (USD)
          <input
            name="budget"
            type="number"
            min={0}
            step="0.01"
            defaultValue={campaign ? fromCents(campaign.budgetCents) : ""}
            required
          />
        </label>
        <label>
          Status
          <select name="status" defaultValue={campaign?.status ?? "draft"}>
            {CAMPAIGN_STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label>
          Start date
          <input
            name="startDate"
            type="date"
            defaultValue={campaign?.startDate}
            required
          />
        </label>
        <label>
          Deadline
          <input
            name="deadline"
            type="date"
            defaultValue={campaign?.deadline}
            required
          />
        </label>
      </div>
      <label>
        Description
        <textarea
          name="description"
          rows={3}
          defaultValue={campaign?.description ?? ""}
        />
      </label>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="row">
        <button className="btn primary" disabled={pending}>
          {pending ? "Saving…" : campaign ? "Save changes" : "Create campaign"}
        </button>
        <button
          type="button"
          className="btn ghost"
          onClick={() => router.back()}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
