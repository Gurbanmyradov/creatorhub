import { run } from "@/lib/api";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export const GET = () =>
  run(() => {
    getDb().prepare("SELECT 1").get();
    return { status: "ok" };
  });
