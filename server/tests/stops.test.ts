import request from "supertest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import app from "../src/app.js";
import db from "../src/db.js";

vi.mock("../src/middleware/auth", () => ({
  verifySupabaseJwt: (req: any, _res: any, next: any) => {
    req.userId = "test-user-1";
    next();
  },
}));

let tripId: string;
let cityId: string;

beforeEach(async () => {
  await db.stopActivity.deleteMany();
  await db.stop.deleteMany();
  await db.trip.deleteMany();
  await db.activity.deleteMany();
  await db.city.deleteMany();
  await db.user.deleteMany();
  await db.user.create({ data: { id: "test-user-1", email: "a@test.com" } });
  const trip = await db.trip.create({
    data: { ownerId: "test-user-1", name: "Trip", startDate: new Date(), endDate: new Date() },
  });
  tripId = trip.id;
  const city = await db.city.create({ data: { name: "Rome", country: "Italy" } });
  cityId = city.id;
});

describe("POST /api/trips/:id/stops", () => {
  it("adds a stop to the trip", async () => {
    const res = await request(app).post(`/api/trips/${tripId}/stops`).send({
      cityId,
      orderIndex: 0,
      arrivalDate: "2026-06-01",
      departureDate: "2026-06-04",
    });
    expect(res.status).toBe(201);
    expect(res.body.tripId).toBe(tripId);
    expect(res.body.cityId).toBe(cityId);
  });
});

describe("PATCH /api/stops/:id", () => {
  it("updates orderIndex for reordering", async () => {
    const stop = await db.stop.create({
      data: { tripId, cityId, orderIndex: 0, arrivalDate: new Date(), departureDate: new Date() },
    });
    const res = await request(app).patch(`/api/stops/${stop.id}`).send({ orderIndex: 3 });
    expect(res.status).toBe(200);
    expect(res.body.orderIndex).toBe(3);
  });
});
