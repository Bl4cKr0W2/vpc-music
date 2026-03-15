import { describe, it, expect, vi } from "vitest";
import { requireOrg, requireOrgRole } from "../../src/middlewares/orgContext.js";

/**
 * Unit tests for the orgContext helpers that DON'T hit the database.
 * orgContext() itself requires a live DB connection, so we test the
 * guard middleware functions: requireOrg and requireOrgRole.
 */

function mockRes() {
  const res = {
    _status: null,
    _body: null,
    status(code) {
      res._status = code;
      return res;
    },
    json(body) {
      res._body = body;
      return res;
    },
  };
  return res;
}

// ── requireOrg ──────────────────────────────────
describe("requireOrg", () => {
  it("calls next when req.org exists", () => {
    const req = { org: { id: "org-1", name: "VPC", role: "admin" } };
    const res = mockRes();
    const next = vi.fn();

    requireOrg(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res._status).toBeNull();
  });

  it("returns 400 when req.org is undefined", () => {
    const req = {};
    const res = mockRes();
    const next = vi.fn();

    requireOrg(req, res, next);

    expect(res._status).toBe(400);
    expect(res._body.error.message).toContain("Organization context required");
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 400 when req.org is null", () => {
    const req = { org: null };
    const res = mockRes();
    const next = vi.fn();

    requireOrg(req, res, next);

    expect(res._status).toBe(400);
    expect(next).not.toHaveBeenCalled();
  });
});

// ── requireOrgRole ──────────────────────────────
describe("requireOrgRole", () => {
  it("allows a user with a matching org role", () => {
    const middleware = requireOrgRole("admin", "musician");
    const req = {
      user: { id: "u-1", role: "member" },
      org: { id: "org-1", name: "VPC", role: "admin" },
      orgRole: "admin",
    };
    const res = mockRes();
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res._status).toBeNull();
  });

  it("allows a global owner regardless of org role", () => {
    const middleware = requireOrgRole("admin");
    const req = {
      user: { id: "u-owner", role: "owner" },
      org: { id: "org-1", name: "VPC", role: "musician" },
      orgRole: "musician",
    };
    const res = mockRes();
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it("blocks a user without a matching role", () => {
    const middleware = requireOrgRole("admin");
    const req = {
      user: { id: "u-2", role: "member" },
      org: { id: "org-1", name: "VPC", role: "observer" },
      orgRole: "observer",
    };
    const res = mockRes();
    const next = vi.fn();

    middleware(req, res, next);

    expect(res._status).toBe(403);
    expect(res._body.error.message).toContain("Requires one of");
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 400 when no org context is present", () => {
    const middleware = requireOrgRole("admin");
    const req = { user: { id: "u-3", role: "member" } };
    const res = mockRes();
    const next = vi.fn();

    middleware(req, res, next);

    expect(res._status).toBe(400);
    expect(res._body.error.message).toContain("Organization context required");
    expect(next).not.toHaveBeenCalled();
  });

  it("accepts any of multiple allowed roles", () => {
    const middleware = requireOrgRole("admin", "musician", "observer");
    const req = {
      user: { id: "u-4", role: "member" },
      org: { id: "org-1", name: "VPC", role: "musician" },
      orgRole: "musician",
    };
    const res = mockRes();
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it("blocks when orgRole doesn't match any allowed role", () => {
    const middleware = requireOrgRole("admin");
    const req = {
      user: { id: "u-5", role: "member" },
      org: { id: "org-1", name: "VPC", role: "musician" },
      orgRole: "musician",
    };
    const res = mockRes();
    const next = vi.fn();

    middleware(req, res, next);

    expect(res._status).toBe(403);
    expect(res._body.error.message).toContain("admin");
    expect(next).not.toHaveBeenCalled();
  });

  it("global owner bypasses even with no org context", () => {
    const middleware = requireOrgRole("admin");
    const req = { user: { id: "u-gowner", role: "owner" } };
    const res = mockRes();
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
