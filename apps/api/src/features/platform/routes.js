import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../../db.js";
import { users } from "../../schema/index.js";
import { createError, asyncHandler } from "../../middlewares/errorHandler.js";
import { auth } from "../../middlewares/auth.js";

export const platformRoutes = Router();

// ── GET /api/platform/settings — user preferences ────────────
platformRoutes.get(
  "/settings",
  auth,
  asyncHandler(async (req, res) => {
    const [user] = await db
      .select({ preferences: users.preferences })
      .from(users)
      .where(eq(users.id, req.user.id))
      .limit(1);

    if (!user) throw createError(404, "User not found");

    const prefs = user.preferences ? JSON.parse(user.preferences) : {};
    res.json({ settings: prefs });
  })
);

// ── PUT /api/platform/settings — update user preferences ─────
platformRoutes.put(
  "/settings",
  auth,
  asyncHandler(async (req, res) => {
    const settings = req.body;

    // Merge with existing preferences
    const [user] = await db
      .select({ preferences: users.preferences })
      .from(users)
      .where(eq(users.id, req.user.id))
      .limit(1);

    if (!user) throw createError(404, "User not found");

    const existing = user.preferences ? JSON.parse(user.preferences) : {};
    const merged = { ...existing, ...settings };

    await db
      .update(users)
      .set({ preferences: JSON.stringify(merged), updatedAt: new Date() })
      .where(eq(users.id, req.user.id));

    res.json({ settings: merged });
  })
);

// ── PUT /api/platform/profile — update display name ──────────
platformRoutes.put(
  "/profile",
  auth,
  asyncHandler(async (req, res) => {
    const { displayName } = req.body;

    if (!displayName) throw createError(400, "Display name is required");

    const [user] = await db
      .update(users)
      .set({ displayName, updatedAt: new Date() })
      .where(eq(users.id, req.user.id))
      .returning({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        role: users.role,
      });

    res.json({ user });
  })
);

// ── PUT /api/platform/password — change password ─────────────
platformRoutes.put(
  "/password",
  auth,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw createError(400, "Current and new passwords are required");
    }
    if (newPassword.length < 8) {
      throw createError(400, "New password must be at least 8 characters");
    }

    const [user] = await db
      .select({ passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.id, req.user.id))
      .limit(1);

    if (!user) throw createError(404, "User not found");

    const bcrypt = await import("bcryptjs");
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw createError(401, "Current password is incorrect");

    const hash = await bcrypt.hash(newPassword, 12);
    await db
      .update(users)
      .set({ passwordHash: hash, updatedAt: new Date() })
      .where(eq(users.id, req.user.id));

    res.json({ message: "Password updated" });
  })
);
