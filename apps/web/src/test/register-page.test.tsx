import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { RegisterPage } from "@/pages/auth/RegisterPage";

// ---------- Mocks ----------
const mockRegister = vi.fn();
const mockNavigate = vi.fn();

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    register: mockRegister,
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

function renderRegister() {
  return render(
    <MemoryRouter>
      <RegisterPage />
    </MemoryRouter>,
  );
}

describe("RegisterPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===================== POSITIVE =====================

  describe("positive", () => {
    it("renders heading and tagline", () => {
      renderRegister();
      expect(screen.getByText("Create Account")).toBeInTheDocument();
      expect(screen.getByText(/join vpc music/i)).toBeInTheDocument();
    });

    it("renders all form fields", () => {
      renderRegister();
      expect(screen.getByLabelText(/display name/i)).toBeInTheDocument();
      expect(screen.getByLabelText("Email")).toBeInTheDocument();
      expect(screen.getByLabelText("Password")).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    });

    it("renders create account button", () => {
      renderRegister();
      expect(screen.getByRole("button", { name: /create account/i })).toBeInTheDocument();
    });

    it("has sign in link for existing users", () => {
      renderRegister();
      expect(screen.getByRole("link", { name: /sign in/i })).toHaveAttribute("href", "/login");
    });

    it("calls register and navigates on success", async () => {
      mockRegister.mockResolvedValue(undefined);
      renderRegister();
      const user = userEvent.setup();
      await user.type(screen.getByLabelText(/display name/i), "Jane Doe");
      await user.type(screen.getByLabelText("Email"), "jane@test.com");
      await user.type(screen.getByLabelText("Password"), "password123");
      await user.type(screen.getByLabelText(/confirm password/i), "password123");
      await user.click(screen.getByRole("button", { name: /create account/i }));

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith("jane@test.com", "password123", "Jane Doe");
        expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
      });
    });

    it("sends undefined displayName when field is empty", async () => {
      mockRegister.mockResolvedValue(undefined);
      renderRegister();
      const user = userEvent.setup();
      await user.type(screen.getByLabelText("Email"), "a@b.com");
      await user.type(screen.getByLabelText("Password"), "password123");
      await user.type(screen.getByLabelText(/confirm password/i), "password123");
      await user.click(screen.getByRole("button", { name: /create account/i }));

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith("a@b.com", "password123", undefined);
      });
    });
  });

  // ===================== NEGATIVE =====================

  describe("negative", () => {
    it("shows error when passwords do not match", async () => {
      const { toast } = await import("sonner");
      renderRegister();
      const user = userEvent.setup();
      await user.type(screen.getByLabelText("Email"), "a@b.com");
      await user.type(screen.getByLabelText("Password"), "password123");
      await user.type(screen.getByLabelText(/confirm password/i), "different22");
      await user.click(screen.getByRole("button", { name: /create account/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Passwords do not match");
      });
      expect(mockRegister).not.toHaveBeenCalled();
    });

    it("shows error when password is too short", async () => {
      const { toast } = await import("sonner");
      renderRegister();
      const user = userEvent.setup();
      await user.type(screen.getByLabelText("Email"), "a@b.com");
      await user.type(screen.getByLabelText("Password"), "short");
      await user.type(screen.getByLabelText(/confirm password/i), "short");
      await user.click(screen.getByRole("button", { name: /create account/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Password must be at least 8 characters");
      });
      expect(mockRegister).not.toHaveBeenCalled();
    });

    it("shows error toast on API failure", async () => {
      const { toast } = await import("sonner");
      mockRegister.mockRejectedValue(new Error("Email already in use"));
      renderRegister();
      const user = userEvent.setup();
      await user.type(screen.getByLabelText("Email"), "dupe@test.com");
      await user.type(screen.getByLabelText("Password"), "password123");
      await user.type(screen.getByLabelText(/confirm password/i), "password123");
      await user.click(screen.getByRole("button", { name: /create account/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Email already in use");
      });
    });

    it("disables button while creating", async () => {
      mockRegister.mockReturnValue(new Promise(() => {})); // never resolves
      renderRegister();
      const user = userEvent.setup();
      await user.type(screen.getByLabelText("Email"), "a@b.com");
      await user.type(screen.getByLabelText("Password"), "password123");
      await user.type(screen.getByLabelText(/confirm password/i), "password123");
      await user.click(screen.getByRole("button", { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /creating account/i })).toBeDisabled();
      });
    });
  });
});
