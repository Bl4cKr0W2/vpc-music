import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";

// ---------- Mocks ----------
const mockLogout = vi.fn();
const mockNavigate = vi.fn();
const mockToggleTheme = vi.fn();

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { displayName: "John", email: "john@test.com" },
    logout: mockLogout,
  }),
}));

vi.mock("@/contexts/ThemeContext", () => ({
  useTheme: () => ({
    resolvedTheme: "dark",
    toggleTheme: mockToggleTheme,
  }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    Outlet: () => <div data-testid="outlet">Page Content</div>,
  };
});

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function renderShell() {
  return render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <AppShell />
    </MemoryRouter>,
  );
}

describe("AppShell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLogout.mockResolvedValue(undefined);
  });

  // ===================== POSITIVE =====================

  describe("positive", () => {
    it("renders logo and brand name", () => {
      renderShell();
      expect(screen.getByText("VPC Music")).toBeInTheDocument();
      expect(screen.getByAltText("")).toBeInTheDocument(); // logo img
    });

    it("renders nav links", () => {
      renderShell();
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
      expect(screen.getByText("Songs")).toBeInTheDocument();
      expect(screen.getByText("Setlists")).toBeInTheDocument();
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    it("renders outlet for child routes", () => {
      renderShell();
      expect(screen.getByTestId("outlet")).toBeInTheDocument();
    });

    it("shows user display name", () => {
      renderShell();
      expect(screen.getByText("John")).toBeInTheDocument();
    });

    it("renders theme toggle button", () => {
      renderShell();
      expect(screen.getByLabelText("Toggle theme")).toBeInTheDocument();
    });

    it("calls toggleTheme when button clicked", () => {
      renderShell();
      fireEvent.click(screen.getByLabelText("Toggle theme"));
      expect(mockToggleTheme).toHaveBeenCalledOnce();
    });

    it("renders sign out button", () => {
      renderShell();
      expect(screen.getByTitle("Sign out")).toBeInTheDocument();
    });
  });

  // ===================== NEGATIVE =====================

  describe("negative", () => {
    it("calls logout and navigates on sign out", async () => {
      renderShell();
      fireEvent.click(screen.getByTitle("Sign out"));

      await waitFor(() => {
        expect(mockLogout).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith("/");
      });
    });

    it("does not show nav links that don't exist", () => {
      renderShell();
      expect(screen.queryByText("Admin")).not.toBeInTheDocument();
      expect(screen.queryByText("Profile")).not.toBeInTheDocument();
    });
  });
});
