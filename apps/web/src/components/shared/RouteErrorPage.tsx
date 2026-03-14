import { Link, isRouteErrorResponse, useRouteError } from "react-router-dom";

interface ErrorDisplay {
  status: number;
  title: string;
  details?: string;
}

function getErrorDisplay(error: unknown): ErrorDisplay {
  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      return { status: 404, title: "Page not found" };
    }
    return {
      status: error.status,
      title: error.statusText || "Something went wrong",
      details: typeof error.data === "string" ? error.data : undefined,
    };
  }
  if (error instanceof Error) {
    return { status: 500, title: "Something went wrong", details: error.message };
  }
  return { status: 500, title: "Unexpected error" };
}

export function RouteErrorPage() {
  const error = useRouteError();
  const { status, title, details } = getErrorDisplay(error);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[hsl(var(--background))] text-[hsl(var(--foreground))] px-4">
      <span className="inline-block rounded-full border border-[hsl(var(--border))] px-3 py-0.5 text-xs font-medium text-[hsl(var(--muted-foreground))]">
        Error {status}
      </span>
      <p className="mt-4 text-7xl font-brand text-[hsl(var(--secondary))]">
        {status}
      </p>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">{title}</h1>
      {details && (
        <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))] max-w-md text-center">
          {details}
        </p>
      )}
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
