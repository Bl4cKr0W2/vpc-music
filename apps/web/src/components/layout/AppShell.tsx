import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { ThemedLogo } from "@/components/ui/ThemedLogo";
import { LogOut, Sun, Moon, Shield, Building2, ChevronDown, Plus, Eye, Music, Menu, X } from "lucide-react";
import { toast } from "sonner";
import { orgsApi } from "@/lib/api-client";
import { roleLabel } from "@vpc-music/shared";
import { useState, useRef, useEffect } from "react";

function CreateOrgDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (organization: { id: string; name: string; role?: "admin" | "musician" | "observer" }) => Promise<void> | void;
}) {
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!open) {
      setName("");
      setCreating(false);
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !creating) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [creating, onClose, open]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Organization name is required");
      return;
    }

    setCreating(true);
    try {
      const { organization } = await orgsApi.create(name.trim());
      await onCreated(organization);
      toast.success("Organization created");
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to create organization");
    } finally {
      setCreating(false);
    }
  };

  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="create-organization-title">
      <div className="modal-content max-w-md space-y-4">
        <div className="space-y-1">
          <h2 id="create-organization-title" className="text-lg font-semibold text-[hsl(var(--foreground))]">
            Create organization
          </h2>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Create a new organization and switch into it right away.
          </p>
        </div>

        <form onSubmit={handleCreate} className="space-y-4">
          <label className="space-y-2 block">
            <span className="text-sm font-medium text-[hsl(var(--foreground))]">Organization name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Organization name"
              className="input w-full"
              disabled={creating}
              autoFocus
            />
          </label>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={creating}
              className="btn-outline btn-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating || !name.trim()}
              className="btn-primary btn-sm"
            >
              {creating ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function OrgSwitcher({ onRequestCreate }: { onRequestCreate: () => void }) {
  const { user, activeOrg, switchOrg } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const orgs = user?.organizations ?? [];
  const canCreate = user?.role === "owner" || activeOrg?.role === "admin";

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (orgs.length <= 1 && !canCreate) {
    // Single org, can't create — show name only
    return activeOrg ? (
      <span className="text-xs text-[hsl(var(--muted-foreground))] flex items-center gap-1">
        <Building2 className="h-3.5 w-3.5" />
        {activeOrg.name}
      </span>
    ) : null;
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors rounded-md px-2 py-1 bg-[hsl(var(--muted))]"
      >
        <Building2 className="h-3.5 w-3.5" />
        {activeOrg?.name ?? "Select org"}
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 min-w-[220px] rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-lg py-1">
          {orgs.map((org) => (
            <button
              key={org.id}
              onClick={() => { switchOrg(org.id); setOpen(false); }}
              className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-[hsl(var(--muted))] transition-colors ${
                org.id === activeOrg?.id
                  ? "text-[hsl(var(--secondary))] font-medium"
                  : "text-[hsl(var(--foreground))]"
              }`}
            >
              {org.name}
            </button>
          ))}
          {canCreate && (
            <>
              <div className="my-1 border-t border-[hsl(var(--border))]" />
              <button
                onClick={() => {
                  setOpen(false);
                  onRequestCreate();
                }}
                className="w-full text-left px-3 py-1.5 text-xs text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] transition-colors flex items-center gap-1"
              >
                <Plus className="h-3 w-3" /> New organization
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function AppShell() {
  const { resolvedTheme, toggleTheme } = useTheme();
  const { user, logout, activeOrg, refreshUser, switchOrg } = useAuth();
  const isAdmin = activeOrg?.role === "admin" || user?.role === "owner";
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showCreateOrgDialog, setShowCreateOrgDialog] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [navigate]);

  const handleLogout = async () => {
    await logout();
    toast.success("Signed out");
    navigate("/");
  };

  // User initials for avatar
  const initials = user
    ? (user.displayName || user.email || "")
        .split(/[\s@]+/)
        .slice(0, 2)
        .map((s) => s[0]?.toUpperCase() || "")
        .join("")
    : "";

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `relative py-1 transition-colors ${
      isActive
        ? "text-[hsl(var(--secondary))] font-medium after:absolute after:bottom-[-13px] after:left-0 after:right-0 after:h-[2px] after:bg-[hsl(var(--secondary))] after:rounded-full"
        : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
    }`;

  const mobileNavLinkClass = ({ isActive }: { isActive: boolean }) =>
    `block px-3 py-2 rounded-md text-sm transition-colors ${
      isActive
        ? "text-[hsl(var(--secondary))] font-medium bg-[hsl(var(--secondary))]/10"
        : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]"
    }`;

  const handleOrganizationCreated = async (organization: { id: string }) => {
    switchOrg(organization.id);
    await refreshUser();
  };

  const roleBadge = activeOrg?.role ? (
    <span
      data-testid="role-badge"
      className={`badge text-[10px] ${
        user?.role === "owner"
          ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
          : activeOrg.role === "admin"
            ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
            : activeOrg.role === "musician"
              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
              : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
      }`}
    >
      {user?.role === "owner" ? (
        <Shield className="h-2.5 w-2.5" />
      ) : activeOrg.role === "admin" ? (
        <Shield className="h-2.5 w-2.5" />
      ) : activeOrg.role === "musician" ? (
        <Music className="h-2.5 w-2.5" />
      ) : (
        <Eye className="h-2.5 w-2.5" />
      )}
      {user?.role === "owner" ? "Owner" : roleLabel(activeOrg.role)}
    </span>
  ) : null;

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      <header className="sticky top-0 z-40 border-b border-[hsl(var(--border))] glass px-6 py-3 flex items-center justify-between">
        {/* Logo */}
        <NavLink to="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity shrink-0">
          <ThemedLogo className="h-8 w-8 rounded-md" alt="" />
          <span className="font-brand text-xl text-[hsl(var(--secondary))] hidden sm:inline">VPC Music</span>
        </NavLink>

        {/* Org switcher */}
        <div className="ml-3 hidden sm:block">
          <OrgSwitcher onRequestCreate={() => setShowCreateOrgDialog(true)} />
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm">
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
          {isAdmin && (
            <NavLink to="/admin" className={navLinkClass}>
              <span className="inline-flex items-center gap-1"><Shield className="h-3.5 w-3.5" />Admin</span>
            </NavLink>
          )}
        </nav>

        {/* Right side controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="btn-icon rounded-md bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
            aria-label="Toggle theme"
          >
            {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {user && (
            <div className="hidden md:flex items-center gap-2 ml-1 pl-3 border-l border-[hsl(var(--border))]">
              {/* User avatar */}
              <div
                className="flex items-center justify-center h-7 w-7 rounded-full bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] text-[10px] font-bold shrink-0"
                title={user.displayName || user.email}
              >
                {initials}
              </div>
              <div className="flex flex-col items-start">
                <span className="text-xs text-[hsl(var(--foreground))] font-medium leading-tight truncate max-w-[120px]">
                  {user.displayName || user.email}
                </span>
                {roleBadge}
              </div>
              <button
                onClick={handleLogout}
                className="btn-icon rounded-md text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] transition-colors"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="btn-icon rounded-md md:hidden text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* Mobile menu drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 space-y-1">
          <div className="mb-3 sm:hidden">
            <OrgSwitcher onRequestCreate={() => setShowCreateOrgDialog(true)} />
          </div>
          <NavLink to="/dashboard" className={mobileNavLinkClass} onClick={() => setMobileMenuOpen(false)}>
            Dashboard
          </NavLink>
          <NavLink to="/songs" className={mobileNavLinkClass} onClick={() => setMobileMenuOpen(false)}>
            Songs
          </NavLink>
          <NavLink to="/setlists" className={mobileNavLinkClass} onClick={() => setMobileMenuOpen(false)}>
            Setlists
          </NavLink>
          <NavLink to="/settings" className={mobileNavLinkClass} onClick={() => setMobileMenuOpen(false)}>
            Settings
          </NavLink>
          {isAdmin && (
            <NavLink to="/admin" className={mobileNavLinkClass} onClick={() => setMobileMenuOpen(false)}>
              <span className="inline-flex items-center gap-1"><Shield className="h-3.5 w-3.5" />Admin</span>
            </NavLink>
          )}
          {user && (
            <div className="pt-3 mt-2 border-t border-[hsl(var(--border))] flex items-center gap-3">
              <div className="flex items-center justify-center h-7 w-7 rounded-full bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] text-[10px] font-bold shrink-0">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium text-[hsl(var(--foreground))] truncate block">
                  {user.displayName || user.email}
                </span>
                {roleBadge}
              </div>
              <button
                onClick={handleLogout}
                className="btn-icon rounded-md text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] transition-colors"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}

      <main className="p-4 sm:p-6">
        {user && (!user.organizations || user.organizations.length === 0) && (
          <div className="mb-6 card-empty bg-[hsl(var(--muted))]">
            <Building2 className="mx-auto h-10 w-10 text-[hsl(var(--muted-foreground))]" />
            <h2 className="mt-3 text-lg font-medium">No organization yet</h2>
            <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
              You&apos;re not a member of any organization. Ask your worship team leader for an invite, or create a new organization.
            </p>
            <button
              type="button"
              onClick={() => setShowCreateOrgDialog(true)}
              className="btn-primary mt-4"
            >
              Create organization
            </button>
          </div>
        )}
        <Outlet />
      </main>

      <CreateOrgDialog
        open={showCreateOrgDialog}
        onClose={() => setShowCreateOrgDialog(false)}
        onCreated={handleOrganizationCreated}
      />
    </div>
  );
}
