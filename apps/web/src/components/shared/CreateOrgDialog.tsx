import { useState, useEffect } from "react";
import { toast } from "sonner";
import { orgsApi } from "@/lib/api-client";

export function CreateOrgDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (organization: { id: string; name: string; role?: "admin" | "musician" | "observer" }) => Promise<void> | void;
}) {
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!open) {
      setName("");
      setCreating(false);
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !creating) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [creating, onClose, open]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Organization name is required");
      return;
    }

    setCreating(true);
    try {
      const { organization } = await orgsApi.create(name.trim());
      await onCreated(organization);
      toast.success("Organization created");
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to create organization");
    } finally {
      setCreating(false);
    }
  };

  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="create-organization-title">
      <div className="modal-content max-w-md space-y-4">
        <div className="space-y-1">
          <h2 id="create-organization-title" className="text-lg font-semibold text-[hsl(var(--foreground))]">
            Create organization
          </h2>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Create a new organization and switch into it right away.
          </p>
        </div>

        <form onSubmit={handleCreate} className="space-y-4">
          <label className="space-y-2 block">
            <span className="text-sm font-medium text-[hsl(var(--foreground))]">Organization name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Organization name"
              className="input w-full"
              disabled={creating}
              autoFocus
            />
          </label>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={creating}
              className="btn-outline btn-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating || !name.trim()}
              className="btn-primary btn-sm"
            >
              {creating ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
