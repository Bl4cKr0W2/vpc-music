import { Router } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db } from "../../db.js";
import { stickyNotes, songs } from "../../schema/index.js";
import { createError, asyncHandler } from "../../middlewares/errorHandler.js";
import { auth } from "../../middlewares/auth.js";
import { orgContext } from "../../middlewares/orgContext.js";

export const stickyNoteRoutes = Router();

// ── GET /api/songs/:songId/notes — list my notes for a song ──
stickyNoteRoutes.get(
  "/:songId/notes",
  auth,
  orgContext,
  asyncHandler(async (req, res) => {
    const notes = await db
      .select()
      .from(stickyNotes)
      .where(
        and(
          eq(stickyNotes.songId, req.params.songId),
          eq(stickyNotes.userId, req.user.id)
        )
      )
      .orderBy(desc(stickyNotes.createdAt));

    res.json({ notes });
  })
);

// ── POST /api/songs/:songId/notes — create a note ────────────
stickyNoteRoutes.post(
  "/:songId/notes",
  auth,
  orgContext,
  asyncHandler(async (req, res) => {
    const { content, color } = req.body;

    if (!content?.trim()) {
      throw createError(400, "Note content is required");
    }

    // Verify song exists
    const [song] = await db
      .select({ id: songs.id })
      .from(songs)
      .where(eq(songs.id, req.params.songId))
      .limit(1);

    if (!song) {
      throw createError(404, "Song not found");
    }

    const [note] = await db
      .insert(stickyNotes)
      .values({
        songId: req.params.songId,
        userId: req.user.id,
        organizationId: req.org?.id || null,
        content: content.trim(),
        color: color || "yellow",
      })
      .returning();

    res.status(201).json({ note });
  })
);

// ── PUT /api/songs/:songId/notes/:noteId — update a note ─────
stickyNoteRoutes.put(
  "/:songId/notes/:noteId",
  auth,
  asyncHandler(async (req, res) => {
    const { content, color } = req.body;

    const [existing] = await db
      .select()
      .from(stickyNotes)
      .where(
        and(
          eq(stickyNotes.id, req.params.noteId),
          eq(stickyNotes.userId, req.user.id)
        )
      )
      .limit(1);

    if (!existing) {
      throw createError(404, "Note not found");
    }

    const [note] = await db
      .update(stickyNotes)
      .set({
        ...(content !== undefined && { content: content.trim() }),
        ...(color !== undefined && { color }),
        updatedAt: new Date(),
      })
      .where(eq(stickyNotes.id, req.params.noteId))
      .returning();

    res.json({ note });
  })
);

// ── DELETE /api/songs/:songId/notes/:noteId — delete a note ──
stickyNoteRoutes.delete(
  "/:songId/notes/:noteId",
  auth,
  asyncHandler(async (req, res) => {
    const [existing] = await db
      .select()
      .from(stickyNotes)
      .where(
        and(
          eq(stickyNotes.id, req.params.noteId),
          eq(stickyNotes.userId, req.user.id)
        )
      )
      .limit(1);

    if (!existing) {
      throw createError(404, "Note not found");
    }

    await db.delete(stickyNotes).where(eq(stickyNotes.id, req.params.noteId));

    res.json({ message: "Note deleted" });
  })
);
