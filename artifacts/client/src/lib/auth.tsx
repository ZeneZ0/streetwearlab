import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api, tokenStore, type User } from "./api";

interface AuthCtx {
  user: User | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { firstName: string; email: string; password: string; phone?: string }) => Promise<void>;
  logout: () => void;
}
const Ctx = createContext<AuthCtx>(null as unknown as AuthCtx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const qc = useQueryClient();

  useEffect(() => {
    if (!tokenStore.get()) { setReady(true); return; }
    api<User>("/auth/me").then(setUser).catch(() => tokenStore.set(null)).finally(() => setReady(true));
  }, []);

  const apply = (r: { token: string; user: User }) => { tokenStore.set(r.token); setUser(r.user); qc.clear(); };
  const value: AuthCtx = {
    user, ready,
    login: async (email, password) => apply(await api("/auth/login", { method: "POST", body: { email, password } })),
    register: async (data) => apply(await api("/auth/register", { method: "POST", body: data })),
    logout: () => { tokenStore.set(null); setUser(null); qc.clear(); },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export const useAuth = () => useContext(Ctx);
