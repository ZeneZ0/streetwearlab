import type { OrderStatus } from "./api";

export const rub = (n: number) => `${Math.round(n).toLocaleString("ru-RU").replace(/,/g, " ")} ₽`;
export const num = (n: number) => Math.round(n).toLocaleString("ru-RU");
export const date = (s: string) => {
  const d = new Date(s.replace(" ", "T"));
  return isNaN(+d) ? s : d.toLocaleDateString("ru-RU");
};

export const DELIVERY = [
  { code: "cdek", title: "СДЭК", cost: 350 },
  { code: "pochta", title: "Почта России", cost: 200 },
  { code: "boxberry", title: "Boxberry", cost: 280 },
  { code: "pickup", title: "Самовывоз", cost: 0 },
] as const;
export const PAYMENT = [
  { code: "card", title: "Картой (онлайн)" },
  { code: "sbp", title: "СБП (система быстрых платежей)" },
  { code: "cash", title: "Наличными при получении" },
] as const;
export const deliveryTitle = (c: string) => DELIVERY.find((d) => d.code === c)?.title ?? c;
export const paymentTitle = (c: string) => ({ card: "картой", sbp: "сбп", cash: "наличными" } as Record<string, string>)[c] ?? c;

export const STATUS: Record<OrderStatus, { title: string; color: string }> = {
  awaiting_payment: { title: "Ожидает оплаты", color: "#d97706" },
  confirmed: { title: "Подтверждён", color: "#2563eb" },
  shipped: { title: "Отправлен", color: "#7c3aed" },
  delivered: { title: "Доставлен", color: "#16a34a" },
  cancelled: { title: "Отменён", color: "#9ca3af" },
};

export const plural = (n: number, one: string, few: string, many: string) => {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
};
