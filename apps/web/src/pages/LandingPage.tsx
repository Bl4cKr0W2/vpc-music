import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ThemedLogo } from "@/components/ui/ThemedLogo";
import { ThemeToggleButton } from "@/components/ui/ThemeToggleButton";
import {
  Music,
  ListMusic,
  Users,
  Smartphone,
  ArrowRightLeft,
  Shield,
  FileInput,
  Palette,
  MonitorSmartphone,
  Zap,
  ScrollText,
  Clock,
} from "lucide-react";

/* ── Feature data ──────────────────────────────────────────────── */

const coreFeatures = [
  {
    icon: Music,
    title: "ChordPro Native",
    desc: "Uses the industry-standard ChordPro format so you can import, edit, and render with full directive support.",
  },
  {
    icon: ArrowRightLeft,
    title: "Instant Transpose",
    desc: "Step-by-step semitone buttons or a direct key picker with all 12 chromatic keys. Chords recalculate in real time.",
  },
  {
    icon: ListMusic,
    title: "Setlist Builder",
    desc: "Create setlists with drag-and-drop reordering, per-song key overrides, position tracking, and category tagging.",
  },
  {
    icon: Users,
    title: "Conductor Mode",
    desc: "Real-time sync across every connected device. The conductor controls what song and scroll position the whole team sees.",
  },
  {
    icon: Smartphone,
    title: "Auto-Scroll",
    desc: "Hands-free performance mode with configurable scroll speed powered by requestAnimationFrame for buttery-smooth motion.",
  },
  {
    icon: FileInput,
    title: "Flexible Import",
    desc: "Bring your library. Import .chrd legacy files, .cho/.chordpro/.chopro ChordPro files, PDF chord sheets, or paste plain text and add chords.",
  },
];

const additionalFeatures = [
  {
    icon: Shield,
    title: "Role-Based Access",
    desc: "Worship Leader, Musician, and Observer roles keep your library safe while giving the right people the right permissions.",
  },
  {
    icon: Palette,
    title: "Dark & Light Themes",
    desc: "Switch between dark and light modes with a single click. Your preference persists across sessions.",
  },
  {
    icon: MonitorSmartphone,
    title: "Responsive Design",
    desc: "Optimized for phones, tablets on music stands, laptops, and desktops. Looks great on every screen size.",
  },
  {
    icon: Zap,
    title: "Fast & Modern Stack",
    desc: "Built on React 19, Vite 7, and a PostgreSQL-backed Express API for snappy load times and reliable data.",
  },
  {
    icon: ScrollText,
    title: "ChordPro Export",
    desc: "Export any song back to standard ChordPro for use in OnSong, BandHelper, SongBook, and hundreds of other apps.",
  },
  {
    icon: Clock,
    title: "Dashboard & Quick Actions",
    desc: "Jump straight to recent songs, setlists, or create new content. Everything is one click from your dashboard.",
  },
];

/* ── How It Works steps ─────────────────────────────────────────── */

const steps = [
  { num: "1", title: "Import or Create", desc: "Bring your existing chord charts or write new ones in ChordPro." },
  { num: "2", title: "Organize", desc: "Tag songs, group them into setlists, and set keys and tempo." },
  { num: "3", title: "Perform", desc: "Auto-scroll, transpose on the fly, and sync the whole band with Conductor Mode." },
];

/* ── Component ──────────────────────────────────────────────────── */

export function LandingPage() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      {/* ─── Top Bar ─────────────────────────────────────────── */}
      <nav className="sticky top-0 z-40 glass border-b border-[hsl(var(--border))] flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <ThemedLogo className="h-8 w-8 rounded-md" />
          <span className="text-lg font-brand text-[hsl(var(--secondary))]">VPC Music</span>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggleButton position="inline" />
          <Link
            to="/login"
            className="btn-outline btn-sm"
          >
            Sign in
          </Link>
        </div>
      </nav>

      {/* ─── Hero ────────────────────────────────────────────── */}
      <header className="relative flex flex-col items-center gap-6 px-6 pt-20 pb-24 text-center max-w-3xl mx-auto overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[hsl(var(--secondary))]/5 to-transparent" />
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-brand text-[hsl(var(--secondary))] leading-tight">
          Welcome to VPC Music
        </h1>
        <p className="max-w-xl text-lg text-[hsl(var(--muted-foreground))] leading-relaxed">
          Our team's hub for managing chord charts, building setlists, and staying
          in sync during worship and rehearsal. Everything lives here, accessible
          from any device, any time.
        </p>
        <Link
          to="/login"
          className="btn-primary mt-2 px-8 py-3 text-base"
        >
          Get Started
        </Link>
      </header>

      {/* ─── Core Features ───────────────────────────────────── */}
      <section id="features" className="mx-auto max-w-6xl px-6 pb-20">
        <h2 className="text-2xl md:text-3xl font-brand text-center text-[hsl(var(--foreground))] mb-3">
          What you can do here
        </h2>
        <p className="text-center text-[hsl(var(--muted-foreground))] mb-10 max-w-lg mx-auto">
          From chord charts to live performance, here's what VPC Music gives the team.
        </p>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {coreFeatures.map((f) => (
            <div
              key={f.title}
              className="card card-body-lg space-y-3 group hover:border-[hsl(var(--secondary))] transition-all"
            >
              <div className="inline-flex items-center justify-center h-10 w-10 rounded-lg bg-[hsl(var(--secondary))]/10 text-[hsl(var(--secondary))] group-hover:bg-[hsl(var(--secondary))]/20 transition-colors">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-brand text-[hsl(var(--foreground))]">{f.title}</h3>
              <p className="text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── How It Works ────────────────────────────────────── */}
      <section className="bg-[hsl(var(--muted))] py-20">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl md:text-3xl font-brand text-center text-[hsl(var(--foreground))] mb-12">
            How it works
          </h2>
          <div className="grid gap-8 sm:grid-cols-3">
            {steps.map((s) => (
              <div key={s.num} className="text-center space-y-3">
                <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] text-xl font-bold shadow-lg">
                  {s.num}
                </div>
                <h3 className="text-lg font-brand text-[hsl(var(--foreground))]">{s.title}</h3>
                <p className="text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── More Features ───────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-2xl md:text-3xl font-brand text-center text-[hsl(var(--foreground))] mb-12">
          Also built in
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {additionalFeatures.map((f) => (
            <div
              key={f.title}
              className="card card-body-lg space-y-3 group hover:border-[hsl(var(--secondary))] transition-all"
            >
              <div className="inline-flex items-center justify-center h-10 w-10 rounded-lg bg-[hsl(var(--secondary))]/10 text-[hsl(var(--secondary))] group-hover:bg-[hsl(var(--secondary))]/20 transition-colors">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-brand text-[hsl(var(--foreground))]">{f.title}</h3>
              <p className="text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── CTA Banner ──────────────────────────────────────── */}
      <section className="bg-gradient-to-r from-[hsl(var(--secondary))]/10 via-[hsl(var(--secondary))]/5 to-[hsl(var(--secondary))]/10 py-20">
        <div className="mx-auto max-w-2xl px-6 text-center space-y-4">
          <h2 className="text-2xl md:text-3xl font-brand text-[hsl(var(--foreground))]">
            Want to join the team?
          </h2>
          <p className="text-[hsl(var(--muted-foreground))] leading-relaxed">
            Access is by invitation only. Reach out to the worship team lead to get added.
          </p>
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────────────────── */}
      <footer className="border-t border-[hsl(var(--border))] py-8 text-center">
        <p className="text-xs text-[hsl(var(--muted-foreground))]">
          © {new Date().getFullYear()} VPC Music
        </p>
      </footer>
    </div>
  );
}
