# GlobeTrotter Build Progress

Plan: `docs/superpowers/plans/2026-08-22-globetrotter-implementation.md`
Spec: `docs/superpowers/specs/2026-08-22-globetrotter-design.md`

Update this file's checkbox + "Last completed" line after EVERY task finishes (commit lands). If switching Claude accounts/sessions mid-build: open this file first, tell the new session "resume GlobeTrotter build, see docs/superpowers/plans/PROGRESS.md", it picks up at "Next task".

**Last completed:** Task 10 — Auth screens (Login/Signup) (commits 7001bc5, d317b46, d06bb00)
**Next task:** Task 11 — API client + trips query hooks

## Tasks

- [x] 1. Monorepo scaffold
- [x] 2. Prisma schema + seed data
- [x] 3. Express app skeleton + Vercel serverless entry
- [x] 4. Auth middleware + trips list/create endpoints
- [x] 5. Trip detail/update/delete + Stop CRUD endpoints
- [x] 6. Cities + Activities search endpoints
- [x] 7. StopActivity attach/detach + budget service + budget endpoint
- [x] 8. Design tokens, fonts, Lenis, base UI primitives
- [x] 9. App shell — router, protected routes, page transitions
- [x] 10. Auth screens (Login/Signup)
- [ ] 11. API client + trips query hooks
- [ ] 12. Dashboard screen
- [ ] 13. Create Trip + My Trips screens
- [ ] 14. City Search screen
- [ ] 15. Itinerary Builder screen (drag-reorder)
- [ ] 16. Activity Search + attach-to-stop
- [ ] 17. Itinerary View screen
- [ ] 18. Budget screen — **MVP cut line ends here**
- [ ] 19. Calendar/Timeline screen
- [ ] 20. Public share (share slug + public itinerary view)
- [ ] 21. Profile/Settings screen
- [ ] 22. Realtime collaboration on Itinerary Builder + View
- [ ] 23. AI trip suggestions
- [ ] 24. Admin/Analytics screen
- [ ] 25. Vercel deployment

## Notes / deviations from plan

- Task 1: Prisma CLI's `prisma init` auto-vendors `.agents/.claude/.windsurf` skill-doc dirs + `skills-lock.json` into `server/` — these got committed once, then removed + gitignored. If future `prisma` commands re-add them, `git status` should show them as ignored, not untracked.
- Task 1: bumped `@prisma/client` to `^7.9.1` to match the `prisma` CLI devDependency (both must stay same-major going forward).
- Root `npm test` script will fail on the client workspace until Task 8/9 area adds a `test` script to `client/package.json` (vitest is installed but no script wired yet) — known gap, not yet in scope.
- DB connection: this network can't reach Supabase's direct DB host (IPv6-only, no route here). `server/.env` `DATABASE_URL` uses the **session-mode pooler** (`aws-0-ap-northeast-1.pooler.supabase.com:5432`), not the direct host — works fine at this scale, no `DIRECT_URL` split needed.
- **Task 3 (db.ts) must know:** Prisma v7's generated client requires a driver adapter for Postgres — `db.ts` needs `new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) })` using `@prisma/adapter-pg` (already installed in `server/package.json`), NOT a bare `new PrismaClient()`.
- Seed script (`server/prisma/seed.ts`) is not idempotent — re-running `prisma db seed` duplicates Paris/Tokyo rows. Fine for now; fix with an upsert if seeding runs more than once.
- `server/package.json`'s `"prisma": { "seed": ... }` block is dead — Prisma v7 actually reads the seed command from `server/prisma.config.ts`'s `migrations.seed` field instead.
- `server/src/db.ts` uses the Prisma v7 driver-adapter pattern (`@prisma/adapter-pg`, `PrismaClient({ adapter })`), NOT a bare `new PrismaClient()` — every later task's routes import `db` from here as-is, no changes needed downstream.
- Root `vercel.ts` imports a type from `@vercel/config/v1`, a package not yet installed anywhere. Currently inert (nothing type-checks that file). Task 25 (Vercel deployment) must either install `@vercel/config` or confirm Vercel's build step tolerates it.
- **All new `server/src/**` files need `.js` extensions on relative imports** (e.g. `from "../db.js"`, not `from "../db"`) and `import type { ... }` for type-only imports (Request/Response/NextFunction, etc.) — required by `moduleResolution: nodenext` + `verbatimModuleSyntax: true`. `server/src/db.ts` (Task 3) already does this correctly; Task 4 initially didn't, which broke the build (`tsc` produced zero output) — now fixed for all existing files, but every future route/middleware file must follow this pattern from the start.
- `server/tsconfig.json` now has `outDir: "./dist"` enabled (was commented out) and `.gitignore` covers `/dist`.
- `npm run dev --workspace server` now uses `tsx watch src/index.ts` (not `ts-node-dev`, which is CJS-only and incompatible with this project's `"type": "module"`).
- `server/src/index.ts` loads `dotenv/config` at the top so `SUPABASE_URL`/`SUPABASE_SERVICE_KEY`/`DATABASE_URL` are populated at runtime, not just in tests (`server/vitest.setup.ts` handles the test-time equivalent, added in this task).
- **Plan gap found + fixed (user-approved) in Task 5:** the plan's brief for trip/stop mutation routes had no ownership check — any authenticated user could edit/delete any trip/stop by ID. Fixed: trip metadata PATCH/DELETE is now owner-only; stop PATCH/DELETE and `POST /trips/:id/stops` are owner-or-collaborator; unauthorized GET on a trip returns 403; trip PATCH body uses a `.strict()` zod schema (rejects `ownerId`/`isPublic`/`shareSlug`/`id` in the payload with 400 instead of silently stripping them).
- **Known follow-up for Task 22 (collaborator roles):** `TripCollaborator.role` (`editor`/`viewer`) exists in the schema but is NOT yet enforced anywhere — any collaborator (even role `viewer`) can currently PATCH/DELETE/create stops. Task 22 should add the role check when it builds out collaborator management, or a dedicated fix should land before demo if viewer-only collaborators are actually used.
- `server/vitest.config.ts` has `fileParallelism: false` (tests run against a real shared Supabase DB with fixed fixture IDs, not an isolated per-test DB) — a stopgap, will need revisiting if the test suite grows much larger (per-test unique IDs or a sandboxed schema would scale better).
- **Authorization pattern is now established project-wide**: any new route touching trip-scoped data (stops, activities, budget, expenses, calendar, share, collaborators) must add an owner-or-collaborator check, not just `verifySupabaseJwt`. Look at `authorizeStop()` in `server/src/routes/stops.ts` or `server/src/routes/stopActivities.ts` for the pattern (fetch entity -> walk relation chain to `trip.ownerId`/`trip.collaborators` -> 404 if missing, 403 if unauthorized). The plan's briefs from here on (Tasks 19-24 especially) likely still show the literal no-auth-check version from before this pattern existed — apply the same fix proactively rather than waiting for a review to catch it, as we did in Task 7.
- Server-side (backend) work is now feature-complete through the MVP's data layer. **Task 8 onward is frontend/UI work** — this is the natural point to hand off to a different model for frontend polish, per the user's plan.

## Visual direction change (decided at Task 8, user-approved)

The originally-approved "warm editorial" look (cream `#FBF7F0` + Fraunces serif + terracotta `#C1543A`) was **dropped before any UI was built**. Reason: that exact combination is the single most common AI-generated design default right now, so it risked colliding with other AI-assisted hackathon entries — undercutting the "best UI in the hackathon" goal. It's also a travel-*brochure* language, while GlobeTrotter is a data-dense *planner*.

**Current direction: transit systems** — departure boards, metro maps, rail timetables. Grounded in what a multi-city itinerary actually is: an ordered route.

| Token | Hex | Role |
|---|---|---|
| `ink` | `#0E1116` | dark board surface + primary text |
| `board` | `#2A3138` | secondary board surface |
| `platform` | `#EFF1F3` | page base (cool enamel grey, not cream) |
| `rail` | `#D3D8DD` | hairline rules / track lines |
| `mute` | `#6B747C` | secondary text |
| `signal` | `#FFB000` | primary accent (departure-board amber) |
| `transit` | `#1B4DFF` | secondary accent, links |

Type: **Barlow Condensed** (display, uppercase, `tracking-board` 0.08em) · **Inter** (body) · **JetBrains Mono** (all times/costs/durations/stop numbers).

Signature element: **`RouteLine`** (`client/src/components/ui/RouteLine.tsx`) — vertical track with stop nodes, amber line drawn via scroll-driven `scaleY`, nodes igniting on viewport entry. Tasks 12, 15, 17, 19 must consume this, not reinvent it. API: `RouteLine({ stops: RouteStop[], compact?: boolean })` where `RouteStop = { id, label, meta? }`.

**Tasks 9-24 in the plan still contain the OLD cream/terracotta class names in their literal JSX** — the plan's Global Constraints section has a mapping table (`bg-cream`→`bg-platform`, `text-ink/60`→`text-mute`, `border-ink/10`→`border-rail`, `bg-terracotta`→`bg-signal`, `rounded-lg/xl`+`shadow-sm`→`rounded-sm`+`border border-rail`, serif→`font-display uppercase tracking-board`, and Recharts palette → `["#FFB000","#1B4DFF","#0E1116","#6B747C","#2A3138"]`). Apply it every task; no old class name should survive.

- **Tailwind is v4.3.3 and is now configured v4-natively** — `client/src/styles/globals.css` uses `@import "tailwindcss";` plus a `@theme { --color-ink: …; --font-display: …; --tracking-board: …; --radius-sm: … }` block. **There is no `tailwind.config.ts` any more — it was deleted.** Add new design tokens to the `@theme` block in `globals.css`, never to a JS config.
  - Why this matters: the original v3-style setup (`@config` + `@tailwind base/components/utilities`) silently dropped Tailwind's *entire default theme*. `px-4`, `text-sm`, `max-w-sm`, `sm:`/`md:` — none of them emitted any CSS. Tasks 8-10 were all rendering with zero padding/margins/gaps/font-sizes in production before this was caught in Task 10's review.
  - **Verification method to reuse:** don't trust "it looked right in the dev server." Run `npx vite build` in `client/`, then grep `client/dist/assets/*.css` for the utility classes you expect. If a class produces no rule, it silently doesn't exist.
- Client code does NOT use `.js` import extensions (that's server-only).
- `client/` now has a real test runner: `test` script + `vitest.config.ts` + `vitest.setup.ts` (with IntersectionObserver/ResizeObserver stubs, needed because jsdom lacks them and framer-motion's `whileInView`/`useScroll` require them).
