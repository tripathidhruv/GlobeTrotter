import { Router } from "express";
import { z } from "zod";
import db from "../db.js";
import { verifySupabaseJwt } from "../middleware/auth.js";

const router = Router();

const patchSchema = z.object({
  orderIndex: z.number().optional(),
  arrivalDate: z.string().optional(),
  departureDate: z.string().optional(),
});

router.patch("/:id", verifySupabaseJwt, async (req, res) => {
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const data: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.arrivalDate) data.arrivalDate = new Date(parsed.data.arrivalDate);
  if (parsed.data.departureDate) data.departureDate = new Date(parsed.data.departureDate);
  const stop = await db.stop.update({ where: { id: String(req.params.id) }, data });
  res.json(stop);
});

router.delete("/:id", verifySupabaseJwt, async (req, res) => {
  await db.stop.delete({ where: { id: String(req.params.id) } });
  res.status(204).end();
});

export default router;
