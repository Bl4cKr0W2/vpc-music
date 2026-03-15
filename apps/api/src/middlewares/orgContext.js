/**
 * Organization context middleware.
 * After auth, looks up the user's org membership(s) and attaches them to the request.
 *
 *   req.orgs        — array of { id, name, role } for all org memberships
 *   req.org         — the active org context (auto-selected if only one, or via X-Organization-Id header)
 *   req.orgRole     — shortcut to req.org.role (admin | musician | observer)
 *
 * Use `requireOrg` middleware after auth to enforce that a valid org context exists.
 * Use `requireOrgRole(...roles)` to check the user has one of the given org roles (or is a global owner).
 */
import { eq } from "drizzle-orm";
import { db } from "../db.js";
import { organizationMembers, organizations } from "../schema/index.js";

/**
 * Attaches org context to the request. Must be used after `auth` middleware.
 */
export async function orgContext(req, _res, next) {
  if (!req.user) return next();

  try {
    const memberships = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        role: organizationMembers.role,
      })
      .from(organizationMembers)
      .innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
      .where(eq(organizationMembers.userId, req.user.id));

    req.orgs = memberships;

    // Auto-select if only one org, or use header to pick
    if (memberships.length === 1) {
      req.org = memberships[0];
      req.orgRole = memberships[0].role;
    } else if (memberships.length > 1) {
      const headerOrgId = req.headers["x-organization-id"];
      const match = memberships.find((m) => m.id === headerOrgId);
      if (match) {
        req.org = match;
        req.orgRole = match.role;
      }
      // If no header or no match, req.org stays undefined — requireOrg will catch it
    }
  } catch {
    // Silently continue — org context is optional for some routes
  }

  next();
}

/**
 * Middleware that requires a valid organization context on the request.
 */
export function requireOrg(req, res, next) {
  if (!req.org) {
    return res.status(400).json({
      error: { message: "Organization context required. Set X-Organization-Id header." },
    });
  }
  next();
}

/**
 * Factory that returns middleware to check the user's org role (or global owner).
 * @param  {...string} allowedRoles — e.g. "admin", "musician"
 */
export function requireOrgRole(...allowedRoles) {
  return (req, res, next) => {
    // Global owners bypass org-level role checks
    if (req.user?.role === "owner") return next();

    if (!req.org) {
      return res.status(400).json({
        error: { message: "Organization context required" },
      });
    }
    if (!allowedRoles.includes(req.orgRole)) {
      return res.status(403).json({
        error: { message: `Requires one of: ${allowedRoles.join(", ")}` },
      });
    }
    next();
  };
}
