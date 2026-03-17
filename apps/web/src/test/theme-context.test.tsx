import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";

// Helper component that exposes theme values
function ThemeConsumer() {
  const {
    theme,
    resolvedTheme,
    contrastMode,
    editorMode,
    themePreset,
    chordColor,
    secondaryChordColor,
    pageBackground,
    songFontFamily,
    toggleTheme,
    setTheme,
    setContrastMode,
    toggleContrastMode,
    setEditorMode,
    setThemePreset,
    setChordColor,
    setSecondaryChordColor,
    setPageBackground,
    setSongFontFamily,
  } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="resolved">{resolvedTheme}</span>
      <span data-testid="contrast">{contrastMode}</span>
      <span data-testid="editor-mode">{editorMode}</span>
      <span data-testid="theme-preset">{themePreset}</span>
      <span data-testid="chord-color">{chordColor}</span>
      <span data-testid="secondary-chord-color">{secondaryChordColor}</span>
      <span data-testid="page-background">{pageBackground}</span>
      <span data-testid="song-font-family">{songFontFamily}</span>
      <button data-testid="toggle" onClick={toggleTheme}>Toggle</button>
      <button data-testid="set-light" onClick={() => setTheme("light")}>Light</button>
      <button data-testid="set-system" onClick={() => setTheme("system")}>System</button>
      <button data-testid="set-high-contrast" onClick={() => setContrastMode("high")}>High contrast</button>
      <button data-testid="toggle-contrast" onClick={toggleContrastMode}>Toggle contrast</button>
      <button data-testid="set-beginner-mode" onClick={() => setEditorMode("beginner")}>Beginner</button>
      <button data-testid="set-stage-dark" onClick={() => setThemePreset("stage-dark")}>Stage dark</button>
      <button data-testid="set-custom-chord" onClick={() => setChordColor("#123456")}>Chord color</button>
      <button data-testid="set-custom-secondary" onClick={() => setSecondaryChordColor("#654321")}>Secondary chord color</button>
      <button data-testid="set-custom-background" onClick={() => setPageBackground("#abcdef")}>Page background</button>
      <button data-testid="set-font-serif" onClick={() => setSongFontFamily("serif")}>Serif font</button>
    </div>
  );
}

describe("ThemeContext", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
    document.documentElement.classList.remove("high-contrast");
    document.documentElement.style.colorScheme = "";
  });

  it("defaults to dark theme", () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("theme").textContent).toBe("dark");
    expect(screen.getByTestId("resolved").textContent).toBe("dark");
    expect(screen.getByTestId("contrast").textContent).toBe("normal");
    expect(screen.getByTestId("editor-mode").textContent).toBe("advanced");
    expect(screen.getByTestId("theme-preset").textContent).toBe("custom");
  });

  it("persists theme to localStorage", () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );
    expect(localStorage.getItem("vpc-theme")).toBe("dark");
    expect(localStorage.getItem("vpc-contrast")).toBe("normal");
    expect(localStorage.getItem("vpc-appearance")).toContain('"editorMode":"advanced"');
  });

  it("reads theme from localStorage", () => {
    localStorage.setItem("vpc-theme", "light");
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("theme").textContent).toBe("light");
    expect(screen.getByTestId("resolved").textContent).toBe("light");
  });

  it("toggleTheme switches from dark to light", () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );
    act(() => {
      screen.getByTestId("toggle").click();
    });
    expect(screen.getByTestId("theme").textContent).toBe("light");
    expect(screen.getByTestId("resolved").textContent).toBe("light");
  });

  it("setTheme updates theme correctly", () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );
    act(() => {
      screen.getByTestId("set-light").click();
    });
    expect(screen.getByTestId("theme").textContent).toBe("light");
    expect(screen.getByTestId("resolved").textContent).toBe("light");
  });

  it("throws when useTheme is used outside provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<ThemeConsumer />)).toThrow(
      "useTheme must be used within ThemeProvider",
    );
    spy.mockRestore();
  });

  it("applies .dark class to <html>", () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("removes .dark class when switched to light", () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );
    act(() => {
      screen.getByTestId("set-light").click();
    });
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("reads high contrast mode from localStorage", () => {
    localStorage.setItem("vpc-contrast", "high");
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("contrast").textContent).toBe("high");
    expect(document.documentElement.classList.contains("high-contrast")).toBe(true);
  });

  it("reads custom appearance settings from localStorage", () => {
    localStorage.setItem(
      "vpc-appearance",
      JSON.stringify({
        editorMode: "beginner",
        themePreset: "custom",
        chordColor: "#112233",
        secondaryChordColor: "#445566",
        pageBackground: "#778899",
        songFontFamily: "mono",
      }),
    );
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("editor-mode").textContent).toBe("beginner");
    expect(screen.getByTestId("chord-color").textContent).toBe("#112233");
    expect(screen.getByTestId("secondary-chord-color").textContent).toBe("#445566");
    expect(screen.getByTestId("page-background").textContent).toBe("#778899");
    expect(screen.getByTestId("song-font-family").textContent).toBe("mono");
  });

  it("setContrastMode applies high contrast class", () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );
    act(() => {
      screen.getByTestId("set-high-contrast").click();
    });
    expect(screen.getByTestId("contrast").textContent).toBe("high");
    expect(document.documentElement.classList.contains("high-contrast")).toBe(true);
  });

  it("toggleContrastMode switches between normal and high", () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );
    act(() => {
      screen.getByTestId("toggle-contrast").click();
    });
    expect(screen.getByTestId("contrast").textContent).toBe("high");
    act(() => {
      screen.getByTestId("toggle-contrast").click();
    });
    expect(screen.getByTestId("contrast").textContent).toBe("normal");
  });

  it("applies custom appearance CSS variables", () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );
    act(() => {
      screen.getByTestId("set-beginner-mode").click();
      screen.getByTestId("set-custom-chord").click();
      screen.getByTestId("set-custom-secondary").click();
      screen.getByTestId("set-custom-background").click();
      screen.getByTestId("set-font-serif").click();
    });
    expect(screen.getByTestId("editor-mode").textContent).toBe("beginner");
    expect(document.documentElement.dataset.editorMode).toBe("beginner");
    expect(document.documentElement.style.getPropertyValue("--song-chord-color")).toBe("#123456");
    expect(document.documentElement.style.getPropertyValue("--song-secondary-chord-color")).toBe("#654321");
    expect(document.documentElement.style.getPropertyValue("--page-background-color")).toBe("#abcdef");
    expect(document.documentElement.style.getPropertyValue("--song-display-font")).toContain("var(--font-serif)");
  });

  it("applies stage dark theme preset", () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );
    act(() => {
      screen.getByTestId("set-stage-dark").click();
    });
    expect(screen.getByTestId("theme-preset").textContent).toBe("stage-dark");
    expect(screen.getByTestId("theme").textContent).toBe("dark");
    expect(screen.getByTestId("chord-color").textContent).toBe("#7dd3fc");
    expect(screen.getByTestId("secondary-chord-color").textContent).toBe("#c084fc");
    expect(screen.getByTestId("page-background").textContent).toBe("#000435");
  });
});
