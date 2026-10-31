import type { Db } from "../db";
import { ConflictError, NotFoundError } from "../errors";
import type { Platform } from "../schema";
import type { CreatorInput, CreatorQuery } from "../validation";
import { likePattern, paginated, round1, type Paginated } from "./common";

export interface PlatformStat {
  platform: Platform;
  handle: string;
  followers: number;
  engagementRate: number;
}
export interface Creator {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  niche: string;
  country: string | null;
  bio: string | null;
  createdAt: string;
  updatedAt: string;
  platforms: PlatformStat[];
  totalFollowers: number;
  avgEngagement: number;
  partnershipCount: number;
}

interface CreatorRow {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  niche: string;
  country: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
}
interface PlatformRow {
  creator_id: number;
  platform: Platform;
  handle: string;
  followers: number;
  engagement_rate: number;
}

function hydrate(db: Db, rows: CreatorRow[]): Creator[] {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const marks = ids.map(() => "?").join(",");
  const platformRows = db
    .prepare(
      `SELECT creator_id, platform, handle, followers, engagement_rate
       FROM creator_platforms WHERE creator_id IN (${marks}) ORDER BY followers DESC`,
    )
    .all(...ids) as PlatformRow[];
  const counts = db
    .prepare(
      `SELECT creator_id, COUNT(*) n FROM partnerships WHERE creator_id IN (${marks}) GROUP BY creator_id`,
    )
    .all(...ids) as { creator_id: number; n: number }[];
  const countById = new Map(counts.map((c) => [c.creator_id, c.n]));

  return rows.map((r) => {
    const platforms = platformRows
      .filter((p) => p.creator_id === r.id)
      .map((p) => ({
        platform: p.platform,
        handle: p.handle,
        followers: p.followers,
        engagementRate: p.engagement_rate,
      }));
    const totalFollowers = platforms.reduce((s, p) => s + p.followers, 0);
    const avgEngagement = platforms.length
      ? round1(
          platforms.reduce((s, p) => s + p.engagementRate, 0) /
            platforms.length,
        )
      : 0;
    return {
      id: r.id,
      name: r.name,
      email: r.email,
      phone: r.phone,
      niche: r.niche,
      country: r.country,
      bio: r.bio,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      platforms,
      totalFollowers,
      avgEngagement,
      partnershipCount: countById.get(r.id) ?? 0,
    };
  });
}

function writePlatforms(
  db: Db,
  creatorId: number,
  platforms: CreatorInput["platforms"],
) {
  db.prepare("DELETE FROM creator_platforms WHERE creator_id = ?").run(
    creatorId,
  );
  const insert = db.prepare(
    `INSERT INTO creator_platforms (creator_id, platform, handle, followers, engagement_rate)
     VALUES (?, ?, ?, ?, ?)`,
  );
  for (const p of platforms)
    insert.run(creatorId, p.platform, p.handle, p.followers, p.engagementRate);
}

function assertEmailFree(db: Db, email: string, exceptId?: number) {
  const row = db
    .prepare("SELECT id FROM creators WHERE email = ?")
    .get(email) as { id: number } | undefined;
  if (row && row.id !== exceptId)
    throw new ConflictError("A creator with this email already exists");
}

export function createCreator(db: Db, input: CreatorInput): Creator {
  return db.transaction(() => {
    assertEmailFree(db, input.email);
    const { lastInsertRowid } = db
      .prepare(
        "INSERT INTO creators (name, email, phone, niche, country, bio) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .run(
        input.name,
        input.email,
        input.phone,
        input.niche,
        input.country,
        input.bio,
      );
    const id = Number(lastInsertRowid);
    writePlatforms(db, id, input.platforms);
    return getCreator(db, id);
  })();
}

export function getCreator(db: Db, id: number): Creator {
  const row = db.prepare("SELECT * FROM creators WHERE id = ?").get(id) as
    CreatorRow | undefined;
  if (!row) throw new NotFoundError("Creator");
  return hydrate(db, [row])[0];
}

export function updateCreator(
  db: Db,
  id: number,
  input: CreatorInput,
): Creator {
  return db.transaction(() => {
    getCreator(db, id);
    assertEmailFree(db, input.email, id);
    db.prepare(
      `UPDATE creators SET name=?, email=?, phone=?, niche=?, country=?, bio=?, updated_at=datetime('now')
       WHERE id=?`,
    ).run(
      input.name,
      input.email,
      input.phone,
      input.niche,
      input.country,
      input.bio,
      id,
    );
    writePlatforms(db, id, input.platforms);
    return getCreator(db, id);
  })();
}

export function deleteCreator(db: Db, id: number): void {
  getCreator(db, id);
  const used = db
    .prepare("SELECT COUNT(*) n FROM partnerships WHERE creator_id = ?")
    .get(id) as { n: number };
  if (used.n > 0) {
    throw new ConflictError(
      `Creator has ${used.n} partnership(s). Remove or cancel them before deleting the creator.`,
    );
  }
  db.prepare("DELETE FROM creators WHERE id = ?").run(id);
}

const SORTS: Record<
  CreatorQuery["sort"],
  { column: string; defaultOrder: "asc" | "desc" }
> = {
  name: { column: "name COLLATE NOCASE", defaultOrder: "asc" },
  followers: { column: "total_followers", defaultOrder: "desc" },
  engagement: { column: "avg_engagement", defaultOrder: "desc" },
  newest: { column: "created_at", defaultOrder: "desc" },
};

export function listCreators(db: Db, query: CreatorQuery): Paginated<Creator> {
  const where: string[] = [];
  const having: string[] = [];
  const params: Record<string, string | number> = {};

  if (query.q) {
    where.push(
      `(c.name LIKE @q ESCAPE '\\' OR c.email LIKE @q ESCAPE '\\' OR c.niche LIKE @q ESCAPE '\\'
        OR EXISTS (SELECT 1 FROM creator_platforms x WHERE x.creator_id = c.id AND x.handle LIKE @q ESCAPE '\\'))`,
    );
    params.q = likePattern(query.q);
  }
  if (query.platform) {
    where.push(
      "EXISTS (SELECT 1 FROM creator_platforms x WHERE x.creator_id = c.id AND x.platform = @platform)",
    );
    params.platform = query.platform;
  }
  if (query.niche) {
    where.push("c.niche = @niche COLLATE NOCASE");
    params.niche = query.niche;
  }
  if (query.country) {
    where.push("c.country = @country COLLATE NOCASE");
    params.country = query.country;
  }
  if (query.minFollowers !== undefined) {
    having.push("total_followers >= @minFollowers");
    params.minFollowers = query.minFollowers;
  }
  if (query.minEngagement !== undefined) {
    having.push("avg_engagement >= @minEngagement");
    params.minEngagement = query.minEngagement;
  }

  const inner = `
    SELECT c.*, COALESCE(SUM(p.followers), 0) AS total_followers,
           COALESCE(AVG(p.engagement_rate), 0) AS avg_engagement
    FROM creators c LEFT JOIN creator_platforms p ON p.creator_id = c.id
    ${where.length ? "WHERE " + where.join(" AND ") : ""}
    GROUP BY c.id
    ${having.length ? "HAVING " + having.join(" AND ") : ""}`;

  const total = (
    db.prepare(`SELECT COUNT(*) n FROM (${inner})`).get(params) as { n: number }
  ).n;
  const sort = SORTS[query.sort];
  const order = (query.order ?? sort.defaultOrder).toUpperCase();
  const rows = db
    .prepare(
      `${inner} ORDER BY ${sort.column} ${order}, id ASC LIMIT @limit OFFSET @offset`,
    )
    .all({
      ...params,
      limit: query.limit,
      offset: (query.page - 1) * query.limit,
    }) as CreatorRow[];

  return paginated(hydrate(db, rows), total, query.page, query.limit);
}

export function listNiches(db: Db): string[] {
  return (
    db
      .prepare(
        "SELECT DISTINCT niche FROM creators ORDER BY niche COLLATE NOCASE",
      )
      .all() as { niche: string }[]
  ).map((r) => r.niche);
}
