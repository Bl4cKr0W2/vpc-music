import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ForgotPasswordPage } from "@/pages/auth/ForgotPasswordPage";

// ---------- Mocks ----------
const mockForgotPassword = vi.fn();
vi.mock("@/lib/api-client", () => ({
  authApi: { forgotPassword: (...args: any[]) => mockForgotPassword(...args) },
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <ForgotPasswordPage />
    </MemoryRouter>,
  );
}

describe("ForgotPasswordPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===================== POSITIVE =====================

  describe("positive", () => {
    it("renders heading and description", () => {
      renderPage();
      expect(screen.getByText("Forgot Password")).toBeInTheDocument();
      expect(screen.getByText(/enter your email/i)).toBeInTheDocument();
    });

    it("renders email input and submit button", () => {
      renderPage();
      expect(screen.getByLabelText("Email")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /send reset link/i })).toBeInTheDocument();
    });

    it("has back to sign in link", () => {
      renderPage();
      expect(screen.getByText(/back to sign in/i)).toHaveAttribute("href", "/login");
    });

    it("shows success state after sending", async () => {
      mockForgotPassword.mockResolvedValue({ message: "ok" });
      renderPage();
      const user = userEvent.setup();
      await user.type(screen.getByLabelText("Email"), "user@test.com");
      await user.click(screen.getByRole("button", { name: /send reset link/i }));

      await waitFor(() => {
        expect(screen.getByText(/user@test.com/)).toBeInTheDocument();
        expect(screen.getByText(/receive a reset link/i)).toBeInTheDocument();
      });
    });

    it("hides the form after successful submission", async () => {
      mockForgotPassword.mockResolvedValue({ message: "ok" });
      renderPage();
      const user = userEvent.setup();
      await user.type(screen.getByLabelText("Email"), "user@test.com");
      await user.click(screen.getByRole("button", { name: /send reset link/i }));

      await waitFor(() => {
        expect(screen.queryByRole("button", { name: /send reset link/i })).not.toBeInTheDocument();
      });
    });

    it("calls forgotPassword API with email", async () => {
      mockForgotPassword.mockResolvedValue({ message: "ok" });
      renderPage();
      const user = userEvent.setup();
      await user.type(screen.getByLabelText("Email"), "test@email.com");
      await user.click(screen.getByRole("button", { name: /send reset link/i }));

      await waitFor(() => {
        expect(mockForgotPassword).toHaveBeenCalledWith("test@email.com");
      });
    });
  });

  // ===================== NEGATIVE =====================

  describe("negative", () => {
    it("shows error toast on API failure", async () => {
      const { toast } = await import("sonner");
      mockForgotPassword.mockRejectedValue(new Error("Network error"));
      renderPage();
      const user = userEvent.setup();
      await user.type(screen.getByLabelText("Email"), "a@b.com");
      await user.click(screen.getByRole("button", { name: /send reset link/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Network error");
      });
    });

    it("keeps form visible on error", async () => {
      mockForgotPassword.mockRejectedValue(new Error("fail"));
      renderPage();
      const user = userEvent.setup();
      await user.type(screen.getByLabelText("Email"), "a@b.com");
      await user.click(screen.getByRole("button", { name: /send reset link/i }));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /send reset link/i })).toBeInTheDocument();
      });
    });

    it("disables button while sending", async () => {
      mockForgotPassword.mockReturnValue(new Promise(() => {}));
      renderPage();
      const user = userEvent.setup();
      await user.type(screen.getByLabelText("Email"), "a@b.com");
      await user.click(screen.getByRole("button", { name: /send reset link/i }));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /sending/i })).toBeDisabled();
      });
    });
  });
});
