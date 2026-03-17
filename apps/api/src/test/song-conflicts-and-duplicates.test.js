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

const TEST_SECRET = "test-secret-for-song-conflict-tests";
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
    limit: vi.fn(() => Promise.resolve(result)),
    groupBy: vi.fn(() => chain),
    offset: vi.fn(() => Promise.resolve(result)),
    then: (resolve) => Promise.resolve(result).then(resolve),
  };

  return chain;
}

function tokenFor(globalRole = "member") {
  return jwt.sign({ id: `user-${globalRole}`, role: globalRole }, TEST_SECRET, { expiresIn: "1h" });
}

describe("Song conflicts and duplicates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns duplicate suggestions based on title and lyric similarity", async () => {
    const membershipChain = createQueryChain([{ id: "org-1", name: "Test Church", role: "admin" }]);
    const songsChain = createQueryChain([
      {
        id: "song-1",
        title: "Amazing Grace",
        aka: "Grace Song",
        artist: "Newton",
        key: "G",
        updatedAt: "2026-03-16T09:00:00.000Z",
        content: "[G]Amazing grace how sweet the sound",
      },
      {
        id: "song-2",
        title: "Completely Different Song",
        aka: null,
        artist: "Someone Else",
        key: "C",
        updatedAt: "2026-03-16T09:00:00.000Z",
        content: "[C]Nothing related here",
      },
    ]);

    mockDb.select
      .mockImplementationOnce(() => membershipChain)
      .mockImplementationOnce(() => songsChain);

    const res = await request(app)
      .post("/api/songs/duplicates/check")
      .set("Cookie", `token=${tokenFor()}`)
      .send({
        title: "Amazing Grace",
        content: "Amazing grace how sweet the sound that saved a wretch like me",
      });

    expect(res.status).toBe(200);
    expect(res.body.matches).toHaveLength(1);
    expect(res.body.matches[0]).toEqual(expect.objectContaining({
      id: "song-1",
      title: "Amazing Grace",
      matchedOn: expect.arrayContaining(["title", "lyrics"]),
    }));
  });

  it("returns a conflict payload when the song was updated after the editor loaded it", async () => {
    const membershipChain = createQueryChain([{ id: "org-1", name: "Test Church", role: "admin" }]);
    const existingSongChain = createQueryChain([
      {
        id: "song-1",
        title: "Amazing Grace",
        key: "G",
        tempo: 72,
        artist: "Newton",
        tags: "hymn",
        content: "[G]Amazing grace",
        isDraft: false,
        updatedAt: "2026-03-16T11:00:00.000Z",
      },
    ]);

    mockDb.select
      .mockImplementationOnce(() => membershipChain)
      .mockImplementationOnce(() => existingSongChain);

    const res = await request(app)
      .put("/api/songs/song-1")
      .set("Cookie", `token=${tokenFor()}`)
      .send({
        title: "Amazing Grace Updated",
        lastKnownUpdatedAt: "2026-03-16T10:00:00.000Z",
      });

    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/updated by someone else/i);
    expect(res.body.currentSong).toEqual(expect.objectContaining({
      id: "song-1",
      title: "Amazing Grace",
    }));
    expect(mockDb.update).not.toHaveBeenCalled();
  });
});
