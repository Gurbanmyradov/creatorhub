import { describe, expect, it } from "vitest";
import { freshDb, makeCampaign, makeCreator } from "@/test/helpers";
import { getCampaign, updateCampaign, deleteCampaign } from "./campaigns";
import {
  createDeliverable,
  createPartnership,
  deletePartnership,
  getPartnership,
  listPartnerships,
  updateDeliverable,
  updatePartnership,
} from "./partnerships";
import { partnershipInput, partnershipQuery } from "../validation";

const input = (
  campaignId: number,
  creatorId: number,
  over: Record<string, unknown> = {},
) =>
  partnershipInput.parse({ campaignId, creatorId, feeCents: 10_000, ...over });

describe("partnerships", () => {
  it("creates a partnership with deliverables and derives approval status", () => {
    const db = freshDb();
    const camp = makeCampaign(db);
    const cr = makeCreator(db);
    const p = createPartnership(
      db,
      input(camp.id, cr.id, {
        deliverables: [{ title: "Reel" }, { title: "Story", type: "story" }],
      }),
    );
    expect(p.deliverablesTotal).toBe(2);
    expect(p.approvalStatus).toBe("pending");

    updateDeliverable(db, p.deliverables[0].id, { status: "approved" });
    expect(getPartnership(db, p.id).approvalStatus).toBe("pending");
    updateDeliverable(db, p.deliverables[1].id, { status: "approved" });
    expect(getPartnership(db, p.id)).toMatchObject({
      approvalStatus: "approved",
      deliverablesApproved: 2,
    });
  });

  it("prevents duplicates and unknown references", () => {
    const db = freshDb();
    const camp = makeCampaign(db);
    const cr = makeCreator(db);
    createPartnership(db, input(camp.id, cr.id));
    expect(() => createPartnership(db, input(camp.id, cr.id))).toThrow(
      /already part/,
    );
    expect(() => createPartnership(db, input(999, cr.id))).toThrow(
      /Campaign not found/,
    );
    expect(() => createPartnership(db, input(camp.id, 999))).toThrow(
      /Creator not found/,
    );
  });

  it("enforces the campaign budget", () => {
    const db = freshDb();
    const camp = makeCampaign(db, { budgetCents: 15_000 });
    const [a, b] = [makeCreator(db), makeCreator(db)];
    const pa = createPartnership(
      db,
      input(camp.id, a.id, { feeCents: 10_000 }),
    );
    expect(() =>
      createPartnership(db, input(camp.id, b.id, { feeCents: 6_000 })),
    ).toThrow(/exceeds the campaign budget/);
    expect(getCampaign(db, camp.id)).toMatchObject({
      committedCents: 10_000,
      remainingCents: 5_000,
    });

    // cancelled partnerships release their budget
    updatePartnership(db, pa.id, { status: "cancelled" });
    expect(
      createPartnership(db, input(camp.id, b.id, { feeCents: 15_000 }))
        .feeCents,
    ).toBe(15_000);
    // ...but cannot be revived beyond the budget
    expect(() => updatePartnership(db, pa.id, { status: "agreed" })).toThrow(
      /exceeds/,
    );
  });

  it("does not allow lowering a campaign budget below committed spend", () => {
    const db = freshDb();
    const camp = makeCampaign(db);
    createPartnership(
      db,
      input(camp.id, makeCreator(db).id, { feeCents: 50_000 }),
    );
    expect(() =>
      updateCampaign(db, camp.id, {
        name: "x",
        brand: "y",
        description: null,
        budgetCents: 10_000,
        startDate: "2026-01-01",
        deadline: "2026-02-01",
        status: "active",
      }),
    ).toThrow(/Budget cannot be lower/);
  });

  it("requires approved deliverables to complete and a started partnership to be paid", () => {
    const db = freshDb();
    const camp = makeCampaign(db);
    const p = createPartnership(
      db,
      input(camp.id, makeCreator(db).id, { deliverables: [{ title: "Reel" }] }),
    );
    expect(() =>
      updatePartnership(db, p.id, { paymentStatus: "paid" }),
    ).toThrow(/proposed/);
    expect(() => updatePartnership(db, p.id, { status: "completed" })).toThrow(
      /approved/,
    );

    updateDeliverable(db, p.deliverables[0].id, { status: "approved" });
    const done = updatePartnership(db, p.id, { status: "completed" });
    expect(done.status).toBe("completed");
    expect(
      updatePartnership(db, p.id, { paymentStatus: "paid" }).paymentStatus,
    ).toBe("paid");
    expect(() => deletePartnership(db, p.id)).toThrow(/paid/);
    expect(() => deleteCampaign(db, camp.id)).toThrow(/paid/);
  });

  it("requires feedback when requesting changes", () => {
    const db = freshDb();
    const p = createPartnership(
      db,
      input(makeCampaign(db).id, makeCreator(db).id, {
        deliverables: [{ title: "Reel" }],
      }),
    );
    const id = p.deliverables[0].id;
    expect(() =>
      updateDeliverable(db, id, { status: "changes_requested" }),
    ).toThrow(/Feedback/);
    const d = updateDeliverable(db, id, {
      status: "changes_requested",
      feedback: "Shorter intro",
    });
    expect(d.feedback).toBe("Shorter intro");
    expect(getPartnership(db, p.id).approvalStatus).toBe("changes_requested");
  });

  it("blocks new partnerships/deliverables on closed campaigns and partnerships", () => {
    const db = freshDb();
    const done = makeCampaign(db, { status: "completed" });
    expect(() =>
      createPartnership(db, input(done.id, makeCreator(db).id)),
    ).toThrow(/completed campaign/);
    const p = createPartnership(
      db,
      input(makeCampaign(db).id, makeCreator(db).id),
    );
    updatePartnership(db, p.id, { status: "cancelled" });
    expect(() =>
      createDeliverable(db, p.id, { title: "x", type: "post", dueDate: null }),
    ).toThrow(/cancelled partnership/);
  });

  it("lists and filters partnerships", () => {
    const db = freshDb();
    const c1 = makeCampaign(db);
    const c2 = makeCampaign(db, { name: "Second" });
    const cr = makeCreator(db);
    createPartnership(db, input(c1.id, cr.id));
    createPartnership(db, input(c2.id, cr.id, { status: "agreed" }));
    expect(listPartnerships(db, partnershipQuery.parse({})).total).toBe(2);
    expect(
      listPartnerships(db, partnershipQuery.parse({ campaignId: c2.id }))
        .items[0].campaign.name,
    ).toBe("Second");
    expect(
      listPartnerships(db, partnershipQuery.parse({ status: "agreed" })).total,
    ).toBe(1);
  });
});
