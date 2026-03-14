import { describe, it, expect } from "vitest";
import { router } from "@/router";

describe("router configuration", () => {
  it("exports a router object", () => {
    expect(router).toBeDefined();
  });

  it("has a root route at /", () => {
    const rootRoute = router.routes.find((r) => r.path === "/");
    expect(rootRoute).toBeDefined();
  });

  it("root route has errorElement configured", () => {
    const rootRoute = router.routes.find((r) => r.path === "/");
    expect(rootRoute?.errorElement).toBeDefined();
  });

  it("has a login route", () => {
    const loginRoute = router.routes.find((r) => r.path === "/login");
    expect(loginRoute).toBeDefined();
  });

  it("root has expected child routes", () => {
    const rootRoute = router.routes.find((r) => r.path === "/");
    const childPaths = rootRoute?.children?.map((c) => c.path ?? "(index)");
    expect(childPaths).toContain("songs");
    expect(childPaths).toContain("setlists");
    expect(childPaths).toContain("settings");
  });

  it("has a catch-all * child route for 404", () => {
    const rootRoute = router.routes.find((r) => r.path === "/");
    const catchAll = rootRoute?.children?.find((c) => c.path === "*");
    expect(catchAll).toBeDefined();
  });
});
