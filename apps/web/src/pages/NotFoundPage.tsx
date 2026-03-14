import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-4">
      <p className="text-7xl font-brand text-[hsl(var(--secondary))]">404</p>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">
        Page not found
      </h1>
      <p className="mt-2 text-[hsl(var(--muted-foreground))] max-w-md">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <div className="mt-8 flex gap-4">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-md bg-[hsl(var(--secondary))] px-4 py-2 text-sm font-medium text-[hsl(var(--secondary-foreground))] hover:opacity-90 transition-opacity"
        >
          Go home
        </Link>
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-2 rounded-md border border-[hsl(var(--border))] px-4 py-2 text-sm font-medium text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
        >
          Go back
        </button>
      </div>
    </div>
  );
}
