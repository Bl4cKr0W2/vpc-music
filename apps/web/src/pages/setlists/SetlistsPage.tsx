import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { setlistsApi, type Setlist } from "@/lib/api-client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Plus, ListMusic, Trash2, CheckCircle2 } from "lucide-react";

export function SetlistsPage() {
  const { user, activeOrg } = useAuth();
  const canEdit = user?.role === "owner" || activeOrg?.role === "admin" || activeOrg?.role === "musician";
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isNew = window.location.pathname.endsWith("/new");

  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [loading, setLoading] = useState(true);

  // Create-new modal state
  const [showCreate, setShowCreate] = useState(isNew);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [creating, setCreating] = useState(false);

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

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}" setlist?`)) return;
    try {
      await setlistsApi.delete(id);
      setSetlists((prev) => prev.filter((s) => s.id !== id));
      toast.success("Setlist deleted");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="page-header">
        <h2 className="page-title">Setlists</h2>
        {canEdit && (
          <button
            onClick={() => setShowCreate(true)}
            className="btn-primary"
          >
            <Plus className="h-4 w-4" /> New Setlist
          </button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="spinner" />
        </div>
      ) : setlists.length === 0 ? (
        <div className="card-empty">
          <ListMusic className="mx-auto h-12 w-12 text-[hsl(var(--muted-foreground))]" />
          <p className="mt-3 text-sm text-[hsl(var(--muted-foreground))]">
            No setlists yet.
          </p>
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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {setlists.map((sl) => (
            <div
              key={sl.id}
              className="card-interactive card-body relative group">
              <Link to={`/setlists/${sl.id}`} className="block space-y-1">
                <div className="flex items-center gap-2 pr-8">
                  <span className="font-medium text-[hsl(var(--foreground))] truncate">
                    {sl.name}
                  </span>
                  {sl.status === "complete" && (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-600 dark:text-green-400" />
                  )}
                </div>
                <div className="text-xs text-[hsl(var(--muted-foreground))]">
                  {sl.songCount ?? 0} song{(sl.songCount ?? 0) !== 1 ? "s" : ""}
                  {sl.category && <span className="ml-2">· {sl.category}</span>}
                </div>
              </Link>
              {canEdit && (
                <button
                  onClick={() => handleDelete(sl.id, sl.name)}
                  className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] transition-all"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
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
    </div>
  );
}
