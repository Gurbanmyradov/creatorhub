"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import { PLATFORMS } from "@/lib/schema";
import type { Creator } from "@/lib/repos/creators";

interface PlatformDraft {
  platform: string;
  handle: string;
  followers: string;
  engagementRate: string;
}

export function CreatorForm({ creator }: { creator?: Creator }) {
  const router = useRouter();
  const [platforms, setPlatforms] = useState<PlatformDraft[]>(
    creator?.platforms.map((p) => ({
      platform: p.platform,
      handle: p.handle,
      followers: String(p.followers),
      engagementRate: String(p.engagementRate),
    })) ?? [
      { platform: "instagram", handle: "", followers: "", engagementRate: "" },
    ],
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const update = (i: number, patch: Partial<PlatformDraft>) =>
    setPlatforms((rows) =>
      rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)),
    );
  const used = new Set(platforms.map((p) => p.platform));

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setPending(true);
    setError(null);
    try {
      const body = {
        name: f.get("name"),
        email: f.get("email"),
        phone: f.get("phone"),
        niche: f.get("niche"),
        country: f.get("country"),
        bio: f.get("bio"),
        platforms: platforms.map((p) => ({
          ...p,
          followers: p.followers || 0,
          engagementRate: p.engagementRate || 0,
        })),
      };
      const saved = creator
        ? await api<Creator>(`/api/creators/${creator.id}`, "PUT", body)
        : await api<Creator>("/api/creators", "POST", body);
      router.push(`/creators/${saved.id}`);
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
          Name
          <input
            name="name"
            defaultValue={creator?.name}
            required
            maxLength={120}
          />
        </label>
        <label>
          Email
          <input
            name="email"
            type="email"
            defaultValue={creator?.email}
            required
          />
        </label>
        <label>
          Phone
          <input name="phone" defaultValue={creator?.phone ?? ""} />
        </label>
        <label>
          Country
          <input name="country" defaultValue={creator?.country ?? ""} />
        </label>
        <label>
          Niche
          <input
            name="niche"
            defaultValue={creator?.niche ?? ""}
            placeholder="e.g. Fitness, Tech, Beauty"
          />
        </label>
      </div>
      <label>
        Bio
        <textarea name="bio" rows={3} defaultValue={creator?.bio ?? ""} />
      </label>

      <fieldset>
        <legend>Social platforms</legend>
        {platforms.map((p, i) => (
          <div className="platform-row" key={i}>
            <select
              aria-label="Platform"
              value={p.platform}
              onChange={(e) => update(i, { platform: e.target.value })}
            >
              {PLATFORMS.map((name) => (
                <option
                  key={name}
                  value={name}
                  disabled={used.has(name) && name !== p.platform}
                >
                  {name}
                </option>
              ))}
            </select>
            <input
              aria-label="Handle"
              placeholder="@handle"
              value={p.handle}
              onChange={(e) => update(i, { handle: e.target.value })}
              required
            />
            <input
              aria-label="Followers"
              type="number"
              min={0}
              placeholder="Followers"
              value={p.followers}
              onChange={(e) => update(i, { followers: e.target.value })}
              required
            />
            <input
              aria-label="Engagement rate (%)"
              type="number"
              min={0}
              max={100}
              step="0.1"
              placeholder="Engagement %"
              value={p.engagementRate}
              onChange={(e) => update(i, { engagementRate: e.target.value })}
              required
            />
            <button
              type="button"
              className="btn ghost sm"
              onClick={() =>
                setPlatforms((r) => r.filter((_, idx) => idx !== i))
              }
              aria-label="Remove platform"
            >
              ✕
            </button>
          </div>
        ))}
        {platforms.length < PLATFORMS.length && (
          <button
            type="button"
            className="btn ghost sm"
            onClick={() =>
              setPlatforms((r) => [
                ...r,
                {
                  platform:
                    PLATFORMS.find((n) => !r.some((x) => x.platform === n)) ??
                    "other",
                  handle: "",
                  followers: "",
                  engagementRate: "",
                },
              ])
            }
          >
            + Add platform
          </button>
        )}
      </fieldset>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="row">
        <button className="btn primary" disabled={pending}>
          {pending ? "Saving…" : creator ? "Save changes" : "Add creator"}
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
