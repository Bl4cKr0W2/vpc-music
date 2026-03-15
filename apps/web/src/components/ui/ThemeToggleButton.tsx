import { useTheme } from "@/contexts/ThemeContext";
import { Sun, Moon } from "lucide-react";

/**
 * Standalone theme toggle button — for use on pages outside the AppShell
 * (landing, login, forgot-password, reset-password, shared song, etc.).
 *
 * Renders as a fixed-position button in the top-right corner by default,
 * or inline when `position="inline"`.
 */
export function ThemeToggleButton({ position = "fixed" }: { position?: "fixed" | "inline" }) {
  const { resolvedTheme, toggleTheme } = useTheme();

  const baseClasses =
    "rounded-md bg-[hsl(var(--muted))] p-1.5 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors";

  if (position === "inline") {
    return (
      <button onClick={toggleTheme} className={baseClasses} aria-label="Toggle theme">
        {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className={`fixed top-4 right-4 z-50 ${baseClasses}`}
      aria-label="Toggle theme"
    >
      {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
