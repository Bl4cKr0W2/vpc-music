import { useParams } from "react-router-dom";

export function SongViewPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-brand text-[hsl(var(--foreground))]">Song View</h2>
      {/* TODO: ChordPro renderer, transpose controls, toolbar */}
      <p className="text-[hsl(var(--muted-foreground))]">Song ID: {id}</p>
    </div>
  );
}
