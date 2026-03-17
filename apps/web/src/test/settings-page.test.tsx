import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { SettingsPage } from "@/pages/settings/SettingsPage";

// ---------- Mocks ----------
const mockRefreshUser = vi.fn();
let mockAuthValue: any = {
  user: { id: "u1", displayName: "John", email: "john@test.com", role: "member", organizations: [{ id: "org1", name: "Test Church", role: "admin" }] },
  activeOrg: { id: "org1", name: "Test Church", role: "admin" },
  refreshUser: mockRefreshUser,
};
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockAuthValue,
}));

const mockSetTheme = vi.fn();
const mockSetContrastMode = vi.fn();
const mockSetEditorMode = vi.fn();
const mockSetThemePreset = vi.fn();
const mockSetChordColor = vi.fn();
const mockSetSecondaryChordColor = vi.fn();
const mockSetPageBackground = vi.fn();
const mockSetSongFontFamily = vi.fn();
vi.mock("@/contexts/ThemeContext", () => ({
  useTheme: () => ({
    theme: "dark",
    setTheme: mockSetTheme,
    contrastMode: "normal",
    setContrastMode: mockSetContrastMode,
    editorMode: "advanced",
    setEditorMode: mockSetEditorMode,
    themePreset: "custom",
    setThemePreset: mockSetThemePreset,
    chordColor: "#ca9762",
    setChordColor: mockSetChordColor,
    secondaryChordColor: "#8b5cf6",
    setSecondaryChordColor: mockSetSecondaryChordColor,
    pageBackground: "#f8f9fa",
    setPageBackground: mockSetPageBackground,
    songFontFamily: "mono",
    setSongFontFamily: mockSetSongFontFamily,
  }),
  EDITOR_MODE_OPTIONS: [
    { value: "beginner", label: "Beginner", description: "Beginner description" },
    { value: "advanced", label: "Advanced", description: "Advanced description" },
  ],
  SONG_FONT_OPTIONS: [
    { value: "mono", label: "Monospace", description: "Mono description" },
  ],
  THEME_PRESETS: {
    "stage-dark": {
      theme: "dark",
      contrastMode: "normal",
      chordColor: "#7dd3fc",
      secondaryChordColor: "#c084fc",
      pageBackground: "#000435",
      songFontFamily: "mono",
    },
    "print-light": {
      theme: "light",
      contrastMode: "normal",
      chordColor: "#b91c1c",
      secondaryChordColor: "#7c3aed",
      pageBackground: "#ffffff",
      songFontFamily: "mono",
    },
    classic: {
      theme: "light",
      contrastMode: "normal",
      chordColor: "#ca9762",
      secondaryChordColor: "#8b5cf6",
      pageBackground: "#f8f9fa",
      songFontFamily: "mono",
    },
  },
  THEME_PRESET_OPTIONS: [
    { value: "custom", label: "Custom", description: "Custom description" },
    { value: "stage-dark", label: "Stage Dark", description: "Stage dark description" },
    { value: "print-light", label: "Print Light", description: "Print light description" },
    { value: "classic", label: "Classic", description: "Classic description" },
  ],
}));

const mockGetSettings = vi.fn();
const mockUpdateSettings = vi.fn();
const mockUpdateProfile = vi.fn();
const mockChangePassword = vi.fn();
const mockListUsers = vi.fn();
const mockUpdateOrg = vi.fn();
const mockRemoveOrg = vi.fn();

vi.mock("@/lib/api-client", () => ({
  adminApi: {
    listUsers: (...args: any[]) => mockListUsers(...args),
  },
  orgsApi: {
    update: (...args: any[]) => mockUpdateOrg(...args),
    remove: (...args: any[]) => mockRemoveOrg(...args),
  },
  platformApi: {
    getSettings: (...args: any[]) => mockGetSettings(...args),
    updateSettings: (...args: any[]) => mockUpdateSettings(...args),
    updateProfile: (...args: any[]) => mockUpdateProfile(...args),
    changePassword: (...args: any[]) => mockChangePassword(...args),
  },
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <SettingsPage />
    </MemoryRouter>,
  );
}

describe("SettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthValue = {
      user: { id: "u1", displayName: "John", email: "john@test.com", role: "member", organizations: [{ id: "org1", name: "Test Church", role: "admin" }] },
      activeOrg: { id: "org1", name: "Test Church", role: "admin" },
      refreshUser: mockRefreshUser,
    };
    mockGetSettings.mockResolvedValue({ settings: {} });
    mockUpdateSettings.mockResolvedValue({ settings: {} });
    mockListUsers.mockResolvedValue({ users: [{ id: "u1" }, { id: "u2" }, { id: "u3" }] });
    mockUpdateOrg.mockResolvedValue({ organization: { id: "org1", name: "Renamed Church" } });
    mockRemoveOrg.mockResolvedValue({ message: "deleted" });
  });

  // ===================== POSITIVE =====================

  describe("positive", () => {
    it("renders settings heading", () => {
      renderPage();
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    it("renders Appearance section with theme buttons", () => {
      renderPage();
      expect(screen.getByText("Appearance")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Light" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Dark" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "System" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /normal contrast mode/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /high contrast mode/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /beginner editor mode/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /stage dark theme preset/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/primary chord color/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/secondary chord color/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/page background color/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /monospace display font/i })).toBeInTheDocument();
    });

    it("renders Profile section with email and display name", () => {
      renderPage();
      expect(screen.getByText("Profile")).toBeInTheDocument();
      expect(screen.getByDisplayValue("john@test.com")).toBeInTheDocument();
      expect(screen.getByDisplayValue("John")).toBeInTheDocument();
    });

    it("renders Change Password section", () => {
      renderPage();
      expect(screen.getByRole("heading", { name: /Change Password/ })).toBeInTheDocument();
    });

    it("shows organization info and user ID", () => {
      renderPage();
      expect(screen.getByText(/Organization: Test Church/)).toBeInTheDocument();
      expect(screen.getAllByText(/Worship Leader/).length).toBeGreaterThan(0);
      expect(screen.getByText(/User ID: u1/)).toBeInTheDocument();
    });

    it("renders organization management fields for org admins", async () => {
      renderPage();

      expect(screen.getByRole("heading", { name: /organization/i })).toBeInTheDocument();
      expect(screen.getByDisplayValue("Test Church")).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText("3")).toBeInTheDocument();
      });
    });

    it("saves organization name on submit", async () => {
      renderPage();
      const user = userEvent.setup();

      const orgInput = screen.getByLabelText(/organization name/i);
      await user.clear(orgInput);
      await user.type(orgInput, "Renamed Church");
      await user.click(screen.getByRole("button", { name: /save organization/i }));

      await waitFor(() => {
        expect(mockUpdateOrg).toHaveBeenCalledWith("org1", "Renamed Church");
        expect(mockRefreshUser).toHaveBeenCalled();
      });
    });

    it("shows delete organization for owners", () => {
      mockAuthValue = {
        user: { id: "u1", displayName: "John", email: "john@test.com", role: "owner", organizations: [{ id: "org1", name: "Test Church", role: "admin" }] },
        activeOrg: { id: "org1", name: "Test Church", role: "admin" },
        refreshUser: mockRefreshUser,
      };

      renderPage();
      expect(screen.getByRole("button", { name: /delete organization/i })).toBeInTheDocument();
    });

    it("deletes the organization for owners after confirmation", async () => {
      mockAuthValue = {
        user: { id: "u1", displayName: "John", email: "john@test.com", role: "owner", organizations: [{ id: "org1", name: "Test Church", role: "admin" }] },
        activeOrg: { id: "org1", name: "Test Church", role: "admin" },
        refreshUser: mockRefreshUser,
      };

      renderPage();
      const user = userEvent.setup();
      await user.click(screen.getByRole("button", { name: /delete organization/i }));
      await user.click(screen.getAllByRole("button", { name: /^delete organization$/i })[1]);

      await waitFor(() => {
        expect(mockRemoveOrg).toHaveBeenCalledWith("org1");
        expect(mockRefreshUser).toHaveBeenCalled();
      });
    });

    it("calls setTheme when theme button clicked", async () => {
      renderPage();
      const user = userEvent.setup();
      await user.click(screen.getByRole("button", { name: "Light" }));
      expect(mockSetTheme).toHaveBeenCalledWith("light");
    });

    it("calls setContrastMode when high contrast button clicked", async () => {
      renderPage();
      const user = userEvent.setup();
      await user.click(screen.getByRole("button", { name: /high contrast mode/i }));
      expect(mockSetContrastMode).toHaveBeenCalledWith("high");
    });

    it("calls setEditorMode when beginner mode is selected", async () => {
      renderPage();
      const user = userEvent.setup();
      await user.click(screen.getByRole("button", { name: /beginner editor mode/i }));
      expect(mockSetEditorMode).toHaveBeenCalledWith("beginner");
      expect(mockUpdateSettings).toHaveBeenCalledWith(expect.objectContaining({ editorMode: "beginner" }));
    });

    it("applies a theme preset and persists its values", async () => {
      renderPage();
      const user = userEvent.setup();
      await user.click(screen.getByRole("button", { name: /stage dark theme preset/i }));
      expect(mockSetThemePreset).toHaveBeenCalledWith("stage-dark");
      expect(mockUpdateSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          themePreset: "stage-dark",
          chordColor: "#7dd3fc",
          secondaryChordColor: "#c084fc",
          pageBackground: "#000435",
          songFontFamily: "mono",
        }),
      );
    });

    it("updates custom appearance colors and font", async () => {
      renderPage();
      const user = userEvent.setup();
      fireEvent.change(screen.getByLabelText(/primary chord color/i), { target: { value: "#123456" } });
      fireEvent.change(screen.getByLabelText(/secondary chord color/i), { target: { value: "#654321" } });
      fireEvent.change(screen.getByLabelText(/page background color/i), { target: { value: "#abcdef" } });
      await user.click(screen.getByRole("button", { name: /monospace display font/i }));

      expect(mockSetChordColor).toHaveBeenCalledWith("#123456");
      expect(mockSetSecondaryChordColor).toHaveBeenCalledWith("#654321");
      expect(mockSetPageBackground).toHaveBeenCalledWith("#abcdef");
      expect(mockSetSongFontFamily).toHaveBeenCalledWith("mono");
    });

    it("saves profile on submit", async () => {
      mockUpdateProfile.mockResolvedValue({ user: {} });
      mockRefreshUser.mockResolvedValue(undefined);
      renderPage();
      const user = userEvent.setup();
      const nameInput = screen.getByDisplayValue("John");
      await user.clear(nameInput);
      await user.type(nameInput, "Jane");
      await user.click(screen.getByRole("button", { name: /save profile/i }));

      await waitFor(() => {
        expect(mockUpdateProfile).toHaveBeenCalledWith({ displayName: "Jane" });
      });
    });

    it("changes password on submit", async () => {
      mockChangePassword.mockResolvedValue({ message: "ok" });
      renderPage();
      const user = userEvent.setup();
      const passwordFields = screen.getAllByDisplayValue("");
      // Current Password, New Password, Confirm New Password are the password-type empty inputs
      const currentPw = screen.getByLabelText("Current Password");
      const newPw = screen.getByLabelText("New Password");
      const confirmPw = screen.getByLabelText("Confirm New Password");

      await user.type(currentPw, "oldpass123");
      await user.type(newPw, "newpass1234");
      await user.type(confirmPw, "newpass1234");
      await user.click(screen.getByRole("button", { name: /change password/i }));

      await waitFor(() => {
        expect(mockChangePassword).toHaveBeenCalledWith({
          currentPassword: "oldpass123",
          newPassword: "newpass1234",
        });
      });
    });
  });

  // ===================== NEGATIVE =====================

  describe("negative", () => {
    it("disables email field", () => {
      renderPage();
      expect(screen.getByDisplayValue("john@test.com")).toBeDisabled();
    });

    it("shows error when display name is empty", async () => {
      const { toast } = await import("sonner");
      renderPage();
      const user = userEvent.setup();
      const nameInput = screen.getByDisplayValue("John");
      await user.clear(nameInput);
      await user.click(screen.getByRole("button", { name: /save profile/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Display name is required");
      });
      expect(mockUpdateProfile).not.toHaveBeenCalled();
    });

    it("shows error when new password is too short", async () => {
      const { toast } = await import("sonner");
      renderPage();
      const user = userEvent.setup();
      await user.type(screen.getByLabelText("Current Password"), "current1");
      await user.type(screen.getByLabelText("New Password"), "short");
      await user.type(screen.getByLabelText("Confirm New Password"), "short");
      await user.click(screen.getByRole("button", { name: /change password/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Password must be at least 8 characters");
      });
      expect(mockChangePassword).not.toHaveBeenCalled();
    });

    it("shows error when passwords don't match", async () => {
      const { toast } = await import("sonner");
      renderPage();
      const user = userEvent.setup();
      await user.type(screen.getByLabelText("Current Password"), "current1");
      await user.type(screen.getByLabelText("New Password"), "password123");
      await user.type(screen.getByLabelText("Confirm New Password"), "different123");
      await user.click(screen.getByRole("button", { name: /change password/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Passwords don't match");
      });
      expect(mockChangePassword).not.toHaveBeenCalled();
    });

    it("shows error on profile update failure", async () => {
      const { toast } = await import("sonner");
      mockUpdateProfile.mockRejectedValue(new Error("Server error"));
      renderPage();
      const user = userEvent.setup();
      await user.click(screen.getByRole("button", { name: /save profile/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Server error");
      });
    });

    it("shows error on password change failure", async () => {
      const { toast } = await import("sonner");
      mockChangePassword.mockRejectedValue(new Error("Wrong current password"));
      renderPage();
      const user = userEvent.setup();
      await user.type(screen.getByLabelText("Current Password"), "wrongpass");
      await user.type(screen.getByLabelText("New Password"), "newpass1234");
      await user.type(screen.getByLabelText("Confirm New Password"), "newpass1234");
      await user.click(screen.getByRole("button", { name: /change password/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Wrong current password");
      });
    });

    it("shows error when organization name is empty", async () => {
      const { toast } = await import("sonner");
      renderPage();
      const user = userEvent.setup();

      const orgInput = screen.getByLabelText(/organization name/i);
      await user.clear(orgInput);
      await user.click(screen.getByRole("button", { name: /save organization/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Organization name is required");
      });
      expect(mockUpdateOrg).not.toHaveBeenCalled();
    });
  });
});
