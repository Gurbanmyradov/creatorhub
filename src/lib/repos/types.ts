import type {
  CAMPAIGN_STATUSES,
  DELIVERABLE_STATUSES,
  DELIVERABLE_TYPES,
  PARTNERSHIP_STATUSES,
  PAYMENT_STATUSES,
} from "../schema";

export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];
export type PartnershipStatus = (typeof PARTNERSHIP_STATUSES)[number];
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export type DeliverableStatus = (typeof DELIVERABLE_STATUSES)[number];
export type DeliverableType = (typeof DELIVERABLE_TYPES)[number];
