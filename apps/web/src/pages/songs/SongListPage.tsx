import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { songsApi, type Song, type SongGroup } from "@/lib/api-client";
import { TempoIndicator } from "@/components/songs/TempoIndicator";
import { useAuth } from "@/contexts/AuthContext";
import { ALL_KEYS } from "@vpc-music/shared";
import { Search, Plus, Music, X, Download, ChevronDown, FolderPlus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

const PAGE_SIZE = 50;

export function SongListPage() {
  const { user, activeOrg } = useAuth();
  const canEdit = user?.role === "owner" || activeOrg?.role === "admin" || activeOrg?.role === "musician";
  const [songs, setSongs] = useState<Song[]>([]);
  const [availableGroups, setAvailableGroups] = useState<SongGroup[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [groupFilter, setGroupFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [keyFilter, setKeyFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [tempoMin, setTempoMin] = useState("");
  const [tempoMax, setTempoMax] = useState("");
  const [sort, setSort] = useState<"lastEdited" | "title" | "recentlyAdded" | "mostUsed">("lastEdited");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(0);
  const [selectedSongIds, setSelectedSongIds] = useState<string[]>([]);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showGroupsModal, setShowGroupsModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [groupActionId, setGroupActionId] = useState<string | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState("");

  const parsedTempoMin = /^\d+$/.test(tempoMin) ? Number.parseInt(tempoMin, 10) : undefined;
  const parsedTempoMax = /^\d+$/.test(tempoMax) ? Number.parseInt(tempoMax, 10) : undefined;
  const hasActiveFilters = Boolean(debouncedQ || groupFilter || categoryFilter || keyFilter || tagFilter || tempoMin || tempoMax);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageStart = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const pageEnd = total === 0 ? 0 : Math.min(total, (page + 1) * PAGE_SIZE);

  const loadGroups = async () => {
    try {
      const res = await songsApi.getGroups();
      setAvailableGroups(res.groups);
    } catch {
      setAvailableGroups([]);
    }
  };

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    let cancelled = false;

    songsApi
      .getGroups()
      .then((res) => {
        if (!cancelled) {
          setAvailableGroups(res.groups);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAvailableGroups([]);
        }
      });

    songsApi
      .getCategories()
      .then((res) => {
        if (!cancelled) {
          setAvailableCategories(res.categories);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAvailableCategories([]);
        }
      });

    songsApi
      .getTags()
      .then((res) => {
        if (!cancelled) {
          setAvailableTags(res.tags);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAvailableTags([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    songsApi
      .list({
        q: debouncedQ || undefined,
        groupId: groupFilter || undefined,
        category: categoryFilter || undefined,
        key: keyFilter || undefined,
        tag: tagFilter || undefined,
        tempoMin: parsedTempoMin,
        tempoMax: parsedTempoMax,
        sort,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
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
  }, [debouncedQ, groupFilter, categoryFilter, keyFilter, tagFilter, parsedTempoMin, parsedTempoMax, sort, page]);

  useEffect(() => {
    setPage(0);
  }, [debouncedQ, groupFilter, categoryFilter, keyFilter, tagFilter, parsedTempoMin, parsedTempoMax, sort]);

  useEffect(() => {
    setSelectedSongIds((previous) => previous.filter((songId) => songs.some((song) => song.id === songId)));
  }, [songs]);

  const visibleSongIds = songs.map((song) => song.id);
  const allVisibleSelected = songs.length > 0 && visibleSongIds.every((songId) => selectedSongIds.includes(songId));
  const getSongViewHref = (songId: string) => {
    if (!keyFilter) {
      return `/songs/${songId}`;
    }

    const next = new URLSearchParams({ key: keyFilter });
    return `/songs/${songId}?${next.toString()}`;
  };

  const toggleSongSelection = (songId: string) => {
    setSelectedSongIds((previous) => (
      previous.includes(songId)
        ? previous.filter((id) => id !== songId)
        : [...previous, songId]
    ));
  };

  const toggleSelectAllVisible = () => {
    setSelectedSongIds((previous) => {
      if (allVisibleSelected) {
        return previous.filter((songId) => !visibleSongIds.includes(songId));
      }

      const next = new Set(previous);
      for (const songId of visibleSongIds) {
        next.add(songId);
      }
      return [...next];
    });
  };

  const handleExportZip = async (format: "chordpro" | "onsong" | "text") => {
    const exportIds = songs.filter((song) => selectedSongIds.includes(song.id)).map((song) => song.id);
    if (exportIds.length === 0) {
      return;
    }

    try {
      const res = await songsApi.exportZip(exportIds, format);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error?.message || "Export failed");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `song-library-${format}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Song library zip exported");
    } catch (err: any) {
      toast.error(err.message || "Export failed");
    }

    setShowExportMenu(false);
  };

  const handleCreateGroup = async () => {
    const name = newGroupName.trim();
    if (!name) {
      toast.error("Group name is required");
      return;
    }

    setCreatingGroup(true);
    try {
      const { group } = await songsApi.createGroup({ name });
      if (selectedSongIds.length > 0) {
        await songsApi.addSongsToGroup(group.id, selectedSongIds);
      }
      await loadGroups();
      setNewGroupName("");
      toast.success(selectedSongIds.length > 0 ? "Group created and songs added" : "Group created");
    } catch (err: any) {
      toast.error(err.message || "Failed to create group");
    } finally {
      setCreatingGroup(false);
    }
  };

  const handleAddSelectedToGroup = async (groupId: string) => {
    if (selectedSongIds.length === 0) {
      toast.error("Select at least one song first");
      return;
    }

    setGroupActionId(groupId);
    try {
      const result = await songsApi.addSongsToGroup(groupId, selectedSongIds);
      await loadGroups();
      if (result.addedSongIds.length === 0) {
        toast.success("Selected songs were already in that group");
      } else {
        toast.success(`Added ${result.addedSongIds.length} song${result.addedSongIds.length === 1 ? "" : "s"} to the group`);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to add songs to group");
    } finally {
      setGroupActionId(null);
    }
  };

  const handleSaveGroupName = async (groupId: string) => {
    const name = editingGroupName.trim();
    if (!name) {
      toast.error("Group name is required");
      return;
    }

    setGroupActionId(groupId);
    try {
      await songsApi.updateGroup(groupId, { name });
      await loadGroups();
      setEditingGroupId(null);
      setEditingGroupName("");
      toast.success("Group updated");
    } catch (err: any) {
      toast.error(err.message || "Failed to update group");
    } finally {
      setGroupActionId(null);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!window.confirm("Delete this song group? Songs will remain in the library.")) {
      return;
    }

    setGroupActionId(groupId);
    try {
      await songsApi.deleteGroup(groupId);
      if (groupFilter === groupId) {
        setGroupFilter("");
      }
      await loadGroups();
      toast.success("Group deleted");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete group");
    } finally {
      setGroupActionId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="page-header">
        <h2 className="page-title">Songs</h2>
        {canEdit && (
          <Link
            to="/songs/new"
            className="btn-primary"
          >
            <Plus className="h-4 w-4" /> New Song
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-50">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search songs..."
            className="input pl-10 pr-9"
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
          aria-label="Filter by group"
          value={groupFilter}
          onChange={(e) => setGroupFilter(e.target.value)}
          className="select w-auto"
        >
          <option value="">All groups</option>
          {availableGroups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by category"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="select w-auto"
        >
          <option value="">All categories</option>
          {availableCategories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        <select
          value={keyFilter}
          onChange={(e) => setKeyFilter(e.target.value)}
          className="select w-auto"
        >
          <option value="">All keys</option>
          {ALL_KEYS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by tag"
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          className="select w-auto"
        >
          <option value="">All tags</option>
          {availableTags.map((tag) => (
            <option key={tag} value={tag}>
              {tag}
            </option>
          ))}
        </select>
        <input
          type="number"
          inputMode="numeric"
          min="1"
          step="1"
          aria-label="Minimum BPM"
          value={tempoMin}
          onChange={(e) => setTempoMin(e.target.value)}
          placeholder="Min BPM"
          className="input w-28"
        />
        <input
          type="number"
          inputMode="numeric"
          min="1"
          step="1"
          aria-label="Maximum BPM"
          value={tempoMax}
          onChange={(e) => setTempoMax(e.target.value)}
          placeholder="Max BPM"
          className="input w-28"
        />
        <select
          aria-label="Sort songs"
          value={sort}
          onChange={(e) => setSort(e.target.value as "lastEdited" | "title" | "recentlyAdded" | "mostUsed")}
          className="select w-auto"
        >
          <option value="lastEdited">Last edited</option>
          <option value="title">Title (A–Z)</option>
          <option value="recentlyAdded">Recently added</option>
          <option value="mostUsed">Most used</option>
        </select>
      </div>

      {/* Results */}
      {loading ? (
        <div className="py-12 flex justify-center">
          <div className="spinner" />
        </div>
      ) : songs.length === 0 ? (
        <div className="card-empty">
          <Music className="mx-auto h-12 w-12 text-[hsl(var(--muted-foreground))]" />
          <p className="mt-3 text-sm text-[hsl(var(--muted-foreground))]">
            {hasActiveFilters
              ? "No songs match your search."
              : "No songs yet. Import your library to get started."}
          </p>
          {!hasActiveFilters && canEdit && (
            <Link
              to="/songs/new"
              className="btn-primary mt-4"
            >
              <Plus className="h-4 w-4" /> Create Song
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-[hsl(var(--muted-foreground))]">
              {total} song{total !== 1 ? "s" : ""}
              {selectedSongIds.length > 0 ? ` · ${selectedSongIds.length} selected` : ""}
              {total > 0 ? ` · Showing ${pageStart}-${pageEnd}` : ""}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
                <input
                  type="checkbox"
                  aria-label="Select all visible songs"
                  checked={allVisibleSelected}
                  onChange={toggleSelectAllVisible}
                />
                Select all
              </label>

              {canEdit && (
                <button
                  type="button"
                  onClick={() => setShowGroupsModal(true)}
                  className="btn-outline btn-sm"
                >
                  <FolderPlus className="h-3.5 w-3.5" /> Groups
                </button>
              )}

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowExportMenu((value) => !value)}
                  className="btn-outline btn-sm disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={selectedSongIds.length === 0}
                >
                  <Download className="h-3.5 w-3.5" /> Export ZIP{selectedSongIds.length > 0 ? ` (${selectedSongIds.length})` : ""} <ChevronDown className="h-3.5 w-3.5" />
                </button>

                {showExportMenu && selectedSongIds.length > 0 && (
                  <div className="absolute right-0 z-20 mt-2 w-48 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-1 shadow-lg">
                    <button
                      type="button"
                      onClick={() => handleExportZip("chordpro")}
                      className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]"
                    >
                      ChordPro ZIP (.zip)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExportZip("onsong")}
                      className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]"
                    >
                      OnSong ZIP (.zip)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExportZip("text")}
                      className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]"
                    >
                      Plain Text ZIP (.zip)
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="list-container">
            {songs.map((song) => (
              <div
                key={song.id}
                className="list-item"
              >
                <input
                  type="checkbox"
                  aria-label={`Select ${song.title}`}
                  checked={selectedSongIds.includes(song.id)}
                  onChange={() => toggleSongSelection(song.id)}
                />
                <Link
                  to={getSongViewHref(song.id)}
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-[hsl(var(--foreground))] truncate">
                      {song.title}
                    </div>
                    <div className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">
                      {[song.artist, song.category ? `Category: ${song.category}` : null, song.aka ? `AKA: ${song.aka}` : null, song.tags].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <div className="ml-4 flex items-center gap-3 text-xs text-[hsl(var(--muted-foreground))] shrink-0">
                    {song.key && (
                      <span className="badge-key">{song.key}</span>
                    )}
                    {song.tempo && <TempoIndicator tempo={song.tempo} />}
                  </div>
                </Link>
              </div>
            ))}
          </div>
          {total > PAGE_SIZE && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <p className="text-xs text-[hsl(var(--muted-foreground))]" aria-live="polite">
                Page {page + 1} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(0, current - 1))}
                  disabled={page === 0}
                  className="btn-outline btn-sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))}
                  disabled={page >= totalPages - 1}
                  className="btn-outline btn-sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {showGroupsModal && (
        <div className="modal-backdrop">
          <div className="modal-content max-w-2xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-brand text-[hsl(var(--foreground))]">Song Groups</h3>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                  Create reusable song collections and add selected songs into them.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowGroupsModal(false);
                  setEditingGroupId(null);
                  setEditingGroupName("");
                }}
                className="btn-outline btn-sm"
              >
                Close
              </button>
            </div>

            <div className="card card-body space-y-3">
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-[hsl(var(--foreground))]">Create group</h4>
                {selectedSongIds.length > 0 && (
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">
                    New groups will automatically include the {selectedSongIds.length} selected song{selectedSongIds.length === 1 ? "" : "s"}.
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Wedding set, youth night, choir rehearsal..."
                  className="input min-w-64 flex-1"
                />
                <button
                  type="button"
                  onClick={handleCreateGroup}
                  disabled={creatingGroup}
                  className="btn-primary btn-sm"
                >
                  <Plus className="h-3.5 w-3.5" /> {creatingGroup ? "Creating..." : "Create Group"}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-sm font-semibold text-[hsl(var(--foreground))]">Existing groups</h4>
                {selectedSongIds.length > 0 && (
                  <span className="text-xs text-[hsl(var(--muted-foreground))]">
                    {selectedSongIds.length} selected song{selectedSongIds.length === 1 ? "" : "s"} ready to add
                  </span>
                )}
              </div>

              {availableGroups.length === 0 ? (
                <div className="card-empty py-8">
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">No song groups yet.</p>
                </div>
              ) : (
                <div className="list-container">
                  {availableGroups.map((group) => {
                    const isEditing = editingGroupId === group.id;
                    const isBusy = groupActionId === group.id;

                    return (
                      <div key={group.id} className="list-item gap-3">
                        <div className="min-w-0 flex-1 space-y-1">
                          {isEditing ? (
                            <div className="flex flex-wrap items-center gap-2">
                              <input
                                type="text"
                                value={editingGroupName}
                                onChange={(e) => setEditingGroupName(e.target.value)}
                                className="input min-w-56 flex-1"
                                aria-label={`Rename ${group.name}`}
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveGroupName(group.id)}
                                disabled={isBusy}
                                className="btn-primary btn-sm"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingGroupId(null);
                                  setEditingGroupName("");
                                }}
                                className="btn-outline btn-sm"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <>
                              <p className="font-medium text-[hsl(var(--foreground))]">{group.name}</p>
                              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                                {group.songCount ?? 0} song{group.songCount === 1 ? "" : "s"}
                              </p>
                            </>
                          )}
                        </div>

                        {!isEditing && (
                          <div className="flex flex-wrap items-center gap-2">
                            {selectedSongIds.length > 0 && (
                              <button
                                type="button"
                                onClick={() => handleAddSelectedToGroup(group.id)}
                                disabled={isBusy}
                                className="btn-outline btn-sm"
                              >
                                Add Selected
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setEditingGroupId(group.id);
                                setEditingGroupName(group.name);
                              }}
                              className="btn-outline btn-sm"
                              aria-label={`Rename ${group.name}`}
                            >
                              <Pencil className="h-3.5 w-3.5" /> Rename
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteGroup(group.id)}
                              disabled={isBusy}
                              className="btn-destructive btn-sm"
                              aria-label={`Delete ${group.name}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
