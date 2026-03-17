import { Router } from "express";
import { and, asc, eq } from "drizzle-orm";
import { db } from "../../db.js";
import { songCollaborationEntries, songs } from "../../schema/index.js";
import { createError, asyncHandler } from "../../middlewares/errorHandler.js";
import { auth } from "../../middlewares/auth.js";
import { orgContext, requireOrg, requireOrgRole } from "../../middlewares/orgContext.js";

export const collaborationRoutes = Router();

const ALLOWED_TYPES = new Set(["comment", "rehearsal_marker", "rehearsal_note"]);
const ALLOWED_STATUSES = new Set(["open", "resolved"]);

function getRequesterDisplayName(req) {
  return req.user?.displayName || req.user?.email || "Team member";
}

async function loadSongInActiveOrganization(songId, organizationId) {
  if (!organizationId) {
    return null;
  }

  const [song] = await db
    .select({ id: songs.id, organizationId: songs.organizationId })
    .from(songs)
    .where(and(eq(songs.id, songId), eq(songs.organizationId, organizationId)))
    .limit(1);

  return song || null;
}

async function requireSongInActiveOrganization(songId, organizationId) {
  const song = await loadSongInActiveOrganization(songId, organizationId);
  if (!song) {
    throw createError(404, "Song not found");
  }
  return song;
}

async function loadEntry(entryId, songId) {
  const [entry] = await db
    .select()
    .from(songCollaborationEntries)
    .where(and(eq(songCollaborationEntries.id, entryId), eq(songCollaborationEntries.songId, songId)))
    .limit(1);

  return entry || null;
}

collaborationRoutes.get(
  "/:songId/collaboration",
  auth,
  orgContext,
  requireOrg,
  asyncHandler(async (req, res) => {
    await requireSongInActiveOrganization(req.params.songId, req.org.id);

    const items = await db
      .select()
      .from(songCollaborationEntries)
      .where(and(
        eq(songCollaborationEntries.songId, req.params.songId),
        eq(songCollaborationEntries.organizationId, req.org.id),
      ))
      .orderBy(asc(songCollaborationEntries.createdAt));

    res.json({ items });
  })
);

collaborationRoutes.post(
  "/:songId/collaboration",
  auth,
  orgContext,
  requireOrg,
  requireOrgRole("admin", "musician"),
  asyncHandler(async (req, res) => {
    const { type, anchor, title, content, parentId } = req.body;

    await requireSongInActiveOrganization(req.params.songId, req.org.id);

    if (!ALLOWED_TYPES.has(type)) {
      throw createError(400, "Valid collaboration item type is required");
    }

    if (!content?.trim()) {
      throw createError(400, "Content is required");
    }

    let resolvedParentId = null;
    if (parentId) {
      if (type !== "comment") {
        throw createError(400, "Only comments can be replies");
      }

      const parent = await loadEntry(parentId, req.params.songId);
      if (!parent || parent.type !== "comment") {
        throw createError(404, "Parent comment not found");
      }

      resolvedParentId = parent.id;
    }

    const [item] = await db
      .insert(songCollaborationEntries)
      .values({
        songId: req.params.songId,
        organizationId: req.org.id,
        authorId: req.user.id,
        authorName: getRequesterDisplayName(req),
        parentId: resolvedParentId,
        type,
        anchor: anchor?.trim() || null,
        title: title?.trim() || null,
        content: content.trim(),
        status: "open",
      })
      .returning();

    res.status(201).json({ item });
  })
);

collaborationRoutes.patch(
  "/:songId/collaboration/:entryId",
  auth,
  orgContext,
  requireOrg,
  requireOrgRole("admin", "musician"),
  asyncHandler(async (req, res) => {
    await requireSongInActiveOrganization(req.params.songId, req.org.id);

    const existing = await loadEntry(req.params.entryId, req.params.songId);
    if (!existing || existing.organizationId !== req.org.id) {
      throw createError(404, "Collaboration item not found");
    }

    const nextContent = req.body.content !== undefined ? req.body.content?.trim() || "" : existing.content;
    if (!nextContent) {
      throw createError(400, "Content is required");
    }

    const nextStatus = req.body.status ?? existing.status ?? "open";
    if (!ALLOWED_STATUSES.has(nextStatus)) {
      throw createError(400, "Invalid status");
    }

    const [item] = await db
      .update(songCollaborationEntries)
      .set({
        ...(req.body.anchor !== undefined && { anchor: req.body.anchor?.trim() || null }),
        ...(req.body.title !== undefined && { title: req.body.title?.trim() || null }),
        ...(req.body.content !== undefined && { content: nextContent }),
        ...(req.body.status !== undefined && { status: nextStatus }),
        updatedAt: new Date(),
      })
      .where(eq(songCollaborationEntries.id, req.params.entryId))
      .returning();

    res.json({ item });
  })
);

collaborationRoutes.delete(
  "/:songId/collaboration/:entryId",
  auth,
  orgContext,
  requireOrg,
  requireOrgRole("admin", "musician"),
  asyncHandler(async (req, res) => {
    await requireSongInActiveOrganization(req.params.songId, req.org.id);

    const existing = await loadEntry(req.params.entryId, req.params.songId);
    if (!existing || existing.organizationId !== req.org.id) {
      throw createError(404, "Collaboration item not found");
    }

    await db
      .delete(songCollaborationEntries)
      .where(eq(songCollaborationEntries.id, req.params.entryId));

    if (existing.type === "comment") {
      await db
        .delete(songCollaborationEntries)
        .where(eq(songCollaborationEntries.parentId, req.params.entryId));
    }

    res.json({ message: "Collaboration item deleted" });
  })
);