import { Router } from "express";
import db from "../db.js";

const router = Router();

router.get("/", async (req, res) => {
  const cityId = typeof req.query.city_id === "string" ? req.query.city_id : undefined;
  const type = typeof req.query.type === "string" ? req.query.type : undefined;
  const costMax = typeof req.query.cost_max === "string" && !isNaN(Number(req.query.cost_max)) ? Number(req.query.cost_max) : undefined;
  const activities = await db.activity.findMany({
    where: {
      ...(cityId ? { cityId } : {}),
      ...(type ? { category: type } : {}),
      ...(costMax !== undefined ? { estCost: { lte: costMax } } : {}),
    },
  });
  res.json(activities);
});

export default router;
