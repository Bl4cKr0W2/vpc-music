import { useTheme } from "@/contexts/ThemeContext";

interface ThemedLogoProps {
  className?: string;
  alt?: string;
}

/**
 * Renders the brand tile logo that switches between the navy tile
 * (dark theme) and gold tile (light theme).
 *
 * Both tiles have rounded corners baked in by the icon pipeline.
 */
export function ThemedLogo({ className = "h-8 w-8", alt = "VPC Music" }: ThemedLogoProps) {
  const { resolvedTheme } = useTheme();
  const src =
    resolvedTheme === "dark"
      ? "/icons/icon-512-tile-navy.png"
      : "/icons/icon-512-tile-gold.png";

  return <img src={src} alt={alt} className={className} />;
}
