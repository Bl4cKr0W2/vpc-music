const API_ORIGIN = import.meta.env.VITE_API_URL || "";

// ── Active Organization ──────────────────────────
let _activeOrgId: string | null = null;

/** Call from AuthContext whenever the active org changes */
export function setActiveOrganizationId(id: string | null) {
  _activeOrgId = id;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string>),
  };
  if (_activeOrgId) {
    headers["X-Organization-Id"] = _activeOrgId;
  }
  const res = await fetch(`${API_ORIGIN}${path}`, {
    credentials: "include",
    ...options,
    headers,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Auth ─────────────────────────────────────────
export const authApi = {
  login: async (email: string, password: string) => {
    const res = await fetch(`${API_ORIGIN}/api/auth/login`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(body?.error?.message || `HTTP ${res.status}`);
    }
    if (body.needsPassword) {
      const err: any = new Error("Password setup required");
      err.body = body;
      throw err;
    }
    return body as { user: any; token: string };
  },
  setPassword: (email: string, password: string) =>
    request<{ user: any; token: string }>("/api/auth/set-password", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  register: (data: { email: string; password: string; displayName?: string }) =>
    request<{ user: any; token: string }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  logout: () => request<{ message: string }>("/api/auth/logout", { method: "POST" }),
  me: () => request<{ user: any }>("/api/auth/me"),
  forgotPassword: (email: string) =>
    request<{ message: string }>("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  resetPassword: (token: string, password: string) =>
    request<{ message: string }>("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    }),
};

// ── Songs ────────────────────────────────────────
export interface Song {
  id: string;
  title: string;
  key?: string | null;
  tempo?: number | null;
  artist?: string | null;
  year?: string | null;
  tags?: string | null;
  content: string;
  isDraft?: boolean;
  createdBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export const songsApi = {
  list: (params?: { q?: string; tag?: string; key?: string; limit?: number; offset?: number }) => {
    const qs = new URLSearchParams();
    if (params?.q) qs.set("q", params.q);
    if (params?.tag) qs.set("tag", params.tag);
    if (params?.key) qs.set("key", params.key);
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.offset) qs.set("offset", String(params.offset));
    const query = qs.toString();
    return request<{ songs: Song[]; total: number }>(`/api/songs${query ? `?${query}` : ""}`);
  },
  get: (id: string) => request<{ song: Song; variations: any[] }>(`/api/songs/${id}`),
  create: (data: Partial<Song>) =>
    request<{ song: Song }>("/api/songs", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Song>) =>
    request<{ song: Song }>(`/api/songs/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: string) => request<{ message: string }>(`/api/songs/${id}`, { method: "DELETE" }),
  importChrd: (data: { filename: string; content: string }) =>
    request<{ song: Song }>("/api/songs/import/chrd", { method: "POST", body: JSON.stringify(data) }),
  exportChordPro: (id: string) =>
    fetch(`${API_ORIGIN}/api/songs/${id}/export/chordpro`, { credentials: "include" }),
};

// ── Setlists ─────────────────────────────────────
export interface Setlist {
  id: string;
  name: string;
  category?: string | null;
  notes?: string | null;
  status?: "draft" | "complete";
  songCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface SetlistSongItem {
  id: string;
  songId: string;
  position: number;
  key?: string | null;
  notes?: string | null;
  songTitle: string;
  songKey?: string | null;
  songArtist?: string | null;
  songTempo?: number | null;
}

export const setlistsApi = {
  list: () => request<{ setlists: Setlist[] }>("/api/setlists"),
  get: (id: string) => request<{ setlist: Setlist; songs: SetlistSongItem[] }>(`/api/setlists/${id}`),
  create: (data: Partial<Setlist>) =>
    request<{ setlist: Setlist }>("/api/setlists", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Setlist>) =>
    request<{ setlist: Setlist }>(`/api/setlists/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: string) => request<{ message: string }>(`/api/setlists/${id}`, { method: "DELETE" }),
  addSong: (setlistId: string, data: { songId: string; key?: string; notes?: string }) =>
    request<{ item: SetlistSongItem }>(`/api/setlists/${setlistId}/songs`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  reorderSongs: (setlistId: string, order: { id: string; position: number }[]) =>
    request<{ message: string }>(`/api/setlists/${setlistId}/songs`, {
      method: "PUT",
      body: JSON.stringify({ order }),
    }),
  removeSong: (setlistId: string, songItemId: string) =>
    request<{ message: string }>(`/api/setlists/${setlistId}/songs/${songItemId}`, { method: "DELETE" }),
  markComplete: (setlistId: string, usedAt?: string) =>
    request<{ setlist: Setlist; usagesLogged: number }>(`/api/setlists/${setlistId}/complete`, {
      method: "POST",
      body: JSON.stringify({ usedAt }),
    }),
  reopen: (setlistId: string) =>
    request<{ setlist: Setlist }>(`/api/setlists/${setlistId}/reopen`, { method: "POST" }),
};

// ── Platform / Settings ──────────────────────────
export const platformApi = {
  getSettings: () => request<{ settings: Record<string, any> }>("/api/platform/settings"),
  updateSettings: (settings: Record<string, any>) =>
    request<{ settings: Record<string, any> }>("/api/platform/settings", {
      method: "PUT",
      body: JSON.stringify(settings),
    }),
  updateProfile: (data: { displayName: string }) =>
    request<{ user: any }>("/api/platform/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    request<{ message: string }>("/api/platform/password", {
      method: "PUT",
      body: JSON.stringify(data),
    }),
};

// ── Events ───────────────────────────────────────
export interface Event {
  id: string;
  title: string;
  date: string;
  location?: string | null;
  notes?: string | null;
  setlistId?: string | null;
  setlistName?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export const eventsApi = {
  list: (params?: { upcoming?: boolean }) => {
    const qs = new URLSearchParams();
    if (params?.upcoming !== undefined) qs.set("upcoming", String(params.upcoming));
    const query = qs.toString();
    return request<{ events: Event[] }>(`/api/events${query ? `?${query}` : ""}`);
  },
  get: (id: string) => request<{ event: Event }>(`/api/events/${id}`),
  create: (data: Partial<Event>) =>
    request<{ event: Event }>("/api/events", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Event>) =>
    request<{ event: Event }>(`/api/events/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: string) => request<{ message: string }>(`/api/events/${id}`, { method: "DELETE" }),
};

// ── Song Usages ──────────────────────────────────
export interface SongUsage {
  id: string;
  songId: string;
  usedAt: string;
  notes?: string | null;
  recordedBy?: string | null;
  organizationId?: string | null;
  createdAt?: string;
}

export const songUsageApi = {
  log: (songId: string, data: { usedAt: string; notes?: string }) =>
    request<{ usage: SongUsage }>(`/api/songs/${songId}/usage`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  list: (songId: string) =>
    request<{ usages: SongUsage[] }>(`/api/songs/${songId}/usage`),
  remove: (songId: string, usageId: string) =>
    request<{ message: string }>(`/api/songs/${songId}/usage/${usageId}`, { method: "DELETE" }),
};

// ── Share (read-only links) ──────────────────────
export interface ShareToken {
  id: string;
  token: string;
  songId: string;
  label?: string | null;
  expiresAt?: string | null;
  revoked?: boolean;
  createdAt?: string;
}

export const shareApi = {
  /** Create a share link for a song */
  create: (songId: string, data?: { label?: string; expiresInDays?: number }) =>
    request<{ shareToken: ShareToken; shareUrl: string }>(`/api/songs/${songId}/share`, {
      method: "POST",
      body: JSON.stringify(data ?? {}),
    }),
  /** List all share tokens for a song */
  list: (songId: string) =>
    request<{ shares: ShareToken[] }>(`/api/songs/${songId}/shares`),
  /** Revoke a share token */
  revoke: (songId: string, tokenId: string) =>
    request<{ message: string }>(`/api/songs/${songId}/shares/${tokenId}`, { method: "DELETE" }),
  /** Update a share token (label) */
  update: (songId: string, tokenId: string, data: { label?: string | null }) =>
    request<{ shareToken: ShareToken }>(`/api/songs/${songId}/shares/${tokenId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  /** Public: fetch a shared song by token (no auth needed) */
  getShared: (token: string) =>
    request<{ song: Song; shared: true }>(`/api/shared/${token}`),
};

// ── Admin ────────────────────────────────────────
export interface OrgUser {
  id: string;
  email: string;
  displayName: string | null;
  globalRole: "owner" | "member";
  orgRole: "admin" | "musician" | "observer";
  hasPassword: boolean;
  createdAt: string;
}

export const adminApi = {
  /** List all members of the current org */
  listUsers: () => request<{ users: OrgUser[] }>("/api/admin/users"),
  /** Invite a new member by email */
  invite: (data: { email: string; displayName?: string; role?: string }) =>
    request<{ user: OrgUser; inviteUrl: string; message: string }>(
      "/api/admin/users/invite",
      { method: "POST", body: JSON.stringify(data) },
    ),
  /** Update a member's org role */
  updateRole: (userId: string, role: string) =>
    request<{ message: string }>(`/api/admin/users/${userId}/role`, {
      method: "PUT",
      body: JSON.stringify({ role }),
    }),
  /** Remove a member from the org */
  removeMember: (userId: string) =>
    request<{ message: string }>(`/api/admin/users/${userId}`, {
      method: "DELETE",
    }),
};
