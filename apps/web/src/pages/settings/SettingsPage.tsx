import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import {
  useTheme,
  EDITOR_MODE_OPTIONS,
  SONG_FONT_OPTIONS,
  THEME_PRESETS,
  THEME_PRESET_OPTIONS,
  type EditorMode,
  type SongFontFamily,
  type ThemePreset,
} from "@/contexts/ThemeContext";
import { adminApi, orgsApi, platformApi } from "@/lib/api-client";
import { toast } from "sonner";
import { roleLabel } from "@vpc-music/shared";
import { User, Palette, Lock, Building2, Trash2 } from "lucide-react";

type ThemeSetting = "dark" | "light" | "system";
type ContrastSetting = "normal" | "high";

function getPreviewTextColor(background: string) {
  const hex = background.replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(hex)) return "#0f172a";
  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
  return luminance > 0.6 ? "#0f172a" : "#ffffff";
}

export function SettingsPage() {
  const { user, activeOrg, refreshUser } = useAuth();
  const {
    theme,
    setTheme,
    contrastMode,
    setContrastMode,
    editorMode,
    setEditorMode,
    themePreset,
    setThemePreset,
    chordColor,
    setChordColor,
    secondaryChordColor,
    setSecondaryChordColor,
    pageBackground,
    setPageBackground,
    songFontFamily,
    setSongFontFamily,
  } = useTheme();
  const canManageOrg = user?.role === "owner" || activeOrg?.role === "admin";
  const canDeleteOrg = user?.role === "owner";

  // Profile
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [savingProfile, setSavingProfile] = useState(false);

  // Organization
  const [orgName, setOrgName] = useState(activeOrg?.name || "");
  const [savingOrg, setSavingOrg] = useState(false);
  const [deletingOrg, setDeletingOrg] = useState(false);
  const [showDeleteOrgConfirm, setShowDeleteOrgConfirm] = useState(false);
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [loadingMemberCount, setLoadingMemberCount] = useState(false);

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
      .then((res) => {
        const settings = res.settings ?? {};
        setPrefs(settings);

        if (settings.theme === "light" || settings.theme === "dark" || settings.theme === "system") {
          setTheme(settings.theme);
        }
        if (settings.contrastMode === "normal" || settings.contrastMode === "high") {
          setContrastMode(settings.contrastMode);
        }
        if (settings.editorMode === "beginner" || settings.editorMode === "advanced") {
          setEditorMode(settings.editorMode);
        }
        if (
          settings.themePreset === "custom" ||
          settings.themePreset === "stage-dark" ||
          settings.themePreset === "print-light" ||
          settings.themePreset === "classic"
        ) {
          setThemePreset(settings.themePreset);
        }
        if (typeof settings.chordColor === "string") {
          setChordColor(settings.chordColor);
        }
        if (typeof settings.secondaryChordColor === "string") {
          setSecondaryChordColor(settings.secondaryChordColor);
        }
        if (typeof settings.pageBackground === "string") {
          setPageBackground(settings.pageBackground);
        }
        if (settings.songFontFamily === "mono") {
          setSongFontFamily(settings.songFontFamily);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingPrefs(false));
  }, [setChordColor, setContrastMode, setEditorMode, setPageBackground, setSecondaryChordColor, setSongFontFamily, setTheme, setThemePreset]);

  useEffect(() => {
    setOrgName(activeOrg?.name || "");
  }, [activeOrg?.id, activeOrg?.name]);

  useEffect(() => {
    if (!activeOrg || !canManageOrg) {
      setMemberCount(null);
      setLoadingMemberCount(false);
      return;
    }

    setLoadingMemberCount(true);
    adminApi
      .listUsers()
      .then((res) => setMemberCount(res.users.length))
      .catch(() => setMemberCount(null))
      .finally(() => setLoadingMemberCount(false));
  }, [activeOrg?.id, canManageOrg]);

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
    const nextPrefs = { ...prefs, theme: t };
    setPrefs(nextPrefs);
    platformApi.updateSettings(nextPrefs).catch(() => {});
  };

  const handleContrastChange = (mode: ContrastSetting) => {
    setContrastMode(mode);
    const nextPrefs = { ...prefs, contrastMode: mode };
    setPrefs(nextPrefs);
    platformApi.updateSettings(nextPrefs).catch(() => {});
  };

  const persistPreferencePatch = (patch: Record<string, any>) => {
    const nextPrefs = { ...prefs, ...patch };
    setPrefs(nextPrefs);
    platformApi.updateSettings(nextPrefs).catch(() => {});
  };

  const handleEditorModeChange = (mode: EditorMode) => {
    setEditorMode(mode);
    persistPreferencePatch({ editorMode: mode });
  };

  const handleThemePresetChange = (preset: ThemePreset) => {
    setThemePreset(preset);
    if (preset === "custom") {
      persistPreferencePatch({
        themePreset: preset,
        chordColor,
        secondaryChordColor,
        pageBackground,
        songFontFamily,
      });
      return;
    }

    const presetConfig = THEME_PRESETS[preset];
    persistPreferencePatch({
      themePreset: preset,
      theme: presetConfig.theme,
      contrastMode: presetConfig.contrastMode,
      chordColor: presetConfig.chordColor,
      secondaryChordColor: presetConfig.secondaryChordColor,
      pageBackground: presetConfig.pageBackground,
      songFontFamily: presetConfig.songFontFamily,
    });
  };

  const handleChordColorChange = (color: string) => {
    setChordColor(color);
    persistPreferencePatch({ themePreset: "custom", chordColor: color });
  };

  const handleSecondaryChordColorChange = (color: string) => {
    setSecondaryChordColor(color);
    persistPreferencePatch({ themePreset: "custom", secondaryChordColor: color });
  };

  const handlePageBackgroundChange = (color: string) => {
    setPageBackground(color);
    persistPreferencePatch({ themePreset: "custom", pageBackground: color });
  };

  const handleSongFontFamilyChange = (fontFamily: SongFontFamily) => {
    setSongFontFamily(fontFamily);
    persistPreferencePatch({ themePreset: "custom", songFontFamily: fontFamily });
  };

  const handleSaveOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrg) return;
    if (!orgName.trim()) {
      toast.error("Organization name is required");
      return;
    }

    setSavingOrg(true);
    try {
      await orgsApi.update(activeOrg.id, orgName.trim());
      await refreshUser();
      toast.success("Organization updated");
    } catch (err: any) {
      toast.error(err.message || "Failed to update organization");
    } finally {
      setSavingOrg(false);
    }
  };

  const handleDeleteOrganization = async () => {
    if (!activeOrg) return;

    setDeletingOrg(true);
    try {
      await orgsApi.remove(activeOrg.id);
      await refreshUser();
      toast.success("Organization deleted");
      setShowDeleteOrgConfirm(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete organization");
    } finally {
      setDeletingOrg(false);
    }
  };

  const inputClass =
    "w-full rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]";
  const appearanceButtonClass = (active: boolean) =>
    `rounded-md px-4 py-2 text-sm font-medium transition-colors ${
      active
        ? "bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))]"
        : "border border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]"
    }`;
  const previewTextColor = getPreviewTextColor(pageBackground);

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
              type="button"
              onClick={() => handleThemeChange(t)}
              className={appearanceButtonClass(theme === t)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium text-[hsl(var(--foreground))]">Contrast</p>
          <div className="flex gap-3">
            {(["normal", "high"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => handleContrastChange(mode)}
                className={appearanceButtonClass(contrastMode === mode)}
                aria-pressed={contrastMode === mode}
                aria-label={`${mode === "high" ? "High" : "Normal"} contrast mode`}
              >
                {mode === "high" ? "High Contrast" : "Normal Contrast"}
              </button>
            ))}
          </div>

          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            High contrast increases color separation, border strength, and focus visibility for low-vision use.
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-[hsl(var(--foreground))]">Editor mode</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {EDITOR_MODE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleEditorModeChange(option.value)}
                className={`rounded-lg border px-4 py-3 text-left transition-colors ${
                  editorMode === option.value
                    ? "border-[hsl(var(--secondary))] bg-[hsl(var(--secondary))]/10 text-[hsl(var(--foreground))]"
                    : "border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]"
                }`}
                aria-pressed={editorMode === option.value}
                aria-label={`${option.label} editor mode`}
              >
                <div className="text-sm font-semibold">{option.label}</div>
                <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{option.description}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-[hsl(var(--foreground))]">Theme preset</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {THEME_PRESET_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleThemePresetChange(option.value)}
                className={`rounded-lg border px-4 py-3 text-left transition-colors ${
                  themePreset === option.value
                    ? "border-[hsl(var(--secondary))] bg-[hsl(var(--secondary))]/10 text-[hsl(var(--foreground))]"
                    : "border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]"
                }`}
                aria-pressed={themePreset === option.value}
                aria-label={`${option.label} theme preset`}
              >
                <div className="text-sm font-semibold">{option.label}</div>
                <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{option.description}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-[hsl(var(--foreground))]">Song color customization</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="space-y-2 text-sm font-medium text-[hsl(var(--foreground))]">
              <span>Primary chord color</span>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={chordColor}
                  onChange={(e) => handleChordColorChange(e.target.value)}
                  className="h-11 w-16 rounded-md border border-[hsl(var(--border))] bg-transparent"
                  aria-label="Primary chord color"
                />
                <span className="text-xs uppercase tracking-wide text-[hsl(var(--muted-foreground))]">{chordColor}</span>
              </div>
            </label>
            <label className="space-y-2 text-sm font-medium text-[hsl(var(--foreground))]">
              <span>Secondary chord color</span>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={secondaryChordColor}
                  onChange={(e) => handleSecondaryChordColorChange(e.target.value)}
                  className="h-11 w-16 rounded-md border border-[hsl(var(--border))] bg-transparent"
                  aria-label="Secondary chord color"
                />
                <span className="text-xs uppercase tracking-wide text-[hsl(var(--muted-foreground))]">{secondaryChordColor}</span>
              </div>
            </label>
            <label className="space-y-2 text-sm font-medium text-[hsl(var(--foreground))]">
              <span>Page background</span>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={pageBackground}
                  onChange={(e) => handlePageBackgroundChange(e.target.value)}
                  className="h-11 w-16 rounded-md border border-[hsl(var(--border))] bg-transparent"
                  aria-label="Page background color"
                />
                <span className="text-xs uppercase tracking-wide text-[hsl(var(--muted-foreground))]">{pageBackground}</span>
              </div>
            </label>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-[hsl(var(--foreground))]">Rendered song font</p>
          <div className="flex flex-wrap gap-3">
            {SONG_FONT_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSongFontFamilyChange(option.value)}
                className={appearanceButtonClass(songFontFamily === option.value)}
                aria-pressed={songFontFamily === option.value}
                aria-label={`${option.label} display font`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            {SONG_FONT_OPTIONS[0]?.description}
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-[hsl(var(--foreground))]">Live song preview</p>
          <div
            className="song-display-font rounded-xl border border-[hsl(var(--border))] p-4 shadow-sm"
            style={{ backgroundColor: pageBackground, color: previewTextColor }}
            data-testid="theme-preview-card"
          >
            <div className="song-secondary-chord text-xs font-semibold uppercase tracking-[0.2em]">Verse 1</div>
            <div className="song-primary-chord mt-3 whitespace-pre font-mono text-sm font-bold">G        C        D</div>
            <div className="mt-1 whitespace-pre-wrap text-sm">Amazing grace, how sweet the sound</div>
          </div>
        </div>

        {loadingPrefs && (
          <p className="text-xs text-[hsl(var(--muted-foreground))]">Loading saved appearance preferences…</p>
        )}
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

      {/* Organization */}
      {activeOrg && (
        <section className="space-y-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
          <h3 className="flex items-center gap-2 text-lg font-brand text-[hsl(var(--foreground))]">
            <Building2 className="h-5 w-5 text-[hsl(var(--secondary))]" />
            Organization
          </h3>

          {canManageOrg ? (
            <form onSubmit={handleSaveOrganization} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="organizationName" className="text-sm font-medium text-[hsl(var(--foreground))]">
                  Organization Name
                </label>
                <input
                  id="organizationName"
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className={inputClass}
                  placeholder="Organization name"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-3 text-sm">
                  <div className="text-xs uppercase tracking-wide text-[hsl(var(--muted-foreground))]">Your role</div>
                  <div className="mt-1 font-medium text-[hsl(var(--foreground))]">{roleLabel(activeOrg.role)}</div>
                </div>
                <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-3 text-sm">
                  <div className="text-xs uppercase tracking-wide text-[hsl(var(--muted-foreground))]">Members</div>
                  <div className="mt-1 font-medium text-[hsl(var(--foreground))]">
                    {loadingMemberCount ? "Loading..." : memberCount ?? "—"}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={savingOrg}
                  className="rounded-md bg-[hsl(var(--secondary))] px-4 py-2 text-sm font-medium text-[hsl(var(--secondary-foreground))] hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {savingOrg ? "Saving..." : "Save Organization"}
                </button>

                {canDeleteOrg && (
                  <button
                    type="button"
                    onClick={handleDeleteOrganization}
                    disabled={deletingOrg}
                    className="inline-flex items-center gap-2 rounded-md border border-[hsl(var(--destructive))]/40 px-4 py-2 text-sm font-medium text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive))]/10 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    {deletingOrg ? "Deleting..." : "Delete Organization"}
                  </button>
                )}
              </div>
            </form>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-3 text-sm">
                <div className="text-xs uppercase tracking-wide text-[hsl(var(--muted-foreground))]">Organization</div>
                <div className="mt-1 font-medium text-[hsl(var(--foreground))]">{activeOrg.name}</div>
              </div>
              <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-3 text-sm">
                <div className="text-xs uppercase tracking-wide text-[hsl(var(--muted-foreground))]">Your role</div>
                <div className="mt-1 font-medium text-[hsl(var(--foreground))]">{roleLabel(activeOrg.role)}</div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Account info */}
      <section className="space-y-2 text-xs text-[hsl(var(--muted-foreground))]">
        {activeOrg && (
          <>
            <p>Organization: {activeOrg.name}</p>
            <p>
              Organization Role:{" "}
              {roleLabel(activeOrg.role)}
            </p>
          </>
        )}
        {user?.role === "owner" && <p>Global Role: Owner</p>}
        <p>User ID: {user?.id}</p>
      </section>

      <ConfirmDialog
        open={showDeleteOrgConfirm}
        title={activeOrg ? `Delete organization \"${activeOrg.name}\"?` : "Delete organization?"}
        description="This removes its songs, setlists, events, and memberships."
        confirmLabel="Delete organization"
        busy={deletingOrg}
        onClose={() => {
          if (!deletingOrg) {
            setShowDeleteOrgConfirm(false);
          }
        }}
        onConfirm={handleDeleteOrganization}
      />
    </div>
  );
}
