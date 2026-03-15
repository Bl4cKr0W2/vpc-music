import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { SetlistViewPage } from "@/pages/setlists/SetlistViewPage";

// ---------- Mocks ----------
const mockGetSetlist = vi.fn();
const mockDeleteSetlist = vi.fn();
const mockAddSong = vi.fn();
const mockRemoveSong = vi.fn();
const mockReorderSongs = vi.fn();
const mockSongsList = vi.fn();
const mockNavigate = vi.fn();

vi.mock("@/lib/api-client", () => ({
  setlistsApi: {
    get: (...args: any[]) => mockGetSetlist(...args),
    delete: (...args: any[]) => mockDeleteSetlist(...args),
    addSong: (...args: any[]) => mockAddSong(...args),
    removeSong: (...args: any[]) => mockRemoveSong(...args),
    reorderSongs: (...args: any[]) => mockReorderSongs(...args),
  },
  songsApi: {
    list: (...args: any[]) => mockSongsList(...args),
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

vi.mock("@vpc-music/shared", () => ({
  ALL_KEYS: ["C", "D", "E", "F", "G", "A", "B"],
}));

function renderPage(id = "sl-1") {
  return render(
    <MemoryRouter initialEntries={[`/setlists/${id}`]}>
      <Routes>
        <Route path="/setlists/:id" element={<SetlistViewPage />} />
        <Route path="/setlists" element={<div>Setlists List</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

const mockSetlist = { id: "sl-1", name: "Sunday Service", category: "worship", notes: "Notes here" };
const mockSongs = [
  { id: "item-1", songId: "s1", position: 0, songTitle: "Song A", songKey: "G", songArtist: "Artist 1", songTempo: 120, key: null, notes: null },
  { id: "item-2", songId: "s2", position: 1, songTitle: "Song B", songKey: "C", songArtist: null, songTempo: null, key: "D", notes: null },
];

describe("SetlistViewPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  // ===================== POSITIVE =====================

  describe("positive", () => {
    it("renders setlist name and category", async () => {
      mockGetSetlist.mockResolvedValue({ setlist: mockSetlist, songs: mockSongs });
      renderPage();
      await waitFor(() => {
        expect(screen.getByText("Sunday Service")).toBeInTheDocument();
        expect(screen.getByText("worship")).toBeInTheDocument();
      });
    });

    it("renders songs count", async () => {
      mockGetSetlist.mockResolvedValue({ setlist: mockSetlist, songs: mockSongs });
      renderPage();
      await waitFor(() => {
        expect(screen.getByText("Songs (2)")).toBeInTheDocument();
      });
    });

    it("renders song items with titles", async () => {
      mockGetSetlist.mockResolvedValue({ setlist: mockSetlist, songs: mockSongs });
      renderPage();
      await waitFor(() => {
        expect(screen.getByText("Song A")).toBeInTheDocument();
        expect(screen.getByText("Song B")).toBeInTheDocument();
      });
    });

    it("renders position numbers", async () => {
      mockGetSetlist.mockResolvedValue({ setlist: mockSetlist, songs: mockSongs });
      renderPage();
      await waitFor(() => {
        expect(screen.getByText("1")).toBeInTheDocument();
        expect(screen.getByText("2")).toBeInTheDocument();
      });
    });

    it("has back link to setlists", async () => {
      mockGetSetlist.mockResolvedValue({ setlist: mockSetlist, songs: mockSongs });
      renderPage();
      await waitFor(() => {
        expect(screen.getByText("Setlists")).toHaveAttribute("href", "/setlists");
      });
    });

    it("renders add song button", async () => {
      mockGetSetlist.mockResolvedValue({ setlist: mockSetlist, songs: mockSongs });
      renderPage();
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /add song/i })).toBeInTheDocument();
      });
    });

    it("renders reorder buttons for songs", async () => {
      mockGetSetlist.mockResolvedValue({ setlist: mockSetlist, songs: mockSongs });
      renderPage();
      await waitFor(() => {
        const upButtons = screen.getAllByTitle("Move up");
        const downButtons = screen.getAllByTitle("Move down");
        expect(upButtons.length).toBe(2);
        expect(downButtons.length).toBe(2);
      });
    });

    it("removes song from list", async () => {
      mockGetSetlist.mockResolvedValue({ setlist: mockSetlist, songs: [mockSongs[0]] });
      mockRemoveSong.mockResolvedValue({ message: "ok" });
      renderPage();

      await waitFor(() => {
        expect(screen.getByText("Song A")).toBeInTheDocument();
      });

      const removeBtn = screen.getByTitle("Remove from setlist");
      fireEvent.click(removeBtn);

      await waitFor(() => {
        expect(mockRemoveSong).toHaveBeenCalledWith("sl-1", "item-1");
      });
    });
  });

  // ===================== NEGATIVE =====================

  describe("negative", () => {
    it("shows loading spinner", () => {
      mockGetSetlist.mockReturnValue(new Promise(() => {}));
      renderPage();
      expect(document.querySelector(".animate-spin")).toBeInTheDocument();
    });

    it("shows not found when setlist doesn't exist", async () => {
      mockGetSetlist.mockRejectedValue(new Error("Not found"));
      renderPage();
      await waitFor(() => {
        expect(screen.getByText("Setlist not found.")).toBeInTheDocument();
      });
    });

    it("has link back from not-found", async () => {
      mockGetSetlist.mockRejectedValue(new Error("Not found"));
      renderPage();
      await waitFor(() => {
        expect(screen.getByText("Back to setlists")).toHaveAttribute("href", "/setlists");
      });
    });

    it("shows empty song list state", async () => {
      mockGetSetlist.mockResolvedValue({ setlist: mockSetlist, songs: [] });
      renderPage();
      await waitFor(() => {
        expect(screen.getByText(/no songs in this setlist/i)).toBeInTheDocument();
      });
    });

    it("calls delete and navigates away", async () => {
      mockGetSetlist.mockResolvedValue({ setlist: mockSetlist, songs: [] });
      mockDeleteSetlist.mockResolvedValue({ message: "ok" });
      renderPage();

      await waitFor(() => {
        expect(screen.getByText("Delete")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Delete"));

      await waitFor(() => {
        expect(mockDeleteSetlist).toHaveBeenCalledWith("sl-1");
        expect(mockNavigate).toHaveBeenCalledWith("/setlists");
      });
    });

    it("shows error toast on delete failure", async () => {
      const { toast } = await import("sonner");
      mockGetSetlist.mockResolvedValue({ setlist: mockSetlist, songs: [] });
      mockDeleteSetlist.mockRejectedValue(new Error("Cannot delete"));
      renderPage();

      await waitFor(() => {
        expect(screen.getByText("Delete")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Delete"));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Cannot delete");
      });
    });

    it("first song up button is disabled", async () => {
      mockGetSetlist.mockResolvedValue({ setlist: mockSetlist, songs: mockSongs });
      renderPage();
      await waitFor(() => {
        const upButtons = screen.getAllByTitle("Move up");
        expect(upButtons[0]).toBeDisabled();
      });
    });

    it("last song down button is disabled", async () => {
      mockGetSetlist.mockResolvedValue({ setlist: mockSetlist, songs: mockSongs });
      renderPage();
      await waitFor(() => {
        const downButtons = screen.getAllByTitle("Move down");
        expect(downButtons[downButtons.length - 1]).toBeDisabled();
      });
    });
  });
});
