import { describe, it, expect, vi } from "vitest";
import jwt from "jsonwebtoken";
import request from "supertest";

// ── Mocks ────────────────────────────────────────────────────
const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

vi.mock("../../src/db.js", () => ({ db: mockDb, pool: {} }));

const TEST_SECRET = "test-secret-for-org-tests";
vi.mock("../../src/config/env.js", () => ({
  env: {
    JWT_SECRET: "test-secret-for-org-tests",
    CORS_ORIGIN: "http://localhost:5176",
    GOOGLE_CLIENT_ID: "",
    GOOGLE_CLIENT_SECRET: "",
  },
}));

const { app } = await import("../../src/app.js");

function createQueryChain(result) {
  const chain = {
    from: vi.fn(() => chain),
    innerJoin: vi.fn(() => chain),
    where: vi.fn(() => chain),
    orderBy: vi.fn(() => Promise.resolve(result)),
    limit: vi.fn(() => Promise.resolve(result)),
    then: (resolve) => Promise.resolve(result).then(resolve),
  };

  return chain;
}

function createMutationChain(result) {
  const chain = {
    values: vi.fn(() => chain),
    set: vi.fn(() => chain),
    where: vi.fn(() => chain),
    returning: vi.fn(() => Promise.resolve(result)),
    then: (resolve) => Promise.resolve(result).then(resolve),
  };

  return chain;
}

// ── Helpers ──────────────────────────────────────────────────
function tokenFor(globalRole = "member") {
  return jwt.sign({ id: `user-${globalRole}`, role: globalRole }, TEST_SECRET, { expiresIn: "1h" });
}

function authed(method, path, globalRole = "member") {
  return request(app)[method](path).set("Cookie", `token=${tokenFor(globalRole)}`);
}

// ── Tests ────────────────────────────────────────────────────

describe("Organization routes — auth", () => {
  const endpoints = [
    { method: "get", path: "/api/organizations" },
    { method: "post", path: "/api/organizations" },
    { method: "put", path: "/api/organizations/any-id" },
    { method: "delete", path: "/api/organizations/any-id" },
  ];

  for (const { method, path } of endpoints) {
    it(`${method.toUpperCase()} ${path} → 401 without token`, async () => {
      const res = await request(app)[method](path);
      expect(res.status).toBe(401);
    });
  }
});

describe("Organization routes — success paths", () => {
  it("creates an organization and auto-adds the creator as admin", async () => {
    const insertOrg = createMutationChain([{ id: "org-1", name: "New Hope" }]);
    const insertMembership = createMutationChain(undefined);
    mockDb.insert
      .mockImplementationOnce(() => insertOrg)
      .mockImplementationOnce(() => insertMembership);

    const res = await authed("post", "/api/organizations").send({ name: "  New Hope  " });

    expect(res.status).toBe(201);
    expect(res.body.organization).toEqual({ id: "org-1", name: "New Hope", role: "admin" });
    expect(insertOrg.values).toHaveBeenCalledWith({ name: "New Hope" });
    expect(insertMembership.values).toHaveBeenCalledWith({
      organizationId: "org-1",
      userId: "user-member",
      role: "admin",
    });
  });

  it("lists member organizations with roles for non-owner users", async () => {
    mockDb.select.mockImplementationOnce(() =>
      createQueryChain([
        { id: "org-2", name: "Alpha Church", role: "admin" },
        { id: "org-3", name: "Beta Church", role: "musician" },
      ])
    );

    const res = await authed("get", "/api/organizations");

    expect(res.status).toBe(200);
    expect(res.body.organizations).toEqual([
      { id: "org-2", name: "Alpha Church", role: "admin" },
      { id: "org-3", name: "Beta Church", role: "musician" },
    ]);
  });

  it("lists all organizations for owners", async () => {
    mockDb.select.mockImplementationOnce(() =>
      createQueryChain([
        { id: "org-2", name: "Alpha Church" },
        { id: "org-3", name: "Beta Church" },
      ])
    );

    const res = await authed("get", "/api/organizations", "owner");

    expect(res.status).toBe(200);
    expect(res.body.organizations).toEqual([
      { id: "org-2", name: "Alpha Church" },
      { id: "org-3", name: "Beta Church" },
    ]);
  });

  it("allows an org admin to rename an organization", async () => {
    const membershipQuery = createQueryChain([{ role: "admin" }]);
    const updateOrg = createMutationChain([{ id: "org-1", name: "Renamed Org" }]);
    mockDb.select.mockImplementationOnce(() => membershipQuery);
    mockDb.update.mockImplementationOnce(() => updateOrg);

    const res = await authed("put", "/api/organizations/org-1").send({ name: "Renamed Org" });

    expect(res.status).toBe(200);
    expect(res.body.organization).toEqual({ id: "org-1", name: "Renamed Org" });
    expect(updateOrg.set).toHaveBeenCalled();
  });

  it("deletes an organization for owners when no child content exists", async () => {
    mockDb.select
      .mockImplementationOnce(() => createQueryChain([{ id: "org-1" }]))
      .mockImplementationOnce(() => createQueryChain([]))
      .mockImplementationOnce(() => createQueryChain([]));

    const deleteSetlists = createMutationChain(undefined);
    const deleteEvents = createMutationChain(undefined);
    const deleteOrg = createMutationChain(undefined);
    mockDb.delete
      .mockImplementationOnce(() => deleteSetlists)
      .mockImplementationOnce(() => deleteEvents)
      .mockImplementationOnce(() => deleteOrg);

    const res = await authed("delete", "/api/organizations/org-1", "owner");

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Organization deleted");
    expect(mockDb.delete).toHaveBeenCalledTimes(3);
  });
});

describe("Organization routes — POST / validation", () => {
  it("returns 400 when name is missing", async () => {
    const res = await authed("post", "/api/organizations").send({});
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("name is required");
  });

  it("returns 400 when name is blank", async () => {
    const res = await authed("post", "/api/organizations").send({ name: "  " });
    expect(res.status).toBe(400);
  });
});

describe("Organization routes — PUT /:id validation", () => {
  it("returns 400 when name is missing", async () => {
    const res = await authed("put", "/api/organizations/any-id").send({});
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("name is required");
  });
});

describe("Organization routes — DELETE /:id authorization", () => {
  it("returns 403 for non-owner", async () => {
    const res = await authed("delete", "/api/organizations/any-id", "member");
    expect(res.status).toBe(403);
    expect(res.body.error.message).toContain("platform owners");
  });
});
