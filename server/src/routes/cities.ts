import { Router } from "express";
import db from "../db.js";

const router = Router();

router.get("/", async (req, res) => {
  const search = typeof req.query.search === "string" ? req.query.search : undefined;
  const region = typeof req.query.region === "string" ? req.query.region : undefined;
  const cities = await db.city.findMany({
    where: {
      ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
      ...(region ? { region } : {}),
    },
    orderBy: { popularityScore: "desc" },
  });
  res.json(cities);
});

export default router;
