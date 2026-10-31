import { notFound } from "next/navigation";
import { AddPartnershipForm } from "@/components/AddPartnershipForm";
import { ApiButton, StatusSelect } from "@/components/Actions";
import { CampaignForm } from "@/components/CampaignForm";
import { PartnershipCard } from "@/components/PartnershipCard";
import { Badge, Empty, PageHeader, Progress, StatCard } from "@/components/ui";
import { getDb } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";
import { dateLabel, money, percent } from "@/lib/format";
import { getCampaign } from "@/lib/repos/campaigns";
import { listCreators } from "@/lib/repos/creators";
import { listPartnerships } from "@/lib/repos/partnerships";
import { CAMPAIGN_STATUSES } from "@/lib/schema";
import { creatorQuery, partnershipQuery } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  try {
    return { title: getCampaign(getDb(), Number((await params).id)).name };
  } catch {
    return { title: "Campaign" };
  }
}

export default async function CampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const db = getDb();
  let campaign;
  try {
    campaign = getCampaign(db, id);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
  const partnerships = listPartnerships(
    db,
    partnershipQuery.parse({ campaignId: id, limit: 100 }),
  ).items;
  const taken = new Set(partnerships.map((p) => p.creatorId));
  const available = listCreators(
    db,
    creatorQuery.parse({ limit: 100 }),
  ).items.filter((c) => !taken.has(c.id));
  const open = campaign.status === "draft" || campaign.status === "active";

  return (
    <>
      <PageHeader
        title={campaign.name}
        subtitle={`${campaign.brand} · ${dateLabel(campaign.startDate)} → ${dateLabel(campaign.deadline)}`}
        actions={
          <>
            <Badge value={campaign.status} />
            <StatusSelect
              url={`/api/campaigns/${id}`}
              field="status"
              value={campaign.status}
              options={CAMPAIGN_STATUSES}
              ariaLabel="Campaign status"
            />
            <ApiButton
              url={`/api/campaigns/${id}`}
              method="DELETE"
              variant="danger"
              confirm={`Delete “${campaign.name}” and its partnerships?`}
              redirectTo="/campaigns"
            >
              Delete
            </ApiButton>
          </>
        }
      />
      {campaign.description && <p>{campaign.description}</p>}

      <section className="stats">
        <StatCard
          title="Budget"
          value={money(campaign.budgetCents)}
          hint={`${money(campaign.remainingCents)} unallocated`}
        />
        <StatCard
          title="Committed"
          value={money(campaign.committedCents)}
          hint={`${money(campaign.paidCents)} paid`}
        />
        <StatCard title="Creators" value={String(campaign.partnershipCount)} />
        <StatCard
          title="Deliverables approved"
          value={percent(campaign.progress)}
          hint={`${campaign.deliverablesApproved} of ${campaign.deliverablesTotal}`}
        />
      </section>
      <Progress
        value={campaign.committedCents}
        max={campaign.budgetCents}
        tone={
          campaign.committedCents >= campaign.budgetCents * 0.9
            ? "warn"
            : undefined
        }
      />

      <h2>Creators &amp; deliverables</h2>
      {partnerships.length === 0 ? (
        <Empty title="No creators assigned yet">
          Use the form below to add the first one.
        </Empty>
      ) : (
        <div className="stack">
          {partnerships.map((p) => (
            <PartnershipCard key={p.id} p={p} focus="creator" />
          ))}
        </div>
      )}

      {open && (
        <section className="card">
          <h2>Assign a creator</h2>
          <AddPartnershipForm
            campaignId={id}
            deadline={campaign.deadline}
            remainingCents={campaign.remainingCents}
            creators={available.map((c) => ({
              id: c.id,
              name: c.name,
              niche: c.niche,
            }))}
          />
        </section>
      )}

      <h2>Edit campaign</h2>
      <CampaignForm campaign={campaign} />
    </>
  );
}
