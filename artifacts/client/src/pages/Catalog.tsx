import { Link, useSearch } from "wouter";
import { useGetProducts } from "../lib/api";
import { ProductImage, Stars, Loading } from "../components/ui";
import { rub } from "../lib/format";

const CATEGORIES = ["Футболки", "Худи", "Брюки", "Куртки", "Аксессуары"];

export default function Catalog() {
  const params = new URLSearchParams(useSearch());
  const category = params.get("category") ?? undefined;
  const { data, isLoading } = useGetProducts(category);
  return (
    <div className="wrap" style={{ maxWidth: 1180 }}>
      <h1>Каталог</h1>
      <div className="filters">
        <Link href="/catalog" className={`chip ${!category ? "on" : ""}`}>Все</Link>
        {CATEGORIES.map((c) => (
          <Link key={c} href={`/catalog?category=${encodeURIComponent(c)}`} className={`chip ${category === c ? "on" : ""}`}>{c}</Link>
        ))}
      </div>
      {isLoading ? <Loading /> : (
        <div className="grid">
          {data?.map((p) => (
            <Link key={p.id} href={`/products/${p.id}`} className="pcard">
              <ProductImage name={p.name} color={p.imageColor} />
              <div className="body">
                <span className="name">{p.name}</span>
                <span className="row">
                  <span>{p.reviewCount > 0 ? <><Stars value={parseFloat(p.rating)} size={12} /> <span className="sm">{p.rating}</span></> : <span className="sm">нет отзывов</span>}</span>
                  <b className="mono">{rub(parseFloat(p.basePrice))}</b>
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
