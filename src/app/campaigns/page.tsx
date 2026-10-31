import type { Metadata } from "next";
import Link from "next/link";
import {
  Badge,
  Empty,
  PageHeader,
  Pagination,
  Progress,
} from "@/components/ui";
import { getDb } from "@/lib/db";
import { dateLabel, money, qs } from "@/lib/format";
import { listCampaigns } from "@/lib/repos/campaigns";
import { CAMPAIGN_STATUSES } from "@/lib/schema";
import { campaignQuery } from "@/lib/validation";

export const metadata: Metadata = { title: "Campaigns" };
export const dynamic = "force-dynamic";

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const raw = Object.fromEntries(
    Object.entries(await searchParams).filter(([, v]) => v),
  );
  const parsed = campaignQuery.safeParse(raw);
  const query = parsed.success ? parsed.data : campaignQuery.parse({});
  const result = listCampaigns(getDb(), query);
  const filtered = Object.keys(raw).some((k) => k !== "page");

  return (
    <>
      <PageHeader
        title="Campaigns"
        subtitle={`${result.total} campaign${result.total === 1 ? "" : "s"}`}
        actions={
          <Link className="btn primary" href="/campaigns/new">
            + New campaign
          </Link>
        }
      />
      <form className="card filters" method="get" role="search">
        <input
          name="q"
          placeholder="Search campaign or brand"
          defaultValue={raw.q}
          aria-label="Search"
        />
        <select
          name="status"
          defaultValue={raw.status ?? ""}
          aria-label="Status"
        >
          <option value="">All statuses</option>
          {CAMPAIGN_STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select name="sort" defaultValue={query.sort} aria-label="Sort by">
          <option value="newest">Sort: Newest</option>
          <option value="deadline">Sort: Deadline</option>
          <option value="budget">Sort: Budget</option>
          <option value="name">Sort: Name</option>
        </select>
        <button className="btn primary">Apply</button>
        {filtered && (
          <Link className="btn ghost" href="/campaigns">
            Clear
          </Link>
        )}
      </form>

      {result.items.length === 0 ? (
        <Empty
          title={
            filtered ? "No campaigns match these filters" : "No campaigns yet"
          }
        >
          {filtered
            ? "Try removing a filter."
            : "Create a campaign to start assigning creators."}
        </Empty>
      ) : (
        <div className="cards">
          {result.items.map((c) => (
            <Link
              key={c.id}
              href={`/campaigns/${c.id}`}
              className="card campaign-card"
            >
              <div className="row between">
                <strong>{c.name}</strong>
                <Badge value={c.status} />
              </div>
              <p className="muted small">
                {c.brand} · {dateLabel(c.startDate)} → {dateLabel(c.deadline)}
              </p>
              <div className="row between small">
                <span>
                  {money(c.committedCents)} of {money(c.budgetCents)}
                </span>
                <span className="muted">
                  {c.partnershipCount} creator
                  {c.partnershipCount === 1 ? "" : "s"}
                </span>
              </div>
              <Progress
                value={c.committedCents}
                max={c.budgetCents}
                tone={
                  c.budgetCents && c.committedCents >= c.budgetCents * 0.9
                    ? "warn"
                    : undefined
                }
              />
              <p className="muted small">
                Deliverables: {c.deliverablesApproved}/{c.deliverablesTotal}{" "}
                approved ({c.progress}%)
              </p>
            </Link>
          ))}
        </div>
      )}
      <Pagination
        page={result.page}
        totalPages={result.totalPages}
        href={(p) => `/campaigns${qs({ ...raw, page: p })}`}
      />
    </>
  );
}
