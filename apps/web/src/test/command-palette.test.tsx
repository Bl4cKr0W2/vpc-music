import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CommandPalette, ALL_COMMANDS, getRecentCommandIds, addRecentCommandId, type CommandItem } from "@/components/songs/CommandPalette";

// ---- Mocks ----
const mockOnClose = vi.fn();
const mockOnSelect = vi.fn();

function renderPalette(props: Partial<React.ComponentProps<typeof CommandPalette>> = {}) {
  return render(
    <CommandPalette
      open={true}
      onClose={mockOnClose}
      onSelect={mockOnSelect}
      initialQuery=""
      {...props}
    />,
  );
}

describe("CommandPalette", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  // ── Rendering ──

  describe("rendering", () => {
    it("renders the command palette when open", () => {
      renderPalette();
      expect(screen.getByTestId("command-palette")).toBeInTheDocument();
    });

    it("does not render when closed", () => {
      renderPalette({ open: false });
      expect(screen.queryByTestId("command-palette")).not.toBeInTheDocument();
    });

    it("renders the search input", () => {
      renderPalette();
      expect(screen.getByTestId("command-palette-input")).toBeInTheDocument();
    });

    it("renders the results list", () => {
      renderPalette();
      expect(screen.getByTestId("command-palette-results")).toBeInTheDocument();
    });

    it("shows all commands when query is empty", () => {
      renderPalette();
      const total = ALL_COMMANDS.length;
      // All command items should be rendered
      for (const cmd of ALL_COMMANDS) {
        expect(screen.getByTestId(`command-item-${cmd.id}`)).toBeInTheDocument();
      }
      expect(total).toBeGreaterThan(0);
    });

    it("shows category headings", () => {
      renderPalette();
      expect(screen.getByText("Sections")).toBeInTheDocument();
      expect(screen.getByText("Directives")).toBeInTheDocument();
      expect(screen.getByText("Templates")).toBeInTheDocument();
    });

    it("shows navigation hints in footer", () => {
      renderPalette();
      expect(screen.getByText("↑↓ Navigate")).toBeInTheDocument();
      expect(screen.getByText("↵ Insert")).toBeInTheDocument();
      expect(screen.getByText("Esc Close")).toBeInTheDocument();
    });
  });

  // ── Filtering ──

  describe("filtering", () => {
    it("filters commands by label", async () => {
      renderPalette();
      const user = userEvent.setup();
      const input = screen.getByTestId("command-palette-input");
      await user.type(input, "chorus");

      expect(screen.getByTestId("command-item-sec-chorus")).toBeInTheDocument();
      // Verse should be filtered out
      expect(screen.queryByTestId("command-item-sec-verse-1")).not.toBeInTheDocument();
    });

    it("filters by category name", async () => {
      renderPalette();
      const user = userEvent.setup();
      const input = screen.getByTestId("command-palette-input");
      await user.type(input, "template");

      // Template items should be visible
      expect(screen.getByTestId("command-item-tpl-metadata")).toBeInTheDocument();
      expect(screen.getByTestId("command-item-tpl-skeleton")).toBeInTheDocument();
    });

    it("filters by description", async () => {
      renderPalette();
      const user = userEvent.setup();
      const input = screen.getByTestId("command-palette-input");
      await user.type(input, "BPM");

      expect(screen.getByTestId("command-item-dir-tempo")).toBeInTheDocument();
    });

    it("shows no matching message for invalid query", async () => {
      renderPalette();
      const user = userEvent.setup();
      const input = screen.getByTestId("command-palette-input");
      await user.type(input, "xyznonexistent");

      expect(screen.getByText("No matching commands")).toBeInTheDocument();
    });

    it("applies initialQuery on open", () => {
      renderPalette({ initialQuery: "bridge" });
      expect(screen.getByTestId("command-item-sec-bridge")).toBeInTheDocument();
    });
  });

  // ── Selection ──

  describe("selection", () => {
    it("calls onSelect when clicking a command", async () => {
      renderPalette();
      const user = userEvent.setup();
      await user.click(screen.getByTestId("command-item-sec-chorus"));
      expect(mockOnSelect).toHaveBeenCalledWith(
        expect.objectContaining({ id: "sec-chorus", value: "{comment: Chorus}" }),
      );
    });

    it("calls onClose after selection", async () => {
      renderPalette();
      const user = userEvent.setup();
      await user.click(screen.getByTestId("command-item-sec-chorus"));
      expect(mockOnClose).toHaveBeenCalled();
    });

    it("selects item on Enter key", async () => {
      renderPalette();
      const user = userEvent.setup();
      const input = screen.getByTestId("command-palette-input");
      input.focus();
      await user.keyboard("{Enter}");
      // Should select the first item
      expect(mockOnSelect).toHaveBeenCalledWith(
        expect.objectContaining({ id: ALL_COMMANDS[0].id }),
      );
    });

    it("navigates with Arrow keys", async () => {
      renderPalette();
      const user = userEvent.setup();
      const input = screen.getByTestId("command-palette-input");
      await user.click(input);
      await user.keyboard("{ArrowDown}");
      await user.keyboard("{Enter}");
      // Should select the second item (index 1)
      expect(mockOnSelect).toHaveBeenCalled();
    });

    it("closes on Escape", async () => {
      renderPalette();
      const user = userEvent.setup();
      const input = screen.getByTestId("command-palette-input");
      await user.click(input);
      await user.keyboard("{Escape}");
      expect(mockOnClose).toHaveBeenCalled();
    });

    it("closes when clicking backdrop", async () => {
      renderPalette();
      const user = userEvent.setup();
      const backdrop = screen.getByTestId("command-palette-backdrop");
      await user.click(backdrop);
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  // ── Recent Commands ──

  describe("recent commands", () => {
    it("getRecentCommandIds returns empty array by default", () => {
      expect(getRecentCommandIds()).toEqual([]);
    });

    it("addRecentCommandId stores and retrieves command IDs", () => {
      addRecentCommandId("sec-chorus");
      expect(getRecentCommandIds()).toEqual(["sec-chorus"]);
    });

    it("limits recent to max 5", () => {
      for (let i = 0; i < 10; i++) {
        addRecentCommandId(`cmd-${i}`);
      }
      expect(getRecentCommandIds()).toHaveLength(5);
    });

    it("moves re-used command to front", () => {
      addRecentCommandId("a");
      addRecentCommandId("b");
      addRecentCommandId("a");
      expect(getRecentCommandIds()[0]).toBe("a");
    });

    it("shows Recent section when recents exist", async () => {
      addRecentCommandId("sec-chorus");
      renderPalette();
      expect(screen.getByText("Recent")).toBeInTheDocument();
    });

    it("stores command on selection", async () => {
      renderPalette();
      const user = userEvent.setup();
      await user.click(screen.getByTestId("command-item-sec-bridge"));
      expect(getRecentCommandIds()).toContain("sec-bridge");
    });
  });

  // ── Command Registry ──

  describe("command registry", () => {
    it("has section commands", () => {
      const sections = ALL_COMMANDS.filter((c) => c.category === "Section");
      expect(sections.length).toBe(17);
    });

    it("has directive commands", () => {
      const directives = ALL_COMMANDS.filter((c) => c.category === "Directive");
      expect(directives.length).toBeGreaterThanOrEqual(10);
    });

    it("has template commands", () => {
      const templates = ALL_COMMANDS.filter((c) => c.category === "Template");
      expect(templates.length).toBeGreaterThanOrEqual(3);
    });

    it("all commands have required fields", () => {
      for (const cmd of ALL_COMMANDS) {
        expect(cmd.id).toBeTruthy();
        expect(cmd.label).toBeTruthy();
        expect(cmd.category).toBeTruthy();
        expect(cmd.value).toBeTruthy();
      }
    });

    it("all command IDs are unique", () => {
      const ids = ALL_COMMANDS.map((c) => c.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });
});
