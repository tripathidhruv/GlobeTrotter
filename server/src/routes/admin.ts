import { Router } from "express";
import type { Response, NextFunction } from "express";
import db from "../db.js";
import { verifySupabaseJwt, type AuthedRequest } from "../middleware/auth.js";

const router = Router();

/**
 * Requires the caller to be an authenticated admin. Must run after
 * verifySupabaseJwt (which sets req.userId). Never trusts anything from the
 * client — the role is looked up fresh from the database on every request.
 */
async function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.userId) {
    return res.status(401).json({ error: "missing bearer token" });
  }
  const user = await db.user.findUnique({ where: { id: req.userId }, select: { role: true } });
  if (!user || user.role !== "admin") {
    return res.status(403).json({ error: "admin access required" });
  }
  next();
}

router.use(verifySupabaseJwt, requireAdmin);

router.get("/stats", async (_req, res) => {
  const [totalUsers, totalTrips, totalStops, totalStopActivities] = await Promise.all([
    db.user.count(),
    db.trip.count(),
    db.stop.count(),
    db.stopActivity.count(),
  ]);

  // Trips over time: only pull the (small) createdAt column, bucketed by day.
  // This is a lightweight projection, not a full-row load.
  const tripCreations = await db.trip.findMany({ select: { createdAt: true } });
  const byDay = new Map<string, number>();
  for (const { createdAt } of tripCreations) {
    const day = createdAt.toISOString().slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + 1);
  }
  const tripsOverTime = [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));

  // Top cities by stop count.
  const cityGroups = await db.stop.groupBy({
    by: ["cityId"],
    _count: { cityId: true },
    orderBy: { _count: { cityId: "desc" } },
    take: 10,
  });
  const cityIds = cityGroups.map((g) => g.cityId);
  const cities = await db.city.findMany({
    where: { id: { in: cityIds } },
    select: { id: true, name: true, country: true },
  });
  const cityById = new Map(cities.map((c) => [c.id, c]));
  const topCities = cityGroups.map((g) => ({
    cityId: g.cityId,
    name: cityById.get(g.cityId)?.name ?? "Unknown",
    country: cityById.get(g.cityId)?.country ?? "",
    stopCount: g._count.cityId,
  }));

  // Top activities by attach count.
  const activityGroups = await db.stopActivity.groupBy({
    by: ["activityId"],
    _count: { activityId: true },
    orderBy: { _count: { activityId: "desc" } },
    take: 10,
  });
  const activityIds = activityGroups.map((g) => g.activityId);
  const activities = await db.activity.findMany({
    where: { id: { in: activityIds } },
    select: { id: true, name: true, category: true },
  });
  const activityById = new Map(activities.map((a) => [a.id, a]));
  const topActivities = activityGroups.map((g) => ({
    activityId: g.activityId,
    name: activityById.get(g.activityId)?.name ?? "Unknown",
    category: activityById.get(g.activityId)?.category ?? "",
    attachCount: g._count.activityId,
  }));

  res.json({
    totalUsers,
    totalTrips,
    totalStops,
    totalActivitiesAttached: totalStopActivities,
    averageStopsPerTrip: totalTrips > 0 ? totalStops / totalTrips : 0,
    tripsOverTime,
    topCities,
    topActivities,
  });
});

router.get("/users", async (req, res) => {
  const page = Math.max(1, Number.parseInt(String(req.query.page ?? "1"), 10) || 1);
  const pageSize = Math.min(50, Math.max(1, Number.parseInt(String(req.query.pageSize ?? "20"), 10) || 20));

  const [total, users] = await Promise.all([
    db.user.count(),
    db.user.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        languagePref: true,
        createdAt: true,
        _count: { select: { trips: true } },
      },
    }),
  ]);

  res.json({
    page,
    pageSize,
    total,
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      languagePref: u.languagePref,
      createdAt: u.createdAt,
      tripCount: u._count.trips,
    })),
  });
});

export default router;
