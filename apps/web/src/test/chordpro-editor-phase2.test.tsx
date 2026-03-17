import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChordProEditor } from "@/components/songs/ChordProEditor";

// ---------- Mocks ----------
vi.mock("@vpc-music/shared", () => ({
  CHORD_REGEX: /^[A-G][b#]?(?:m|min|maj|dim|aug|sus[24]?|add)?[2-9]?(?:\/[A-G][b#]?)?$/,
  transposeChord: (chord: string, _steps: number) => `${chord}#`,
  parseChordPro: (content: string) => ({
    directives: { title: "Test" },
    sections: [{ name: "", lines: [{ chords: [], lyrics: content.slice(0, 50) }] }],
  }),
  transposeChordPro: (content: string) => content,
  chordToNashville: (chord: string) => chord,
}));

function renderEditor(
  props: Partial<React.ComponentProps<typeof ChordProEditor>> = {},
) {
  const defaultProps = {
    value: "{title: Test}\n{key: G}\n\n{comment: Verse 1}\n[G]Amazing grace\n\n{comment: Chorus}\n[C]How sweet",
    onChange: vi.fn(),
    ...props,
  };
  return { ...render(<ChordProEditor {...defaultProps} />), onChange: defaultProps.onChange };
}

describe("ChordProEditor — Phase 2 features", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  // ═══════ Split Preview ═══════

  describe("split preview", () => {
    it("renders view mode toggle buttons", () => {
      renderEditor();
      expect(screen.getByTestId("view-mode-toggle")).toBeInTheDocument();
      expect(screen.getByTestId("view-mode-edit")).toBeInTheDocument();
      expect(screen.getByTestId("view-mode-split")).toBeInTheDocument();
      expect(screen.getByTestId("view-mode-preview")).toBeInTheDocument();
    });

    it("defaults to edit mode — editor visible, preview hidden", () => {
      renderEditor();
      expect(screen.getByTestId("chordpro-editor")).toBeInTheDocument();
      expect(screen.queryByTestId("split-preview-pane")).not.toBeInTheDocument();
    });

    it("shows preview pane in split mode", async () => {
      renderEditor();
      const user = userEvent.setup();
      await user.click(screen.getByTestId("view-mode-split"));
      expect(screen.getByTestId("chordpro-editor")).toBeInTheDocument();
      expect(screen.getByTestId("split-preview-pane")).toBeInTheDocument();
    });

    it("hides editor in preview mode", async () => {
      renderEditor();
      const user = userEvent.setup();
      await user.click(screen.getByTestId("view-mode-preview"));
      expect(screen.queryByTestId("chordpro-editor")).not.toBeInTheDocument();
      expect(screen.getByTestId("split-preview-pane")).toBeInTheDocument();
    });

    it("shows empty state when no content in preview", async () => {
      renderEditor({ value: "" });
      const user = userEvent.setup();
      await user.click(screen.getByTestId("view-mode-preview"));
      expect(screen.getByText(/start typing in the editor/i)).toBeInTheDocument();
    });

    it("hides insert section button in preview mode", async () => {
      renderEditor();
      const user = userEvent.setup();
      await user.click(screen.getByTestId("view-mode-preview"));
      expect(screen.queryByTestId("section-insert-btn")).not.toBeInTheDocument();
    });

    it("hides hint text in preview mode", async () => {
      renderEditor();
      const user = userEvent.setup();
      await user.click(screen.getByTestId("view-mode-preview"));
      expect(screen.queryByText(/select any word and type a chord/i)).not.toBeInTheDocument();
    });

    it("restores editor when switching back to edit mode", async () => {
      renderEditor();
      const user = userEvent.setup();
      await user.click(screen.getByTestId("view-mode-preview"));
      expect(screen.queryByTestId("chordpro-editor")).not.toBeInTheDocument();
      await user.click(screen.getByTestId("view-mode-edit"));
      expect(screen.getByTestId("chordpro-editor")).toBeInTheDocument();
    });
  });

  // ═══════ Line Numbers ═══════

  describe("line numbers", () => {
    it("renders line number gutter", () => {
      renderEditor();
      expect(screen.getByTestId("line-number-gutter")).toBeInTheDocument();
    });

    it("shows correct number of lines", () => {
      const content = "Line 1\nLine 2\nLine 3";
      renderEditor({ value: content });
      const gutter = screen.getByTestId("line-number-gutter");
      // Should have 3 line numbers
      expect(gutter.textContent).toContain("1");
      expect(gutter.textContent).toContain("2");
      expect(gutter.textContent).toContain("3");
    });

    it("renders current line highlight", () => {
      renderEditor();
      expect(screen.getByTestId("current-line-highlight")).toBeInTheDocument();
    });
  });

  // ═══════ Section Navigation ═══════

  describe("section navigation", () => {
    it("renders section nav button when sections exist", () => {
      renderEditor();
      expect(screen.getByTestId("section-nav-btn")).toBeInTheDocument();
    });

    it("shows Go to Section text", () => {
      renderEditor();
      expect(screen.getByText("Go to Section")).toBeInTheDocument();
    });

    it("opens section navigation dropdown", async () => {
      renderEditor();
      const user = userEvent.setup();
      await user.click(screen.getByTestId("section-nav-btn"));
      expect(screen.getByTestId("section-nav-dropdown")).toBeInTheDocument();
    });

    it("lists detected sections", async () => {
      renderEditor();
      const user = userEvent.setup();
      await user.click(screen.getByTestId("section-nav-btn"));
      expect(screen.getByText("Verse 1")).toBeInTheDocument();
      expect(screen.getByText("Chorus")).toBeInTheDocument();
    });

    it("shows line numbers for sections", async () => {
      renderEditor();
      const user = userEvent.setup();
      await user.click(screen.getByTestId("section-nav-btn"));
      // Line numbers displayed as "Ln N"
      const lineLabels = screen.getAllByText(/Ln \d+/);
      expect(lineLabels.length).toBeGreaterThanOrEqual(2);
    });

    it("does not render nav button when no sections", () => {
      renderEditor({ value: "{title: Test}\nJust lyrics" });
      expect(screen.queryByTestId("section-nav-btn")).not.toBeInTheDocument();
    });
  });

  // ═══════ Format Button ═══════

  describe("format button", () => {
    it("renders format button", () => {
      renderEditor();
      expect(screen.getByTestId("format-btn")).toBeInTheDocument();
    });

    it("calls onChange with formatted content on click", async () => {
      const onChange = vi.fn();
      renderEditor({ value: "{ title :  Test }\n{ key : G}\n\n\n\n{comment: Verse}\n", onChange });
      const user = userEvent.setup();
      await user.click(screen.getByTestId("format-btn"));
      expect(onChange).toHaveBeenCalled();
      const formatted = onChange.mock.calls[0][0] as string;
      expect(formatted).toContain("{title: Test}");
      expect(formatted).toContain("{key: G}");
    });

    it("renders format on save checkbox", () => {
      renderEditor();
      expect(screen.getByTestId("format-on-save-checkbox")).toBeInTheDocument();
    });

    it("toggles format on save", async () => {
      renderEditor();
      const user = userEvent.setup();
      const checkbox = screen.getByTestId("format-on-save-checkbox") as HTMLInputElement;
      expect(checkbox.checked).toBe(false);
      await user.click(checkbox);
      expect(checkbox.checked).toBe(true);
    });

    it("hides format button in preview mode", async () => {
      renderEditor();
      const user = userEvent.setup();
      await user.click(screen.getByTestId("view-mode-preview"));
      expect(screen.queryByTestId("format-btn")).not.toBeInTheDocument();
    });
  });

  // ═══════ Command Palette Trigger ═══════

  describe("command palette trigger", () => {
    it("renders hint about Ctrl+Space", () => {
      renderEditor();
      expect(screen.getByText(/ctrl\+space/i)).toBeInTheDocument();
    });

    it("renders hint about slash commands", () => {
      renderEditor();
      expect(screen.getByText(/slash commands/i)).toBeInTheDocument();
    });
  });
});
