import { describe, it, expect, vi, beforeEach } from "vitest";
import { setupConductorMode } from "../../src/realtime/conductor.js";

/**
 * Unit tests for conductor mode Socket.IO event handlers.
 * We mock the Socket.IO server & socket objects to test event logic
 * without starting a real WebSocket server.
 */

// Mock logger to avoid winston dependency issues in test
vi.mock("../../src/utils/logger.js", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

/** Create a mock socket that stores event handlers for testing */
function createMockSocket(id = "socket-1") {
  const handlers = {};
  const joinedRooms = new Set();
  const emittedEvents = [];
  const broadcastedEvents = [];

  const broadcastTo = {
    emit: (event, data) => {
      broadcastedEvents.push({ event, data });
    },
  };

  return {
    id,
    handlers,
    joinedRooms,
    emittedEvents,
    broadcastedEvents,
    on(event, handler) {
      handlers[event] = handler;
    },
    join(room) {
      joinedRooms.add(room);
    },
    leave(room) {
      joinedRooms.delete(room);
    },
    emit(event, data) {
      emittedEvents.push({ event, data });
    },
    to(_room) {
      return broadcastTo;
    },
  };
}

/** Create a mock Socket.IO server */
function createMockIO() {
  const connectionHandlers = [];
  const roomEmits = [];

  return {
    connectionHandlers,
    roomEmits,
    on(event, handler) {
      if (event === "connection") {
        connectionHandlers.push(handler);
      }
    },
    to(room) {
      return {
        emit(event, data) {
          roomEmits.push({ room, event, data });
        },
      };
    },
    /** Simulate a new socket connection */
    connect(socketId) {
      const socket = createMockSocket(socketId);
      for (const handler of connectionHandlers) {
        handler(socket);
      }
      return socket;
    },
  };
}

describe("setupConductorMode", () => {
  let io;

  beforeEach(() => {
    io = createMockIO();
    setupConductorMode(io);
  });

  it("registers a connection handler on the IO server", () => {
    expect(io.connectionHandlers).toHaveLength(1);
  });

  describe("conductor:join", () => {
    it("makes the socket join a room keyed by setlist ID", () => {
      const socket = io.connect("s1");
      socket.handlers["conductor:join"]({
        setlistId: "sl-1",
        userId: "u-1",
        displayName: "Worship Leader",
      });

      expect(socket.joinedRooms.has("setlist:sl-1")).toBe(true);
    });

    it("broadcasts room:state to the room after joining", () => {
      const socket = io.connect("s1");
      socket.handlers["conductor:join"]({
        setlistId: "sl-2",
        userId: "u-2",
        displayName: "Leader",
      });

      // io.to(room).emit should have been called with room:state
      const stateEmit = io.roomEmits.find(
        (e) => e.room === "setlist:sl-2" && e.event === "room:state"
      );
      expect(stateEmit).toBeDefined();
      expect(stateEmit.data.conductor).toMatchObject({
        userId: "u-2",
        displayName: "Leader",
      });
      expect(stateEmit.data.members).toEqual([]);
      expect(stateEmit.data.currentSong).toBe(0);
    });
  });

  describe("member:join", () => {
    it("makes the socket join the room and sends room:state to member", () => {
      const socket = io.connect("member-s1");
      socket.handlers["member:join"]({
        setlistId: "sl-3",
        userId: "u-m1",
        displayName: "Guitarist",
      });

      expect(socket.joinedRooms.has("setlist:sl-3")).toBe(true);

      // Should send room:state directly to the member
      const stateEmit = socket.emittedEvents.find((e) => e.event === "room:state");
      expect(stateEmit).toBeDefined();
      expect(stateEmit.data.members).toHaveLength(1);
      expect(stateEmit.data.members[0].displayName).toBe("Guitarist");
    });

    it("broadcasts member:joined to other room members", () => {
      const socket = io.connect("member-s2");
      socket.handlers["member:join"]({
        setlistId: "sl-4",
        userId: "u-m2",
        displayName: "Bassist",
      });

      const broadcast = socket.broadcastedEvents.find(
        (e) => e.event === "member:joined"
      );
      expect(broadcast).toBeDefined();
      expect(broadcast.data.userId).toBe("u-m2");
      expect(broadcast.data.displayName).toBe("Bassist");
    });
  });

  describe("conductor:goto", () => {
    it("broadcasts song:changed to the room", () => {
      const socket = io.connect("cond-s1");
      socket.handlers["conductor:join"]({
        setlistId: "sl-5",
        userId: "u-c1",
        displayName: "Conductor",
      });

      socket.handlers["conductor:goto"]({ songIndex: 2, section: "Chorus" });

      const broadcast = socket.broadcastedEvents.find(
        (e) => e.event === "song:changed"
      );
      expect(broadcast).toBeDefined();
      expect(broadcast.data.songIndex).toBe(2);
      expect(broadcast.data.section).toBe("Chorus");
    });

    it("ignores goto if not conductor", () => {
      const socket = io.connect("member-s3");
      socket.handlers["member:join"]({
        setlistId: "sl-6",
        userId: "u-m3",
        displayName: "Drummer",
      });

      socket.handlers["conductor:goto"]({ songIndex: 1 });

      const broadcast = socket.broadcastedEvents.find(
        (e) => e.event === "song:changed"
      );
      expect(broadcast).toBeUndefined();
    });

    it("ignores goto if no room joined", () => {
      const socket = io.connect("orphan-s1");
      socket.handlers["conductor:goto"]({ songIndex: 0 });

      expect(socket.broadcastedEvents).toHaveLength(0);
    });
  });

  describe("conductor:scroll", () => {
    it("broadcasts scroll:sync to the room", () => {
      const socket = io.connect("cond-s2");
      socket.handlers["conductor:join"]({
        setlistId: "sl-7",
        userId: "u-c2",
        displayName: "MC",
      });

      socket.handlers["conductor:scroll"]({ scrollTop: 450 });

      const broadcast = socket.broadcastedEvents.find(
        (e) => e.event === "scroll:sync"
      );
      expect(broadcast).toBeDefined();
      expect(broadcast.data.scrollTop).toBe(450);
    });

    it("ignores scroll if not conductor", () => {
      const socket = io.connect("member-s4");
      socket.handlers["member:join"]({
        setlistId: "sl-8",
        userId: "u-m4",
        displayName: "Singer",
      });

      socket.handlers["conductor:scroll"]({ scrollTop: 100 });

      const scrollBroadcast = socket.broadcastedEvents.find(
        (e) => e.event === "scroll:sync"
      );
      expect(scrollBroadcast).toBeUndefined();
    });
  });

  describe("leave", () => {
    it("conductor leaving broadcasts conductor:left", () => {
      const socket = io.connect("cond-leave-1");
      socket.handlers["conductor:join"]({
        setlistId: "sl-leave-1",
        userId: "u-cl1",
        displayName: "Leader",
      });

      socket.handlers["leave"]();

      const leftEmit = io.roomEmits.find(
        (e) => e.room === "setlist:sl-leave-1" && e.event === "conductor:left"
      );
      expect(leftEmit).toBeDefined();
    });

    it("member leaving broadcasts member:left", () => {
      const socket = io.connect("member-leave-1");
      socket.handlers["member:join"]({
        setlistId: "sl-leave-2",
        userId: "u-ml1",
        displayName: "Keys",
      });

      socket.handlers["leave"]();

      const leftBroadcast = socket.broadcastedEvents.find(
        (e) => e.event === "member:left"
      );
      expect(leftBroadcast).toBeDefined();
      expect(leftBroadcast.data.userId).toBe("u-ml1");
    });
  });

  describe("disconnect", () => {
    it("cleans up conductor on disconnect", () => {
      const socket = io.connect("cond-dc-1");
      socket.handlers["conductor:join"]({
        setlistId: "sl-dc-1",
        userId: "u-cdc1",
        displayName: "DC Leader",
      });

      socket.handlers["disconnect"]();

      const leftEmit = io.roomEmits.find(
        (e) => e.room === "setlist:sl-dc-1" && e.event === "conductor:left"
      );
      expect(leftEmit).toBeDefined();
    });

    it("cleans up member on disconnect", () => {
      const socket = io.connect("member-dc-1");
      socket.handlers["member:join"]({
        setlistId: "sl-dc-2",
        userId: "u-mdc1",
        displayName: "DC Guitarist",
      });

      socket.handlers["disconnect"]();

      const leftBroadcast = socket.broadcastedEvents.find(
        (e) => e.event === "member:left"
      );
      expect(leftBroadcast).toBeDefined();
      expect(leftBroadcast.data.userId).toBe("u-mdc1");
    });
  });
});
