import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import passport from "./config/passport.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { httpLogger } from "./middlewares/httpLogger.js";

// Route imports
import { authRoutes } from "./routes/auth.js";
import { songRoutes } from "./features/songs/routes.js";
import { setlistRoutes } from "./features/setlists/routes.js";
import { platformRoutes } from "./features/platform/routes.js";
import { adminRoutes } from "./features/admin/routes.js";
import { eventRoutes } from "./features/events/routes.js";
import { shareRoutes } from "./features/share/routes.js";
import { stickyNoteRoutes } from "./features/songs/stickyNoteRoutes.js";

const app = express();

// ── Middleware ────────────────────────────────────
app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:5176",
  credentials: true,
}));
app.use(express.json({ limit: "5mb" }));
app.use(cookieParser());
app.use(passport.initialize());
app.use(httpLogger);

// ── Health check ─────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Routes ───────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/songs", songRoutes);
app.use("/api/songs", stickyNoteRoutes);  // /api/songs/:songId/notes
app.use("/api/setlists", setlistRoutes);
app.use("/api/platform", platformRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/events", eventRoutes);
app.use("/api", shareRoutes);   // /api/songs/:id/share(s) + /api/shared/:token

// ── Error handler (must be last) ─────────────────
app.use(errorHandler);

export { app };
