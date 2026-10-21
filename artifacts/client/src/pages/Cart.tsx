import { Link } from "wouter";
import { useGetCart, useRemoveCartItem, useUpdateCartItem } from "../lib/api";
import { Empty, Loading, ProductImage } from "../components/ui";
import { rub } from "../lib/format";

export default function CartPage() {
  const { data, isLoading } = useGetCart();
  const upd = useUpdateCartItem();
  const del = useRemoveCartItem();
  if (isLoading) return <Loading />;
  return (
    <div className="wrap" style={{ maxWidth: 900 }}>
      <h1>Корзина</h1>
      <div style={{ marginTop: 22 }}>
        {!data?.items.length ? <Empty>Корзина пуста. <Link href="/catalog" className="link-neon">Перейти в каталог</Link></Empty> : (
          <div className="two-col" style={{ display: "flex", gap: 26, alignItems: "flex-start" }}>
            <div className="card" style={{ flex: 1 }}>
              <div className="lbl">Товары ({data.items.length})</div>
              {data.items.map((i) => (
                <div key={i.id} style={{ display: "flex", gap: 14, padding: "12px 0", borderTop: "1px solid #eee" }}>
                  <div style={{ width: 84 }}><ProductImage name="" color={i.imageColor} height={84} /></div>
                  <div style={{ flex: 1 }}>
                    <div className="row"><b>{i.productName}</b><b className="mono">{rub(i.total)}</b></div>
                    <div className="sm" style={{ marginTop: 4 }}>размер: {i.size} / {i.color}</div>
                    {i.customization && <div className="sm" style={{ color: "var(--neon-ink)", marginTop: 3 }}>кастом{i.customizationDetails ? `: ${i.customizationDetails}` : ""}</div>}
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
                      <button className="btn2" style={{ padding: "4px 10px" }} disabled={i.quantity <= 1} onClick={() => upd.mutate({ id: i.id, quantity: i.quantity - 1 })}>−</button>
                      <span className="mono">{i.quantity}</span>
                      <button className="btn2" style={{ padding: "4px 10px" }} disabled={i.quantity >= i.stock} onClick={() => upd.mutate({ id: i.id, quantity: i.quantity + 1 })}>+</button>
                      <button className="sm" style={{ marginLeft: "auto" }} onClick={() => del.mutate(i.id)}>удалить</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="card" style={{ width: 280 }}>
              <div className="lbl">Итого</div>
              <div className="row" style={{ marginBottom: 16 }}><span className="sm">подытог</span><b className="mono">{rub(data.subtotal)}</b></div>
              <Link href="/checkout" className="btn block">Оформить заказ</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
