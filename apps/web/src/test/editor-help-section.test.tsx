import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EditorHelpSection } from "@/components/songs/EditorHelpSection";

describe("EditorHelpSection", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // ── Toggle open/close ──

  it("renders the toggle button", () => {
    render(<EditorHelpSection />);
    expect(screen.getByTestId("help-toggle")).toBeInTheDocument();
    expect(screen.getByText("Editor Help & Reference")).toBeInTheDocument();
  });

  it("is collapsed by default", () => {
    render(<EditorHelpSection />);
    expect(screen.queryByTestId("help-tabs")).not.toBeInTheDocument();
    expect(screen.queryByTestId("help-content")).not.toBeInTheDocument();
  });

  it("expands when toggle is clicked", async () => {
    const user = userEvent.setup();
    render(<EditorHelpSection />);
    await user.click(screen.getByTestId("help-toggle"));
    expect(screen.getByTestId("help-tabs")).toBeInTheDocument();
    expect(screen.getByTestId("help-content")).toBeInTheDocument();
  });

  it("collapses again on second click", async () => {
    const user = userEvent.setup();
    render(<EditorHelpSection />);
    await user.click(screen.getByTestId("help-toggle"));
    expect(screen.getByTestId("help-tabs")).toBeInTheDocument();
    await user.click(screen.getByTestId("help-toggle"));
    expect(screen.queryByTestId("help-tabs")).not.toBeInTheDocument();
  });

  // ── Tab switching ──

  it("shows 4 tabs when expanded", async () => {
    const user = userEvent.setup();
    render(<EditorHelpSection />);
    await user.click(screen.getByTestId("help-toggle"));
    expect(screen.getByTestId("help-tab-tips")).toBeInTheDocument();
    expect(screen.getByTestId("help-tab-shortcuts")).toBeInTheDocument();
    expect(screen.getByTestId("help-tab-directives")).toBeInTheDocument();
    expect(screen.getByTestId("help-tab-templates")).toBeInTheDocument();
  });

  it("defaults to Quick Tips tab", async () => {
    const user = userEvent.setup();
    render(<EditorHelpSection />);
    await user.click(screen.getByTestId("help-toggle"));
    // Quick tips tab should show tips content
    expect(screen.getByText(/Add chords/)).toBeInTheDocument();
  });

  it("switches to Shortcuts tab", async () => {
    const user = userEvent.setup();
    render(<EditorHelpSection />);
    await user.click(screen.getByTestId("help-toggle"));
    await user.click(screen.getByTestId("help-tab-shortcuts"));
    expect(screen.getByTestId("shortcuts-content")).toBeInTheDocument();
    expect(screen.getByText("Ctrl+S")).toBeInTheDocument();
    expect(screen.getByText("Save song")).toBeInTheDocument();
  });

  it("switches to Directives tab", async () => {
    const user = userEvent.setup();
    render(<EditorHelpSection />);
    await user.click(screen.getByTestId("help-toggle"));
    await user.click(screen.getByTestId("help-tab-directives"));
    expect(screen.getByTestId("directives-content")).toBeInTheDocument();
    expect(screen.getByText("{title: Amazing Grace}")).toBeInTheDocument();
  });

  it("switches to Templates tab", async () => {
    const user = userEvent.setup();
    render(<EditorHelpSection />);
    await user.click(screen.getByTestId("help-toggle"));
    await user.click(screen.getByTestId("help-tab-templates"));
    expect(screen.getByTestId("templates-content")).toBeInTheDocument();
    expect(screen.getByTestId("template-verse")).toBeInTheDocument();
    expect(screen.getByTestId("template-chorus")).toBeInTheDocument();
    expect(screen.getByTestId("template-bridge")).toBeInTheDocument();
  });

  // ── Template insert callback ──

  it("calls onInsertTemplate when a template is clicked", async () => {
    const onInsert = vi.fn();
    const user = userEvent.setup();
    render(<EditorHelpSection onInsertTemplate={onInsert} />);
    await user.click(screen.getByTestId("help-toggle"));
    await user.click(screen.getByTestId("help-tab-templates"));
    await user.click(screen.getByTestId("template-verse"));
    expect(onInsert).toHaveBeenCalledWith(expect.stringContaining("{comment: Verse 1}"));
  });

  it("calls onInsertTemplate with full skeleton for Song Skeleton", async () => {
    const onInsert = vi.fn();
    const user = userEvent.setup();
    render(<EditorHelpSection onInsertTemplate={onInsert} />);
    await user.click(screen.getByTestId("help-toggle"));
    await user.click(screen.getByTestId("help-tab-templates"));
    await user.click(screen.getByTestId("template-full-song-skeleton"));
    expect(onInsert).toHaveBeenCalledWith(expect.stringContaining("{title: Song Title}"));
    expect(onInsert).toHaveBeenCalledWith(expect.stringContaining("{comment: Verse 1}"));
    expect(onInsert).toHaveBeenCalledWith(expect.stringContaining("{comment: Chorus}"));
  });

  // ── localStorage persistence ──

  it("persists open state to localStorage", async () => {
    const user = userEvent.setup();
    render(<EditorHelpSection />);
    await user.click(screen.getByTestId("help-toggle"));
    expect(localStorage.getItem("chordpro-help-open")).toBe("true");
  });

  it("reads open state from localStorage on mount", () => {
    localStorage.setItem("chordpro-help-open", "true");
    render(<EditorHelpSection />);
    // Should be expanded immediately
    expect(screen.getByTestId("help-tabs")).toBeInTheDocument();
  });

  it("persists active tab to localStorage", async () => {
    const user = userEvent.setup();
    render(<EditorHelpSection />);
    await user.click(screen.getByTestId("help-toggle"));
    await user.click(screen.getByTestId("help-tab-shortcuts"));
    expect(localStorage.getItem("chordpro-help-tab")).toBe("shortcuts");
  });

  it("reads active tab from localStorage on mount", async () => {
    localStorage.setItem("chordpro-help-open", "true");
    localStorage.setItem("chordpro-help-tab", "directives");
    render(<EditorHelpSection />);
    expect(screen.getByTestId("directives-content")).toBeInTheDocument();
  });

  // ── Keyboard shortcuts reference ──

  it("lists all 8 keyboard shortcuts", async () => {
    const user = userEvent.setup();
    render(<EditorHelpSection />);
    await user.click(screen.getByTestId("help-toggle"));
    await user.click(screen.getByTestId("help-tab-shortcuts"));
    const expectedShortcuts = [
      "Ctrl+S",
      "Ctrl+/",
      "Ctrl+K",
      "Ctrl+Shift+V",
      "Ctrl+Shift+C",
      "Ctrl+Shift+B",
      "Alt+Up",
      "Alt+Down",
    ];
    for (const shortcut of expectedShortcuts) {
      expect(screen.getByText(shortcut)).toBeInTheDocument();
    }
  });
});
