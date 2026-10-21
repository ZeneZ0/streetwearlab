import { useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "../lib/auth";
import { useGetCart, useNotifications, useReadNotifications } from "../lib/api";

const BellIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
);
const UserIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2"><circle cx="12" cy="8" r="4" /><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" /></svg>
);
const CartIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2"><circle cx="8" cy="21" r="1" /><circle cx="19" cy="21" r="1" /><path d="M2 2h3l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" /></svg>
);

function Header() {
  const { user } = useAuth();
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const cart = useGetCart(!!user);
  const notes = useNotifications(!!user);
  const read = useReadNotifications();
  const cartCount = cart.data?.items.reduce((s, i) => s + i.quantity, 0) ?? 0;
  const unread = notes.data?.filter((n) => !n.isRead).length ?? 0;
  const isAdmin = user?.role === "admin" || user?.role === "manager";
  const nav = (href: string, title: string) => (
    <Link href={href} className={location.startsWith(href) ? "active" : ""}>{title}</Link>
  );

  return (
    <header className="header">
      <Link href="/" className="logo">STREETWEARLAB</Link>
      <nav className="nav">
        {nav("/catalog", "КАТАЛОГ")}
        {nav("/studio", "СТУДИЯ")}
        {isAdmin && nav("/admin/reviews", "ОТЗЫВЫ")}
        {isAdmin && nav("/admin/orders", "ЗАКАЗЫ")}
        {isAdmin && nav("/admin/products", "ТОВАРЫ")}
      </nav>
      <div className="icons">
        <span style={{ position: "relative" }}>
          <button className="icon-btn" aria-label="Уведомления"
            onClick={() => { setOpen(!open); if (!open && unread) read.mutate(); }}>
            <BellIcon />{unread > 0 && <span className="badge">{unread}</span>}
          </button>
          {open && (
            <div className="dropdown" onMouseLeave={() => setOpen(false)}>
              {!user && <div className="empty">Войдите, чтобы видеть уведомления</div>}
              {user && notes.data?.length === 0 && <div className="empty">Уведомлений нет</div>}
              {notes.data?.map((n) => (
                <Link key={n.id} href={n.link ?? "#"} className={`item ${n.isRead ? "" : "unread"}`} onClick={() => setOpen(false)}>
                  {n.text}<div className="sm" style={{ marginTop: 4 }}>{n.createdAt.slice(0, 16)}</div>
                </Link>
              ))}
            </div>
          )}
        </span>
        <Link href={user ? "/profile" : "/login"} className="icon-btn" aria-label="Профиль"><UserIcon /></Link>
        <Link href="/cart" className="icon-btn" aria-label="Корзина">
          <CartIcon />{cartCount > 0 && <span className="badge">{cartCount}</span>}
        </Link>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="fcols">
        <div>
          <span className="flogo">STREETWEAR</span>
          <span style={{ lineHeight: 1.45 }}>там, где уличная культура встречается точность.<br />создано для культуры.</span>
        </div>
        <div>
          <Link href="/catalog">ВСЕ ТОВАРЫ</Link>
          <Link href="/catalog?category=Худи">ХУДИ</Link>
          <Link href="/catalog?category=Футболки">ОДЕЖДА</Link>
          <Link href="/studio">КАСТОМИЗАЦИЯ</Link>
        </div>
        <div><span>ВОПРОСЫ И ОТВЕТЫ</span><span>ДОСТАВКА И ВОЗВРАТ</span><span>КОНТАКТЫ</span></div>
        <div><span>ИНСТАГРАМ</span><span>ТВИТТЕР</span><span>ТИКТОК</span></div>
      </div>
      <div className="fbot">
        <span>© 2026 STREETWEARLAB. ВСЕ ПРАВА ЗАЩИЩЕНЫ.</span>
        <span>ПОЛИТИКА КОНФИДЕНЦИАЛЬНОСТИ &nbsp;&nbsp; УСЛОВИЯ ПОЛЬЗОВАНИЯ</span>
      </div>
    </footer>
  );
}

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="app">
      <Header />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
