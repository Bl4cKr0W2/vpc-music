import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { SetlistsPage } from "@/pages/setlists/SetlistsPage";

// ---------- Mocks ----------
const mockList = vi.fn();
const mockCreate = vi.fn();
const mockDeleteSetlist = vi.fn();
const mockNavigate = vi.fn();

vi.mock("@/lib/api-client", () => ({
  setlistsApi: {
    list: (...args: any[]) => mockList(...args),
    create: (...args: any[]) => mockCreate(...args),
    delete: (...args: any[]) => mockDeleteSetlist(...args),
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

let mockAuthValue: any = {
  user: { id: "u1", email: "test@test.com", displayName: "Test", role: "owner" },
  activeOrg: { id: "org1", name: "Test Church", role: "admin" },
};
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockAuthValue,
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/setlists"]}>
      <SetlistsPage />
    </MemoryRouter>,
  );
}

describe("SetlistsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  // ===================== POSITIVE =====================

  describe("positive", () => {
    it("renders heading", async () => {
      mockList.mockResolvedValue({ setlists: [] });
      renderPage();
      expect(screen.getByText("Setlists")).toBeInTheDocument();
    });

    it("renders New Setlist button", async () => {
      mockList.mockResolvedValue({ setlists: [] });
      renderPage();
      expect(screen.getByRole("button", { name: /new setlist/i })).toBeInTheDocument();
    });

    it("renders setlist cards", async () => {
      mockList.mockResolvedValue({
        setlists: [
          { id: "s1", name: "Sunday Worship", songCount: 5, category: "Sunday" },
          { id: "s2", name: "Wednesday Night", songCount: 3, category: null },
        ],
      });
      renderPage();
      await waitFor(() => {
        expect(screen.getByText("Sunday Worship")).toBeInTheDocument();
        expect(screen.getByText("Wednesday Night")).toBeInTheDocument();
        expect(screen.getByText(/5 songs/)).toBeInTheDocument();
        expect(screen.getByText(/3 songs/)).toBeInTheDocument();
      });
    });

    it("shows category on setlist card", async () => {
      mockList.mockResolvedValue({
        setlists: [{ id: "s1", name: "Test", songCount: 0, category: "Special" }],
      });
      renderPage();
      await waitFor(() => {
        expect(screen.getByText("· Special")).toBeInTheDocument();
      });
    });

    it("opens create modal on New Setlist click", async () => {
      mockList.mockResolvedValue({ setlists: [] });
      renderPage();
      const user = userEvent.setup();
      // Click the first "New Setlist" button (header)
      const buttons = screen.getAllByRole("button", { name: /new setlist/i });
      await user.click(buttons[0]);
      expect(screen.getByText("New Setlist", { selector: "h3" })).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/sunday morning/i)).toBeInTheDocument();
    });

    it("creates setlist and navigates", async () => {
      mockList.mockResolvedValue({ setlists: [] });
      mockCreate.mockResolvedValue({ setlist: { id: "new-1" } });
      renderPage();
      const user = userEvent.setup();
      const buttons = screen.getAllByRole("button", { name: /new setlist|create setlist/i });
      await user.click(buttons[0]);

      await user.type(screen.getByPlaceholderText(/sunday morning/i), "Easter Service");
      await user.click(screen.getByRole("button", { name: /^create$/i }));

      await waitFor(() => {
        expect(mockCreate).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith("/setlists/new-1");
      });
    });
  });

  // ===================== NEGATIVE =====================

  describe("negative", () => {
    it("shows empty state when no setlists", async () => {
      mockList.mockResolvedValue({ setlists: [] });
      renderPage();
      await waitFor(() => {
        expect(screen.getByText(/no setlists yet/i)).toBeInTheDocument();
      });
    });

    it("shows loading state", () => {
      mockList.mockReturnValue(new Promise(() => {}));
      renderPage();
      expect(document.querySelector(".spinner")).toBeInTheDocument();
    });

    it("handles API error gracefully", async () => {
      mockList.mockRejectedValue(new Error("Server down"));
      renderPage();
      await waitFor(() => {
        expect(screen.getByText(/no setlists yet/i)).toBeInTheDocument();
      });
    });

    it("removes setlist from list on delete", async () => {
      mockList.mockResolvedValue({
        setlists: [{ id: "s1", name: "ToDelete", songCount: 0, category: null }],
      });
      mockDeleteSetlist.mockResolvedValue({ message: "ok" });
      renderPage();

      await waitFor(() => {
        expect(screen.getByText("ToDelete")).toBeInTheDocument();
      });

      // Find and click the delete button (it's hidden until hover, but still in DOM)
      const deleteBtn = screen.getByTitle("Delete");
      fireEvent.click(deleteBtn);

      await waitFor(() => {
        expect(mockDeleteSetlist).toHaveBeenCalledWith("s1");
        expect(screen.queryByText("ToDelete")).not.toBeInTheDocument();
      });
    });

    it("shows error toast on delete failure", async () => {
      const { toast } = await import("sonner");
      mockList.mockResolvedValue({
        setlists: [{ id: "s1", name: "Keep", songCount: 0, category: null }],
      });
      mockDeleteSetlist.mockRejectedValue(new Error("Forbidden"));
      renderPage();

      await waitFor(() => {
        expect(screen.getByText("Keep")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTitle("Delete"));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Forbidden");
      });
    });

    it("closes create modal on cancel", async () => {
      mockList.mockResolvedValue({ setlists: [] });
      renderPage();
      const user = userEvent.setup();
      const buttons = screen.getAllByRole("button", { name: /new setlist|create setlist/i });
      await user.click(buttons[0]);
      expect(screen.getByText("New Setlist", { selector: "h3" })).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: /cancel/i }));
      expect(screen.queryByText("New Setlist", { selector: "h3" })).not.toBeInTheDocument();
    });
  });
});
