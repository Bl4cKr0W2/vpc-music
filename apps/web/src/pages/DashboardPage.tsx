import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { songsApi, setlistsApi, eventsApi, type Song, type Setlist, type Event } from "@/lib/api-client";
import { Music, ListMusic, Plus, Search, Calendar, MapPin } from "lucide-react";

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
  const { user } = useAuth();
  const [recentSongs, setRecentSongs] = useState<Song[]>([]);
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [songRes, setlistRes, eventRes] = await Promise.all([
          songsApi.list({ limit: 6 }),
          setlistsApi.list(),
          eventsApi.list({ upcoming: true }),
        ]);
        setRecentSongs(songRes.songs);
        setSetlists(setlistRes.setlists);
        setUpcomingEvents(eventRes.events);
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
        <h2 className="text-2xl font-brand text-[hsl(var(--foreground))]">
          Welcome{user?.displayName ? `, ${user.displayName}` : ""}
        </h2>
        <p className="text-[hsl(var(--muted-foreground))]">
          Here's an overview of your library.
        </p>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <Link
          to="/songs/new"
          className="inline-flex items-center gap-2 rounded-md bg-[hsl(var(--secondary))] px-4 py-2 text-sm font-medium text-[hsl(var(--secondary-foreground))] hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" /> New Song
        </Link>
        <Link
          to="/setlists/new"
          className="inline-flex items-center gap-2 rounded-md border border-[hsl(var(--border))] px-4 py-2 text-sm font-medium text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
        >
          <Plus className="h-4 w-4" /> New Setlist
        </Link>
        <Link
          to="/songs"
          className="inline-flex items-center gap-2 rounded-md border border-[hsl(var(--border))] px-4 py-2 text-sm font-medium text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
        >
          <Search className="h-4 w-4" /> Browse Songs
        </Link>
      </div>

      {/* Upcoming events */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-brand text-[hsl(var(--foreground))] flex items-center gap-2">
            <Calendar className="h-5 w-5 text-[hsl(var(--secondary))]" />
            Upcoming Events
          </h3>
        </div>
        {loading ? (
          <div className="text-sm text-[hsl(var(--muted-foreground))]">Loading...</div>
        ) : upcomingEvents.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[hsl(var(--border))] p-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
            No upcoming events
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {upcomingEvents.map((evt) => (
              <div
                key={evt.id}
                className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4"
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
                      className="inline-flex items-center gap-1 text-xs text-[hsl(var(--secondary))] hover:underline"
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
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-brand text-[hsl(var(--foreground))] flex items-center gap-2">
            <Music className="h-5 w-5 text-[hsl(var(--secondary))]" />
            Recent Songs
          </h3>
          <Link to="/songs" className="text-sm text-[hsl(var(--secondary))] hover:underline">
            View all
          </Link>
        </div>
        {loading ? (
          <div className="text-sm text-[hsl(var(--muted-foreground))]">Loading...</div>
        ) : recentSongs.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[hsl(var(--border))] p-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
            No songs yet.{" "}
            <Link to="/songs/new" className="text-[hsl(var(--secondary))] hover:underline">
              Create your first song
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recentSongs.map((song) => (
              <Link
                key={song.id}
                to={`/songs/${song.id}`}
                className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 hover:border-[hsl(var(--secondary))] transition-colors"
              >
                <div className="font-medium text-[hsl(var(--foreground))] truncate">
                  {song.title}
                </div>
                <div className="mt-1 flex items-center gap-3 text-xs text-[hsl(var(--muted-foreground))]">
                  {song.key && <span>Key: {song.key}</span>}
                  {song.tempo && <span>{song.tempo} BPM</span>}
                  {song.artist && <span>{song.artist}</span>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Setlists */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-brand text-[hsl(var(--foreground))] flex items-center gap-2">
            <ListMusic className="h-5 w-5 text-[hsl(var(--secondary))]" />
            Setlists
          </h3>
          <Link to="/setlists" className="text-sm text-[hsl(var(--secondary))] hover:underline">
            View all
          </Link>
        </div>
        {loading ? (
          <div className="text-sm text-[hsl(var(--muted-foreground))]">Loading...</div>
        ) : setlists.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[hsl(var(--border))] p-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
            No setlists yet.{" "}
            <Link to="/setlists/new" className="text-[hsl(var(--secondary))] hover:underline">
              Create your first setlist
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {setlists.map((sl) => (
              <Link
                key={sl.id}
                to={`/setlists/${sl.id}`}
                className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 hover:border-[hsl(var(--secondary))] transition-colors"
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
