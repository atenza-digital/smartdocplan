import React, { createContext, useContext, useEffect, useState } from "react";

export type DialogSize = "pequeno" | "medio" | "grande";

type DisplayPreferencesState = {
  dialogSize: DialogSize;
  setDialogSize: (size: DialogSize) => void;
};

const STORAGE_KEY = "display-dialog-size";

// Largura máxima das janelas de diálogo (a altura é sempre limitada a 90% da tela).
export const DIALOG_SIZES: Record<DialogSize, { label: string; descricao: string; maxWidth: string }> = {
  pequeno: { label: "Pequeno", descricao: "Cerca de 512 px, para telas menores", maxWidth: "32rem" },
  medio: { label: "Médio", descricao: "Cerca de 768 px, o padrão", maxWidth: "48rem" },
  grande: { label: "Grande", descricao: "Cerca de 65% da largura da tela", maxWidth: "max(48rem, 65vw)" },
};

function readSaved(): DialogSize {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === "pequeno" || saved === "grande" || saved === "medio" ? saved : "medio";
  } catch {
    return "medio";
  }
}

const DisplayPreferencesContext = createContext<DisplayPreferencesState | null>(null);

export function DisplayPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [dialogSize, setDialogSize] = useState<DialogSize>(readSaved);

  useEffect(() => {
    document.documentElement.style.setProperty("--dialog-max-w", DIALOG_SIZES[dialogSize].maxWidth);
    try {
      localStorage.setItem(STORAGE_KEY, dialogSize);
    } catch {
      /* preferência só vale nesta sessão */
    }
  }, [dialogSize]);

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
