import request from "supertest";
import { describe, it, expect, beforeAll } from "vitest";
import app from "../src/app.js";
import db from "../src/db.js";

let cityId: string;

beforeAll(async () => {
  await db.activity.deleteMany();
  await db.city.deleteMany();
  const city = await db.city.create({ data: { name: "Lisbon", country: "Portugal", region: "Europe" } });
  cityId = city.id;
  await db.activity.create({ data: { cityId, name: "Fado Night", category: "culture", estCost: 25 } });
  await db.activity.create({ data: { cityId, name: "Pastéis de Nata Tour", category: "food", estCost: 35 } });
  await db.activity.create({ data: { cityId, name: "Hike to Sintra", category: "nature", estCost: 15 } });
});

describe("GET /api/cities", () => {
  it("filters by search term", async () => {
    const res = await request(app).get("/api/cities?search=Lis");
    expect(res.status).toBe(200);
    expect(res.body[0].name).toBe("Lisbon");
  });
});

describe("GET /api/activities", () => {
  it("filters by city_id", async () => {
    const res = await request(app).get(`/api/activities?city_id=${cityId}`);
    expect(res.status).toBe(200);
    expect(res.body[0].name).toBe("Fado Night");
  });

  it("ignores invalid cost_max and returns all activities", async () => {
    const res = await request(app).get(`/api/activities?city_id=${cityId}&cost_max=notanumber`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(3);
  });
});
