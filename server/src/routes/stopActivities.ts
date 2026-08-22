import { Router } from "express";
import { z } from "zod";
import db from "../db.js";
import { verifySupabaseJwt, type AuthedRequest } from "../middleware/auth.js";

const router = Router();

async function authorizeStop(id: string, userId: string | undefined) {
  const stop = await db.stop.findUnique({
    where: { id },
    include: { trip: { include: { collaborators: true } } },
  });
  if (!stop) return { status: 404 as const };
  const isOwner = stop.trip.ownerId === userId;
  const isCollaborator = stop.trip.collaborators.some((c) => c.userId === userId);
  if (!isOwner && !isCollaborator) return { status: 403 as const };
  return { status: 200 as const, stop };
}

async function authorizeStopActivity(id: string, userId: string | undefined) {
  const stopActivity = await db.stopActivity.findUnique({
    where: { id },
    include: { stop: { include: { trip: { include: { collaborators: true } } } } },
  });
  if (!stopActivity) return { status: 404 as const };
  const isOwner = stopActivity.stop.trip.ownerId === userId;
  const isCollaborator = stopActivity.stop.trip.collaborators.some((c) => c.userId === userId);
  if (!isOwner && !isCollaborator) return { status: 403 as const };
  return { status: 200 as const, stopActivity };
}

router.post("/stops/:id/activities", verifySupabaseJwt, async (req: AuthedRequest, res) => {
  const schema = z.object({
    activityId: z.string(),
    scheduledDate: z.string(),
    scheduledTime: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const authz = await authorizeStop(String(req.params.id), req.userId);
  if (authz.status === 404) return res.status(404).json({ error: "not found" });
  if (authz.status === 403) return res.status(403).json({ error: "forbidden" });

  const stopActivity = await db.stopActivity.create({
    data: {
      stopId: authz.stop.id,
      activityId: parsed.data.activityId,
      scheduledDate: new Date(parsed.data.scheduledDate),
      scheduledTime: parsed.data.scheduledTime ?? null,
    },
  });
  res.status(201).json(stopActivity);
});

router.delete("/stop-activities/:id", verifySupabaseJwt, async (req: AuthedRequest, res) => {
  const authz = await authorizeStopActivity(String(req.params.id), req.userId);
  if (authz.status === 404) return res.status(404).json({ error: "not found" });
  if (authz.status === 403) return res.status(403).json({ error: "forbidden" });

  await db.stopActivity.delete({ where: { id: authz.stopActivity.id } });
  res.status(204).end();
});

export default router;
