import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ResetPasswordPage } from "@/pages/auth/ResetPasswordPage";

// ---------- Mocks ----------
const mockResetPassword = vi.fn();
const mockNavigate = vi.fn();

vi.mock("@/lib/api-client", () => ({
  authApi: { resetPassword: (...args: any[]) => mockResetPassword(...args) },
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/contexts/ThemeContext", () => ({
  useTheme: () => ({ resolvedTheme: "dark", toggleTheme: vi.fn() }),
}));

function renderPage(token?: string) {
  const route = token ? `/reset-password?token=${token}` : "/reset-password";
  return render(
    <MemoryRouter initialEntries={[route]}>
      <ResetPasswordPage />
    </MemoryRouter>,
  );
}

describe("ResetPasswordPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===================== POSITIVE =====================

  describe("positive — valid token", () => {
    it("renders reset form when token is present", () => {
      renderPage("abc123");
      expect(screen.getByText("Reset Password")).toBeInTheDocument();
      expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm/i)).toBeInTheDocument();
    });

    it("renders submit button", () => {
      renderPage("abc123");
      expect(screen.getByRole("button", { name: /reset password/i })).toBeInTheDocument();
    });

    it("calls resetPassword and navigates on success", async () => {
      mockResetPassword.mockResolvedValue({ message: "ok" });
      renderPage("tok_valid");
      const user = userEvent.setup();
      await user.type(screen.getByLabelText(/new password/i), "newpass123");
      await user.type(screen.getByLabelText(/confirm/i), "newpass123");
      await user.click(screen.getByRole("button", { name: /reset password/i }));

      await waitFor(() => {
        expect(mockResetPassword).toHaveBeenCalledWith("tok_valid", "newpass123");
        expect(mockNavigate).toHaveBeenCalledWith("/login");
      });
    });
  });

  // ===================== NEGATIVE =====================

  describe("negative — no token", () => {
    it("shows invalid link message when no token", () => {
      renderPage();
      expect(screen.getByText("Invalid Link")).toBeInTheDocument();
      expect(screen.getByText(/invalid or has expired/i)).toBeInTheDocument();
    });

    it("has link to request new reset", () => {
      renderPage();
      expect(screen.getByText(/request a new reset link/i)).toHaveAttribute(
        "href",
        "/forgot-password",
      );
    });

    it("does not render password form when no token", () => {
      renderPage();
      expect(screen.queryByLabelText(/new password/i)).not.toBeInTheDocument();
    });
  });

  describe("negative — validation errors", () => {
    it("shows error when passwords do not match", async () => {
      const { toast } = await import("sonner");
      renderPage("tok1");
      const user = userEvent.setup();
      await user.type(screen.getByLabelText(/new password/i), "password1");
      await user.type(screen.getByLabelText(/confirm/i), "password2");
      await user.click(screen.getByRole("button", { name: /reset password/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Passwords do not match");
      });
      expect(mockResetPassword).not.toHaveBeenCalled();
    });

    it("shows error when password is too short", async () => {
      const { toast } = await import("sonner");
      renderPage("tok1");
      const user = userEvent.setup();
      await user.type(screen.getByLabelText(/new password/i), "short");
      await user.type(screen.getByLabelText(/confirm/i), "short");
      await user.click(screen.getByRole("button", { name: /reset password/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Password must be at least 8 characters");
      });
      expect(mockResetPassword).not.toHaveBeenCalled();
    });

    it("shows error toast on API failure", async () => {
      const { toast } = await import("sonner");
      mockResetPassword.mockRejectedValue(new Error("Token expired"));
      renderPage("tok_expired");
      const user = userEvent.setup();
      await user.type(screen.getByLabelText(/new password/i), "newpass1234");
      await user.type(screen.getByLabelText(/confirm/i), "newpass1234");
      await user.click(screen.getByRole("button", { name: /reset password/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Token expired");
      });
    });

    it("disables button while resetting", async () => {
      mockResetPassword.mockReturnValue(new Promise(() => {}));
      renderPage("tok1");
      const user = userEvent.setup();
      await user.type(screen.getByLabelText(/new password/i), "newpass1234");
      await user.type(screen.getByLabelText(/confirm/i), "newpass1234");
      await user.click(screen.getByRole("button", { name: /reset password/i }));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /resetting/i })).toBeDisabled();
      });
    });
  });
});
