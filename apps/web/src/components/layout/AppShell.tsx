import { Outlet, NavLink } from "react-router-dom";
import { useTheme } from "@/contexts/ThemeContext";

export function AppShell() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      <header className="border-b border-[hsl(var(--border))] bg-[hsl(var(--card))] px-6 py-3 flex items-center justify-between">
        <NavLink to="/" className="font-brand text-xl text-[hsl(var(--secondary))] hover:text-[hsl(var(--accent))] transition-colors">
          VPC Music
        </NavLink>
        <nav className="flex items-center gap-6 text-sm">
          <NavLink
            to="/songs"
            className={({ isActive }) =>
              isActive
                ? "text-[hsl(var(--secondary))] font-medium"
                : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
            }
          >
            Songs
          </NavLink>
          <NavLink
            to="/setlists"
            className={({ isActive }) =>
              isActive
                ? "text-[hsl(var(--secondary))] font-medium"
                : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
            }
          >
            Setlists
          </NavLink>
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              isActive
                ? "text-[hsl(var(--secondary))] font-medium"
                : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
            }
          >
            Settings
          </NavLink>
          <button
            onClick={toggleTheme}
            className="ml-2 p-1.5 rounded-md bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
        </nav>
      </header>
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  );
}
