import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { SharedSongPage } from "@/pages/SharedSongPage";

// ---------- Mocks ----------
const mockGetShared = vi.fn();

vi.mock("@/lib/api-client", () => ({
  shareApi: {
    getShared: (...args: any[]) => mockGetShared(...args),
  },
}));

vi.mock("@/components/songs/ChordProRenderer", () => ({
  ChordProRenderer: ({ content, showChords, nashville, fontSize }: any) => (
    <div data-testid="chordpro-renderer" data-show-chords={showChords} data-nashville={nashville} data-font-size={fontSize}>
      {content}
    </div>
  ),
  AutoScroll: () => <button>Auto Scroll</button>,
}));

vi.mock("@/components/ui/ThemeToggleButton", () => ({
  ThemeToggleButton: () => <button data-testid="theme-toggle">Theme</button>,
}));

function renderShared(token = "valid-token") {
  return render(
    <MemoryRouter initialEntries={[`/shared/${token}`]}>
      <Routes>
        <Route path="/shared/:token" element={<SharedSongPage />} />
        <Route path="/" element={<div>Home</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

const mockSong = {
  id: "song-1",
  title: "Amazing Grace",
  key: "G",
  tempo: 72,
  artist: "John Newton",
  content: "{title: Amazing Grace}\n[G]Amazing grace how sweet the sound",
};

describe("SharedSongPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading spinner initially", () => {
    mockGetShared.mockReturnValue(new Promise(() => {})); // never resolves
    const { container } = renderShared();
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("renders song details after loading", async () => {
    mockGetShared.mockResolvedValue({ song: mockSong, shared: true });
    renderShared();

    await waitFor(() => {
      expect(screen.getByText("Amazing Grace")).toBeInTheDocument();
    });
    expect(screen.getByText("John Newton")).toBeInTheDocument();
    expect(screen.getByText("Key: G")).toBeInTheDocument();
    expect(screen.getByText("72 BPM")).toBeInTheDocument();
  });

  it("renders ChordPro content", async () => {
    mockGetShared.mockResolvedValue({ song: mockSong, shared: true });
    renderShared();

    await waitFor(() => {
      expect(screen.getByTestId("chordpro-renderer")).toBeInTheDocument();
    });
  });

  it("shows error state when share link is invalid", async () => {
    mockGetShared.mockRejectedValue(new Error("Token expired"));
    renderShared("bad-token");

    await waitFor(() => {
      expect(screen.getByText("Link Unavailable")).toBeInTheDocument();
    });
    expect(screen.getByText("Token expired")).toBeInTheDocument();
  });

  it("shows default error text when no error message", async () => {
    mockGetShared.mockRejectedValue(new Error());
    renderShared("bad-token");

    await waitFor(() => {
      expect(screen.getByText("Link Unavailable")).toBeInTheDocument();
    });
  });

  it("has a link back to VPC Music from error state", async () => {
    mockGetShared.mockRejectedValue(new Error("Invalid"));
    renderShared("bad-token");

    await waitFor(() => {
      expect(screen.getByText("Go to VPC Music")).toBeInTheDocument();
    });
    expect(screen.getByText("Go to VPC Music").closest("a")).toHaveAttribute("href", "/");
  });

  it("toggles chord visibility", async () => {
    mockGetShared.mockResolvedValue({ song: mockSong, shared: true });
    renderShared();

    await waitFor(() => {
      expect(screen.getByText("Amazing Grace")).toBeInTheDocument();
    });

    // Chords button should exist
    const chordsBtn = screen.getByTitle("Hide chords");
    expect(chordsBtn).toBeInTheDocument();

    fireEvent.click(chordsBtn);

    // After toggle, should now say "Show chords"
    expect(screen.getByTitle("Show chords")).toBeInTheDocument();
  });

  it("shows Nashville toggle when chords are visible and song has key", async () => {
    mockGetShared.mockResolvedValue({ song: mockSong, shared: true });
    renderShared();

    await waitFor(() => {
      expect(screen.getByText("Amazing Grace")).toBeInTheDocument();
    });

    expect(screen.getByText("Nashville")).toBeInTheDocument();
  });

  it("hides Nashville toggle when chords are hidden", async () => {
    mockGetShared.mockResolvedValue({ song: mockSong, shared: true });
    renderShared();

    await waitFor(() => {
      expect(screen.getByText("Amazing Grace")).toBeInTheDocument();
    });

    // Hide chords
    fireEvent.click(screen.getByTitle("Hide chords"));

    expect(screen.queryByText("Nashville")).not.toBeInTheDocument();
  });

  it("has a font size selector", async () => {
    mockGetShared.mockResolvedValue({ song: mockSong, shared: true });
    renderShared();

    await waitFor(() => {
      expect(screen.getByText("Amazing Grace")).toBeInTheDocument();
    });

    const fontSelect = screen.getByTitle("Font size");
    expect(fontSelect).toBeInTheDocument();
    expect(fontSelect).toHaveValue("16");
  });

  it("has a print button", async () => {
    mockGetShared.mockResolvedValue({ song: mockSong, shared: true });
    renderShared();

    await waitFor(() => {
      expect(screen.getByText("Amazing Grace")).toBeInTheDocument();
    });

    expect(screen.getByTitle("Print chord chart")).toBeInTheDocument();
  });

  it("displays the 'Shared Song' label in header", async () => {
    mockGetShared.mockResolvedValue({ song: mockSong, shared: true });
    renderShared();

    await waitFor(() => {
      expect(screen.getByText("Shared Song")).toBeInTheDocument();
    });
  });

  it("renders theme toggle button", async () => {
    mockGetShared.mockResolvedValue({ song: mockSong, shared: true });
    renderShared();

    await waitFor(() => {
      expect(screen.getByTestId("theme-toggle")).toBeInTheDocument();
    });
  });

  it("calls shareApi.getShared with the token from URL", async () => {
    mockGetShared.mockResolvedValue({ song: mockSong, shared: true });
    renderShared("my-special-token");

    await waitFor(() => {
      expect(mockGetShared).toHaveBeenCalledWith("my-special-token");
    });
  });

  it("has a 'Powered by VPC Music' footer link", async () => {
    mockGetShared.mockResolvedValue({ song: mockSong, shared: true });
    renderShared();

    await waitFor(() => {
      expect(screen.getByText(/Powered by/)).toBeInTheDocument();
    });

    const vpcLink = screen.getByText("VPC Music");
    expect(vpcLink.closest("a")).toHaveAttribute("href", "/");
  });
});
