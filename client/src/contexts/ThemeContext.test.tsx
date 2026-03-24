import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import { ThemeProvider, useTheme } from "./ThemeContext";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(window, "localStorage", { value: localStorageMock });

// Componente auxiliar para testar o hook
function ThemeDisplay() {
  const { theme, toggleTheme, switchable } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="switchable">{String(switchable)}</span>
      {toggleTheme && (
        <button data-testid="toggle" onClick={toggleTheme}>
          Toggle
        </button>
      )}
    </div>
  );
}

describe("ThemeContext", () => {
  beforeEach(() => {
    cleanup();
    localStorageMock.clear();
    document.documentElement.classList.remove("dark");
  });

  afterEach(() => {
    cleanup();
    document.documentElement.classList.remove("dark");
  });

  it("deve renderizar com tema claro por padrão", () => {
    render(
      <ThemeProvider defaultTheme="light">
        <ThemeDisplay />
      </ThemeProvider>
    );
    expect(screen.getByTestId("theme").textContent).toBe("light");
  });

  it("deve renderizar com tema escuro quando especificado", () => {
    render(
      <ThemeProvider defaultTheme="dark">
        <ThemeDisplay />
      </ThemeProvider>
    );
    expect(screen.getByTestId("theme").textContent).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("deve adicionar classe 'dark' ao html quando tema escuro está ativo", () => {
    render(
      <ThemeProvider defaultTheme="dark">
        <ThemeDisplay />
      </ThemeProvider>
    );
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("deve remover classe 'dark' do html quando tema claro está ativo", () => {
    document.documentElement.classList.add("dark");
    render(
      <ThemeProvider defaultTheme="light">
        <ThemeDisplay />
      </ThemeProvider>
    );
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("deve alternar entre temas quando switchable=true", () => {
    render(
      <ThemeProvider defaultTheme="light" switchable>
        <ThemeDisplay />
      </ThemeProvider>
    );

    expect(screen.getByTestId("theme").textContent).toBe("light");
    expect(screen.getByTestId("switchable").textContent).toBe("true");

    act(() => {
      fireEvent.click(screen.getByTestId("toggle"));
    });

    expect(screen.getByTestId("theme").textContent).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    act(() => {
      fireEvent.click(screen.getByTestId("toggle"));
    });

    expect(screen.getByTestId("theme").textContent).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("deve persistir tema no localStorage quando switchable=true", () => {
    render(
      <ThemeProvider defaultTheme="light" switchable>
        <ThemeDisplay />
      </ThemeProvider>
    );

    act(() => {
      fireEvent.click(screen.getByTestId("toggle"));
    });

    expect(localStorageMock.getItem("theme")).toBe("dark");
  });

  it("não deve expor toggleTheme quando switchable=false", () => {
    render(
      <ThemeProvider defaultTheme="light">
        <ThemeDisplay />
      </ThemeProvider>
    );

    expect(screen.queryByTestId("toggle")).toBeNull();
    expect(screen.getByTestId("switchable").textContent).toBe("false");
  });

  it("deve restaurar tema do localStorage quando switchable=true", () => {
    localStorageMock.setItem("theme", "dark");

    render(
      <ThemeProvider defaultTheme="light" switchable>
        <ThemeDisplay />
      </ThemeProvider>
    );

    expect(screen.getByTestId("theme").textContent).toBe("dark");
  });

  it("deve lançar erro quando useTheme é usado fora do ThemeProvider", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<ThemeDisplay />)).toThrow(
      "useTheme must be used within ThemeProvider"
    );
    consoleSpy.mockRestore();
  });
});
