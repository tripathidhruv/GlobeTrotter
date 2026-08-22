# GlobeTrotter Build Progress

Plan: `docs/superpowers/plans/2026-08-22-globetrotter-implementation.md`
Spec: `docs/superpowers/specs/2026-08-22-globetrotter-design.md`

Update this file's checkbox + "Last completed" line after EVERY task finishes (commit lands). If switching Claude accounts/sessions mid-build: open this file first, tell the new session "resume GlobeTrotter build, see docs/superpowers/plans/PROGRESS.md", it picks up at "Next task".

**Last completed:** Task 3 — Express app skeleton + Vercel serverless entry (commit 6a7c872)
**Next task:** Task 4 — Auth middleware + trips list/create endpoints

## Tasks

- [x] 1. Monorepo scaffold
- [x] 2. Prisma schema + seed data
- [x] 3. Express app skeleton + Vercel serverless entry
- [ ] 4. Auth middleware + trips list/create endpoints
- [ ] 5. Trip detail/update/delete + Stop CRUD endpoints
- [ ] 6. Cities + Activities search endpoints
- [ ] 7. StopActivity attach/detach + budget service + budget endpoint
- [ ] 8. Design tokens, fonts, Lenis, base UI primitives
- [ ] 9. App shell — router, protected routes, page transitions
- [ ] 10. Auth screens (Login/Signup)
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
