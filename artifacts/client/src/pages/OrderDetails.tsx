import { useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetOrderReviewsQueryKey, useCreateReview, useGetOrder, useGetOrderReviews,
  type ModerationStatus, type OrderItem, type Review,
} from "../lib/api";
import { useToast } from "../lib/toast";
import { Loading, Stars } from "../components/ui";
import { STATUS, date, deliveryTitle, paymentTitle, rub } from "../lib/format";

const MOD: Record<ModerationStatus, { title: string; color: string }> = {
  pending: { title: "на модерации", color: "#d97706" },
  approved: { title: "опубликован", color: "#16a34a" },
  rejected: { title: "отклонён", color: "#9ca3af" },
};

function ReviewForm({ item, orderId, onClose }: { item: OrderItem; orderId: number; onClose: () => void }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const create = useCreateReview();
  const qc = useQueryClient();
  const { toast } = useToast();

  const submit = () => {
    if (rating < 1) { setError("Выберите оценку от 1 до 5 звёзд"); return; }
    if (comment.length > 1000) { setError("Комментарий не должен превышать 1000 символов"); return; }
    create.mutate({ data: { orderItemId: item.id, rating, comment: comment.trim() || undefined } }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetOrderReviewsQueryKey(orderId) });
        toast({ title: "Отзыв отправлен на модерацию", description: "Спасибо! Мы опубликуем его после проверки." });
        onClose();
      },
      onError: (e) => toast({ title: "Ошибка", description: (e as Error).message, variant: "destructive" }),
    });
  };

  return (
    <div style={{ border: "1.5px solid #222", background: "#f6f6f6", padding: 16, marginTop: 10 }}>
      <div className="sm" style={{ marginBottom: 12 }}>отзыв на: {item.productName}</div>
      <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 5 }}>ОЦЕНКА</div>
      <div className={`stars-box ${error && rating < 1 ? "err" : ""}`} onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" className={`star-btn ${(hover || rating) >= n ? "on" : ""}`}
            onMouseEnter={() => setHover(n)} onClick={() => { setRating(n); setError(null); }}>★</button>
        ))}
      </div>
      {error && <div className="hint">{error}</div>}
      <div style={{ fontSize: 11, fontWeight: 700, margin: "12px 0 6px" }}>КОММЕНТАРИЙ (НЕОБЯЗАТЕЛЬНО)</div>
      <textarea className="inp" style={{ borderColor: "var(--neon-ink)", background: "#fff" }} value={comment}
        maxLength={1000} onChange={(e) => setComment(e.target.value)} />
      <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
        <button className="btn" disabled={create.isPending} onClick={submit}>Отправить отзыв</button>
        <button className="btn2" onClick={onClose}>Отмена</button>
      </div>
    </div>
  );
}

function MyReview({ review }: { review: Review }) {
  const m = MOD[review.moderationStatus];
  return (
    <div style={{ border: "1px dashed #999", padding: "12px 14px", marginTop: 10, background: "#fcfcfc" }}>
      <div className="row"><span className="sm">ваш отзыв</span><span className="status" style={{ color: m.color }}>{m.title}</span></div>
      <div style={{ margin: "6px 0" }}><Stars value={review.rating} size={16} /></div>
      {review.comment && <div style={{ fontSize: 13, color: "#333" }}>{review.comment}</div>}
      {review.moderationStatus === "pending" && (
        <div className="sm" style={{ marginTop: 6, textTransform: "none" }}>отзыв появится на странице товара после проверки администратором</div>
      )}
    </div>
  );
}

export default function OrderDetails({ id }: { id: number }) {
  const { data: order, isLoading, error } = useGetOrder(id);
  const reviews = useGetOrderReviews(id);
  const [openItem, setOpenItem] = useState<number | null>(null);
  if (error) return <div className="wrap" style={{ maxWidth: 680 }}><h1>Заказ не найден</h1></div>;
  if (isLoading || !order) return <Loading />;
  const s = STATUS[order.status];
  const delivered = order.status === "delivered";

  return (
    <div className="wrap" style={{ maxWidth: 680 }}>
      <Link href="/orders" className="sm back">‹ все заказы</Link>
      <div className="row">
        <span style={{ fontSize: 24, fontWeight: 800 }}>{order.orderNumber}</span>
        <span className="mono" style={{ color: s.color, fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>{s.title}</span>
      </div>
      <div className="sm" style={{ textTransform: "none", margin: "5px 0 20px" }}>оформлен {date(order.createdAt)}</div>
      <div className="two-col" style={{ display: "flex", gap: 22 }}>
        <div className="card" style={{ flex: 1 }}>
          <div className="lbl" style={{ marginBottom: 12 }}>Доставка</div>
          <div className="sm" style={{ textTransform: "none", lineHeight: 1.7 }}>{deliveryTitle(order.deliveryMethod).toLowerCase()}<br />{order.addressText?.toLowerCase() ?? "самовывоз из шоурума"}</div>
        </div>
        <div className="card" style={{ flex: 1 }}>
          <div className="lbl" style={{ marginBottom: 12 }}>Оплата</div>
          <div className="sm" style={{ textTransform: "none", lineHeight: 1.7 }}>{paymentTitle(order.paymentMethod)}<br />СТОИМОСТЬ ДОСТАВКИ: {rub(order.deliveryCost)}</div>
        </div>
      </div>
      <div className="card" style={{ marginTop: 22 }}>
        <div className="lbl">Товары ({order.items.length})</div>
        {order.items.map((it) => {
          const review = reviews.data?.find((r) => r.orderItemId === it.id);
          return (
            <div key={it.id} style={{ marginBottom: 18 }}>
              <div className="row">
                <b style={{ fontSize: 13.5 }}>{it.productName}{it.size !== "ONE SIZE" ? ` ${it.size}` : ""}</b>
                <span>
                  {delivered && !review && openItem !== it.id && (
                    <button className="link-neon" onClick={() => setOpenItem(it.id)}>☆ отзыв</button>
                  )}
                  <b className="mono" style={{ marginLeft: 12 }}>{rub(it.total)}</b>
                </span>
              </div>
              <div className="sm" style={{ marginTop: 4 }}>размер: {it.size} / {it.color}{it.quantity > 1 ? ` · ${it.quantity} шт.` : ""}</div>
              {it.customization && <div className="sm" style={{ color: "var(--neon-ink)", marginTop: 2 }}>кастом</div>}
              {openItem === it.id && !review && <ReviewForm item={it} orderId={order.id} onClose={() => setOpenItem(null)} />}
              {review && <MyReview review={review} />}
            </div>
          );
        })}
      </div>
      <div className="card row" style={{ marginTop: 22, padding: "18px 16px" }}>
        <b>ИТОГО</b><b className="mono" style={{ fontSize: 16 }}>{rub(order.totalAmount)}</b>
      </div>
    </div>
  );
}
