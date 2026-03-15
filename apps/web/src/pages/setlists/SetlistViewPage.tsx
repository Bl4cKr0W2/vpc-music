import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  setlistsApi,
  songsApi,
  type Setlist,
  type SetlistSongItem,
  type Song,
} from "@/lib/api-client";
import { toast } from "sonner";
import {
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  Music,
  X,
  CheckCircle2,
  RotateCcw,
  Radio,
  Wifi,
  WifiOff,
  Users,
  LogOut,
  Play,
} from "lucide-react";
import { ALL_KEYS } from "@vpc-music/shared";
import { useConductor } from "@/hooks/useConductor";

export function SetlistViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [setlist, setSetlist] = useState<Setlist | null>(null);
  const [songs, setSongs] = useState<SetlistSongItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddSong, setShowAddSong] = useState(false);
  const [availableSongs, setAvailableSongs] = useState<Song[]>([]);
  const [searchQ, setSearchQ] = useState("");

  // ── Live mode state ────────────────────────────
  const [liveMode, setLiveMode] = useState<"off" | "conductor" | "member">("off");
  const songListRef = useRef<HTMLDivElement>(null);
  const scrollThrottleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const conductor = useConductor(
    liveMode !== "off"
      ? { setlistId: id!, mode: liveMode }
      : { setlistId: "", mode: "member" }
  );

  // Disconnect when going back to off
  const handleLeaveLive = useCallback(() => {
    conductor.leave();
    setLiveMode("off");
  }, [conductor]);

  // Scroll to current song when it changes (member mode)
  useEffect(() => {
    if (liveMode !== "member" || !songListRef.current) return;
    const items = songListRef.current.querySelectorAll("[data-song-index]");
    const target = items[conductor.currentSong];
    if (target && typeof target.scrollIntoView === "function") {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [conductor.currentSong, liveMode]);

  // Member: sync scroll position from conductor
  useEffect(() => {
    if (liveMode !== "member" || !songListRef.current) return;
    songListRef.current.scrollTop = conductor.scrollTop;
  }, [conductor.scrollTop, liveMode]);

  // Conductor: broadcast scroll position (throttled)
  const handleScroll = useCallback(() => {
    if (liveMode !== "conductor" || !songListRef.current) return;
    if (scrollThrottleRef.current) return;
    scrollThrottleRef.current = setTimeout(() => {
      scrollThrottleRef.current = null;
      if (songListRef.current) {
        conductor.broadcastScroll(songListRef.current.scrollTop);
      }
    }, 100);
  }, [liveMode, conductor]);

  // Load setlist
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setlistsApi
      .get(id)
      .then((res) => {
        setSetlist(res.setlist);
        setSongs(res.songs);
      })
      .catch(() => toast.error("Setlist not found"))
      .finally(() => setLoading(false));
  }, [id]);

  // Load available songs for the add-song modal
  useEffect(() => {
    if (!showAddSong) return;
    songsApi.list({ q: searchQ || undefined, limit: 20 }).then((res) => {
      setAvailableSongs(res.songs);
    });
  }, [showAddSong, searchQ]);

  const handleAddSong = async (songId: string) => {
    if (!id) return;
    try {
      const res = await setlistsApi.addSong(id, { songId });
      setSongs((prev) => [...prev, res.item]);
      toast.success("Song added");
      setShowAddSong(false);
      setSearchQ("");
    } catch (err: any) {
      toast.error(err.message || "Failed to add song");
    }
  };

  const handleRemoveSong = async (songItemId: string) => {
    if (!id) return;
    try {
      await setlistsApi.removeSong(id, songItemId);
      setSongs((prev) => prev.filter((s) => s.id !== songItemId));
      toast.success("Song removed");
    } catch (err: any) {
      toast.error(err.message || "Failed to remove");
    }
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0 || !id) return;
    const newSongs = [...songs];
    [newSongs[index - 1], newSongs[index]] = [newSongs[index], newSongs[index - 1]];
    const order = newSongs.map((s, i) => ({ id: s.id, position: i }));
    setSongs(newSongs);
    try {
      await setlistsApi.reorderSongs(id, order);
    } catch {
      // Revert on error
      setSongs(songs);
      toast.error("Failed to reorder");
    }
  };

  const handleMoveDown = async (index: number) => {
    if (index === songs.length - 1 || !id) return;
    const newSongs = [...songs];
    [newSongs[index], newSongs[index + 1]] = [newSongs[index + 1], newSongs[index]];
    const order = newSongs.map((s, i) => ({ id: s.id, position: i }));
    setSongs(newSongs);
    try {
      await setlistsApi.reorderSongs(id, order);
    } catch {
      setSongs(songs);
      toast.error("Failed to reorder");
    }
  };

  const handleDeleteSetlist = async () => {
    if (!id || !confirm("Delete this setlist permanently?")) return;
    try {
      await setlistsApi.delete(id);
      toast.success("Setlist deleted");
      navigate("/setlists");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    }
  };

  const handleMarkComplete = async () => {
    if (!id) return;
    try {
      const res = await setlistsApi.markComplete(id);
      setSetlist(res.setlist);
      toast.success(`Setlist marked complete — ${res.usagesLogged} song usage(s) logged`);
    } catch (err: any) {
      toast.error(err.message || "Failed to mark complete");
    }
  };

  const handleReopen = async () => {
    if (!id) return;
    try {
      const res = await setlistsApi.reopen(id);
      setSetlist(res.setlist);
      toast.success("Setlist reopened");
    } catch (err: any) {
      toast.error(err.message || "Failed to reopen");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[hsl(var(--muted))] border-t-[hsl(var(--secondary))]" />
      </div>
    );
  }

  if (!setlist) {
    return (
      <div className="space-y-4 text-center py-20">
        <p className="text-[hsl(var(--muted-foreground))]">Setlist not found.</p>
        <Link to="/setlists" className="text-sm text-[hsl(var(--secondary))] hover:underline">
          Back to setlists
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <Link
          to="/setlists"
          className="inline-flex items-center gap-1 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
        >
          <ArrowLeft className="h-4 w-4" /> Setlists
        </Link>
        <div className="flex-1" />
        {setlist.status === "complete" ? (
          <button
            onClick={handleReopen}
            className="inline-flex items-center gap-1.5 rounded-md border border-[hsl(var(--border))] px-3 py-1.5 text-xs hover:bg-[hsl(var(--muted))] transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reopen
          </button>
        ) : (
          <button
            onClick={handleMarkComplete}
            className="inline-flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 transition-colors"
          >
            <CheckCircle2 className="h-3.5 w-3.5" /> Mark Complete
          </button>
        )}
        <button
          onClick={handleDeleteSetlist}
          className="inline-flex items-center gap-1.5 rounded-md border border-[hsl(var(--destructive))] px-3 py-1.5 text-xs text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive))] hover:text-[hsl(var(--destructive-foreground))] transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </button>
      </div>

      {/* Setlist info */}
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-brand text-[hsl(var(--foreground))]">{setlist.name}</h2>
          {setlist.status === "complete" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
              <CheckCircle2 className="h-3 w-3" /> Complete
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-[hsl(var(--muted))] px-2 py-0.5 text-xs font-medium text-[hsl(var(--muted-foreground))]">
              Draft
            </span>
          )}
        </div>
        {setlist.category && (
          <p className="text-sm text-[hsl(var(--muted-foreground))]">{setlist.category}</p>
        )}
        {setlist.notes && (
          <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{setlist.notes}</p>
        )}
      </div>

      {/* ── Live Mode Panel ─────────────────────────── */}
      <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 space-y-3">
        {liveMode === "off" ? (
          <div className="flex flex-wrap items-center gap-3">
            <Radio className="h-5 w-5 text-[hsl(var(--secondary))]" />
            <span className="text-sm font-medium text-[hsl(var(--foreground))]">Live Mode</span>
            <div className="flex-1" />
            <button
              data-testid="start-conductor"
              onClick={() => setLiveMode("conductor")}
              className="inline-flex items-center gap-1.5 rounded-md bg-[hsl(var(--secondary))] px-3 py-1.5 text-xs font-medium text-[hsl(var(--secondary-foreground))] hover:opacity-90 transition-opacity"
            >
              <Play className="h-3.5 w-3.5" /> Lead Session
            </button>
            <button
              data-testid="join-member"
              onClick={() => setLiveMode("member")}
              className="inline-flex items-center gap-1.5 rounded-md border border-[hsl(var(--border))] px-3 py-1.5 text-xs hover:bg-[hsl(var(--muted))] transition-colors"
            >
              <Users className="h-3.5 w-3.5" /> Join Session
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <Radio className="h-5 w-5 text-[hsl(var(--secondary))] animate-pulse" />
              <span className="text-sm font-medium text-[hsl(var(--foreground))]">
                {liveMode === "conductor" ? "Leading Session" : "Following Session"}
              </span>

              {/* Connection indicator */}
              <span
                data-testid="connection-status"
                className={`inline-flex items-center gap-1 text-xs ${
                  conductor.connected
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                {conductor.connected ? (
                  <Wifi className="h-3.5 w-3.5" />
                ) : (
                  <WifiOff className="h-3.5 w-3.5" />
                )}
                {conductor.connected ? "Connected" : "Disconnected"}
              </span>

              {/* Members count */}
              <span
                data-testid="members-count"
                className="inline-flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))]"
              >
                <Users className="h-3.5 w-3.5" />
                {conductor.roomState.members.length} member{conductor.roomState.members.length !== 1 ? "s" : ""}
              </span>

              <div className="flex-1" />
              <button
                data-testid="leave-session"
                onClick={handleLeaveLive}
                className="inline-flex items-center gap-1.5 rounded-md border border-[hsl(var(--destructive))] px-3 py-1.5 text-xs text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive))] hover:text-[hsl(var(--destructive-foreground))] transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" /> Leave
              </button>
            </div>

            {/* Conductor info */}
            {conductor.roomState.conductor && (
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Conductor: <span className="font-medium">{conductor.roomState.conductor.displayName}</span>
              </p>
            )}

            {/* Conductor left warning */}
            {liveMode === "member" && !conductor.roomState.conductor && (
              <div
                data-testid="conductor-left-warning"
                className="rounded-md bg-amber-100 p-2 text-xs text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
              >
                The conductor has left the session. Waiting for a new conductor...
              </div>
            )}

            {/* Now playing banner */}
            {songs.length > 0 && (
              <div
                data-testid="now-playing"
                className="rounded-md bg-[hsl(var(--secondary))]/10 p-2 text-sm"
              >
                <span className="text-[hsl(var(--muted-foreground))]">Now playing:</span>{" "}
                <span className="font-medium text-[hsl(var(--foreground))]">
                  {songs[conductor.currentSong]?.songTitle || "—"}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Song list */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-brand text-[hsl(var(--foreground))]">
            Songs ({songs.length})
          </h3>
          <button
            onClick={() => setShowAddSong(true)}
            className="inline-flex items-center gap-2 rounded-md bg-[hsl(var(--secondary))] px-3 py-1.5 text-xs font-medium text-[hsl(var(--secondary-foreground))] hover:opacity-90 transition-opacity"
          >
            <Plus className="h-3.5 w-3.5" /> Add Song
          </button>
        </div>

        {songs.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[hsl(var(--border))] p-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
            <Music className="mx-auto h-10 w-10 mb-2" />
            No songs in this setlist.
            <br />
            <button
              onClick={() => setShowAddSong(true)}
              className="mt-2 text-[hsl(var(--secondary))] hover:underline"
            >
              Add a song
            </button>
          </div>
        ) : (
          <div
            ref={songListRef}
            onScroll={handleScroll}
            className="divide-y divide-[hsl(var(--border))] rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))]"
          >
            {songs.map((item, idx) => (
              <div
                key={item.id}
                data-song-index={idx}
                className={`flex items-center gap-3 p-3 transition-colors ${
                  liveMode !== "off" && idx === conductor.currentSong
                    ? "bg-[hsl(var(--secondary))]/10 ring-1 ring-inset ring-[hsl(var(--secondary))]/30"
                    : ""
                }`}
              >
                {/* Reorder buttons */}
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => handleMoveUp(idx)}
                    disabled={idx === 0}
                    className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] disabled:opacity-30"
                    title="Move up"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => handleMoveDown(idx)}
                    disabled={idx === songs.length - 1}
                    className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] disabled:opacity-30"
                    title="Move down"
                  >
                    ▼
                  </button>
                </div>

                {/* Position number */}
                <span className="w-6 text-center text-xs text-[hsl(var(--muted-foreground))]">
                  {idx + 1}
                </span>

                {/* Song info */}
                <Link
                  to={`/songs/${item.songId}`}
                  className="flex-1 min-w-0 hover:text-[hsl(var(--secondary))]"
                >
                  <div className="font-medium truncate text-[hsl(var(--foreground))]">
                    {item.songTitle}
                  </div>
                  <div className="text-xs text-[hsl(var(--muted-foreground))]">
                    {[
                      item.key || item.songKey ? `Key: ${item.key || item.songKey}` : null,
                      item.songArtist,
                      item.songTempo ? `${item.songTempo} BPM` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                </Link>

                {/* Conductor: Go-to button */}
                {liveMode === "conductor" && idx !== conductor.currentSong && (
                  <button
                    onClick={() => conductor.goToSong(idx)}
                    className="inline-flex items-center gap-1 rounded-md bg-[hsl(var(--secondary))] px-2 py-1 text-xs font-medium text-[hsl(var(--secondary-foreground))] hover:opacity-90 transition-opacity"
                    title="Navigate to this song"
                  >
                    <Play className="h-3 w-3" /> Go
                  </button>
                )}

                {/* Now Playing indicator in live mode */}
                {liveMode !== "off" && idx === conductor.currentSong && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--secondary))]/20 px-2 py-0.5 text-xs font-medium text-[hsl(var(--secondary))]">
                    <Radio className="h-3 w-3 animate-pulse" /> Live
                  </span>
                )}

                {/* Remove */}
                <button
                  onClick={() => handleRemoveSong(item.id)}
                  className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))]"
                  title="Remove from setlist"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Song Modal */}
      {showAddSong && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-brand text-[hsl(var(--foreground))]">Add Song</h3>
              <button
                onClick={() => {
                  setShowAddSong(false);
                  setSearchQ("");
                }}
                className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <input
              type="text"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Search songs..."
              className="w-full rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] mb-3"
              autoFocus
            />
            <div className="max-h-60 overflow-y-auto divide-y divide-[hsl(var(--border))]">
              {availableSongs.length === 0 ? (
                <p className="py-4 text-center text-sm text-[hsl(var(--muted-foreground))]">
                  No songs found
                </p>
              ) : (
                availableSongs.map((song) => (
                  <button
                    key={song.id}
                    onClick={() => handleAddSong(song.id)}
                    className="w-full text-left p-3 hover:bg-[hsl(var(--muted))] transition-colors"
                  >
                    <div className="font-medium text-sm text-[hsl(var(--foreground))]">
                      {song.title}
                    </div>
                    <div className="text-xs text-[hsl(var(--muted-foreground))]">
                      {[song.key && `Key: ${song.key}`, song.artist]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
