import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/contexts/AuthContext";

const API_URL = import.meta.env.VITE_API_URL || "";

interface RoomState {
  conductor: { userId: string; displayName: string } | null;
  members: { userId: string; displayName: string }[];
  currentSong: number;
  currentSection: string | null;
}

interface UseConductorOptions {
  setlistId: string;
  mode: "conductor" | "member";
}

/**
 * Hook for Socket.IO conductor mode.
 * Manages the connection to a setlist room and provides real-time controls.
 */
export function useConductor({ setlistId, mode }: UseConductorOptions) {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [roomState, setRoomState] = useState<RoomState>({
    conductor: null,
    members: [],
    currentSong: 0,
    currentSection: null,
  });
  const [currentSong, setCurrentSong] = useState(0);
  const [currentSection, setCurrentSection] = useState<string | null>(null);
  const [scrollTop, setScrollTop] = useState(0);

  useEffect(() => {
    if (!setlistId || !user) return;

    const socket = io(API_URL, {
      withCredentials: true,
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);

      // Join the room
      const joinEvent = mode === "conductor" ? "conductor:join" : "member:join";
      socket.emit(joinEvent, {
        setlistId,
        userId: user.id,
        displayName: user.displayName,
      });
    });

    socket.on("disconnect", () => setConnected(false));

    // Room state updates
    socket.on("room:state", (state: RoomState) => {
      setRoomState(state);
      setCurrentSong(state.currentSong);
      setCurrentSection(state.currentSection);
    });

    // Song changed by conductor
    socket.on("song:changed", ({ songIndex, section }: { songIndex: number; section: string | null }) => {
      setCurrentSong(songIndex);
      setCurrentSection(section);
    });

    // Scroll sync from conductor
    socket.on("scroll:sync", ({ scrollTop: st }: { scrollTop: number }) => {
      setScrollTop(st);
    });

    // Member events
    socket.on("member:joined", ({ userId, displayName }: { userId: string; displayName: string }) => {
      setRoomState((prev) => ({
        ...prev,
        members: [...prev.members, { userId, displayName }],
      }));
    });

    socket.on("member:left", ({ userId }: { userId: string }) => {
      setRoomState((prev) => ({
        ...prev,
        members: prev.members.filter((m) => m.userId !== userId),
      }));
    });

    socket.on("conductor:left", () => {
      setRoomState((prev) => ({ ...prev, conductor: null }));
    });

    return () => {
      socket.emit("leave");
      socket.disconnect();
      socketRef.current = null;
    };
  }, [setlistId, mode, user]);

  // ── Conductor controls ─────────────────────────
  const goToSong = useCallback(
    (songIndex: number, section?: string) => {
      if (mode !== "conductor" || !socketRef.current) return;
      setCurrentSong(songIndex);
      setCurrentSection(section || null);
      socketRef.current.emit("conductor:goto", { songIndex, section });
    },
    [mode]
  );

  const broadcastScroll = useCallback(
    (scrollTop: number) => {
      if (mode !== "conductor" || !socketRef.current) return;
      socketRef.current.emit("conductor:scroll", { scrollTop });
    },
    [mode]
  );

  const leave = useCallback(() => {
    socketRef.current?.emit("leave");
    socketRef.current?.disconnect();
  }, []);

  return {
    connected,
    roomState,
    currentSong,
    currentSection,
    scrollTop,
    goToSong,
    broadcastScroll,
    leave,
    isConductor: mode === "conductor",
  };
}
