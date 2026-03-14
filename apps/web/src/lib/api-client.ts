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

// ── Songs ────────────────────────────────────────
export const songsApi = {
  list: () => request<{ songs: any[] }>("/api/songs"),
  get: (id: string) => request<any>(`/api/songs/${id}`),
  create: (data: any) => request<any>("/api/songs", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: any) => request<any>(`/api/songs/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/api/songs/${id}`, { method: "DELETE" }),
  importChrd: (data: any) => request<any>("/api/songs/import/chrd", { method: "POST", body: JSON.stringify(data) }),
  importPdf: (formData: FormData) =>
    fetch(`${API_ORIGIN}/api/songs/import/pdf`, { method: "POST", body: formData, credentials: "include" }).then((r) => r.json()),
};

// ── Setlists ─────────────────────────────────────
export const setlistsApi = {
  list: () => request<{ setlists: any[] }>("/api/setlists"),
  create: (data: any) => request<any>("/api/setlists", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: any) => request<any>(`/api/setlists/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/api/setlists/${id}`, { method: "DELETE" }),
};

// ── Auth ─────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    request<any>("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  register: (data: any) =>
    request<any>("/api/auth/register", { method: "POST", body: JSON.stringify(data) }),
  logout: () => request<void>("/api/auth/logout", { method: "POST" }),
};
