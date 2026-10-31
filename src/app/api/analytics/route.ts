import { run } from "@/lib/api";
import { getDb } from "@/lib/db";
import { getAnalytics } from "@/lib/repos/analytics";

export const dynamic = "force-dynamic";

export const GET = () => run(() => getAnalytics(getDb()));
