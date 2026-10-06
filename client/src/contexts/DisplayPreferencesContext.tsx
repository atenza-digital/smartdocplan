import React, { createContext, useContext, useEffect, useState } from "react";
import { useLocalAuth } from "./LocalAuthContext";

export type DialogSize = "pequeno" | "medio" | "grande";

type DisplayPreferencesState = {
  dialogSize: DialogSize;
  setDialogSize: (size: DialogSize) => void;
};

// Preferência gravada por usuário, para quem divide o mesmo computador.
const STORAGE_KEY = "display-dialog-size";
const storageKey = (userId?: number | null) => (userId ? `${STORAGE_KEY}:${userId}` : STORAGE_KEY);

// Largura máxima das janelas de diálogo (a altura é sempre limitada a 90% da tela).
export const DIALOG_SIZES: Record<DialogSize, { label: string; descricao: string; maxWidth: string }> = {
  pequeno: { label: "Pequeno", descricao: "Cerca de 512 px, para telas menores", maxWidth: "32rem" },
  medio: { label: "Médio", descricao: "Cerca de 768 px, o padrão", maxWidth: "48rem" },
  grande: { label: "Grande", descricao: "Cerca de 65% da largura da tela", maxWidth: "max(48rem, 65vw)" },
};

function readSaved(userId?: number | null): DialogSize {
  try {
    const saved = localStorage.getItem(storageKey(userId));
    return saved === "pequeno" || saved === "grande" || saved === "medio" ? saved : "medio";
  } catch {
    return "medio";
  }
}

const DisplayPreferencesContext = createContext<DisplayPreferencesState | null>(null);

export function DisplayPreferencesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useLocalAuth();
  const userId = user?.id ?? null;
  const [dialogSize, setDialogSizeState] = useState<DialogSize>(() => readSaved(userId));

  // Ao entrar ou trocar de usuário, carrega a preferência dele.
  useEffect(() => {
    setDialogSizeState(readSaved(userId));
  }, [userId]);

  useEffect(() => {
    document.documentElement.style.setProperty("--dialog-max-w", DIALOG_SIZES[dialogSize].maxWidth);
  }, [dialogSize]);

  const setDialogSize = (size: DialogSize) => {
    setDialogSizeState(size);
    try {
      localStorage.setItem(storageKey(userId), size);
    } catch {
      /* preferência só vale nesta sessão */
    }
  };

  return (
    <DisplayPreferencesContext.Provider value={{ dialogSize, setDialogSize }}>
      {children}
    </DisplayPreferencesContext.Provider>
  );
}

export function useDisplayPreferences() {
  const ctx = useContext(DisplayPreferencesContext);
  if (!ctx) throw new Error("useDisplayPreferences must be inside DisplayPreferencesProvider");
  return ctx;
}
