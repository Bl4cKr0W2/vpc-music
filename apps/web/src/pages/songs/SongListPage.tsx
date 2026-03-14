import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { songsApi, type Song } from "@/lib/api-client";
import { ALL_KEYS } from "@vpc-music/shared";
import { Search, Plus, Music, X } from "lucide-react";

export function SongListPage() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [keyFilter, setKeyFilter] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    songsApi
      .list({
        q: debouncedQ || undefined,
        key: keyFilter || undefined,
        limit: 50,
      })
      .then((res) => {
        if (!cancelled) {
          setSongs(res.songs);
          setTotal(res.total);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQ, keyFilter]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-brand text-[hsl(var(--foreground))]">Songs</h2>
        <Link
          to="/songs/new"
          className="inline-flex items-center gap-2 rounded-md bg-[hsl(var(--secondary))] px-4 py-2 text-sm font-medium text-[hsl(var(--secondary-foreground))] hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" /> New Song
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search songs..."
            className="w-full rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] py-2 pl-10 pr-3 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
          />
          {q && (
            <button
              onClick={() => setQ("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <select
          value={keyFilter}
          onChange={(e) => setKeyFilter(e.target.value)}
          className="rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm text-[hsl(var(--foreground))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
        >
          <option value="">All keys</option>
          {ALL_KEYS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
      </div>

      {/* Results */}
      {loading ? (
        <div className="py-12 text-center text-sm text-[hsl(var(--muted-foreground))]">
          Loading...
        </div>
      ) : songs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[hsl(var(--border))] p-12 text-center">
          <Music className="mx-auto h-12 w-12 text-[hsl(var(--muted-foreground))]" />
          <p className="mt-3 text-sm text-[hsl(var(--muted-foreground))]">
            {debouncedQ || keyFilter
              ? "No songs match your search."
              : "No songs yet. Import your library to get started."}
          </p>
          {!debouncedQ && !keyFilter && (
            <Link
              to="/songs/new"
              className="mt-4 inline-flex items-center gap-2 rounded-md bg-[hsl(var(--secondary))] px-4 py-2 text-sm font-medium text-[hsl(var(--secondary-foreground))] hover:opacity-90 transition-opacity"
            >
              <Plus className="h-4 w-4" /> Create Song
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="text-xs text-[hsl(var(--muted-foreground))]">
            {total} song{total !== 1 ? "s" : ""}
          </div>
          <div className="divide-y divide-[hsl(var(--border))] rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
            {songs.map((song) => (
              <Link
                key={song.id}
                to={`/songs/${song.id}`}
                className="flex items-center justify-between p-4 hover:bg-[hsl(var(--muted))] transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-[hsl(var(--foreground))] truncate">
                    {song.title}
                  </div>
                  <div className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">
                    {[song.artist, song.tags].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <div className="ml-4 flex items-center gap-3 text-xs text-[hsl(var(--muted-foreground))] shrink-0">
                  {song.key && (
                    <span className="rounded bg-[hsl(var(--muted))] px-2 py-0.5">{song.key}</span>
                  )}
                  {song.tempo && <span>{song.tempo} BPM</span>}
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
