import { getDb } from "../src/lib/db";
import { seedDemo } from "../src/lib/seed";

const db = getDb();
const { n } = db.prepare("SELECT COUNT(*) n FROM creators").get() as {
  n: number;
};
if (n > 0 && !process.argv.includes("--force")) {
  console.log(
    `Database already has ${n} creators. Re-run with --force to wipe and reseed.`,
  );
  process.exit(0);
}
if (n > 0) {
  db.exec(
    "DELETE FROM deliverables; DELETE FROM partnerships; DELETE FROM campaigns; DELETE FROM creator_platforms; DELETE FROM creators;",
  );
}
seedDemo(db);
console.log("Seeded demo data.");
