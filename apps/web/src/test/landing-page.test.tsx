import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LandingPage } from "@/pages/LandingPage";

// ---------- Mock AuthContext ----------
const mockUseAuth = vi.fn();
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/contexts/ThemeContext", () => ({
  useTheme: () => ({ resolvedTheme: "dark", toggleTheme: vi.fn() }),
}));

// Helper: render inside a router so <Link> / <Navigate> work
function renderLanding(route = "/") {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <LandingPage />
    </MemoryRouter>,
  );
}

describe("LandingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===================== POSITIVE TESTS =====================

  describe("positive — unauthenticated visitor", () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
      });
    });

    it("renders the hero heading welcoming users", () => {
      renderLanding();
      expect(
        screen.getByText(/welcome to vpc\s*music/i),
      ).toBeInTheDocument();
    });

    it("renders the hero description paragraph", () => {
      renderLanding();
      expect(
        screen.getByText(/team.*hub for managing chord charts/i),
      ).toBeInTheDocument();
    });

    it("renders the themed tile logo and VPC Music brand in the top bar", () => {
      renderLanding();
      const logo = screen.getByAltText("VPC Music");
      expect(logo).toBeInTheDocument();
      // In dark mode the navy tile is shown
      expect(logo).toHaveAttribute("src", "/icons/icon-512-tile-navy.png");
      expect(screen.getByText("VPC Music")).toBeInTheDocument();
    });

    it('renders "Sign in" links pointing to /login', () => {
      renderLanding();
      const links = screen.getAllByRole("link", { name: /sign in/i });
      expect(links.length).toBeGreaterThanOrEqual(1);
      expect(links[0]).toHaveAttribute("href", "/login");
    });

    it("does not render a Join or Register link", () => {
      renderLanding();
      expect(screen.queryByRole("link", { name: /^join$/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("link", { name: /register/i })).not.toBeInTheDocument();
    });

    it("renders all six core feature cards", () => {
      renderLanding();
      expect(screen.getByText("ChordPro Native")).toBeInTheDocument();
      expect(screen.getByText("Instant Transpose")).toBeInTheDocument();
      expect(screen.getByText("Setlist Builder")).toBeInTheDocument();
      expect(screen.getByText("Conductor Mode")).toBeInTheDocument();
      expect(screen.getByText("Auto-Scroll")).toBeInTheDocument();
      expect(screen.getByText("Flexible Import")).toBeInTheDocument();
    });

    it("renders core feature descriptions", () => {
      renderLanding();
      expect(screen.getByText(/industry-standard ChordPro format/i)).toBeInTheDocument();
      expect(screen.getByText(/step-by-step semitone buttons/i)).toBeInTheDocument();
      expect(screen.getByText(/drag-and-drop reordering/i)).toBeInTheDocument();
      expect(screen.getByText(/real-time sync across every connected device/i)).toBeInTheDocument();
      expect(screen.getByText(/hands-free performance mode/i)).toBeInTheDocument();
      expect(screen.getByText(/import .chrd legacy files/i)).toBeInTheDocument();
    });

    it("renders the additional features section", () => {
      renderLanding();
      expect(screen.getByText("Role-Based Access")).toBeInTheDocument();
      expect(screen.getByText("Dark & Light Themes")).toBeInTheDocument();
      expect(screen.getByText("Responsive Design")).toBeInTheDocument();
      expect(screen.getByText("Fast & Modern Stack")).toBeInTheDocument();
      expect(screen.getByText("ChordPro Export")).toBeInTheDocument();
      expect(screen.getByText("Dashboard & Quick Actions")).toBeInTheDocument();
    });

    it('renders the "How it works" section with steps', () => {
      renderLanding();
      expect(screen.getByText("How it works")).toBeInTheDocument();
      expect(screen.getByText("Import or Create")).toBeInTheDocument();
      expect(screen.getByText("Organize")).toBeInTheDocument();
      expect(screen.getByText("Perform")).toBeInTheDocument();
    });

    it("renders the section headings", () => {
      renderLanding();
      expect(screen.getByText("What you can do here")).toBeInTheDocument();
      expect(screen.getByText(/Also built in/)).toBeInTheDocument();
      expect(screen.getByText(/Want to join the team/)).toBeInTheDocument();
    });

    it("renders a CTA banner with invitation-only info", () => {
      renderLanding();
      expect(
        screen.getByText(/invitation only/i),
      ).toBeInTheDocument();
    });

    it("renders a footer with copyright", () => {
      renderLanding();
      const year = new Date().getFullYear().toString();
      expect(
        screen.getByText(new RegExp(`${year}.*Antioch College of Truth`, "i")),
      ).toBeInTheDocument();
    });

    it("does NOT redirect when unauthenticated", () => {
      renderLanding();
      expect(screen.getByText(/welcome to vpc\s*music/i)).toBeInTheDocument();
      const signInLinks = screen.getAllByRole("link", { name: /sign in/i });
      expect(signInLinks.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ===================== NEGATIVE TESTS =====================

  describe("negative — authenticated user redirects", () => {
    it("does not render page content when user is authenticated", () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
      });
      renderLanding();
      expect(screen.queryByText(/welcome to vpc\s*music/i)).not.toBeInTheDocument();
      expect(screen.queryByRole("link", { name: /sign in/i })).not.toBeInTheDocument();
    });
  });

  describe("negative — loading state", () => {
    it("renders nothing while auth is loading", () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: true,
      });
      const { container } = renderLanding();
      expect(container.innerHTML).toBe("");
    });

    it("does not show feature cards while loading", () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: true,
      });
      renderLanding();
      expect(screen.queryByText("ChordPro Native")).not.toBeInTheDocument();
      expect(screen.queryByText("Setlist Builder")).not.toBeInTheDocument();
    });

    it("does not show CTA links while loading", () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: true,
      });
      renderLanding();
      expect(screen.queryByRole("link", { name: /sign in/i })).not.toBeInTheDocument();
    });
  });

  describe("negative — missing elements validation", () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
      });
    });

    it("does not render non-existent feature cards", () => {
      renderLanding();
      expect(screen.queryByText("PDF Import")).not.toBeInTheDocument();
      expect(screen.queryByText("Offline Mode")).not.toBeInTheDocument();
    });

    it("does not render a dashboard link on the landing page", () => {
      renderLanding();
      expect(screen.queryByRole("link", { name: /dashboard/i })).not.toBeInTheDocument();
    });

    it("does not render logout controls", () => {
      renderLanding();
      expect(screen.queryByRole("button", { name: /logout/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /sign out/i })).not.toBeInTheDocument();
    });
  });
});
