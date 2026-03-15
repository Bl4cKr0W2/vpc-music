import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { LoginPage } from "@/pages/auth/LoginPage";

// ---------- Mocks ----------
const mockLogin = vi.fn();
const mockNavigate = vi.fn();

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    login: mockLogin,
    isAuthenticated: false,
  }),
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

function renderLogin() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  );
}

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===================== POSITIVE =====================

  describe("positive", () => {
    it("renders logo and heading", () => {
      renderLogin();
      expect(screen.getByAltText("VPC Music")).toBeInTheDocument();
      expect(screen.getByText("VPC Music")).toBeInTheDocument();
    });

    it("renders email and password inputs", () => {
      renderLogin();
      expect(screen.getByLabelText("Email")).toBeInTheDocument();
      expect(screen.getByLabelText("Password")).toBeInTheDocument();
    });

    it("renders sign in button", () => {
      renderLogin();
      expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
    });

    it("has forgot password link", () => {
      renderLogin();
      expect(screen.getByText(/forgot password/i)).toHaveAttribute("href", "/forgot-password");
    });

    it("has sign up link", () => {
      renderLogin();
      expect(screen.getByRole("link", { name: /sign up/i })).toHaveAttribute("href", "/register");
    });

    it("calls login on form submit", async () => {
      mockLogin.mockResolvedValue(undefined);
      renderLogin();
      const user = userEvent.setup();
      await user.type(screen.getByLabelText("Email"), "test@example.com");
      await user.type(screen.getByLabelText("Password"), "password123");
      await user.click(screen.getByRole("button", { name: /sign in/i }));

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith("test@example.com", "password123");
      });
    });

    it("navigates to dashboard on success", async () => {
      mockLogin.mockResolvedValue(undefined);
      renderLogin();
      const user = userEvent.setup();
      await user.type(screen.getByLabelText("Email"), "test@example.com");
      await user.type(screen.getByLabelText("Password"), "pass1234");
      await user.click(screen.getByRole("button", { name: /sign in/i }));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
      });
    });

    it("shows Signing in... while loading", async () => {
      mockLogin.mockReturnValue(new Promise(() => {})); // never resolves
      renderLogin();
      const user = userEvent.setup();
      await user.type(screen.getByLabelText("Email"), "a@b.com");
      await user.type(screen.getByLabelText("Password"), "12345678");
      await user.click(screen.getByRole("button", { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /signing in/i })).toBeDisabled();
      });
    });
  });

  // ===================== NEGATIVE =====================

  describe("negative", () => {
    it("shows error toast on login failure", async () => {
      const { toast } = await import("sonner");
      mockLogin.mockRejectedValue(new Error("Invalid credentials"));
      renderLogin();
      const user = userEvent.setup();
      await user.type(screen.getByLabelText("Email"), "bad@example.com");
      await user.type(screen.getByLabelText("Password"), "wrongpass");
      await user.click(screen.getByRole("button", { name: /sign in/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Invalid credentials");
      });
    });

    it("shows generic error when no message available", async () => {
      const { toast } = await import("sonner");
      mockLogin.mockRejectedValue(new Error(""));
      renderLogin();
      const user = userEvent.setup();
      await user.type(screen.getByLabelText("Email"), "a@b.com");
      await user.type(screen.getByLabelText("Password"), "12345678");
      await user.click(screen.getByRole("button", { name: /sign in/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Login failed");
      });
    });

    it("re-enables button after failed login", async () => {
      mockLogin.mockRejectedValue(new Error("fail"));
      renderLogin();
      const user = userEvent.setup();
      await user.type(screen.getByLabelText("Email"), "a@b.com");
      await user.type(screen.getByLabelText("Password"), "12345678");
      await user.click(screen.getByRole("button", { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /sign in/i })).not.toBeDisabled();
      });
    });
  });
});
