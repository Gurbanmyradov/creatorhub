import { readJson, readQuery, run } from "@/lib/api";
import { getDb } from "@/lib/db";
import { createCampaign, listCampaigns } from "@/lib/repos/campaigns";
import { campaignInput, campaignQuery } from "@/lib/validation";

export const dynamic = "force-dynamic";

export const GET = (req: Request) =>
  run(() => listCampaigns(getDb(), readQuery(req, campaignQuery)));
export const POST = (req: Request) =>
  run(
    async () => createCampaign(getDb(), await readJson(req, campaignInput)),
    201,
  );
