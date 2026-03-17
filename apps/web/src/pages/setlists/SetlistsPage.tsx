import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { setlistsApi, type Setlist } from "@/lib/api-client";
import { useAuth } from "@/contexts/AuthContext";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { toast } from "sonner";
import { Plus, ListMusic, Trash2, CheckCircle2, Archive } from "lucide-react";

const SHOW_COMPLETED_STORAGE_KEY = "vpc-setlists-show-completed";

function isCompleted(setlist: Setlist) {
  return setlist.status === "complete";
}

export function SetlistsPage() {
  const { user, activeOrg } = useAuth();
  const canEdit = user?.role === "owner" || activeOrg?.role === "admin" || activeOrg?.role === "musician";
  const navigate = useNavigate();
  const isNew = window.location.pathname.endsWith("/new");

  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCompleted, setShowCompleted] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(SHOW_COMPLETED_STORAGE_KEY) === "true";
  });

  // Create-new modal state
  const [showCreate, setShowCreate] = useState(isNew);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [creating, setCreating] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Setlist | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    window.localStorage.setItem(SHOW_COMPLETED_STORAGE_KEY, String(showCompleted));
  }, [showCompleted]);

  useEffect(() => {
    setlistsApi
      .list()
      .then((res) => setSetlists(res.setlists))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await setlistsApi.create({
        name: newName.trim(),
        category: newCategory.trim() || undefined,
      });
      toast.success("Setlist created!");
      navigate(`/setlists/${res.setlist.id}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to create");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    setDeletingId(pendingDelete.id);
    try {
      await setlistsApi.delete(pendingDelete.id);
      setSetlists((prev) => prev.filter((s) => s.id !== pendingDelete.id));
      toast.success("Setlist deleted");
      setPendingDelete(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  };

  const activeSetlists = useMemo(() => setlists.filter((setlist) => !isCompleted(setlist)), [setlists]);
  const completedSetlists = useMemo(() => setlists.filter(isCompleted), [setlists]);
  const visibleSetlists = showCompleted
    ? [...activeSetlists, ...completedSetlists]
    : activeSetlists;
  const hasArchivedSetlists = completedSetlists.length > 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="page-header">
        <div className="space-y-1">
          <h2 className="page-title">Setlists</h2>
          {hasArchivedSetlists && (
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              Completed setlists are kept in an archive at the bottom.
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {hasArchivedSetlists && (
            <button
              type="button"
              onClick={() => setShowCompleted((prev) => !prev)}
              aria-pressed={showCompleted}
              className="btn-outline"
            >
              <Archive className="h-4 w-4" />
              {showCompleted
                ? `Hide archive (${completedSetlists.length})`
                : `Show archive (${completedSetlists.length})`}
            </button>
          )}
          {canEdit && (
            <button
              onClick={() => setShowCreate(true)}
              className="btn-primary"
            >
              <Plus className="h-4 w-4" /> New Setlist
            </button>
          )}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="spinner" />
        </div>
      ) : visibleSetlists.length === 0 ? (
        <div className="card-empty">
          <ListMusic className="mx-auto h-12 w-12 text-[hsl(var(--muted-foreground))]" />
          {hasArchivedSetlists ? (
            <>
              <p className="mt-3 text-sm text-[hsl(var(--muted-foreground))]">
                No active setlists right now.
              </p>
              <button
                type="button"
                onClick={() => setShowCompleted(true)}
                className="btn-outline mt-4"
              >
                <Archive className="h-4 w-4" /> Show completed archive ({completedSetlists.length})
              </button>
            </>
          ) : (
            <p className="mt-3 text-sm text-[hsl(var(--muted-foreground))]">
              No setlists yet.
            </p>
          )}
          {canEdit && (
            <button
              onClick={() => setShowCreate(true)}
              className="btn-primary mt-4"
            >
              <Plus className="h-4 w-4" /> Create Setlist
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {activeSetlists.length > 0 && (
            <section aria-label="Active setlists" className="space-y-3">
              {hasArchivedSetlists && (
                <div className="section-header">
                  <h3 className="section-title">Active setlists</h3>
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {activeSetlists.map((sl) => (
                  <div
                    key={sl.id}
                    className="card-interactive card-body relative group">
                    <Link to={`/setlists/${sl.id}`} className="block space-y-1">
                      <div className="flex items-center gap-2 pr-8">
                        <span className="font-medium text-[hsl(var(--foreground))] truncate">
                          {sl.name}
                        </span>
                      </div>
                      <div className="text-xs text-[hsl(var(--muted-foreground))]">
                        {sl.songCount ?? 0} song{(sl.songCount ?? 0) !== 1 ? "s" : ""}
                        {sl.category && <span className="ml-2">· {sl.category}</span>}
                      </div>
                    </Link>
                    {canEdit && (
                      <button
                        onClick={() => setPendingDelete(sl)}
                        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] transition-all"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {showCompleted && completedSetlists.length > 0 && (
            <section aria-label="Completed archive" className="space-y-3">
              <div className="section-header">
                <h3 className="section-title">
                  <Archive className="section-title-icon" /> Completed archive
                </h3>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {completedSetlists.map((sl) => (
                  <div
                    key={sl.id}
                    className="card card-body relative border-[hsl(var(--border))]/80 bg-[hsl(var(--muted))/0.35] group">
                    <Link to={`/setlists/${sl.id}`} className="block space-y-2">
                      <div className="flex items-center gap-2 pr-8">
                        <span className="font-medium text-[hsl(var(--foreground))] truncate">
                          {sl.name}
                        </span>
                        <span className="badge-success">
                          <CheckCircle2 className="h-3 w-3" /> Complete
                        </span>
                      </div>
                      <div className="text-xs text-[hsl(var(--muted-foreground))]">
                        {sl.songCount ?? 0} song{(sl.songCount ?? 0) !== 1 ? "s" : ""}
                        {sl.category && <span className="ml-2">· {sl.category}</span>}
                      </div>
                    </Link>
                    {canEdit && (
                      <button
                        onClick={() => setPendingDelete(sl)}
                        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] transition-all"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="modal-backdrop">
          <form
            onSubmit={handleCreate}
            className="modal-content max-w-sm space-y-4"
          >
            <h3 className="text-lg font-brand text-[hsl(var(--foreground))]">New Setlist</h3>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[hsl(var(--foreground))]">Name *</label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="input"
                placeholder="Sunday Morning Service"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[hsl(var(--foreground))]">
                Category
              </label>
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="input"
                placeholder="Sunday, Midweek, Special"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={creating}
                className="btn-primary flex-1"
              >
                {creating ? "Creating..." : "Create"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreate(false);
                  if (isNew) navigate("/setlists");
                }}
                className="btn-outline"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title={pendingDelete ? `Delete \"${pendingDelete.name}\"?` : "Delete setlist?"}
        description="This will permanently remove the setlist from your library."
        confirmLabel="Delete setlist"
        busy={deletingId === pendingDelete?.id}
        onClose={() => {
          if (!deletingId) {
            setPendingDelete(null);
          }
        }}
        onConfirm={handleDelete}
      />
    </div>
  );
}
