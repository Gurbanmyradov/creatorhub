import type { Db } from "../db";
import { PLATFORMS } from "../schema";
import { round1 } from "./common";
import type { CampaignStatus, PartnershipStatus } from "./types";

export interface Analytics {
  totals: {
    creators: number;
    campaigns: number;
    activeCampaigns: number;
    partnerships: number;
    totalReach: number;
  };
  spend: {
    budgetCents: number;
    committedCents: number;
    paidCents: number;
    outstandingCents: number;
    budgetUtilization: number;
  };
  completion: {
    partnershipsCompleted: number;
    partnershipsTotal: number;
    partnershipCompletionRate: number;
    deliverablesApproved: number;
    deliverablesTotal: number;
    deliverableCompletionRate: number;
  };
  engagement: {
    avgEngagementRate: number;
    byPlatform: {
      platform: string;
      creators: number;
      followers: number;
      avgEngagement: number;
    }[];
  };
  campaignsByStatus: Record<CampaignStatus, number>;
  partnershipsByStatus: Record<PartnershipStatus, number>;
  topCreators: {
    id: number;
    name: string;
    niche: string;
    totalFollowers: number;
    avgEngagement: number;
  }[];
  spendByCampaign: {
    id: number;
    name: string;
    brand: string;
    budgetCents: number;
    committedCents: number;
    paidCents: number;
  }[];
}

const pct = (part: number, whole: number) =>
  whole ? round1((part / whole) * 100) : 0;
const one = <T>(db: Db, sql: string) => db.prepare(sql).get() as T;

export function getAnalytics(db: Db): Analytics {
  const counts = one<{
    creators: number;
    campaigns: number;
    active: number;
    partnerships: number;
    reach: number;
  }>(
    db,
    `SELECT (SELECT COUNT(*) FROM creators) AS creators,
            (SELECT COUNT(*) FROM campaigns) AS campaigns,
            (SELECT COUNT(*) FROM campaigns WHERE status = 'active') AS active,
            (SELECT COUNT(*) FROM partnerships WHERE status != 'cancelled') AS partnerships,
            (SELECT COALESCE(SUM(followers), 0) FROM creator_platforms) AS reach`,
  );

  const money = one<{ budget: number; committed: number; paid: number }>(
    db,
    `SELECT (SELECT COALESCE(SUM(budget_cents), 0) FROM campaigns WHERE status != 'cancelled') AS budget,
            (SELECT COALESCE(SUM(fee_cents), 0) FROM partnerships WHERE status != 'cancelled') AS committed,
            (SELECT COALESCE(SUM(fee_cents), 0) FROM partnerships WHERE payment_status = 'paid') AS paid`,
  );

  const done = one<{ pc: number; pt: number; da: number; dt: number }>(
    db,
    `SELECT (SELECT COUNT(*) FROM partnerships WHERE status = 'completed') AS pc,
            (SELECT COUNT(*) FROM partnerships WHERE status != 'cancelled') AS pt,
            (SELECT COUNT(*) FROM deliverables d JOIN partnerships p ON p.id = d.partnership_id
               WHERE p.status != 'cancelled' AND d.status = 'approved') AS da,
            (SELECT COUNT(*) FROM deliverables d JOIN partnerships p ON p.id = d.partnership_id
               WHERE p.status != 'cancelled') AS dt`,
  );

  const avgEng = one<{ a: number }>(
    db,
    "SELECT COALESCE(AVG(engagement_rate), 0) AS a FROM creator_platforms",
  ).a;
  const byPlatformRows = db
    .prepare(
      `SELECT platform, COUNT(*) creators, SUM(followers) followers, AVG(engagement_rate) avg_engagement
       FROM creator_platforms GROUP BY platform`,
    )
    .all() as {
    platform: string;
    creators: number;
    followers: number;
    avg_engagement: number;
  }[];
  const byPlatform = byPlatformRows
    .map((r) => ({
      platform: r.platform,
      creators: r.creators,
      followers: r.followers,
      avgEngagement: round1(r.avg_engagement),
    }))
    .sort(
      (a, b) =>
        PLATFORMS.indexOf(a.platform as (typeof PLATFORMS)[number]) -
        PLATFORMS.indexOf(b.platform as (typeof PLATFORMS)[number]),
    );

  const campaignsByStatus: Record<CampaignStatus, number> = {
    draft: 0,
    active: 0,
    completed: 0,
    cancelled: 0,
  };
  for (const r of db
    .prepare("SELECT status, COUNT(*) n FROM campaigns GROUP BY status")
    .all() as { status: CampaignStatus; n: number }[]) {
    campaignsByStatus[r.status] = r.n;
  }
  const partnershipsByStatus: Record<PartnershipStatus, number> = {
    proposed: 0,
    agreed: 0,
    in_progress: 0,
    completed: 0,
    cancelled: 0,
  };
  for (const r of db
    .prepare("SELECT status, COUNT(*) n FROM partnerships GROUP BY status")
    .all() as { status: PartnershipStatus; n: number }[]) {
    partnershipsByStatus[r.status] = r.n;
  }

  const topCreators = (
    db
      .prepare(
        `SELECT c.id, c.name, c.niche, SUM(p.followers) followers, AVG(p.engagement_rate) eng
         FROM creators c JOIN creator_platforms p ON p.creator_id = c.id
         GROUP BY c.id ORDER BY eng DESC, followers DESC LIMIT 5`,
      )
      .all() as {
      id: number;
      name: string;
      niche: string;
      followers: number;
      eng: number;
    }[]
  ).map((r) => ({
    id: r.id,
    name: r.name,
    niche: r.niche,
    totalFollowers: r.followers,
    avgEngagement: round1(r.eng),
  }));

  const spendByCampaign = (
    db
      .prepare(
        `SELECT c.id, c.name, c.brand, c.budget_cents,
           COALESCE(SUM(CASE WHEN p.status != 'cancelled' THEN p.fee_cents END), 0) committed,
           COALESCE(SUM(CASE WHEN p.payment_status = 'paid' THEN p.fee_cents END), 0) paid
         FROM campaigns c LEFT JOIN partnerships p ON p.campaign_id = c.id
         WHERE c.status != 'cancelled' GROUP BY c.id ORDER BY committed DESC, c.id LIMIT 5`,
      )
      .all() as {
      id: number;
      name: string;
      brand: string;
      budget_cents: number;
      committed: number;
      paid: number;
    }[]
  ).map((r) => ({
    id: r.id,
    name: r.name,
    brand: r.brand,
    budgetCents: r.budget_cents,
    committedCents: r.committed,
    paidCents: r.paid,
  }));

  return {
    totals: {
      creators: counts.creators,
      campaigns: counts.campaigns,
      activeCampaigns: counts.active,
      partnerships: counts.partnerships,
      totalReach: counts.reach,
    },
    spend: {
      budgetCents: money.budget,
      committedCents: money.committed,
      paidCents: money.paid,
      outstandingCents: Math.max(0, money.committed - money.paid),
      budgetUtilization: pct(money.committed, money.budget),
    },
    completion: {
      partnershipsCompleted: done.pc,
      partnershipsTotal: done.pt,
      partnershipCompletionRate: pct(done.pc, done.pt),
      deliverablesApproved: done.da,
      deliverablesTotal: done.dt,
      deliverableCompletionRate: pct(done.da, done.dt),
    },
    engagement: { avgEngagementRate: round1(avgEng), byPlatform },
    campaignsByStatus,
    partnershipsByStatus,
    topCreators,
    spendByCampaign,
  };
}
