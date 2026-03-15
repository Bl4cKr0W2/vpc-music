import { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { songsApi, shareApi, songUsageApi, songHistoryApi, variationsApi, stickyNotesApi, type Song, type SongUsage, type SongVariation, type SongEdit, type StickyNote } from "@/lib/api-client";
import { ChordProRenderer, AutoScroll, type ChordProRendererHandle } from "@/components/songs/ChordProRenderer";
import { ShareManageDialog } from "@/components/songs/ShareManageDialog";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { ALL_KEYS } from "@vpc-music/shared";
import { toast } from "sonner";
import { ArrowLeft, Edit, Trash2, Download, Eye, EyeOff, Share2, Check, Copy, CalendarPlus, History, X, Printer, Settings2, Hash, ChevronDown, Layers, Plus, Pencil, FileText, StickyNote as StickyNoteIcon } from "lucide-react";

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
  const chordProRef = useRef<ChordProRendererHandle>(null);
  const [usages, setUsages] = useState<SongUsage[]>([]);
  const [showUsageForm, setShowUsageForm] = useState(false);
  const [usageDate, setUsageDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [usageNotes, setUsageNotes] = useState("");
  const [loggingUsage, setLoggingUsage] = useState(false);
  const [showShareManage, setShowShareManage] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [editHistory, setEditHistory] = useState<SongEdit[]>([]);
  const [showEditHistory, setShowEditHistory] = useState(false);

  // Sticky notes state
  const [stickyNotes, setStickyNotes] = useState<StickyNote[]>([]);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [editingNote, setEditingNote] = useState<StickyNote | null>(null);
  const [noteContent, setNoteContent] = useState("");
  const [noteColor, setNoteColor] = useState("yellow");
  const [savingNote, setSavingNote] = useState(false);

  // Variation state
  const [variations, setVariations] = useState<SongVariation[]>([]);
  const [activeVariationId, setActiveVariationId] = useState<string | null>(null);
  const [showVariationForm, setShowVariationForm] = useState(false);
  const [editingVariation, setEditingVariation] = useState<SongVariation | null>(null);
  const [varName, setVarName] = useState("");
  const [varKey, setVarKey] = useState("");
  const [varContent, setVarContent] = useState("");
  const [savingVariation, setSavingVariation] = useState(false);

  // Keyboard shortcuts & foot pedal support (PageDown/Up, Arrow keys, etc.)
  const isModalOpen = showUsageForm || showShareManage || showVariationForm;
  useKeyboardShortcuts({
    scrollRef,
    onTransposeUp: () => chordProRef.current?.transposeUp(),
    onTransposeDown: () => chordProRef.current?.transposeDown(),
    enabled: !isModalOpen,
  });

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    songsApi
      .get(id)
      .then((res) => {
        setSong(res.song);
        setVariations(res.variations || []);
      })
      .catch(() => toast.error("Song not found"))
      .finally(() => setLoading(false));
  }, [id]);

  // Load usage history
  useEffect(() => {
    if (!id) return;
    songUsageApi.list(id).then((res) => setUsages(res.usages)).catch(() => {});
  }, [id]);

  // Load edit history
  useEffect(() => {
    if (!id) return;
    songHistoryApi.list(id).then((res) => setEditHistory(res.history)).catch(() => {});
  }, [id]);

  // Load sticky notes
  useEffect(() => {
    if (!id) return;
    stickyNotesApi.list(id).then((res) => setStickyNotes(res.notes)).catch(() => {});
  }, [id]);

  const handleSaveNote = async () => {
    if (!id || !noteContent.trim()) return;
    setSavingNote(true);
    try {
      if (editingNote) {
        const res = await stickyNotesApi.update(id, editingNote.id, {
          content: noteContent.trim(),
          color: noteColor,
        });
        setStickyNotes((prev) => prev.map((n) => (n.id === editingNote.id ? res.note : n)));
        toast.success("Note updated");
      } else {
        const res = await stickyNotesApi.create(id, {
          content: noteContent.trim(),
          color: noteColor,
        });
        setStickyNotes((prev) => [...prev, res.note]);
        toast.success("Note added");
      }
      setShowNoteForm(false);
      setEditingNote(null);
      setNoteContent("");
      setNoteColor("yellow");
    } catch (err: any) {
      toast.error(err.message || "Failed to save note");
    } finally {
      setSavingNote(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!id || !confirm("Delete this note?")) return;
    try {
      await stickyNotesApi.delete(id, noteId);
      setStickyNotes((prev) => prev.filter((n) => n.id !== noteId));
      toast.success("Note deleted");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete note");
    }
  };

  const openEditNote = (note: StickyNote) => {
    setEditingNote(note);
    setNoteContent(note.content);
    setNoteColor(note.color);
    setShowNoteForm(true);
  };

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
    setShowExportMenu(false);
  };

  const handleExportOnSong = async () => {
    if (!id) return;
    try {
      const res = await songsApi.exportOnSong(id);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${song?.title || "song"}.onsong`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Export failed");
    }
    setShowExportMenu(false);
  };

  const handleExportPdf = () => {
    if (!id) return;
    window.open(songsApi.exportPdf(id), "_blank");
    setShowExportMenu(false);
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

  // ── Variation handlers ───────────────────────────
  const activeVariation = activeVariationId
    ? variations.find((v) => v.id === activeVariationId) ?? null
    : null;
  const displayContent = activeVariation ? activeVariation.content : song?.content ?? "";
  const displayKey = activeVariation?.key ?? song?.key;

  const openNewVariation = () => {
    setEditingVariation(null);
    setVarName("");
    setVarKey(song?.key || "");
    setVarContent(song?.content || "");
    setShowVariationForm(true);
  };

  const openEditVariation = (v: SongVariation) => {
    setEditingVariation(v);
    setVarName(v.name);
    setVarKey(v.key || "");
    setVarContent(v.content);
    setShowVariationForm(true);
  };

  const handleSaveVariation = async () => {
    if (!id || !varName.trim() || !varContent.trim()) {
      toast.error("Name and content are required");
      return;
    }
    setSavingVariation(true);
    try {
      if (editingVariation) {
        const res = await variationsApi.update(id, editingVariation.id, {
          name: varName.trim(),
          content: varContent,
          key: varKey || undefined,
        });
        setVariations((prev) =>
          prev.map((v) => (v.id === editingVariation.id ? res.variation : v))
        );
        toast.success("Variation updated");
      } else {
        const res = await variationsApi.create(id, {
          name: varName.trim(),
          content: varContent,
          key: varKey || undefined,
        });
        setVariations((prev) => [...prev, res.variation]);
        setActiveVariationId(res.variation.id);
        toast.success("Variation created");
      }
      setShowVariationForm(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save variation");
    } finally {
      setSavingVariation(false);
    }
  };

  const handleDeleteVariation = async (varId: string) => {
    if (!id || !confirm("Delete this variation?")) return;
    try {
      await variationsApi.delete(id, varId);
      setVariations((prev) => prev.filter((v) => v.id !== varId));
      if (activeVariationId === varId) setActiveVariationId(null);
      toast.success("Variation deleted");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete variation");
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
        {showChords && displayKey && (
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
        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="inline-flex items-center gap-1.5 rounded-md border border-[hsl(var(--border))] px-3 py-1.5 text-xs hover:bg-[hsl(var(--muted))] transition-colors"
          >
            <Download className="h-3.5 w-3.5" /> Export <ChevronDown className="h-3 w-3" />
          </button>
          {showExportMenu && (
            <div className="absolute right-0 top-full mt-1 z-10 w-44 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] py-1 shadow-lg">
              <button
                onClick={handleExport}
                className="w-full px-3 py-1.5 text-left text-xs hover:bg-[hsl(var(--muted))] transition-colors"
              >
                ChordPro (.cho)
              </button>
              <button
                onClick={handleExportOnSong}
                className="w-full px-3 py-1.5 text-left text-xs hover:bg-[hsl(var(--muted))] transition-colors"
              >
                OnSong (.onsong)
              </button>
              <button
                onClick={handleExportPdf}
                className="w-full px-3 py-1.5 text-left text-xs hover:bg-[hsl(var(--muted))] transition-colors"
              >
                PDF (print)
              </button>
            </div>
          )}
        </div>
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
        <h2 className="text-2xl font-brand text-[hsl(var(--foreground))]">
          {song.title}
          {activeVariation && (
            <span className="ml-2 text-base font-normal text-[hsl(var(--secondary))]">
              — {activeVariation.name}
            </span>
          )}
        </h2>
        <div className="flex flex-wrap gap-3 text-sm text-[hsl(var(--muted-foreground))]">
          {song.artist && <span>{song.artist}</span>}
          {displayKey && <span>Key: {displayKey}</span>}
          {song.tempo && <span>{song.tempo} BPM</span>}
          {song.tags && <span>{song.tags}</span>}
        </div>
      </div>

      {/* Variation Tabs */}
      {(variations.length > 0 || true) && (
        <div className="flex flex-wrap items-center gap-2 print-hidden" data-testid="variation-tabs">
          <Layers className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
          <button
            onClick={() => setActiveVariationId(null)}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              !activeVariationId
                ? "bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))]"
                : "border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]"
            }`}
          >
            Original
          </button>
          {variations.map((v) => (
            <div key={v.id} className="group relative flex items-center">
              <button
                onClick={() => setActiveVariationId(v.id)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  activeVariationId === v.id
                    ? "bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))]"
                    : "border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]"
                }`}
              >
                {v.name}
                {v.key && v.key !== song.key && (
                  <span className="ml-1 opacity-60">({v.key})</span>
                )}
              </button>
              <div className="hidden group-hover:flex items-center gap-0.5 ml-1">
                <button
                  onClick={() => openEditVariation(v)}
                  className="rounded p-0.5 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
                  title="Edit variation"
                >
                  <Pencil className="h-3 w-3" />
                </button>
                <button
                  onClick={() => handleDeleteVariation(v.id)}
                  className="rounded p-0.5 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] transition-colors"
                  title="Delete variation"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
          <button
            onClick={openNewVariation}
            className="inline-flex items-center gap-1 rounded-md border border-dashed border-[hsl(var(--border))] px-2.5 py-1 text-xs text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] transition-colors"
            title="Create a new variation"
          >
            <Plus className="h-3 w-3" /> Variation
          </button>
        </div>
      )}

      {/* ChordPro renderer */}
      <div
        ref={scrollRef}
        className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 overflow-y-auto print-sheet"
        style={{ maxHeight: "calc(100vh - 280px)" }}
      >
        <ChordProRenderer
          ref={chordProRef}
          content={displayContent}
          songKey={displayKey}
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

      {/* Edit History */}
      {editHistory.length > 0 && (
        <div className="space-y-2 print-hidden">
          <button
            onClick={() => setShowEditHistory((v) => !v)}
            className="flex items-center gap-2 text-lg font-brand text-[hsl(var(--foreground))] hover:text-[hsl(var(--secondary))] transition-colors"
          >
            <FileText className="h-4 w-4" /> Edit History
            <ChevronDown className={`h-4 w-4 transition-transform ${showEditHistory ? "rotate-180" : ""}`} />
            <span className="text-xs font-normal text-[hsl(var(--muted-foreground))]">
              ({editHistory.length} change{editHistory.length !== 1 ? "s" : ""})
            </span>
          </button>
          {showEditHistory && (
            <div className="divide-y divide-[hsl(var(--border))] rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] max-h-64 overflow-y-auto">
              {editHistory.map((edit) => (
                <div key={edit.id} className="px-4 py-2.5 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-[hsl(var(--foreground))] capitalize">
                      {edit.field === "content" ? "Content" : edit.field}
                    </span>
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">
                      {edit.createdAt && new Date(edit.createdAt).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  {edit.field !== "content" && (
                    <div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                      <span className="line-through text-[hsl(var(--destructive))]">
                        {edit.oldValue || "(empty)"}
                      </span>
                      {" → "}
                      <span className="text-[hsl(var(--secondary))]">
                        {edit.newValue || "(empty)"}
                      </span>
                    </div>
                  )}
                  {edit.field === "content" && (
                    <div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                      Content updated
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sticky Notes */}
      <div className="space-y-2 print-hidden">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-brand text-[hsl(var(--foreground))]">
            <StickyNoteIcon className="h-4 w-4" /> Notes
            {stickyNotes.length > 0 && (
              <span className="text-xs font-normal text-[hsl(var(--muted-foreground))]">
                ({stickyNotes.length})
              </span>
            )}
          </h3>
          <button
            onClick={() => {
              setEditingNote(null);
              setNoteContent("");
              setNoteColor("yellow");
              setShowNoteForm(true);
            }}
            className="inline-flex items-center gap-1 rounded-md border border-dashed border-[hsl(var(--border))] px-2.5 py-1 text-xs text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] transition-colors"
          >
            <Plus className="h-3 w-3" /> Add Note
          </button>
        </div>
        {stickyNotes.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {stickyNotes.map((note) => {
              const colorMap: Record<string, string> = {
                yellow: "bg-yellow-100 border-yellow-300 dark:bg-yellow-900/30 dark:border-yellow-700",
                blue: "bg-blue-100 border-blue-300 dark:bg-blue-900/30 dark:border-blue-700",
                green: "bg-green-100 border-green-300 dark:bg-green-900/30 dark:border-green-700",
                pink: "bg-pink-100 border-pink-300 dark:bg-pink-900/30 dark:border-pink-700",
                purple: "bg-purple-100 border-purple-300 dark:bg-purple-900/30 dark:border-purple-700",
              };
              return (
                <div
                  key={note.id}
                  className={`group relative rounded-lg border p-3 ${colorMap[note.color] || colorMap.yellow}`}
                  data-testid="sticky-note"
                >
                  <p className="whitespace-pre-wrap text-sm text-[hsl(var(--foreground))]">
                    {note.content}
                  </p>
                  {note.createdAt && (
                    <p className="mt-2 text-[10px] text-[hsl(var(--muted-foreground))]">
                      {new Date(note.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  )}
                  <div className="absolute top-1.5 right-1.5 hidden group-hover:flex items-center gap-0.5">
                    <button
                      onClick={() => openEditNote(note)}
                      className="rounded p-1 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-black/10 transition-colors"
                      title="Edit note"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="rounded p-1 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] hover:bg-black/10 transition-colors"
                      title="Delete note"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {stickyNotes.length === 0 && (
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            No notes yet. Add a personal note for this song.
          </p>
        )}
      </div>

      {/* Sticky Note Form Modal */}
      {showNoteForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 print-hidden">
          <div className="w-full max-w-sm rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-brand text-[hsl(var(--foreground))]">
                {editingNote ? "Edit Note" : "New Note"}
              </h3>
              <button
                onClick={() => { setShowNoteForm(false); setEditingNote(null); }}
                className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
                  Note
                </label>
                <textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  rows={4}
                  placeholder="Add your note..."
                  className="w-full rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
                  data-testid="note-content-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
                  Color
                </label>
                <div className="flex gap-2">
                  {["yellow", "blue", "green", "pink", "purple"].map((c) => {
                    const dotColors: Record<string, string> = {
                      yellow: "bg-yellow-400",
                      blue: "bg-blue-400",
                      green: "bg-green-400",
                      pink: "bg-pink-400",
                      purple: "bg-purple-400",
                    };
                    return (
                      <button
                        key={c}
                        onClick={() => setNoteColor(c)}
                        className={`h-7 w-7 rounded-full ${dotColors[c]} transition-all ${
                          noteColor === c
                            ? "ring-2 ring-offset-2 ring-[hsl(var(--secondary))] ring-offset-[hsl(var(--card))]"
                            : "hover:scale-110"
                        }`}
                        title={c}
                        data-testid={`note-color-${c}`}
                      />
                    );
                  })}
                </div>
              </div>
              <button
                onClick={handleSaveNote}
                disabled={savingNote || !noteContent.trim()}
                className="w-full rounded-md bg-[hsl(var(--secondary))] px-4 py-2 text-sm font-medium text-[hsl(var(--secondary-foreground))] hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {savingNote ? "Saving..." : editingNote ? "Update Note" : "Add Note"}
              </button>
            </div>
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

      {/* Variation Create/Edit Modal */}
      {showVariationForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 print-hidden">
          <div className="w-full max-w-lg rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-brand text-[hsl(var(--foreground))]">
                {editingVariation ? "Edit Variation" : "New Variation"}
              </h3>
              <button
                onClick={() => setShowVariationForm(false)}
                className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-[hsl(var(--foreground))]">
                    Variation Name *
                  </label>
                  <input
                    type="text"
                    value={varName}
                    onChange={(e) => setVarName(e.target.value)}
                    placeholder="e.g. Acoustic, My version"
                    className="w-full rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
                    data-testid="variation-name-input"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-[hsl(var(--foreground))]">
                    Key
                  </label>
                  <select
                    value={varKey}
                    onChange={(e) => setVarKey(e.target.value)}
                    className="w-full rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm text-[hsl(var(--foreground))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
                    data-testid="variation-key-select"
                  >
                    <option value="">Same as original</option>
                    {ALL_KEYS.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-[hsl(var(--foreground))]">
                  Content (ChordPro) *
                </label>
                <textarea
                  value={varContent}
                  onChange={(e) => setVarContent(e.target.value)}
                  rows={12}
                  className="w-full rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 font-mono text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
                  data-testid="variation-content-textarea"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleSaveVariation}
                  disabled={savingVariation || !varName.trim() || !varContent.trim()}
                  className="inline-flex items-center gap-2 rounded-md bg-[hsl(var(--secondary))] px-6 py-2 text-sm font-medium text-[hsl(var(--secondary-foreground))] hover:opacity-90 transition-opacity disabled:opacity-50"
                  data-testid="variation-save-btn"
                >
                  {savingVariation
                    ? "Saving..."
                    : editingVariation
                      ? "Update Variation"
                      : "Create Variation"}
                </button>
                <button
                  onClick={() => setShowVariationForm(false)}
                  className="inline-flex items-center rounded-md border border-[hsl(var(--border))] px-6 py-2 text-sm hover:bg-[hsl(var(--muted))] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
