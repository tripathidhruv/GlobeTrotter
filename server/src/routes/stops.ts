import { Router } from "express";
import { z } from "zod";
import db from "../db.js";
import { verifySupabaseJwt, type AuthedRequest } from "../middleware/auth.js";

const router = Router();

const patchSchema = z.object({
  orderIndex: z.number().optional(),
  arrivalDate: z.string().optional(),
  departureDate: z.string().optional(),
});

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

router.patch("/:id", verifySupabaseJwt, async (req: AuthedRequest, res) => {
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const authz = await authorizeStop(String(req.params.id), req.userId);
  if (authz.status === 404) return res.status(404).json({ error: "not found" });
  if (authz.status === 403) return res.status(403).json({ error: "forbidden" });

  const data: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.arrivalDate) data.arrivalDate = new Date(parsed.data.arrivalDate);
  if (parsed.data.departureDate) data.departureDate = new Date(parsed.data.departureDate);
  const stop = await db.stop.update({ where: { id: authz.stop.id }, data });
  res.json(stop);
});

router.delete("/:id", verifySupabaseJwt, async (req: AuthedRequest, res) => {
  const authz = await authorizeStop(String(req.params.id), req.userId);
  if (authz.status === 404) return res.status(404).json({ error: "not found" });
  if (authz.status === 403) return res.status(403).json({ error: "forbidden" });

  await db.stop.delete({ where: { id: authz.stop.id } });
  res.status(204).end();
});

export default router;
