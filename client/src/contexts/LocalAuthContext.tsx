import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { isCompanyUser, isPlatformUser } from "@shared/permissions";

export type LocalUser = {
  id: number;
  name: string | null;
  email: string | null;
  role: string;
  companyId: number | null;
};

type AuthState = {
  user: LocalUser | null;
  loading: boolean;
  error: string | null;
};

type AuthContextType = AuthState & {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  isAuthenticated: boolean;
  isPlatformUser: boolean;
  isCompanyUser: boolean;
};

const LocalAuthContext = createContext<AuthContextType | null>(null);

export function LocalAuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, loading: true, error: null });

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.ok) {
        const user = await res.json();
        setState({ user, loading: false, error: null });
      } else {
        setState({ user: null, loading: false, error: null });
      }
    } catch {
      setState({ user: null, loading: false, error: null });
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    setState(s => ({ ...s, loading: true, error: null }));
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setState(s => ({ ...s, loading: false, error: data.error ?? "Erro ao fazer login." }));
      throw new Error(data.error ?? "Erro ao fazer login.");
    }
    setState({ user: data, loading: false, error: null });
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setState({ user: null, loading: false, error: null });
  }, []);

  const isPlatformUserValue = isPlatformUser(state.user?.role ?? null);
  const isCompanyUserValue = isCompanyUser(state.user?.role ?? null);

  return (
    <LocalAuthContext.Provider value={{
      ...state,
      login,
      logout,
      refresh,
      isAuthenticated: !!state.user,
      isPlatformUser: isPlatformUserValue,
      isCompanyUser: isCompanyUserValue,
    }}>
      {children}
    </LocalAuthContext.Provider>
  );
}

export function useLocalAuth() {
  const ctx = useContext(LocalAuthContext);
  if (!ctx) throw new Error("useLocalAuth must be used inside LocalAuthProvider");
  return ctx;
}
