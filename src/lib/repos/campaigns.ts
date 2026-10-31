import type { Db } from "../db";
import { ConflictError, NotFoundError } from "../errors";
import type { CampaignInput, CampaignQuery } from "../validation";
import type { CampaignStatus } from "./types";
import { likePattern, paginated, round1, type Paginated } from "./common";

export interface Campaign {
  id: number;
  name: string;
  brand: string;
  description: string | null;
  budgetCents: number;
  startDate: string;
  deadline: string;
  status: CampaignStatus;
  createdAt: string;
  updatedAt: string;
  committedCents: number;
  paidCents: number;
  remainingCents: number;
  partnershipCount: number;
  deliverablesTotal: number;
  deliverablesApproved: number;
  progress: number; // % of deliverables approved
}

interface CampaignRow {
  id: number;
  name: string;
  brand: string;
  description: string | null;
  budget_cents: number;
  start_date: string;
  deadline: string;
  status: CampaignStatus;
  created_at: string;
  updated_at: string;
  committed_cents: number;
  paid_cents: number;
  partnership_count: number;
  deliverables_total: number;
  deliverables_approved: number;
}

const SELECT = `
  SELECT c.*,
    COALESCE((SELECT SUM(fee_cents) FROM partnerships p WHERE p.campaign_id = c.id AND p.status != 'cancelled'), 0) AS committed_cents,
    COALESCE((SELECT SUM(fee_cents) FROM partnerships p WHERE p.campaign_id = c.id AND p.payment_status = 'paid'), 0) AS paid_cents,
    (SELECT COUNT(*) FROM partnerships p WHERE p.campaign_id = c.id AND p.status != 'cancelled') AS partnership_count,
    (SELECT COUNT(*) FROM deliverables d JOIN partnerships p ON p.id = d.partnership_id
       WHERE p.campaign_id = c.id AND p.status != 'cancelled') AS deliverables_total,
    (SELECT COUNT(*) FROM deliverables d JOIN partnerships p ON p.id = d.partnership_id
       WHERE p.campaign_id = c.id AND p.status != 'cancelled' AND d.status = 'approved') AS deliverables_approved
  FROM campaigns c`;

function map(r: CampaignRow): Campaign {
  return {
    id: r.id,
    name: r.name,
    brand: r.brand,
    description: r.description,
    budgetCents: r.budget_cents,
    startDate: r.start_date,
    deadline: r.deadline,
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    committedCents: r.committed_cents,
    paidCents: r.paid_cents,
    remainingCents: r.budget_cents - r.committed_cents,
    partnershipCount: r.partnership_count,
    deliverablesTotal: r.deliverables_total,
    deliverablesApproved: r.deliverables_approved,
    progress: r.deliverables_total
      ? round1((r.deliverables_approved / r.deliverables_total) * 100)
      : 0,
  };
}

export function getCampaign(db: Db, id: number): Campaign {
  const row = db.prepare(`${SELECT} WHERE c.id = ?`).get(id) as
    CampaignRow | undefined;
  if (!row) throw new NotFoundError("Campaign");
  return map(row);
}

export function createCampaign(db: Db, input: CampaignInput): Campaign {
  const { lastInsertRowid } = db
    .prepare(
      `INSERT INTO campaigns (name, brand, description, budget_cents, start_date, deadline, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.name,
      input.brand,
      input.description,
      input.budgetCents,
      input.startDate,
      input.deadline,
      input.status,
    );
  return getCampaign(db, Number(lastInsertRowid));
}

export function updateCampaign(
  db: Db,
  id: number,
  input: CampaignInput,
): Campaign {
  const current = getCampaign(db, id);
  if (input.budgetCents < current.committedCents) {
    throw new ConflictError(
      `Budget cannot be lower than the ${current.committedCents / 100} already committed to partnerships`,
    );
  }
  db.prepare(
    `UPDATE campaigns SET name=?, brand=?, description=?, budget_cents=?, start_date=?, deadline=?, status=?,
       updated_at=datetime('now') WHERE id=?`,
  ).run(
    input.name,
    input.brand,
    input.description,
    input.budgetCents,
    input.startDate,
    input.deadline,
    input.status,
    id,
  );
  return getCampaign(db, id);
}

export function setCampaignStatus(
  db: Db,
  id: number,
  status: CampaignStatus,
): Campaign {
  getCampaign(db, id);
  db.prepare(
    "UPDATE campaigns SET status=?, updated_at=datetime('now') WHERE id=?",
  ).run(status, id);
  return getCampaign(db, id);
}

export function deleteCampaign(db: Db, id: number): void {
  getCampaign(db, id);
  const paid = db
    .prepare(
      "SELECT COUNT(*) n FROM partnerships WHERE campaign_id = ? AND payment_status = 'paid'",
    )
    .get(id) as { n: number };
  if (paid.n > 0) {
    throw new ConflictError(
      "Campaign has paid partnerships and cannot be deleted. Mark it cancelled instead.",
    );
  }
  db.prepare("DELETE FROM campaigns WHERE id = ?").run(id);
}

const SORTS: Record<
  CampaignQuery["sort"],
  { column: string; defaultOrder: "asc" | "desc" }
> = {
  newest: { column: "c.created_at", defaultOrder: "desc" },
  deadline: { column: "c.deadline", defaultOrder: "asc" },
  budget: { column: "c.budget_cents", defaultOrder: "desc" },
  name: { column: "c.name COLLATE NOCASE", defaultOrder: "asc" },
};

export function listCampaigns(
  db: Db,
  query: CampaignQuery,
): Paginated<Campaign> {
  const where: string[] = [];
  const params: Record<string, string | number> = {};
  if (query.q) {
    where.push("(c.name LIKE @q ESCAPE '\\' OR c.brand LIKE @q ESCAPE '\\')");
    params.q = likePattern(query.q);
  }
  if (query.status) {
    where.push("c.status = @status");
    params.status = query.status;
  }
  const clause = where.length ? "WHERE " + where.join(" AND ") : "";
  const total = (
    db.prepare(`SELECT COUNT(*) n FROM campaigns c ${clause}`).get(params) as {
      n: number;
    }
  ).n;
  const sort = SORTS[query.sort];
  const order = (query.order ?? sort.defaultOrder).toUpperCase();
  const rows = db
    .prepare(
      `${SELECT} ${clause} ORDER BY ${sort.column} ${order}, c.id DESC LIMIT @limit OFFSET @offset`,
    )
    .all({
      ...params,
      limit: query.limit,
      offset: (query.page - 1) * query.limit,
    }) as CampaignRow[];
  return paginated(rows.map(map), total, query.page, query.limit);
}
