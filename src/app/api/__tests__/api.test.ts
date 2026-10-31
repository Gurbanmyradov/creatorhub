import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "@/lib/db";
import * as creators from "../creators/route";
import * as creator from "../creators/[id]/route";
import * as campaigns from "../campaigns/route";
import * as campaign from "../campaigns/[id]/route";
import * as partnerships from "../partnerships/route";
import * as partnership from "../partnerships/[id]/route";
import * as deliverables from "../partnerships/[id]/deliverables/route";
import * as deliverable from "../deliverables/[id]/route";
import * as analytics from "../analytics/route";
import * as health from "../health/route";

const ctx = (id: number | string) => ({
  params: Promise.resolve({ id: String(id) }),
});
const req = (path: string, method = "GET", body?: unknown) =>
  new Request(`http://localhost${path}`, {
    method,
    headers: { "content-type": "application/json" },
    body:
      body === undefined
        ? undefined
        : typeof body === "string"
          ? body
          : JSON.stringify(body),
  });
const json = async (res: Response) => ({
  status: res.status,
  body: res.status === 204 ? null : await res.json(),
});

const creatorBody = (n = 1) => ({
  name: `Creator ${n}`,
  email: `c${n}@example.com`,
  niche: "tech",
  platforms: [
    {
      platform: "youtube",
      handle: "@chan",
      followers: 1000,
      engagementRate: 5.5,
    },
  ],
});
const campaignBody = {
  name: "Launch",
  brand: "Acme",
  budgetCents: 50_000,
  startDate: "2026-01-01",
  deadline: "2026-02-01",
  status: "active",
};

beforeEach(() => {
  process.env.DATABASE_PATH = ":memory:";
  resetDb();
});
afterEach(() => resetDb());

describe("API", () => {
  it("health check", async () => {
    expect(await json(await health.GET())).toEqual({
      status: 200,
      body: { status: "ok" },
    });
  });

  it("creators CRUD", async () => {
    const created = await json(
      await creators.POST(req("/api/creators", "POST", creatorBody())),
    );
    expect(created.status).toBe(201);
    expect(created.body.platforms[0]).toMatchObject({
      handle: "chan",
      followers: 1000,
    });
    const id = created.body.id;

    expect(
      (await json(await creator.GET(req(`/api/creators/${id}`), ctx(id)))).body
        .name,
    ).toBe("Creator 1");

    const put = await json(
      await creator.PUT(
        req(`/api/creators/${id}`, "PUT", {
          ...creatorBody(),
          name: "Renamed",
        }),
        ctx(id),
      ),
    );
    expect(put.body.name).toBe("Renamed");

    const list = await json(
      await creators.GET(
        req("/api/creators?q=rename&platform=youtube&minFollowers=500"),
      ),
    );
    expect(list.body).toMatchObject({ total: 1, page: 1 });

    expect(
      (
        await json(
          await creator.DELETE(req(`/api/creators/${id}`, "DELETE"), ctx(id)),
        )
      ).status,
    ).toBe(204);
    expect(
      (await json(await creator.GET(req(`/api/creators/${id}`), ctx(id))))
        .status,
    ).toBe(404);
  });

  it("validates input with field-level errors", async () => {
    const bad = await json(
      await creators.POST(
        req("/api/creators", "POST", {
          name: "",
          email: "nope",
          platforms: [
            {
              platform: "myspace",
              handle: "x",
              followers: -1,
              engagementRate: 101,
            },
          ],
        }),
      ),
    );
    expect(bad.status).toBe(400);
    const paths = bad.body.details.map((d: { path: string }) => d.path);
    expect(paths).toEqual(
      expect.arrayContaining([
        "name",
        "email",
        "platforms.0.platform",
        "platforms.0.followers",
        "platforms.0.engagementRate",
      ]),
    );

    expect(
      (
        await json(
          await creators.POST(req("/api/creators", "POST", "{not json")),
        )
      ).status,
    ).toBe(400);
    expect(
      (await json(await creators.GET(req("/api/creators?sort=bogus")))).status,
    ).toBe(400);
    expect(
      (await json(await creator.GET(req("/api/creators/abc"), ctx("abc"))))
        .status,
    ).toBe(400);
  });

  it("returns 409 for duplicate email", async () => {
    await creators.POST(req("/api/creators", "POST", creatorBody()));
    const dup = await json(
      await creators.POST(req("/api/creators", "POST", creatorBody())),
    );
    expect(dup.status).toBe(409);
  });

  it("campaign validation and status patch", async () => {
    const bad = await json(
      await campaigns.POST(
        req("/api/campaigns", "POST", {
          ...campaignBody,
          deadline: "2025-01-01",
        }),
      ),
    );
    expect(bad.status).toBe(400);
    expect(bad.body.details[0].path).toBe("deadline");

    const c = await json(
      await campaigns.POST(req("/api/campaigns", "POST", campaignBody)),
    );
    expect(c.status).toBe(201);
    const patched = await json(
      await campaign.PATCH(
        req(`/api/campaigns/${c.body.id}`, "PATCH", { status: "completed" }),
        ctx(c.body.id),
      ),
    );
    expect(patched.body.status).toBe("completed");
    expect(
      (await json(await campaigns.GET(req("/api/campaigns?status=completed"))))
        .body.total,
    ).toBe(1);
  });

  it("runs the full partnership workflow", async () => {
    const cr = (
      await json(
        await creators.POST(req("/api/creators", "POST", creatorBody())),
      )
    ).body;
    const ca = (
      await json(
        await campaigns.POST(req("/api/campaigns", "POST", campaignBody)),
      )
    ).body;

    const over = await json(
      await partnerships.POST(
        req("/api/partnerships", "POST", {
          campaignId: ca.id,
          creatorId: cr.id,
          feeCents: 999_999,
        }),
      ),
    );
    expect(over.status).toBe(409);

    const p = (
      await json(
        await partnerships.POST(
          req("/api/partnerships", "POST", {
            campaignId: ca.id,
            creatorId: cr.id,
            feeCents: 20_000,
            status: "in_progress",
            deliverables: [
              { title: "Launch video", type: "video", dueDate: "2026-01-20" },
            ],
          }),
        ),
      )
    ).body;
    expect(p).toMatchObject({
      approvalStatus: "pending",
      creator: { name: "Creator 1" },
      campaign: { brand: "Acme" },
    });

    const early = await json(
      await partnership.PATCH(
        req(`/api/partnerships/${p.id}`, "PATCH", { status: "completed" }),
        ctx(p.id),
      ),
    );
    expect(early.status).toBe(409);

    const extra = await json(
      await deliverables.POST(
        req(`/api/partnerships/${p.id}/deliverables`, "POST", {
          title: "Story",
        }),
        ctx(p.id),
      ),
    );
    expect(extra.status).toBe(201);
    for (const d of [p.deliverables[0].id, extra.body.id]) {
      const r = await json(
        await deliverable.PATCH(
          req(`/api/deliverables/${d}`, "PATCH", { status: "approved" }),
          ctx(d),
        ),
      );
      expect(r.body.status).toBe("approved");
    }
    expect(
      (
        await json(
          await partnership.PATCH(
            req(`/api/partnerships/${p.id}`, "PATCH", { status: "completed" }),
            ctx(p.id),
          ),
        )
      ).body.status,
    ).toBe("completed");
    expect(
      (
        await json(
          await partnership.PATCH(
            req(`/api/partnerships/${p.id}`, "PATCH", {
              paymentStatus: "paid",
            }),
            ctx(p.id),
          ),
        )
      ).body.paymentStatus,
    ).toBe("paid");

    const filtered = await json(
      await partnerships.GET(
        req(`/api/partnerships?campaignId=${ca.id}&paymentStatus=paid`),
      ),
    );
    expect(filtered.body.total).toBe(1);

    const stats = (await json(await analytics.GET())).body;
    expect(stats.spend).toMatchObject({
      committedCents: 20_000,
      paidCents: 20_000,
    });
    expect(stats.completion).toMatchObject({
      partnershipCompletionRate: 100,
      deliverableCompletionRate: 100,
    });

    expect(
      (
        await json(
          await partnership.PATCH(
            req(`/api/partnerships/${p.id}`, "PATCH", {}),
            ctx(p.id),
          ),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await json(
          await partnership.DELETE(
            req(`/api/partnerships/${p.id}`, "DELETE"),
            ctx(p.id),
          ),
        )
      ).status,
    ).toBe(409);
  });
});
