import { notFound } from "next/navigation";
import { ApiButton } from "@/components/Actions";
import { CreatorForm } from "@/components/CreatorForm";
import { PartnershipCard } from "@/components/PartnershipCard";
import { Empty, PageHeader } from "@/components/ui";
import { getDb } from "@/lib/db";
import { compact, percent } from "@/lib/format";
import { NotFoundError } from "@/lib/errors";
import { getCreator } from "@/lib/repos/creators";
import { listPartnerships } from "@/lib/repos/partnerships";
import { partnershipQuery } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  try {
    return { title: getCreator(getDb(), Number((await params).id)).name };
  } catch {
    return { title: "Creator" };
  }
}

export default async function CreatorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const db = getDb();
  let creator;
  try {
    creator = getCreator(db, id);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
  const partnerships = listPartnerships(
    db,
    partnershipQuery.parse({ creatorId: id, limit: 100 }),
  ).items;

  return (
    <>
      <PageHeader
        title={creator.name}
        subtitle={`${creator.niche}${creator.country ? ` · ${creator.country}` : ""} · ${compact(creator.totalFollowers)} followers · ${percent(creator.avgEngagement)} avg. engagement`}
        actions={
          <ApiButton
            url={`/api/creators/${id}`}
            method="DELETE"
            variant="danger"
            confirm={`Delete ${creator.name}?`}
            redirectTo="/creators"
          >
            Delete creator
          </ApiButton>
        }
      />

      <h2>Partnerships</h2>
      {partnerships.length === 0 ? (
        <Empty title="Not part of any campaign yet">
          Open a campaign and add this creator from there.
        </Empty>
      ) : (
        <div className="stack">
          {partnerships.map((p) => (
            <PartnershipCard key={p.id} p={p} focus="campaign" />
          ))}
        </div>
      )}

      <h2>Profile</h2>
      <CreatorForm creator={creator} />
    </>
  );
}
