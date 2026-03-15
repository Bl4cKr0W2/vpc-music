/**
 * Socket.IO Conductor Mode — real-time setlist sync.
 *
 * Architecture:
 *   - Each setlist session is a "room" (room id = setlist UUID)
 *   - One user is the "conductor" — they control what song/section everyone sees
 *   - Band members join the room and receive position updates in real time
 *
 * Events:
 *   Client → Server:
 *     conductor:join   { setlistId }         — join a setlist room as conductor
 *     member:join      { setlistId }         — join a setlist room as band member
 *     conductor:goto   { songIndex, section? } — conductor navigates to song/section
 *     conductor:scroll { scrollTop }         — conductor broadcasts scroll position
 *     leave                                  — leave current room
 *
 *   Server → Client:
 *     room:state       { conductor, members, currentSong, currentSection }
 *     song:changed     { songIndex, section? }
 *     scroll:sync      { scrollTop }
 *     member:joined    { userId, displayName }
 *     member:left      { userId }
 *     conductor:left   {}
 */

import { logger } from "../utils/logger.js";

/** Room state tracked in memory */
const rooms = new Map();

/**
 * Attach conductor mode handlers to the Socket.IO server instance.
 * @param {import('socket.io').Server} io
 */
export function setupConductorMode(io) {
  io.on("connection", (socket) => {
    let currentRoom = null;
    let isConductor = false;

    // ── Join as conductor ──────────────────────────
    socket.on("conductor:join", ({ setlistId, userId, displayName }) => {
      currentRoom = `setlist:${setlistId}`;
      isConductor = true;
      socket.join(currentRoom);

      // Initialize room state
      if (!rooms.has(currentRoom)) {
        rooms.set(currentRoom, {
          conductor: { socketId: socket.id, userId, displayName },
          members: [],
          currentSong: 0,
          currentSection: null,
        });
      } else {
        const room = rooms.get(currentRoom);
        room.conductor = { socketId: socket.id, userId, displayName };
      }

      const state = rooms.get(currentRoom);
      // Notify everyone in the room
      io.to(currentRoom).emit("room:state", {
        conductor: state.conductor,
        members: state.members,
        currentSong: state.currentSong,
        currentSection: state.currentSection,
      });

      logger.info(`Conductor joined room ${currentRoom}`, { userId, displayName });
    });

    // ── Join as band member ────────────────────────
    socket.on("member:join", ({ setlistId, userId, displayName }) => {
      currentRoom = `setlist:${setlistId}`;
      isConductor = false;
      socket.join(currentRoom);

      if (!rooms.has(currentRoom)) {
        rooms.set(currentRoom, {
          conductor: null,
          members: [],
          currentSong: 0,
          currentSection: null,
        });
      }

      const room = rooms.get(currentRoom);
      room.members.push({ socketId: socket.id, userId, displayName });

      // Send current state to the new member
      socket.emit("room:state", {
        conductor: room.conductor,
        members: room.members,
        currentSong: room.currentSong,
        currentSection: room.currentSection,
      });

      // Notify others
      socket.to(currentRoom).emit("member:joined", { userId, displayName });

      logger.info(`Member joined room ${currentRoom}`, { userId, displayName });
    });

    // ── Conductor navigates to song ────────────────
    socket.on("conductor:goto", ({ songIndex, section }) => {
      if (!currentRoom || !isConductor) return;
      const room = rooms.get(currentRoom);
      if (!room) return;

      room.currentSong = songIndex;
      room.currentSection = section || null;

      socket.to(currentRoom).emit("song:changed", {
        songIndex,
        section: section || null,
      });
    });

    // ── Conductor broadcasts scroll position ───────
    socket.on("conductor:scroll", ({ scrollTop }) => {
      if (!currentRoom || !isConductor) return;
      socket.to(currentRoom).emit("scroll:sync", { scrollTop });
    });

    // ── Leave room ─────────────────────────────────
    socket.on("leave", () => {
      cleanup();
    });

    // ── Disconnect ─────────────────────────────────
    socket.on("disconnect", () => {
      cleanup();
      logger.info(`Socket disconnected: ${socket.id}`);
    });

    function cleanup() {
      if (!currentRoom) return;
      const room = rooms.get(currentRoom);
      if (!room) return;

      if (isConductor) {
        room.conductor = null;
        io.to(currentRoom).emit("conductor:left", {});
      } else {
        const member = room.members.find((m) => m.socketId === socket.id);
        room.members = room.members.filter((m) => m.socketId !== socket.id);
        if (member) {
          socket
            .to(currentRoom)
            .emit("member:left", { userId: member.userId });
        }
      }

      // Clean up empty rooms
      if (!room.conductor && room.members.length === 0) {
        rooms.delete(currentRoom);
        logger.info(`Room ${currentRoom} cleaned up (empty)`);
      }

      socket.leave(currentRoom);
      currentRoom = null;
      isConductor = false;
    }
  });

  logger.info("Conductor mode socket handlers attached");
}
