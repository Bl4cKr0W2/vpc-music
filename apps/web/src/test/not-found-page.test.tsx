import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { NotFoundPage } from "@/pages/NotFoundPage";

function renderNotFound() {
  return render(
    <MemoryRouter>
      <NotFoundPage />
    </MemoryRouter>,
  );
}

describe("NotFoundPage", () => {
  it("renders the 404 code", () => {
    renderNotFound();
    expect(screen.getByText("404")).toBeInTheDocument();
  });

  it("displays 'Page not found' heading", () => {
    renderNotFound();
    expect(screen.getByText("Page not found")).toBeInTheDocument();
  });

  it("displays a description message", () => {
    renderNotFound();
    expect(
      screen.getByText(/doesn't exist or has been moved/i),
    ).toBeInTheDocument();
  });

  it("has a 'Go home' link pointing to /", () => {
    renderNotFound();
    const homeLink = screen.getByText("Go home");
    expect(homeLink).toBeInTheDocument();
    expect(homeLink.closest("a")).toHaveAttribute("href", "/");
  });

  it("has a 'Go back' button that calls window.history.back()", () => {
    const backSpy = vi.spyOn(window.history, "back").mockImplementation(() => {});
    renderNotFound();
    const backBtn = screen.getByText("Go back");
    fireEvent.click(backBtn);
    expect(backSpy).toHaveBeenCalled();
    backSpy.mockRestore();
  });

  it("renders with brand styling (secondary color for 404)", () => {
    renderNotFound();
    const fourOhFour = screen.getByText("404");
    expect(fourOhFour).toHaveClass("font-brand");
  });
});
