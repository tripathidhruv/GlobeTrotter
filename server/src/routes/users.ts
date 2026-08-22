import { Router } from "express";
import { z } from "zod";
import db from "../db.js";
import { verifySupabaseJwt, type AuthedRequest } from "../middleware/auth.js";

const router = Router();

router.get("/me", verifySupabaseJwt, async (req: AuthedRequest, res) => {
  const user = await db.user.findUnique({ where: { id: req.userId! } });
  if (!user) return res.status(404).json({ error: "not found" });
  res.json(user);
});

const patchMeSchema = z
  .object({
    name: z.string().min(1).nullable().optional(),
    avatarUrl: z.string().url().nullable().optional(),
    languagePref: z.string().min(2).max(10).optional(),
  })
  .strict();

router.patch("/me", verifySupabaseJwt, async (req: AuthedRequest, res) => {
  const parsed = patchMeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const data: { name?: string | null; avatarUrl?: string | null; languagePref?: string } = {};
  if ("name" in parsed.data) data.name = parsed.data.name ?? null;
  if ("avatarUrl" in parsed.data) data.avatarUrl = parsed.data.avatarUrl ?? null;
  if (parsed.data.languagePref !== undefined) data.languagePref = parsed.data.languagePref;

  const user = await db.user.update({
    where: { id: req.userId! },
    data,
  });
  res.json(user);
});

// Destructive: deletes only the authenticated caller's own row. Never accepts
// an id from the client. Trip.ownerId has no ON DELETE CASCADE, so trips
// (and everything hanging off them via their own cascades) are removed first,
// inside a transaction, before the user row itself is deleted.
router.delete("/me", verifySupabaseJwt, async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  await db.$transaction([
    db.tripCollaborator.deleteMany({ where: { userId } }),
    db.trip.deleteMany({ where: { ownerId: userId } }),
    db.user.delete({ where: { id: userId } }),
  ]);
  res.status(204).send();
});

export default router;
