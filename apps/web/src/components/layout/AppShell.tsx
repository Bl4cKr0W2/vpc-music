import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { ThemedLogo } from "@/components/ui/ThemedLogo";
import { LogOut, Sun, Moon } from "lucide-react";
import { toast } from "sonner";

export function AppShell() {
  const { resolvedTheme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    toast.success("Signed out");
    navigate("/");
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? "text-[hsl(var(--secondary))] font-medium"
      : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors";

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      <header className="border-b border-[hsl(var(--border))] bg-[hsl(var(--card))] px-6 py-3 flex items-center justify-between">
        <NavLink to="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <ThemedLogo className="h-8 w-8 rounded-md" alt="" />
          <span className="font-brand text-xl text-[hsl(var(--secondary))]">VPC Music</span>
        </NavLink>
        <nav className="flex items-center gap-6 text-sm">
          <NavLink to="/dashboard" className={navLinkClass}>
            Dashboard
          </NavLink>
          <NavLink to="/songs" className={navLinkClass}>
            Songs
          </NavLink>
          <NavLink to="/setlists" className={navLinkClass}>
            Setlists
          </NavLink>
          <NavLink to="/settings" className={navLinkClass}>
            Settings
          </NavLink>
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-md bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
            aria-label="Toggle theme"
          >
            {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          {user && (
            <div className="flex items-center gap-3 ml-2 pl-4 border-l border-[hsl(var(--border))]">
              <span className="text-xs text-[hsl(var(--muted-foreground))]">
                {user.displayName || user.email}
              </span>
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-md text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] transition-colors"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </nav>
      </header>
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  );
}
