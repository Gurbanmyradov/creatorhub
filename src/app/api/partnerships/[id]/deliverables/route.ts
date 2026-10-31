import { idOf, readJson, run, type IdContext } from "@/lib/api";
import { getDb } from "@/lib/db";
import { createDeliverable } from "@/lib/repos/partnerships";
import { deliverableInput } from "@/lib/validation";

export const dynamic = "force-dynamic";

export const POST = (req: Request, ctx: IdContext) =>
  run(
    async () =>
      createDeliverable(
        getDb(),
        await idOf(ctx),
        await readJson(req, deliverableInput),
      ),
    201,
  );
