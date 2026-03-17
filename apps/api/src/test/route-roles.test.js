import { describe, it, expect, vi } from "vitest";
import jwt from "jsonwebtoken";
import request from "supertest";

// ── Mock DB ──────────────────────────────────────────────────
vi.mock("../../src/db.js", () => ({ db: {}, pool: {} }));

// ── Mock env to use a known JWT secret ───────────────────────
const TEST_SECRET = "test-secret-for-role-tests";
vi.mock("../../src/config/env.js", () => ({
  env: {
    JWT_SECRET: "test-secret-for-role-tests",
    CORS_ORIGIN: "http://localhost:5176",
    GOOGLE_CLIENT_ID: "",
    GOOGLE_CLIENT_SECRET: "",
  },
}));

// ── Mock orgContext to inject controlled org role ─────────────
// The real orgContext queries the DB. We replace it with a version
// that reads a test-controlled header `x-test-org-role` to set req.org / req.orgRole.
vi.mock("../../src/middlewares/orgContext.js", async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    // Replace orgContext to set org from test header instead of DB
    orgContext(req, _res, next) {
      const testRole = req.headers["x-test-org-role"];
      if (testRole) {
        req.org = { id: "org-test", name: "Test Org", role: testRole };
        req.orgRole = testRole;
        req.orgs = [req.org];
      }
      next();
    },
    // Keep requireOrg and requireOrgRole as real implementations
    requireOrg: original.requireOrg,
    requireOrgRole: original.requireOrgRole,
  };
});

const { app } = await import("../../src/app.js");

// ── Test helpers ─────────────────────────────────────────────
const JWT_SECRET = TEST_SECRET;

function tokenFor(userId, globalRole = "member") {
  return jwt.sign({ id: userId, role: globalRole }, JWT_SECRET, { expiresIn: "1h" });
}

function authed(method, path, { globalRole = "member", orgRole } = {}) {
  const token = tokenFor(`user-${globalRole}`, globalRole);
  const req = request(app)[method](path)
    .set("Cookie", `token=${token}`);
  if (orgRole) {
    req.set("x-test-org-role", orgRole);
  }
  return req;
}

// ── Write endpoints that require requireOrgRole("admin", "musician") ─────
const writeEndpoints = [
  // Songs
  { method: "post",   path: "/api/songs",                     body: { title: "T" } },
  { method: "put",    path: "/api/songs/any-id",               body: { title: "T" } },
  { method: "delete", path: "/api/songs/any-id",               body: null },
  // Song import
  { method: "post",   path: "/api/songs/import/chrd/preview",  body: { content: "test" } },
  { method: "post",   path: "/api/songs/import/chrd",          body: { content: "test" } },
  { method: "post",   path: "/api/songs/import/onsong/preview", body: { content: "test" } },
  { method: "post",   path: "/api/songs/import/onsong",        body: { content: "test" } },
  // Song groups
  { method: "post",   path: "/api/songs/groups",               body: { name: "Core Repertoire" } },
  { method: "put",    path: "/api/songs/groups/any-gid",       body: { name: "Renamed Group" } },
  { method: "delete", path: "/api/songs/groups/any-gid",       body: null },
  { method: "post",   path: "/api/songs/groups/any-gid/songs", body: { songIds: ["song-1"] } },
  { method: "delete", path: "/api/songs/groups/any-gid/songs/song-1", body: null },
  // Song usage
  { method: "post",   path: "/api/songs/any-id/usage",         body: { date: "2026-01-01" } },
  { method: "delete", path: "/api/songs/any-id/usage/any-uid", body: null },
  // Variations
  { method: "post",   path: "/api/songs/any-id/variations",          body: { name: "v" } },
  { method: "put",    path: "/api/songs/any-id/variations/any-vid",  body: { name: "v" } },
  { method: "delete", path: "/api/songs/any-id/variations/any-vid",  body: null },
  // Setlists
  { method: "post",   path: "/api/setlists",                   body: { name: "S" } },
  { method: "put",    path: "/api/setlists/any-id",             body: { name: "S" } },
  { method: "delete", path: "/api/setlists/any-id",             body: null },
  { method: "post",   path: "/api/setlists/any-id/songs",       body: { songId: "s" } },
  { method: "put",    path: "/api/setlists/any-id/songs",       body: [] },
  { method: "delete", path: "/api/setlists/any-id/songs/any-sid", body: null },
  { method: "post",   path: "/api/setlists/any-id/complete",    body: null },
  { method: "post",   path: "/api/setlists/any-id/reopen",      body: null },
  // Events
  { method: "post",   path: "/api/events",                     body: { name: "E" } },
  { method: "put",    path: "/api/events/any-id",               body: { name: "E" } },
  { method: "delete", path: "/api/events/any-id",               body: null },
  // Share management
  { method: "post",   path: "/api/songs/any-id/share",          body: {} },
  { method: "delete", path: "/api/songs/any-id/shares/any-tid", body: null },
  { method: "patch",  path: "/api/songs/any-id/shares/any-tid", body: { label: "L" } },
  // Sticky notes
  { method: "post",   path: "/api/songs/any-id/notes",          body: { text: "n" } },
  { method: "put",    path: "/api/songs/any-id/notes/any-nid",  body: { text: "n" } },
  { method: "delete", path: "/api/songs/any-id/notes/any-nid",  body: null },
];

// ── Tests ────────────────────────────────────────────────────

describe("Role-matrix — observer blocked on write endpoints", () => {
  for (const { method, path, body } of writeEndpoints) {
    it(`${method.toUpperCase()} ${path} → 403 for observer`, async () => {
      const req = authed(method, path, { orgRole: "observer" });
      if (body) req.send(body);
      const res = await req;
      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain("Requires one of");
    });
  }
});

describe("Role-matrix — musician allowed on write endpoints", () => {
  for (const { method, path, body } of writeEndpoints) {
    it(`${method.toUpperCase()} ${path} → not 401/403 for musician`, async () => {
      const req = authed(method, path, { orgRole: "musician" });
      if (body) req.send(body);
      const res = await req;
      // Should pass auth + role check (may error on DB, but NOT 401 or 403)
      expect([401, 403]).not.toContain(res.status);
    });
  }
});

describe("Role-matrix — admin allowed on write endpoints", () => {
  for (const { method, path, body } of writeEndpoints) {
    it(`${method.toUpperCase()} ${path} → not 401/403 for admin`, async () => {
      const req = authed(method, path, { orgRole: "admin" });
      if (body) req.send(body);
      const res = await req;
      expect([401, 403]).not.toContain(res.status);
    });
  }
});

describe("Role-matrix — global owner bypasses role check", () => {
  for (const { method, path, body } of writeEndpoints) {
    it(`${method.toUpperCase()} ${path} → not 401/403 for owner`, async () => {
      const req = authed(method, path, { globalRole: "owner", orgRole: "observer" });
      if (body) req.send(body);
      const res = await req;
      // Owner should bypass requireOrgRole even with observer org role
      expect([401, 403]).not.toContain(res.status);
    });
  }
});
