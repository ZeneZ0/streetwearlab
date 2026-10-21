import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

interface ToastData { id: number; title: string; description?: string; variant?: "default" | "destructive" }
const Ctx = createContext<{ toast: (t: Omit<ToastData, "id">) => void }>({ toast: () => {} });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastData[]>([]);
  const toast = useCallback((t: Omit<ToastData, "id">) => {
    const id = Date.now() + Math.random();
    setItems((s) => [...s, { ...t, id }]);
    setTimeout(() => setItems((s) => s.filter((x) => x.id !== id)), 4000);
  }, []);
  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div className="toasts">
        {items.map((t) => (
          <div key={t.id} className={`toast ${t.variant === "destructive" ? "destructive" : ""}`}>
            <b>{t.title}</b>{t.description}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
export const useToast = () => useContext(Ctx);
