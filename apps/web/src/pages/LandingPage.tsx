import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Music, ListMusic, Users, Smartphone } from "lucide-react";

const features = [
  {
    icon: Music,
    title: "ChordPro Support",
    desc: "Import, edit, and display songs in standard ChordPro format with live transposition.",
  },
  {
    icon: ListMusic,
    title: "Setlist Builder",
    desc: "Drag-and-drop setlist creation with per-song key overrides and notes.",
  },
  {
    icon: Users,
    title: "Conductor Mode",
    desc: "Real-time sync across devices — the conductor controls what everyone sees.",
  },
  {
    icon: Smartphone,
    title: "Auto-Scroll",
    desc: "Hands-free performance mode with configurable scroll speed.",
  },
];

export function LandingPage() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      {/* Hero */}
      <header className="flex flex-col items-center gap-6 px-6 pt-20 pb-16 text-center">
        <img src="/logo.png" alt="VPC Music" className="h-24 w-24 drop-shadow-lg" />
        <h1 className="text-4xl md:text-5xl font-brand text-[hsl(var(--secondary))]">
          VPC Music
        </h1>
        <p className="max-w-md text-lg text-[hsl(var(--muted-foreground))]">
          Song management &amp; performance tool for worship teams.
          ChordPro editing, setlists, live sync, and more.
        </p>
        <div className="flex gap-4 mt-2">
          <Link
            to="/login"
            className="rounded-md bg-[hsl(var(--secondary))] px-6 py-2.5 text-sm font-medium text-[hsl(var(--secondary-foreground))] hover:opacity-90 transition-opacity"
          >
            Sign in
          </Link>
          <Link
            to="/register"
            className="rounded-md border border-[hsl(var(--border))] px-6 py-2.5 text-sm font-medium text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
          >
            Create account
          </Link>
        </div>
      </header>

      {/* Feature grid */}
      <section className="mx-auto max-w-4xl px-6 pb-20">
        <div className="grid gap-6 sm:grid-cols-2">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 space-y-3"
            >
              <f.icon className="h-8 w-8 text-[hsl(var(--secondary))]" />
              <h3 className="text-lg font-brand text-[hsl(var(--foreground))]">{f.title}</h3>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[hsl(var(--border))] py-6 text-center text-xs text-[hsl(var(--muted-foreground))]">
        &copy; {new Date().getFullYear()} Antioch College of Truth &mdash; VPC Music
      </footer>
    </div>
  );
}
