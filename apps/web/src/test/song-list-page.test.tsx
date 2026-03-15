import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { SongListPage } from "@/pages/songs/SongListPage";

// ---------- Mocks ----------
const mockList = vi.fn();
vi.mock("@/lib/api-client", () => ({
  songsApi: { list: (...args: any[]) => mockList(...args) },
}));

vi.mock("@vpc-music/shared", () => ({
  ALL_KEYS: ["C", "D", "E", "F", "G", "A", "B"],
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <SongListPage />
    </MemoryRouter>,
  );
}

describe("SongListPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ===================== POSITIVE =====================

  describe("positive", () => {
    it("renders heading and new song link", async () => {
      mockList.mockResolvedValue({ songs: [], total: 0 });
      renderPage();
      expect(screen.getByText("Songs")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /new song/i })).toHaveAttribute("href", "/songs/new");
    });

    it("renders search input and key filter dropdown", async () => {
      mockList.mockResolvedValue({ songs: [], total: 0 });
      renderPage();
      expect(screen.getByPlaceholderText(/search songs/i)).toBeInTheDocument();
      expect(screen.getByText("All keys")).toBeInTheDocument();
    });

    it("renders songs list when available", async () => {
      mockList.mockResolvedValue({
        songs: [
          { id: "1", title: "Amazing Grace", key: "G", tempo: 72, artist: "Newton", tags: "hymn" },
          { id: "2", title: "How Great", key: "C", tempo: 120, artist: "Tomlin", tags: "" },
        ],
        total: 2,
      });
      renderPage();
      await waitFor(() => {
        expect(screen.getByText("Amazing Grace")).toBeInTheDocument();
        expect(screen.getByText("How Great")).toBeInTheDocument();
      });
    });

    it("shows song count", async () => {
      mockList.mockResolvedValue({
        songs: [{ id: "1", title: "Song A", key: "C", content: "" }],
        total: 1,
      });
      renderPage();
      await waitFor(() => {
        expect(screen.getByText(/1 song\b/)).toBeInTheDocument();
      });
    });

    it("pluralizes song count correctly", async () => {
      mockList.mockResolvedValue({
        songs: [
          { id: "1", title: "A" },
          { id: "2", title: "B" },
        ],
        total: 2,
      });
      renderPage();
      await waitFor(() => {
        expect(screen.getByText(/2 songs/)).toBeInTheDocument();
      });
    });

    it("renders key filter options from ALL_KEYS", async () => {
      mockList.mockResolvedValue({ songs: [], total: 0 });
      renderPage();
      const select = screen.getByDisplayValue("All keys");
      expect(select).toBeInTheDocument();
      // Check some key options exist
      expect(select.querySelectorAll("option").length).toBeGreaterThan(1);
    });
  });

  // ===================== NEGATIVE =====================

  describe("negative", () => {
    it("shows empty state when no songs", async () => {
      mockList.mockResolvedValue({ songs: [], total: 0 });
      renderPage();
      await waitFor(() => {
        expect(screen.getByText(/no songs yet/i)).toBeInTheDocument();
      });
    });

    it("shows no-match message when search yields nothing", async () => {
      // First call returns results, second (after search) returns nothing
      mockList
        .mockResolvedValueOnce({ songs: [{ id: "1", title: "X" }], total: 1 })
        .mockResolvedValueOnce({ songs: [], total: 0 });

      renderPage();
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      await waitFor(() => {
        expect(screen.getByText("X")).toBeInTheDocument();
      });

      await user.type(screen.getByPlaceholderText(/search songs/i), "zzzzz");
      vi.advanceTimersByTime(350); // exceed debounce

      await waitFor(() => {
        expect(screen.getByText(/no songs match your search/i)).toBeInTheDocument();
      });
    });

    it("shows loading state initially", () => {
      mockList.mockReturnValue(new Promise(() => {}));
      renderPage();
      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });

    it("handles API errors gracefully", async () => {
      mockList.mockRejectedValue(new Error("Server down"));
      renderPage();
      await waitFor(() => {
        // Should show empty state, not crash
        expect(screen.getByText(/no songs yet/i)).toBeInTheDocument();
      });
    });

    it("shows Create Song link in empty state", async () => {
      mockList.mockResolvedValue({ songs: [], total: 0 });
      renderPage();
      await waitFor(() => {
        expect(screen.getByRole("link", { name: /create song/i })).toHaveAttribute("href", "/songs/new");
      });
    });
  });
});
