import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { setlistsApi, type Setlist } from "@/lib/api-client";
import { toast } from "sonner";
import { Plus, ListMusic, Trash2, CheckCircle2 } from "lucide-react";

export function SetlistsPage() {
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
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-brand text-[hsl(var(--foreground))]">Setlists</h2>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 rounded-md bg-[hsl(var(--secondary))] px-4 py-2 text-sm font-medium text-[hsl(var(--secondary-foreground))] hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" /> New Setlist
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="py-12 text-center text-sm text-[hsl(var(--muted-foreground))]">
          Loading...
        </div>
      ) : setlists.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[hsl(var(--border))] p-12 text-center">
          <ListMusic className="mx-auto h-12 w-12 text-[hsl(var(--muted-foreground))]" />
          <p className="mt-3 text-sm text-[hsl(var(--muted-foreground))]">
            No setlists yet.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-[hsl(var(--secondary))] px-4 py-2 text-sm font-medium text-[hsl(var(--secondary-foreground))] hover:opacity-90 transition-opacity"
          >
            <Plus className="h-4 w-4" /> Create Setlist
          </button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {setlists.map((sl) => (
            <div
              key={sl.id}
              className="relative rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 hover:border-[hsl(var(--secondary))] transition-colors group"
            >
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
              <button
                onClick={() => handleDelete(sl.id, sl.name)}
                className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] transition-all"
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <form
            onSubmit={handleCreate}
            className="w-full max-w-sm rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-xl space-y-4"
          >
            <h3 className="text-lg font-brand text-[hsl(var(--foreground))]">New Setlist</h3>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[hsl(var(--foreground))]">Name *</label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
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
                className="w-full rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
                placeholder="Sunday, Midweek, Special"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={creating}
                className="flex-1 rounded-md bg-[hsl(var(--secondary))] px-4 py-2 text-sm font-medium text-[hsl(var(--secondary-foreground))] hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {creating ? "Creating..." : "Create"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreate(false);
                  if (isNew) navigate("/setlists");
                }}
                className="rounded-md border border-[hsl(var(--border))] px-4 py-2 text-sm hover:bg-[hsl(var(--muted))] transition-colors"
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
