import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate, Link, useSearchParams, useBeforeUnload, useBlocker } from "react-router-dom";
import { songsApi, variationsApi, type Song, type SongVariation } from "@/lib/api-client";
import { useAuth } from "@/contexts/AuthContext";
import { ALL_KEYS, parseChordPro } from "@vpc-music/shared";
import { toast } from "sonner";
import { ArrowLeft, Save, Upload, Layers } from "lucide-react";
import { ChordProEditor } from "@/components/songs/ChordProEditor";
import { ChordProRenderer } from "@/components/songs/ChordProRenderer";
import { TagInput } from "@/components/songs/TagInput";

type BulkImportItem = {
  filename: string;
  status: "pending" | "processing" | "success" | "error";
  songId?: string;
  songTitle?: string;
  message?: string;
};

type ImportPreviewState = {
  filename: string;
  sourceLabel: string;
};

export function SongEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, activeOrg } = useAuth();
  const canEdit = user?.role === "owner" || activeOrg?.role === "admin" || activeOrg?.role === "musician";
  const [searchParams, setSearchParams] = useSearchParams();
  const isNew = !id;
  const requestedVariationId = searchParams.get("variation");

  const [title, setTitle] = useState("");
  const [aka, setAka] = useState("");
  const [category, setCategory] = useState("");
  const [key, setKey] = useState("");
  const [tempo, setTempo] = useState("");
  const [artist, setArtist] = useState("");
  const [shout, setShout] = useState("");
  const [tags, setTags] = useState("");
  const [content, setContent] = useState("");
  const [isDraft, setIsDraft] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [songRecord, setSongRecord] = useState<Song | null>(null);
  const [variations, setVariations] = useState<SongVariation[]>([]);
  const [editingVariationId, setEditingVariationId] = useState<string | null>(null);
  const [bulkImportItems, setBulkImportItems] = useState<BulkImportItem[]>([]);
  const [bulkImportCompleted, setBulkImportCompleted] = useState(0);
  const [bulkImportCurrentFile, setBulkImportCurrentFile] = useState("");
  const [isBulkImporting, setIsBulkImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportPreviewState | null>(null);
  const allowNavigationRef = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);

  const metadata = useMemo(
    () => ({ title, artist, key, tempo }),
    [title, artist, key, tempo],
  );
  const currentVariation = useMemo(
    () => variations.find((variation) => variation.id === editingVariationId) ?? null,
    [variations, editingVariationId],
  );
  const initialFormState = useMemo(
    () => ({
      title: songRecord?.title || "",
      aka: songRecord?.aka || "",
      category: songRecord?.category || "",
      key: currentVariation?.key || songRecord?.key || "",
      tempo: songRecord?.tempo ? String(songRecord.tempo) : "",
      artist: songRecord?.artist || "",
      shout: songRecord?.shout || "",
      tags: songRecord?.tags || "",
      content: currentVariation?.content || songRecord?.content || "",
      isDraft: !!songRecord?.isDraft,
    }),
    [currentVariation, songRecord],
  );
  const currentFormState = useMemo(
    () => ({
      title,
      aka,
      category,
      key,
      tempo,
      artist,
      shout,
      tags,
      content,
      isDraft,
    }),
    [title, aka, category, key, tempo, artist, shout, tags, content, isDraft],
  );
  const isDirty = useMemo(() => {
    if (isNew) {
      return Boolean(title.trim() || aka.trim() || category.trim() || key || tempo || artist.trim() || shout.trim() || tags.trim() || content.trim() || isDraft);
    }

    return JSON.stringify(currentFormState) !== JSON.stringify(initialFormState);
  }, [aka, category, content, currentFormState, initialFormState, isDraft, isNew, key, tags, tempo, title, artist, shout]);
  const shouldWarnOnLeave = isDirty && !saving && !allowNavigationRef.current;

  useBeforeUnload(
    (event) => {
      if (!shouldWarnOnLeave) return;
      event.preventDefault();
      event.returnValue = "";
    },
    { capture: true },
  );

  const blocker = useBlocker(shouldWarnOnLeave);

  useEffect(() => {
    if (blocker.state !== "blocked") return;

    const shouldLeave = window.confirm(
      "You have unsaved changes. Press OK to leave this page and discard them, or Cancel to stay here.",
    );

    if (shouldLeave) {
      allowNavigationRef.current = true;
      blocker.proceed();
    } else {
      blocker.reset();
    }
  }, [blocker]);

  // Redirect observers away from edit pages
  useEffect(() => {
    if (canEdit) return;
    toast.error("You don't have permission to edit songs");
    navigate(id ? `/songs/${id}` : "/songs", { replace: true });
  }, [canEdit, id, navigate]);

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
        setAka(s.aka || "");
        setCategory(s.category || "");
        setTempo(s.tempo ? String(s.tempo) : "");
        setArtist(s.artist || "");
        setShout(s.shout || "");
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
    if (shouldWarnOnLeave) {
      const shouldSwitch = window.confirm(
        "You have unsaved changes. Switch editing targets and discard them?",
      );
      if (!shouldSwitch) return;
    }

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
        aka: aka.trim() || undefined,
        category: category.trim() || undefined,
        tempo: tempo ? Number(tempo) : undefined,
        artist: artist.trim() || undefined,
        shout: shout.trim() || undefined,
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
        allowNavigationRef.current = true;
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
        allowNavigationRef.current = true;
        navigate(`/songs/${id}?variation=${currentVariation.id}`);
      } else {
        const data: Partial<Song> = {
          ...sharedSongData,
          key: key || undefined,
          content,
        };
        await songsApi.update(id!, data);
        toast.success("Song updated!");
        allowNavigationRef.current = true;
        navigate(`/songs/${id}`);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const readFileText = async (file: File) => {
    if (typeof file.text === "function") {
      return file.text();
    }

    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error || new Error("Failed to read file"));
      reader.readAsText(file);
    });
  };

  const getFileExtension = (filename: string) => filename.split(".").pop()?.toLowerCase() || "";

  const createSongFromChordProFile = async (file: File, chordProContent: string) => {
    const parsed = parseChordPro(chordProContent);
    const title = parsed.directives.title || parsed.directives.t || file.name.replace(/\.(cho|chordpro|chopro)$/i, "") || "Untitled";
    const artist = parsed.directives.artist || parsed.directives.a || undefined;
    const key = parsed.directives.key || parsed.directives.k || undefined;
    const tempoRaw = parsed.directives.tempo || "";
    const tempo = /^\d+$/.test(tempoRaw) ? Number(tempoRaw) : undefined;

    return songsApi.create({
      title,
      artist,
      key,
      tempo,
      content: chordProContent,
    });
  };

  const applyImportPreview = ({
    filename,
    sourceLabel,
    chordPro,
    previewMetadata,
  }: {
    filename: string;
    sourceLabel: string;
    chordPro: string;
    previewMetadata?: {
      title?: string | null;
      artist?: string | null;
      key?: string | null;
      tempo?: number | null;
    };
  }) => {
    setTitle(previewMetadata?.title || "");
    setArtist(previewMetadata?.artist || "");
    setKey(previewMetadata?.key || "");
    setTempo(previewMetadata?.tempo ? String(previewMetadata.tempo) : "");
    setContent(chordPro);
    setImportPreview({ filename, sourceLabel });
  };

  const confirmImportReplacement = () => {
    if (!isDirty) return true;
    return window.confirm(
      "Importing a file will replace the current unsaved form values. Continue?",
    );
  };

  const importFileForBulk = async (file: File) => {
    const ext = getFileExtension(file.name);

    if (ext === "pdf") {
      const res = await songsApi.importPdf(file);
      return { songId: res.song.id, songTitle: res.song.title || file.name };
    }

    const text = await readFileText(file);

    if (!text.trim()) {
      throw new Error("File is empty");
    }

    if (ext === "cho" || ext === "chordpro" || ext === "chopro") {
      const res = await createSongFromChordProFile(file, text);
      return { songId: res.song.id, songTitle: res.song.title || file.name };
    }

    if (ext === "onsong" || ext === "xml") {
      const res = await songsApi.importOnSong({ filename: file.name, content: text });
      return { songId: res.song.id, songTitle: res.song.title || file.name };
    }

    if (ext === "chrd" || ext === "txt") {
      const res = await songsApi.importChrd({ filename: file.name, content: text });
      return { songId: res.song.id, songTitle: res.song.title || file.name };
    }

    throw new Error("Unsupported file format");
  };

  const handleBulkImport = async (files: File[]) => {
    setIsBulkImporting(true);
    setBulkImportCompleted(0);
    setBulkImportCurrentFile("");
    setBulkImportItems(
      files.map((file) => ({
        filename: file.name,
        status: "pending",
      })),
    );

    let successCount = 0;

    for (const file of files) {
      setBulkImportCurrentFile(file.name);
      setBulkImportItems((current) => current.map((item) => (
        item.filename === file.name ? { ...item, status: "processing", message: undefined } : item
      )));

      try {
        const result = await importFileForBulk(file);
        successCount += 1;
        setBulkImportItems((current) => current.map((item) => (
          item.filename === file.name
            ? {
                ...item,
                status: "success",
                songId: result.songId,
                songTitle: result.songTitle,
                message: "Imported",
              }
            : item
        )));
      } catch (err: any) {
        setBulkImportItems((current) => current.map((item) => (
          item.filename === file.name
            ? {
                ...item,
                status: "error",
                message: err?.message || "Import failed",
              }
            : item
        )));
      } finally {
        setBulkImportCompleted((value) => value + 1);
      }
    }

    setBulkImportCurrentFile("");
    setIsBulkImporting(false);

    if (successCount > 0) {
      toast.success(`Bulk import finished — ${successCount} of ${files.length} files imported`);
    } else {
      toast.error("Bulk import failed for all files");
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (files.length > 1) {
      await handleBulkImport(files);
      e.target.value = "";
      return;
    }

    const [file] = files;
    const ext = getFileExtension(file.name);

    if (!confirmImportReplacement()) {
      e.target.value = "";
      return;
    }

    if (ext === "cho" || ext === "chordpro" || ext === "chopro") {
      const text = await readFileText(file);
      const parsed = parseChordPro(text);
      applyImportPreview({
        filename: file.name,
        sourceLabel: "ChordPro",
        chordPro: text,
        previewMetadata: {
          title: parsed.directives.title || parsed.directives.t || file.name.replace(/\.(cho|chordpro|chopro)$/i, ""),
          artist: parsed.directives.artist || parsed.directives.a || null,
          key: parsed.directives.key || parsed.directives.k || null,
          tempo: /^\d+$/.test(parsed.directives.tempo || "") ? Number(parsed.directives.tempo) : null,
        },
      });
      toast.success("ChordPro file loaded — review the preview and save when ready");
    } else if (ext === "pdf") {
      try {
        toast.info("Processing PDF — this may take a moment…");
        const preview = await songsApi.previewImportPdf(file);
        applyImportPreview({
          filename: file.name,
          sourceLabel: "PDF",
          chordPro: preview.chordPro,
          previewMetadata: preview.metadata,
        });
        toast.success("PDF imported — review the preview and save when ready");
      } catch (err: any) {
        toast.error(err.message || "PDF import failed");
      }
    } else if (ext === "onsong" || ext === "xml") {
      try {
        const text = await readFileText(file);
        const preview = await songsApi.previewImportOnSong({
          filename: file.name,
          content: text,
        });
        applyImportPreview({
          filename: file.name,
          sourceLabel: ext === "xml" ? "OpenSong XML" : "OnSong",
          chordPro: preview.chordPro,
          previewMetadata: preview.metadata,
        });
        toast.success("OnSong/OpenSong file imported — review the preview and save when ready");
      } catch (err: any) {
        toast.error(err.message || "Import failed");
      }
    } else if (ext === "chrd" || ext === "txt") {
      try {
        const text = await readFileText(file);
        const preview = await songsApi.previewImportChrd({
          filename: file.name,
          content: text,
        });
        applyImportPreview({
          filename: file.name,
          sourceLabel: ext === "txt" ? "Plain text / .chrd conversion" : ".chrd",
          chordPro: preview.chordPro,
          previewMetadata: preview.metadata,
        });
        toast.success("File imported — review the preview and save when ready");
      } catch (err: any) {
        toast.error(err.message || "Import failed");
      }
    } else {
      toast.error("Unsupported file format. Use .cho, .chordpro, .chopro, .onsong, .xml, .chrd, .txt, or .pdf");
    }
    e.target.value = ""; // reset file input
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          to={isNew ? "/songs" : currentVariation ? `/songs/${id}?variation=${currentVariation.id}` : `/songs/${id}`}
          className="link-muted inline-flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" /> {isNew ? "Songs" : "Back"}
        </Link>
        <h2 className="page-title">
          {isNew ? "New Song" : "Edit Song"}
        </h2>
      </div>

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
        {!isNew && variations.length > 0 && (
          <div className="space-y-3 card card-body">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 text-sm font-medium text-[hsl(var(--foreground))]">
                  <Layers className="h-4 w-4" /> Editing target
                </div>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  Choose whether you are editing the original song or a specific variation.
                </p>
              </div>
              <span className="badge-muted">
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
                className="select sm:max-w-sm"
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
                Title, alternate names, artist, shout, tempo, tags, and draft status still belong to the main song.
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
              className="input"
              placeholder="Song title"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[hsl(var(--foreground))]">Category</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="input"
              placeholder="Wedding, Church, Special Event"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[hsl(var(--foreground))]">Key</label>
            <select
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="select"
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
              className="input"
              placeholder="120"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[hsl(var(--foreground))]">Artist</label>
            <input
              type="text"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              className="input"
              placeholder="Artist or composer"
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <label className="text-sm font-medium text-[hsl(var(--foreground))]">AKA / alternate names</label>
            <input
              type="text"
              value={aka}
              onChange={(e) => setAka(e.target.value)}
              className="input"
              placeholder="Optional alternate names, comma separated"
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <label className="text-sm font-medium text-[hsl(var(--foreground))]">Associated shout</label>
            <input
              type="text"
              value={shout}
              onChange={(e) => setShout(e.target.value)}
              className="input"
              placeholder="Optional spoken cue or callout"
            />
          </div>

          <div className="md:col-span-2">
            <TagInput value={tags} onChange={setTags} />
          </div>
        </div>

        {/* Import */}
        <div className="flex items-center gap-3">
          <label className="btn-outline cursor-pointer">
            <Upload className="h-4 w-4" />
            Import file
            <input
              type="file"
              multiple
              accept=".cho,.chordpro,.chopro,.onsong,.xml,.chrd,.txt,.pdf"
              onChange={handleImport}
              disabled={isBulkImporting}
              className="hidden"
            />
          </label>
          <span className="text-xs text-[hsl(var(--muted-foreground))]">
            Choose one file to review here, or select multiple files to bulk import: .cho, .chordpro, .chopro, .onsong, .xml, .chrd, .txt, .pdf
          </span>
        </div>

        {(isBulkImporting || bulkImportItems.length > 0) && (
          <div className="card card-body space-y-3" data-testid="bulk-import-status">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-[hsl(var(--foreground))]">Bulk import progress</h3>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  {bulkImportCompleted} of {bulkImportItems.length} completed
                  {bulkImportCurrentFile ? ` — importing ${bulkImportCurrentFile}` : ""}
                </p>
              </div>
              <span className="badge-muted">
                {bulkImportItems.filter((item) => item.status === "success").length} imported
              </span>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-[hsl(var(--muted))]">
              <div
                className="h-full bg-[hsl(var(--secondary))] transition-all"
                style={{ width: `${bulkImportItems.length > 0 ? Math.round((bulkImportCompleted / bulkImportItems.length) * 100) : 0}%` }}
              />
            </div>

            <ul className="space-y-2 text-sm">
              {bulkImportItems.map((item) => (
                <li key={item.filename} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[hsl(var(--border))] px-3 py-2">
                  <div className="space-y-1">
                    <p className="font-medium text-[hsl(var(--foreground))]">{item.filename}</p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      {item.status === "pending" && "Queued"}
                      {item.status === "processing" && "Importing..."}
                      {item.status === "success" && (item.songTitle ? `Imported as ${item.songTitle}` : "Imported")}
                      {item.status === "error" && (item.message || "Import failed")}
                    </p>
                  </div>

                  {item.songId ? (
                    <Link to={`/songs/${item.songId}`} className="link-muted text-xs font-medium">
                      Open song
                    </Link>
                  ) : (
                    <span className="badge-muted">{item.status}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {importPreview && (
          <div className="card card-body space-y-4" data-testid="import-preview-card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-[hsl(var(--foreground))]">Import preview</h3>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  Loaded from {importPreview.filename} via {importPreview.sourceLabel}. Review the rendered chart below, adjust anything you need, then save.
                </p>
              </div>
              <button
                type="button"
                className="btn-outline text-xs"
                onClick={() => setImportPreview(null)}
              >
                Hide preview
              </button>
            </div>

            <div className="grid gap-3 text-xs text-[hsl(var(--muted-foreground))] sm:grid-cols-3">
              <div>
                <span className="font-medium text-[hsl(var(--foreground))]">Title:</span> {title || "—"}
              </div>
              <div>
                <span className="font-medium text-[hsl(var(--foreground))]">Key:</span> {key || "—"}
              </div>
              <div>
                <span className="font-medium text-[hsl(var(--foreground))]">Tempo:</span> {tempo || "—"}
              </div>
            </div>

            <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
              <ChordProRenderer content={content} songKey={key || undefined} />
            </div>
          </div>
        )}

        {/* ChordPro editor */}
        <ChordProEditor
          value={content}
          onChange={setContent}
          metadata={metadata}
          onSave={() => formRef.current?.requestSubmit()}
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
            className="btn-primary"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : isNew ? "Create Song" : "Update Song"}
          </button>
          <Link
            to={isNew ? "/songs" : currentVariation ? `/songs/${id}?variation=${currentVariation.id}` : `/songs/${id}`}
            className="btn-outline"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
