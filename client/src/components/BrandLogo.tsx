import { cn } from "@/lib/utils";
import logoCompleta from "@/logos/logo_smartdocplan_completa.png";
import logoTexto from "@/logos/logo_smartdocplan_text.png";
import iconLogo from "@/logos/icon_smartdocplan.png";

type BrandLogoProps = {
  variant?: "complete" | "text" | "icon";
  className?: string;
  imageClassName?: string;
  alt?: string;
};

const sources = {
  complete: logoCompleta,
  text: logoTexto,
  icon: iconLogo,
} as const;

const defaults = {
  complete: "h-10 w-auto",
  text: "h-6 w-auto",
  icon: "h-9 w-9",
} as const;

export default function BrandLogo({
  variant = "complete",
  className,
  imageClassName,
  alt = "SmartDocPlan",
}: BrandLogoProps) {
  return (
    <div className={cn("flex items-center", className)}>
      <img
        src={sources[variant]}
        alt={alt}
        className={cn("object-contain", defaults[variant], imageClassName)}
      />
    </div>
  );
}
