import { Router } from "express";
import db from "../db.js";
import { verifySupabaseJwt, type AuthedRequest } from "../middleware/auth.js";
import { computeTripBudget } from "../services/budgetService.js";

const router = Router();

router.get("/:id/budget", verifySupabaseJwt, async (req: AuthedRequest, res) => {
  const trip = await db.trip.findUnique({
    where: { id: String(req.params.id) },
    include: { collaborators: true },
  });
  if (!trip) return res.status(404).json({ error: "not found" });
  const isOwner = trip.ownerId === req.userId;
  const isCollaborator = trip.collaborators.some((c) => c.userId === req.userId);
  if (!isOwner && !isCollaborator) return res.status(403).json({ error: "forbidden" });

  const breakdown = await computeTripBudget(trip.id);
  res.json(breakdown);
});

export default router;
