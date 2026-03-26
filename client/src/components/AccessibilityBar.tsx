import { useAccessibility } from "@/contexts/AccessibilityContext";
import { Contrast, ALargeSmall, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

export function AccessibilityBar() {
  const { highContrast, fontSize, toggleHighContrast, increaseFontSize, decreaseFontSize, resetFontSize } = useAccessibility();

  return (
    <div
      role="toolbar"
      aria-label="Barra de acessibilidade"
      className="w-full bg-gray-900 text-white text-xs flex items-center justify-end gap-1 px-4 py-1 print:hidden"
      style={{ minHeight: 32 }}
    >
      <span className="text-gray-400 mr-2 hidden sm:inline">Acessibilidade:</span>

      {/* Alto Contraste */}
      <button
        onClick={toggleHighContrast}
        aria-pressed={highContrast}
        title={highContrast ? "Desativar alto contraste" : "Ativar alto contraste"}
        aria-label={highContrast ? "Desativar alto contraste" : "Ativar alto contraste"}
        className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-400 ${
          highContrast
            ? "bg-yellow-400 text-black font-semibold"
            : "hover:bg-gray-700 text-gray-200"
        }`}
      >
        <Contrast className="w-3.5 h-3.5" aria-hidden="true" />
        <span className="hidden sm:inline">Alto Contraste</span>
      </button>

      {/* Separador */}
      <span className="text-gray-600 mx-1" aria-hidden="true">|</span>

      {/* Diminuir fonte */}
      <button
        onClick={decreaseFontSize}
        disabled={fontSize === "normal"}
        title="Diminuir fonte"
        aria-label="Diminuir tamanho da fonte"
        className="flex items-center gap-1 px-2 py-0.5 rounded text-xs hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-colors"
      >
        <ZoomOut className="w-3.5 h-3.5" aria-hidden="true" />
        <span className="hidden sm:inline">A-</span>
      </button>

      {/* Tamanho normal */}
      <button
        onClick={resetFontSize}
        title="Tamanho normal da fonte"
        aria-label="Restaurar tamanho normal da fonte"
        className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-400 ${
          fontSize === "normal" ? "text-yellow-400 font-semibold" : "hover:bg-gray-700 text-gray-200"
        }`}
      >
        <ALargeSmall className="w-3.5 h-3.5" aria-hidden="true" />
        <span className="hidden sm:inline">A</span>
      </button>

      {/* Aumentar fonte */}
      <button
        onClick={increaseFontSize}
        disabled={fontSize === "xlarge"}
        title="Aumentar fonte"
        aria-label="Aumentar tamanho da fonte"
        className="flex items-center gap-1 px-2 py-0.5 rounded text-xs hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-colors"
      >
        <ZoomIn className="w-3.5 h-3.5" aria-hidden="true" />
        <span className="hidden sm:inline">A+</span>
      </button>

      {/* VLibras */}
      <span className="text-gray-600 mx-1" aria-hidden="true">|</span>
      <span className="text-gray-400 text-xs hidden sm:inline flex items-center gap-1">
        <span>🤟</span> VLibras ativo
      </span>
    </div>
  );
}
