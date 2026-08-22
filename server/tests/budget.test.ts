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
  it("sums activity costs and expenses by category and day", async () => {
    const result = await computeTripBudget(tripId);
    expect(result.totalCost).toBe(50);
    expect(result.byCategory.activity).toBe(30);
    expect(result.byCategory.meal).toBe(20);
    expect(result.byDay["2026-07-01"]).toBe(50);
  });
});
