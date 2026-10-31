import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Empty, PageHeader, Pagination } from "@/components/ui";
import { getDb } from "@/lib/db";
import { dateLabel, money, qs } from "@/lib/format";
import { listPartnerships } from "@/lib/repos/partnerships";
import { PARTNERSHIP_STATUSES, PAYMENT_STATUSES } from "@/lib/schema";
import { partnershipQuery } from "@/lib/validation";

export const metadata: Metadata = { title: "Partnerships" };
export const dynamic = "force-dynamic";

export default async function PartnershipsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const raw = Object.fromEntries(
    Object.entries(await searchParams).filter(([, v]) => v),
  );
  const parsed = partnershipQuery.safeParse(raw);
  const query = parsed.success ? parsed.data : partnershipQuery.parse({});
  const result = listPartnerships(getDb(), query);
  const filtered = Object.keys(raw).some((k) => k !== "page");

  return (
    <>
      <PageHeader
        title="Partnerships"
        subtitle={`${result.total} brand–creator partnership${result.total === 1 ? "" : "s"}`}
      />
      <form className="card filters" method="get" role="search">
        <select
          name="status"
          defaultValue={raw.status ?? ""}
          aria-label="Status"
        >
          <option value="">All statuses</option>
          {PARTNERSHIP_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace("_", " ")}
            </option>
          ))}
        </select>
        <select
          name="paymentStatus"
          defaultValue={raw.paymentStatus ?? ""}
          aria-label="Payment"
        >
          <option value="">Any payment</option>
          {PAYMENT_STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <button className="btn primary">Apply</button>
        {filtered && (
          <Link className="btn ghost" href="/partnerships">
            Clear
          </Link>
        )}
      </form>

      {result.items.length === 0 ? (
        <Empty title="No partnerships found">
          Assign creators to a campaign to create partnerships.
        </Empty>
      ) : (
        <div className="card table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Creator</th>
                <th>Campaign</th>
                <th className="num">Fee</th>
                <th>Status</th>
                <th>Payment</th>
                <th>Approval</th>
                <th>Deliverables</th>
                <th>Next due</th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((p) => {
                const due =
                  p.deliverables.find((d) => d.status !== "approved")
                    ?.dueDate ?? null;
                return (
                  <tr key={p.id}>
                    <td>
                      <Link href={`/creators/${p.creator.id}`}>
                        {p.creator.name}
                      </Link>
                    </td>
                    <td>
                      <Link href={`/campaigns/${p.campaign.id}`}>
                        {p.campaign.name}
                      </Link>
                      <div className="muted small">{p.campaign.brand}</div>
                    </td>
                    <td className="num">{money(p.feeCents)}</td>
                    <td>
                      <Badge value={p.status} />
                    </td>
                    <td>
                      <Badge value={p.paymentStatus} />
                    </td>
                    <td>
                      <Badge value={p.approvalStatus} />
                    </td>
                    <td>
                      {p.deliverablesApproved}/{p.deliverablesTotal}
                    </td>
                    <td>{dateLabel(due)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <Pagination
        page={result.page}
        totalPages={result.totalPages}
        href={(pg) => `/partnerships${qs({ ...raw, page: pg })}`}
      />
    </>
  );
}
