import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { ShareManageDialog } from "@/components/songs/ShareManageDialog";
import type { ShareToken } from "@/lib/api-client";

// ---------- API mocks ----------
const mockList = vi.fn();
const mockCreate = vi.fn();
const mockRevoke = vi.fn();
const mockUpdate = vi.fn();

vi.mock("@/lib/api-client", () => ({
  shareApi: {
    list: (...args: any[]) => mockList(...args),
    create: (...args: any[]) => mockCreate(...args),
    revoke: (...args: any[]) => mockRevoke(...args),
    update: (...args: any[]) => mockUpdate(...args),
  },
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// ---------- Helpers ----------
const SONG_ID = "song-1";

const activeToken: ShareToken = {
  id: "t1",
  token: "abc123",
  songId: SONG_ID,
  label: "For band",
  expiresAt: new Date(Date.now() + 86400000 * 30).toISOString(),
  revoked: false,
  createdAt: "2025-01-15T00:00:00Z",
};

const revokedToken: ShareToken = {
  id: "t2",
  token: "def456",
  songId: SONG_ID,
  label: "Old link",
  expiresAt: null,
  revoked: true,
  createdAt: "2025-01-10T00:00:00Z",
};

const expiredToken: ShareToken = {
  id: "t3",
  token: "ghi789",
  songId: SONG_ID,
  label: "Expired link",
  expiresAt: "2024-01-01T00:00:00Z",
  revoked: false,
  createdAt: "2024-01-01T00:00:00Z",
};

const unlabeledToken: ShareToken = {
  id: "t4",
  token: "jkl012",
  songId: SONG_ID,
  label: null,
  expiresAt: null,
  revoked: false,
  createdAt: "2025-06-01T00:00:00Z",
};

function renderDialog(open = true) {
  const onClose = vi.fn();
  const result = render(
    <ShareManageDialog songId={SONG_ID} open={open} onClose={onClose} />,
  );
  return { ...result, onClose };
}

describe("ShareManageDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue({ shares: [] });
    mockCreate.mockResolvedValue({ shareToken: activeToken, shareUrl: "/shared/abc123" });
    mockUpdate.mockResolvedValue({ shareToken: { ...activeToken, label: "Updated" } });
    mockRevoke.mockResolvedValue({ message: "ok" });
  });

  // ===================== RENDERING =====================

  describe("rendering", () => {
    it("renders nothing when closed", () => {
      renderDialog(false);
      expect(screen.queryByText("Manage Share Links")).not.toBeInTheDocument();
    });

    it("renders dialog when open", async () => {
      renderDialog();
      expect(screen.getByText("Manage Share Links")).toBeInTheDocument();
    });

    it("renders create-new-link section", async () => {
      renderDialog();
      expect(screen.getByText("Create New Link")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Label (optional)")).toBeInTheDocument();
      expect(screen.getByText("Create")).toBeInTheDocument();
    });

    it("renders expiry dropdown options", async () => {
      renderDialog();
      const select = screen.getByDisplayValue("No expiry");
      expect(select).toBeInTheDocument();
      expect(select.querySelectorAll("option").length).toBe(5);
    });

    it("renders Done button in footer", () => {
      renderDialog();
      expect(screen.getByText("Done")).toBeInTheDocument();
    });

    it("shows empty state when no tokens exist", async () => {
      renderDialog();
      await waitFor(() => {
        expect(screen.getByText("No share links yet. Create one above.")).toBeInTheDocument();
      });
    });

    it("renders active tokens with correct status", async () => {
      mockList.mockResolvedValue({ shares: [activeToken] });
      renderDialog();
      await waitFor(() => {
        expect(screen.getByText("For band")).toBeInTheDocument();
        expect(screen.getByText("Active")).toBeInTheDocument();
      });
    });

    it("renders revoked tokens with correct status", async () => {
      mockList.mockResolvedValue({ shares: [revokedToken] });
      renderDialog();
      await waitFor(() => {
        expect(screen.getByText("Old link")).toBeInTheDocument();
        expect(screen.getByText("Revoked")).toBeInTheDocument();
      });
    });

    it("renders expired tokens with correct status", async () => {
      mockList.mockResolvedValue({ shares: [expiredToken] });
      renderDialog();
      await waitFor(() => {
        expect(screen.getByText("Expired link")).toBeInTheDocument();
        expect(screen.getByText("Expired")).toBeInTheDocument();
      });
    });

    it("renders unlabeled tokens as Untitled link", async () => {
      mockList.mockResolvedValue({ shares: [unlabeledToken] });
      renderDialog();
      await waitFor(() => {
        expect(screen.getByText("Untitled link")).toBeInTheDocument();
      });
    });

    it("separates active and revoked sections with headings", async () => {
      mockList.mockResolvedValue({ shares: [activeToken, revokedToken] });
      renderDialog();
      await waitFor(() => {
        expect(screen.getByText(/Active \(1\)/)).toBeInTheDocument();
        expect(screen.getByText(/Revoked \(1\)/)).toBeInTheDocument();
      });
    });

    it("shows Copy, Open, and Revoke actions only on active non-expired tokens", async () => {
      mockList.mockResolvedValue({ shares: [activeToken] });
      renderDialog();
      await waitFor(() => {
        expect(screen.getByText("Copy")).toBeInTheDocument();
        expect(screen.getByText("Open")).toBeInTheDocument();
        expect(screen.getByText("Revoke")).toBeInTheDocument();
      });
    });

    it("hides action buttons on revoked tokens", async () => {
      mockList.mockResolvedValue({ shares: [revokedToken] });
      renderDialog();
      await waitFor(() => {
        expect(screen.getByText("Old link")).toBeInTheDocument();
      });
      expect(screen.queryByText("Copy")).not.toBeInTheDocument();
      expect(screen.queryByText("Revoke")).not.toBeInTheDocument();
    });

    it("hides action buttons on expired tokens", async () => {
      mockList.mockResolvedValue({ shares: [expiredToken] });
      renderDialog();
      await waitFor(() => {
        expect(screen.getByText("Expired link")).toBeInTheDocument();
      });
      expect(screen.queryByText("Copy")).not.toBeInTheDocument();
      expect(screen.queryByText("Revoke")).not.toBeInTheDocument();
    });
  });

  // ===================== INTERACTIONS =====================

  describe("interactions", () => {
    it("loads shares on open", async () => {
      renderDialog();
      await waitFor(() => {
        expect(mockList).toHaveBeenCalledWith(SONG_ID);
      });
    });

    it("calls onClose when X button clicked", async () => {
      const { onClose } = renderDialog();
      // X button is the first button (close icon)
      const closeButton = screen.getByRole("button", { name: "" });
      fireEvent.click(closeButton);
      expect(onClose).toHaveBeenCalled();
    });

    it("calls onClose when Done button clicked", () => {
      const { onClose } = renderDialog();
      fireEvent.click(screen.getByText("Done"));
      expect(onClose).toHaveBeenCalled();
    });

    it("creates a new share link with label and expiry", async () => {
      renderDialog();
      await waitFor(() => {
        expect(mockList).toHaveBeenCalled();
      });

      fireEvent.change(screen.getByPlaceholderText("Label (optional)"), {
        target: { value: "Sunday rehearsal" },
      });
      fireEvent.change(screen.getByDisplayValue("No expiry"), {
        target: { value: "7" },
      });
      fireEvent.click(screen.getByText("Create"));

      await waitFor(() => {
        expect(mockCreate).toHaveBeenCalledWith(SONG_ID, {
          label: "Sunday rehearsal",
          expiresInDays: 7,
        });
      });
    });

    it("creates a share link without label or expiry", async () => {
      renderDialog();
      await waitFor(() => {
        expect(mockList).toHaveBeenCalled();
      });

      fireEvent.click(screen.getByText("Create"));

      await waitFor(() => {
        expect(mockCreate).toHaveBeenCalledWith(SONG_ID, {});
      });
    });

    it("reloads shares after creation", async () => {
      renderDialog();
      await waitFor(() => {
        expect(mockList).toHaveBeenCalledTimes(1);
      });

      fireEvent.click(screen.getByText("Create"));

      await waitFor(() => {
        expect(mockList).toHaveBeenCalledTimes(2);
      });
    });

    it("copies share link to clipboard", async () => {
      mockList.mockResolvedValue({ shares: [activeToken] });
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, { clipboard: { writeText } });

      renderDialog();
      await waitFor(() => {
        expect(screen.getByText("Copy")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Copy"));

      await waitFor(() => {
        expect(writeText).toHaveBeenCalledWith(
          expect.stringContaining("/shared/abc123"),
        );
      });
    });

    it("shows Copied text after copying", async () => {
      mockList.mockResolvedValue({ shares: [activeToken] });
      Object.assign(navigator, {
        clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
      });

      renderDialog();
      await waitFor(() => {
        expect(screen.getByText("Copy")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Copy"));

      await waitFor(() => {
        expect(screen.getByText("Copied")).toBeInTheDocument();
      });
    });

    it("revokes a share link after confirm", async () => {
      mockList.mockResolvedValue({ shares: [activeToken] });
      vi.spyOn(window, "confirm").mockReturnValue(true);

      renderDialog();
      await waitFor(() => {
        expect(screen.getByText("Revoke")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Revoke"));

      await waitFor(() => {
        expect(mockRevoke).toHaveBeenCalledWith(SONG_ID, "t1");
      });
    });

    it("does not revoke when confirm is cancelled", async () => {
      mockList.mockResolvedValue({ shares: [activeToken] });
      vi.spyOn(window, "confirm").mockReturnValue(false);

      renderDialog();
      await waitFor(() => {
        expect(screen.getByText("Revoke")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Revoke"));

      expect(mockRevoke).not.toHaveBeenCalled();
    });

    it("opens inline edit mode on label click", async () => {
      mockList.mockResolvedValue({ shares: [activeToken] });

      renderDialog();
      await waitFor(() => {
        expect(screen.getByText("For band")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("For band"));

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Enter label...")).toBeInTheDocument();
        expect(screen.getByText("Save")).toBeInTheDocument();
        expect(screen.getByText("Cancel")).toBeInTheDocument();
      });
    });

    it("saves label on Save click", async () => {
      mockList.mockResolvedValue({ shares: [activeToken] });

      renderDialog();
      await waitFor(() => {
        expect(screen.getByText("For band")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("For band"));

      const labelInput = screen.getByPlaceholderText("Enter label...");
      fireEvent.change(labelInput, { target: { value: "Updated name" } });
      fireEvent.click(screen.getByText("Save"));

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith(SONG_ID, "t1", {
          label: "Updated name",
        });
      });
    });

    it("saves label on Enter keypress", async () => {
      mockList.mockResolvedValue({ shares: [activeToken] });

      renderDialog();
      await waitFor(() => {
        expect(screen.getByText("For band")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("For band"));

      const labelInput = screen.getByPlaceholderText("Enter label...");
      fireEvent.change(labelInput, { target: { value: "New label" } });
      fireEvent.keyDown(labelInput, { key: "Enter" });

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith(SONG_ID, "t1", {
          label: "New label",
        });
      });
    });

    it("cancels edit on Cancel click", async () => {
      mockList.mockResolvedValue({ shares: [activeToken] });

      renderDialog();
      await waitFor(() => {
        expect(screen.getByText("For band")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("For band"));
      expect(screen.getByPlaceholderText("Enter label...")).toBeInTheDocument();

      fireEvent.click(screen.getByText("Cancel"));

      await waitFor(() => {
        expect(screen.queryByPlaceholderText("Enter label...")).not.toBeInTheDocument();
        expect(screen.getByText("For band")).toBeInTheDocument();
      });
    });

    it("cancels edit on Escape keypress", async () => {
      mockList.mockResolvedValue({ shares: [activeToken] });

      renderDialog();
      await waitFor(() => {
        expect(screen.getByText("For band")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("For band"));

      const labelInput = screen.getByPlaceholderText("Enter label...");
      fireEvent.keyDown(labelInput, { key: "Escape" });

      await waitFor(() => {
        expect(screen.queryByPlaceholderText("Enter label...")).not.toBeInTheDocument();
      });
    });

    it("shows error toast on create failure", async () => {
      mockCreate.mockRejectedValue(new Error("Server error"));
      const { toast } = await import("sonner");

      renderDialog();
      await waitFor(() => {
        expect(mockList).toHaveBeenCalled();
      });

      fireEvent.click(screen.getByText("Create"));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Server error");
      });
    });

    it("shows error toast on list failure", async () => {
      mockList.mockRejectedValue(new Error("Network error"));
      const { toast } = await import("sonner");

      renderDialog();

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to load share links");
      });
    });
  });

  // ===================== SOURCE-LEVEL =====================

  describe("source-level checks", () => {
    it("PATCH route exists in share routes", async () => {
      const fs = await import("fs");
      const src = fs.readFileSync("../api/src/features/share/routes.js", "utf-8");
      expect(src).toContain("shareRoutes.patch(");
      expect(src).toContain("/api/songs/:id/shares/:tokenId");
    });

    it("shareApi.update method exists in api-client", async () => {
      const fs = await import("fs");
      const src = fs.readFileSync("src/lib/api-client.ts", "utf-8");
      expect(src).toContain("update:");
      expect(src).toContain("method: \"PATCH\"");
    });

    it("ShareManageDialog is wired into SongViewPage", async () => {
      const fs = await import("fs");
      const src = fs.readFileSync("src/pages/songs/SongViewPage.tsx", "utf-8");
      expect(src).toContain("ShareManageDialog");
      expect(src).toContain("showShareManage");
    });
  });
});
