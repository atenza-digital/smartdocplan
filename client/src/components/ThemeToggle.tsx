import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ThemeToggleProps {
  /** Exibe apenas o ícone sem texto (padrão: true) */
  iconOnly?: boolean;
  /** Tamanho do botão */
  size?: "sm" | "default" | "lg" | "icon";
  /** Variante visual do botão */
  variant?: "ghost" | "outline" | "default";
}

export function ThemeToggle({
  iconOnly = true,
  size = "icon",
  variant = "ghost",
}: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={variant}
          size={size}
          onClick={toggleTheme}
          aria-label={isDark ? "Mudar para tema claro" : "Mudar para tema escuro"}
          className="relative overflow-hidden"
        >
          {/* Ícone Sol — visível no tema escuro */}
          <Sun
            className={`h-4 w-4 transition-all duration-300 ${
              isDark
                ? "rotate-0 scale-100 opacity-100"
                : "rotate-90 scale-0 opacity-0 absolute"
            }`}
          />
          {/* Ícone Lua — visível no tema claro */}
          <Moon
            className={`h-4 w-4 transition-all duration-300 ${
              isDark
                ? "-rotate-90 scale-0 opacity-0 absolute"
                : "rotate-0 scale-100 opacity-100"
            }`}
          />
          {!iconOnly && (
            <span className="ml-2">{isDark ? "Tema Claro" : "Tema Escuro"}</span>
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p>{isDark ? "Mudar para tema claro" : "Mudar para tema escuro"}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export default ThemeToggle;
