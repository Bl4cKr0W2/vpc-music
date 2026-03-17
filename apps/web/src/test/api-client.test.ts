import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  setActiveOrganizationId,
  songsApi,
  setlistsApi,
  eventsApi,
  platformApi,
  shareApi,
  songUsageApi,
  adminApi,
  variationsApi,
  authApi,
  songHistoryApi,
  stickyNotesApi,
} from "@/lib/api-client";

/**
 * Tests for the api-client module — verifies correct URL construction,
 * HTTP methods, headers, and error handling across all API namespaces.
 */

// Global fetch mock
const mockFetch = vi.fn();

// The api-client reads VITE_API_URL at module load time. It may be "" or "http://localhost:3001".
// We test URL paths with toContain to be origin-agnostic.

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
  setActiveOrganizationId(null);
});

afterEach(() => {
  vi.restoreAllMocks();
});

function jsonResponse(data: any, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  };
}

function errorResponse(message: string, status = 400) {
  return {
    ok: false,
    status,
    json: () => Promise.resolve({ error: { message } }),
  };
}

// ── Organization header ─────────────────────────
describe("Organization header", () => {
  it("sends X-Organization-Id header when org is set", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ songs: [], total: 0 }));
    setActiveOrganizationId("org-123");

    await songsApi.list();

    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers["X-Organization-Id"]).toBe("org-123");
  });

  it("omits X-Organization-Id header when org is null", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ songs: [], total: 0 }));

    await songsApi.list();

    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers["X-Organization-Id"]).toBeUndefined();
  });
});

// ── Error handling ──────────────────────────────
describe("Error handling", () => {
  it("throws with error message from API response", async () => {
    mockFetch.mockResolvedValue(errorResponse("Song not found", 404));

    await expect(songsApi.get("bad-id")).rejects.toThrow("Song not found");
  });

  it("throws HTTP status when response body has no error message", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
    });

    await expect(songsApi.get("bad-id")).rejects.toThrow("HTTP 500");
  });

  it("throws HTTP status when json() parsing fails", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 502,
      json: () => Promise.reject(new Error("not json")),
    });

    await expect(songsApi.get("bad-id")).rejects.toThrow("HTTP 502");
  });
});

// ── Songs API ───────────────────────────────────
describe("songsApi", () => {
  it("list — builds correct URL with query params", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ songs: [], total: 0 }));

    await songsApi.list({ q: "grace", groupId: "group-1", scope: "shared", category: "Church", key: "G", limit: 10 });

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/songs?");
    expect(url).toContain("q=grace");
    expect(url).toContain("groupId=group-1");
    expect(url).toContain("scope=shared");
    expect(url).toContain("category=Church");
    expect(url).toContain("key=G");
    expect(url).toContain("limit=10");
  });

  it("getGroups — fetches reusable song groups", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ groups: [{ id: "group-1", name: "Wedding Songs", songCount: 3 }] }));

    const result = await songsApi.getGroups();

    expect(result.groups[0]?.name).toBe("Wedding Songs");

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/songs/groups");
  });

  it("createGroup — sends POST with group name", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ group: { id: "group-1", name: "Wedding Songs" } }));

    await songsApi.createGroup({ name: "Wedding Songs" });

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/songs/groups");
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toEqual({ name: "Wedding Songs" });
  });

  it("updateGroupManagers — sends PUT with delegated manager ids", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ groupId: "group-1", managerUserIds: ["user-2"], managerNames: ["Band Member"] }));

    await songsApi.updateGroupManagers("group-1", ["user-2"]);

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/songs/groups/group-1/managers");
    expect(options.method).toBe("PUT");
    expect(JSON.parse(options.body)).toEqual({ userIds: ["user-2"] });
  });

  it("addSongsToGroup — sends POST with selected song ids", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ addedSongIds: ["song-1"], skippedSongIds: [] }));

    await songsApi.addSongsToGroup("group-1", ["song-1", "song-2"]);

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/songs/groups/group-1/songs");
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toEqual({ songIds: ["song-1", "song-2"] });
  });

  it("removeSongFromGroup — sends DELETE to membership endpoint", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ message: "Removed" }));

    await songsApi.removeSongFromGroup("group-1", "song-1");

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/songs/groups/group-1/songs/song-1");
    expect(options.method).toBe("DELETE");
  });

  it("getCategories — fetches unique song categories", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ categories: ["Church", "Wedding"] }));

    const result = await songsApi.getCategories();

    expect(result.categories).toEqual(["Church", "Wedding"]);

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/songs/categories");
  });

  it("list — omits empty params", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ songs: [], total: 0 }));

    await songsApi.list();

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/songs");
  });

  it("get — fetches single song by ID", async () => {
    const songData = { song: { id: "s1", title: "Test" }, variations: [] };
    mockFetch.mockResolvedValue(jsonResponse(songData));

    const result = await songsApi.get("s1");
    expect(result.song.id).toBe("s1");

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/songs/s1");
  });

  it("create — sends POST with song data", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ song: { id: "new", title: "New Song" } }));

    await songsApi.create({ title: "New Song", content: "[G]Lyrics" });

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/songs");
    expect(options.method).toBe("POST");
    const body = JSON.parse(options.body);
    expect(body.title).toBe("New Song");
  });

  it("update — sends PUT with song data", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ song: { id: "s1", title: "Updated" } }));

    await songsApi.update("s1", { title: "Updated" });

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/songs/s1");
    expect(options.method).toBe("PUT");
  });

  it("delete — sends DELETE request", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ message: "Deleted" }));

    await songsApi.delete("s1");

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/songs/s1");
    expect(options.method).toBe("DELETE");
  });

  it("importChrd — sends POST to import endpoint", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ song: { id: "imported" } }));

    await songsApi.importChrd({ filename: "song.chrd", content: "# G\n@ lyrics" });

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/songs/import/chrd");
    expect(options.method).toBe("POST");
  });

  it("previewImportChrd — sends POST to preview endpoint", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ chordPro: "{title: Test}", metadata: { title: "Test" } }));

    await songsApi.previewImportChrd({ filename: "song.chrd", content: "# G\n@ lyrics" });

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/songs/import/chrd/preview");
    expect(options.method).toBe("POST");
  });

  it("importOnSong — sends POST to import endpoint", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ song: { id: "imported-onsong" }, chordPro: "{title: Test}" }));

    await songsApi.importOnSong({ filename: "song.onsong", content: "Title: Test" });

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/songs/import/onsong");
    expect(options.method).toBe("POST");
  });

  it("previewImportOnSong — sends POST to preview endpoint", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ chordPro: "{title: Test}", metadata: { title: "Test" } }));

    await songsApi.previewImportOnSong({ filename: "song.onsong", content: "Title: Test" });

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/songs/import/onsong/preview");
    expect(options.method).toBe("POST");
  });

  it("exportPdf — returns URL string, not a fetch call", () => {
    const url = songsApi.exportPdf("s1");
    expect(url).toContain("/api/songs/s1/export/pdf");
  });

  it("exportChordPro — includes variationId query when provided", async () => {
    mockFetch.mockResolvedValue(jsonResponse({}));

    await songsApi.exportChordPro("s1", "v1");

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/songs/s1/export/chordpro?variationId=v1");
  });

  it("exportOnSong — includes variationId query when provided", async () => {
    mockFetch.mockResolvedValue(jsonResponse({}));

    await songsApi.exportOnSong("s1", "v1");

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/songs/s1/export/onsong?variationId=v1");
  });

  it("exportText — includes variationId query when provided", async () => {
    mockFetch.mockResolvedValue(jsonResponse({}));

    await songsApi.exportText("s1", "v1");

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/songs/s1/export/text?variationId=v1");
  });

  it("exportText — includes lyricsOnly query when provided", async () => {
    mockFetch.mockResolvedValue(jsonResponse({}));

    await songsApi.exportText("s1", undefined, true);

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/songs/s1/export/text?lyricsOnly=true");
  });

  it("exportPdf — includes variationId query when provided", () => {
    const url = songsApi.exportPdf("s1", "v1");
    expect(url).toContain("/api/songs/s1/export/pdf?variationId=v1");
  });

  it("exportZip — requests the song library zip endpoint with repeated ids", async () => {
    mockFetch.mockResolvedValue(jsonResponse({}));

    await songsApi.exportZip(["s1", "s2"], "onsong");

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/songs/export/zip?format=onsong&id=s1&id=s2");
    expect(options.credentials).toBe("include");
  });

  it("importPdf — sends POST with FormData body", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ song: { id: "pdf-imported" }, chordPro: "{title: Test}" }));

    const file = new File(["fake-pdf-content"], "song.pdf", { type: "application/pdf" });
    const result = await songsApi.importPdf(file);

    expect(result.song.id).toBe("pdf-imported");
    expect(result.chordPro).toBe("{title: Test}");

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/songs/import/pdf");
    expect(options.method).toBe("POST");
    expect(options.body).toBeInstanceOf(FormData);
    // Should NOT have Content-Type header (browser sets multipart boundary)
    const headers = options.headers || {};
    expect(headers["Content-Type"]).toBeUndefined();
  });

  it("previewImportPdf — sends POST with FormData body to preview endpoint", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ chordPro: "{title: Test}", metadata: { title: "Test" } }));

    const file = new File(["fake-pdf-content"], "song.pdf", { type: "application/pdf" });
    const result = await songsApi.previewImportPdf(file);

    expect(result.chordPro).toBe("{title: Test}");

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/songs/import/pdf/preview");
    expect(options.method).toBe("POST");
    expect(options.body).toBeInstanceOf(FormData);
  });

  it("importPdf — throws on error response", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 503,
      json: () => Promise.resolve({ error: { message: "PDF.co API key not configured" } }),
    });

    const file = new File(["fake"], "test.pdf", { type: "application/pdf" });
    await expect(songsApi.importPdf(file)).rejects.toThrow("PDF.co API key not configured");
  });
});

// ── Variations API ──────────────────────────────
describe("variationsApi", () => {
  it("create — sends POST with variation data", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ variation: { id: "v1" } }));

    await variationsApi.create("s1", { name: "Acoustic", content: "[C]New", key: "C" });

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/songs/s1/variations");
    expect(options.method).toBe("POST");
    const body = JSON.parse(options.body);
    expect(body.name).toBe("Acoustic");
  });

  it("update — sends PUT with partial data", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ variation: { id: "v1" } }));

    await variationsApi.update("s1", "v1", { name: "Updated" });

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/songs/s1/variations/v1");
    expect(options.method).toBe("PUT");
  });

  it("setDefault — sends PATCH with variation id", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ song: { id: "s1", defaultVariationId: "v1" } }));

    await variationsApi.setDefault("s1", "v1");

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/songs/s1/default-variation");
    expect(options.method).toBe("PATCH");
    expect(JSON.parse(options.body)).toEqual({ variationId: "v1" });
  });

  it("delete — sends DELETE", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ message: "ok" }));

    await variationsApi.delete("s1", "v1");

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/songs/s1/variations/v1");
    expect(options.method).toBe("DELETE");
  });
});

// ── Song History API ────────────────────────────
describe("songHistoryApi", () => {
  it("list — fetches edit history for a song", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ history: [{ id: "e1", field: "key" }] }));

    const result = await songHistoryApi.list("s1");

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/songs/s1/history");
    expect(result.history).toHaveLength(1);
    expect(result.history[0].field).toBe("key");
  });
});

// ── Sticky Notes API ────────────────────────────
describe("stickyNotesApi", () => {
  it("list — fetches notes for a song", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ notes: [{ id: "n1", content: "Test" }] }));

    const result = await stickyNotesApi.list("s1");

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/songs/s1/notes");
    expect(result.notes).toHaveLength(1);
  });

  it("create — sends POST with content and color", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ note: { id: "n1" } }));

    await stickyNotesApi.create("s1", { content: "Remember this", color: "blue" });

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/songs/s1/notes");
    expect(options.method).toBe("POST");
    const body = JSON.parse(options.body);
    expect(body.content).toBe("Remember this");
    expect(body.color).toBe("blue");
  });

  it("update — sends PUT with partial data", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ note: { id: "n1" } }));

    await stickyNotesApi.update("s1", "n1", { content: "Updated" });

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/songs/s1/notes/n1");
    expect(options.method).toBe("PUT");
  });

  it("delete — sends DELETE", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ message: "ok" }));

    await stickyNotesApi.delete("s1", "n1");

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/songs/s1/notes/n1");
    expect(options.method).toBe("DELETE");
  });
});

// ── Setlists API ────────────────────────────────
describe("setlistsApi", () => {
  it("list — fetches all setlists", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ setlists: [] }));

    await setlistsApi.list();

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/setlists");
  });

  it("create — sends POST", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ setlist: { id: "sl1" } }));

    await setlistsApi.create({ name: "Sunday Set" });

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/setlists");
    expect(options.method).toBe("POST");
  });

  it("exportZip — requests the setlist zip endpoint with format", async () => {
    mockFetch.mockResolvedValue(jsonResponse({}));

    await setlistsApi.exportZip("sl1", "onsong");

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/setlists/sl1/export/zip?format=onsong");
    expect(options.credentials).toBe("include");
  });

  it("addSong — sends POST to songs sub-resource", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ item: { id: "item1" } }));

    await setlistsApi.addSong("sl1", { songId: "s1", key: "G" });

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/setlists/sl1/songs");
    expect(options.method).toBe("POST");
  });

  it("removeSong — sends DELETE to songs sub-resource", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ message: "ok" }));

    await setlistsApi.removeSong("sl1", "item1");

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/setlists/sl1/songs/item1");
    expect(options.method).toBe("DELETE");
  });

  it("markComplete — sends POST to complete endpoint", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ setlist: { id: "sl1" }, usagesLogged: 3 }));

    await setlistsApi.markComplete("sl1", "2025-01-01");

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/setlists/sl1/complete");
    expect(options.method).toBe("POST");
  });

  it("reopen — sends POST to reopen endpoint", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ setlist: { id: "sl1" } }));

    await setlistsApi.reopen("sl1");

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/setlists/sl1/reopen");
    expect(options.method).toBe("POST");
  });

  it("reorderSongs — sends PUT with order array", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ message: "ok" }));

    await setlistsApi.reorderSongs("sl1", [
      { id: "a", position: 0 },
      { id: "b", position: 1 },
    ]);

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/setlists/sl1/songs");
    expect(options.method).toBe("PUT");
    const body = JSON.parse(options.body);
    expect(body.order).toHaveLength(2);
  });
});

// ── Events API ──────────────────────────────────
describe("eventsApi", () => {
  it("list — fetches events with optional upcoming filter", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ events: [] }));

    await eventsApi.list({ upcoming: true });

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/events");
    expect(url).toContain("upcoming=true");
  });

  it("list — no params means no query string", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ events: [] }));

    await eventsApi.list();

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/events");
  });

  it("create — sends POST", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ event: { id: "e1" } }));

    await eventsApi.create({ title: "Sunday Service", date: "2025-01-05" });

    const [, options] = mockFetch.mock.calls[0];
    expect(options.method).toBe("POST");
  });

  it("delete — sends DELETE", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ message: "ok" }));

    await eventsApi.delete("e1");

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/events/e1");
    expect(options.method).toBe("DELETE");
  });
});

// ── Platform API ────────────────────────────────
describe("platformApi", () => {
  it("getSettings — fetches settings", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ settings: { theme: "dark" } }));

    const result = await platformApi.getSettings();
    expect(result.settings.theme).toBe("dark");
  });

  it("updateProfile — sends PUT with displayName", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ user: { displayName: "New Name" } }));

    await platformApi.updateProfile({ displayName: "New Name" });

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/platform/profile");
    expect(options.method).toBe("PUT");
  });

  it("changePassword — sends PUT with passwords", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ message: "ok" }));

    await platformApi.changePassword({ currentPassword: "old", newPassword: "new" });

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/platform/password");
    expect(options.method).toBe("PUT");
  });
});

// ── Song Usage API ──────────────────────────────
describe("songUsageApi", () => {
  it("log — sends POST", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ usage: { id: "u1" } }));

    await songUsageApi.log("s1", { usedAt: "2025-01-01", notes: "Sunday" });

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/songs/s1/usage");
    expect(options.method).toBe("POST");
  });

  it("list — fetches usage history", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ usages: [] }));

    await songUsageApi.list("s1");

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/songs/s1/usage");
  });

  it("remove — sends DELETE", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ message: "ok" }));

    await songUsageApi.remove("s1", "u1");

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/songs/s1/usage/u1");
    expect(options.method).toBe("DELETE");
  });
});

// ── Share API ───────────────────────────────────
describe("shareApi", () => {
  it("create — sends POST to share endpoint", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ shareToken: {}, shareUrl: "/shared/abc" }));

    await shareApi.create("s1", { label: "Band", expiresInDays: 7 });

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/songs/s1/share");
    expect(options.method).toBe("POST");
  });

  it("list — fetches all shares for a song", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ shares: [] }));

    await shareApi.list("s1");

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/songs/s1/shares");
  });

  it("revoke — sends DELETE", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ message: "ok" }));

    await shareApi.revoke("s1", "t1");

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/songs/s1/shares/t1");
    expect(options.method).toBe("DELETE");
  });

  it("update — sends PATCH with label", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ shareToken: {} }));

    await shareApi.update("s1", "t1", { label: "New Label" });

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/songs/s1/shares/t1");
    expect(options.method).toBe("PATCH");
  });

  it("listDirect — fetches direct authenticated shares for a song", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ directShares: [] }));

    await shareApi.listDirect("s1");

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/songs/s1/direct-shares");
  });

  it("createDirect — sends POST with recipient email", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ directShare: { id: "ds-1" } }));

    await shareApi.createDirect("s1", { email: "shared@test.com" });

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/songs/s1/direct-shares");
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toEqual({ email: "shared@test.com" });
  });

  it("removeDirect — sends DELETE for a direct share", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ message: "ok" }));

    await shareApi.removeDirect("s1", "ds-1");

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/songs/s1/direct-shares/ds-1");
    expect(options.method).toBe("DELETE");
  });

  it("listTeams — fetches reusable share teams", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ teams: [] }));

    await shareApi.listTeams();

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/share-teams");
  });

  it("createTeam — sends POST with team name and members", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ team: { id: "team-1" } }));

    await shareApi.createTeam({ name: "Band", userIds: ["user-2"] });

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/share-teams");
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toEqual({ name: "Band", userIds: ["user-2"] });
  });

  it("deleteTeam — sends DELETE for a share team", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ message: "ok" }));

    await shareApi.deleteTeam("team-1");

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/share-teams/team-1");
    expect(options.method).toBe("DELETE");
  });

  it("listTeamShares — fetches team shares for a song", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ teamShares: [] }));

    await shareApi.listTeamShares("s1");

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/songs/s1/team-shares");
  });

  it("createTeamShare — sends POST with a team id", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ teamShare: { id: "ts-1" } }));

    await shareApi.createTeamShare("s1", { teamId: "team-1" });

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/songs/s1/team-shares");
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toEqual({ teamId: "team-1" });
  });

  it("removeTeamShare — sends DELETE for a team share", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ message: "ok" }));

    await shareApi.removeTeamShare("s1", "ts-1");

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/songs/s1/team-shares/ts-1");
    expect(options.method).toBe("DELETE");
  });

  it("listOrganizationTargets — fetches shareable organizations", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ organizations: [] }));

    await shareApi.listOrganizationTargets();

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/share-organizations");
  });

  it("listBatchOrganizationShares — sends song ids as query params", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ shares: [] }));

    await shareApi.listBatchOrganizationShares(["s1", "s2"]);

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/songs/batch/organization-shares?songId=s1&songId=s2");
  });

  it("batchShareToOrganizations — sends POST with songIds and organizationIds", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ sharedSongs: 1, targetOrganizations: 2, createdShares: 2, skippedShares: 0 }));

    await shareApi.batchShareToOrganizations({ songIds: ["s1"], organizationIds: ["org-2", "org-3"] });

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/songs/batch/organization-shares");
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toEqual({ songIds: ["s1"], organizationIds: ["org-2", "org-3"] });
  });

  it("updateBatchOrganizationShares — sends PATCH with add/remove ids", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ sharedSongs: 2, createdShares: 1, removedShares: 1, skippedShares: 0 }));

    await shareApi.updateBatchOrganizationShares({
      songIds: ["s1", "s2"],
      addOrganizationIds: ["org-3"],
      removeOrganizationIds: ["org-2"],
    });

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/songs/batch/organization-shares");
    expect(options.method).toBe("PATCH");
    expect(JSON.parse(options.body)).toEqual({
      songIds: ["s1", "s2"],
      addOrganizationIds: ["org-3"],
      removeOrganizationIds: ["org-2"],
    });
  });

  it("getShared — fetches public song by token", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ song: { id: "s1" }, shared: true }));

    await shareApi.getShared("abc123");

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/shared/abc123");
  });
});

// ── Admin API ───────────────────────────────────
describe("adminApi", () => {
  it("listUsers — fetches org members", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ users: [] }));

    await adminApi.listUsers();

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/admin/users");
  });

  it("invite — sends POST with invite data", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({ user: {}, inviteUrl: "/login?email=test", message: "ok" }),
    );

    await adminApi.invite({ email: "test@example.com", role: "musician" });

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/admin/users/invite");
    expect(options.method).toBe("POST");
  });

  it("updateRole — sends PUT with new role", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ message: "ok" }));

    await adminApi.updateRole("u1", "admin");

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/admin/users/u1/role");
    expect(options.method).toBe("PUT");
    const body = JSON.parse(options.body);
    expect(body.role).toBe("admin");
  });

  it("removeMember — sends DELETE", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ message: "ok" }));

    await adminApi.removeMember("u1");

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/admin/users/u1");
    expect(options.method).toBe("DELETE");
  });
});

// ── Auth API (login special case) ───────────────
describe("authApi", () => {
  it("login — sends POST with credentials", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({ user: { id: "u1" }, token: "jwt-token" }),
    );

    const result = await authApi.login("test@example.com", "password");

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/auth/login");
    expect(options.method).toBe("POST");
    expect(result.token).toBe("jwt-token");
  });

  it("login — throws on needsPassword response", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({ needsPassword: true, email: "test@example.com" }),
    );

    await expect(authApi.login("test@example.com", "")).rejects.toThrow(
      "Password setup required",
    );
  });

  it("login — throws error message from API on failure", async () => {
    mockFetch.mockResolvedValue(errorResponse("Invalid credentials", 401));

    await expect(authApi.login("test@example.com", "wrong")).rejects.toThrow(
      "Invalid credentials",
    );
  });

  it("logout — sends POST", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ message: "ok" }));

    await authApi.logout();

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/auth/logout");
    expect(options.method).toBe("POST");
  });

  it("me — fetches current user", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ user: { id: "u1" } }));

    const result = await authApi.me();
    expect(result.user.id).toBe("u1");
  });

  it("forgotPassword — sends POST with email", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ message: "ok" }));

    await authApi.forgotPassword("test@example.com");

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/auth/forgot-password");
    expect(options.method).toBe("POST");
  });

  it("resetPassword — sends POST with token and password", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ message: "ok" }));

    await authApi.resetPassword("reset-token", "newpass123");

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/auth/reset-password");
    expect(options.method).toBe("POST");
    const body = JSON.parse(options.body);
    expect(body.token).toBe("reset-token");
    expect(body.password).toBe("newpass123");
  });
});
