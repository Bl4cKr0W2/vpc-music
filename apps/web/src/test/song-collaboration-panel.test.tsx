import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SongCollaborationPanel } from "@/components/songs/SongCollaborationPanel";

const mockList = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();

vi.mock("@/lib/api-client", () => ({
  songCollaborationApi: {
    list: (...args: any[]) => mockList(...args),
    create: (...args: any[]) => mockCreate(...args),
    update: (...args: any[]) => mockUpdate(...args),
    delete: (...args: any[]) => mockDelete(...args),
  },
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe("SongCollaborationPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders markers, notes, and comment threads", async () => {
    mockList.mockResolvedValue({
      items: [
        {
          id: "marker-1",
          songId: "song-1",
          type: "rehearsal_marker",
          anchor: "Chorus",
          title: "Cutoff",
          content: "Watch the ending.",
          authorName: "Taylor",
          createdAt: "2026-03-16T10:00:00Z",
        },
        {
          id: "note-1",
          songId: "song-1",
          type: "rehearsal_note",
          anchor: "Verse 1",
          title: "Piano",
          content: "Piano starts alone.",
          authorName: "Jordan",
          createdAt: "2026-03-16T10:05:00Z",
        },
        {
          id: "comment-1",
          songId: "song-1",
          type: "comment",
          anchor: "Bridge",
          content: "Let’s extend the bridge.",
          authorName: "Taylor",
          status: "open",
          createdAt: "2026-03-16T10:10:00Z",
        },
        {
          id: "reply-1",
          songId: "song-1",
          type: "comment",
          parentId: "comment-1",
          anchor: "Bridge",
          content: "Agreed — one extra pass.",
          authorName: "Jordan",
          status: "open",
          createdAt: "2026-03-16T10:11:00Z",
        },
      ],
    });

    render(
      <SongCollaborationPanel
        songId="song-1"
        sourceContent={"{title: Song}\n\n{comment: Verse 1}\n[C]Line\n\n{comment: Chorus}\n[G]Sing"}
        canEdit
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Cutoff")).toBeInTheDocument();
      expect(screen.getByText("Piano starts alone.")).toBeInTheDocument();
      expect(screen.getByText("Let’s extend the bridge.")).toBeInTheDocument();
      expect(screen.getByText("Agreed — one extra pass.")).toBeInTheDocument();
    });
  });

  it("creates a rehearsal marker anchored to a section", async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue({ items: [] });
    mockCreate.mockResolvedValue({
      item: {
        id: "marker-1",
        songId: "song-1",
        type: "rehearsal_marker",
        anchor: "Chorus",
        title: "Dynamics",
        content: "Keep it soft the first time.",
      },
    });

    render(
      <SongCollaborationPanel
        songId="song-1"
        sourceContent={"{title: Song}\n\n{comment: Verse 1}\n[C]Line\n\n{comment: Chorus}\n[G]Sing"}
        canEdit
      />,
    );

    await user.click(await screen.findByRole("button", { name: /mark section/i }));
    await user.selectOptions(screen.getByRole("combobox"), "Chorus");
    await user.type(screen.getByPlaceholderText(/cutoff, transition, cue/i), "Dynamics");
    await user.type(screen.getByPlaceholderText(/capture what the team should remember/i), "Keep it soft the first time.");
    await user.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith("song-1", {
        type: "rehearsal_marker",
        anchor: "Chorus",
        title: "Dynamics",
        content: "Keep it soft the first time.",
        parentId: undefined,
      });
    });
  });

  it("resolves a comment thread", async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue({
      items: [
        {
          id: "comment-1",
          songId: "song-1",
          type: "comment",
          anchor: "Bridge",
          content: "Let’s extend the bridge.",
          authorName: "Taylor",
          status: "open",
        },
      ],
    });
    mockUpdate.mockResolvedValue({
      item: {
        id: "comment-1",
        songId: "song-1",
        type: "comment",
        anchor: "Bridge",
        content: "Let’s extend the bridge.",
        authorName: "Taylor",
        status: "resolved",
      },
    });

    render(
      <SongCollaborationPanel
        songId="song-1"
        sourceContent={"{title: Song}\n\n{comment: Bridge}\n[C]Line"}
        canEdit
      />,
    );

    await user.click(await screen.findByTitle(/resolve thread/i));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith("song-1", "comment-1", { status: "resolved" });
      expect(screen.getByText("Resolved")).toBeInTheDocument();
    });
  });
});