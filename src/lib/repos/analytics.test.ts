import { describe, expect, it } from "vitest";
import { freshDb, makeCampaign, makeCreator } from "@/test/helpers";
import { seedDemo } from "../seed";
import { getAnalytics } from "./analytics";
import {
  createPartnership,
  updateDeliverable,
  updatePartnership,
} from "./partnerships";
import { partnershipInput } from "../validation";

describe("analytics", () => {
  it("returns zeros for an empty database", () => {
    const a = getAnalytics(freshDb());
    expect(a.totals).toEqual({
      creators: 0,
      campaigns: 0,
      activeCampaigns: 0,
      partnerships: 0,
      totalReach: 0,
    });
    expect(a.completion.deliverableCompletionRate).toBe(0);
    expect(a.spend.budgetUtilization).toBe(0);
  });

  it("aggregates spend, completion and engagement", () => {
    const db = freshDb();
    const camp = makeCampaign(db, { budgetCents: 100_000 });
    const cr = makeCreator(db, {
      platforms: [
        {
          platform: "tiktok",
          handle: "t",
          followers: 2000,
          engagementRate: 10,
        },
      ],
    });
    const p = createPartnership(
      db,
      partnershipInput.parse({
        campaignId: camp.id,
        creatorId: cr.id,
        feeCents: 40_000,
        status: "in_progress",
        deliverables: [{ title: "a" }, { title: "b" }],
      }),
    );
    updateDeliverable(db, p.deliverables[0].id, { status: "approved" });

    let a = getAnalytics(db);
    expect(a.totals).toMatchObject({
      creators: 1,
      campaigns: 1,
      activeCampaigns: 1,
      partnerships: 1,
      totalReach: 2000,
    });
    expect(a.spend).toMatchObject({
      budgetCents: 100_000,
      committedCents: 40_000,
      paidCents: 0,
      outstandingCents: 40_000,
      budgetUtilization: 40,
    });
    expect(a.completion).toMatchObject({
      deliverablesApproved: 1,
      deliverablesTotal: 2,
      deliverableCompletionRate: 50,
      partnershipCompletionRate: 0,
    });
    expect(a.engagement.avgEngagementRate).toBe(10);
    expect(a.engagement.byPlatform).toEqual([
      { platform: "tiktok", creators: 1, followers: 2000, avgEngagement: 10 },
    ]);

    updateDeliverable(db, p.deliverables[1].id, { status: "approved" });
    updatePartnership(db, p.id, { status: "completed" });
    updatePartnership(db, p.id, { paymentStatus: "paid" });
    a = getAnalytics(db);
    expect(a.spend).toMatchObject({ paidCents: 40_000, outstandingCents: 0 });
    expect(a.completion.partnershipCompletionRate).toBe(100);
  });

  it("seeds demo data that satisfies every business rule", () => {
    const db = freshDb();
    seedDemo(db);
    const a = getAnalytics(db);
    expect(a.totals.creators).toBe(12);
    expect(a.totals.campaigns).toBe(4);
    expect(a.campaignsByStatus).toMatchObject({
      active: 2,
      draft: 1,
      completed: 1,
    });
    expect(a.topCreators).toHaveLength(5);
    expect(a.spend.paidCents).toBeGreaterThan(0);
  });
});
