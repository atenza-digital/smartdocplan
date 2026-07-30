import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { isCompanyUser, isPlatformUser } from "@shared/permissions";

const COMPANY_SCOPE_STORAGE_KEY = "smartdocplan-platform-company-scope";

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
  effectiveCompanyId: number | null;
  scopedCompanyId: number | null;
  setScopedCompanyId: (companyId: number | null) => void;
};

const LocalAuthContext = createContext<AuthContextType | null>(null);

export function LocalAuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, loading: true, error: null });
  const [scopedCompanyId, setScopedCompanyIdState] = useState<number | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem(COMPANY_SCOPE_STORAGE_KEY);
    if (!saved) return;
    const parsed = Number(saved);
    if (!Number.isNaN(parsed) && parsed > 0) {
      setScopedCompanyIdState(parsed);
    }
  }, []);

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
    window.localStorage.removeItem(COMPANY_SCOPE_STORAGE_KEY);
    setScopedCompanyIdState(null);
    setState({ user: null, loading: false, error: null });
  }, []);

  const setScopedCompanyId = useCallback((companyId: number | null) => {
    if (!companyId) {
      window.localStorage.removeItem(COMPANY_SCOPE_STORAGE_KEY);
      setScopedCompanyIdState(null);
      return;
    }
    window.localStorage.setItem(COMPANY_SCOPE_STORAGE_KEY, String(companyId));
    setScopedCompanyIdState(companyId);
  }, []);

  const isPlatformUserValue = isPlatformUser(state.user?.role ?? null);
  const isCompanyUserValue = isCompanyUser(state.user?.role ?? null);
  const effectiveCompanyId = isPlatformUserValue
    ? scopedCompanyId
    : (state.user?.companyId ?? null);

  return (
    <LocalAuthContext.Provider value={{
      ...state,
      login,
      logout,
      refresh,
      isAuthenticated: !!state.user,
      isPlatformUser: isPlatformUserValue,
      isCompanyUser: isCompanyUserValue,
      effectiveCompanyId,
      scopedCompanyId,
      setScopedCompanyId,
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
