import { describe, expect, it } from "vitest";
import { freshDb, makeCampaign, makeCreator } from "@/test/helpers";
import { createPartnership } from "./partnerships";
import { creatorQuery } from "../validation";
import {
  deleteCreator,
  getCreator,
  listCreators,
  updateCreator,
} from "./creators";
import { creatorInput } from "../validation";

const q = (o: Record<string, unknown> = {}) => creatorQuery.parse(o);

describe("creators", () => {
  it("computes total followers and average engagement across platforms", () => {
    const db = freshDb();
    const c = makeCreator(db, {
      platforms: [
        {
          platform: "instagram",
          handle: "@a",
          followers: 1000,
          engagementRate: 4,
        },
        { platform: "tiktok", handle: "a", followers: 3000, engagementRate: 6 },
      ],
    });
    expect(c.totalFollowers).toBe(4000);
    expect(c.avgEngagement).toBe(5);
    expect(c.platforms[0].handle).toBe("a"); // "@" stripped, sorted by followers
  });

  it("rejects duplicate emails (case-insensitive)", () => {
    const db = freshDb();
    makeCreator(db, { email: "dup@example.com" });
    expect(() => makeCreator(db, { email: "DUP@example.com" })).toThrow(
      /already exists/,
    );
  });

  it("searches, filters and sorts", () => {
    const db = freshDb();
    makeCreator(db, {
      name: "Alice",
      niche: "beauty",
      platforms: [
        {
          platform: "tiktok",
          handle: "alice",
          followers: 500_000,
          engagementRate: 8,
        },
      ],
    });
    makeCreator(db, {
      name: "Bob",
      niche: "tech",
      platforms: [
        {
          platform: "youtube",
          handle: "bobyt",
          followers: 20_000,
          engagementRate: 2,
        },
      ],
    });
    makeCreator(db, {
      name: "Cara",
      niche: "tech",
      platforms: [
        {
          platform: "youtube",
          handle: "cara",
          followers: 90_000,
          engagementRate: 5,
        },
      ],
    });

    expect(listCreators(db, q({ q: "ali" })).items.map((c) => c.name)).toEqual([
      "Alice",
    ]);
    expect(
      listCreators(db, q({ q: "bobyt" })).items.map((c) => c.name),
    ).toEqual(["Bob"]); // handle search
    expect(listCreators(db, q({ platform: "youtube" })).total).toBe(2);
    expect(
      listCreators(db, q({ niche: "TECH", minFollowers: 50_000 })).items.map(
        (c) => c.name,
      ),
    ).toEqual(["Cara"]);
    expect(
      listCreators(db, q({ minEngagement: 4.5 })).items.map((c) => c.name),
    ).toEqual(["Alice", "Cara"]);
    expect(
      listCreators(db, q({ sort: "followers" })).items.map((c) => c.name),
    ).toEqual(["Alice", "Cara", "Bob"]);
    expect(
      listCreators(db, q({ sort: "followers", order: "asc" })).items[0].name,
    ).toBe("Bob");
  });

  it("treats LIKE wildcards in search literally", () => {
    const db = freshDb();
    makeCreator(db, { name: "100% Real" });
    makeCreator(db, { name: "Other" });
    expect(listCreators(db, q({ q: "%" })).items.map((c) => c.name)).toEqual([
      "100% Real",
    ]);
  });

  it("paginates", () => {
    const db = freshDb();
    for (let i = 0; i < 5; i++) makeCreator(db);
    const page2 = listCreators(db, q({ limit: 2, page: 2 }));
    expect(page2).toMatchObject({ total: 5, totalPages: 3, page: 2 });
    expect(page2.items).toHaveLength(2);
  });

  it("replaces platforms on update", () => {
    const db = freshDb();
    const c = makeCreator(db);
    const updated = updateCreator(
      db,
      c.id,
      creatorInput.parse({
        name: "New",
        email: c.email,
        platforms: [
          { platform: "twitch", handle: "n", followers: 5, engagementRate: 1 },
        ],
      }),
    );
    expect(updated.name).toBe("New");
    expect(updated.platforms.map((p) => p.platform)).toEqual(["twitch"]);
  });

  it("blocks deleting a creator that has partnerships", () => {
    const db = freshDb();
    const c = makeCreator(db);
    const camp = makeCampaign(db);
    createPartnership(db, {
      campaignId: camp.id,
      creatorId: c.id,
      feeCents: 1000,
      status: "proposed",
      notes: null,
      deliverables: [],
    });
    expect(() => deleteCreator(db, c.id)).toThrow(/partnership/);
    const lone = makeCreator(db);
    deleteCreator(db, lone.id);
    expect(() => getCreator(db, lone.id)).toThrow(/not found/);
  });
});
