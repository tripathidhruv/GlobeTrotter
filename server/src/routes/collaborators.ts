import { Router } from "express";
import { z } from "zod";
import db from "../db.js";
import { verifySupabaseJwt, type AuthedRequest } from "../middleware/auth.js";

const router = Router();

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["editor", "viewer"]),
});

router.get("/:id/collaborators", verifySupabaseJwt, async (req: AuthedRequest, res) => {
  const trip = await db.trip.findUnique({
    where: { id: String(req.params.id) },
    include: { collaborators: true },
  });
  if (!trip) return res.status(404).json({ error: "not found" });
  const isOwner = trip.ownerId === req.userId;
  const isCollaborator = trip.collaborators.some((c) => c.userId === req.userId);
  if (!isOwner && !isCollaborator) return res.status(403).json({ error: "forbidden" });

  const collaborators = await db.tripCollaborator.findMany({
    where: { tripId: trip.id },
    include: { user: { select: { email: true, name: true } } },
    orderBy: { invitedAt: "asc" },
  });
  res.json(collaborators);
});

router.post("/:id/collaborators", verifySupabaseJwt, async (req: AuthedRequest, res) => {
  const parsed = inviteSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const trip = await db.trip.findUnique({ where: { id: String(req.params.id) } });
  if (!trip) return res.status(404).json({ error: "not found" });
  if (trip.ownerId !== req.userId) return res.status(403).json({ error: "forbidden" });

  const invitee = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (!invitee) {
    return res.status(404).json({ error: "No account found with that email. They must sign up first." });
  }
  if (invitee.id === trip.ownerId) {
    return res.status(400).json({ error: "You already own this trip." });
  }

  const collaborator = await db.tripCollaborator.upsert({
    where: { tripId_userId: { tripId: trip.id, userId: invitee.id } },
    update: { role: parsed.data.role },
    create: { tripId: trip.id, userId: invitee.id, role: parsed.data.role },
    include: { user: { select: { email: true, name: true } } },
  });
  res.status(201).json(collaborator);
});

router.delete("/:id/collaborators/:userId", verifySupabaseJwt, async (req: AuthedRequest, res) => {
  const trip = await db.trip.findUnique({ where: { id: String(req.params.id) } });
  if (!trip) return res.status(404).json({ error: "not found" });
  if (trip.ownerId !== req.userId) return res.status(403).json({ error: "forbidden" });

  await db.tripCollaborator.deleteMany({
    where: { tripId: trip.id, userId: String(req.params.userId) },
  });
  res.status(204).end();
});

export default router;
