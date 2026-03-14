import { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { songsApi, type Song } from "@/lib/api-client";
import { ChordProRenderer, AutoScroll } from "@/components/songs/ChordProRenderer";
import { toast } from "sonner";
import { ArrowLeft, Edit, Trash2, Download, Eye, EyeOff } from "lucide-react";

export function SongViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [song, setSong] = useState<Song | null>(null);
  const [loading, setLoading] = useState(true);
  const [showChords, setShowChords] = useState(true);
  const [fontSize, setFontSize] = useState(16);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    songsApi
      .get(id)
      .then((res) => setSong(res.song))
      .catch(() => toast.error("Song not found"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!id || !confirm("Delete this song permanently?")) return;
    try {
      await songsApi.delete(id);
      toast.success("Song deleted");
      navigate("/songs");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    }
  };

  const handleExport = async () => {
    if (!id) return;
    try {
      const res = await songsApi.exportChordPro(id);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${song?.title || "song"}.cho`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Export failed");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[hsl(var(--muted))] border-t-[hsl(var(--secondary))]" />
      </div>
    );
  }

  if (!song) {
    return (
      <div className="space-y-4 text-center py-20">
        <p className="text-[hsl(var(--muted-foreground))]">Song not found.</p>
        <Link to="/songs" className="text-sm text-[hsl(var(--secondary))] hover:underline">
          Back to songs
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <Link
          to="/songs"
          className="inline-flex items-center gap-1 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
        >
          <ArrowLeft className="h-4 w-4" /> Songs
        </Link>
        <div className="flex-1" />
        <AutoScroll containerRef={scrollRef} />
        <button
          onClick={() => setShowChords((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-md border border-[hsl(var(--border))] px-3 py-1.5 text-xs hover:bg-[hsl(var(--muted))] transition-colors"
          title={showChords ? "Hide chords" : "Show chords"}
        >
          {showChords ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          Chords
        </button>
        <select
          value={fontSize}
          onChange={(e) => setFontSize(Number(e.target.value))}
          className="rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-2 py-1.5 text-xs"
          title="Font size"
        >
          {[12, 14, 16, 18, 20, 24].map((s) => (
            <option key={s} value={s}>
              {s}px
            </option>
          ))}
        </select>
        <Link
          to={`/songs/${id}/edit`}
          className="inline-flex items-center gap-1.5 rounded-md border border-[hsl(var(--border))] px-3 py-1.5 text-xs hover:bg-[hsl(var(--muted))] transition-colors"
        >
          <Edit className="h-3.5 w-3.5" /> Edit
        </Link>
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-1.5 rounded-md border border-[hsl(var(--border))] px-3 py-1.5 text-xs hover:bg-[hsl(var(--muted))] transition-colors"
        >
          <Download className="h-3.5 w-3.5" /> Export
        </button>
        <button
          onClick={handleDelete}
          className="inline-flex items-center gap-1.5 rounded-md border border-[hsl(var(--destructive))] px-3 py-1.5 text-xs text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive))] hover:text-[hsl(var(--destructive-foreground))] transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </button>
      </div>

      {/* Song metadata */}
      <div className="space-y-1">
        <h2 className="text-2xl font-brand text-[hsl(var(--foreground))]">{song.title}</h2>
        <div className="flex flex-wrap gap-3 text-sm text-[hsl(var(--muted-foreground))]">
          {song.artist && <span>{song.artist}</span>}
          {song.key && <span>Key: {song.key}</span>}
          {song.tempo && <span>{song.tempo} BPM</span>}
          {song.tags && <span>{song.tags}</span>}
        </div>
      </div>

      {/* ChordPro renderer */}
      <div
        ref={scrollRef}
        className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 overflow-y-auto"
        style={{ maxHeight: "calc(100vh - 280px)" }}
      >
        <ChordProRenderer
          content={song.content}
          songKey={song.key}
          showChords={showChords}
          fontSize={fontSize}
        />
      </div>
    </div>
  );
}
