import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAddToCart, useGetProduct, useGetProductReviews, ApiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useToast } from "../lib/toast";
import { ProductImage, Stars, Loading } from "../components/ui";
import { date, plural, rub } from "../lib/format";

function ReviewsBlock({ productId }: { productId: number }) {
  const { data } = useGetProductReviews(productId);
  const [all, setAll] = useState(false);
  if (!data) return null;
  const shown = all ? data.reviews : data.reviews.slice(0, 4);
  const max = Math.max(1, ...data.distribution.map((d) => d.count));
  return (
    <div className="card" style={{ marginTop: 30 }}>
      <div className="lbl">Отзывы</div>
      {data.reviewCount === 0 ? <div className="sm">Отзывов пока нет</div> : (
        <>
          <div style={{ display: "flex", gap: 46, alignItems: "center", marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 46, fontWeight: 800 }}>{data.rating.toFixed(1)}</div>
              <Stars value={data.rating} size={18} />
              <div className="sm" style={{ marginTop: 5 }}>{data.reviewCount} {plural(data.reviewCount, "отзыв", "отзыва", "отзывов")}</div>
            </div>
            <div>
              {data.distribution.map((d) => (
                <div key={d.rating} style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 4 }}>
                  <span className="sm" style={{ width: 12 }}>{d.rating}</span>
                  <div style={{ width: 190, height: 7, background: "#eee" }}>
                    <div style={{ width: `${(d.count / max) * 100}%`, height: 7, background: "var(--star)" }} />
                  </div>
                  <span className="sm">{d.count}</span>
                </div>
              ))}
            </div>
          </div>
          {shown.map((r) => (
            <div key={r.id} style={{ borderTop: "1px solid #e3e3e3", padding: "15px 0" }}>
              <div className="row"><b>{r.authorName}</b><span className="sm">{date(r.createdAt)}</span></div>
              <div style={{ margin: "6px 0" }}><Stars value={r.rating} size={16} /></div>
              {r.comment && <div style={{ color: "#333", lineHeight: 1.45 }}>{r.comment}</div>}
            </div>
          ))}
          {data.reviews.length > 4 && !all && (
            <button className="sm" style={{ display: "block", margin: "8px auto 0" }} onClick={() => setAll(true)}>
              показать ещё {data.reviews.length - 4} {plural(data.reviews.length - 4, "отзыв", "отзыва", "отзывов")}
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default function ProductPage({ id }: { id: number }) {
  const { data: p, isLoading } = useGetProduct(id);
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const add = useAddToCart();
  const [color, setColor] = useState<string | null>(null);
  const [size, setSize] = useState<string | null>(null);
  const [custom, setCustom] = useState(false);
  const [details, setDetails] = useState("");

  const colors = useMemo(() => [...new Set(p?.variants?.map((v) => v.color) ?? [])], [p]);
  const curColor = color ?? colors[0];
  const variants = p?.variants?.filter((v) => v.color === curColor) ?? [];
  const variant = variants.find((v) => v.size === size);

  if (isLoading || !p) return <Loading />;
  const price = parseFloat(p.basePrice) + (variant ? parseFloat(variant.additionalPrice) : 0) + (custom ? 500 : 0);

  const onAdd = () => {
    if (!user) { setLocation("/login"); return; }
    if (!variant) { toast({ title: "Выберите размер", variant: "destructive" }); return; }
    add.mutate({ productVariantId: variant.id, quantity: 1, customization: custom, customizationDetails: details }, {
      onSuccess: () => toast({ title: "Добавлено в корзину", description: `${p.name}, ${variant.size}` }),
      onError: (e) => toast({ title: "Ошибка", description: (e as ApiError).message, variant: "destructive" }),
    });
  };

  return (
    <div className="wrap" style={{ maxWidth: 1000 }}>
      <div className="sm" style={{ marginBottom: 18 }}>
        <Link href="/catalog">каталог</Link> / <Link href={`/catalog?category=${encodeURIComponent(p.category)}`}>{p.category}</Link>
      </div>
      <div className="two-col" style={{ display: "flex", gap: 40 }}>
        <div style={{ width: 400 }}><ProductImage name={p.name} color={p.imageColor} height={400} /></div>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 26 }}>{p.name}</h1>
          <div style={{ margin: "10px 0" }}>
            {p.reviewCount > 0
              ? <><Stars value={parseFloat(p.rating)} size={17} /> <span className="sm" style={{ marginLeft: 6 }}>{p.rating} · {p.reviewCount} {plural(p.reviewCount, "отзыв", "отзыва", "отзывов")}</span></>
              : <span className="sm">отзывов пока нет</span>}
          </div>
          <div className="mono" style={{ fontSize: 20, fontWeight: 700, margin: "14px 0" }}>{rub(price)}</div>
          <p style={{ color: "#444", lineHeight: 1.5, marginBottom: 14 }}>{p.description}</p>
          {colors.length > 1 && (<>
            <div className="lbl" style={{ margin: "18px 0 8px" }}>Цвет</div>
            <div style={{ display: "flex", gap: 7 }}>
              {colors.map((c) => <button key={c} className={`chip ${c === curColor ? "on" : ""}`} onClick={() => { setColor(c); setSize(null); }}>{c}</button>)}
            </div>
          </>)}
          <div className="lbl" style={{ margin: "18px 0 8px" }}>Размер</div>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {variants.map((v) => (
              <button key={v.id} disabled={v.stock < 1} className={`opt size ${size === v.size ? "on" : ""}`}
                title={v.stock < 1 ? "нет в наличии" : `в наличии: ${v.stock}`} onClick={() => setSize(v.size)}>{v.size}</button>
            ))}
          </div>
          {p.customizationAvailable && (
            <div style={{ marginTop: 16 }}>
              <button className={`opt ${custom ? "sel" : ""}`} onClick={() => setCustom(!custom)}>
                <span className="sq" />Кастомизация<span className="pr">+500 ₽</span>
              </button>
              {custom && <textarea className="inp" placeholder="Опишите принт или надпись" value={details} onChange={(e) => setDetails(e.target.value)} />}
            </div>
          )}
          <button className="btn block" style={{ marginTop: 16 }} disabled={add.isPending} onClick={onAdd}>Добавить в корзину</button>
        </div>
      </div>
      <ReviewsBlock productId={p.id} />
    </div>
  );
}
