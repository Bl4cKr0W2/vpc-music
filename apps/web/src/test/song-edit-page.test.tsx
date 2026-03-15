import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { SongEditPage } from "@/pages/songs/SongEditPage";

// ---------- Mocks ----------
const mockGet = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockNavigate = vi.fn();

vi.mock("@/lib/api-client", () => ({
  songsApi: {
    get: (...args: any[]) => mockGet(...args),
    create: (...args: any[]) => mockCreate(...args),
    update: (...args: any[]) => mockUpdate(...args),
    importChrd: vi.fn(),
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

function renderNewSong() {
  return render(
    <MemoryRouter initialEntries={["/songs/new"]}>
      <Routes>
        <Route path="/songs/new" element={<SongEditPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

function renderEditSong(id = "song-1") {
  return render(
    <MemoryRouter initialEntries={[`/songs/${id}/edit`]}>
      <Routes>
        <Route path="/songs/:id/edit" element={<SongEditPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("SongEditPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===================== POSITIVE — New Song =====================

  describe("positive — create new song", () => {
    it("renders New Song heading", () => {
      renderNewSong();
      expect(screen.getByText("New Song")).toBeInTheDocument();
    });

    it("renders all form fields", () => {
      renderNewSong();
      expect(screen.getByPlaceholderText("Song title")).toBeInTheDocument();
      expect(screen.getByText("Select key")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("120")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Artist or composer")).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/worship, hymn/)).toBeInTheDocument();
    });

    it("renders Create Song button", () => {
      renderNewSong();
      expect(screen.getByRole("button", { name: /create song/i })).toBeInTheDocument();
    });

    it("has cancel link back to songs", () => {
      renderNewSong();
      expect(screen.getByRole("link", { name: /cancel/i })).toHaveAttribute("href", "/songs");
    });

    it("creates song and navigates on success", async () => {
      mockCreate.mockResolvedValue({ song: { id: "new-1" } });
      renderNewSong();
      const user = userEvent.setup();
      await user.type(screen.getByPlaceholderText("Song title"), "New Song Title");
      await user.click(screen.getByRole("button", { name: /create song/i }));

      await waitFor(() => {
        expect(mockCreate).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith("/songs/new-1");
      });
    });

    it("has file import label", () => {
      renderNewSong();
      expect(screen.getByText("Import file")).toBeInTheDocument();
    });

    it("renders draft checkbox", () => {
      renderNewSong();
      expect(screen.getByText(/save as draft/i)).toBeInTheDocument();
    });
  });

  // ===================== POSITIVE — Edit Song =====================

  describe("positive — edit existing song", () => {
    const existingSong = {
      id: "song-1",
      title: "Amazing Grace",
      key: "G",
      tempo: 72,
      artist: "Newton",
      tags: "hymn",
      content: "[G]Amazing",
      isDraft: false,
    };

    it("renders Edit Song heading", async () => {
      mockGet.mockResolvedValue({ song: existingSong });
      renderEditSong();
      await waitFor(() => {
        expect(screen.getByText("Edit Song")).toBeInTheDocument();
      });
    });

    it("populates form with existing data", async () => {
      mockGet.mockResolvedValue({ song: existingSong });
      renderEditSong();
      await waitFor(() => {
        expect(screen.getByDisplayValue("Amazing Grace")).toBeInTheDocument();
        expect(screen.getByDisplayValue("Newton")).toBeInTheDocument();
        expect(screen.getByDisplayValue("hymn")).toBeInTheDocument();
      });
    });

    it("renders Update Song button", async () => {
      mockGet.mockResolvedValue({ song: existingSong });
      renderEditSong();
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /update song/i })).toBeInTheDocument();
      });
    });
  });

  // ===================== NEGATIVE =====================

  describe("negative", () => {
    it("shows error when title is empty on create", async () => {
      const { toast } = await import("sonner");
      renderNewSong();
      const user = userEvent.setup();
      // Submit without filling title — HTML required validation may prevent,
      // but the component also checks title.trim()
      // Force by directly submitting with empty title (button should have required on input)
      const titleInput = screen.getByPlaceholderText("Song title");
      await user.clear(titleInput);
      // Type and clear to trigger state
      await user.type(titleInput, " ");
      await user.click(screen.getByRole("button", { name: /create song/i }));

      // The form has HTML required attribute, but if it submits with whitespace,
      // the component checks title.trim()
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Title is required");
      });
    });

    it("shows error toast on create failure", async () => {
      const { toast } = await import("sonner");
      mockCreate.mockRejectedValue(new Error("Validation failed"));
      renderNewSong();
      const user = userEvent.setup();
      await user.type(screen.getByPlaceholderText("Song title"), "Valid Title");
      await user.click(screen.getByRole("button", { name: /create song/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Validation failed");
      });
    });

    it("shows loading spinner when editing and loading data", () => {
      mockGet.mockReturnValue(new Promise(() => {}));
      renderEditSong();
      expect(document.querySelector(".animate-spin")).toBeInTheDocument();
    });

    it("disables save button while saving", async () => {
      mockCreate.mockReturnValue(new Promise(() => {}));
      renderNewSong();
      const user = userEvent.setup();
      await user.type(screen.getByPlaceholderText("Song title"), "Test");
      await user.click(screen.getByRole("button", { name: /create song/i }));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /saving/i })).toBeDisabled();
      });
    });
  });
});
