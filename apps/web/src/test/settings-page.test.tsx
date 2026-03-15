import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { SettingsPage } from "@/pages/settings/SettingsPage";

// ---------- Mocks ----------
const mockRefreshUser = vi.fn();
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "u1", displayName: "John", email: "john@test.com", role: "member", organizations: [{ id: "org1", name: "Test Church", role: "admin" }] },
    activeOrg: { id: "org1", name: "Test Church", role: "admin" },
    refreshUser: mockRefreshUser,
  }),
}));

const mockSetTheme = vi.fn();
vi.mock("@/contexts/ThemeContext", () => ({
  useTheme: () => ({
    theme: "dark",
    setTheme: mockSetTheme,
  }),
}));

const mockGetSettings = vi.fn();
const mockUpdateSettings = vi.fn();
const mockUpdateProfile = vi.fn();
const mockChangePassword = vi.fn();

vi.mock("@/lib/api-client", () => ({
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
    mockGetSettings.mockResolvedValue({ settings: {} });
    mockUpdateSettings.mockResolvedValue({ settings: {} });
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
      expect(screen.getByText(/Worship Leader/)).toBeInTheDocument();
      expect(screen.getByText(/User ID: u1/)).toBeInTheDocument();
    });

    it("calls setTheme when theme button clicked", async () => {
      renderPage();
      const user = userEvent.setup();
      await user.click(screen.getByRole("button", { name: "Light" }));
      expect(mockSetTheme).toHaveBeenCalledWith("light");
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
  });
});
