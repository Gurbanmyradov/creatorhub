import type { Db } from "../db";
import { ConflictError, NotFoundError } from "../errors";
import type { z } from "zod";
import type {
  deliverableInput,
  deliverablePatch,
  partnershipInput,
  partnershipPatch,
  PartnershipQuery,
} from "../validation";
import { paginated, type Paginated } from "./common";
import type {
  DeliverableStatus,
  DeliverableType,
  PartnershipStatus,
  PaymentStatus,
} from "./types";

type PartnershipInput = z.infer<typeof partnershipInput>;
type PartnershipPatch = z.infer<typeof partnershipPatch>;
type DeliverableInput = z.infer<typeof deliverableInput>;
type DeliverablePatch = z.infer<typeof deliverablePatch>;

export interface Deliverable {
  id: number;
  partnershipId: number;
  title: string;
  type: DeliverableType;
  dueDate: string | null;
  status: DeliverableStatus;
  feedback: string | null;
}
export type ApprovalStatus =
  "none" | "pending" | "changes_requested" | "approved";
export interface Partnership {
  id: number;
  campaignId: number;
  creatorId: number;
  feeCents: number;
  status: PartnershipStatus;
  paymentStatus: PaymentStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  creator: { id: number; name: string; email: string };
  campaign: { id: number; name: string; brand: string };
  deliverables: Deliverable[];
  deliverablesTotal: number;
  deliverablesApproved: number;
  /** Derived: none (no deliverables) | pending | changes_requested | approved (all approved). */
  approvalStatus: ApprovalStatus;
}

interface Row {
  id: number;
  campaign_id: number;
  creator_id: number;
  fee_cents: number;
  status: PartnershipStatus;
  payment_status: PaymentStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  creator_name: string;
  creator_email: string;
  campaign_name: string;
  campaign_brand: string;
}
interface DeliverableRow {
  id: number;
  partnership_id: number;
  title: string;
  type: DeliverableType;
  due_date: string | null;
  status: DeliverableStatus;
  feedback: string | null;
}

const SELECT = `
  SELECT p.*, cr.name AS creator_name, cr.email AS creator_email,
         ca.name AS campaign_name, ca.brand AS campaign_brand
  FROM partnerships p
  JOIN creators cr ON cr.id = p.creator_id
  JOIN campaigns ca ON ca.id = p.campaign_id`;

const mapDeliverable = (d: DeliverableRow): Deliverable => ({
  id: d.id,
  partnershipId: d.partnership_id,
  title: d.title,
  type: d.type,
  dueDate: d.due_date,
  status: d.status,
  feedback: d.feedback,
});

export function approvalOf(
  deliverables: Pick<Deliverable, "status">[],
): ApprovalStatus {
  if (deliverables.length === 0) return "none";
  if (deliverables.every((d) => d.status === "approved")) return "approved";
  if (deliverables.some((d) => d.status === "changes_requested"))
    return "changes_requested";
  return "pending";
}

function hydrate(db: Db, rows: Row[]): Partnership[] {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const dRows = db
    .prepare(
      `SELECT * FROM deliverables WHERE partnership_id IN (${ids.map(() => "?").join(",")})
       ORDER BY COALESCE(due_date, '9999-12-31'), id`,
    )
    .all(...ids) as DeliverableRow[];
  return rows.map((r) => {
    const deliverables = dRows
      .filter((d) => d.partnership_id === r.id)
      .map(mapDeliverable);
    return {
      id: r.id,
      campaignId: r.campaign_id,
      creatorId: r.creator_id,
      feeCents: r.fee_cents,
      status: r.status,
      paymentStatus: r.payment_status,
      notes: r.notes,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      creator: {
        id: r.creator_id,
        name: r.creator_name,
        email: r.creator_email,
      },
      campaign: {
        id: r.campaign_id,
        name: r.campaign_name,
        brand: r.campaign_brand,
      },
      deliverables,
      deliverablesTotal: deliverables.length,
      deliverablesApproved: deliverables.filter((d) => d.status === "approved")
        .length,
      approvalStatus: approvalOf(deliverables),
    };
  });
}

export function getPartnership(db: Db, id: number): Partnership {
  const row = db.prepare(`${SELECT} WHERE p.id = ?`).get(id) as Row | undefined;
  if (!row) throw new NotFoundError("Partnership");
  return hydrate(db, [row])[0];
}

function committedExcluding(
  db: Db,
  campaignId: number,
  exceptPartnershipId?: number,
): number {
  const r = db
    .prepare(
      `SELECT COALESCE(SUM(fee_cents), 0) AS s FROM partnerships
       WHERE campaign_id = ? AND status != 'cancelled' AND id != ?`,
    )
    .get(campaignId, exceptPartnershipId ?? -1) as { s: number };
  return r.s;
}

function assertWithinBudget(
  db: Db,
  campaignId: number,
  feeCents: number,
  exceptId?: number,
) {
  const campaign = db
    .prepare("SELECT budget_cents FROM campaigns WHERE id = ?")
    .get(campaignId) as { budget_cents: number } | undefined;
  if (!campaign) throw new NotFoundError("Campaign");
  const committed = committedExcluding(db, campaignId, exceptId);
  if (committed + feeCents > campaign.budget_cents) {
    const left = campaign.budget_cents - committed;
    throw new ConflictError(
      `Fee exceeds the campaign budget: ${(left / 100).toFixed(2)} remaining, ${(feeCents / 100).toFixed(2)} requested`,
    );
  }
}

export function createPartnership(
  db: Db,
  input: PartnershipInput,
): Partnership {
  return db.transaction(() => {
    const campaign = db
      .prepare("SELECT status FROM campaigns WHERE id = ?")
      .get(input.campaignId) as { status: string } | undefined;
    if (!campaign) throw new NotFoundError("Campaign");
    if (!db.prepare("SELECT 1 FROM creators WHERE id = ?").get(input.creatorId))
      throw new NotFoundError("Creator");
    if (campaign.status === "completed" || campaign.status === "cancelled") {
      throw new ConflictError(
        `Cannot add creators to a ${campaign.status} campaign`,
      );
    }
    if (
      db
        .prepare(
          "SELECT 1 FROM partnerships WHERE campaign_id = ? AND creator_id = ?",
        )
        .get(input.campaignId, input.creatorId)
    ) {
      throw new ConflictError("This creator is already part of the campaign");
    }
    if (input.status !== "cancelled")
      assertWithinBudget(db, input.campaignId, input.feeCents);

    const { lastInsertRowid } = db
      .prepare(
        "INSERT INTO partnerships (campaign_id, creator_id, fee_cents, status, notes) VALUES (?, ?, ?, ?, ?)",
      )
      .run(
        input.campaignId,
        input.creatorId,
        input.feeCents,
        input.status,
        input.notes,
      );
    const id = Number(lastInsertRowid);
    for (const d of input.deliverables) insertDeliverable(db, id, d);
    return getPartnership(db, id);
  })();
}

export function updatePartnership(
  db: Db,
  id: number,
  patch: PartnershipPatch,
): Partnership {
  return db.transaction(() => {
    const current = getPartnership(db, id);
    const next = {
      feeCents: patch.feeCents ?? current.feeCents,
      status: patch.status ?? current.status,
      paymentStatus: patch.paymentStatus ?? current.paymentStatus,
      notes: patch.notes === undefined ? current.notes : patch.notes,
    };

    if (
      next.status !== "cancelled" &&
      (patch.feeCents !== undefined || current.status === "cancelled")
    ) {
      assertWithinBudget(db, current.campaignId, next.feeCents, id);
    }
    if (
      next.status === "completed" &&
      current.approvalStatus !== "approved" &&
      current.deliverablesTotal > 0
    ) {
      throw new ConflictError(
        "All deliverables must be approved before a partnership can be completed",
      );
    }
    if (
      next.paymentStatus === "paid" &&
      (next.status === "proposed" || next.status === "cancelled")
    ) {
      throw new ConflictError(
        `A ${next.status} partnership cannot be marked as paid`,
      );
    }

    db.prepare(
      `UPDATE partnerships SET fee_cents=?, status=?, payment_status=?, notes=?, updated_at=datetime('now') WHERE id=?`,
    ).run(next.feeCents, next.status, next.paymentStatus, next.notes, id);
    return getPartnership(db, id);
  })();
}

export function deletePartnership(db: Db, id: number): void {
  const p = getPartnership(db, id);
  if (p.paymentStatus === "paid") {
    throw new ConflictError(
      "A paid partnership cannot be deleted. Cancel it instead.",
    );
  }
  db.prepare("DELETE FROM partnerships WHERE id = ?").run(id);
}

export function listPartnerships(
  db: Db,
  query: PartnershipQuery,
): Paginated<Partnership> {
  const where: string[] = [];
  const params: Record<string, string | number> = {};
  const add = (
    sql: string,
    key: string,
    value: string | number | undefined,
  ) => {
    if (value === undefined) return;
    where.push(sql);
    params[key] = value;
  };
  add("p.campaign_id = @campaignId", "campaignId", query.campaignId);
  add("p.creator_id = @creatorId", "creatorId", query.creatorId);
  add("p.status = @status", "status", query.status);
  add(
    "p.payment_status = @paymentStatus",
    "paymentStatus",
    query.paymentStatus,
  );
  const clause = where.length ? "WHERE " + where.join(" AND ") : "";
  const total = (
    db
      .prepare(`SELECT COUNT(*) n FROM partnerships p ${clause}`)
      .get(params) as { n: number }
  ).n;
  const rows = db
    .prepare(
      `${SELECT} ${clause} ORDER BY p.created_at DESC, p.id DESC LIMIT @limit OFFSET @offset`,
    )
    .all({
      ...params,
      limit: query.limit,
      offset: (query.page - 1) * query.limit,
    }) as Row[];
  return paginated(hydrate(db, rows), total, query.page, query.limit);
}

// ---------------- Deliverables ----------------

function insertDeliverable(
  db: Db,
  partnershipId: number,
  d: DeliverableInput,
): number {
  const { lastInsertRowid } = db
    .prepare(
      "INSERT INTO deliverables (partnership_id, title, type, due_date) VALUES (?, ?, ?, ?)",
    )
    .run(partnershipId, d.title, d.type, d.dueDate);
  return Number(lastInsertRowid);
}

export function getDeliverable(db: Db, id: number): Deliverable {
  const row = db.prepare("SELECT * FROM deliverables WHERE id = ?").get(id) as
    DeliverableRow | undefined;
  if (!row) throw new NotFoundError("Deliverable");
  return mapDeliverable(row);
}

export function createDeliverable(
  db: Db,
  partnershipId: number,
  input: DeliverableInput,
): Deliverable {
  const p = getPartnership(db, partnershipId);
  if (p.status === "cancelled" || p.status === "completed") {
    throw new ConflictError(
      `Cannot add deliverables to a ${p.status} partnership`,
    );
  }
  return getDeliverable(db, insertDeliverable(db, partnershipId, input));
}

export function updateDeliverable(
  db: Db,
  id: number,
  patch: DeliverablePatch,
): Deliverable {
  const current = getDeliverable(db, id);
  const next = {
    title: patch.title ?? current.title,
    type: patch.type ?? current.type,
    dueDate: patch.dueDate === undefined ? current.dueDate : patch.dueDate,
    status: patch.status ?? current.status,
    feedback: patch.feedback === undefined ? current.feedback : patch.feedback,
  };
  if (next.status === "changes_requested" && !next.feedback) {
    throw new ConflictError("Feedback is required when requesting changes");
  }
  db.prepare(
    `UPDATE deliverables SET title=?, type=?, due_date=?, status=?, feedback=?, updated_at=datetime('now') WHERE id=?`,
  ).run(next.title, next.type, next.dueDate, next.status, next.feedback, id);
  return getDeliverable(db, id);
}

export function deleteDeliverable(db: Db, id: number): void {
  getDeliverable(db, id);
  db.prepare("DELETE FROM deliverables WHERE id = ?").run(id);
}
