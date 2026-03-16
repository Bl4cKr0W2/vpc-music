import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { SongViewPage } from "@/pages/songs/SongViewPage";

// ---------- Mocks ----------
const mockGet = vi.fn();
const mockDelete = vi.fn();
const mockExportChordPro = vi.fn();
const mockNavigate = vi.fn();

vi.mock("@/lib/api-client", () => ({
  songsApi: {
    get: (...args: any[]) => mockGet(...args),
    delete: (...args: any[]) => mockDelete(...args),
    exportChordPro: (...args: any[]) => mockExportChordPro(...args),
  },
  shareApi: {
    create: vi.fn().mockResolvedValue({ shareUrl: "/shared/abc", shareToken: {} }),
    list: vi.fn().mockResolvedValue({ shares: [] }),
    revoke: vi.fn(),
    update: vi.fn().mockResolvedValue({ shareToken: {} }),
    getShared: vi.fn(),
  },
  songUsageApi: {
    log: vi.fn().mockResolvedValue({ usage: { id: "u1", songId: "song-1", usedAt: "2025-01-01" } }),
    list: vi.fn().mockResolvedValue({ usages: [] }),
    remove: vi.fn().mockResolvedValue({ message: "ok" }),
  },
  songHistoryApi: {
    list: vi.fn().mockResolvedValue({ history: [] }),
  },
  variationsApi: {
    create: vi.fn().mockResolvedValue({ variation: { id: "v1", songId: "song-1", name: "Acoustic", content: "[C]New", key: "C" } }),
    update: vi.fn().mockResolvedValue({ variation: { id: "v1", songId: "song-1", name: "Updated", content: "[D]Updated", key: "D" } }),
    delete: vi.fn().mockResolvedValue({ message: "ok" }),
  },
  stickyNotesApi: {
    list: vi.fn().mockResolvedValue({ notes: [] }),
    create: vi.fn().mockResolvedValue({ note: { id: "n1", songId: "song-1", content: "Test", color: "yellow" } }),
    update: vi.fn().mockResolvedValue({ note: { id: "n1", songId: "song-1", content: "Updated", color: "blue" } }),
    delete: vi.fn().mockResolvedValue({ message: "ok" }),
  },
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

// Minimal mock for ChordProRenderer
vi.mock("@/components/songs/ChordProRenderer", () => ({
  ChordProRenderer: ({ content }: { content: string }) => (
    <div data-testid="chordpro-renderer">{content}</div>
  ),
  AutoScroll: () => <div data-testid="auto-scroll">AutoScroll</div>,
}));

function renderPage(songId = "song-1") {
  return render(
    <MemoryRouter initialEntries={[`/songs/${songId}`]}>
      <Routes>
        <Route path="/songs/:id" element={<SongViewPage />} />
        <Route path="/songs" element={<div>Songs List</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("SongViewPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  // ===================== POSITIVE =====================

  describe("positive", () => {
    const mockSong = {
      id: "song-1",
      title: "Amazing Grace",
      key: "G",
      tempo: 72,
      artist: "Newton",
      tags: "hymn",
      content: "[G]Amazing grace",
    };

    it("renders song title and metadata", async () => {
      mockGet.mockResolvedValue({ song: mockSong, variations: [] });
      renderPage();
      await waitFor(() => {
        expect(screen.getByText("Amazing Grace")).toBeInTheDocument();
        expect(screen.getByText("Newton")).toBeInTheDocument();
        expect(screen.getByText("Key: G")).toBeInTheDocument();
        expect(screen.getByText("72 BPM")).toBeInTheDocument();
        expect(screen.getByText("hymn")).toBeInTheDocument();
      });
    });

    it("renders ChordPro content", async () => {
      mockGet.mockResolvedValue({ song: mockSong, variations: [] });
      renderPage();
      await waitFor(() => {
        expect(screen.getByTestId("chordpro-renderer")).toHaveTextContent("[G]Amazing grace");
      });
    });

    it("renders toolbar controls", async () => {
      mockGet.mockResolvedValue({ song: mockSong, variations: [] });
      renderPage();
      await waitFor(() => {
        expect(screen.getByText("Edit")).toBeInTheDocument();
        expect(screen.getByText("Export")).toBeInTheDocument();
        expect(screen.getByText("Print")).toBeInTheDocument();
        expect(screen.getByText("Delete")).toBeInTheDocument();
        expect(screen.getByText("Chords")).toBeInTheDocument();
      });
    });

    it("has back link to songs", async () => {
      mockGet.mockResolvedValue({ song: mockSong, variations: [] });
      renderPage();
      await waitFor(() => {
        expect(screen.getByText("Songs")).toHaveAttribute("href", "/songs");
      });
    });

    it("has edit link to song edit page", async () => {
      mockGet.mockResolvedValue({ song: mockSong, variations: [] });
      renderPage();
      await waitFor(() => {
        expect(screen.getByText("Edit").closest("a")).toHaveAttribute("href", "/songs/song-1/edit");
      });
    });

    it("includes the selected variation in the edit link", async () => {
      const user = userEvent.setup();
      mockGet.mockResolvedValue({
        song: mockSong,
        variations: [{ id: "v1", songId: "song-1", name: "Acoustic", content: "[C]Amazing grace", key: "C" }],
      });
      renderPage();

      await user.click(await screen.findByRole("button", { name: /acoustic/i }));

      await waitFor(() => {
        expect(screen.getByText("Edit").closest("a")).toHaveAttribute("href", "/songs/song-1/edit?variation=v1");
      });
    });

    it("renders font size selector", async () => {
      mockGet.mockResolvedValue({ song: mockSong, variations: [] });
      renderPage();
      await waitFor(() => {
        const select = screen.getByTitle("Font size");
        expect(select).toBeInTheDocument();
      });
    });

    it("renders auto-scroll component", async () => {
      mockGet.mockResolvedValue({ song: mockSong, variations: [] });
      renderPage();
      await waitFor(() => {
        expect(screen.getByTestId("auto-scroll")).toBeInTheDocument();
      });
    });
  });

  // ===================== NEGATIVE =====================

  describe("negative", () => {
    it("shows loading spinner initially", () => {
      mockGet.mockReturnValue(new Promise(() => {}));
      renderPage();
      expect(document.querySelector(".animate-spin")).toBeInTheDocument();
    });

    it("shows not found when song doesn't exist", async () => {
      mockGet.mockRejectedValue(new Error("Not found"));
      renderPage();
      await waitFor(() => {
        expect(screen.getByText("Song not found.")).toBeInTheDocument();
      });
    });

    it("has link back to songs from not-found state", async () => {
      mockGet.mockRejectedValue(new Error("Not found"));
      renderPage();
      await waitFor(() => {
        expect(screen.getByText("Back to songs")).toHaveAttribute("href", "/songs");
      });
    });

    it("calls delete API and navigates on confirm", async () => {
      const mockSong = { id: "song-1", title: "X", content: "", key: null, tempo: null, artist: null, tags: null };
      mockGet.mockResolvedValue({ song: mockSong, variations: [] });
      mockDelete.mockResolvedValue({ message: "ok" });
      renderPage();

      await waitFor(() => {
        expect(screen.getByText("Delete")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Delete"));

      await waitFor(() => {
        expect(mockDelete).toHaveBeenCalledWith("song-1");
        expect(mockNavigate).toHaveBeenCalledWith("/songs");
      });
    });

    it("shows error toast on delete failure", async () => {
      const { toast } = await import("sonner");
      const mockSong = { id: "song-1", title: "X", content: "", key: null, tempo: null, artist: null, tags: null };
      mockGet.mockResolvedValue({ song: mockSong, variations: [] });
      mockDelete.mockRejectedValue(new Error("Unauthorized"));
      renderPage();

      await waitFor(() => {
        expect(screen.getByText("Delete")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Delete"));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Unauthorized");
      });
    });
  });
});
