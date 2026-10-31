import type { Metadata } from "next";
import Link from "next/link";
import { Empty, PageHeader, Pagination } from "@/components/ui";
import { getDb } from "@/lib/db";
import { compact, percent, qs } from "@/lib/format";
import { listCreators, listNiches } from "@/lib/repos/creators";
import { PLATFORMS } from "@/lib/schema";
import { creatorQuery } from "@/lib/validation";

export const metadata: Metadata = { title: "Creators" };
export const dynamic = "force-dynamic";

type Search = Record<string, string | undefined>;

export default async function CreatorsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const raw = Object.fromEntries(
    Object.entries(await searchParams).filter(([, v]) => v),
  );
  const parsed = creatorQuery.safeParse(raw);
  const query = parsed.success ? parsed.data : creatorQuery.parse({});
  const db = getDb();
  const result = listCreators(db, query);
  const niches = listNiches(db);
  const filtered = Object.keys(raw).some((k) => k !== "page");
  const href = (page: number) => `/creators${qs({ ...raw, page })}`;

  return (
    <>
      <PageHeader
        title="Creators"
        subtitle={`${result.total} creator${result.total === 1 ? "" : "s"}${filtered ? " match your filters" : ""}`}
        actions={
          <Link className="btn primary" href="/creators/new">
            + Add creator
          </Link>
        }
      />

      <form className="card filters" method="get" role="search">
        <input
          name="q"
          placeholder="Search name, email, niche or handle"
          defaultValue={raw.q}
          aria-label="Search"
        />
        <select
          name="platform"
          defaultValue={raw.platform ?? ""}
          aria-label="Platform"
        >
          <option value="">All platforms</option>
          {PLATFORMS.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
        <select name="niche" defaultValue={raw.niche ?? ""} aria-label="Niche">
          <option value="">All niches</option>
          {niches.map((n) => (
            <option key={n}>{n}</option>
          ))}
        </select>
        <input
          name="minFollowers"
          type="number"
          min={0}
          placeholder="Min followers"
          defaultValue={raw.minFollowers}
          aria-label="Minimum followers"
        />
        <input
          name="minEngagement"
          type="number"
          min={0}
          max={100}
          step="0.1"
          placeholder="Min engagement %"
          defaultValue={raw.minEngagement}
          aria-label="Minimum engagement"
        />
        <select name="sort" defaultValue={query.sort} aria-label="Sort by">
          <option value="name">Sort: Name</option>
          <option value="followers">Sort: Followers</option>
          <option value="engagement">Sort: Engagement</option>
          <option value="newest">Sort: Newest</option>
        </select>
        <button className="btn primary">Apply</button>
        {filtered && (
          <Link className="btn ghost" href="/creators">
            Clear
          </Link>
        )}
      </form>

      {result.items.length === 0 ? (
        <Empty
          title={
            filtered ? "No creators match these filters" : "No creators yet"
          }
        >
          {filtered
            ? "Try removing a filter."
            : "Add your first creator to start building your roster."}
        </Empty>
      ) : (
        <div className="card table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Creator</th>
                <th>Platforms</th>
                <th className="num">Followers</th>
                <th className="num">Engagement</th>
                <th className="num">Campaigns</th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link href={`/creators/${c.id}`}>
                      <strong>{c.name}</strong>
                    </Link>
                    <div className="muted small">
                      {c.niche}
                      {c.country ? ` · ${c.country}` : ""}
                    </div>
                  </td>
                  <td>
                    {c.platforms.map((p) => (
                      <span key={p.platform} className="chip">
                        {p.platform}
                      </span>
                    ))}
                  </td>
                  <td className="num">{compact(c.totalFollowers)}</td>
                  <td className="num">{percent(c.avgEngagement)}</td>
                  <td className="num">{c.partnershipCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination
        page={result.page}
        totalPages={result.totalPages}
        href={href}
      />
    </>
  );
}
