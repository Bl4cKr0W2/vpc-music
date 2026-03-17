import { describe, it, expect, vi } from "vitest";
import jwt from "jsonwebtoken";
import request from "supertest";

vi.mock("../../src/db.js", () => ({ db: {}, pool: {} }));

const TEST_SECRET = "test-secret-for-library-export-tests";
vi.mock("../../src/config/env.js", () => ({
  env: {
    JWT_SECRET: TEST_SECRET,
    CORS_ORIGIN: "http://localhost:5176",
    GOOGLE_CLIENT_ID: "",
    GOOGLE_CLIENT_SECRET: "",
  },
}));

const { app } = await import("../../src/app.js");

function tokenFor(globalRole = "member") {
  return jwt.sign({ id: `user-${globalRole}`, role: globalRole }, TEST_SECRET, { expiresIn: "1h" });
}

function authed(path) {
  return request(app).get(path).set("Cookie", `token=${tokenFor()}`);
}

describe("Song library zip export route", () => {
  it("returns 400 when no song ids are provided", async () => {
    const res = await authed("/api/songs/export/zip");

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("At least one song id is required");
  });

  it("returns 400 when the format is invalid", async () => {
    const res = await authed("/api/songs/export/zip?id=s1&format=pdf");

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("format must be chordpro, onsong, or text");
  });
});