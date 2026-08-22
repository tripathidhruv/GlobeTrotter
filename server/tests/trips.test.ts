import request from "supertest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import app from "../src/app";
import db from "../src/db";

vi.mock("../src/middleware/auth", () => ({
  verifySupabaseJwt: (req: any, _res: any, next: any) => {
    req.userId = "test-user-1";
    next();
  },
}));

beforeEach(async () => {
  await db.trip.deleteMany();
  await db.user.deleteMany();
  await db.user.create({ data: { id: "test-user-1", email: "a@test.com" } });
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
