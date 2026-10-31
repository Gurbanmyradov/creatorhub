import { createDb } from "@/lib/db";
import { createCampaign } from "@/lib/repos/campaigns";
import { createCreator } from "@/lib/repos/creators";
import { campaignInput, creatorInput } from "@/lib/validation";

export const freshDb = () => createDb(":memory:");

export function makeCreator(
  db: ReturnType<typeof freshDb>,
  over: Record<string, unknown> = {},
) {
  const n = Math.random().toString(36).slice(2, 8);
  return createCreator(
    db,
    creatorInput.parse({
      name: `Creator ${n}`,
      email: `${n}@example.com`,
      niche: "tech",
      platforms: [
        {
          platform: "instagram",
          handle: n,
          followers: 10_000,
          engagementRate: 4,
        },
      ],
      ...over,
    }),
  );
}

export function makeCampaign(
  db: ReturnType<typeof freshDb>,
  over: Record<string, unknown> = {},
) {
  return createCampaign(
    db,
    campaignInput.parse({
      name: "Test campaign",
      brand: "Acme",
      budgetCents: 100_000,
      startDate: "2026-01-01",
      deadline: "2026-03-01",
      status: "active",
      ...over,
    }),
  );
}
