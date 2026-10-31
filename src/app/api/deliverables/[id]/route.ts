import { idOf, readJson, run, type IdContext } from "@/lib/api";
import { getDb } from "@/lib/db";
import {
  deleteDeliverable,
  getDeliverable,
  updateDeliverable,
} from "@/lib/repos/partnerships";
import { deliverablePatch } from "@/lib/validation";

export const dynamic = "force-dynamic";

export const GET = (_: Request, ctx: IdContext) =>
  run(async () => getDeliverable(getDb(), await idOf(ctx)));
export const PATCH = (req: Request, ctx: IdContext) =>
  run(async () =>
    updateDeliverable(
      getDb(),
      await idOf(ctx),
      await readJson(req, deliverablePatch),
    ),
  );
export const DELETE = (_: Request, ctx: IdContext) =>
  run(async () => deleteDeliverable(getDb(), await idOf(ctx)));
