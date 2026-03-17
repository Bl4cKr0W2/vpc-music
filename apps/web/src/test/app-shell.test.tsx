import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";

// ---------- Mocks ----------
const mockLogout = vi.fn();
const mockNavigate = vi.fn();
const mockToggleTheme = vi.fn();
const mockSwitchOrg = vi.fn();
const mockRefreshUser = vi.fn();
const mockCreateOrg = vi.fn();

let mockAuthValue: any = {
  user: {
    displayName: "John",
    email: "john@test.com",
    role: "member",
    organizations: [
      { id: "org1", name: "Test Church", role: "admin" },
      { id: "org2", name: "North Campus", role: "musician" },
    ],
  },
  activeOrg: { id: "org1", name: "Test Church", role: "admin" },
  switchOrg: mockSwitchOrg,
  refreshUser: mockRefreshUser,
  logout: mockLogout,
};

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockAuthValue,
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

vi.mock("@/lib/api-client", () => ({
  orgsApi: {
    create: (...args: any[]) => mockCreateOrg(...args),
  },
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
    mockCreateOrg.mockResolvedValue({ organization: { id: "org3", name: "New Org" } });
    mockRefreshUser.mockResolvedValue(undefined);
    mockAuthValue = {
      user: {
        displayName: "John",
        email: "john@test.com",
        role: "member",
        organizations: [
          { id: "org1", name: "Test Church", role: "admin" },
          { id: "org2", name: "North Campus", role: "musician" },
        ],
      },
      activeOrg: { id: "org1", name: "Test Church", role: "admin" },
      switchOrg: mockSwitchOrg,
      refreshUser: mockRefreshUser,
      logout: mockLogout,
    };
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

    it("renders the org switcher with the active organization", () => {
      renderShell();
      expect(screen.getAllByText("Test Church").length).toBeGreaterThan(0);
    });

    it("switches organizations from the org switcher menu", async () => {
      renderShell();
      const user = userEvent.setup();

      await user.click(screen.getAllByRole("button", { name: /test church/i })[0]);
      await user.click(screen.getByRole("button", { name: "North Campus" }));

      expect(mockSwitchOrg).toHaveBeenCalledWith("org2");
    });

    it("creates a new organization from the org switcher", async () => {
      renderShell();
      const user = userEvent.setup();

      await user.click(screen.getAllByRole("button", { name: /test church/i })[0]);
      await user.click(screen.getByRole("button", { name: /new organization/i }));
      expect(screen.getByRole("dialog", { name: /create organization/i })).toBeInTheDocument();
      await user.type(screen.getByPlaceholderText(/organization name/i), "New Org");
      await user.click(screen.getByRole("button", { name: /^create$/i }));

      await waitFor(() => {
        expect(mockCreateOrg).toHaveBeenCalledWith("New Org");
        expect(mockSwitchOrg).toHaveBeenCalledWith("org3");
        expect(mockRefreshUser).toHaveBeenCalled();
      });
    });

    it("shows empty-org onboarding when the user has no organizations", () => {
      mockAuthValue = {
        user: {
          displayName: "John",
          email: "john@test.com",
          role: "member",
          organizations: [],
        },
        activeOrg: null,
        switchOrg: mockSwitchOrg,
        refreshUser: mockRefreshUser,
        logout: mockLogout,
      };

      renderShell();
      expect(screen.getByText(/no organization yet/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /create organization/i })).toBeInTheDocument();
    });

    it("opens the create organization dialog from empty-org onboarding", async () => {
      mockAuthValue = {
        user: {
          displayName: "John",
          email: "john@test.com",
          role: "member",
          organizations: [],
        },
        activeOrg: null,
        switchOrg: mockSwitchOrg,
        refreshUser: mockRefreshUser,
        logout: mockLogout,
      };

      renderShell();
      const user = userEvent.setup();

      await user.click(screen.getByRole("button", { name: /create organization/i }));

      expect(screen.getByRole("dialog", { name: /create organization/i })).toBeInTheDocument();
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
      mockAuthValue = {
        user: {
          displayName: "John",
          email: "john@test.com",
          role: "member",
          organizations: [{ id: "org1", name: "Test Church", role: "observer" }],
        },
        activeOrg: { id: "org1", name: "Test Church", role: "observer" },
        switchOrg: mockSwitchOrg,
        refreshUser: mockRefreshUser,
        logout: mockLogout,
      };

      renderShell();
      expect(screen.queryByText("Admin")).not.toBeInTheDocument();
      expect(screen.queryByText("Profile")).not.toBeInTheDocument();
    });
  });
});
