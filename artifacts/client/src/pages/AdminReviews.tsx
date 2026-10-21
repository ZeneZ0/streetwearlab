import { useState } from "react";
import { useAdminReviews, useModerateReview, type ModerationStatus } from "../lib/api";
import { useToast } from "../lib/toast";
import { Empty, Loading, Stars } from "../components/ui";
import { date } from "../lib/format";

const TABS: { status: ModerationStatus; title: string }[] = [
  { status: "pending", title: "Ожидают" },
  { status: "approved", title: "Одобрены" },
  { status: "rejected", title: "Отклонены" },
];

export default function AdminReviews() {
  const [tab, setTab] = useState<ModerationStatus>("pending");
  const { data, isLoading } = useAdminReviews(tab);
  const moderate = useModerateReview();
  const { toast } = useToast();
  const act = (id: number, action: "approve" | "reject") => moderate.mutate({ id, action }, {
    onSuccess: () => toast({ title: action === "approve" ? "Отзыв опубликован" : "Отзыв отклонён" }),
  });

  return (
    <div className="wrap" style={{ maxWidth: 720 }}>
      <h1>Модерация отзывов</h1>
      <div className="tabs">
        {TABS.map((t) => (
          <button key={t.status} className={`tab ${tab === t.status ? "act" : ""}`} onClick={() => setTab(t.status)}>
            {t.title} ({data?.counts[t.status] ?? 0})
          </button>
        ))}
      </div>
      {isLoading ? <Loading /> : data!.reviews.length === 0 ? <Empty>Отзывов нет</Empty> : data!.reviews.map((r) => (
        <div key={r.id} className="card" style={{ marginBottom: 14 }}>
          <div className="row"><b>{r.productName}</b><span className="sm">{date(r.createdAt)}</span></div>
          <div className="sm" style={{ textTransform: "none", margin: "5px 0 8px" }}>покупатель: {r.authorName}</div>
          <Stars value={r.rating} size={17} />
          {r.comment && <div style={{ fontSize: 13.5, color: "#333", marginTop: 7 }}>{r.comment}</div>}
          {tab === "pending" && (
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button className="btn" disabled={moderate.isPending} onClick={() => act(r.id, "approve")}>Одобрить</button>
              <button className="btn2" disabled={moderate.isPending} onClick={() => act(r.id, "reject")}>Отклонить</button>
            </div>
          )}
          {tab === "approved" && <div style={{ marginTop: 12 }}><span className="status" style={{ color: "#16a34a" }}>одобрен · опубликован</span></div>}
          {tab === "rejected" && <div style={{ marginTop: 12 }}><span className="status" style={{ color: "#9ca3af" }}>отклонён</span></div>}
        </div>
      ))}
    </div>
  );
}
