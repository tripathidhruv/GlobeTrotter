import { Router } from "express";
import { z } from "zod";
import db from "../db.js";
import { verifySupabaseJwt, type AuthedRequest } from "../middleware/auth.js";
import { getAiSuggestions, AiServiceError } from "../services/aiService.js";

const router = Router();

const suggestSchema = z.object({
  tripId: z.string().optional(),
  prompt: z.string().optional(),
  days: z.number().optional(),
  interests: z.array(z.string()).optional(),
});

router.post("/suggest", verifySupabaseJwt, async (req: AuthedRequest, res) => {
  const parsed = suggestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { tripId, prompt, days, interests } = parsed.data;

  if (!tripId && !prompt) {
    return res.status(400).json({ error: "Provide either tripId or prompt." });
  }

  let effectivePrompt = prompt;
  let effectiveDays = days;
  let excludeCityIds: string[] | undefined;

  if (tripId) {
    const trip = await db.trip.findUnique({
      where: { id: tripId },
      include: { collaborators: true, stops: { include: { city: true } } },
    });
    if (!trip) return res.status(404).json({ error: "not found" });
    const isOwner = trip.ownerId === req.userId;
    const isCollaborator = trip.collaborators.some((c) => c.userId === req.userId);
    if (!isOwner && !isCollaborator) return res.status(403).json({ error: "forbidden" });

    const existingCities = trip.stops.map((s) => s.city.name).join(", ");
    excludeCityIds = trip.stops.map((s) => s.cityId);
    const durationDays = Math.max(
      1,
      Math.round(
        (new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    );
    effectiveDays = effectiveDays ?? durationDays;
    effectivePrompt = [
      `Suggest cities and activities to add to the trip "${trip.name}".`,
      existingCities ? `The trip already includes: ${existingCities}. Suggest different cities to add.` : "",
      prompt ?? "",
    ]
      .filter(Boolean)
      .join(" ");
  }

  try {
    const result = await getAiSuggestions(db, {
      prompt: effectivePrompt ?? "Suggest a great trip itinerary.",
      ...(effectiveDays !== undefined ? { days: effectiveDays } : {}),
      ...(interests !== undefined ? { interests } : {}),
      ...(excludeCityIds !== undefined ? { excludeCityIds } : {}),
    });
    res.json(result);
  } catch (err) {
    if (err instanceof AiServiceError) {
      return res.status(err.status).json({ error: err.message });
    }
    return res.status(502).json({ error: "AI suggestions are temporarily unavailable." });
  }
});

export default router;
