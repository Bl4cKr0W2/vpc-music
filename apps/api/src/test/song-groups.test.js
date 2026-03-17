import { describe, it, expect, vi, beforeEach } from "vitest";
import jwt from "jsonwebtoken";
import request from "supertest";

const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

vi.mock("../../src/db.js", () => ({ db: mockDb, pool: {} }));

const TEST_SECRET = "test-secret-for-song-group-tests";
vi.mock("../../src/config/env.js", () => ({
  env: {
    JWT_SECRET: TEST_SECRET,
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
    leftJoin: vi.fn(() => chain),
    where: vi.fn(() => chain),
    orderBy: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    groupBy: vi.fn(() => chain),
    as: vi.fn(() => chain),
    offset: vi.fn(() => Promise.resolve(result)),
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

function tokenFor(globalRole = "member") {
  return jwt.sign({ id: `user-${globalRole}`, role: globalRole }, TEST_SECRET, { expiresIn: "1h" });
}

describe("Song groups routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists reusable song groups for the active organization", async () => {
    const membershipChain = createQueryChain([{ id: "org-1", name: "Test Church", role: "admin" }]);
    const groupsChain = createQueryChain([
      { id: "group-1", name: "Core Repertoire", songCount: 4 },
      { id: "group-2", name: "Christmas", songCount: 7 },
    ]);

    mockDb.select
      .mockImplementationOnce(() => membershipChain)
      .mockImplementationOnce(() => groupsChain);

    const res = await request(app)
      .get("/api/songs/groups")
      .set("Cookie", `token=${tokenFor()}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      groups: [
        { id: "group-1", name: "Core Repertoire", songCount: 4 },
        { id: "group-2", name: "Christmas", songCount: 7 },
      ],
    });
    expect(groupsChain.where).toHaveBeenCalledTimes(1);
  });

  it("creates a new reusable song group", async () => {
    const membershipChain = createQueryChain([{ id: "org-1", name: "Test Church", role: "admin" }]);
    const duplicateCheck = createQueryChain([]);
    const insertGroup = createMutationChain([{ id: "group-1", name: "Core Repertoire", organizationId: "org-1" }]);

    mockDb.select
      .mockImplementationOnce(() => membershipChain)
      .mockImplementationOnce(() => duplicateCheck);
    mockDb.insert.mockImplementationOnce(() => insertGroup);

    const res = await request(app)
      .post("/api/songs/groups")
      .set("Cookie", `token=${tokenFor()}`)
      .send({ name: "Core Repertoire" });

    expect(res.status).toBe(201);
    expect(res.body.group).toEqual({
      id: "group-1",
      name: "Core Repertoire",
      organizationId: "org-1",
      songCount: 0,
    });
    expect(insertGroup.values).toHaveBeenCalledWith({
      name: "Core Repertoire",
      organizationId: "org-1",
      createdBy: "user-member",
    });
  });

  it("renames an existing song group", async () => {
    const membershipChain = createQueryChain([{ id: "org-1", name: "Test Church", role: "admin" }]);
    const existingGroup = createQueryChain([{ id: "group-1", name: "Old Name" }]);
    const duplicateCheck = createQueryChain([]);
    const updateGroup = createMutationChain([{ id: "group-1", name: "New Name" }]);

    mockDb.select
      .mockImplementationOnce(() => membershipChain)
      .mockImplementationOnce(() => existingGroup)
      .mockImplementationOnce(() => duplicateCheck);
    mockDb.update.mockImplementationOnce(() => updateGroup);

    const res = await request(app)
      .put("/api/songs/groups/group-1")
      .set("Cookie", `token=${tokenFor()}`)
      .send({ name: "New Name" });

    expect(res.status).toBe(200);
    expect(res.body.group).toEqual({ id: "group-1", name: "New Name" });
    expect(updateGroup.set).toHaveBeenCalled();
  });

  it("adds selected songs into a song group without duplicating assignments", async () => {
    const membershipChain = createQueryChain([{ id: "org-1", name: "Test Church", role: "admin" }]);
    const groupLookup = createQueryChain([{ id: "group-1" }]);
    const validSongs = createQueryChain([{ id: "song-1" }, { id: "song-2" }]);
    const existingAssignments = createQueryChain([{ songId: "song-2" }]);
    const insertAssignments = createMutationChain(undefined);

    mockDb.select
      .mockImplementationOnce(() => membershipChain)
      .mockImplementationOnce(() => groupLookup)
      .mockImplementationOnce(() => validSongs)
      .mockImplementationOnce(() => existingAssignments);
    mockDb.insert.mockImplementationOnce(() => insertAssignments);

    const res = await request(app)
      .post("/api/songs/groups/group-1/songs")
      .set("Cookie", `token=${tokenFor()}`)
      .send({ songIds: ["song-1", "song-2"] });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      addedSongIds: ["song-1"],
      skippedSongIds: ["song-2"],
    });
    expect(insertAssignments.values).toHaveBeenCalledWith([
      { groupId: "group-1", songId: "song-1" },
    ]);
  });
});
