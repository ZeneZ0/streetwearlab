import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { getGetCartQueryKey, useCreateOrder, useGetAddresses, useGetCart } from "../lib/api";
import { useToast } from "../lib/toast";
import { DELIVERY, PAYMENT, num, rub } from "../lib/format";
import { Empty, Loading } from "../components/ui";

export default function Checkout() {
  const { data: cart, isLoading } = useGetCart();
  const addresses = useGetAddresses();
  const createOrderMutation = useCreateOrder();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [address, setAddress] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<string>("pochta");
  const [paymentMethod, setPaymentMethod] = useState<string>("card");
  const [addressError, setAddressError] = useState(false);

  // подставляем последний сохранённый адрес пользователя
  useEffect(() => {
    if (addresses.data?.length && !address) setAddress(addresses.data[0].addressText);
  }, [addresses.data]);

  if (isLoading) return <Loading />;
  if (!cart || cart.items.length === 0) return <div className="wrap" style={{ maxWidth: 760 }}><Empty>Корзина пуста</Empty></div>;

  const deliveryCost = DELIVERY.find((d) => d.code === deliveryMethod)?.cost ?? 0;
  const total = cart.subtotal + deliveryCost;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cart || cart.items.length === 0) {
      toast({ title: "Корзина пуста", variant: "destructive" });
      return;
    }
    if (deliveryMethod !== "pickup" && !address.trim()) {
      setAddressError(true);
      return;
    }
    createOrderMutation.mutate(
      { data: { deliveryMethod, paymentMethod, addressText: address } },
      {
        onSuccess: (order) => {
          queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
          if (paymentMethod === "card" || paymentMethod === "sbp") {
            setLocation(`/payment/${order.id}`);
          } else {
            toast({ title: "Заказ оформлен",
                    description: `Заказ ${order.orderNumber} подтверждён.` });
            setLocation(`/orders/${order.id}`);
          }
        },
        onError: (err: unknown) => {
          const message =
            (err as { data?: { error?: string } })?.data?.error ??
            "Не удалось оформить заказ";
          toast({ title: "Ошибка", description: message, variant: "destructive" });
        },
      }
    );
  };

  return (
    <form className="wrap" style={{ maxWidth: 840 }} onSubmit={handleSubmit}>
      <h1>Оформление заказа</h1>
      <div className="two-col" style={{ display: "flex", gap: 30, marginTop: 24, alignItems: "flex-start" }}>
        <div style={{ width: 550, display: "flex", flexDirection: "column", gap: 22 }}>
          <div className="card">
            <div className="lbl">Адрес доставки</div>
            <div className="sm" style={{ marginBottom: 8 }}>полный адрес</div>
            <input className={`inp ${addressError ? "err" : ""}`} value={address}
              placeholder={deliveryMethod === "pickup" ? "Для самовывоза адрес не требуется" : "Город, улица, дом, индекс"}
              onChange={(e) => { setAddress(e.target.value); setAddressError(false); }} />
            {addressError && <div className="hint">Укажите адрес доставки, чтобы оформить заказ</div>}
          </div>
          <div className="card">
            <div className="lbl">Способ доставки</div>
            {DELIVERY.map((d) => (
              <button type="button" key={d.code} className={`opt ${deliveryMethod === d.code ? "sel" : ""}`}
                onClick={() => { setDeliveryMethod(d.code); setAddressError(false); }}>
                <span className="sq" />{d.title}<span className="pr">{d.cost ? `${d.cost} ₽` : "БЕСПЛАТНО"}</span>
              </button>
            ))}
          </div>
          <div className="card">
            <div className="lbl">Способ оплаты</div>
            {PAYMENT.map((p) => (
              <button type="button" key={p.code} className={`opt ${paymentMethod === p.code ? "sel" : ""}`}
                onClick={() => setPaymentMethod(p.code)}>
                <span className="sq" />{p.title}
              </button>
            ))}
          </div>
        </div>
        <div className="card" style={{ width: 260 }}>
          <div className="lbl">Состав заказа</div>
          <div className="line" style={{ marginTop: 0 }} />
          {cart.items.map((i) => (
            <div key={i.id} className="row sm" style={{ marginBottom: 7 }}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 160 }}>
                {i.productName} {i.size}{i.quantity > 1 ? ` ×${i.quantity}` : ""}
              </span>
              <span style={{ color: "#111" }}>{num(i.total)}</span>
            </div>
          ))}
          <div className="line" />
          <div className="row sm" style={{ marginBottom: 7 }}><span>подытог</span><span>{rub(cart.subtotal)}</span></div>
          <div className="row sm"><span>доставка</span><span>{rub(deliveryCost)}</span></div>
          <div className="line" />
          <div className="row" style={{ margin: "10px 0 16px" }}><b>ИТОГО</b><b className="mono" style={{ fontSize: 15 }}>{rub(total)}</b></div>
          <button type="submit" className="btn block" disabled={createOrderMutation.isPending}>
            {paymentMethod === "cash" ? "Оформить заказ" : "Перейти к оплате"}
          </button>
        </div>
      </div>
    </form>
  );
}
