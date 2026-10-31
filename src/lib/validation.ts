import { z } from "zod";
import {
  CAMPAIGN_STATUSES,
  DELIVERABLE_STATUSES,
  DELIVERABLE_TYPES,
  PARTNERSHIP_STATUSES,
  PAYMENT_STATUSES,
  PLATFORMS,
} from "./schema";

const text = (max: number) => z.string().trim().min(1, "Required").max(max);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v ? v : null));

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .refine(
    (d) =>
      !Number.isNaN(Date.parse(d)) && new Date(d).toISOString().startsWith(d),
    "Invalid date",
  );

const cents = z.coerce
  .number()
  .int("Must be a whole number of cents")
  .min(0)
  .max(1_000_000_000_00);
const id = z.coerce.number().int().positive();

// ---------- Creators ----------
export const platformInput = z.object({
  platform: z.enum(PLATFORMS),
  handle: z
    .string()
    .trim()
    .transform((h) => h.replace(/^@/, ""))
    .pipe(z.string().min(1, "Required").max(60)),
  followers: z.coerce.number().int().min(0),
  engagementRate: z.coerce.number().min(0).max(100),
});

export const creatorInput = z.object({
  name: text(120),
  email: z.string().trim().max(200).pipe(z.email("Invalid email")),
  phone: optionalText(40),
  niche: z
    .string()
    .trim()
    .max(60)
    .optional()
    .transform((v) => v || "general"),
  country: optionalText(60),
  bio: optionalText(1000),
  platforms: z
    .array(platformInput)
    .max(PLATFORMS.length)
    .default([])
    .refine(
      (p) => new Set(p.map((x) => x.platform)).size === p.length,
      "Each platform may only appear once",
    ),
});
export type CreatorInput = z.infer<typeof creatorInput>;

// ---------- Campaigns ----------
export const campaignInput = z
  .object({
    name: text(120),
    brand: text(120),
    description: optionalText(2000),
    budgetCents: cents,
    startDate: isoDate,
    deadline: isoDate,
    status: z.enum(CAMPAIGN_STATUSES).default("draft"),
  })
  .refine((c) => c.deadline >= c.startDate, {
    path: ["deadline"],
    message: "Deadline must be on or after the start date",
  });
export type CampaignInput = z.infer<typeof campaignInput>;
export const campaignStatusPatch = z.object({
  status: z.enum(CAMPAIGN_STATUSES),
});

// ---------- Deliverables ----------
export const deliverableInput = z.object({
  title: text(200),
  type: z.enum(DELIVERABLE_TYPES).default("post"),
  dueDate: isoDate.nullish().transform((v) => v ?? null),
});
export const deliverablePatch = z
  .object({
    title: text(200),
    type: z.enum(DELIVERABLE_TYPES),
    dueDate: isoDate.nullable(),
    status: z.enum(DELIVERABLE_STATUSES),
    feedback: optionalText(1000),
  })
  .partial()
  .refine((p) => Object.keys(p).length > 0, "Provide at least one field");

// ---------- Partnerships ----------
export const partnershipInput = z.object({
  campaignId: id,
  creatorId: id,
  feeCents: cents,
  status: z.enum(PARTNERSHIP_STATUSES).default("proposed"),
  notes: optionalText(1000),
  deliverables: z.array(deliverableInput).max(50).default([]),
});
export const partnershipPatch = z
  .object({
    feeCents: cents,
    status: z.enum(PARTNERSHIP_STATUSES),
    paymentStatus: z.enum(PAYMENT_STATUSES),
    notes: optionalText(1000),
  })
  .partial()
  .refine((p) => Object.keys(p).length > 0, "Provide at least one field");

// ---------- Query strings ----------
const page = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  order: z.enum(["asc", "desc"]).optional(),
};
export const creatorQuery = z.object({
  q: z.string().trim().optional(),
  platform: z.enum(PLATFORMS).optional(),
  niche: z.string().trim().optional(),
  country: z.string().trim().optional(),
  minFollowers: z.coerce.number().int().min(0).optional(),
  minEngagement: z.coerce.number().min(0).max(100).optional(),
  sort: z.enum(["name", "followers", "engagement", "newest"]).default("name"),
  ...page,
});
export const campaignQuery = z.object({
  q: z.string().trim().optional(),
  status: z.enum(CAMPAIGN_STATUSES).optional(),
  sort: z.enum(["newest", "deadline", "budget", "name"]).default("newest"),
  ...page,
});
export const partnershipQuery = z.object({
  campaignId: id.optional(),
  creatorId: id.optional(),
  status: z.enum(PARTNERSHIP_STATUSES).optional(),
  paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
  ...page,
});
export type CreatorQuery = z.infer<typeof creatorQuery>;
export type CampaignQuery = z.infer<typeof campaignQuery>;
export type PartnershipQuery = z.infer<typeof partnershipQuery>;
