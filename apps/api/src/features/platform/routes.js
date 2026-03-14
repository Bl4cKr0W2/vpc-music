import { Router } from "express";

export const platformRoutes = Router();

// GET /api/platform/settings — user settings / preferences
platformRoutes.get("/settings", async (_req, res, next) => {
  try {
    res.status(501).json({ message: "Not implemented" });
  } catch (err) {
    next(err);
  }
});

// PUT /api/platform/settings — update user settings
platformRoutes.put("/settings", async (req, res, next) => {
  try {
    res.status(501).json({ message: "Not implemented" });
  } catch (err) {
    next(err);
  }
});
