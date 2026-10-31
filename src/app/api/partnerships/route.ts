import { readJson, readQuery, run } from "@/lib/api";
import { getDb } from "@/lib/db";
import { createPartnership, listPartnerships } from "@/lib/repos/partnerships";
import { partnershipInput, partnershipQuery } from "@/lib/validation";

export const dynamic = "force-dynamic";

export const GET = (req: Request) =>
  run(() => listPartnerships(getDb(), readQuery(req, partnershipQuery)));
export const POST = (req: Request) =>
  run(
    async () =>
      createPartnership(getDb(), await readJson(req, partnershipInput)),
    201,
  );
