import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { DashboardPage } from "@/pages/DashboardPage";

// ---------- Mocks ----------
const mockUseAuth = vi.fn();
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

const mockSongsList = vi.fn();
const mockSetlistsList = vi.fn();
vi.mock("@/lib/api-client", () => ({
  songsApi: { list: (...args: any[]) => mockSongsList(...args) },
  setlistsApi: { list: (...args: any[]) => mockSetlistsList(...args) },
}));

function renderDashboard() {
  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>,
  );
}

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { displayName: "John", email: "john@test.com" } });
  });

  // ===================== POSITIVE =====================

  describe("positive", () => {
    it("shows personalized greeting", async () => {
      mockSongsList.mockResolvedValue({ songs: [], total: 0 });
      mockSetlistsList.mockResolvedValue({ setlists: [] });
      renderDashboard();
      expect(screen.getByText("Welcome, John")).toBeInTheDocument();
    });

    it("shows overview description", async () => {
      mockSongsList.mockResolvedValue({ songs: [], total: 0 });
      mockSetlistsList.mockResolvedValue({ setlists: [] });
      renderDashboard();
      expect(screen.getByText(/overview of your library/i)).toBeInTheDocument();
    });

    it("renders quick action links", async () => {
      mockSongsList.mockResolvedValue({ songs: [], total: 0 });
      mockSetlistsList.mockResolvedValue({ setlists: [] });
      renderDashboard();
      expect(screen.getByRole("link", { name: /new song/i })).toHaveAttribute("href", "/songs/new");
      expect(screen.getByRole("link", { name: /new setlist/i })).toHaveAttribute("href", "/setlists/new");
      expect(screen.getByRole("link", { name: /browse songs/i })).toHaveAttribute("href", "/songs");
    });

    it("renders recent songs when available", async () => {
      mockSongsList.mockResolvedValue({
        songs: [
          { id: "1", title: "Amazing Grace", key: "G", tempo: 72, artist: "Newton" },
          { id: "2", title: "How Great", key: "C", tempo: 120, artist: null },
        ],
        total: 2,
      });
      mockSetlistsList.mockResolvedValue({ setlists: [] });
      renderDashboard();
      await waitFor(() => {
        expect(screen.getByText("Amazing Grace")).toBeInTheDocument();
        expect(screen.getByText("How Great")).toBeInTheDocument();
      });
    });

    it("renders 'View all' links for songs and setlists", async () => {
      mockSongsList.mockResolvedValue({ songs: [], total: 0 });
      mockSetlistsList.mockResolvedValue({ setlists: [] });
      renderDashboard();
      const viewAlls = screen.getAllByText("View all");
      expect(viewAlls.length).toBeGreaterThanOrEqual(2);
    });

    it("renders setlists when available", async () => {
      mockSongsList.mockResolvedValue({ songs: [], total: 0 });
      mockSetlistsList.mockResolvedValue({
        setlists: [
          { id: "s1", name: "Sunday Service", songCount: 5, category: "worship" },
        ],
      });
      renderDashboard();
      await waitFor(() => {
        expect(screen.getByText("Sunday Service")).toBeInTheDocument();
      });
    });

    it("shows song metadata (key, tempo, artist)", async () => {
      mockSongsList.mockResolvedValue({
        songs: [{ id: "1", title: "Song A", key: "D", tempo: 90, artist: "Artist X" }],
        total: 1,
      });
      mockSetlistsList.mockResolvedValue({ setlists: [] });
      renderDashboard();
      await waitFor(() => {
        expect(screen.getByText("Key: D")).toBeInTheDocument();
        expect(screen.getByText("90 BPM")).toBeInTheDocument();
        expect(screen.getByText("Artist X")).toBeInTheDocument();
      });
    });
  });

  // ===================== NEGATIVE =====================

  describe("negative", () => {
    it("shows empty state for songs when none exist", async () => {
      mockSongsList.mockResolvedValue({ songs: [], total: 0 });
      mockSetlistsList.mockResolvedValue({ setlists: [] });
      renderDashboard();
      await waitFor(() => {
        expect(screen.getByText(/no songs yet/i)).toBeInTheDocument();
      });
    });

    it("shows empty state for setlists when none exist", async () => {
      mockSongsList.mockResolvedValue({ songs: [], total: 0 });
      mockSetlistsList.mockResolvedValue({ setlists: [] });
      renderDashboard();
      await waitFor(() => {
        expect(screen.getByText(/no setlists yet/i)).toBeInTheDocument();
      });
    });

    it("shows loading state initially", () => {
      mockSongsList.mockReturnValue(new Promise(() => {})); // never resolves
      mockSetlistsList.mockReturnValue(new Promise(() => {}));
      renderDashboard();
      const loadingEls = screen.getAllByText("Loading...");
      expect(loadingEls.length).toBeGreaterThanOrEqual(1);
    });

    it("handles API errors gracefully", async () => {
      mockSongsList.mockRejectedValue(new Error("Server error"));
      mockSetlistsList.mockRejectedValue(new Error("Server error"));
      renderDashboard();
      // Should show empty states, not crash
      await waitFor(() => {
        expect(screen.getByText(/no songs yet/i)).toBeInTheDocument();
      });
    });

    it("shows greeting without name when displayName is empty", () => {
      mockUseAuth.mockReturnValue({ user: { displayName: "", email: "a@b.com" } });
      mockSongsList.mockResolvedValue({ songs: [], total: 0 });
      mockSetlistsList.mockResolvedValue({ setlists: [] });
      renderDashboard();
      expect(screen.getByText("Welcome")).toBeInTheDocument();
    });

    it("shows greeting without name when user is null", () => {
      mockUseAuth.mockReturnValue({ user: null });
      mockSongsList.mockResolvedValue({ songs: [], total: 0 });
      mockSetlistsList.mockResolvedValue({ setlists: [] });
      renderDashboard();
      expect(screen.getByText("Welcome")).toBeInTheDocument();
    });
  });
});
