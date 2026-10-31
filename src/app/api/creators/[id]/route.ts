import { idOf, readJson, run, type IdContext } from "@/lib/api";
import { getDb } from "@/lib/db";
import { deleteCreator, getCreator, updateCreator } from "@/lib/repos/creators";
import { creatorInput } from "@/lib/validation";

export const dynamic = "force-dynamic";

export const GET = (_: Request, ctx: IdContext) =>
  run(async () => getCreator(getDb(), await idOf(ctx)));
export const PUT = (req: Request, ctx: IdContext) =>
  run(async () =>
    updateCreator(getDb(), await idOf(ctx), await readJson(req, creatorInput)),
  );
export const DELETE = (_: Request, ctx: IdContext) =>
  run(async () => deleteCreator(getDb(), await idOf(ctx)));
