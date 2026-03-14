import "dotenv/config";
import { createServer } from "http";
import { Server } from "socket.io";
import { app } from "./app.js";
import { logger } from "./utils/logger.js";

const PORT = process.env.PORT || 3000;

const server = createServer(app);

// Socket.io for real-time features (live setlist sync, etc.)
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    credentials: true,
  },
});

io.on("connection", (socket) => {
  logger.info(`Socket connected: ${socket.id}`);
  socket.on("disconnect", () => {
    logger.info(`Socket disconnected: ${socket.id}`);
  });
});

server.listen(PORT, () => {
  logger.info(`VPC Music API running on port ${PORT}`);
});

export { io };
