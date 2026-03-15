import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { songsApi, type Song } from "@/lib/api-client";
import { ALL_KEYS } from "@vpc-music/shared";
import { toast } from "sonner";
import { ArrowLeft, Save, Upload } from "lucide-react";

export function SongEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = !id;

  const [title, setTitle] = useState("");
  const [key, setKey] = useState("");
  const [tempo, setTempo] = useState("");
  const [artist, setArtist] = useState("");
  const [tags, setTags] = useState("");
  const [content, setContent] = useState("");
  const [isDraft, setIsDraft] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  // Load existing song
  useEffect(() => {
    if (!id) return;
    songsApi
      .get(id)
      .then((res) => {
        const s = res.song;
        setTitle(s.title);
        setKey(s.key || "");
        setTempo(s.tempo ? String(s.tempo) : "");
        setArtist(s.artist || "");
        setTags(s.tags || "");
        setContent(s.content);
        setIsDraft(!!s.isDraft);
      })
      .catch(() => toast.error("Song not found"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    setSaving(true);
    try {
      const data: Partial<Song> = {
        title: title.trim(),
        key: key || undefined,
        tempo: tempo ? Number(tempo) : undefined,
        artist: artist.trim() || undefined,
        tags: tags.trim() || undefined,
        content,
        isDraft,
      };

      if (isNew) {
        const res = await songsApi.create(data);
        toast.success("Song created!");
        navigate(`/songs/${res.song.id}`);
      } else {
        await songsApi.update(id!, data);
        toast.success("Song updated!");
        navigate(`/songs/${id}`);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const ext = file.name.split(".").pop()?.toLowerCase();

    if (ext === "cho" || ext === "chordpro" || ext === "chopro") {
      // ChordPro format — load directly
      setContent(text);
      // Try to extract title from {title: ...} directive
      const titleMatch = text.match(/\{title:\s*(.*?)\}/);
      if (titleMatch && !title) setTitle(titleMatch[1]);
      const keyMatch = text.match(/\{key:\s*(.*?)\}/);
      if (keyMatch && !key) setKey(keyMatch[1]);
      toast.success("ChordPro file loaded");
    } else if (ext === "pdf") {
      // PDF — send binary to API for PDF.co conversion pipeline
      try {
        toast.info("Processing PDF — this may take a moment…");
        const res = await songsApi.importPdf(file);
        toast.success("PDF imported — review and save");
        navigate(`/songs/${res.song.id}`);
      } catch (err: any) {
        toast.error(err.message || "PDF import failed");
      }
    } else if (ext === "chrd" || ext === "txt") {
      // .chrd / plain text — send to API for conversion
      try {
        const res = await songsApi.importChrd({
          filename: file.name,
          content: text,
        });
        toast.success("File imported — review and save");
        navigate(`/songs/${res.song.id}`);
      } catch (err: any) {
        toast.error(err.message || "Import failed");
      }
    } else {
      toast.error("Unsupported file format. Use .cho, .chordpro, .chrd, .txt, or .pdf");
    }
    e.target.value = ""; // reset file input
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[hsl(var(--muted))] border-t-[hsl(var(--secondary))]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          to={isNew ? "/songs" : `/songs/${id}`}
          className="inline-flex items-center gap-1 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
        >
          <ArrowLeft className="h-4 w-4" /> {isNew ? "Songs" : "Back"}
        </Link>
        <h2 className="text-2xl font-brand text-[hsl(var(--foreground))]">
          {isNew ? "New Song" : "Edit Song"}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Metadata grid */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <label className="text-sm font-medium text-[hsl(var(--foreground))]">Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
              placeholder="Song title"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[hsl(var(--foreground))]">Key</label>
            <select
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="w-full rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm text-[hsl(var(--foreground))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
            >
              <option value="">Select key</option>
              {ALL_KEYS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[hsl(var(--foreground))]">Tempo (BPM)</label>
            <input
              type="number"
              min="20"
              max="300"
              value={tempo}
              onChange={(e) => setTempo(e.target.value)}
              className="w-full rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
              placeholder="120"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[hsl(var(--foreground))]">Artist</label>
            <input
              type="text"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              className="w-full rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
              placeholder="Artist or composer"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[hsl(var(--foreground))]">Tags</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
              placeholder="worship, hymn, contemporary"
            />
          </div>
        </div>

        {/* Import */}
        <div className="flex items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-[hsl(var(--border))] px-4 py-2 text-sm hover:bg-[hsl(var(--muted))] transition-colors">
            <Upload className="h-4 w-4" />
            Import file
            <input
              type="file"
              accept=".cho,.chordpro,.chopro,.chrd,.txt,.pdf"
              onChange={handleImport}
              className="hidden"
            />
          </label>
          <span className="text-xs text-[hsl(var(--muted-foreground))]">
            .cho, .chordpro, .chrd, .txt, .pdf
          </span>
        </div>

        {/* ChordPro editor */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-[hsl(var(--foreground))]">
            Content (ChordPro format)
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={20}
            className="w-full rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 font-mono text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
            placeholder={`{title: Amazing Grace}
{key: G}

{comment: Verse 1}
[G]Amazing [G/B]grace, how [C]sweet the [G]sound
That [G]saved a [Em]wretch like [D]me`}
          />
        </div>

        {/* Draft toggle */}
        <label className="flex items-center gap-2 text-sm text-[hsl(var(--foreground))]">
          <input
            type="checkbox"
            checked={isDraft}
            onChange={(e) => setIsDraft(e.target.checked)}
            className="rounded accent-[hsl(var(--secondary))]"
          />
          Save as draft
        </label>

        {/* Submit */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-md bg-[hsl(var(--secondary))] px-6 py-2 text-sm font-medium text-[hsl(var(--secondary-foreground))] hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : isNew ? "Create Song" : "Update Song"}
          </button>
          <Link
            to={isNew ? "/songs" : `/songs/${id}`}
            className="inline-flex items-center rounded-md border border-[hsl(var(--border))] px-6 py-2 text-sm hover:bg-[hsl(var(--muted))] transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
