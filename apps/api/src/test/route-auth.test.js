import { describe, it, expect, vi } from "vitest";
import request from "supertest";

// Mock DB to avoid postgres pool connection
vi.mock("../../src/db.js", () => ({ db: {}, pool: {} }));

// Mock env to use a known JWT secret
vi.mock("../../src/config/env.js", () => ({
  env: {
    JWT_SECRET: "test-secret",
    CORS_ORIGIN: "http://localhost:5176",
    GOOGLE_CLIENT_ID: "",
    GOOGLE_CLIENT_SECRET: "",
  },
}));

const { app } = await import("../../src/app.js");

// ── 401 regression — previously public GET endpoints ────────────
// These 6 endpoints were unauthenticated before the Section 0 security pass.
// Confirm they now require auth and return 401 without a token.

describe("401 regression — previously public GET endpoints", () => {
  const endpoints = [
    { method: "get", path: "/api/songs/any-uuid" },
    { method: "get", path: "/api/songs/most-used" },
    { method: "get", path: "/api/songs/any-uuid/export/chordpro" },
    { method: "get", path: "/api/songs/any-uuid/export/onsong" },
    { method: "get", path: "/api/songs/export/zip?id=any-uuid" },
    { method: "get", path: "/api/songs/any-uuid/export/pdf" },
    { method: "get", path: "/api/setlists/any-uuid" },
    { method: "get", path: "/api/setlists/any-uuid/export/zip" },
    { method: "get", path: "/api/events/any-uuid" },
    { method: "get", path: "/api/organizations" },
    { method: "post", path: "/api/organizations" },
    { method: "put", path: "/api/organizations/any-uuid" },
    { method: "delete", path: "/api/organizations/any-uuid" },
  ];

  for (const { method, path } of endpoints) {
    it(`${method.toUpperCase()} ${path} → 401 without auth token`, async () => {
      const res = await request(app)[method](path);
      expect(res.status).toBe(401);
      expect(res.body.error.message).toBe("Not authenticated");
    });
  }
});
