import type React from "react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "../lib/auth";

function AuthForm({ mode }: { mode: "login" | "register" }) {
  const { login, register } = useAuth();
  const [, setLocation] = useLocation();
  const [form, setForm] = useState({ firstName: "", email: mode === "login" ? "client@demo.ru" : "", password: mode === "login" ? "123456" : "", phone: "" });
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (mode === "login") await login(form.email, form.password);
      else await register(form);
      setLocation("/catalog");
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <form className="wrap" style={{ maxWidth: 420 }} onSubmit={submit}>
      <h1>{mode === "login" ? "Вход" : "Регистрация"}</h1>
      <div className="card" style={{ marginTop: 22 }}>
        {mode === "register" && (
          <label className="field"><span className="sm">имя</span><input className="inp" value={form.firstName} onChange={set("firstName")} /></label>
        )}
        <label className="field"><span className="sm">email</span><input className="inp" type="email" value={form.email} onChange={set("email")} /></label>
        <label className="field"><span className="sm">пароль</span><input className="inp" type="password" value={form.password} onChange={set("password")} /></label>
        {mode === "register" && (
          <label className="field"><span className="sm">телефон</span><input className="inp" value={form.phone} onChange={set("phone")} /></label>
        )}
        {error && <div className="hint" style={{ marginBottom: 12 }}>{error}</div>}
        <button className="btn block" type="submit">{mode === "login" ? "Войти" : "Зарегистрироваться"}</button>
        <div className="sm" style={{ marginTop: 14, textAlign: "center" }}>
          {mode === "login"
            ? <Link href="/register">нет аккаунта? зарегистрироваться</Link>
            : <Link href="/login">уже есть аккаунт? войти</Link>}
        </div>
        {mode === "login" && (
          <div className="sm" style={{ marginTop: 14, textTransform: "none", lineHeight: 1.6 }}>
            демо: client@demo.ru / 123456<br />администратор: admin@demo.ru / admin123
          </div>
        )}
      </div>
    </form>
  );
}

export const Login = () => <AuthForm mode="login" />;
export const Register = () => <AuthForm mode="register" />;

export function Profile() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  if (!user) return null;
  return (
    <div className="wrap" style={{ maxWidth: 480 }}>
      <h1>Профиль</h1>
      <div className="card" style={{ marginTop: 22 }}>
        <div style={{ fontWeight: 800, fontSize: 17 }}>{user.firstName}</div>
        <div className="sm" style={{ textTransform: "none", margin: "6px 0 18px" }}>{user.email}{user.phone ? ` · ${user.phone}` : ""}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Link href="/orders" className="btn block">Мои заказы</Link>
          {user.role !== "client" && <Link href="/admin/reviews" className="btn2">Модерация отзывов</Link>}
          <button className="btn2" onClick={() => { logout(); setLocation("/catalog"); }}>Выйти</button>
        </div>
      </div>
    </div>
  );
}
