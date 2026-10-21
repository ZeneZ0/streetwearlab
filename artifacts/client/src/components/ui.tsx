import type { ReactNode } from "react";
import { STATUS } from "../lib/format";
import type { OrderStatus } from "../lib/api";

export function Stars({ value, size = 15 }: { value: number; size?: number }) {
  const full = Math.round(value);
  return (
    <span className="stars" style={{ fontSize: size }}>
      {"★".repeat(full)}<span className="off">{"★".repeat(5 - full)}</span>
    </span>
  );
}

export function ProductImage({ name, color, height }: { name: string; color: string; height?: number }) {
  return (
    <div className="img" style={{ height, background: `linear-gradient(135deg, ${color}, #bdbdbd)` }}>{name}</div>
  );
}

export function StatusBadge({ status }: { status: OrderStatus }) {
  const s = STATUS[status];
  return <span className="status" style={{ color: s.color }}>{s.title}</span>;
}

export function Loading() {
  return <div className="sm" style={{ padding: 20 }}>Загрузка…</div>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="card sm" style={{ textAlign: "center", padding: 40 }}>{children}</div>;
}
