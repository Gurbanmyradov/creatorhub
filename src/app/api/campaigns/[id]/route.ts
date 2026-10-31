import { idOf, readJson, run, type IdContext } from "@/lib/api";
import { getDb } from "@/lib/db";
import {
  deleteCampaign,
  getCampaign,
  setCampaignStatus,
  updateCampaign,
} from "@/lib/repos/campaigns";
import { campaignInput, campaignStatusPatch } from "@/lib/validation";

export const dynamic = "force-dynamic";

export const GET = (_: Request, ctx: IdContext) =>
  run(async () => getCampaign(getDb(), await idOf(ctx)));
export const PUT = (req: Request, ctx: IdContext) =>
  run(async () =>
    updateCampaign(
      getDb(),
      await idOf(ctx),
      await readJson(req, campaignInput),
    ),
  );
/** PATCH body: `{ "status": "active" }` */
export const PATCH = (req: Request, ctx: IdContext) =>
  run(async () =>
    setCampaignStatus(
      getDb(),
      await idOf(ctx),
      (await readJson(req, campaignStatusPatch)).status,
    ),
  );
export const DELETE = (_: Request, ctx: IdContext) =>
  run(async () => deleteCampaign(getDb(), await idOf(ctx)));
