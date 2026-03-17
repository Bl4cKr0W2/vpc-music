import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SyntaxHighlightOverlay } from "@/components/songs/SyntaxHighlightOverlay";

describe("SyntaxHighlightOverlay", () => {
  it("renders the overlay pre element", () => {
    render(<SyntaxHighlightOverlay value="test" />);
    expect(screen.getByTestId("syntax-overlay")).toBeInTheDocument();
  });

  it("has aria-hidden for accessibility", () => {
    render(<SyntaxHighlightOverlay value="test" />);
    expect(screen.getByTestId("syntax-overlay")).toHaveAttribute("aria-hidden", "true");
  });

  it("renders plain text as lyrics tokens", () => {
    render(<SyntaxHighlightOverlay value="Amazing grace" />);
    const overlay = screen.getByTestId("syntax-overlay");
    expect(overlay.textContent).toContain("Amazing grace");
  });

  it("renders chord tokens with chord class", () => {
    const { container } = render(<SyntaxHighlightOverlay value="[G]Amazing" />);
    // Find the chord span — chord tokens have font-bold
    const chordSpan = container.querySelector("span.font-bold");
    expect(chordSpan).not.toBeNull();
    expect(chordSpan?.textContent).toBe("[G]");
  });

  it("renders directive lines", () => {
    const { container } = render(<SyntaxHighlightOverlay value="{title: Test}" />);
    // Directive tokens have text-sky-400
    const dirSpan = container.querySelector(".text-sky-400");
    expect(dirSpan).not.toBeNull();
    expect(dirSpan?.textContent).toContain("{title: Test}");
  });

  it("renders section comments with bold italic", () => {
    const { container } = render(<SyntaxHighlightOverlay value="{comment: Verse 1}" />);
    const sectionSpan = container.querySelector(".italic");
    expect(sectionSpan).not.toBeNull();
    expect(sectionSpan?.textContent).toContain("{comment: Verse 1}");
  });

  it("renders multi-line content correctly", () => {
    const value = "{title: Test}\n[G]Amazing\nPlain text";
    render(<SyntaxHighlightOverlay value={value} />);
    const overlay = screen.getByTestId("syntax-overlay");
    expect(overlay.textContent).toContain("Test");
    expect(overlay.textContent).toContain("[G]");
    expect(overlay.textContent).toContain("Amazing");
    expect(overlay.textContent).toContain("Plain text");
  });

  it("renders empty content without errors", () => {
    render(<SyntaxHighlightOverlay value="" />);
    expect(screen.getByTestId("syntax-overlay")).toBeInTheDocument();
  });

  it("handles invalid syntax with red styling", () => {
    const { container } = render(<SyntaxHighlightOverlay value="[G unclosed" />);
    const invalidSpan = container.querySelector(".text-red-400");
    expect(invalidSpan).not.toBeNull();
  });

  it("accepts a forwarded ref", () => {
    const ref = { current: null as HTMLPreElement | null };
    render(<SyntaxHighlightOverlay value="test" ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLPreElement);
  });
});
