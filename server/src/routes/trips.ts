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

router.get("/:id", verifySupabaseJwt, async (req: AuthedRequest, res) => {
  const trip = await db.trip.findUnique({
    where: { id: String(req.params.id) },
    include: {
      stops: {
        include: { city: true, activities: { include: { activity: true } } },
        orderBy: { orderIndex: "asc" },
      },
      collaborators: true,
    },
  });
  if (!trip) return res.status(404).json({ error: "not found" });
  res.json(trip);
});

router.patch("/:id", verifySupabaseJwt, async (req: AuthedRequest, res) => {
  const trip = await db.trip.update({ where: { id: String(req.params.id) }, data: req.body });
  res.json(trip);
});

router.delete("/:id", verifySupabaseJwt, async (req: AuthedRequest, res) => {
  await db.trip.delete({ where: { id: String(req.params.id) } });
  res.status(204).end();
});

router.post("/:id/stops", verifySupabaseJwt, async (req: AuthedRequest, res) => {
  const schema = z.object({
    cityId: z.string(),
    orderIndex: z.number(),
    arrivalDate: z.string(),
    departureDate: z.string(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const stop = await db.stop.create({
    data: {
      tripId: String(req.params.id),
      cityId: parsed.data.cityId,
      orderIndex: parsed.data.orderIndex,
      arrivalDate: new Date(parsed.data.arrivalDate),
      departureDate: new Date(parsed.data.departureDate),
    },
  });
  res.status(201).json(stop);
});

export default router;
