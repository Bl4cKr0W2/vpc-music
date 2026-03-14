export function SettingsPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-brand text-[hsl(var(--foreground))]">Settings</h2>
      {/* TODO: theme, notation mode, zoom, bracket visibility, etc. */}
      <p className="text-[hsl(var(--muted-foreground))]">User preferences will live here.</p>
    </div>
  );
}
