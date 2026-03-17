import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ChordProRichEditorSurface, type ChordProRichEditorHandle } from "@/components/songs/ChordProRichEditorSurface";

if (!Range.prototype.getClientRects) {
  Range.prototype.getClientRects = () => ({
    length: 0,
    item: () => null,
    [Symbol.iterator]: function* iterator() {},
  }) as DOMRectList;
}

if (!Range.prototype.getBoundingClientRect) {
  Range.prototype.getBoundingClientRect = () => new DOMRect(0, 0, 0, 0);
}

describe("ChordProRichEditorSurface", () => {
  it("renders a CodeMirror editor with the provided content", async () => {
    render(
      <ChordProRichEditorSurface
        value={"{title: Test}\n[G]Amazing grace"}
        onValueChange={vi.fn()}
        onSelectionChange={vi.fn()}
      />,
    );

    expect(screen.getByTestId("chordpro-editor")).toBeInTheDocument();
    await waitFor(() => {
      expect(document.querySelector(".cm-line")?.textContent).toContain("{title: Test}");
    });
  });

  it("reports the initial selection on mount", async () => {
    const onSelectionChange = vi.fn();

    render(
      <ChordProRichEditorSurface
        value={"{title: Test}\n[G]Amazing grace"}
        onValueChange={vi.fn()}
        onSelectionChange={onSelectionChange}
      />,
    );

    await waitFor(() => {
      expect(onSelectionChange).toHaveBeenCalledWith(0, 0);
    });
  });

  it("supports imperative selection updates for toolbar commands", async () => {
    const ref = createRef<ChordProRichEditorHandle>();

    render(
      <ChordProRichEditorSurface
        ref={ref}
        value={"[G]Amazing grace"}
        onValueChange={vi.fn()}
        onSelectionChange={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(ref.current).not.toBeNull();
    });

    ref.current?.setSelection(1, 4);

    await waitFor(() => {
      expect(ref.current?.getSelection()).toEqual({ start: 1, end: 4 });
    });
  });
});
