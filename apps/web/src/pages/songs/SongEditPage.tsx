import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link, useSearchParams } from "react-router-dom";
import { songsApi, variationsApi, type Song, type SongVariation } from "@/lib/api-client";
import { ALL_KEYS } from "@vpc-music/shared";
import { toast } from "sonner";
import { ArrowLeft, Save, Upload, Layers } from "lucide-react";
import { ChordProEditor } from "@/components/songs/ChordProEditor";
import { TagInput } from "@/components/songs/TagInput";

export function SongEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isNew = !id;
  const requestedVariationId = searchParams.get("variation");

  const [title, setTitle] = useState("");
  const [key, setKey] = useState("");
  const [tempo, setTempo] = useState("");
  const [artist, setArtist] = useState("");
  const [tags, setTags] = useState("");
  const [content, setContent] = useState("");
  const [isDraft, setIsDraft] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [songRecord, setSongRecord] = useState<Song | null>(null);
  const [variations, setVariations] = useState<SongVariation[]>([]);
  const [editingVariationId, setEditingVariationId] = useState<string | null>(null);

  const metadata = useMemo(
    () => ({ title, artist, key, tempo }),
    [title, artist, key, tempo],
  );
  const currentVariation = useMemo(
    () => variations.find((variation) => variation.id === editingVariationId) ?? null,
    [variations, editingVariationId],
  );

  // Load existing song
  useEffect(() => {
    if (!id) return;
    songsApi
      .get(id)
      .then((res) => {
        const s = res.song;
        setSongRecord(s);
        setVariations(res.variations || []);
        setTitle(s.title);
        setTempo(s.tempo ? String(s.tempo) : "");
        setArtist(s.artist || "");
        setTags(s.tags || "");
        setIsDraft(!!s.isDraft);
      })
      .catch(() => toast.error("Song not found"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!songRecord) return;
    const selectedVariation = requestedVariationId
      ? variations.find((variation) => variation.id === requestedVariationId) ?? null
      : null;

    setEditingVariationId(selectedVariation?.id ?? null);
    setKey(selectedVariation?.key || songRecord.key || "");
    setContent(selectedVariation?.content || songRecord.content);
  }, [requestedVariationId, variations, songRecord]);

  const handleEditTargetChange = (variationId: string) => {
    const nextVariationId = variationId || null;
    const nextVariation = nextVariationId
      ? variations.find((variation) => variation.id === nextVariationId) ?? null
      : null;

    setEditingVariationId(nextVariation?.id ?? null);
    setKey(nextVariation?.key || songRecord?.key || "");
    setContent(nextVariation?.content || songRecord?.content || "");

    const nextSearchParams = new URLSearchParams(searchParams);
    if (nextVariation?.id) {
      nextSearchParams.set("variation", nextVariation.id);
    } else {
      nextSearchParams.delete("variation");
    }
    setSearchParams(nextSearchParams, { replace: true });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    setSaving(true);
    try {
      const sharedSongData: Partial<Song> = {
        title: title.trim(),
        tempo: tempo ? Number(tempo) : undefined,
        artist: artist.trim() || undefined,
        tags: tags.trim() || undefined,
        isDraft,
      };

      if (isNew) {
        const data: Partial<Song> = {
          ...sharedSongData,
          key: key || undefined,
          content,
        };
        const res = await songsApi.create(data);
        toast.success("Song created!");
        navigate(`/songs/${res.song.id}`);
      } else if (currentVariation) {
        await Promise.all([
          songsApi.update(id!, sharedSongData),
          variationsApi.update(id!, currentVariation.id, {
            content,
            key: key || undefined,
          }),
        ]);
        toast.success(`Updated variation: ${currentVariation.name}`);
        navigate(`/songs/${id}?variation=${currentVariation.id}`);
      } else {
        const data: Partial<Song> = {
          ...sharedSongData,
          key: key || undefined,
          content,
        };
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
          to={isNew ? "/songs" : currentVariation ? `/songs/${id}?variation=${currentVariation.id}` : `/songs/${id}`}
          className="inline-flex items-center gap-1 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
        >
          <ArrowLeft className="h-4 w-4" /> {isNew ? "Songs" : "Back"}
        </Link>
        <h2 className="text-2xl font-brand text-[hsl(var(--foreground))]">
          {isNew ? "New Song" : "Edit Song"}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {!isNew && variations.length > 0 && (
          <div className="space-y-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/40 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 text-sm font-medium text-[hsl(var(--foreground))]">
                  <Layers className="h-4 w-4" /> Editing target
                </div>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  Choose whether you are editing the original song or a specific variation.
                </p>
              </div>
              <span className="inline-flex items-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-1 text-xs font-medium text-[hsl(var(--foreground))]">
                {currentVariation ? `Variation: ${currentVariation.name}` : "Original song"}
              </span>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label htmlFor="edit-target" className="text-sm font-medium text-[hsl(var(--foreground))]">
                Working on
              </label>
              <select
                id="edit-target"
                value={editingVariationId || ""}
                onChange={(e) => handleEditTargetChange(e.target.value)}
                className="w-full rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm text-[hsl(var(--foreground))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] sm:max-w-sm"
              >
                <option value="">Original song</option>
                {variations.map((variation) => (
                  <option key={variation.id} value={variation.id}>
                    {variation.name}
                    {variation.key ? ` (${variation.key})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {currentVariation && (
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                You are editing the content and key for <span className="font-medium text-[hsl(var(--foreground))]">{currentVariation.name}</span>.
                Title, artist, tempo, tags, and draft status still belong to the main song.
              </p>
            )}
          </div>
        )}

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

          <div className="md:col-span-2">
            <TagInput value={tags} onChange={setTags} />
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
        <ChordProEditor
          value={content}
          onChange={setContent}
          metadata={metadata}
        />

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
            to={isNew ? "/songs" : currentVariation ? `/songs/${id}?variation=${currentVariation.id}` : `/songs/${id}`}
            className="inline-flex items-center rounded-md border border-[hsl(var(--border))] px-6 py-2 text-sm hover:bg-[hsl(var(--muted))] transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
