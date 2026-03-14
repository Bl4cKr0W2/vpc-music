import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn — class name utility", () => {
  it("merges class names", () => {
    expect(cn("px-2", "py-1")).toBe("px-2 py-1");
  });

  it("handles conditional classes", () => {
    const active = true;
    const result = cn("base", active && "active");
    expect(result).toBe("base active");
  });

  it("deduplicates conflicting Tailwind classes via twMerge", () => {
    const result = cn("px-2 py-1", "px-4");
    expect(result).toBe("py-1 px-4");
  });

  it("filters out falsy values", () => {
    expect(cn("a", false, null, undefined, 0, "b")).toBe("a b");
  });

  it("returns empty string for no input", () => {
    expect(cn()).toBe("");
  });
});
