import request from "supertest";
import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import app from "../src/app.js";
import db from "../src/db.js";

vi.mock("../src/middleware/auth", () => ({
  verifySupabaseJwt: (req: any, _res: any, next: any) => {
    req.userId = req.headers["x-test-user-id"] ?? "test-user-1";
    next();
  },
}));

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
  await db.user.create({ data: { id: "test-user-1", email: "a@test.com" } });
  await db.user.create({ data: { id: "test-user-2", email: "b@test.com" } });

  const trip = await db.trip.create({
    data: { ownerId: "test-user-1", name: "Trip", startDate: new Date("2026-07-01"), endDate: new Date("2026-07-05") },
  });
  tripId = trip.id;
  const city = await db.city.create({ data: { name: "Rome", country: "Italy" } });
  const stop = await db.stop.create({
    data: { tripId, cityId: city.id, orderIndex: 0, arrivalDate: new Date("2026-07-01"), departureDate: new Date("2026-07-03") },
  });
  const activity = await db.activity.create({ data: { cityId: city.id, name: "Museum", category: "sightseeing", estCost: 30 } });
  await db.stopActivity.create({ data: { stopId: stop.id, activityId: activity.id, scheduledDate: new Date("2026-07-01") } });
  await db.expense.create({ data: { tripId, category: "meal", amount: 20, expenseDate: new Date("2026-07-01") } });
});

describe("GET /api/trips/:id/budget", () => {
  it("returns the budget breakdown for the owner", async () => {
    const res = await request(app)
      .get(`/api/trips/${tripId}/budget`)
      .set("x-test-user-id", "test-user-1");
    expect(res.status).toBe(200);
    // Rome defaults to costIndex 50 (ratio 1), 2-night stop: accommodation
    // 2*90=180 (estimated) + food 20 (logged "meal" expense overrides the
    // 2*45=90 estimate) + localTransport 2*15=30 (estimated) + interCityTravel
    // 0 (single stop) + activity 30 (exact).
    expect(res.body.byCategory.activity).toBe(30);
    expect(res.body.byCategory.food).toBe(20);
    expect(res.body.byCategory.accommodation).toBe(180);
    expect(res.body.byCategory.localTransport).toBe(30);
    expect(res.body.totalCost).toBe(180 + 20 + 30 + 0 + 30);
  });

  it("allows a collaborator to view the budget", async () => {
    await db.tripCollaborator.create({ data: { tripId, userId: "test-user-2", role: "viewer" } });
    const res = await request(app)
      .get(`/api/trips/${tripId}/budget`)
      .set("x-test-user-id", "test-user-2");
    expect(res.status).toBe(200);
  });

  it("denies a non-owner, non-collaborator with 403", async () => {
    const res = await request(app)
      .get(`/api/trips/${tripId}/budget`)
      .set("x-test-user-id", "test-user-2");
    expect(res.status).toBe(403);
  });

  it("returns 404 for a trip that does not exist", async () => {
    const res = await request(app)
      .get(`/api/trips/does-not-exist/budget`)
      .set("x-test-user-id", "test-user-1");
    expect(res.status).toBe(404);
  });
});
