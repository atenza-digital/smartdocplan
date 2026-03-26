import React, { createContext, useContext, useEffect, useState } from "react";

type FontSize = "normal" | "large" | "xlarge";

type AccessibilityState = {
  highContrast: boolean;
  fontSize: FontSize;
  toggleHighContrast: () => void;
  increaseFontSize: () => void;
  decreaseFontSize: () => void;
  resetFontSize: () => void;
};

const AccessibilityContext = createContext<AccessibilityState | null>(null);

const FONT_SIZES: FontSize[] = ["normal", "large", "xlarge"];
const FONT_SCALE: Record<FontSize, string> = {
  normal: "100%",
  large: "112.5%",
  xlarge: "125%",
};

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [highContrast, setHighContrast] = useState(() => {
    return localStorage.getItem("a11y-contrast") === "true";
  });

  const [fontSize, setFontSize] = useState<FontSize>(() => {
    const saved = localStorage.getItem("a11y-fontsize");
    return (saved as FontSize) || "normal";
  });

  useEffect(() => {
    const html = document.documentElement;
    if (highContrast) {
      html.classList.add("high-contrast");
    } else {
      html.classList.remove("high-contrast");
    }
    localStorage.setItem("a11y-contrast", String(highContrast));
  }, [highContrast]);

  useEffect(() => {
    document.documentElement.style.fontSize = FONT_SCALE[fontSize];
    localStorage.setItem("a11y-fontsize", fontSize);
  }, [fontSize]);

  const toggleHighContrast = () => setHighContrast(v => !v);

  const increaseFontSize = () => {
    setFontSize(current => {
      const idx = FONT_SIZES.indexOf(current);
      return idx < FONT_SIZES.length - 1 ? FONT_SIZES[idx + 1] : current;
    });
  };

  const decreaseFontSize = () => {
    setFontSize(current => {
      const idx = FONT_SIZES.indexOf(current);
      return idx > 0 ? FONT_SIZES[idx - 1] : current;
    });
  };

  const resetFontSize = () => setFontSize("normal");

  return (
    <AccessibilityContext.Provider value={{
      highContrast,
      fontSize,
      toggleHighContrast,
      increaseFontSize,
      decreaseFontSize,
      resetFontSize,
    }}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) throw new Error("useAccessibility must be inside AccessibilityProvider");
  return ctx;
}
