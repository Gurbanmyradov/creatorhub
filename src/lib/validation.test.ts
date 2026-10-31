import { describe, expect, it } from "vitest";
import { campaignInput, creatorInput, partnershipInput } from "./validation";

describe("validation", () => {
  it("normalises creator input", () => {
    const c = creatorInput.parse({
      name: "  Ada ",
      email: " ada@example.com ",
      phone: "",
      platforms: [
        {
          platform: "twitter",
          handle: "@ada",
          followers: "120",
          engagementRate: "3.5",
        },
      ],
    });
    expect(c).toMatchObject({
      name: "Ada",
      email: "ada@example.com",
      phone: null,
      niche: "general",
    });
    expect(c.platforms[0]).toEqual({
      platform: "twitter",
      handle: "ada",
      followers: 120,
      engagementRate: 3.5,
    });
  });

  it("rejects duplicate platforms", () => {
    const p = {
      platform: "twitch",
      handle: "x",
      followers: 1,
      engagementRate: 1,
    };
    expect(
      creatorInput.safeParse({ name: "A", email: "a@b.co", platforms: [p, p] })
        .success,
    ).toBe(false);
  });

  it("rejects impossible dates and reversed ranges", () => {
    const base = {
      name: "n",
      brand: "b",
      budgetCents: 1,
      startDate: "2026-02-01",
      deadline: "2026-03-01",
    };
    expect(campaignInput.safeParse(base).success).toBe(true);
    expect(
      campaignInput.safeParse({ ...base, startDate: "2026-02-30" }).success,
    ).toBe(false);
    expect(
      campaignInput.safeParse({ ...base, deadline: "2026-01-01" }).success,
    ).toBe(false);
  });

  it("requires positive ids and non-negative fees", () => {
    expect(
      partnershipInput.safeParse({ campaignId: 0, creatorId: 1, feeCents: 0 })
        .success,
    ).toBe(false);
    expect(
      partnershipInput.safeParse({ campaignId: 1, creatorId: 1, feeCents: -5 })
        .success,
    ).toBe(false);
    expect(
      partnershipInput.safeParse({ campaignId: 1, creatorId: 1, feeCents: 0 })
        .success,
    ).toBe(true);
  });
});
