const API_ORIGIN = import.meta.env.VITE_API_URL || "";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_ORIGIN}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Auth ─────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    request<{ user: any; token: string }>("/api/auth/login", {
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
