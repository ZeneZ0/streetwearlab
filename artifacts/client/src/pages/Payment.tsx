import { useLocation } from "wouter";
import { useGetOrder, usePayOrder } from "../lib/api";
import { useToast } from "../lib/toast";
import { Loading } from "../components/ui";
import { rub } from "../lib/format";

// Демонстрационная страница оплаты: реальный платёжный сервис не подключён
export default function Payment({ id }: { id: number }) {
  const { data: order, isLoading } = useGetOrder(id);
  const pay = usePayOrder();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  if (isLoading || !order) return <Loading />;
  const onPay = () => pay.mutate(order.id, {
    onSuccess: () => { toast({ title: "Оплата прошла", description: `Заказ ${order.orderNumber} подтверждён.` }); setLocation(`/orders/${order.id}`); },
    onError: (e) => toast({ title: "Ошибка оплаты", description: (e as Error).message, variant: "destructive" }),
  });
  return (
    <div className="wrap" style={{ maxWidth: 480 }}>
      <h1>Оплата заказа</h1>
      <div className="card" style={{ marginTop: 22 }}>
        <div className="row"><span className="sm">заказ</span><b>{order.orderNumber}</b></div>
        <div className="row" style={{ margin: "10px 0 18px" }}><span className="sm">к оплате</span><b className="mono" style={{ fontSize: 18 }}>{rub(order.totalAmount)}</b></div>
        {order.status !== "awaiting_payment" ? <div className="sm">Заказ уже оплачен</div> : (<>
          <div className="sm" style={{ marginBottom: 14 }}>
            {order.paymentMethod === "sbp" ? "Отсканируйте QR-код в приложении банка (демо-режим)" : "Введите данные карты (демо-режим, деньги не списываются)"}
          </div>
          {order.paymentMethod === "card" && (<>
            <input className="inp" defaultValue="4242 4242 4242 4242" style={{ marginBottom: 10 }} />
            <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
              <input className="inp" defaultValue="12/28" /><input className="inp" defaultValue="123" />
            </div>
          </>)}
          {order.paymentMethod === "sbp" && <div className="img" style={{ height: 180, width: 180, margin: "0 auto 16px", background: "repeating-conic-gradient(#111 0 25%, #fff 0 50%) 0 0/24px 24px" }} />}
          <button className="btn block" disabled={pay.isPending} onClick={onPay}>Оплатить {rub(order.totalAmount)}</button>
        </>)}
      </div>
    </div>
  );
}
