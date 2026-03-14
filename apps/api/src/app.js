import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { errorHandler } from "./middlewares/errorHandler.js";
import { httpLogger } from "./middlewares/httpLogger.js";

// Route imports
import { authRoutes } from "./routes/auth.js";
import { songRoutes } from "./features/songs/routes.js";
import { setlistRoutes } from "./features/setlists/routes.js";
import { platformRoutes } from "./features/platform/routes.js";

const app = express();

// ── Middleware ────────────────────────────────────
app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:5175",
  credentials: true,
}));
app.use(express.json({ limit: "5mb" }));
app.use(cookieParser());
app.use(httpLogger);

// ── Health check ─────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Routes ───────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/songs", songRoutes);
app.use("/api/setlists", setlistRoutes);
app.use("/api/platform", platformRoutes);

// ── Error handler (must be last) ─────────────────
app.use(errorHandler);

export { app };
