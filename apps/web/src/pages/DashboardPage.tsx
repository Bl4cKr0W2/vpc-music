import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { songsApi, setlistsApi, eventsApi, songUsageApi, type Song, type Setlist, type Event } from "@/lib/api-client";
import { TempoIndicator } from "@/components/songs/TempoIndicator";
import { Music, ListMusic, Plus, Search, Calendar, MapPin, TrendingUp, AlertCircle } from "lucide-react";

function formatEventDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function DashboardPage() {
  const { user, activeOrg } = useAuth();
  const canEdit = user?.role === "owner" || activeOrg?.role === "admin" || activeOrg?.role === "musician";
  const [recentSongs, setRecentSongs] = useState<Song[]>([]);
  const [frequentSongs, setFrequentSongs] = useState<(Song & { useCount: number; lastUsed: string })[]>([]);
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [songRes, setlistRes, eventRes, usageRes] = await Promise.all([
          songsApi.list({ limit: 6 }),
          setlistsApi.list(),
          eventsApi.list({ upcoming: true }),
          songUsageApi.mostUsed(6).catch(() => ({ songs: [] })),
        ]);
        setRecentSongs(songRes.songs);
        setSetlists(setlistRes.setlists);
        setUpcomingEvents(eventRes.events);
        setFrequentSongs(usageRes.songs);
      } catch {
        // Silently handle — components show empty state
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div>
        <h2 className="page-title">
          Welcome{user?.displayName ? `, ${user.displayName}` : ""}
        </h2>
        <p className="text-[hsl(var(--muted-foreground))] mt-1">
          Here's an overview of your library.
        </p>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        {canEdit && (
          <>
            <Link
              to="/songs/new"
              className="btn-primary"
            >
              <Plus className="h-4 w-4" /> New Song
            </Link>
            <Link
              to="/setlists/new"
              className="btn-outline"
            >
              <Plus className="h-4 w-4" /> New Setlist
            </Link>
          </>
        )}
        <Link
          to="/songs"
          className="btn-outline"
        >
          <Search className="h-4 w-4" /> Browse Songs
        </Link>
      </div>

      {/* Upcoming events */}
      <section className="space-y-3">
        <div className="section-header">
          <h3 className="section-title">
            <Calendar className="section-title-icon" />
            Upcoming Events
          </h3>
        </div>
        {loading ? (
          <div className="text-sm text-[hsl(var(--muted-foreground))]">Loading...</div>
        ) : upcomingEvents.length === 0 ? (
          <div className="card-empty">
            <Calendar className="mx-auto h-10 w-10 text-[hsl(var(--muted-foreground))] mb-2" />
            <p className="text-sm text-[hsl(var(--muted-foreground))]">No upcoming events</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {upcomingEvents.map((evt) => (
              <div
                key={evt.id}
                className="card card-body"
              >
                <div className="font-medium text-[hsl(var(--foreground))] truncate">
                  {evt.title}
                </div>
                <div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                  {formatEventDate(evt.date)}
                </div>
                {evt.location && (
                  <div className="mt-1 flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))]">
                    <MapPin className="h-3 w-3" /> {evt.location}
                  </div>
                )}
                {evt.setlistName && (
                  <div className="mt-2">
                    <Link
                      to={`/setlists/${evt.setlistId}`}
                      className="link-accent inline-flex items-center gap-1 text-xs"
                    >
                      <ListMusic className="h-3 w-3" /> {evt.setlistName}
                    </Link>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recent songs */}
      <section className="space-y-3">
        <div className="section-header">
          <h3 className="section-title">
            <Music className="section-title-icon" />
            Recent Songs
          </h3>
          <Link to="/songs" className="link-accent">
            View all
          </Link>
        </div>
        {loading ? (
          <div className="text-sm text-[hsl(var(--muted-foreground))]">Loading...</div>
        ) : recentSongs.length === 0 ? (
          <div className="card-empty">
            <Music className="mx-auto h-10 w-10 text-[hsl(var(--muted-foreground))] mb-2" />
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              No songs yet.{" "}
              {canEdit && (
                <Link to="/songs/new" className="link-accent">
                  Create your first song
                </Link>
              )}
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recentSongs.map((song) => (
              <Link
                key={song.id}
                to={`/songs/${song.id}`}
                className="card-interactive card-body"
              >
                <div className="font-medium text-[hsl(var(--foreground))] truncate">
                  {song.title}
                </div>
                <div className="mt-1 flex items-center gap-3 text-xs text-[hsl(var(--muted-foreground))]">
                  {song.key && <span className="badge-key">{song.key}</span>}
                  {song.tempo && <TempoIndicator tempo={song.tempo} />}
                  {song.artist && <span>{song.artist}</span>}
                  {/* Song status indicators */}
                  {(!song.key || !song.tempo) && (
                    <span className="inline-flex items-center gap-0.5 text-amber-500" title={`Missing: ${[!song.key && "key", !song.tempo && "tempo"].filter(Boolean).join(", ")}`}>
                      <AlertCircle className="h-3 w-3" />
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Frequently Used Songs */}
      {frequentSongs.length > 0 && (
        <section className="space-y-3">
          <div className="section-header">
            <h3 className="section-title">
              <TrendingUp className="section-title-icon" />
              Frequently Used
            </h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {frequentSongs.map((song) => (
              <Link
                key={song.id}
                to={`/songs/${song.id}`}
                className="card-interactive card-body"
              >
                <div className="font-medium text-[hsl(var(--foreground))] truncate">
                  {song.title}
                </div>
                <div className="mt-1 flex items-center gap-3 text-xs text-[hsl(var(--muted-foreground))]">
                  {song.key && <span className="badge-key">{song.key}</span>}
                  {song.useCount && (
                    <span className="inline-flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" /> {song.useCount}×
                    </span>
                  )}
                  {song.lastUsed && (
                    <span>
                      Last: {new Date(song.lastUsed).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </span>
                  )}
                  {song.artist && <span>{song.artist}</span>}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Setlists */}
      <section className="space-y-3">
        <div className="section-header">
          <h3 className="section-title">
            <ListMusic className="section-title-icon" />
            Setlists
          </h3>
          <Link to="/setlists" className="link-accent">
            View all
          </Link>
        </div>
        {loading ? (
          <div className="text-sm text-[hsl(var(--muted-foreground))]">Loading...</div>
        ) : setlists.length === 0 ? (
          <div className="card-empty">
            <ListMusic className="mx-auto h-10 w-10 text-[hsl(var(--muted-foreground))] mb-2" />
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              No setlists yet.{" "}
              {canEdit && (
                <Link to="/setlists/new" className="link-accent">
                  Create your first setlist
                </Link>
              )}
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {setlists.map((sl) => (
              <Link
                key={sl.id}
                to={`/setlists/${sl.id}`}
                className="card-interactive card-body"
              >
                <div className="font-medium text-[hsl(var(--foreground))] truncate">
                  {sl.name}
                </div>
                <div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                  {sl.songCount ?? 0} song{(sl.songCount ?? 0) !== 1 ? "s" : ""}
                  {sl.category && <span className="ml-2">· {sl.category}</span>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
