# GlobeTrotter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build GlobeTrotter, a multi-city travel planner (13 screens + admin) with a custom warm-editorial UI, Supabase-backed data/auth/realtime, and an AI trip-suggestion feature, deployable as one Vercel project.

**Architecture:** React 18 + Vite SPA client talking to an Express + TypeScript + Prisma API over REST, both in one monorepo, deployed to Vercel as a static client + one serverless function wrapping the whole Express app. Postgres/Auth/Realtime all via Supabase. AI suggestions via Vercel AI Gateway.

**Tech Stack:** React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui, Animate UI, Framer Motion, Lenis, React Router v6, TanStack Query, Recharts, Express, Prisma, Supabase (Postgres/Auth/Realtime), Vercel AI Gateway, Vercel.

## Global Constraints

- No animation/scroll library beyond Lenis, Framer Motion, Animate UI. No GSAP/AOS/react-scroll.
- **Visual direction: transit-systems** (departure boards, metro maps, rail timetables). See spec section 7 for full rationale. Do NOT use a cream/serif/terracotta editorial treatment — that direction was explicitly rejected as an AI-default look.
- Fonts: **Barlow Condensed** (display, uppercase, tight tracking) + **Inter** (body/UI) + **JetBrains Mono** (all times, costs, dates, durations, stop numbers). Not Fraunces, not Playfair, not DM Sans, not Bebas Neue.
- Colors — exact values: `ink #0E1116`, `board #2A3138`, `platform #EFF1F3`, `rail #D3D8DD`, `mute #6B747C`, `signal #FFB000` (primary accent), `transit #1B4DFF` (secondary). Light-first, with dark `ink` bands as a deliberate contrast device for heroes and day headers. No dark-mode toggle. Token names avoid `slate`/`amber` so Tailwind's built-in scales aren't shadowed.
- Dense data (Budget, Calendar, Activity lists) uses hairline-ruled timetable **rows**, not cards. Cards only where a trip is an object to pick (Dashboard, My Trips).
- Signature element is the shared `RouteLine` primitive (SVG line + stop nodes, drawn on scroll via `stroke-dashoffset`, nodes igniting amber on viewport entry). Reused across Dashboard, Itinerary Builder, Itinerary View, and Calendar — never reinvented per screen.
- Scroll-driven motion only on the route line and Dashboard/Itinerary View section reveals — never on forms, tables, or the Budget screen.
- `prefers-reduced-motion` respected everywhere: route line renders fully drawn, reveals resolve to end state.
- Numbered stop markers (`01`/`02`/`03`) are correct here — a multi-city itinerary is a genuine ordered sequence.
- **Tasks 9-24 were written before the transit direction was chosen, so their literal JSX still carries the old cream/terracotta classes.** Translate every occurrence using this mapping; the old class names must not survive anywhere:

  | Old (do not use) | New |
  |---|---|
  | `bg-cream` | `bg-platform` |
  | `text-ink` / `bg-white` | `text-ink` / `bg-white` (unchanged) |
  | `text-ink/60` | `text-mute` |
  | `border-ink/10`, `border-ink/20` | `border-rail` |
  | `bg-terracotta`, `text-terracotta` | `bg-signal` + `text-ink` on top, or `text-transit` for links |
  | `bg-forest`, `text-forest` | `bg-ink` / `text-ink` (use `Button variant="secondary"`) |
  | `rounded-lg`, `rounded-xl`, `shadow-sm` | `rounded-sm`, no shadow (use `border border-rail`) |
  | serif headings | `font-display uppercase tracking-board` |
  | any date/cost/duration/count text | wrap in `font-mono` (or the `.tabular` class) |

  Recharts colors in Tasks 18 and 24 must also be re-derived from the new palette: `["#FFB000", "#1B4DFF", "#0E1116", "#6B747C", "#2A3138"]` instead of the old terracotta set.
- AI calls go through Vercel AI Gateway using a plain `"provider/model"` string — never a direct `@ai-sdk/anthropic`-style provider package.
- Server-side validation (zod) on every mutating endpoint, in addition to client-side validation.
- Budget totals are computed server-side (`GET /api/trips/:id/budget`), never recomputed ad hoc on the client.

---

## File Structure

```
globetrotter/
├── package.json                 workspace root (npm workspaces: client, server)
├── vercel.ts                    Vercel build/rewrite config
├── client/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx               router + AnimatePresence shell
│   │   ├── lib/
│   │   │   ├── supabase.ts       Supabase browser client
│   │   │   ├── apiClient.ts      fetch wrapper, attaches auth token
│   │   │   ├── queryClient.ts    TanStack Query client
│   │   │   └── lenis.ts          Lenis init hook
│   │   ├── styles/globals.css    Tailwind + font-face + CSS vars
│   │   ├── components/
│   │   │   ├── ui/               shadcn + Animate UI primitives (Button, Card, Dialog, Tabs, Toggle)
│   │   │   └── layout/           AppShell, ProtectedRoute, PageTransition
│   │   └── features/
│   │       ├── auth/              LoginPage, SignupPage
│   │       ├── dashboard/         DashboardPage
│   │       ├── trips/             CreateTripPage, MyTripsPage, TripCard
│   │       ├── cities/            CitySearchPage
│   │       ├── itinerary/         ItineraryBuilderPage, ItineraryViewPage, StopCard, DragList
│   │       ├── activities/        ActivitySearchPage
│   │       ├── budget/            BudgetPage, CostPieChart, CostBarChart
│   │       ├── calendar/          CalendarPage
│   │       ├── share/             PublicItineraryPage
│   │       ├── settings/          SettingsPage
│   │       └── admin/             AdminPage, StatsTable, TopCitiesChart
│   └── tests/                     component tests (Vitest + Testing Library)
├── server/
│   ├── package.json
│   ├── prisma/schema.prisma
│   ├── prisma/seed.ts
│   ├── src/
│   │   ├── app.ts                 Express app (exported, no listen())
│   │   ├── index.ts               local dev entry (listen())
│   │   ├── db.ts                  Prisma client singleton
│   │   ├── middleware/
│   │   │   ├── auth.ts            verifySupabaseJwt
│   │   │   └── requireAdmin.ts
│   │   ├── routes/
│   │   │   ├── trips.ts
│   │   │   ├── stops.ts
│   │   │   ├── cities.ts
│   │   │   ├── activities.ts
│   │   │   ├── budget.ts
│   │   │   ├── calendar.ts
│   │   │   ├── share.ts
│   │   │   ├── aiSuggest.ts
│   │   │   └── admin.ts
│   │   └── services/
│   │       ├── budgetService.ts
│   │       └── aiSuggestService.ts
│   ├── api/index.ts                Vercel serverless entry wrapping app.ts
│   └── tests/                      Vitest + supertest integration tests
└── docs/
```

---

## Task 1: Monorepo scaffold

**Files:**
- Create: `E:/GlobeTrotter/package.json`
- Create: `E:/GlobeTrotter/.gitignore`
- Create: `E:/GlobeTrotter/client/package.json`, `client/vite.config.ts`, `client/tsconfig.json`
- Create: `E:/GlobeTrotter/server/package.json`, `server/tsconfig.json`

**Interfaces:**
- Produces: npm workspaces `client` and `server`, runnable via `npm run dev --workspace client` / `npm run dev --workspace server`.

- [ ] **Step 1: Init git repo and root workspace**

```bash
cd E:/GlobeTrotter
git init
```

`E:/GlobeTrotter/package.json`:
```json
{
  "name": "globetrotter",
  "private": true,
  "workspaces": ["client", "server"],
  "scripts": {
    "dev:client": "npm run dev --workspace client",
    "dev:server": "npm run dev --workspace server",
    "test": "npm run test --workspace client && npm run test --workspace server"
  }
}
```

`E:/GlobeTrotter/.gitignore`:
```
node_modules/
dist/
.env
.env.local
.vercel/
*.log
```

- [ ] **Step 2: Scaffold client with Vite**

```bash
cd E:/GlobeTrotter
npm create vite@latest client -- --template react-ts
cd client
npm install
npm install -D tailwindcss postcss autoprefixer vitest @testing-library/react @testing-library/jest-dom jsdom
npm install react-router-dom @tanstack/react-query framer-motion lenis recharts zod @supabase/supabase-js
npx tailwindcss init -p
```

- [ ] **Step 3: Scaffold server**

```bash
cd E:/GlobeTrotter
mkdir server && cd server
npm init -y
npm install express cors zod @prisma/client @supabase/supabase-js
npm install -D typescript ts-node-dev @types/express @types/cors vitest supertest @types/supertest prisma
npx tsc --init
npx prisma init --datasource-provider postgresql
```

`server/package.json` scripts block (merge into generated file):
```json
{
  "scripts": {
    "dev": "ts-node-dev --respawn src/index.ts",
    "build": "tsc",
    "test": "vitest run"
  }
}
```

- [ ] **Step 4: Verify both run**

Run: `npm run dev:client` (expect Vite dev server starts on 5173), then Ctrl+C.
Run: `cd server && npx tsc --noEmit` (expect no errors — empty `src/` is fine, create an empty `src/index.ts` with `console.log("ok")` first if `tsc` complains about no inputs).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: scaffold monorepo (client + server workspaces)"
```

---

## Task 2: Prisma schema + seed data

**Files:**
- Modify: `server/prisma/schema.prisma`
- Create: `server/prisma/seed.ts`
- Create: `server/.env` (not committed — `DATABASE_URL` from Supabase project settings)

**Interfaces:**
- Produces: Prisma models `User, Trip, TripCollaborator, Stop, City, Activity, StopActivity, Expense, TripShare` — exact field names used by every later route/service task.

- [ ] **Step 1: Write schema**

`server/prisma/schema.prisma`:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  user
  admin
}

enum CollaboratorRole {
  editor
  viewer
}

enum ExpenseCategory {
  transport
  stay
  activity
  meal
  other
}

model User {
  id            String    @id @default(uuid())
  email         String    @unique
  name          String?
  avatarUrl     String?
  role          Role      @default(user)
  languagePref  String    @default("en")
  createdAt     DateTime  @default(now())
  trips         Trip[]
  collaborations TripCollaborator[]
}

model Trip {
  id            String    @id @default(uuid())
  ownerId       String
  owner         User      @relation(fields: [ownerId], references: [id])
  name          String
  description   String?
  coverPhotoUrl String?
  startDate     DateTime
  endDate       DateTime
  isPublic      Boolean   @default(false)
  shareSlug     String?   @unique
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  stops         Stop[]
  expenses      Expense[]
  collaborators TripCollaborator[]
  shares        TripShare[]
}

model TripCollaborator {
  id         String            @id @default(uuid())
  tripId     String
  trip       Trip              @relation(fields: [tripId], references: [id], onDelete: Cascade)
  userId     String
  user       User              @relation(fields: [userId], references: [id])
  role       CollaboratorRole  @default(editor)
  invitedAt  DateTime          @default(now())

  @@unique([tripId, userId])
}

model City {
  id               String     @id @default(uuid())
  name             String
  country          String
  region           String?
  costIndex        Int        @default(50)
  popularityScore  Int        @default(0)
  imageUrl         String?
  stops            Stop[]
  activities       Activity[]
}

model Stop {
  id             String    @id @default(uuid())
  tripId         String
  trip           Trip      @relation(fields: [tripId], references: [id], onDelete: Cascade)
  cityId         String
  city           City      @relation(fields: [cityId], references: [id])
  orderIndex     Int
  arrivalDate    DateTime
  departureDate  DateTime
  activities     StopActivity[]
}

model Activity {
  id                  String    @id @default(uuid())
  cityId              String
  city                City      @relation(fields: [cityId], references: [id])
  name                String
  category            String
  description         String?
  imageUrl            String?
  estCost             Float     @default(0)
  estDurationMinutes  Int       @default(60)
  stopActivities      StopActivity[]
}

model StopActivity {
  id             String    @id @default(uuid())
  stopId         String
  stop           Stop      @relation(fields: [stopId], references: [id], onDelete: Cascade)
  activityId     String
  activity       Activity  @relation(fields: [activityId], references: [id])
  scheduledDate  DateTime
  scheduledTime  String?
  costOverride   Float?
}

model Expense {
  id           String           @id @default(uuid())
  tripId       String
  trip         Trip             @relation(fields: [tripId], references: [id], onDelete: Cascade)
  category     ExpenseCategory
  amount       Float
  note         String?
  expenseDate  DateTime
}

model TripShare {
  id            String    @id @default(uuid())
  tripId        String
  trip          Trip      @relation(fields: [tripId], references: [id], onDelete: Cascade)
  viewedAt      DateTime  @default(now())
  viewerIpHash  String?
}
```

- [ ] **Step 2: Generate client and run first migration**

```bash
cd server
npx prisma migrate dev --name init
```
Expected: migration applied, `Your database is now in sync with your schema.`

- [ ] **Step 3: Write seed script**

`server/prisma/seed.ts`:
```typescript
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const paris = await prisma.city.create({
    data: { name: "Paris", country: "France", region: "Europe", costIndex: 80, popularityScore: 95 },
  });
  const tokyo = await prisma.city.create({
    data: { name: "Tokyo", country: "Japan", region: "Asia", costIndex: 75, popularityScore: 90 },
  });
  await prisma.activity.createMany({
    data: [
      { cityId: paris.id, name: "Louvre Museum", category: "sightseeing", estCost: 20, estDurationMinutes: 180 },
      { cityId: paris.id, name: "Seine River Cruise", category: "leisure", estCost: 15, estDurationMinutes: 60 },
      { cityId: tokyo.id, name: "Senso-ji Temple", category: "sightseeing", estCost: 0, estDurationMinutes: 90 },
      { cityId: tokyo.id, name: "Tsukiji Food Tour", category: "food", estCost: 40, estDurationMinutes: 120 },
    ],
  });
}

main().then(() => prisma.$disconnect()).catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
```

Add to `server/package.json`:
```json
{ "prisma": { "seed": "ts-node prisma/seed.ts" } }
```

- [ ] **Step 4: Run seed and verify**

```bash
npx prisma db seed
```
Expected: no errors. Verify with `npx prisma studio`, confirm 2 cities + 4 activities exist.

- [ ] **Step 5: Commit**

```bash
git add server/prisma
git commit -m "feat: Prisma schema + seed data for cities/activities"
```

---

## Task 3: Express app skeleton + Vercel serverless entry

**Files:**
- Create: `server/src/db.ts`
- Create: `server/src/app.ts`
- Create: `server/src/index.ts`
- Create: `server/api/index.ts`
- Create: `E:/GlobeTrotter/vercel.ts`
- Test: `server/tests/health.test.ts`

**Interfaces:**
- Produces: `db` (Prisma client singleton, `server/src/db.ts` default export), `app` (Express instance, `server/src/app.ts` default export) — every route task in this plan imports both.

- [ ] **Step 1: Write failing test**

`server/tests/health.test.ts`:
```typescript
import request from "supertest";
import { describe, it, expect } from "vitest";
import app from "../src/app";

describe("GET /api/health", () => {
  it("returns ok", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `cd server && npx vitest run tests/health.test.ts`
Expected: FAIL — `Cannot find module '../src/app'`

- [ ] **Step 3: Implement db.ts and app.ts**

`server/src/db.ts`:
```typescript
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
export default db;
```

`server/src/app.ts`:
```typescript
import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

export default app;
```

`server/src/index.ts`:
```typescript
import app from "./app";

const PORT = process.env.PORT ?? 3001;
app.listen(PORT, () => console.log(`server listening on ${PORT}`));
```

- [ ] **Step 4: Run test, verify it passes**

Run: `npx vitest run tests/health.test.ts`
Expected: PASS

- [ ] **Step 5: Vercel serverless entry + rewrite config**

`server/api/index.ts`:
```typescript
import app from "../src/app";

export default app;
```

`E:/GlobeTrotter/vercel.ts`:
```typescript
import type { VercelConfig } from "@vercel/config/v1";

export const config: VercelConfig = {
  buildCommand: "npm run build --workspace client",
  outputDirectory: "client/dist",
  rewrites: [{ source: "/api/(.*)", destination: "/api" }],
};
```

- [ ] **Step 6: Commit**

```bash
git add server/src server/api server/tests vercel.ts
git commit -m "feat: Express app skeleton, health check, Vercel serverless entry"
```

---

## Task 4: Auth middleware + protected trips list/create endpoints

**Files:**
- Create: `server/src/middleware/auth.ts`
- Create: `server/src/routes/trips.ts`
- Modify: `server/src/app.ts`
- Test: `server/tests/trips.test.ts`

**Interfaces:**
- Consumes: `db` from Task 3, Prisma `Trip`/`User` models from Task 2.
- Produces: `verifySupabaseJwt` middleware attaching `req.userId: string`; router mounted at `/api/trips` — later tasks (stops, budget, share) import the same `verifySupabaseJwt`.

- [ ] **Step 1: Write failing test**

`server/tests/trips.test.ts`:
```typescript
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
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npx vitest run tests/trips.test.ts`
Expected: FAIL — route `/api/trips` not mounted (404)

- [ ] **Step 3: Implement auth middleware and trips route**

`server/src/middleware/auth.ts`:
```typescript
import { Request, Response, NextFunction } from "express";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_KEY ?? ""
);

export interface AuthedRequest extends Request {
  userId?: string;
}

export async function verifySupabaseJwt(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "missing bearer token" });
  }
  const token = header.slice("Bearer ".length);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return res.status(401).json({ error: "invalid token" });
  }
  req.userId = data.user.id;
  next();
}
```

`server/src/routes/trips.ts`:
```typescript
import { Router } from "express";
import { z } from "zod";
import db from "../db";
import { verifySupabaseJwt, AuthedRequest } from "../middleware/auth";

const router = Router();

const createTripSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  startDate: z.string(),
  endDate: z.string(),
  coverPhotoUrl: z.string().optional(),
});

router.get("/", verifySupabaseJwt, async (req: AuthedRequest, res) => {
  const trips = await db.trip.findMany({
    where: {
      OR: [{ ownerId: req.userId }, { collaborators: { some: { userId: req.userId } } }],
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(trips);
});

router.post("/", verifySupabaseJwt, async (req: AuthedRequest, res) => {
  const parsed = createTripSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const trip = await db.trip.create({
    data: {
      ownerId: req.userId!,
      name: parsed.data.name,
      description: parsed.data.description,
      coverPhotoUrl: parsed.data.coverPhotoUrl,
      startDate: new Date(parsed.data.startDate),
      endDate: new Date(parsed.data.endDate),
    },
  });
  res.status(201).json(trip);
});

export default router;
```

Modify `server/src/app.ts` — add below `app.use(express.json())`:
```typescript
import tripsRouter from "./routes/trips";
app.use("/api/trips", tripsRouter);
```

- [ ] **Step 4: Run test, verify it passes**

Run: `npx vitest run tests/trips.test.ts`
Expected: PASS (requires `DATABASE_URL` pointed at a real/test Postgres — use a Supabase dev branch or local Postgres for test runs)

- [ ] **Step 5: Commit**

```bash
git add server/src/middleware server/src/routes/trips.ts server/src/app.ts server/tests/trips.test.ts
git commit -m "feat: Supabase JWT auth middleware, GET/POST /api/trips"
```

---

## Task 5: Trip detail/update/delete + Stop CRUD endpoints

**Files:**
- Modify: `server/src/routes/trips.ts`
- Create: `server/src/routes/stops.ts`
- Modify: `server/src/app.ts`
- Test: `server/tests/stops.test.ts`

**Interfaces:**
- Consumes: `verifySupabaseJwt`, `AuthedRequest` from Task 4.
- Produces: `GET/PATCH/DELETE /api/trips/:id`, `POST /api/trips/:id/stops`, `PATCH/DELETE /api/stops/:id` — Itinerary Builder (Task 13) calls these directly by these exact paths.

- [ ] **Step 1: Write failing test**

`server/tests/stops.test.ts`:
```typescript
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

let tripId: string;
let cityId: string;

beforeEach(async () => {
  await db.stop.deleteMany();
  await db.trip.deleteMany();
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
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npx vitest run tests/stops.test.ts`
Expected: FAIL — 404 on both routes

- [ ] **Step 3: Implement**

Add to `server/src/routes/trips.ts` (below existing routes, before `export default router`):
```typescript
router.get("/:id", verifySupabaseJwt, async (req: AuthedRequest, res) => {
  const trip = await db.trip.findUnique({
    where: { id: req.params.id },
    include: { stops: { include: { city: true, activities: { include: { activity: true } } }, orderBy: { orderIndex: "asc" } }, collaborators: true },
  });
  if (!trip) return res.status(404).json({ error: "not found" });
  res.json(trip);
});

router.patch("/:id", verifySupabaseJwt, async (req: AuthedRequest, res) => {
  const trip = await db.trip.update({ where: { id: req.params.id }, data: req.body });
  res.json(trip);
});

router.delete("/:id", verifySupabaseJwt, async (req: AuthedRequest, res) => {
  await db.trip.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

router.post("/:id/stops", verifySupabaseJwt, async (req: AuthedRequest, res) => {
  const schema = z.object({
    cityId: z.string(),
    orderIndex: z.number(),
    arrivalDate: z.string(),
    departureDate: z.string(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const stop = await db.stop.create({
    data: {
      tripId: req.params.id,
      cityId: parsed.data.cityId,
      orderIndex: parsed.data.orderIndex,
      arrivalDate: new Date(parsed.data.arrivalDate),
      departureDate: new Date(parsed.data.departureDate),
    },
  });
  res.status(201).json(stop);
});
```

`server/src/routes/stops.ts`:
```typescript
import { Router } from "express";
import { z } from "zod";
import db from "../db";
import { verifySupabaseJwt } from "../middleware/auth";

const router = Router();

const patchSchema = z.object({
  orderIndex: z.number().optional(),
  arrivalDate: z.string().optional(),
  departureDate: z.string().optional(),
});

router.patch("/:id", verifySupabaseJwt, async (req, res) => {
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const data: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.arrivalDate) data.arrivalDate = new Date(parsed.data.arrivalDate);
  if (parsed.data.departureDate) data.departureDate = new Date(parsed.data.departureDate);
  const stop = await db.stop.update({ where: { id: req.params.id }, data });
  res.json(stop);
});

router.delete("/:id", verifySupabaseJwt, async (req, res) => {
  await db.stop.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

export default router;
```

Modify `server/src/app.ts` — add:
```typescript
import stopsRouter from "./routes/stops";
app.use("/api/stops", stopsRouter);
```

- [ ] **Step 4: Run test, verify it passes**

Run: `npx vitest run tests/stops.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/src/routes server/src/app.ts server/tests/stops.test.ts
git commit -m "feat: trip detail/update/delete + stop CRUD endpoints"
```

---

## Task 6: Cities + Activities search endpoints

**Files:**
- Create: `server/src/routes/cities.ts`
- Create: `server/src/routes/activities.ts`
- Modify: `server/src/app.ts`
- Test: `server/tests/catalog.test.ts`

**Interfaces:**
- Consumes: `db` from Task 3, `City`/`Activity` models from Task 2.
- Produces: `GET /api/cities?search=&region=`, `GET /api/activities?city_id=&type=&cost_max=` — consumed by City Search (Task 12) and Activity Search (Task 14).

- [ ] **Step 1: Write failing test**

`server/tests/catalog.test.ts`:
```typescript
import request from "supertest";
import { describe, it, expect, beforeAll } from "vitest";
import app from "../src/app";
import db from "../src/db";

let cityId: string;

beforeAll(async () => {
  await db.activity.deleteMany();
  await db.city.deleteMany();
  const city = await db.city.create({ data: { name: "Lisbon", country: "Portugal", region: "Europe" } });
  cityId = city.id;
  await db.activity.create({ data: { cityId, name: "Fado Night", category: "culture", estCost: 25 } });
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
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npx vitest run tests/catalog.test.ts`
Expected: FAIL — 404 on both routes

- [ ] **Step 3: Implement**

`server/src/routes/cities.ts`:
```typescript
import { Router } from "express";
import db from "../db";

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
```

`server/src/routes/activities.ts`:
```typescript
import { Router } from "express";
import db from "../db";

const router = Router();

router.get("/", async (req, res) => {
  const cityId = typeof req.query.city_id === "string" ? req.query.city_id : undefined;
  const type = typeof req.query.type === "string" ? req.query.type : undefined;
  const costMax = typeof req.query.cost_max === "string" ? Number(req.query.cost_max) : undefined;
  const activities = await db.activity.findMany({
    where: {
      ...(cityId ? { cityId } : {}),
      ...(type ? { category: type } : {}),
      ...(costMax !== undefined ? { estCost: { lte: costMax } } : {}),
    },
  });
  res.json(activities);
});

export default router;
```

Modify `server/src/app.ts` — add:
```typescript
import citiesRouter from "./routes/cities";
import activitiesRouter from "./routes/activities";
app.use("/api/cities", citiesRouter);
app.use("/api/activities", activitiesRouter);
```

- [ ] **Step 4: Run test, verify it passes**

Run: `npx vitest run tests/catalog.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/cities.ts server/src/routes/activities.ts server/src/app.ts server/tests/catalog.test.ts
git commit -m "feat: city/activity search endpoints"
```

---

## Task 7: StopActivity attach/detach + budget service + budget endpoint

**Files:**
- Create: `server/src/routes/stopActivities.ts`
- Create: `server/src/services/budgetService.ts`
- Create: `server/src/routes/budget.ts`
- Modify: `server/src/app.ts`
- Test: `server/tests/budget.test.ts`

**Interfaces:**
- Consumes: `Stop`, `StopActivity`, `Expense` models from Task 2.
- Produces: `computeTripBudget(tripId: string): Promise<BudgetBreakdown>` where `BudgetBreakdown = { totalCost: number; byCategory: Record<string, number>; byDay: Record<string, number> }` — Budget screen (Task 16) fetches this via `GET /api/trips/:id/budget`.

- [ ] **Step 1: Write failing test**

`server/tests/budget.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from "vitest";
import db from "../src/db";
import { computeTripBudget } from "../src/services/budgetService";

let tripId: string;

beforeEach(async () => {
  await db.expense.deleteMany();
  await db.stopActivity.deleteMany();
  await db.stop.deleteMany();
  await db.trip.deleteMany();
  await db.activity.deleteMany();
  await db.city.deleteMany();
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
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npx vitest run tests/budget.test.ts`
Expected: FAIL — `Cannot find module '../src/services/budgetService'`

- [ ] **Step 3: Implement**

`server/src/services/budgetService.ts`:
```typescript
import db from "../db";

export interface BudgetBreakdown {
  totalCost: number;
  byCategory: Record<string, number>;
  byDay: Record<string, number>;
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function computeTripBudget(tripId: string): Promise<BudgetBreakdown> {
  const stopActivities = await db.stopActivity.findMany({
    where: { stop: { tripId } },
    include: { activity: true },
  });
  const expenses = await db.expense.findMany({ where: { tripId } });

  const byCategory: Record<string, number> = {};
  const byDay: Record<string, number> = {};
  let totalCost = 0;

  for (const sa of stopActivities) {
    const cost = sa.costOverride ?? sa.activity.estCost;
    totalCost += cost;
    byCategory.activity = (byCategory.activity ?? 0) + cost;
    const key = dayKey(sa.scheduledDate);
    byDay[key] = (byDay[key] ?? 0) + cost;
  }

  for (const exp of expenses) {
    totalCost += exp.amount;
    byCategory[exp.category] = (byCategory[exp.category] ?? 0) + exp.amount;
    const key = dayKey(exp.expenseDate);
    byDay[key] = (byDay[key] ?? 0) + exp.amount;
  }

  return { totalCost, byCategory, byDay };
}
```

`server/src/routes/budget.ts`:
```typescript
import { Router } from "express";
import { verifySupabaseJwt } from "../middleware/auth";
import { computeTripBudget } from "../services/budgetService";

const router = Router();

router.get("/:id/budget", verifySupabaseJwt, async (req, res) => {
  const breakdown = await computeTripBudget(req.params.id);
  res.json(breakdown);
});

export default router;
```

`server/src/routes/stopActivities.ts`:
```typescript
import { Router } from "express";
import { z } from "zod";
import db from "../db";
import { verifySupabaseJwt } from "../middleware/auth";

const router = Router();

router.post("/stops/:id/activities", verifySupabaseJwt, async (req, res) => {
  const schema = z.object({ activityId: z.string(), scheduledDate: z.string(), scheduledTime: z.string().optional() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const stopActivity = await db.stopActivity.create({
    data: {
      stopId: req.params.id,
      activityId: parsed.data.activityId,
      scheduledDate: new Date(parsed.data.scheduledDate),
      scheduledTime: parsed.data.scheduledTime,
    },
  });
  res.status(201).json(stopActivity);
});

router.delete("/stop-activities/:id", verifySupabaseJwt, async (req, res) => {
  await db.stopActivity.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

export default router;
```

Modify `server/src/app.ts` — add:
```typescript
import budgetRouter from "./routes/budget";
import stopActivitiesRouter from "./routes/stopActivities";
app.use("/api/trips", budgetRouter);
app.use("/api", stopActivitiesRouter);
```

- [ ] **Step 4: Run test, verify it passes**

Run: `npx vitest run tests/budget.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/stopActivities.ts server/src/routes/budget.ts server/src/services/budgetService.ts server/src/app.ts server/tests/budget.test.ts
git commit -m "feat: stop-activity attach/detach, budget calculation service + endpoint"
```

---

## Task 8: Design tokens, fonts, Lenis, base UI primitives

**Files:**
- Modify: `client/tailwind.config.ts`
- Create: `client/src/styles/globals.css`
- Create: `client/src/lib/lenis.ts`
- Modify: `client/src/main.tsx`
- Create: `client/src/components/ui/Button.tsx`, `client/src/components/ui/Card.tsx`, `client/src/components/ui/RouteLine.tsx`
- Test: `client/tests/RouteLine.test.tsx`

**Interfaces:**
- Produces: Tailwind theme colors `bg-platform`, `text-ink`, `bg-ink`, `bg-board`, `border-rail`, `text-mute`, `bg-signal`, `text-transit`; font families `font-display`, `font-sans`, `font-mono`; tracking utility `tracking-board`; `useLenis()` hook; `<Button>`/`<Card>`/`<RouteLine>` components — every feature screen imports these.
- `RouteLine` public API (Tasks 12, 15, 17, 19 all consume this — do not reinvent):
  ```typescript
  export interface RouteStop { id: string; label: string; meta?: string }
  export function RouteLine(props: { stops: RouteStop[]; compact?: boolean }): JSX.Element
  ```

- [ ] **Step 1: Tailwind theme tokens**

`client/tailwind.config.ts`:
```typescript
import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0E1116",
        board: "#2A3138",
        platform: "#EFF1F3",
        rail: "#D3D8DD",
        mute: "#6B747C",
        signal: "#FFB000",
        transit: "#1B4DFF",
      },
      fontFamily: {
        display: ['"Barlow Condensed"', "sans-serif"],
        sans: ["Inter", "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
      letterSpacing: {
        board: "0.08em",
      },
      borderRadius: {
        sm: "2px",
      },
    },
  },
  plugins: [],
} satisfies Config;
```

- [ ] **Step 2: Global CSS with fonts**

`client/src/styles/globals.css`:
```css
@import url("https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;700&display=swap");
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --ink: #0e1116;
  --board: #2a3138;
  --platform: #eff1f3;
  --rail: #d3d8dd;
  --mute: #6b747c;
  --signal: #ffb000;
  --transit: #1b4dff;
}

body {
  @apply bg-platform text-ink font-sans antialiased;
}

h1,
h2,
h3 {
  @apply font-display uppercase tracking-board;
}

/* Times, costs, durations, stop numbers — the app's dominant content type. */
.tabular {
  @apply font-mono tabular-nums;
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

- [ ] **Step 3: Lenis hook**

`client/src/lib/lenis.ts`:
```typescript
import { useEffect } from "react";
import Lenis from "lenis";

export function useLenis() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({ duration: 1.1, smoothWheel: true });

    function raf(time: number) {
      lenis.raf(time);
      frameId = requestAnimationFrame(raf);
    }

    let frameId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(frameId);
      lenis.destroy();
    };
  }, []);
}
```

- [ ] **Step 4: Button and Card primitives**

Transit-signage treatment: near-square corners (`rounded-sm` = 2px), condensed uppercase display type, amber signal for the primary action.

`client/src/components/ui/Button.tsx`:
```tsx
import { motion } from "framer-motion";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost";

const variants: Record<Variant, string> = {
  primary: "bg-signal text-ink hover:brightness-95",
  secondary: "bg-ink text-platform hover:bg-board",
  ghost: "bg-transparent text-ink border border-rail hover:border-ink",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      className={`rounded-sm px-5 py-2.5 font-display text-sm font-semibold uppercase tracking-board transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-transit ${variants[variant]} ${className}`}
      {...(props as any)}
    />
  );
}
```

`client/src/components/ui/Card.tsx`:
```tsx
import { motion } from "framer-motion";
import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 320, damping: 26 }}
      className={`overflow-hidden rounded-sm border border-rail bg-white ${className}`}
    >
      {children}
    </motion.div>
  );
}
```

- [ ] **Step 5a: Wire up the client test runner (blocking — no `test` script exists yet)**

`client/package.json` has vitest and Testing Library installed since Task 1 but no `test` script, so `npm run test --workspace client` currently fails. Add to `client/package.json` scripts:
```json
"test": "vitest run"
```

Create `client/vitest.config.ts`:
```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
  },
});
```

Create `client/vitest.setup.ts`:
```typescript
import "@testing-library/jest-dom/vitest";
```

Verify: `npm run test --workspace client` runs (reporting "no test files found" is the expected result at this point, not an error).

- [ ] **Step 5b: Write the failing RouteLine test**

`client/tests/RouteLine.test.tsx`:
```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RouteLine } from "../src/components/ui/RouteLine";

const stops = [
  { id: "s1", label: "Tokyo", meta: "4 nights" },
  { id: "s2", label: "Kyoto", meta: "3 nights" },
];

describe("RouteLine", () => {
  it("renders each stop with a zero-padded sequence number", () => {
    render(<RouteLine stops={stops} />);
    expect(screen.getByText("Tokyo")).toBeInTheDocument();
    expect(screen.getByText("Kyoto")).toBeInTheDocument();
    expect(screen.getByText("01")).toBeInTheDocument();
    expect(screen.getByText("02")).toBeInTheDocument();
  });

  it("renders stops as an ordered list, since itinerary order is meaningful", () => {
    render(<RouteLine stops={stops} />);
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
  });
});
```

- [ ] **Step 6: Run the test, verify it fails**

Run: `npm run test --workspace client -- RouteLine`
Expected: FAIL — `Cannot find module '../src/components/ui/RouteLine'`

- [ ] **Step 7: Implement RouteLine — the signature element**

A vertical track with stop nodes. The amber line is drawn by scaling a 1px bar from its top edge as scroll progresses through the list; nodes ignite from `rail` to `signal` as they enter the viewport. Scaling a bar (rather than animating an SVG path) keeps it robust against variable-height content.

`client/src/components/ui/RouteLine.tsx`:
```tsx
import { useRef } from "react";
import { motion, useScroll, useReducedMotion } from "framer-motion";

export interface RouteStop {
  id: string;
  label: string;
  meta?: string;
}

export function RouteLine({ stops, compact = false }: { stops: RouteStop[]; compact?: boolean }) {
  const ref = useRef<HTMLOListElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.9", "end 0.5"],
  });

  return (
    <ol ref={ref} className="relative m-0 list-none p-0">
      <span aria-hidden className="absolute bottom-2 left-[7px] top-2 w-px bg-rail" />
      <motion.span
        aria-hidden
        style={{ scaleY: reduce ? 1 : scrollYProgress }}
        className="absolute bottom-2 left-[7px] top-2 w-px origin-top bg-signal"
      />
      {stops.map((stop, i) => (
        <li key={stop.id} className={`relative flex gap-4 ${compact ? "py-1.5" : "py-4"}`}>
          <motion.span
            aria-hidden
            initial={reduce ? false : { backgroundColor: "#D3D8DD", scale: 0.8 }}
            whileInView={{ backgroundColor: "#FFB000", scale: 1 }}
            viewport={{ once: true, margin: "-20% 0px" }}
            transition={{ duration: 0.35 }}
            className="mt-1 h-[15px] w-[15px] shrink-0 rounded-full border-2 border-platform bg-rail"
          />
          <div className="min-w-0 flex-1">
            <span className="font-mono text-xs text-mute">{String(i + 1).padStart(2, "0")}</span>
            <p className={`font-display uppercase tracking-board ${compact ? "text-base" : "text-xl"}`}>
              {stop.label}
            </p>
            {stop.meta && <p className="font-mono text-xs text-mute">{stop.meta}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
```

- [ ] **Step 8: Run the test, verify it passes**

Run: `npm run test --workspace client -- RouteLine`
Expected: PASS

- [ ] **Step 9: Wire globals.css into main.tsx**

Modify `client/src/main.tsx` — add as first import:
```typescript
import "./styles/globals.css";
```

- [ ] **Step 10: Verify visually**

Run: `npm run dev --workspace client`, open the browser. Confirm: cool grey `platform` background (not cream), Barlow Condensed rendering uppercase for headings, JetBrains Mono for the stop numbers, and the amber line drawing as you scroll a `RouteLine`.

- [ ] **Step 11: Commit**

```bash
git add client/tailwind.config.ts client/package.json client/vitest.config.ts client/vitest.setup.ts client/src/styles client/src/lib/lenis.ts client/src/main.tsx client/src/components/ui client/tests/RouteLine.test.tsx
git commit -m "feat: transit-systems design tokens, fonts, Lenis, Button/Card/RouteLine primitives"
```

---

## Task 9: App shell — router, protected routes, page transitions

**Files:**
- Create: `client/src/lib/queryClient.ts`
- Create: `client/src/lib/supabase.ts`
- Create: `client/src/components/layout/ProtectedRoute.tsx`
- Create: `client/src/components/layout/AppShell.tsx`
- Modify: `client/src/App.tsx`
- Test: `client/tests/ProtectedRoute.test.tsx`

**Interfaces:**
- Produces: `<ProtectedRoute>` (redirects to `/login` when no Supabase session), `queryClient` (TanStack Query client, default export) — every feature page wraps its route in `<ProtectedRoute>` except `/login`, `/signup`, `/share/:slug`.

- [ ] **Step 1: Write failing test**

`client/tests/ProtectedRoute.test.tsx`:
```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "../src/components/layout/ProtectedRoute";

vi.mock("../src/lib/supabase", () => ({
  supabase: { auth: { getSession: async () => ({ data: { session: null } }) } },
}));

describe("ProtectedRoute", () => {
  it("redirects to /login when there is no session", async () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route path="/dashboard" element={<ProtectedRoute><div>Secret</div></ProtectedRoute>} />
        </Routes>
      </MemoryRouter>
    );
    expect(await screen.findByText("Login Page")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npm run test --workspace client -- ProtectedRoute`
Expected: FAIL — `Cannot find module '../src/components/layout/ProtectedRoute'`

- [ ] **Step 3: Implement**

`client/src/lib/supabase.ts`:
```typescript
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

`client/src/lib/queryClient.ts`:
```typescript
import { QueryClient } from "@tanstack/react-query";

const queryClient = new QueryClient();
export default queryClient;
```

`client/src/components/layout/ProtectedRoute.tsx`:
```tsx
import { ReactNode, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<"loading" | "authed" | "anon">("loading");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setStatus(data.session ? "authed" : "anon");
    });
  }, []);

  if (status === "loading") return null;
  if (status === "anon") return <Navigate to="/login" replace />;
  return <>{children}</>;
}
```

`client/src/components/layout/AppShell.tsx`:
```tsx
import { ReactNode } from "react";
import { Link } from "react-router-dom";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-cream">
      <header className="px-6 py-4 flex items-center justify-between border-b border-ink/10">
        <Link to="/" className="font-display text-xl">GlobeTrotter</Link>
        <nav className="flex gap-4 text-sm">
          <Link to="/trips">My Trips</Link>
          <Link to="/settings">Settings</Link>
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}
```

- [ ] **Step 4: Wire App.tsx**

`client/src/App.tsx`:
```tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { AnimatePresence } from "framer-motion";
import queryClient from "./lib/queryClient";
import { useLenis } from "./lib/lenis";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import { AppShell } from "./components/layout/AppShell";

export default function App() {
  useLenis();
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AnimatePresence mode="wait">
          <Routes>
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppShell>
                    <div>Dashboard placeholder</div>
                  </AppShell>
                </ProtectedRoute>
              }
            />
          </Routes>
        </AnimatePresence>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
```

- [ ] **Step 5: Run test, verify it passes**

Run: `npm run test --workspace client -- ProtectedRoute`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add client/src/lib client/src/components/layout client/src/App.tsx client/tests/ProtectedRoute.test.tsx
git commit -m "feat: app shell, protected routes, TanStack Query + AnimatePresence wiring"
```

---

## Task 10: Auth screens (Login/Signup)

**Files:**
- Create: `client/src/features/auth/LoginPage.tsx`
- Create: `client/src/features/auth/SignupPage.tsx`
- Modify: `client/src/App.tsx`
- Test: `client/tests/LoginPage.test.tsx`

**Interfaces:**
- Consumes: `supabase` from Task 9.
- Produces: routes `/login`, `/signup`.

- [ ] **Step 1: Write failing test**

`client/tests/LoginPage.test.tsx`:
```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LoginPage } from "../src/features/auth/LoginPage";

const signInWithPassword = vi.fn().mockResolvedValue({ error: null });
vi.mock("../src/lib/supabase", () => ({
  supabase: { auth: { signInWithPassword: (args: any) => signInWithPassword(args) } },
}));

describe("LoginPage", () => {
  it("submits email/password to Supabase", async () => {
    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@test.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "hunter22" } });
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));
    await waitFor(() => {
      expect(signInWithPassword).toHaveBeenCalledWith({ email: "a@test.com", password: "hunter22" });
    });
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npm run test --workspace client -- LoginPage`
Expected: FAIL — module not found

- [ ] **Step 3: Implement**

`client/src/features/auth/LoginPage.tsx`:
```tsx
import { FormEvent, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "../../lib/supabase";
import { Button } from "../../components/ui/Button";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return setError(error.message);
    navigate("/");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream">
      <motion.form
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white p-8 rounded-xl shadow-sm border border-ink/10"
      >
        <h1 className="font-display text-2xl mb-6">Welcome back</h1>
        <label htmlFor="email" className="block text-sm mb-1">Email</label>
        <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full mb-4 px-3 py-2 border border-ink/20 rounded-md" />
        <label htmlFor="password" className="block text-sm mb-1">Password</label>
        <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full mb-4 px-3 py-2 border border-ink/20 rounded-md" />
        {error && <p className="text-terracotta text-sm mb-4">{error}</p>}
        <Button type="submit" className="w-full">Log in</Button>
        <p className="mt-4 text-sm text-center">
          No account? <Link to="/signup" className="text-terracotta">Sign up</Link>
        </p>
      </motion.form>
    </div>
  );
}
```

`client/src/features/auth/SignupPage.tsx`:
```tsx
import { FormEvent, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "../../lib/supabase";
import { Button } from "../../components/ui/Button";

export function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) return setError(error.message);
    navigate("/login");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream">
      <motion.form
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white p-8 rounded-xl shadow-sm border border-ink/10"
      >
        <h1 className="font-display text-2xl mb-6">Create your account</h1>
        <label htmlFor="email" className="block text-sm mb-1">Email</label>
        <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full mb-4 px-3 py-2 border border-ink/20 rounded-md" />
        <label htmlFor="password" className="block text-sm mb-1">Password</label>
        <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full mb-4 px-3 py-2 border border-ink/20 rounded-md" />
        {error && <p className="text-terracotta text-sm mb-4">{error}</p>}
        <Button type="submit" className="w-full">Sign up</Button>
        <p className="mt-4 text-sm text-center">
          Have an account? <Link to="/login" className="text-terracotta">Log in</Link>
        </p>
      </motion.form>
    </div>
  );
}
```

- [ ] **Step 4: Wire routes into App.tsx**

Modify `client/src/App.tsx` — add imports and routes:
```tsx
import { LoginPage } from "./features/auth/LoginPage";
import { SignupPage } from "./features/auth/SignupPage";
```
Inside `<Routes>`, add before the `/` route:
```tsx
<Route path="/login" element={<LoginPage />} />
<Route path="/signup" element={<SignupPage />} />
```

- [ ] **Step 5: Run test, verify it passes**

Run: `npm run test --workspace client -- LoginPage`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add client/src/features/auth client/src/App.tsx client/tests/LoginPage.test.tsx
git commit -m "feat: Login/Signup screens wired to Supabase Auth"
```

---

## Task 11: API client + trips query hooks

**Files:**
- Create: `client/src/lib/apiClient.ts`
- Create: `client/src/features/trips/useTrips.ts`

**Interfaces:**
- Consumes: `supabase` (Task 9), `queryClient` (Task 9).
- Produces: `apiFetch<T>(path: string, init?: RequestInit): Promise<T>`; `useTrips()`, `useCreateTrip()` (TanStack Query hooks) — Dashboard (Task 12), My Trips (Task 13), Create Trip (Task 13) all import these.

- [ ] **Step 1: Implement apiClient**

`client/src/lib/apiClient.ts`:
```typescript
import { supabase } from "./supabase";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ? JSON.stringify(body.error) : `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}
```

- [ ] **Step 2: Implement trips hooks**

`client/src/features/trips/useTrips.ts`:
```typescript
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../../lib/apiClient";

export interface Trip {
  id: string;
  name: string;
  description?: string;
  coverPhotoUrl?: string;
  startDate: string;
  endDate: string;
  ownerId: string;
}

export function useTrips() {
  return useQuery({ queryKey: ["trips"], queryFn: () => apiFetch<Trip[]>("/trips") });
}

export interface CreateTripInput {
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
}

export function useCreateTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTripInput) => apiFetch<Trip>("/trips", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["trips"] }),
  });
}
```

- [ ] **Step 3: Verify with a quick manual smoke check**

Run: `npm run dev --workspace client` and `npm run dev --workspace server` together, confirm no TypeScript errors via `npx tsc --noEmit` in `client/`.

- [ ] **Step 4: Commit**

```bash
git add client/src/lib/apiClient.ts client/src/features/trips/useTrips.ts
git commit -m "feat: authenticated API client + trips query hooks"
```

---

## Task 12: Dashboard screen

**Files:**
- Create: `client/src/features/dashboard/DashboardPage.tsx`
- Modify: `client/src/App.tsx`
- Test: `client/tests/DashboardPage.test.tsx`

**Interfaces:**
- Consumes: `useTrips()` from Task 11, `Card`/`Button` from Task 8.
- Produces: route `/` — replaces the placeholder from Task 9.

- [ ] **Step 1: Write failing test**

`client/tests/DashboardPage.test.tsx`:
```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { DashboardPage } from "../src/features/dashboard/DashboardPage";

vi.mock("../src/features/trips/useTrips", () => ({
  useTrips: () => ({
    data: [{ id: "1", name: "Japan Trip", startDate: "2026-09-01", endDate: "2026-09-10", ownerId: "u1" }],
    isLoading: false,
  }),
}));

describe("DashboardPage", () => {
  it("renders trip cards from useTrips", () => {
    const qc = new QueryClient();
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter><DashboardPage /></MemoryRouter>
      </QueryClientProvider>
    );
    expect(screen.getByText("Japan Trip")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npm run test --workspace client -- DashboardPage`
Expected: FAIL — module not found

- [ ] **Step 3: Implement**

`client/src/features/dashboard/DashboardPage.tsx`:
```tsx
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useTrips } from "../trips/useTrips";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";

export function DashboardPage() {
  const { data: trips, isLoading } = useTrips();

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-3xl">Your trips</h1>
        <Link to="/trips/new"><Button>Plan New Trip</Button></Link>
      </div>
      {isLoading && <p>Loading...</p>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {trips?.map((trip, i) => (
          <motion.div key={trip.id} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}>
            <Link to={`/trips/${trip.id}`}>
              <Card className="p-5">
                <h2 className="font-display text-lg">{trip.name}</h2>
                <p className="text-sm text-ink/60">{trip.startDate.slice(0, 10)} - {trip.endDate.slice(0, 10)}</p>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Wire into App.tsx**

Modify `client/src/App.tsx` — replace the placeholder `<div>Dashboard placeholder</div>` with `<DashboardPage />` and add the import:
```tsx
import { DashboardPage } from "./features/dashboard/DashboardPage";
```

- [ ] **Step 5: Run test, verify it passes**

Run: `npm run test --workspace client -- DashboardPage`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add client/src/features/dashboard client/src/App.tsx client/tests/DashboardPage.test.tsx
git commit -m "feat: Dashboard screen with scroll-reveal trip cards"
```

---

## Task 13: Create Trip + My Trips screens

**Files:**
- Create: `client/src/features/trips/CreateTripPage.tsx`
- Create: `client/src/features/trips/MyTripsPage.tsx`
- Modify: `client/src/App.tsx`
- Test: `client/tests/CreateTripPage.test.tsx`

**Interfaces:**
- Consumes: `useCreateTrip()`, `useTrips()` from Task 11.
- Produces: routes `/trips/new`, `/trips`.

- [ ] **Step 1: Write failing test**

`client/tests/CreateTripPage.test.tsx`:
```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { CreateTripPage } from "../src/features/trips/CreateTripPage";

const mutateAsync = vi.fn().mockResolvedValue({ id: "1" });
vi.mock("../src/features/trips/useTrips", () => ({
  useCreateTrip: () => ({ mutateAsync }),
}));

describe("CreateTripPage", () => {
  it("submits trip name and dates", async () => {
    render(<MemoryRouter><CreateTripPage /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText("Trip name"), { target: { value: "Iceland Loop" } });
    fireEvent.change(screen.getByLabelText("Start date"), { target: { value: "2026-08-01" } });
    fireEvent.change(screen.getByLabelText("End date"), { target: { value: "2026-08-10" } });
    fireEvent.click(screen.getByRole("button", { name: "Save trip" }));
    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({ name: "Iceland Loop", startDate: "2026-08-01", endDate: "2026-08-10", description: "" });
    });
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npm run test --workspace client -- CreateTripPage`
Expected: FAIL — module not found

- [ ] **Step 3: Implement**

`client/src/features/trips/CreateTripPage.tsx`:
```tsx
import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCreateTrip } from "./useTrips";
import { Button } from "../../components/ui/Button";

export function CreateTripPage() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const { mutateAsync } = useCreateTrip();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trip = await mutateAsync({ name, description, startDate, endDate });
    navigate(`/trips/${trip.id}/build`);
  }

  return (
    <div className="max-w-xl mx-auto px-6 py-10">
      <h1 className="font-display text-2xl mb-6">Plan a new trip</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm mb-1">Trip name</label>
          <input id="name" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border border-ink/20 rounded-md" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="start" className="block text-sm mb-1">Start date</label>
            <input id="start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-3 py-2 border border-ink/20 rounded-md" />
          </div>
          <div>
            <label htmlFor="end" className="block text-sm mb-1">End date</label>
            <input id="end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-3 py-2 border border-ink/20 rounded-md" />
          </div>
        </div>
        <div>
          <label htmlFor="description" className="block text-sm mb-1">Description</label>
          <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-3 py-2 border border-ink/20 rounded-md" />
        </div>
        <Button type="submit">Save trip</Button>
      </form>
    </div>
  );
}
```

`client/src/features/trips/MyTripsPage.tsx`:
```tsx
import { Link } from "react-router-dom";
import { useTrips } from "./useTrips";
import { Card } from "../../components/ui/Card";

export function MyTripsPage() {
  const { data: trips } = useTrips();
  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <h1 className="font-display text-2xl mb-6">My Trips</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {trips?.map((trip) => (
          <Card key={trip.id} className="p-5">
            <h2 className="font-display text-lg">{trip.name}</h2>
            <p className="text-sm text-ink/60">{trip.startDate.slice(0, 10)} - {trip.endDate.slice(0, 10)}</p>
            <div className="mt-3 flex gap-3 text-sm">
              <Link to={`/trips/${trip.id}`} className="text-terracotta">View</Link>
              <Link to={`/trips/${trip.id}/build`} className="text-forest">Edit</Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Wire routes**

Modify `client/src/App.tsx` — add imports and routes (both wrapped in `ProtectedRoute` + `AppShell`, following the pattern from Task 9's `/` route):
```tsx
import { CreateTripPage } from "./features/trips/CreateTripPage";
import { MyTripsPage } from "./features/trips/MyTripsPage";
```
```tsx
<Route path="/trips/new" element={<ProtectedRoute><AppShell><CreateTripPage /></AppShell></ProtectedRoute>} />
<Route path="/trips" element={<ProtectedRoute><AppShell><MyTripsPage /></AppShell></ProtectedRoute>} />
```

- [ ] **Step 5: Run test, verify it passes**

Run: `npm run test --workspace client -- CreateTripPage`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add client/src/features/trips client/src/App.tsx client/tests/CreateTripPage.test.tsx
git commit -m "feat: Create Trip and My Trips screens"
```

---

## Task 14: City Search screen

**Files:**
- Create: `client/src/features/cities/useCities.ts`
- Create: `client/src/features/cities/CitySearchPage.tsx`
- Modify: `client/src/App.tsx`
- Test: `client/tests/CitySearchPage.test.tsx`

**Interfaces:**
- Consumes: `apiFetch` (Task 11), `useCreateStop` (new hook this task defines: `useCreateStop(tripId: string)`).
- Produces: route `/trips/:id/cities`; `useCreateStop` reused by Task 15 (Itinerary Builder).

- [ ] **Step 1: Write failing test**

`client/tests/CitySearchPage.test.tsx`:
```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { CitySearchPage } from "../src/features/cities/CitySearchPage";

vi.mock("../src/features/cities/useCities", () => ({
  useCities: () => ({ data: [{ id: "c1", name: "Lisbon", country: "Portugal" }], isLoading: false }),
  useCreateStop: () => ({ mutateAsync: vi.fn() }),
}));

describe("CitySearchPage", () => {
  it("renders search results", async () => {
    const qc = new QueryClient();
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={["/trips/t1/cities"]}>
          <Routes><Route path="/trips/:id/cities" element={<CitySearchPage />} /></Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );
    await waitFor(() => expect(screen.getByText("Lisbon")).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npm run test --workspace client -- CitySearchPage`
Expected: FAIL — module not found

- [ ] **Step 3: Implement**

`client/src/features/cities/useCities.ts`:
```typescript
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../../lib/apiClient";

export interface City {
  id: string;
  name: string;
  country: string;
  region?: string;
  costIndex?: number;
  popularityScore?: number;
}

export function useCities(search: string) {
  return useQuery({
    queryKey: ["cities", search],
    queryFn: () => apiFetch<City[]>(`/cities?search=${encodeURIComponent(search)}`),
  });
}

export interface CreateStopInput {
  cityId: string;
  orderIndex: number;
  arrivalDate: string;
  departureDate: string;
}

export function useCreateStop(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateStopInput) => apiFetch(`/trips/${tripId}/stops`, { method: "POST", body: JSON.stringify(input) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["trip", tripId] }),
  });
}
```

`client/src/features/cities/CitySearchPage.tsx`:
```tsx
import { useParams } from "react-router-dom";
import { useState } from "react";
import { useCities, useCreateStop } from "./useCities";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";

export function CitySearchPage() {
  const { id: tripId } = useParams<{ id: string }>();
  const [search, setSearch] = useState("");
  const { data: cities, isLoading } = useCities(search);
  const { mutateAsync } = useCreateStop(tripId!);

  async function addCity(cityId: string) {
    const today = new Date().toISOString().slice(0, 10);
    await mutateAsync({ cityId, orderIndex: 0, arrivalDate: today, departureDate: today });
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="font-display text-2xl mb-6">Add a city</h1>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search cities..."
        className="w-full mb-6 px-3 py-2 border border-ink/20 rounded-md"
      />
      {isLoading && <p>Loading...</p>}
      <div className="space-y-3">
        {cities?.map((city) => (
          <Card key={city.id} className="p-4 flex items-center justify-between">
            <div>
              <p className="font-medium">{city.name}</p>
              <p className="text-sm text-ink/60">{city.country}</p>
            </div>
            <Button variant="secondary" onClick={() => addCity(city.id)}>Add to Trip</Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Wire route**

Modify `client/src/App.tsx`:
```tsx
import { CitySearchPage } from "./features/cities/CitySearchPage";
```
```tsx
<Route path="/trips/:id/cities" element={<ProtectedRoute><AppShell><CitySearchPage /></AppShell></ProtectedRoute>} />
```

- [ ] **Step 5: Run test, verify it passes**

Run: `npm run test --workspace client -- CitySearchPage`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add client/src/features/cities client/src/App.tsx client/tests/CitySearchPage.test.tsx
git commit -m "feat: City Search screen"
```

---

## Task 15: Itinerary Builder screen (drag-reorder stops)

**Files:**
- Create: `client/src/features/itinerary/useTrip.ts`
- Create: `client/src/features/itinerary/ItineraryBuilderPage.tsx`
- Modify: `client/src/App.tsx`
- Test: `client/tests/ItineraryBuilderPage.test.tsx`

**Interfaces:**
- Consumes: `apiFetch` (Task 11).
- Produces: `useTrip(tripId)` (fetches nested trip+stops+activities via `GET /api/trips/:id`), `useReorderStop(tripId)` (`PATCH /api/stops/:id`) — reused by Itinerary View (Task 16) and Calendar (Task 19).

- [ ] **Step 1: Write failing test**

`client/tests/ItineraryBuilderPage.test.tsx`:
```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { ItineraryBuilderPage } from "../src/features/itinerary/ItineraryBuilderPage";

vi.mock("../src/features/itinerary/useTrip", () => ({
  useTrip: () => ({
    data: {
      id: "t1",
      name: "Japan Trip",
      stops: [{ id: "s1", orderIndex: 0, city: { name: "Tokyo" }, activities: [] }],
    },
    isLoading: false,
  }),
  useReorderStop: () => ({ mutate: vi.fn() }),
}));

describe("ItineraryBuilderPage", () => {
  it("renders stops for the trip", () => {
    const qc = new QueryClient();
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={["/trips/t1/build"]}>
          <Routes><Route path="/trips/:id/build" element={<ItineraryBuilderPage />} /></Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );
    expect(screen.getByText("Tokyo")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npm run test --workspace client -- ItineraryBuilderPage`
Expected: FAIL — module not found

- [ ] **Step 3: Implement**

`client/src/features/itinerary/useTrip.ts`:
```typescript
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../../lib/apiClient";

export interface TripDetail {
  id: string;
  name: string;
  stops: Array<{
    id: string;
    orderIndex: number;
    city: { id: string; name: string };
    activities: Array<{ id: string; activity: { name: string; estCost: number } }>;
  }>;
}

export function useTrip(tripId: string) {
  return useQuery({ queryKey: ["trip", tripId], queryFn: () => apiFetch<TripDetail>(`/trips/${tripId}`) });
}

export function useReorderStop(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ stopId, orderIndex }: { stopId: string; orderIndex: number }) =>
      apiFetch(`/stops/${stopId}`, { method: "PATCH", body: JSON.stringify({ orderIndex }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["trip", tripId] }),
  });
}
```

`client/src/features/itinerary/ItineraryBuilderPage.tsx`:
```tsx
import { useParams, Link } from "react-router-dom";
import { Reorder } from "framer-motion";
import { useState, useEffect } from "react";
import { useTrip, useReorderStop } from "./useTrip";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";

export function ItineraryBuilderPage() {
  const { id: tripId } = useParams<{ id: string }>();
  const { data: trip, isLoading } = useTrip(tripId!);
  const { mutate: reorder } = useReorderStop(tripId!);
  const [stops, setStops] = useState(trip?.stops ?? []);

  useEffect(() => {
    if (trip?.stops) setStops(trip.stops);
  }, [trip?.stops]);

  if (isLoading || !trip) return <p className="px-6 py-10">Loading...</p>;

  function handleReorder(newOrder: typeof stops) {
    setStops(newOrder);
    newOrder.forEach((stop, index) => reorder({ stopId: stop.id, orderIndex: index }));
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl">{trip.name}</h1>
        <Link to={`/trips/${tripId}/cities`}><Button>Add Stop</Button></Link>
      </div>
      <Reorder.Group axis="y" values={stops} onReorder={handleReorder} className="space-y-3">
        {stops.map((stop) => (
          <Reorder.Item key={stop.id} value={stop}>
            <Card className="p-4 cursor-grab active:cursor-grabbing">
              <p className="font-medium">{stop.city.name}</p>
              <p className="text-sm text-ink/60">{stop.activities.length} activities</p>
              <Link to={`/trips/${tripId}/activities?stop=${stop.id}`} className="text-sm text-terracotta">Add activities</Link>
            </Card>
          </Reorder.Item>
        ))}
      </Reorder.Group>
    </div>
  );
}
```

- [ ] **Step 4: Wire route**

Modify `client/src/App.tsx`:
```tsx
import { ItineraryBuilderPage } from "./features/itinerary/ItineraryBuilderPage";
```
```tsx
<Route path="/trips/:id/build" element={<ProtectedRoute><AppShell><ItineraryBuilderPage /></AppShell></ProtectedRoute>} />
```

- [ ] **Step 5: Run test, verify it passes**

Run: `npm run test --workspace client -- ItineraryBuilderPage`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add client/src/features/itinerary client/src/App.tsx client/tests/ItineraryBuilderPage.test.tsx
git commit -m "feat: Itinerary Builder screen with drag-reorder stops"
```

---

## Task 16: Activity Search + attach-to-stop

**Files:**
- Create: `client/src/features/activities/useActivities.ts`
- Create: `client/src/features/activities/ActivitySearchPage.tsx`
- Modify: `client/src/App.tsx`
- Test: `client/tests/ActivitySearchPage.test.tsx`

**Interfaces:**
- Consumes: `apiFetch` (Task 11).
- Produces: route `/trips/:id/activities?stop=`.

- [ ] **Step 1: Write failing test**

`client/tests/ActivitySearchPage.test.tsx`:
```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { ActivitySearchPage } from "../src/features/activities/ActivitySearchPage";

vi.mock("../src/features/activities/useActivities", () => ({
  useActivities: () => ({ data: [{ id: "a1", name: "Museum", category: "sightseeing", estCost: 20 }], isLoading: false }),
  useAttachActivity: () => ({ mutateAsync: vi.fn() }),
}));

describe("ActivitySearchPage", () => {
  it("renders activities for the given stop's city", async () => {
    const qc = new QueryClient();
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={["/trips/t1/activities?stop=s1"]}>
          <Routes><Route path="/trips/:id/activities" element={<ActivitySearchPage />} /></Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );
    await waitFor(() => expect(screen.getByText("Museum")).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npm run test --workspace client -- ActivitySearchPage`
Expected: FAIL — module not found

- [ ] **Step 3: Implement**

`client/src/features/activities/useActivities.ts`:
```typescript
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../../lib/apiClient";

export interface Activity {
  id: string;
  name: string;
  category: string;
  estCost: number;
}

export function useActivities(cityId: string) {
  return useQuery({
    queryKey: ["activities", cityId],
    queryFn: () => apiFetch<Activity[]>(`/activities?city_id=${cityId}`),
    enabled: !!cityId,
  });
}

export function useAttachActivity(tripId: string, stopId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ activityId, scheduledDate }: { activityId: string; scheduledDate: string }) =>
      apiFetch(`/stops/${stopId}/activities`, { method: "POST", body: JSON.stringify({ activityId, scheduledDate }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["trip", tripId] }),
  });
}
```

`client/src/features/activities/ActivitySearchPage.tsx`:
```tsx
import { useParams, useSearchParams } from "react-router-dom";
import { useTrip } from "../itinerary/useTrip";
import { useActivities, useAttachActivity } from "./useActivities";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";

export function ActivitySearchPage() {
  const { id: tripId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const stopId = searchParams.get("stop") ?? "";
  const { data: trip } = useTrip(tripId!);
  const stop = trip?.stops.find((s) => s.id === stopId);
  const { data: activities, isLoading } = useActivities(stop?.city.id ?? "");
  const { mutateAsync } = useAttachActivity(tripId!, stopId);

  async function addActivity(activityId: string) {
    await mutateAsync({ activityId, scheduledDate: new Date().toISOString().slice(0, 10) });
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="font-display text-2xl mb-6">Activities in {stop?.city.name ?? "..."}</h1>
      {isLoading && <p>Loading...</p>}
      <div className="space-y-3">
        {activities?.map((activity) => (
          <Card key={activity.id} className="p-4 flex items-center justify-between">
            <div>
              <p className="font-medium">{activity.name}</p>
              <p className="text-sm text-ink/60">{activity.category} - ${activity.estCost}</p>
            </div>
            <Button variant="secondary" onClick={() => addActivity(activity.id)}>Add</Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Wire route**

Modify `client/src/App.tsx`:
```tsx
import { ActivitySearchPage } from "./features/activities/ActivitySearchPage";
```
```tsx
<Route path="/trips/:id/activities" element={<ProtectedRoute><AppShell><ActivitySearchPage /></AppShell></ProtectedRoute>} />
```

- [ ] **Step 5: Run test, verify it passes**

Run: `npm run test --workspace client -- ActivitySearchPage`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add client/src/features/activities client/src/App.tsx client/tests/ActivitySearchPage.test.tsx
git commit -m "feat: Activity Search screen, attach activity to stop"
```

---

## Task 17: Itinerary View screen (timeline / city-grouped toggle)

**Files:**
- Create: `client/src/features/itinerary/ItineraryViewPage.tsx`
- Modify: `client/src/App.tsx`
- Test: `client/tests/ItineraryViewPage.test.tsx`

**Interfaces:**
- Consumes: `useTrip` from Task 15.
- Produces: route `/trips/:id`.

- [ ] **Step 1: Write failing test**

`client/tests/ItineraryViewPage.test.tsx`:
```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { ItineraryViewPage } from "../src/features/itinerary/ItineraryViewPage";

vi.mock("../src/features/itinerary/useTrip", () => ({
  useTrip: () => ({
    data: {
      id: "t1",
      name: "Japan Trip",
      stops: [{ id: "s1", orderIndex: 0, city: { name: "Tokyo" }, activities: [{ id: "sa1", activity: { name: "Temple", estCost: 0 } }] }],
    },
    isLoading: false,
  }),
}));

describe("ItineraryViewPage", () => {
  it("toggles between city-grouped and timeline view", () => {
    const qc = new QueryClient();
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={["/trips/t1"]}>
          <Routes><Route path="/trips/:id" element={<ItineraryViewPage />} /></Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );
    expect(screen.getByText("Tokyo")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Timeline" }));
    expect(screen.getByText("Temple")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npm run test --workspace client -- ItineraryViewPage`
Expected: FAIL — module not found

- [ ] **Step 3: Implement**

`client/src/features/itinerary/ItineraryViewPage.tsx`:
```tsx
import { useParams } from "react-router-dom";
import { useState } from "react";
import { motion } from "framer-motion";
import { useTrip } from "./useTrip";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";

export function ItineraryViewPage() {
  const { id: tripId } = useParams<{ id: string }>();
  const { data: trip, isLoading } = useTrip(tripId!);
  const [mode, setMode] = useState<"city" | "timeline">("city");

  if (isLoading || !trip) return <p className="px-6 py-10">Loading...</p>;

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl">{trip.name}</h1>
        <div className="flex gap-2">
          <Button variant={mode === "city" ? "primary" : "ghost"} onClick={() => setMode("city")}>By City</Button>
          <Button variant={mode === "timeline" ? "primary" : "ghost"} onClick={() => setMode("timeline")}>Timeline</Button>
        </div>
      </div>
      <div className="space-y-4">
        {trip.stops.map((stop, i) => (
          <motion.div key={stop.id} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}>
            <Card className="p-5">
              <h2 className="font-display text-lg mb-2">{stop.city.name}</h2>
              {mode === "timeline" && (
                <ul className="space-y-1 text-sm">
                  {stop.activities.map((sa) => (
                    <li key={sa.id}>{sa.activity.name} - ${sa.activity.estCost}</li>
                  ))}
                </ul>
              )}
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Wire route**

Modify `client/src/App.tsx` — add import and route (this is now the trip-detail route, distinct from `/trips/:id/build`):
```tsx
import { ItineraryViewPage } from "./features/itinerary/ItineraryViewPage";
```
```tsx
<Route path="/trips/:id" element={<ProtectedRoute><AppShell><ItineraryViewPage /></AppShell></ProtectedRoute>} />
```

- [ ] **Step 5: Run test, verify it passes**

Run: `npm run test --workspace client -- ItineraryViewPage`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add client/src/features/itinerary/ItineraryViewPage.tsx client/src/App.tsx client/tests/ItineraryViewPage.test.tsx
git commit -m "feat: Itinerary View screen with city/timeline toggle"
```

---

## Task 18: Budget screen

**Files:**
- Create: `client/src/features/budget/useBudget.ts`
- Create: `client/src/features/budget/BudgetPage.tsx`
- Modify: `client/src/App.tsx`
- Test: `client/tests/BudgetPage.test.tsx`

**Interfaces:**
- Consumes: `apiFetch` (Task 11), `BudgetBreakdown` shape from Task 7's server service.
- Produces: route `/trips/:id/budget`.

- [ ] **Step 1: Write failing test**

`client/tests/BudgetPage.test.tsx`:
```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { BudgetPage } from "../src/features/budget/BudgetPage";

vi.mock("../src/features/budget/useBudget", () => ({
  useBudget: () => ({
    data: { totalCost: 150, byCategory: { activity: 100, meal: 50 }, byDay: { "2026-07-01": 150 } },
    isLoading: false,
  }),
}));

describe("BudgetPage", () => {
  it("renders total cost and category breakdown", async () => {
    const qc = new QueryClient();
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={["/trips/t1/budget"]}>
          <Routes><Route path="/trips/:id/budget" element={<BudgetPage />} /></Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );
    await waitFor(() => expect(screen.getByText("$150")).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npm run test --workspace client -- BudgetPage`
Expected: FAIL — module not found

- [ ] **Step 3: Implement**

`client/src/features/budget/useBudget.ts`:
```typescript
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../lib/apiClient";

export interface BudgetBreakdown {
  totalCost: number;
  byCategory: Record<string, number>;
  byDay: Record<string, number>;
}

export function useBudget(tripId: string) {
  return useQuery({ queryKey: ["budget", tripId], queryFn: () => apiFetch<BudgetBreakdown>(`/trips/${tripId}/budget`) });
}
```

`client/src/features/budget/BudgetPage.tsx`:
```tsx
import { useParams } from "react-router-dom";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { useBudget } from "./useBudget";
import { Card } from "../../components/ui/Card";

const COLORS = ["#C1543A", "#2F4A3C", "#D9A441", "#7A8B99", "#9C4230"];

export function BudgetPage() {
  const { id: tripId } = useParams<{ id: string }>();
  const { data: budget, isLoading } = useBudget(tripId!);

  if (isLoading || !budget) return <p className="px-6 py-10">Loading...</p>;

  const pieData = Object.entries(budget.byCategory).map(([name, value]) => ({ name, value }));

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="font-display text-2xl mb-6">Budget</h1>
      <Card className="p-6 mb-6">
        <p className="text-sm text-ink/60">Total estimated cost</p>
        <p className="font-display text-3xl">${budget.totalCost}</p>
      </Card>
      <Card className="p-6" style={{ height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={100}>
              {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
```

- [ ] **Step 4: Wire route**

Modify `client/src/App.tsx`:
```tsx
import { BudgetPage } from "./features/budget/BudgetPage";
```
```tsx
<Route path="/trips/:id/budget" element={<ProtectedRoute><AppShell><BudgetPage /></AppShell></ProtectedRoute>} />
```

- [ ] **Step 5: Run test, verify it passes**

Run: `npm run test --workspace client -- BudgetPage`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add client/src/features/budget client/src/App.tsx client/tests/BudgetPage.test.tsx
git commit -m "feat: Budget screen with cost breakdown pie chart"
```

This completes the MVP cut line (Auth -> Create Trip -> Itinerary Builder -> Itinerary View -> Budget). Everything below is additive.

---

## Task 19: Calendar/Timeline screen

**Files:**
- Create: `client/src/features/calendar/CalendarPage.tsx`
- Modify: `server/src/routes/trips.ts` (add `/calendar` sub-route)
- Modify: `client/src/App.tsx`
- Test: `server/tests/calendar.test.ts`, `client/tests/CalendarPage.test.tsx`

**Interfaces:**
- Consumes: `db` (server), `useTrip` (client, Task 15).
- Produces: `GET /api/trips/:id/calendar` returning `{ day: string; stops: { cityName: string; activities: { name: string; time?: string }[] }[] }[]`; route `/trips/:id/calendar`.

- [ ] **Step 1: Write failing server test**

`server/tests/calendar.test.ts`:
```typescript
import request from "supertest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import app from "../src/app";
import db from "../src/db";

vi.mock("../src/middleware/auth", () => ({
  verifySupabaseJwt: (req: any, _res: any, next: any) => { req.userId = "u1"; next(); },
}));

let tripId: string;

beforeEach(async () => {
  await db.stopActivity.deleteMany();
  await db.stop.deleteMany();
  await db.trip.deleteMany();
  await db.activity.deleteMany();
  await db.city.deleteMany();
  const city = await db.city.create({ data: { name: "Kyoto", country: "Japan" } });
  const trip = await db.trip.create({ data: { ownerId: "u1", name: "T", startDate: new Date(), endDate: new Date() } });
  tripId = trip.id;
  const stop = await db.stop.create({ data: { tripId, cityId: city.id, orderIndex: 0, arrivalDate: new Date("2026-05-01"), departureDate: new Date("2026-05-03") } });
  const activity = await db.activity.create({ data: { cityId: city.id, name: "Bamboo Grove", category: "sightseeing" } });
  await db.stopActivity.create({ data: { stopId: stop.id, activityId: activity.id, scheduledDate: new Date("2026-05-01"), scheduledTime: "09:00" } });
});

describe("GET /api/trips/:id/calendar", () => {
  it("groups activities by day", async () => {
    const res = await request(app).get(`/api/trips/${tripId}/calendar`);
    expect(res.status).toBe(200);
    expect(res.body[0].day).toBe("2026-05-01");
    expect(res.body[0].stops[0].cityName).toBe("Kyoto");
    expect(res.body[0].stops[0].activities[0].name).toBe("Bamboo Grove");
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `cd server && npx vitest run tests/calendar.test.ts`
Expected: FAIL — 404

- [ ] **Step 3: Implement server route**

Add to `server/src/routes/trips.ts` (before `export default router`):
```typescript
router.get("/:id/calendar", verifySupabaseJwt, async (req: AuthedRequest, res) => {
  const stops = await db.stop.findMany({
    where: { tripId: req.params.id },
    include: { city: true, activities: { include: { activity: true } } },
    orderBy: { orderIndex: "asc" },
  });

  const byDay = new Map<string, Map<string, { cityName: string; activities: { name: string; time?: string }[] }>>();

  for (const stop of stops) {
    for (const sa of stop.activities) {
      const day = sa.scheduledDate.toISOString().slice(0, 10);
      if (!byDay.has(day)) byDay.set(day, new Map());
      const dayMap = byDay.get(day)!;
      if (!dayMap.has(stop.id)) dayMap.set(stop.id, { cityName: stop.city.name, activities: [] });
      dayMap.get(stop.id)!.activities.push({ name: sa.activity.name, time: sa.scheduledTime ?? undefined });
    }
  }

  const result = Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, stopsMap]) => ({ day, stops: Array.from(stopsMap.values()) }));

  res.json(result);
});
```

- [ ] **Step 4: Run server test, verify it passes**

Run: `npx vitest run tests/calendar.test.ts`
Expected: PASS

- [ ] **Step 5: Write failing client test**

`client/tests/CalendarPage.test.tsx`:
```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { CalendarPage } from "../src/features/calendar/CalendarPage";

vi.mock("../src/lib/apiClient", () => ({
  apiFetch: vi.fn().mockResolvedValue([{ day: "2026-05-01", stops: [{ cityName: "Kyoto", activities: [{ name: "Bamboo Grove", time: "09:00" }] }] }]),
}));

describe("CalendarPage", () => {
  it("renders day groups with city and activity names", async () => {
    const qc = new QueryClient();
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={["/trips/t1/calendar"]}>
          <Routes><Route path="/trips/:id/calendar" element={<CalendarPage />} /></Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );
    await waitFor(() => expect(screen.getByText("Bamboo Grove")).toBeInTheDocument());
  });
});
```

- [ ] **Step 6: Run client test, verify it fails**

Run: `npm run test --workspace client -- CalendarPage`
Expected: FAIL — module not found

- [ ] **Step 7: Implement client page**

`client/src/features/calendar/CalendarPage.tsx`:
```tsx
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../lib/apiClient";
import { Card } from "../../components/ui/Card";

interface CalendarDay {
  day: string;
  stops: { cityName: string; activities: { name: string; time?: string }[] }[];
}

export function CalendarPage() {
  const { id: tripId } = useParams<{ id: string }>();
  const { data: days, isLoading } = useQuery({
    queryKey: ["calendar", tripId],
    queryFn: () => apiFetch<CalendarDay[]>(`/trips/${tripId}/calendar`),
  });

  if (isLoading || !days) return <p className="px-6 py-10">Loading...</p>;

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="font-display text-2xl mb-6">Calendar</h1>
      <div className="space-y-4">
        {days.map((day) => (
          <Card key={day.day} className="p-5">
            <h2 className="font-medium mb-2">{day.day}</h2>
            {day.stops.map((stop, i) => (
              <div key={i} className="mb-2">
                <p className="text-sm text-ink/60">{stop.cityName}</p>
                <ul className="text-sm">
                  {stop.activities.map((a, j) => <li key={j}>{a.time ?? ""} {a.name}</li>)}
                </ul>
              </div>
            ))}
          </Card>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Wire route, run client test, verify it passes**

Modify `client/src/App.tsx`:
```tsx
import { CalendarPage } from "./features/calendar/CalendarPage";
```
```tsx
<Route path="/trips/:id/calendar" element={<ProtectedRoute><AppShell><CalendarPage /></AppShell></ProtectedRoute>} />
```

Run: `npm run test --workspace client -- CalendarPage`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add server/src/routes/trips.ts server/tests/calendar.test.ts client/src/features/calendar client/src/App.tsx client/tests/CalendarPage.test.tsx
git commit -m "feat: Calendar/Timeline screen with day-grouped activities"
```

---

## Task 20: Public share (share slug + public itinerary view)

**Files:**
- Create: `server/src/routes/share.ts`
- Modify: `server/src/app.ts`
- Create: `client/src/features/share/PublicItineraryPage.tsx`
- Modify: `client/src/App.tsx`
- Test: `server/tests/share.test.ts`

**Interfaces:**
- Consumes: `db`, `Trip` model.
- Produces: `POST /api/trips/:id/share` (returns `{ shareSlug: string }`), `GET /api/share/:slug` (public, no auth) — route `/share/:slug` on the client.

- [ ] **Step 1: Write failing test**

`server/tests/share.test.ts`:
```typescript
import request from "supertest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import app from "../src/app";
import db from "../src/db";

vi.mock("../src/middleware/auth", () => ({
  verifySupabaseJwt: (req: any, _res: any, next: any) => { req.userId = "u1"; next(); },
}));

let tripId: string;

beforeEach(async () => {
  await db.trip.deleteMany();
  const trip = await db.trip.create({ data: { ownerId: "u1", name: "Public Trip", startDate: new Date(), endDate: new Date() } });
  tripId = trip.id;
});

describe("POST /api/trips/:id/share", () => {
  it("generates a share slug and marks the trip public", async () => {
    const res = await request(app).post(`/api/trips/${tripId}/share`);
    expect(res.status).toBe(200);
    expect(res.body.shareSlug).toBeTruthy();
  });
});

describe("GET /api/share/:slug", () => {
  it("returns the trip with no auth required", async () => {
    const shareRes = await request(app).post(`/api/trips/${tripId}/share`);
    const res = await request(app).get(`/api/share/${shareRes.body.shareSlug}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Public Trip");
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npx vitest run tests/share.test.ts`
Expected: FAIL — 404

- [ ] **Step 3: Implement**

`server/src/routes/share.ts`:
```typescript
import { Router } from "express";
import crypto from "crypto";
import db from "../db";
import { verifySupabaseJwt, AuthedRequest } from "../middleware/auth";

const router = Router();

router.post("/trips/:id/share", verifySupabaseJwt, async (req: AuthedRequest, res) => {
  const shareSlug = crypto.randomBytes(6).toString("hex");
  const trip = await db.trip.update({
    where: { id: req.params.id },
    data: { isPublic: true, shareSlug },
  });
  res.json({ shareSlug: trip.shareSlug });
});

router.get("/share/:slug", async (req, res) => {
  const trip = await db.trip.findFirst({
    where: { shareSlug: req.params.slug, isPublic: true },
    include: { stops: { include: { city: true, activities: { include: { activity: true } } }, orderBy: { orderIndex: "asc" } } },
  });
  if (!trip) return res.status(404).json({ error: "not found" });
  await db.tripShare.create({ data: { tripId: trip.id } });
  res.json(trip);
});

export default router;
```

Modify `server/src/app.ts` — add:
```typescript
import shareRouter from "./routes/share";
app.use("/api", shareRouter);
```

- [ ] **Step 4: Run test, verify it passes**

Run: `npx vitest run tests/share.test.ts`
Expected: PASS

- [ ] **Step 5: Client public page**

`client/src/features/share/PublicItineraryPage.tsx`:
```tsx
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../lib/apiClient";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";

interface PublicTrip {
  name: string;
  stops: { id: string; city: { name: string }; activities: { activity: { name: string } }[] }[];
}

export function PublicItineraryPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: trip, isLoading } = useQuery({
    queryKey: ["share", slug],
    queryFn: () => apiFetch<PublicTrip>(`/share/${slug}`),
  });

  if (isLoading || !trip) return <p className="px-6 py-10">Loading...</p>;

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-3xl">{trip.name}</h1>
        <Button variant="secondary">Copy Trip</Button>
      </div>
      <div className="space-y-4">
        {trip.stops.map((stop) => (
          <Card key={stop.id} className="p-5">
            <h2 className="font-display text-lg mb-2">{stop.city.name}</h2>
            <ul className="text-sm">
              {stop.activities.map((sa, i) => <li key={i}>{sa.activity.name}</li>)}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Wire route (NOT wrapped in ProtectedRoute)**

Modify `client/src/App.tsx`:
```tsx
import { PublicItineraryPage } from "./features/share/PublicItineraryPage";
```
```tsx
<Route path="/share/:slug" element={<PublicItineraryPage />} />
```

- [ ] **Step 7: Commit**

```bash
git add server/src/routes/share.ts server/src/app.ts server/tests/share.test.ts client/src/features/share client/src/App.tsx
git commit -m "feat: public share slug generation + read-only public itinerary page"
```

---

## Task 21: Profile/Settings screen

**Files:**
- Create: `server/src/routes/users.ts`
- Modify: `server/src/app.ts`
- Create: `client/src/features/settings/SettingsPage.tsx`
- Modify: `client/src/App.tsx`
- Test: `server/tests/users.test.ts`

**Interfaces:**
- Consumes: `db`, `verifySupabaseJwt`.
- Produces: `PATCH /api/users/me`, `DELETE /api/users/me`; route `/settings`.

- [ ] **Step 1: Write failing test**

`server/tests/users.test.ts`:
```typescript
import request from "supertest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import app from "../src/app";
import db from "../src/db";

vi.mock("../src/middleware/auth", () => ({
  verifySupabaseJwt: (req: any, _res: any, next: any) => { req.userId = "u1"; next(); },
}));

beforeEach(async () => {
  await db.user.deleteMany();
  await db.user.create({ data: { id: "u1", email: "a@test.com", name: "Old Name" } });
});

describe("PATCH /api/users/me", () => {
  it("updates the current user's profile", async () => {
    const res = await request(app).patch("/api/users/me").send({ name: "New Name", languagePref: "fr" });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("New Name");
    expect(res.body.languagePref).toBe("fr");
  });
});

describe("DELETE /api/users/me", () => {
  it("deletes the current user", async () => {
    const res = await request(app).delete("/api/users/me");
    expect(res.status).toBe(204);
    const found = await db.user.findUnique({ where: { id: "u1" } });
    expect(found).toBeNull();
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npx vitest run tests/users.test.ts`
Expected: FAIL — 404

- [ ] **Step 3: Implement**

`server/src/routes/users.ts`:
```typescript
import { Router } from "express";
import { z } from "zod";
import db from "../db";
import { verifySupabaseJwt, AuthedRequest } from "../middleware/auth";

const router = Router();

const patchSchema = z.object({
  name: z.string().optional(),
  avatarUrl: z.string().optional(),
  languagePref: z.string().optional(),
});

router.patch("/me", verifySupabaseJwt, async (req: AuthedRequest, res) => {
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const user = await db.user.update({ where: { id: req.userId }, data: parsed.data });
  res.json(user);
});

router.delete("/me", verifySupabaseJwt, async (req: AuthedRequest, res) => {
  await db.user.delete({ where: { id: req.userId } });
  res.status(204).end();
});

export default router;
```

Modify `server/src/app.ts` — add:
```typescript
import usersRouter from "./routes/users";
app.use("/api/users", usersRouter);
```

- [ ] **Step 4: Run test, verify it passes**

Run: `npx vitest run tests/users.test.ts`
Expected: PASS

- [ ] **Step 5: Client settings page**

`client/src/features/settings/SettingsPage.tsx`:
```tsx
import { FormEvent, useState } from "react";
import { apiFetch } from "../../lib/apiClient";
import { Button } from "../../components/ui/Button";

export function SettingsPage() {
  const [name, setName] = useState("");
  const [languagePref, setLanguagePref] = useState("en");
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await apiFetch("/users/me", { method: "PATCH", body: JSON.stringify({ name, languagePref }) });
    setSaved(true);
  }

  async function handleDelete() {
    await apiFetch("/users/me", { method: "DELETE" });
    window.location.href = "/login";
  }

  return (
    <div className="max-w-xl mx-auto px-6 py-10">
      <h1 className="font-display text-2xl mb-6">Settings</h1>
      <form onSubmit={handleSubmit} className="space-y-4 mb-10">
        <div>
          <label htmlFor="name" className="block text-sm mb-1">Name</label>
          <input id="name" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border border-ink/20 rounded-md" />
        </div>
        <div>
          <label htmlFor="lang" className="block text-sm mb-1">Language</label>
          <select id="lang" value={languagePref} onChange={(e) => setLanguagePref(e.target.value)} className="w-full px-3 py-2 border border-ink/20 rounded-md">
            <option value="en">English</option>
            <option value="fr">French</option>
            <option value="es">Spanish</option>
          </select>
        </div>
        <Button type="submit">Save</Button>
        {saved && <p className="text-forest text-sm">Saved.</p>}
      </form>
      <div className="border-t border-ink/10 pt-6">
        <h2 className="font-medium mb-2 text-terracotta">Danger zone</h2>
        <Button variant="ghost" className="border border-terracotta text-terracotta" onClick={handleDelete}>Delete account</Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Wire route**

Modify `client/src/App.tsx`:
```tsx
import { SettingsPage } from "./features/settings/SettingsPage";
```
```tsx
<Route path="/settings" element={<ProtectedRoute><AppShell><SettingsPage /></AppShell></ProtectedRoute>} />
```

- [ ] **Step 7: Commit**

```bash
git add server/src/routes/users.ts server/src/app.ts server/tests/users.test.ts client/src/features/settings client/src/App.tsx
git commit -m "feat: Profile/Settings screen, update profile and delete account"
```

---

## Task 22: Realtime collaboration on Itinerary Builder + View

**Files:**
- Create: `server/src/routes/collaborators.ts`
- Modify: `server/src/app.ts`
- Create: `client/src/lib/useTripRealtime.ts`
- Modify: `client/src/features/itinerary/ItineraryBuilderPage.tsx`
- Test: `server/tests/collaborators.test.ts`

**Interfaces:**
- Consumes: `db`, `TripCollaborator` model (Task 2), `queryClient` (Task 9).
- Produces: `POST /api/trips/:id/collaborators`, `DELETE /api/trips/:id/collaborators/:userId`; `useTripRealtime(tripId: string)` — subscribes to Supabase Realtime and invalidates the `["trip", tripId]` query key on change.

- [ ] **Step 1: Write failing server test**

`server/tests/collaborators.test.ts`:
```typescript
import request from "supertest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import app from "../src/app";
import db from "../src/db";

vi.mock("../src/middleware/auth", () => ({
  verifySupabaseJwt: (req: any, _res: any, next: any) => { req.userId = "owner1"; next(); },
}));

let tripId: string;

beforeEach(async () => {
  await db.tripCollaborator.deleteMany();
  await db.trip.deleteMany();
  await db.user.deleteMany();
  await db.user.createMany({ data: [{ id: "owner1", email: "o@test.com" }, { id: "guest1", email: "g@test.com" }] });
  const trip = await db.trip.create({ data: { ownerId: "owner1", name: "T", startDate: new Date(), endDate: new Date() } });
  tripId = trip.id;
});

describe("POST /api/trips/:id/collaborators", () => {
  it("adds a collaborator by userId", async () => {
    const res = await request(app).post(`/api/trips/${tripId}/collaborators`).send({ userId: "guest1", role: "editor" });
    expect(res.status).toBe(201);
    expect(res.body.userId).toBe("guest1");
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npx vitest run tests/collaborators.test.ts`
Expected: FAIL — 404

- [ ] **Step 3: Implement server route**

`server/src/routes/collaborators.ts`:
```typescript
import { Router } from "express";
import { z } from "zod";
import db from "../db";
import { verifySupabaseJwt } from "../middleware/auth";

const router = Router();

router.post("/trips/:id/collaborators", verifySupabaseJwt, async (req, res) => {
  const schema = z.object({ userId: z.string(), role: z.enum(["editor", "viewer"]).default("editor") });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const collaborator = await db.tripCollaborator.create({
    data: { tripId: req.params.id, userId: parsed.data.userId, role: parsed.data.role },
  });
  res.status(201).json(collaborator);
});

router.delete("/trips/:id/collaborators/:userId", verifySupabaseJwt, async (req, res) => {
  await db.tripCollaborator.delete({
    where: { tripId_userId: { tripId: req.params.id, userId: req.params.userId } },
  });
  res.status(204).end();
});

export default router;
```

Modify `server/src/app.ts` — add:
```typescript
import collaboratorsRouter from "./routes/collaborators";
app.use("/api", collaboratorsRouter);
```

- [ ] **Step 4: Run test, verify it passes**

Run: `npx vitest run tests/collaborators.test.ts`
Expected: PASS

- [ ] **Step 5: Implement client realtime hook**

`client/src/lib/useTripRealtime.ts`:
```typescript
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "./supabase";

export function useTripRealtime(tripId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel(`trip:${tripId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "Stop", filter: `tripId=eq.${tripId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["trip", tripId] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "StopActivity" }, () => {
        queryClient.invalidateQueries({ queryKey: ["trip", tripId] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, queryClient]);
}
```

- [ ] **Step 6: Wire into Itinerary Builder**

Modify `client/src/features/itinerary/ItineraryBuilderPage.tsx` — add import and call at the top of the component body:
```tsx
import { useTripRealtime } from "../../lib/useTripRealtime";
```
```tsx
export function ItineraryBuilderPage() {
  const { id: tripId } = useParams<{ id: string }>();
  useTripRealtime(tripId!);
  // ...rest unchanged
```

- [ ] **Step 7: Manual verification**

Open the app in two browser sessions logged in as the trip owner and a collaborator, reorder a stop in one session, confirm the other session's itinerary updates without a manual refresh within a few seconds.

- [ ] **Step 8: Commit**

```bash
git add server/src/routes/collaborators.ts server/src/app.ts server/tests/collaborators.test.ts client/src/lib/useTripRealtime.ts client/src/features/itinerary/ItineraryBuilderPage.tsx
git commit -m "feat: trip collaborators endpoint + Supabase Realtime live sync on Itinerary Builder"
```

---

## Task 23: AI trip suggestions

**Files:**
- Create: `server/src/services/aiSuggestService.ts`
- Create: `server/src/routes/aiSuggest.ts`
- Modify: `server/src/app.ts`
- Modify: `client/src/features/itinerary/ItineraryBuilderPage.tsx`
- Test: `server/tests/aiSuggest.test.ts`

**Interfaces:**
- Consumes: `db`, Vercel AI Gateway (`ai` package, `generateText`/`streamText`).
- Produces: `buildSuggestPrompt(trip: { stops: { city: { name: string } }[] }): string`; `POST /api/trips/:id/ai-suggest` returning `{ suggestions: { city: string; reason: string }[] }`.

- [ ] **Step 1: Write failing test**

`server/tests/aiSuggest.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { buildSuggestPrompt } from "../src/services/aiSuggestService";

describe("buildSuggestPrompt", () => {
  it("includes existing city names in the prompt", () => {
    const prompt = buildSuggestPrompt({ stops: [{ city: { name: "Paris" } }, { city: { name: "Rome" } }] });
    expect(prompt).toContain("Paris");
    expect(prompt).toContain("Rome");
    expect(prompt).toContain("suggest");
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npx vitest run tests/aiSuggest.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement**

```bash
cd server
npm install ai
```

`server/src/services/aiSuggestService.ts`:
```typescript
import { generateText } from "ai";

export interface TripContext {
  stops: { city: { name: string } }[];
}

export function buildSuggestPrompt(trip: TripContext): string {
  const cities = trip.stops.map((s) => s.city.name).join(", ") || "no cities yet";
  return `A traveler's itinerary currently includes: ${cities}. Suggest 2-3 additional cities that would fit well as a next stop, each with a one-sentence reason. Respond as JSON: {"suggestions":[{"city":"...","reason":"..."}]}`;
}

export interface Suggestion {
  city: string;
  reason: string;
}

export async function getAiSuggestions(trip: TripContext): Promise<Suggestion[]> {
  const prompt = buildSuggestPrompt(trip);
  const { text } = await generateText({ model: "anthropic/claude-haiku-4-5", prompt });
  try {
    const parsed = JSON.parse(text);
    return parsed.suggestions ?? [];
  } catch {
    return [];
  }
}
```

`server/src/routes/aiSuggest.ts`:
```typescript
import { Router } from "express";
import db from "../db";
import { verifySupabaseJwt } from "../middleware/auth";
import { getAiSuggestions } from "../services/aiSuggestService";

const router = Router();

router.post("/:id/ai-suggest", verifySupabaseJwt, async (req, res) => {
  const trip = await db.trip.findUnique({
    where: { id: req.params.id },
    include: { stops: { include: { city: true } } },
  });
  if (!trip) return res.status(404).json({ error: "not found" });
  try {
    const suggestions = await getAiSuggestions(trip);
    res.json({ suggestions });
  } catch {
    res.status(200).json({ suggestions: [], error: "unavailable" });
  }
});

export default router;
```

Modify `server/src/app.ts` — add:
```typescript
import aiSuggestRouter from "./routes/aiSuggest";
app.use("/api/trips", aiSuggestRouter);
```

- [ ] **Step 4: Run test, verify it passes**

Run: `npx vitest run tests/aiSuggest.test.ts`
Expected: PASS

- [ ] **Step 5: Wire "Suggest next stop" button into Itinerary Builder**

Modify `client/src/features/itinerary/ItineraryBuilderPage.tsx` — add state and a button near "Add Stop":
```tsx
import { useState } from "react";
```
Inside the component, add:
```tsx
const [suggestions, setSuggestions] = useState<{ city: string; reason: string }[]>([]);

async function fetchSuggestions() {
  const res = await apiFetch<{ suggestions: { city: string; reason: string }[] }>(`/trips/${tripId}/ai-suggest`, { method: "POST" });
  setSuggestions(res.suggestions);
}
```
Add `import { apiFetch } from "../../lib/apiClient";` and, in the JSX near the "Add Stop" button:
```tsx
<Button variant="ghost" onClick={fetchSuggestions}>Suggest next stop</Button>
{suggestions.length > 0 && (
  <div className="mt-4 space-y-2">
    {suggestions.map((s, i) => (
      <Card key={i} className="p-4">
        <p className="font-medium">{s.city}</p>
        <p className="text-sm text-ink/60">{s.reason}</p>
      </Card>
    ))}
  </div>
)}
```

- [ ] **Step 6: Commit**

```bash
git add server/src/services/aiSuggestService.ts server/src/routes/aiSuggest.ts server/src/app.ts server/tests/aiSuggest.test.ts client/src/features/itinerary/ItineraryBuilderPage.tsx
git commit -m "feat: AI trip suggestions via Vercel AI Gateway"
```

---

## Task 24: Admin/Analytics screen

**Files:**
- Create: `server/src/middleware/requireAdmin.ts`
- Create: `server/src/routes/admin.ts`
- Modify: `server/src/app.ts`
- Create: `client/src/features/admin/AdminPage.tsx`
- Modify: `client/src/App.tsx`
- Test: `server/tests/admin.test.ts`

**Interfaces:**
- Consumes: `db`, `verifySupabaseJwt`.
- Produces: `GET /api/admin/stats` returning `{ totalUsers: number; totalTrips: number; topCities: { name: string; popularityScore: number }[] }`; route `/admin`.

- [ ] **Step 1: Write failing test**

`server/tests/admin.test.ts`:
```typescript
import request from "supertest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import app from "../src/app";
import db from "../src/db";

vi.mock("../src/middleware/auth", () => ({
  verifySupabaseJwt: (req: any, _res: any, next: any) => { req.userId = "admin1"; next(); },
}));

beforeEach(async () => {
  await db.trip.deleteMany();
  await db.city.deleteMany();
  await db.user.deleteMany();
  await db.user.create({ data: { id: "admin1", email: "admin@test.com", role: "admin" } });
  await db.city.create({ data: { name: "Bali", country: "Indonesia", popularityScore: 99 } });
});

describe("GET /api/admin/stats", () => {
  it("returns platform stats for an admin user", async () => {
    const res = await request(app).get("/api/admin/stats");
    expect(res.status).toBe(200);
    expect(res.body.totalUsers).toBe(1);
    expect(res.body.topCities[0].name).toBe("Bali");
  });

  it("rejects a non-admin user", async () => {
    await db.user.update({ where: { id: "admin1" }, data: { role: "user" } });
    const res = await request(app).get("/api/admin/stats");
    expect(res.status).toBe(403);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npx vitest run tests/admin.test.ts`
Expected: FAIL — 404

- [ ] **Step 3: Implement**

`server/src/middleware/requireAdmin.ts`:
```typescript
import { Response, NextFunction } from "express";
import db from "../db";
import { AuthedRequest } from "./auth";

export async function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  const user = await db.user.findUnique({ where: { id: req.userId } });
  if (user?.role !== "admin") return res.status(403).json({ error: "admin only" });
  next();
}
```

`server/src/routes/admin.ts`:
```typescript
import { Router } from "express";
import db from "../db";
import { verifySupabaseJwt } from "../middleware/auth";
import { requireAdmin } from "../middleware/requireAdmin";

const router = Router();

router.get("/stats", verifySupabaseJwt, requireAdmin, async (_req, res) => {
  const [totalUsers, totalTrips, topCities] = await Promise.all([
    db.user.count(),
    db.trip.count(),
    db.city.findMany({ orderBy: { popularityScore: "desc" }, take: 10, select: { name: true, popularityScore: true } }),
  ]);
  res.json({ totalUsers, totalTrips, topCities });
});

export default router;
```

Modify `server/src/app.ts` — add:
```typescript
import adminRouter from "./routes/admin";
app.use("/api/admin", adminRouter);
```

- [ ] **Step 4: Run test, verify it passes**

Run: `npx vitest run tests/admin.test.ts`
Expected: PASS

- [ ] **Step 5: Client admin page**

`client/src/features/admin/AdminPage.tsx`:
```tsx
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { apiFetch } from "../../lib/apiClient";
import { Card } from "../../components/ui/Card";

interface AdminStats {
  totalUsers: number;
  totalTrips: number;
  topCities: { name: string; popularityScore: number }[];
}

export function AdminPage() {
  const { data, isLoading } = useQuery({ queryKey: ["admin-stats"], queryFn: () => apiFetch<AdminStats>("/admin/stats") });

  if (isLoading || !data) return <p className="px-6 py-10">Loading...</p>;

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <h1 className="font-display text-2xl mb-6">Admin</h1>
      <div className="grid grid-cols-2 gap-6 mb-6">
        <Card className="p-6"><p className="text-sm text-ink/60">Total users</p><p className="font-display text-3xl">{data.totalUsers}</p></Card>
        <Card className="p-6"><p className="text-sm text-ink/60">Total trips</p><p className="font-display text-3xl">{data.totalTrips}</p></Card>
      </div>
      <Card className="p-6" style={{ height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.topCities}>
            <XAxis dataKey="name" />
            <YAxis />
            <Bar dataKey="popularityScore" fill="#C1543A" />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
```

- [ ] **Step 6: Wire route**

Modify `client/src/App.tsx`:
```tsx
import { AdminPage } from "./features/admin/AdminPage";
```
```tsx
<Route path="/admin" element={<ProtectedRoute><AppShell><AdminPage /></AppShell></ProtectedRoute>} />
```

- [ ] **Step 7: Commit**

```bash
git add server/src/middleware/requireAdmin.ts server/src/routes/admin.ts server/src/app.ts server/tests/admin.test.ts client/src/features/admin client/src/App.tsx
git commit -m "feat: Admin/Analytics screen, role-gated stats endpoint"
```

---

## Task 25: Vercel deployment

**Files:**
- Modify: `E:/GlobeTrotter/vercel.ts`
- Create: `E:/GlobeTrotter/README.md` (env var list + deploy steps)

**Interfaces:**
- Consumes: all prior tasks' env vars (`DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, AI Gateway credentials).

- [ ] **Step 1: Confirm vercel.ts rewrites and build command**

Verify `E:/GlobeTrotter/vercel.ts` (from Task 3) still matches:
```typescript
import type { VercelConfig } from "@vercel/config/v1";

export const config: VercelConfig = {
  buildCommand: "npm run build --workspace client",
  outputDirectory: "client/dist",
  rewrites: [{ source: "/api/(.*)", destination: "/api" }],
};
```

- [ ] **Step 2: Add `@vercel/node` build for the server function**

```bash
cd E:/GlobeTrotter
npm install -D vercel @vercel/node --workspace server
```

- [ ] **Step 3: Set environment variables**

```bash
vercel env add DATABASE_URL
vercel env add SUPABASE_URL
vercel env add SUPABASE_SERVICE_KEY
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
```

- [ ] **Step 4: Deploy a preview and smoke test**

```bash
vercel
```
Expected: preview URL printed. Open it, confirm `/login` renders, sign up a test user, create a trip, confirm it appears on `/`.

- [ ] **Step 5: Write README with env var list and deploy steps**

`E:/GlobeTrotter/README.md`:
```markdown
# GlobeTrotter

Multi-city travel planner. See `docs/superpowers/specs/2026-08-22-globetrotter-design.md` for the full design.

## Local dev

```bash
npm install
npm run dev:server   # http://localhost:3001
npm run dev:client   # http://localhost:5173
```

## Environment variables

- `DATABASE_URL` — Supabase Postgres connection string (server)
- `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` — server-side Supabase Auth verification
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — client-side Supabase Auth

## Deploy

```bash
vercel        # preview
vercel --prod # production, once judged-ready
```
```

- [ ] **Step 6: Commit**

```bash
git add vercel.ts README.md server/package.json package.json
git commit -m "chore: Vercel deployment config and README"
```

- [ ] **Step 7: Promote to production once verified**

```bash
vercel --prod
```
Confirm the production URL loads and the full click-through (Task 22's manual step, repeated on the production URL) passes before submitting to judges.

---

## Self-Review Notes

- **Spec coverage:** All 13 screens covered (Tasks 10, 12, 13x2, 14, 15, 16, 17, 18, 19, 20, 21, 24), Realtime (Task 22), AI (Task 23), Admin (Task 24), deploy (Task 25). Data model, API surface, design tokens, motion rules, error-handling defaults (zod validation, graceful AI failure) all implemented per spec section.
- **Type consistency checked:** `Trip`, `TripDetail`, `City`, `Activity`, `BudgetBreakdown` interfaces are defined once (Tasks 11, 15, 14, 16, 18) and reused verbatim by every later task that touches them.
- **MVP cut line preserved:** Tasks 1-18 alone produce a fully working demo (Auth -> Create Trip -> Itinerary Builder -> Itinerary View -> Budget) if time runs out before Task 19+.
