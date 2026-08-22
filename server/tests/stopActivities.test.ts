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
let stopId: string;
let activityId: string;

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
  stopId = stop.id;
  const activity = await db.activity.create({ data: { cityId: city.id, name: "Museum", category: "sightseeing", estCost: 30 } });
  activityId = activity.id;
});

describe("POST /api/stops/:id/activities", () => {
  it("attaches an activity to a stop for the owner", async () => {
    const res = await request(app)
      .post(`/api/stops/${stopId}/activities`)
      .set("x-test-user-id", "test-user-1")
      .send({ activityId, scheduledDate: "2026-07-01" });
    expect(res.status).toBe(201);
    expect(res.body.stopId).toBe(stopId);
    expect(res.body.activityId).toBe(activityId);
  });

  it("allows a collaborator to attach an activity", async () => {
    await db.tripCollaborator.create({ data: { tripId, userId: "test-user-2", role: "editor" } });
    const res = await request(app)
      .post(`/api/stops/${stopId}/activities`)
      .set("x-test-user-id", "test-user-2")
      .send({ activityId, scheduledDate: "2026-07-01" });
    expect(res.status).toBe(201);
  });

  it("denies a non-owner, non-collaborator with 403", async () => {
    const res = await request(app)
      .post(`/api/stops/${stopId}/activities`)
      .set("x-test-user-id", "test-user-2")
      .send({ activityId, scheduledDate: "2026-07-01" });
    expect(res.status).toBe(403);
  });

  it("returns 404 for a stop that does not exist", async () => {
    const res = await request(app)
      .post(`/api/stops/does-not-exist/activities`)
      .set("x-test-user-id", "test-user-1")
      .send({ activityId, scheduledDate: "2026-07-01" });
    expect(res.status).toBe(404);
  });

  it("returns 400 for invalid body", async () => {
    const res = await request(app)
      .post(`/api/stops/${stopId}/activities`)
      .set("x-test-user-id", "test-user-1")
      .send({});
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/stop-activities/:id", () => {
  async function createStopActivity() {
    return db.stopActivity.create({
      data: { stopId, activityId, scheduledDate: new Date("2026-07-01") },
    });
  }

  it("detaches an activity for the owner", async () => {
    const sa = await createStopActivity();
    const res = await request(app)
      .delete(`/api/stop-activities/${sa.id}`)
      .set("x-test-user-id", "test-user-1");
    expect(res.status).toBe(204);
    const stillThere = await db.stopActivity.findUnique({ where: { id: sa.id } });
    expect(stillThere).toBeNull();
  });

  it("allows a collaborator to detach an activity", async () => {
    await db.tripCollaborator.create({ data: { tripId, userId: "test-user-2", role: "editor" } });
    const sa = await createStopActivity();
    const res = await request(app)
      .delete(`/api/stop-activities/${sa.id}`)
      .set("x-test-user-id", "test-user-2");
    expect(res.status).toBe(204);
  });

  it("denies a non-owner, non-collaborator with 403", async () => {
    const sa = await createStopActivity();
    const res = await request(app)
      .delete(`/api/stop-activities/${sa.id}`)
      .set("x-test-user-id", "test-user-2");
    expect(res.status).toBe(403);
    const stillThere = await db.stopActivity.findUnique({ where: { id: sa.id } });
    expect(stillThere).not.toBeNull();
  });

  it("returns 404 for a stop-activity that does not exist", async () => {
    const res = await request(app)
      .delete(`/api/stop-activities/does-not-exist`)
      .set("x-test-user-id", "test-user-1");
    expect(res.status).toBe(404);
  });
});
