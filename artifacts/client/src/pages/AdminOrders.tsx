import { Link } from "wouter";
import { useAdminOrders, useAdminProducts, useSetOrderStatus, type OrderStatus } from "../lib/api";
import { Loading, StatusBadge } from "../components/ui";
import { STATUS, date, deliveryTitle, rub } from "../lib/format";

export function AdminOrders() {
  const { data, isLoading } = useAdminOrders();
  const setStatus = useSetOrderStatus();
  if (isLoading) return <Loading />;
  return (
    <div className="wrap" style={{ maxWidth: 1100 }}>
      <h1>Заказы</h1>
      <div className="sm" style={{ margin: "8px 0 20px", textTransform: "none" }}>
        Смена статуса заказа выполняется менеджером (модуль обработки заказов). Чтобы проверить отзывы, переведите заказ в статус «Доставлен».
      </div>
      <table className="tbl">
        <thead><tr><th>Номер</th><th>Дата</th><th>Покупатель</th><th>Доставка</th><th>Сумма</th><th>Статус</th><th>Изменить</th></tr></thead>
        <tbody>
          {data?.map((o) => (
            <tr key={o.id}>
              <td><Link href={`/orders/${o.id}`}><b>{o.orderNumber}</b></Link></td>
              <td>{date(o.createdAt)}</td>
              <td>{o.customer}</td>
              <td>{deliveryTitle(o.deliveryMethod)}</td>
              <td className="mono">{rub(o.totalAmount)}</td>
              <td><StatusBadge status={o.status} /></td>
              <td>
                <select className="inp" value={o.status}
                  onChange={(e) => setStatus.mutate({ id: o.id, status: e.target.value as OrderStatus })}>
                  {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.title}</option>)}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AdminProducts() {
  const { data, isLoading } = useAdminProducts();
  if (isLoading) return <Loading />;
  return (
    <div className="wrap" style={{ maxWidth: 1100 }}>
      <h1>Товары</h1>
      <table className="tbl" style={{ marginTop: 20 }}>
        <thead><tr><th>Товар</th><th>Категория</th><th>Цена</th><th>Рейтинг</th><th>Остатки по вариантам</th></tr></thead>
        <tbody>
          {data?.map((p) => (
            <tr key={p.id}>
              <td><Link href={`/products/${p.id}`}><b>{p.name}</b></Link></td>
              <td>{p.category}</td>
              <td className="mono">{rub(parseFloat(p.basePrice))}</td>
              <td>{p.reviewCount ? `${p.rating} (${p.reviewCount})` : "—"}</td>
              <td className="sm" style={{ textTransform: "none" }}>{p.variants?.map((v) => `${v.size}/${v.color}: ${v.stock}`).join(", ")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
