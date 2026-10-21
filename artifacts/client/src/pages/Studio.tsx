import { Link } from "wouter";

export default function Studio() {
  return (
    <div className="wrap" style={{ maxWidth: 760 }}>
      <h1>Студия кастомизации</h1>
      <div className="card" style={{ marginTop: 22, lineHeight: 1.6 }}>
        <p>Добавьте к вещи собственный принт, надпись или вышивку. Кастомизация доступна для товаров с отметкой
          «Кастом» и стоит <b className="mono">500 ₽</b> за позицию.</p>
        <p style={{ marginTop: 12 }}>Выберите товар в каталоге, отметьте «Кастомизация» на странице товара и опишите
          пожелания — дизайнер свяжется с вами после оформления заказа.</p>
        <div style={{ marginTop: 18 }}><Link href="/catalog" className="btn">Перейти в каталог</Link></div>
      </div>
    </div>
  );
}
