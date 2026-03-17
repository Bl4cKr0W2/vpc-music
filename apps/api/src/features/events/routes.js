import { Router } from "express";
import { eq, and, gte, asc, desc } from "drizzle-orm";
import { db } from "../../db.js";
import { events, setlists } from "../../schema/index.js";
import { createError, asyncHandler } from "../../middlewares/errorHandler.js";
import { auth } from "../../middlewares/auth.js";
import { orgContext, requireOrg, requireOrgRole } from "../../middlewares/orgContext.js";

export const eventRoutes = Router();

// ── GET /api/events — list events ────────────────────────────
// ?upcoming=true  → only future events (default)
// ?upcoming=false → all events
eventRoutes.get(
  "/",
  auth,
  orgContext,
  asyncHandler(async (req, res) => {
    const upcoming = req.query.upcoming !== "false";
    const now = new Date();

    let query = db
      .select({
        id: events.id,
        title: events.title,
        date: events.date,
        location: events.location,
        notes: events.notes,
        setlistId: events.setlistId,
        setlistName: setlists.name,
        createdAt: events.createdAt,
      })
      .from(events)
      .leftJoin(setlists, eq(events.setlistId, setlists.id));

    const conditions = [];
    if (req.org) {
      conditions.push(eq(events.organizationId, req.org.id));
    }
    if (upcoming) {
      conditions.push(gte(events.date, now));
    }
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const result = await query.orderBy(asc(events.date));

    res.json({ events: result });
  })
);

// ── GET /api/events/:id — get single event ───────────────────
eventRoutes.get(
  "/:id",
  auth,
  asyncHandler(async (req, res) => {
    const [event] = await db
      .select({
        id: events.id,
        title: events.title,
        date: events.date,
        location: events.location,
        notes: events.notes,
        setlistId: events.setlistId,
        setlistName: setlists.name,
        createdBy: events.createdBy,
        createdAt: events.createdAt,
        updatedAt: events.updatedAt,
      })
      .from(events)
      .leftJoin(setlists, eq(events.setlistId, setlists.id))
      .where(eq(events.id, req.params.id))
      .limit(1);

    if (!event) throw createError(404, "Event not found");

    res.json({ event });
  })
);

// ── POST /api/events — create event ─────────────────────────
eventRoutes.post(
  "/",
  auth,
  orgContext,
  requireOrg,  requireOrgRole("admin", "musician"),  asyncHandler(async (req, res) => {
    const { title, date, location, notes, setlistId } = req.body;

    if (!title || !date) {
      throw createError(400, "Title and date are required");
    }

    const [event] = await db
      .insert(events)
      .values({
        title,
        date: new Date(date),
        location: location || null,
        notes: notes || null,
        organizationId: req.org.id,
        setlistId: setlistId || null,
        createdBy: req.user.id,
      })
      .returning();

    res.status(201).json({ event });
  })
);

// ── PUT /api/events/:id — update event ──────────────────────
eventRoutes.put(
  "/:id",
  auth,  orgContext,
  requireOrg,
  requireOrgRole("admin", "musician"),  asyncHandler(async (req, res) => {
    const { title, date, location, notes, setlistId } = req.body;

    const [existing] = await db
      .select({ id: events.id })
      .from(events)
      .where(eq(events.id, req.params.id))
      .limit(1);

    if (!existing) throw createError(404, "Event not found");

    const [event] = await db
      .update(events)
      .set({
        ...(title !== undefined && { title }),
        ...(date !== undefined && { date: new Date(date) }),
        ...(location !== undefined && { location }),
        ...(notes !== undefined && { notes }),
        ...(setlistId !== undefined && { setlistId: setlistId || null }),
        updatedAt: new Date(),
      })
      .where(eq(events.id, req.params.id))
      .returning();

    res.json({ event });
  })
);

// ── DELETE /api/events/:id — delete event ────────────────────
eventRoutes.delete(
  "/:id",
  auth,  orgContext,
  requireOrg,
  requireOrgRole("admin", "musician"),  asyncHandler(async (req, res) => {
    const [existing] = await db
      .select({ id: events.id })
      .from(events)
      .where(eq(events.id, req.params.id))
      .limit(1);

    if (!existing) throw createError(404, "Event not found");

    await db.delete(events).where(eq(events.id, req.params.id));

    res.json({ message: "Event deleted" });
  })
);
