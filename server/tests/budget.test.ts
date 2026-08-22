import { describe, it, expect, beforeEach, afterAll } from "vitest";
import db from "../src/db.js";
import { computeTripBudget } from "../src/services/budgetService.js";

let tripId: string;

afterAll(async () => {
  await db.expense.deleteMany();
  await db.stopActivity.deleteMany();
  await db.stop.deleteMany();
  await db.trip.deleteMany();
  await db.activity.deleteMany();
  await db.city.deleteMany();
  await db.user.deleteMany();
});

beforeEach(async () => {
  await db.expense.deleteMany();
  await db.stopActivity.deleteMany();
  await db.stop.deleteMany();
  await db.trip.deleteMany();
  await db.activity.deleteMany();
  await db.city.deleteMany();
  await db.user.deleteMany();
  await db.user.create({ data: { id: "u1", email: "u1@test.com" } });
  const city = await db.city.create({ data: { name: "Berlin", country: "Germany" } });
  const trip = await db.trip.create({ data: { ownerId: "u1", name: "T", startDate: new Date("2026-07-01"), endDate: new Date("2026-07-05") } });
  tripId = trip.id;
  const stop = await db.stop.create({ data: { tripId, cityId: city.id, orderIndex: 0, arrivalDate: new Date("2026-07-01"), departureDate: new Date("2026-07-03") } });
  const activity = await db.activity.create({ data: { cityId: city.id, name: "Museum", category: "sightseeing", estCost: 30 } });
  await db.stopActivity.create({ data: { stopId: stop.id, activityId: activity.id, scheduledDate: new Date("2026-07-01") } });
  await db.expense.create({ data: { tripId, category: "meal", amount: 20, expenseDate: new Date("2026-07-01") } });
});

describe("computeTripBudget", () => {
  it("estimates accommodation/food/local transport, keeps activities exact, and lets logged expenses override their category", async () => {
    const result = await computeTripBudget(tripId);

    // Berlin defaults to costIndex 50 (ratio 1) and the stop spans 2 nights.
    // accommodation: 2 * 90 = 180 (estimated, no "stay" expense logged)
    // food: a "meal" expense of 20 was logged, so it REPLACES the 2 * 45 = 90 estimate
    // localTransport: 2 * 15 = 30 (estimated)
    // interCityTravel: 0 (only one stop, no hops)
    // activity: 30 (exact, from the attached activity)
    expect(result.byCategory.accommodation).toBe(180);
    expect(result.byCategory.food).toBe(20);
    expect(result.byCategory.localTransport).toBe(30);
    expect(result.byCategory.interCityTravel).toBe(0);
    expect(result.byCategory.activity).toBe(30);
    expect(result.totalCost).toBe(180 + 20 + 30 + 0 + 30);

    // Estimated categories are flagged; food is not, since an actual expense overrode it.
    expect(result.estimatedCategories).toContain("accommodation");
    expect(result.estimatedCategories).toContain("localTransport");
    expect(result.estimatedCategories).toContain("interCityTravel");
    expect(result.estimatedCategories).not.toContain("food");

    expect(result.perStop).toHaveLength(1);
    expect(result.perStop[0]?.nights).toBe(2);
    expect(result.perStop[0]?.activities).toBe(30);

    expect(result.totalNights).toBe(2);
    expect(result.assumptions.referenceCostIndex).toBe(50);

    // The activity and the meal expense both landed on 2026-07-01.
    expect(result.byDay["2026-07-01"]).toBeGreaterThanOrEqual(30 + 20);
  });
});
