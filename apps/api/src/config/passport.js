/**
 * Passport configuration — Google OAuth2 strategy.
 *
 * Strategy callback:
 * 1. Extract email from the Google profile.
 * 2. If an existing user has this email, return them.
 * 3. If no user exists, reject with a descriptive error (invite-only).
 */
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { eq } from "drizzle-orm";
import { db } from "../db.js";
import { users } from "../schema/index.js";
import { env } from "../config/env.js";

// ── Helper: find existing user from Google profile ────────────

async function findGoogleUser(profile) {
  const email = profile.emails?.[0]?.value;
  if (!email) throw new Error("No email returned from Google");

  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase().trim()))
    .limit(1);

  if (!existing) {
    throw new Error(
      "No account found for this email. Contact your worship team lead to get added."
    );
  }

  return existing;
}

// ── Google strategy ──────────────────────────────────────────

if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL: env.GOOGLE_CALLBACK_URL,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const user = await findGoogleUser(profile);
          done(null, user);
        } catch (err) {
          done(null, false, { message: err.message });
        }
      },
    ),
  );
}

export default passport;
