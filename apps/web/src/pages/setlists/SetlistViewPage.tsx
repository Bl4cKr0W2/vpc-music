import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  setlistsApi,
  songsApi,
  type Setlist,
  type SetlistSongItem,
  type Song,
} from "@/lib/api-client";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, GripVertical, Music, X } from "lucide-react";
import { ALL_KEYS } from "@vpc-music/shared";

export function SetlistViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [setlist, setSetlist] = useState<Setlist | null>(null);
  const [songs, setSongs] = useState<SetlistSongItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddSong, setShowAddSong] = useState(false);
  const [availableSongs, setAvailableSongs] = useState<Song[]>([]);
  const [searchQ, setSearchQ] = useState("");

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
        <button
          onClick={handleDeleteSetlist}
          className="inline-flex items-center gap-1.5 rounded-md border border-[hsl(var(--destructive))] px-3 py-1.5 text-xs text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive))] hover:text-[hsl(var(--destructive-foreground))] transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </button>
      </div>

      {/* Setlist info */}
      <div>
        <h2 className="text-2xl font-brand text-[hsl(var(--foreground))]">{setlist.name}</h2>
        {setlist.category && (
          <p className="text-sm text-[hsl(var(--muted-foreground))]">{setlist.category}</p>
        )}
        {setlist.notes && (
          <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{setlist.notes}</p>
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
          <div className="divide-y divide-[hsl(var(--border))] rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
            {songs.map((item, idx) => (
              <div key={item.id} className="flex items-center gap-3 p-3">
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
