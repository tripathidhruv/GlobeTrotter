import request from "supertest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import app from "../src/app.js";
import db from "../src/db.js";

vi.mock("../src/middleware/auth", () => ({
  verifySupabaseJwt: (req: any, _res: any, next: any) => {
    req.userId = req.headers["x-test-user-id"] ?? "test-user-1";
    next();
  },
}));

beforeEach(async () => {
  await db.trip.deleteMany();
  await db.user.deleteMany();
  await db.user.create({ data: { id: "test-user-1", email: "a@test.com" } });
  await db.user.create({ data: { id: "test-user-2", email: "b@test.com" } });
});

describe("GET /api/trips", () => {
  it("returns empty list for a user with no trips", async () => {
    const res = await request(app).get("/api/trips");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe("POST /api/trips", () => {
  it("creates a trip owned by the current user", async () => {
    const res = await request(app).post("/api/trips").send({
      name: "Europe Summer",
      startDate: "2026-06-01",
      endDate: "2026-06-15",
    });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Europe Summer");
    expect(res.body.ownerId).toBe("test-user-1");
  });
});

describe("authorization on /api/trips/:id", () => {
  async function createOwnedTrip() {
    return db.trip.create({
      data: {
        ownerId: "test-user-1",
        name: "Owner's Trip",
        startDate: new Date("2026-06-01"),
        endDate: new Date("2026-06-10"),
      },
    });
  }

  it("allows the owner to GET their own trip", async () => {
    const trip = await createOwnedTrip();
    const res = await request(app)
      .get(`/api/trips/${trip.id}`)
      .set("x-test-user-id", "test-user-1");
    expect(res.status).toBe(200);
  });

  it("denies a non-owner, non-collaborator GET with 403", async () => {
    const trip = await createOwnedTrip();
    const res = await request(app)
      .get(`/api/trips/${trip.id}`)
      .set("x-test-user-id", "test-user-2");
    expect(res.status).toBe(403);
  });

  it("allows a collaborator to GET the trip", async () => {
    const trip = await createOwnedTrip();
    await db.tripCollaborator.create({
      data: { tripId: trip.id, userId: "test-user-2", role: "editor" },
    });
    const res = await request(app)
      .get(`/api/trips/${trip.id}`)
      .set("x-test-user-id", "test-user-2");
    expect(res.status).toBe(200);
  });

  it("allows the owner to PATCH their own trip", async () => {
    const trip = await createOwnedTrip();
    const res = await request(app)
      .patch(`/api/trips/${trip.id}`)
      .set("x-test-user-id", "test-user-1")
      .send({ name: "Renamed" });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Renamed");
  });

  it("denies a non-owner PATCH with 403", async () => {
    const trip = await createOwnedTrip();
    const res = await request(app)
      .patch(`/api/trips/${trip.id}`)
      .set("x-test-user-id", "test-user-2")
      .send({ name: "Hijacked" });
    expect(res.status).toBe(403);
  });

  it("denies a collaborator (non-owner) PATCH with 403", async () => {
    const trip = await createOwnedTrip();
    await db.tripCollaborator.create({
      data: { tripId: trip.id, userId: "test-user-2", role: "editor" },
    });
    const res = await request(app)
      .patch(`/api/trips/${trip.id}`)
      .set("x-test-user-id", "test-user-2")
      .send({ name: "Hijacked" });
    expect(res.status).toBe(403);
  });

  it("rejects attempts to set ownerId via PATCH", async () => {
    const trip = await createOwnedTrip();
    const res = await request(app)
      .patch(`/api/trips/${trip.id}`)
      .set("x-test-user-id", "test-user-1")
      .send({ ownerId: "test-user-2", name: "Still mine" });
    expect(res.status).toBe(400);
  });

  it("allows the owner to DELETE their own trip", async () => {
    const trip = await createOwnedTrip();
    const res = await request(app)
      .delete(`/api/trips/${trip.id}`)
      .set("x-test-user-id", "test-user-1");
    expect(res.status).toBe(204);
  });

  it("denies a non-owner DELETE with 403", async () => {
    const trip = await createOwnedTrip();
    const res = await request(app)
      .delete(`/api/trips/${trip.id}`)
      .set("x-test-user-id", "test-user-2");
    expect(res.status).toBe(403);
    const stillThere = await db.trip.findUnique({ where: { id: trip.id } });
    expect(stillThere).not.toBeNull();
  });

  it("returns 404 for GET on a trip that does not exist", async () => {
    const res = await request(app)
      .get("/api/trips/does-not-exist")
      .set("x-test-user-id", "test-user-1");
    expect(res.status).toBe(404);
  });

  it("returns 404 for PATCH on a trip that does not exist", async () => {
    const res = await request(app)
      .patch("/api/trips/does-not-exist")
      .set("x-test-user-id", "test-user-1")
      .send({ name: "x" });
    expect(res.status).toBe(404);
  });
});
