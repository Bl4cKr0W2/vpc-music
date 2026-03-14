import { Router } from "express";

export const songRoutes = Router();

// GET /api/songs — list all songs
songRoutes.get("/", async (_req, res, next) => {
  try {
    // TODO: query songs from DB
    res.json({ songs: [] });
  } catch (err) {
    next(err);
  }
});

// GET /api/songs/:id — get single song
songRoutes.get("/:id", async (req, res, next) => {
  try {
    // TODO: fetch song by ID
    res.status(501).json({ message: "Not implemented" });
  } catch (err) {
    next(err);
  }
});

// POST /api/songs — create song
songRoutes.post("/", async (req, res, next) => {
  try {
    // TODO: create song (ChordPro content)
    res.status(501).json({ message: "Not implemented" });
  } catch (err) {
    next(err);
  }
});

// PUT /api/songs/:id — update song
songRoutes.put("/:id", async (req, res, next) => {
  try {
    // TODO: update song
    res.status(501).json({ message: "Not implemented" });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/songs/:id — delete song
songRoutes.delete("/:id", async (req, res, next) => {
  try {
    // TODO: delete song
    res.status(501).json({ message: "Not implemented" });
  } catch (err) {
    next(err);
  }
});

// POST /api/songs/import/chrd — import from .chrd format
songRoutes.post("/import/chrd", async (req, res, next) => {
  try {
    // TODO: .chrd → ChordPro conversion
    res.status(501).json({ message: "Not implemented" });
  } catch (err) {
    next(err);
  }
});

// POST /api/songs/import/onsong — import from OnSong format
songRoutes.post("/import/onsong", async (req, res, next) => {
  try {
    // TODO: OnSong → ChordPro conversion
    res.status(501).json({ message: "Not implemented" });
  } catch (err) {
    next(err);
  }
});

// POST /api/songs/import/pdf — import from PDF via PDF.co
songRoutes.post("/import/pdf", async (req, res, next) => {
  try {
    // TODO: PDF → ChordPro conversion pipeline
    res.status(501).json({ message: "Not implemented" });
  } catch (err) {
    next(err);
  }
});

// GET /api/songs/:id/export/chordpro — export as ChordPro
songRoutes.get("/:id/export/chordpro", async (req, res, next) => {
  try {
    // TODO: return raw ChordPro file
    res.status(501).json({ message: "Not implemented" });
  } catch (err) {
    next(err);
  }
});

// GET /api/songs/:id/export/onsong — export as OnSong
songRoutes.get("/:id/export/onsong", async (req, res, next) => {
  try {
    // TODO: ChordPro → OnSong conversion + download
    res.status(501).json({ message: "Not implemented" });
  } catch (err) {
    next(err);
  }
});

// GET /api/songs/:id/export/pdf — export as PDF
songRoutes.get("/:id/export/pdf", async (req, res, next) => {
  try {
    // TODO: ChordPro → PDF rendering
    res.status(501).json({ message: "Not implemented" });
  } catch (err) {
    next(err);
  }
});
