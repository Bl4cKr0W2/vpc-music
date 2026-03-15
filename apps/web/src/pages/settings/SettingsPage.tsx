import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { platformApi } from "@/lib/api-client";
import { toast } from "sonner";
import { User, Palette, Lock, Settings } from "lucide-react";

type ThemeSetting = "dark" | "light" | "system";

export function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const { theme, setTheme } = useTheme();

  // Profile
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [savingProfile, setSavingProfile] = useState(false);

  // Password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // Preferences
  const [prefs, setPrefs] = useState<Record<string, any>>({});
  const [loadingPrefs, setLoadingPrefs] = useState(true);

  useEffect(() => {
    platformApi
      .getSettings()
      .then((res) => setPrefs(res.settings))
      .catch(() => {})
      .finally(() => setLoadingPrefs(false));
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      toast.error("Display name is required");
      return;
    }
    setSavingProfile(true);
    try {
      await platformApi.updateProfile({ displayName: displayName.trim() });
      await refreshUser();
      toast.success("Profile updated");
    } catch (err: any) {
      toast.error(err.message || "Failed to update");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    setSavingPassword(true);
    try {
      await platformApi.changePassword({ currentPassword, newPassword });
      toast.success("Password changed");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.message || "Failed to change password");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleThemeChange = (t: ThemeSetting) => {
    setTheme(t);
    // Also persist to server settings
    platformApi.updateSettings({ ...prefs, theme: t }).catch(() => {});
  };

  const inputClass =
    "w-full rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]";

  return (
    <div className="space-y-8 max-w-2xl">
      <h2 className="text-2xl font-brand text-[hsl(var(--foreground))]">Settings</h2>

      {/* Theme */}
      <section className="space-y-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
        <h3 className="flex items-center gap-2 text-lg font-brand text-[hsl(var(--foreground))]">
          <Palette className="h-5 w-5 text-[hsl(var(--secondary))]" />
          Appearance
        </h3>
        <div className="flex gap-3">
          {(["light", "dark", "system"] as const).map((t) => (
            <button
              key={t}
              onClick={() => handleThemeChange(t)}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                theme === t
                  ? "bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))]"
                  : "border border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]"
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </section>

      {/* Profile */}
      <section className="space-y-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
        <h3 className="flex items-center gap-2 text-lg font-brand text-[hsl(var(--foreground))]">
          <User className="h-5 w-5 text-[hsl(var(--secondary))]" />
          Profile
        </h3>
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-[hsl(var(--foreground))]">Email</label>
            <input id="email" type="email" value={user?.email || ""} disabled className={`${inputClass} opacity-60`} />
          </div>
          <div className="space-y-2">
            <label htmlFor="displayName" className="text-sm font-medium text-[hsl(var(--foreground))]">
              Display Name
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className={inputClass}
              placeholder="Your name"
            />
          </div>
          <button
            type="submit"
            disabled={savingProfile}
            className="rounded-md bg-[hsl(var(--secondary))] px-4 py-2 text-sm font-medium text-[hsl(var(--secondary-foreground))] hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {savingProfile ? "Saving..." : "Save Profile"}
          </button>
        </form>
      </section>

      {/* Password */}
      <section className="space-y-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
        <h3 className="flex items-center gap-2 text-lg font-brand text-[hsl(var(--foreground))]">
          <Lock className="h-5 w-5 text-[hsl(var(--secondary))]" />
          Change Password
        </h3>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="currentPassword" className="text-sm font-medium text-[hsl(var(--foreground))]">
              Current Password
            </label>
            <input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className={inputClass}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="newPassword" className="text-sm font-medium text-[hsl(var(--foreground))]">
              New Password
            </label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              className={inputClass}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="confirmNewPassword" className="text-sm font-medium text-[hsl(var(--foreground))]">
              Confirm New Password
            </label>
            <input
              id="confirmNewPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              className={inputClass}
            />
          </div>
          <button
            type="submit"
            disabled={savingPassword}
            className="rounded-md bg-[hsl(var(--secondary))] px-4 py-2 text-sm font-medium text-[hsl(var(--secondary-foreground))] hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {savingPassword ? "Changing..." : "Change Password"}
          </button>
        </form>
      </section>

      {/* Account info */}
      <section className="space-y-2 text-xs text-[hsl(var(--muted-foreground))]">
        <p>Role: {user?.role}</p>
        <p>User ID: {user?.id}</p>
      </section>
    </div>
  );
}
