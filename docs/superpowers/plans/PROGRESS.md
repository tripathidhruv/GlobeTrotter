# GlobeTrotter Build Progress

Plan: `docs/superpowers/plans/2026-08-22-globetrotter-implementation.md`
Spec: `docs/superpowers/specs/2026-08-22-globetrotter-design.md`

Update this file's checkbox + "Last completed" line after EVERY task finishes (commit lands). If switching Claude accounts/sessions mid-build: open this file first, tell the new session "resume GlobeTrotter build, see docs/superpowers/plans/PROGRESS.md", it picks up at "Next task".

**Last completed:** Task 1 — Monorepo scaffold (commits a414d28..3e62230)
**Next task:** Task 2 — Prisma schema + seed data

## Tasks

- [x] 1. Monorepo scaffold
- [ ] 2. Prisma schema + seed data
- [ ] 3. Express app skeleton + Vercel serverless entry
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
