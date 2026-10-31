import { idOf, readJson, run, type IdContext } from "@/lib/api";
import { getDb } from "@/lib/db";
import {
  deletePartnership,
  getPartnership,
  updatePartnership,
} from "@/lib/repos/partnerships";
import { partnershipPatch } from "@/lib/validation";

export const dynamic = "force-dynamic";

export const GET = (_: Request, ctx: IdContext) =>
  run(async () => getPartnership(getDb(), await idOf(ctx)));
export const PATCH = (req: Request, ctx: IdContext) =>
  run(async () =>
    updatePartnership(
      getDb(),
      await idOf(ctx),
      await readJson(req, partnershipPatch),
    ),
  );
export const DELETE = (_: Request, ctx: IdContext) =>
  run(async () => deletePartnership(getDb(), await idOf(ctx)));
