import { describe, it, expect } from "vitest";
import { router } from "@/router";

describe("router configuration", () => {
  it("exports a router object", () => {
    expect(router).toBeDefined();
  });

  it("has a landing route at /", () => {
    const rootRoute = router.routes.find((r) => r.path === "/");
    expect(rootRoute).toBeDefined();
  });

  it("has a login route", () => {
    const loginRoute = router.routes.find((r) => r.path === "/login");
    expect(loginRoute).toBeDefined();
  });

  it("does not have a public register route", () => {
    const registerRoute = router.routes.find((r) => r.path === "/register");
    expect(registerRoute).toBeUndefined();
  });

  it("has authenticated child routes for songs, setlists, settings", () => {
    // Protected routes are under a pathless layout route
    const layoutRoute = router.routes.find(
      (r) => !r.path && r.children && r.children.length > 1
    );
    expect(layoutRoute).toBeDefined();
    const childPaths = layoutRoute?.children?.map((c) => c.path);
    expect(childPaths).toContain("/songs");
    expect(childPaths).toContain("/setlists");
    expect(childPaths).toContain("/settings");
    expect(childPaths).toContain("/dashboard");
  });

  it("has a catch-all * child route for 404", () => {
    const layoutRoute = router.routes.find(
      (r) => !r.path && r.children && r.children.length > 1
    );
    const catchAll = layoutRoute?.children?.find((c) => c.path === "*");
    expect(catchAll).toBeDefined();
  });
});
