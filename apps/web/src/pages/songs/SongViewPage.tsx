import { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { songsApi, shareApi, songUsageApi, type Song, type SongUsage } from "@/lib/api-client";
import { ChordProRenderer, AutoScroll } from "@/components/songs/ChordProRenderer";
import { ShareManageDialog } from "@/components/songs/ShareManageDialog";
import { toast } from "sonner";
import { ArrowLeft, Edit, Trash2, Download, Eye, EyeOff, Share2, Check, Copy, CalendarPlus, History, X, Printer, Settings2, Hash } from "lucide-react";

export function SongViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [song, setSong] = useState<Song | null>(null);
  const [loading, setLoading] = useState(true);
  const [showChords, setShowChords] = useState(true);
  const [nashville, setNashville] = useState(false);
  const [fontSize, setFontSize] = useState(16);
  const [sharing, setSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [usages, setUsages] = useState<SongUsage[]>([]);
  const [showUsageForm, setShowUsageForm] = useState(false);
  const [usageDate, setUsageDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [usageNotes, setUsageNotes] = useState("");
  const [loggingUsage, setLoggingUsage] = useState(false);
  const [showShareManage, setShowShareManage] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    songsApi
      .get(id)
      .then((res) => setSong(res.song))
      .catch(() => toast.error("Song not found"))
      .finally(() => setLoading(false));
  }, [id]);

  // Load usage history
  useEffect(() => {
    if (!id) return;
    songUsageApi.list(id).then((res) => setUsages(res.usages)).catch(() => {});
  }, [id]);

  const handleLogUsage = async () => {
    if (!id || !usageDate) return;
    setLoggingUsage(true);
    try {
      const res = await songUsageApi.log(id, {
        usedAt: usageDate,
        notes: usageNotes.trim() || undefined,
      });
      setUsages((prev) => [res.usage, ...prev]);
      toast.success("Usage logged");
      setShowUsageForm(false);
      setUsageNotes("");
    } catch (err: any) {
      toast.error(err.message || "Failed to log usage");
    } finally {
      setLoggingUsage(false);
    }
  };

  const handleDeleteUsage = async (usageId: string) => {
    if (!id) return;
    try {
      await songUsageApi.remove(id, usageId);
      setUsages((prev) => prev.filter((u) => u.id !== usageId));
      toast.success("Usage record removed");
    } catch (err: any) {
      toast.error(err.message || "Failed to remove");
    }
  };

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

  const handleShare = async () => {
    if (!id) return;
    setSharing(true);
    try {
      const { shareUrl: url } = await shareApi.create(id);
      const fullUrl = `${window.location.origin}${url}`;
      setShareUrl(fullUrl);
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      toast.success("Share link copied to clipboard");
      setTimeout(() => setCopied(false), 3000);
    } catch (err: any) {
      toast.error(err.message || "Failed to generate share link");
    } finally {
      setSharing(false);
    }
  };

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success("Link copied");
    setTimeout(() => setCopied(false), 3000);
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
      <div className="flex flex-wrap items-center gap-3 print-hidden">
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
        {showChords && song.key && (
          <button
            onClick={() => setNashville((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs transition-colors ${
              nashville
                ? "border-[hsl(var(--secondary))] bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))]"
                : "border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]"
            }`}
            title={nashville ? "Show chord names" : "Show Nashville numbers"}
          >
            <Hash className="h-3.5 w-3.5" />
            Nashville
          </button>
        )}
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
        <button
          onClick={shareUrl ? handleCopyLink : handleShare}
          disabled={sharing}
          className="inline-flex items-center gap-1.5 rounded-md border border-[hsl(var(--border))] px-3 py-1.5 text-xs hover:bg-[hsl(var(--muted))] transition-colors disabled:opacity-50"
          title="Generate a read-only share link"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-green-500" />
          ) : shareUrl ? (
            <Copy className="h-3.5 w-3.5" />
          ) : (
            <Share2 className="h-3.5 w-3.5" />
          )}
          {sharing ? "Sharing..." : copied ? "Copied!" : shareUrl ? "Copy Link" : "Share"}
        </button>
        <button
          onClick={() => setShowShareManage(true)}
          className="inline-flex items-center gap-1.5 rounded-md border border-[hsl(var(--border))] px-3 py-1.5 text-xs hover:bg-[hsl(var(--muted))] transition-colors"
          title="Manage share links"
        >
          <Settings2 className="h-3.5 w-3.5" /> Links
        </button>
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
          onClick={() => setShowUsageForm(true)}
          className="inline-flex items-center gap-1.5 rounded-md bg-[hsl(var(--secondary))] px-3 py-1.5 text-xs font-medium text-[hsl(var(--secondary-foreground))] hover:opacity-90 transition-opacity"
          title="Log when this song was used in a service"
        >
          <CalendarPlus className="h-3.5 w-3.5" /> Log Usage
        </button>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 rounded-md border border-[hsl(var(--border))] px-3 py-1.5 text-xs hover:bg-[hsl(var(--muted))] transition-colors"
          title="Print chord chart"
        >
          <Printer className="h-3.5 w-3.5" /> Print
        </button>
        <button
          onClick={handleDelete}
          className="inline-flex items-center gap-1.5 rounded-md border border-[hsl(var(--destructive))] px-3 py-1.5 text-xs text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive))] hover:text-[hsl(var(--destructive-foreground))] transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </button>
      </div>

      {/* Song metadata */}
      <div className="space-y-1 print-meta">
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
        className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 overflow-y-auto print-sheet"
        style={{ maxHeight: "calc(100vh - 280px)" }}
      >
        <ChordProRenderer
          content={song.content}
          songKey={song.key}
          showChords={showChords}
          nashville={nashville}
          fontSize={fontSize}
        />
      </div>

      {/* Usage History */}
      {usages.length > 0 && (
        <div className="space-y-2 print-hidden">
          <h3 className="flex items-center gap-2 text-lg font-brand text-[hsl(var(--foreground))]">
            <History className="h-4 w-4" /> Usage History
          </h3>
          <div className="divide-y divide-[hsl(var(--border))] rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
            {usages.map((u) => (
              <div key={u.id} className="flex items-center justify-between px-4 py-2.5 group">
                <div>
                  <span className="text-sm font-medium text-[hsl(var(--foreground))]">
                    {new Date(u.usedAt + "T00:00:00").toLocaleDateString(undefined, {
                      weekday: "short",
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  {u.notes && (
                    <span className="ml-2 text-xs text-[hsl(var(--muted-foreground))]">
                      — {u.notes}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleDeleteUsage(u.id)}
                  className="opacity-0 group-hover:opacity-100 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] transition-all"
                  title="Remove usage record"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Log Usage Modal */}
      {showUsageForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 print-hidden">
          <div className="w-full max-w-sm rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-brand text-[hsl(var(--foreground))]">Log Song Usage</h3>
              <button
                onClick={() => setShowUsageForm(false)}
                className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
                  Date Used
                </label>
                <input
                  type="date"
                  value={usageDate}
                  onChange={(e) => setUsageDate(e.target.value)}
                  className="w-full rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm text-[hsl(var(--foreground))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
                  Notes <span className="text-xs text-[hsl(var(--muted-foreground))]">(optional)</span>
                </label>
                <input
                  type="text"
                  value={usageNotes}
                  onChange={(e) => setUsageNotes(e.target.value)}
                  placeholder="e.g. Sunday morning service"
                  className="w-full rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
                />
              </div>
              <button
                onClick={handleLogUsage}
                disabled={loggingUsage || !usageDate}
                className="w-full rounded-md bg-[hsl(var(--secondary))] px-4 py-2 text-sm font-medium text-[hsl(var(--secondary-foreground))] hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loggingUsage ? "Logging..." : "Log Usage"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Share Management Dialog */}
      {id && (
        <ShareManageDialog
          songId={id}
          open={showShareManage}
          onClose={() => setShowShareManage(false)}
        />
      )}
    </div>
  );
}
