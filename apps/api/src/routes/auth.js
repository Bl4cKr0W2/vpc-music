import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { eq, and, gt, isNull } from "drizzle-orm";
import { db } from "../db.js";
import { users, passwordResetTokens } from "../schema/index.js";
import { env } from "../config/env.js";
import { createError, asyncHandler } from "../middlewares/errorHandler.js";
import { auth } from "../middlewares/auth.js";
import { logger } from "../utils/logger.js";

export const authRoutes = Router();

// ── Helper: create JWT and set cookie ────────────────────────
function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );
}

function setTokenCookie(res, token) {
  res.cookie("token", token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

// ── POST /api/auth/register ──────────────────────────────────
authRoutes.post(
  "/register",
  asyncHandler(async (req, res) => {
    const { email, password, displayName } = req.body;

    if (!email || !password) {
      throw createError(400, "Email and password are required");
    }
    if (password.length < 8) {
      throw createError(400, "Password must be at least 8 characters");
    }

    // Check for existing user
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()))
      .limit(1);

    if (existing) {
      throw createError(409, "An account with that email already exists");
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const [user] = await db
      .insert(users)
      .values({
        email: email.toLowerCase().trim(),
        passwordHash,
        displayName: displayName || email.split("@")[0],
        role: "editor", // default role for new users
      })
      .returning({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        role: users.role,
      });

    const token = signToken(user);
    setTokenCookie(res, token);

    res.status(201).json({
      user: { id: user.id, email: user.email, displayName: user.displayName, role: user.role },
      token,
    });
  })
);

// ── POST /api/auth/login ─────────────────────────────────────
authRoutes.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      throw createError(400, "Email and password are required");
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()))
      .limit(1);

    if (!user || !user.passwordHash) {
      throw createError(401, "Invalid email or password");
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw createError(401, "Invalid email or password");
    }

    const token = signToken(user);
    setTokenCookie(res, token);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
      },
      token,
    });
  })
);

// ── POST /api/auth/logout ────────────────────────────────────
authRoutes.post("/logout", (_req, res) => {
  res.clearCookie("token").json({ message: "Logged out" });
});

// ── GET /api/auth/me ─────────────────────────────────────────
authRoutes.get(
  "/me",
  auth,
  asyncHandler(async (req, res) => {
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        role: users.role,
        preferences: users.preferences,
      })
      .from(users)
      .where(eq(users.id, req.user.id))
      .limit(1);

    if (!user) {
      throw createError(404, "User not found");
    }

    res.json({ user });
  })
);

// ── POST /api/auth/forgot-password ───────────────────────────
authRoutes.post(
  "/forgot-password",
  asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
      throw createError(400, "Email is required");
    }

    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()))
      .limit(1);

    // Always return success to prevent email enumeration
    if (!user) {
      res.json({ message: "If that email exists, a reset link has been sent." });
      return;
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.insert(passwordResetTokens).values({
      userId: user.id,
      token,
      expiresAt,
    });

    // TODO: Send actual email. For now, log the reset URL.
    const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${token}`;
    logger.info(`Password reset requested — ${resetUrl}`);

    res.json({ message: "If that email exists, a reset link has been sent." });
  })
);

// ── POST /api/auth/reset-password ────────────────────────────
authRoutes.post(
  "/reset-password",
  asyncHandler(async (req, res) => {
    const { token, password } = req.body;

    if (!token || !password) {
      throw createError(400, "Token and new password are required");
    }
    if (password.length < 8) {
      throw createError(400, "Password must be at least 8 characters");
    }

    const [record] = await db
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.token, token),
          gt(passwordResetTokens.expiresAt, new Date()),
          isNull(passwordResetTokens.usedAt)
        )
      )
      .limit(1);

    if (!record) {
      throw createError(400, "Invalid or expired reset token");
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, record.userId));

    await db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, record.id));

    res.json({ message: "Password reset successfully. You can now log in." });
  })
);
