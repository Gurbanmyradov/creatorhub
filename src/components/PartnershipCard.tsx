import Link from "next/link";
import { dateLabel, money } from "@/lib/format";
import type { Partnership } from "@/lib/repos/partnerships";
import { PARTNERSHIP_STATUSES } from "@/lib/schema";
import { ApiButton, DeliverableActions, StatusSelect } from "./Actions";
import { Badge, Progress } from "./ui";

/** One creator↔campaign partnership with its deliverables and controls. `focus` decides which side is the title. */
export function PartnershipCard({
  p,
  focus,
}: {
  p: Partnership;
  focus: "creator" | "campaign";
}) {
  const url = `/api/partnerships/${p.id}`;
  return (
    <article className="card partnership">
      <div className="partnership-head">
        <div>
          <h3>
            {focus === "creator" ? (
              <Link href={`/creators/${p.creator.id}`}>{p.creator.name}</Link>
            ) : (
              <Link href={`/campaigns/${p.campaign.id}`}>
                {p.campaign.name}
              </Link>
            )}
          </h3>
          <p className="muted small">
            {focus === "creator" ? p.creator.email : p.campaign.brand} · Fee{" "}
            <strong>{money(p.feeCents)}</strong>
          </p>
        </div>
        <div className="badges">
          <Badge value={p.status} />
          <Badge value={p.paymentStatus} />
          <Badge
            value={p.approvalStatus === "none" ? "none" : p.approvalStatus}
          />
        </div>
      </div>

      <div className="controls">
        <label className="inline">
          Status
          <StatusSelect
            url={url}
            field="status"
            value={p.status}
            options={PARTNERSHIP_STATUSES}
            ariaLabel={`Status for ${p.creator.name}`}
          />
        </label>
        {p.paymentStatus === "unpaid" ? (
          <ApiButton url={url} body={{ paymentStatus: "paid" }}>
            Mark paid
          </ApiButton>
        ) : (
          <ApiButton
            url={url}
            body={{ paymentStatus: "unpaid" }}
            variant="ghost"
          >
            Mark unpaid
          </ApiButton>
        )}
        <ApiButton
          url={url}
          method="DELETE"
          variant="danger"
          confirm="Remove this partnership?"
        >
          Remove
        </ApiButton>
      </div>

      {p.deliverables.length > 0 ? (
        <div className="deliverables">
          <div className="row between">
            <span className="small muted">
              Deliverables · {p.deliverablesApproved}/{p.deliverablesTotal}{" "}
              approved
            </span>
            <div style={{ width: 120 }}>
              <Progress
                value={p.deliverablesApproved}
                max={p.deliverablesTotal}
              />
            </div>
          </div>
          <ul>
            {p.deliverables.map((d) => (
              <li key={d.id}>
                <div className="row between wrap">
                  <span>
                    <strong>{d.title}</strong>{" "}
                    <span className="muted small">
                      · {d.type} · due {dateLabel(d.dueDate)}
                    </span>
                  </span>
                  <Badge value={d.status} />
                </div>
                {d.feedback && <p className="small feedback">“{d.feedback}”</p>}
                <DeliverableActions id={d.id} status={d.status} />
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="muted small">No deliverables yet.</p>
      )}
    </article>
  );
}
