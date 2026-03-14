import { Router } from "express";

export const setlistRoutes = Router();

// GET /api/setlists
setlistRoutes.get("/", async (_req, res, next) => {
  try {
    res.json({ setlists: [] });
  } catch (err) {
    next(err);
  }
});

// POST /api/setlists
setlistRoutes.post("/", async (req, res, next) => {
  try {
    res.status(501).json({ message: "Not implemented" });
  } catch (err) {
    next(err);
  }
});

// PUT /api/setlists/:id
setlistRoutes.put("/:id", async (req, res, next) => {
  try {
    res.status(501).json({ message: "Not implemented" });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/setlists/:id
setlistRoutes.delete("/:id", async (req, res, next) => {
  try {
    res.status(501).json({ message: "Not implemented" });
  } catch (err) {
    next(err);
  }
});
