import Link from "next/link";
import { Badge, Empty, PageHeader, Progress, StatCard } from "@/components/ui";
import { getDb } from "@/lib/db";
import { compact, money, percent } from "@/lib/format";
import { getAnalytics } from "@/lib/repos/analytics";

export const dynamic = "force-dynamic";

export default function Dashboard() {
  const a = getAnalytics(getDb());
  const empty = a.totals.creators === 0 && a.totals.campaigns === 0;
  const maxEng = Math.max(
    1,
    ...a.engagement.byPlatform.map((p) => p.avgEngagement),
  );
  const statuses = Object.entries(a.campaignsByStatus);
  const totalCampaigns = Math.max(1, a.totals.campaigns);

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Performance across creators, campaigns and partnerships."
        actions={
          <>
            <Link className="btn secondary" href="/creators/new">
              + Creator
            </Link>
            <Link className="btn primary" href="/campaigns/new">
              + Campaign
            </Link>
          </>
        }
      />

      {empty && (
        <Empty title="No data yet">
          Add your first creator or campaign — or load demo data with{" "}
          <code>npm run db:seed</code>.
        </Empty>
      )}

      <section className="stats" aria-label="Key metrics">
        <StatCard
          title="Total creators"
          value={a.totals.creators.toLocaleString()}
          hint={`${compact(a.totals.totalReach)} combined reach`}
        />
        <StatCard
          title="Active campaigns"
          value={String(a.totals.activeCampaigns)}
          hint={`${a.totals.campaigns} campaigns in total`}
        />
        <StatCard
          title="Partnership spend"
          value={money(a.spend.committedCents)}
          hint={`${money(a.spend.paidCents)} paid · ${money(a.spend.outstandingCents)} outstanding`}
        />
        <StatCard
          title="Deliverables approved"
          value={percent(a.completion.deliverableCompletionRate)}
          hint={`${a.completion.deliverablesApproved} of ${a.completion.deliverablesTotal}`}
        />
        <StatCard
          title="Partnerships completed"
          value={percent(a.completion.partnershipCompletionRate)}
          hint={`${a.completion.partnershipsCompleted} of ${a.completion.partnershipsTotal}`}
        />
        <StatCard
          title="Avg. engagement rate"
          value={percent(a.engagement.avgEngagementRate)}
          hint="across all creator platforms"
        />
      </section>

      <div className="grid-2 gap">
        <section className="card">
          <h2>Engagement by platform</h2>
          {a.engagement.byPlatform.length === 0 ? (
            <p className="muted">No platform data yet.</p>
          ) : (
            <ul className="bars">
              {a.engagement.byPlatform.map((p) => (
                <li key={p.platform}>
                  <span className="bar-label">{p.platform}</span>
                  <Progress value={p.avgEngagement} max={maxEng} />
                  <span className="bar-value">
                    {percent(p.avgEngagement)}{" "}
                    <span className="muted small">
                      · {compact(p.followers)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <h2>Campaigns by status</h2>
          <ul className="bars">
            {statuses.map(([status, n]) => (
              <li key={status}>
                <span className="bar-label">
                  <Badge value={status} />
                </span>
                <Progress value={n} max={totalCampaigns} />
                <span className="bar-value">{n}</span>
              </li>
            ))}
          </ul>
          <p className="muted small">
            Budget utilization:{" "}
            <strong>{percent(a.spend.budgetUtilization)}</strong> of{" "}
            {money(a.spend.budgetCents)} committed.
          </p>
        </section>

        <section className="card">
          <h2>Spend by campaign</h2>
          {a.spendByCampaign.length === 0 ? (
            <p className="muted">No campaigns yet.</p>
          ) : (
            <ul className="bars stacked">
              {a.spendByCampaign.map((c) => (
                <li key={c.id}>
                  <div className="row between">
                    <Link href={`/campaigns/${c.id}`}>{c.name}</Link>
                    <span className="small muted">
                      {money(c.committedCents)} / {money(c.budgetCents)}
                    </span>
                  </div>
                  <Progress
                    value={c.committedCents}
                    max={c.budgetCents}
                    tone={
                      c.committedCents >= c.budgetCents * 0.9
                        ? "warn"
                        : undefined
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <h2>Top creators by engagement</h2>
          {a.topCreators.length === 0 ? (
            <p className="muted">No creators yet.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Creator</th>
                  <th className="num">Reach</th>
                  <th className="num">Engagement</th>
                </tr>
              </thead>
              <tbody>
                {a.topCreators.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link href={`/creators/${c.id}`}>{c.name}</Link>{" "}
                      <span className="muted small">{c.niche}</span>
                    </td>
                    <td className="num">{compact(c.totalFollowers)}</td>
                    <td className="num">{percent(c.avgEngagement)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </>
  );
}
