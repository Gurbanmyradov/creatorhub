import { readJson, readQuery, run } from "@/lib/api";
import { getDb } from "@/lib/db";
import { createCreator, listCreators } from "@/lib/repos/creators";
import { creatorInput, creatorQuery } from "@/lib/validation";

export const dynamic = "force-dynamic";

export const GET = (req: Request) =>
  run(() => listCreators(getDb(), readQuery(req, creatorQuery)));
export const POST = (req: Request) =>
  run(
    async () => createCreator(getDb(), await readJson(req, creatorInput)),
    201,
  );
