import { Link } from "wouter";
import { useGetOrders } from "../lib/api";
import { Empty, Loading, StatusBadge } from "../components/ui";
import { date, plural, rub } from "../lib/format";

export default function Orders() {
  const { data, isLoading } = useGetOrders();
  if (isLoading) return <Loading />;
  const n = data?.length ?? 0;
  return (
    <div className="wrap" style={{ maxWidth: 680 }}>
      <h1>Мои заказы</h1>
      <div className="sm" style={{ margin: "8px 0 22px" }}>{n} {plural(n, "заказ", "заказа", "заказов")} · сначала новые</div>
      {n === 0 ? <Empty>У вас пока нет заказов</Empty> : data!.map((o) => {
        const q = o.items.reduce((s, i) => s + i.quantity, 0);
        return (
          <Link key={o.id} href={`/orders/${o.id}`} className="card row" style={{ marginBottom: 14, padding: "18px 24px" }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16 }}>{o.orderNumber}</div>
              <div className="sm" style={{ marginTop: 5 }}>оформлен {date(o.createdAt)} · {q} {plural(q, "позиция", "позиции", "позиций")}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 30 }}>
              <StatusBadge status={o.status} />
              <b className="mono" style={{ width: 100, textAlign: "right" }}>{rub(o.totalAmount)}</b>
              <span style={{ fontSize: 16 }}>›</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
