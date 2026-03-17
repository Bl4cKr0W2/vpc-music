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

const TEST_SECRET = "test-secret-for-song-collaboration-tests";
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

function createDeleteChain() {
  return {
    where: vi.fn(() => Promise.resolve()),
  };
}

function tokenFor(payload = {}) {
  return jwt.sign({ id: "user-1", role: "member", displayName: "Taylor", ...payload }, TEST_SECRET, { expiresIn: "1h" });
}

describe("Song collaboration routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists collaboration items for an org song", async () => {
    const membershipChain = createQueryChain([{ id: "org-1", name: "Grace Church", role: "admin" }]);
    const songLookup = createQueryChain([{ id: "song-1", organizationId: "org-1" }]);
    const entriesChain = createQueryChain([
      {
        id: "c-1",
        songId: "song-1",
        organizationId: "org-1",
        authorId: "user-1",
        authorName: "Taylor",
        parentId: null,
        type: "comment",
        anchor: "Bridge",
        title: null,
        content: "Let’s hold the bridge twice.",
        status: "open",
      },
    ]);

    mockDb.select
      .mockImplementationOnce(() => membershipChain)
      .mockImplementationOnce(() => songLookup)
      .mockImplementationOnce(() => entriesChain);

    const res = await request(app)
      .get("/api/songs/song-1/collaboration")
      .set("Cookie", `token=${tokenFor()}`);

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0]).toEqual(expect.objectContaining({
      type: "comment",
      anchor: "Bridge",
      authorName: "Taylor",
    }));
  });

  it("creates a rehearsal marker", async () => {
    const membershipChain = createQueryChain([{ id: "org-1", name: "Grace Church", role: "admin" }]);
    const songLookup = createQueryChain([{ id: "song-1", organizationId: "org-1" }]);
    const insertChain = createMutationChain([
      {
        id: "m-1",
        songId: "song-1",
        organizationId: "org-1",
        authorId: "user-1",
        authorName: "Taylor",
        parentId: null,
        type: "rehearsal_marker",
        anchor: "Chorus",
        title: "Tighten ending",
        content: "Watch the cutoff on beat 4.",
        status: "open",
      },
    ]);

    mockDb.select
      .mockImplementationOnce(() => membershipChain)
      .mockImplementationOnce(() => songLookup);
    mockDb.insert.mockImplementationOnce(() => insertChain);

    const res = await request(app)
      .post("/api/songs/song-1/collaboration")
      .set("Cookie", `token=${tokenFor()}`)
      .send({
        type: "rehearsal_marker",
        anchor: "Chorus",
        title: "Tighten ending",
        content: "Watch the cutoff on beat 4.",
      });

    expect(res.status).toBe(201);
    expect(insertChain.values).toHaveBeenCalledWith(expect.objectContaining({
      type: "rehearsal_marker",
      anchor: "Chorus",
      title: "Tighten ending",
      content: "Watch the cutoff on beat 4.",
      authorName: "Taylor",
    }));
  });

  it("allows comment threads to be resolved", async () => {
    const membershipChain = createQueryChain([{ id: "org-1", name: "Grace Church", role: "admin" }]);
    const songLookup = createQueryChain([{ id: "song-1", organizationId: "org-1" }]);
    const existingEntry = createQueryChain([
      {
        id: "c-1",
        songId: "song-1",
        organizationId: "org-1",
        type: "comment",
        content: "Let’s repeat the bridge.",
        status: "open",
      },
    ]);
    const updateChain = createMutationChain([
      {
        id: "c-1",
        songId: "song-1",
        organizationId: "org-1",
        type: "comment",
        content: "Let’s repeat the bridge.",
        status: "resolved",
      },
    ]);

    mockDb.select
      .mockImplementationOnce(() => membershipChain)
      .mockImplementationOnce(() => songLookup)
      .mockImplementationOnce(() => existingEntry);
    mockDb.update.mockImplementationOnce(() => updateChain);

    const res = await request(app)
      .patch("/api/songs/song-1/collaboration/c-1")
      .set("Cookie", `token=${tokenFor()}`)
      .send({ status: "resolved" });

    expect(res.status).toBe(200);
    expect(updateChain.set).toHaveBeenCalledWith(expect.objectContaining({ status: "resolved" }));
  });

  it("deletes a thread and its replies", async () => {
    const membershipChain = createQueryChain([{ id: "org-1", name: "Grace Church", role: "admin" }]);
    const songLookup = createQueryChain([{ id: "song-1", organizationId: "org-1" }]);
    const existingEntry = createQueryChain([
      {
        id: "c-1",
        songId: "song-1",
        organizationId: "org-1",
        type: "comment",
        content: "Main thread",
        status: "open",
      },
    ]);
    const deleteChain = createDeleteChain();

    mockDb.select
      .mockImplementationOnce(() => membershipChain)
      .mockImplementationOnce(() => songLookup)
      .mockImplementationOnce(() => existingEntry);
    mockDb.delete
      .mockImplementationOnce(() => deleteChain)
      .mockImplementationOnce(() => deleteChain);

    const res = await request(app)
      .delete("/api/songs/song-1/collaboration/c-1")
      .set("Cookie", `token=${tokenFor()}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: "Collaboration item deleted" });
    expect(mockDb.delete).toHaveBeenCalledTimes(2);
  });
});