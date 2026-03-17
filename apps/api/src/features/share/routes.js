import { Router } from "express";
import { eq, and } from "drizzle-orm";
import crypto from "node:crypto";
import { db } from "../../db.js";
import { shareTokens, songs } from "../../schema/index.js";
import { createError, asyncHandler } from "../../middlewares/errorHandler.js";
import { auth } from "../../middlewares/auth.js";
import { orgContext, requireOrg, requireOrgRole } from "../../middlewares/orgContext.js";

export const shareRoutes = Router();

/**
 * Generate a URL-safe random token (32 bytes → 43 chars base64url).
 */
function generateToken() {
  return crypto.randomBytes(32).toString("base64url");
}

// ── POST /api/songs/:id/share — create a share link ─────────
shareRoutes.post(
  "/songs/:id/share",
  auth,
  orgContext,
  requireOrg,
  requireOrgRole("admin", "musician"),
  asyncHandler(async (req, res) => {
    const songId = req.params.id;

    // Verify song exists
    const [song] = await db
      .select({ id: songs.id })
      .from(songs)
      .where(eq(songs.id, songId))
      .limit(1);

    if (!song) throw createError(404, "Song not found");

    const { label, expiresInDays } = req.body;

    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 86400000)
      : null;

    const token = generateToken();

    const [created] = await db
      .insert(shareTokens)
      .values({
        token,
        songId,
        createdBy: req.user.id,
        label: label || null,
        expiresAt,
      })
      .returning();

    res.status(201).json({
      shareToken: created,
      shareUrl: `/shared/${token}`,
    });
  })
);

// ── GET /api/songs/:id/shares — list share tokens for a song ─
shareRoutes.get(
  "/songs/:id/shares",
  auth,
  asyncHandler(async (req, res) => {
    const songId = req.params.id;

    const tokens = await db
      .select()
      .from(shareTokens)
      .where(eq(shareTokens.songId, songId));

    res.json({ shares: tokens });
  })
);

// ── DELETE /api/songs/:id/shares/:tokenId — revoke a token ───
shareRoutes.delete(
  "/songs/:id/shares/:tokenId",
  auth,
  orgContext,
  requireOrg,
  requireOrgRole("admin", "musician"),
  asyncHandler(async (req, res) => {
    const { id: songId, tokenId } = req.params;

    const [existing] = await db
      .select({ id: shareTokens.id })
      .from(shareTokens)
      .where(
        and(eq(shareTokens.id, tokenId), eq(shareTokens.songId, songId))
      )
      .limit(1);

    if (!existing) throw createError(404, "Share token not found");

    await db
      .update(shareTokens)
      .set({ revoked: true })
      .where(eq(shareTokens.id, tokenId));

    res.json({ message: "Share token revoked" });
  })
);

// ── PATCH /api/songs/:id/shares/:tokenId — update label ─────
shareRoutes.patch(
  "/songs/:id/shares/:tokenId",
  auth,
  orgContext,
  requireOrg,
  requireOrgRole("admin", "musician"),
  asyncHandler(async (req, res) => {
    const { id: songId, tokenId } = req.params;
    const { label } = req.body;

    const [existing] = await db
      .select({ id: shareTokens.id })
      .from(shareTokens)
      .where(
        and(eq(shareTokens.id, tokenId), eq(shareTokens.songId, songId))
      )
      .limit(1);

    if (!existing) throw createError(404, "Share token not found");

    const [updated] = await db
      .update(shareTokens)
      .set({ label: label ?? null })
      .where(eq(shareTokens.id, tokenId))
      .returning();

    res.json({ shareToken: updated });
  })
);

// ── GET /api/shared/:token — PUBLIC: view a shared song ──────
// No auth required — the token IS the credential.
shareRoutes.get(
  "/shared/:token",
  asyncHandler(async (req, res) => {
    const token = req.params.token;

    const [share] = await db
      .select()
      .from(shareTokens)
      .where(eq(shareTokens.token, token))
      .limit(1);

    if (!share) throw createError(404, "Invalid or expired share link");
    if (share.revoked) throw createError(410, "This share link has been revoked");
    if (share.expiresAt && new Date(share.expiresAt) < new Date()) {
      throw createError(410, "This share link has expired");
    }

    // Fetch the song — only fields safe for read-only view
    const [song] = await db
      .select({
        id: songs.id,
        title: songs.title,
        aka: songs.aka,
        category: songs.category,
        key: songs.key,
        tempo: songs.tempo,
        artist: songs.artist,
        shout: songs.shout,
        content: songs.content,
        tags: songs.tags,
      })
      .from(songs)
      .where(eq(songs.id, share.songId))
      .limit(1);

    if (!song) throw createError(404, "Song no longer available");

    res.json({ song, shared: true });
  })
);
