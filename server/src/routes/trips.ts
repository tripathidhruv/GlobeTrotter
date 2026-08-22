import { Router } from "express";
import { z } from "zod";
import db from "../db.js";
import { verifySupabaseJwt, type AuthedRequest } from "../middleware/auth.js";

const router = Router();

const createTripSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  startDate: z.string(),
  endDate: z.string(),
  coverPhotoUrl: z.string().optional(),
});

router.get("/", verifySupabaseJwt, async (req: AuthedRequest, res) => {
  const trips = await db.trip.findMany({
    where: {
      OR: [{ ownerId: req.userId! }, { collaborators: { some: { userId: req.userId! } } }],
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(trips);
});

router.post("/", verifySupabaseJwt, async (req: AuthedRequest, res) => {
  const parsed = createTripSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const trip = await db.trip.create({
    data: {
      ownerId: req.userId!,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      coverPhotoUrl: parsed.data.coverPhotoUrl ?? null,
      startDate: new Date(parsed.data.startDate),
      endDate: new Date(parsed.data.endDate),
    },
  });
  res.status(201).json(trip);
});

export default router;
