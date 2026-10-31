import type { Db } from "./db";
import { createCampaign, setCampaignStatus } from "./repos/campaigns";
import { createCreator } from "./repos/creators";
import {
  createPartnership,
  updateDeliverable,
  updatePartnership,
} from "./repos/partnerships";
import { campaignInput, creatorInput, partnershipInput } from "./validation";

const day = (offset: number) =>
  new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
const usd = (n: number) => n * 100;

/** Fill an empty database with realistic demo data (goes through the same rules as the API). */
export function seedDemo(db: Db) {
  const creators = [
    [
      "Maya Torres",
      "maya@example.com",
      "Lifestyle",
      "Colombia",
      [
        ["instagram", "mayatorres", 182000, 4.8],
        ["tiktok", "maya.t", 310000, 6.2],
      ],
    ],
    [
      "Liam Chen",
      "liam@example.com",
      "Tech",
      "Canada",
      [
        ["youtube", "liamtech", 540000, 3.9],
        ["twitter", "liamchen", 88000, 1.8],
      ],
    ],
    [
      "Sofia Rossi",
      "sofia@example.com",
      "Fashion",
      "Italy",
      [
        ["instagram", "sofiarossi", 420000, 3.4],
        ["tiktok", "sofia.style", 260000, 5.1],
      ],
    ],
    [
      "Noah Williams",
      "noah@example.com",
      "Gaming",
      "USA",
      [
        ["twitch", "noahplays", 150000, 7.4],
        ["youtube", "noahplays", 210000, 4.6],
      ],
    ],
    [
      "Aisha Khan",
      "aisha@example.com",
      "Beauty",
      "UK",
      [
        ["instagram", "aishabeauty", 96000, 6.9],
        ["tiktok", "aisha.glow", 175000, 7.8],
      ],
    ],
    [
      "Lucas Silva",
      "lucas@example.com",
      "Fitness",
      "Brazil",
      [
        ["instagram", "lucasfit", 275000, 4.1],
        ["youtube", "lucasfit", 120000, 5.5],
      ],
    ],
    [
      "Emma Johansson",
      "emma@example.com",
      "Travel",
      "Sweden",
      [
        ["instagram", "emmaroams", 330000, 2.9],
        ["youtube", "emmaroams", 95000, 4.2],
      ],
    ],
    [
      "Diego Martinez",
      "diego@example.com",
      "Food",
      "Mexico",
      [
        ["tiktok", "diegocooks", 640000, 8.3],
        ["instagram", "diegocooks", 210000, 5.7],
      ],
    ],
    [
      "Hana Sato",
      "hana@example.com",
      "Tech",
      "Japan",
      [
        ["youtube", "hanagadgets", 380000, 4.4],
        ["twitter", "hanasato", 61000, 2.2],
      ],
    ],
    [
      "Omar Haddad",
      "omar@example.com",
      "Lifestyle",
      "UAE",
      [["instagram", "omarhaddad", 510000, 2.6]],
    ],
    [
      "Chloe Martin",
      "chloe@example.com",
      "Fashion",
      "France",
      [
        ["tiktok", "chloemartin", 89000, 9.1],
        ["instagram", "chloemartin", 54000, 6.3],
      ],
    ],
    [
      "Tomás Benítez",
      "tomas@example.com",
      "Gaming",
      "Argentina",
      [["twitch", "tomasgg", 72000, 8.8]],
    ],
  ] as const;

  const creatorIds = creators.map(
    ([name, email, niche, country, platforms]) =>
      createCreator(
        db,
        creatorInput.parse({
          name,
          email,
          niche,
          country,
          phone: "+1 555 0100",
          bio: `${niche} creator based in ${country}.`,
          platforms: platforms.map(
            ([platform, handle, followers, engagementRate]) => ({
              platform,
              handle,
              followers,
              engagementRate,
            }),
          ),
        }),
      ).id,
  );

  const campaigns = [
    [
      "Summer Glow Launch",
      "Lumina Cosmetics",
      usd(25000),
      -20,
      25,
      "active",
      "Launch of the summer skincare range.",
    ],
    [
      "Level Up Tournament",
      "NovaGear",
      usd(40000),
      -10,
      40,
      "active",
      "Sponsored streams for the gaming-peripherals tournament.",
    ],
    [
      "Eco Travel Series",
      "Wanderly",
      usd(18000),
      10,
      60,
      "draft",
      "Sustainable-travel storytelling across three destinations.",
    ],
    [
      "Spring Wardrobe Drop",
      "Atelier Nord",
      usd(30000),
      -75,
      -30,
      "completed",
      "Capsule collection reveal.",
    ],
  ] as const;
  const campaignIds = campaigns.map(
    ([name, brand, budgetCents, start, end, status, description]) =>
      createCampaign(
        db,
        campaignInput.parse({
          name,
          brand,
          description,
          budgetCents,
          startDate: day(start),
          deadline: day(end),
          status: status === "completed" ? "active" : status,
        }),
      ).id,
  );

  const deliver = (title: string, type: string, due: number) => ({
    title,
    type,
    dueDate: day(due),
  });
  const partner = (
    c: number,
    cr: number,
    fee: number,
    status: string,
    deliverables: ReturnType<typeof deliver>[],
  ) =>
    createPartnership(
      db,
      partnershipInput.parse({
        campaignId: campaignIds[c],
        creatorId: creatorIds[cr],
        feeCents: usd(fee),
        status,
        deliverables,
      }),
    );

  const approveAll = (p: ReturnType<typeof partner>) =>
    p.deliverables.forEach((d) =>
      updateDeliverable(db, d.id, { status: "approved" }),
    );

  // Spring Wardrobe Drop (completed, fully paid)
  for (const [cr, fee] of [
    [2, 9000],
    [10, 6000],
    [9, 8000],
  ] as const) {
    const p = partner(3, cr, fee, "in_progress", [
      deliver("Reveal reel", "reel", -50),
      deliver("Styling story set", "story", -45),
    ]);
    approveAll(p);
    updatePartnership(db, p.id, { status: "completed" });
    updatePartnership(db, p.id, { paymentStatus: "paid" });
  }

  setCampaignStatus(db, campaignIds[3], "completed");

  // Summer Glow Launch (active, mixed)
  const a = partner(0, 4, 7000, "in_progress", [
    deliver("Get-ready-with-me video", "video", 5),
    deliver("Product story", "story", 12),
  ]);
  updateDeliverable(db, a.deliverables[0].id, { status: "approved" });
  updateDeliverable(db, a.deliverables[1].id, { status: "submitted" });
  const b = partner(0, 0, 6000, "in_progress", [
    deliver("Launch reel", "reel", 3),
  ]);
  updateDeliverable(db, b.deliverables[0].id, {
    status: "changes_requested",
    feedback: "Please show the product label in the first 3 seconds.",
  });
  updatePartnership(
    db,
    partner(0, 5, 4500, "agreed", [deliver("Workout glow-up post", "post", 15)])
      .id,
    { paymentStatus: "paid" },
  );
  partner(0, 10, 3000, "proposed", []);

  // Level Up Tournament (active)
  const c = partner(1, 3, 12000, "in_progress", [
    deliver("Tournament stream (3h)", "video", 8),
    deliver("Highlights video", "video", 20),
  ]);
  updateDeliverable(db, c.deliverables[0].id, { status: "approved" });
  updatePartnership(db, c.id, { paymentStatus: "paid" });
  partner(1, 11, 5000, "agreed", [deliver("Stream segment", "video", 10)]);
  partner(1, 1, 9000, "proposed", [deliver("Hardware review", "video", 18)]);
}
