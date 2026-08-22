# GlobeTrotter — Design Spec

Odoo x LDCE Ahmedabad Hackathon '26. Virtual round, ~4 days available. Goal: best UI in the hackathon + full functional coverage of the brief.

## 1. Vision & Priority Order

1. UI/UX quality — must read as more polished, more original, more "designed" than a typical hackathon dashboard.
2. Full feature coverage of the 13 screens in the brief, including the optional Admin/Analytics screen.
3. Two differentiators beyond the brief: live collaborative trip editing, AI trip-suggestion assist.

Visual direction is fully custom (not copied from any reference mockup): **transit-systems aesthetic** — the visual language of departure boards, metro maps, and rail timetables, grounded in what a multi-city itinerary actually is (an ordered route through places and time).

Rationale for this direction over the originally-considered warm-editorial look: cream base + serif display + terracotta accent is currently the single most common AI-generated design look, so it risks colliding with other AI-assisted hackathon entries — directly undercutting the "best UI in the hackathon" goal. It is also a travel-*brochure* language, whereas GlobeTrotter is a data-dense *planner* (dates, costs, durations, day-by-day breakdowns); a utility/mono-led treatment serves that content instead of fighting it.

## 2. Stack

| Layer | Choice |
|---|---|
| Frontend | React 18 + Vite + TypeScript |
| Styling | Tailwind CSS + shadcn/ui (restyled to custom tokens) |
| Motion (scroll) | Lenis — smooth scroll on long/marketing pages |
| Motion (transitions/gestures) | Framer Motion — page transitions, card hover/reveal, drag-to-reorder |
| Interactive primitives | Animate UI — dialogs, tabs, dropdowns, toggles, popovers (in place of hand-rolled shadcn defaults, where a matching component exists) |
| Routing | React Router v6 |
| Data/cache | TanStack Query |
| Charts | Recharts |
| Backend | Node.js + Express + TypeScript |
| ORM | Prisma |
| DB | Postgres via Supabase |
| Auth | Supabase Auth (email/password + magic link) |
| Realtime | Supabase Realtime (per-trip channel) |
| AI | Vercel AI Gateway, plain `"provider/model"` string (e.g. `anthropic/claude-haiku-4-5`), no direct provider SDK |
| Deploy | Vercel — single project, client + Express-as-serverless-function |

No new animation/scroll library beyond Lenis/Framer Motion/Animate UI. No GSAP, AOS, react-scroll.

## 3. Repo Layout

```
globetrotter/
├── client/          React + Vite + Tailwind
│   └── src/
│       ├── components/   shared UI (design system primitives)
│       ├── features/     one folder per screen/domain (trips, itinerary, budget, admin, auth)
│       ├── lib/           api client, query hooks, supabase client
│       └── styles/        tokens, globals
├── server/          Express + TypeScript + Prisma
│   ├── src/
│   │   ├── routes/
│   │   ├── services/      budget calc, ai-suggest, realtime broadcast helpers
│   │   └── prisma/schema.prisma
│   └── api/index.ts       serverless entry wrapping the Express app for Vercel
├── vercel.ts        rewrites /api/* -> server function, build config
└── docs/
```

## 4. Data Model (ERD)

```
User (mirrors Supabase auth.users)
 └─ id, email, name, avatar_url, role (user|admin), language_pref, created_at

Trip
 └─ id, owner_id -> User, name, description, cover_photo_url,
    start_date, end_date, is_public, share_slug, created_at, updated_at

TripCollaborator  (live collaboration)
 └─ id, trip_id -> Trip, user_id -> User, role (editor|viewer), invited_at

Stop  (a city leg within a trip)
 └─ id, trip_id -> Trip, city_id -> City, order_index,
    arrival_date, departure_date

City  (reference/search catalog, seeded)
 └─ id, name, country, region, cost_index, popularity_score, image_url

Activity  (reference/search catalog, seeded + user-addable)
 └─ id, city_id -> City, name, category, description, image_url,
    est_cost, est_duration_minutes

StopActivity  (join: which activities on which stop, when)
 └─ id, stop_id -> Stop, activity_id -> Activity,
    scheduled_date, scheduled_time, cost_override

Expense  (finer-grained cost tracking beyond activity cost)
 └─ id, trip_id -> Trip, category (transport|stay|activity|meal|other),
    amount, note, expense_date

TripShare  (public view analytics, optional)
 └─ id, trip_id -> Trip, viewed_at, viewer_ip_hash
```

Budget screen = `SUM(Activity.est_cost + Expense.amount)` grouped by category/day, computed server-side in `GET /api/trips/:id/budget`.

## 5. API Surface

```
POST   /api/auth/signup            (or delegate to Supabase client SDK directly)
POST   /api/auth/login

GET    /api/trips                  list current user's trips (owned + collaborating)
POST   /api/trips
GET    /api/trips/:id              trip + stops + activities + collaborators (nested)
PATCH  /api/trips/:id
DELETE /api/trips/:id

POST   /api/trips/:id/collaborators    invite by email
DELETE /api/trips/:id/collaborators/:userId

POST   /api/trips/:id/stops
PATCH  /api/stops/:id              reorder / edit dates
DELETE /api/stops/:id

POST   /api/stops/:id/activities
DELETE /api/stop-activities/:id

GET    /api/cities?search=&region=
GET    /api/activities?city_id=&type=&cost_max=

GET    /api/trips/:id/budget       cost breakdown by category, by day
GET    /api/trips/:id/calendar     day-wise itinerary

POST   /api/trips/:id/ai-suggest   streamed AI suggestion (next city/activity), given trip context

GET    /api/share/:slug            public read-only itinerary (no auth)
POST   /api/trips/:id/share        toggle public + generate share slug

GET    /api/admin/stats            admin-only: users, trips, top cities/activities, signups over time
```

Realtime: client subscribes to a Supabase Realtime channel `trip:{id}` on Stop/StopActivity table changes; TanStack Query cache is patched from the channel payload rather than refetching.

## 6. Screen → Route Map

| # | Screen | Route | Notes |
|---|---|---|---|
| 1 | Login/Signup | `/login`, `/signup` | Supabase Auth, magic link + password |
| 2 | Dashboard | `/` | trip cards, recommended cities, budget highlight |
| 3 | Create Trip | `/trips/new` | name, dates, description, cover upload |
| 4 | My Trips | `/trips` | grid, edit/view/delete |
| 5 | Itinerary Builder | `/trips/:id/build` | drag-reorder stops, add activities, live collab, AI suggest |
| 6 | Itinerary View | `/trips/:id` | day-timeline / city-grouped toggle |
| 7 | City Search | `/trips/:id/cities` | search + filter, add to trip |
| 8 | Activity Search | `/trips/:id/activities?stop=` | filters, add/remove |
| 9 | Budget & Cost Breakdown | `/trips/:id/budget` | pie/bar charts, over-budget alerts |
| 10 | Calendar/Timeline | `/trips/:id/calendar` | drag-to-reorder day view |
| 11 | Shared/Public Itinerary | `/share/:slug` | no auth, copy-trip button |
| 12 | Profile/Settings | `/settings` | profile, language pref, delete account |
| 13 | Admin/Analytics | `/admin` | role-gated, platform stats |

## 7. Design System Detail

- **Color tokens** (Tailwind theme extension + CSS variables):

  | Token | Hex | Role |
  |---|---|---|
  | `ink` | `#0E1116` | dark "board" surface + primary text |
  | `board` | `#2A3138` | secondary / muted board surface |
  | `platform` | `#EFF1F3` | page base — cool enamel grey (deliberately not a cream) |
  | `rail` | `#D3D8DD` | hairline rules, borders, "track" lines |
  | `mute` | `#6B747C` | secondary/muted text |
  | `signal` | `#FFB000` | primary accent — departure-board amber |
  | `transit` | `#1B4DFF` | secondary accent, links, secondary route lines |

  Token names deliberately avoid `slate` and `amber`, which would shadow Tailwind's built-in color scales and break any `slate-500`/`amber-400` usage.

  Light-first (no dark-mode toggle required by the brief), but with **dark `ink` bands used as a deliberate contrast device** for hero sections and day headers, against light `platform` reading surfaces. The signal color is departure-board amber rather than vermilion, chosen to stay clear of the near-black + bright-vermilion AI-default look as well.

- **Type** (Google Fonts):
  - Display: **Barlow Condensed**, 600/700, uppercase, tight tracking — transit/signage gothic. Chosen over Bebas Neue and Oswald as the less-overused option in the same register.
  - Body/UI: **Inter**, 400/500/600.
  - Data: **JetBrains Mono** — all times, costs, dates, durations, and stop numbers. The app is mostly this kind of data, so the mono treatment is where the design's personality actually lands, not a decorative afterthought.

- **Structure**: horizontal hairline `rail` rules as timetable rows for dense data (Budget, Calendar, Activity lists) — rows, not cards. Cards reserved for places where a trip is an object to pick (Dashboard, My Trips). Numbered stop markers (`01` / `02` / `03`) are used because a multi-city itinerary genuinely is an ordered sequence — the order carries information the reader needs.

- **Signature element**: the **route line** — an SVG line with stop nodes, drawn via `stroke-dashoffset` tied to scroll progress, with nodes igniting amber as they enter the viewport. Reused as one coherent system across Dashboard (compact per-trip variant), Itinerary Builder (the drag-reorder list *is* the line), Itinerary View, and Calendar. Built once as a shared primitive (`RouteLine`) rather than reinvented per screen.

- **Motion rules**: Lenis wired globally for smooth scroll. Framer Motion for route transitions (`AnimatePresence`, fade + slight y-offset), the route-line draw, node activation, and drag-to-reorder. Scroll-driven motion is confined to the route line and to Dashboard/Itinerary View section reveals — never on forms, tables, or the Budget screen, where users need to scan numbers without motion interference. `prefers-reduced-motion` is respected: the route line renders fully drawn, reveals resolve to their end state.

- **Component reuse rule**: before hand-building an interactive primitive, check Animate UI; before hand-building a scroll effect, check Lenis/Framer patterns already in the codebase; before building anything route-shaped, use the shared `RouteLine` primitive.

## 8. Realtime Collaboration — Scope

- Applies to: Itinerary Builder (`/trips/:id/build`) and Itinerary View (`/trips/:id`) only.
- Mechanism: Supabase Realtime Postgres-changes subscription on `Stop` and `StopActivity` rows filtered by `trip_id`.
- UX: toast notification ("Alex reordered your stops") + live-patched UI, no full refetch.
- Out of scope for v1: cursor presence, conflict resolution beyond last-write-wins.

## 9. AI Trip Suggestions — Scope

- One entry point: "Suggest next stop" button in Itinerary Builder.
- Server builds a prompt from trip context (existing cities, dates, remaining budget) and calls Vercel AI Gateway, streaming 2-3 suggested cities with a one-line reason each.
- User can accept a suggestion to auto-create a Stop.
- Out of scope for v1: full itinerary auto-generation, chat interface.

## 10. Admin/Analytics — Scope

- Gated by `User.role === 'admin'`; no self-serve way to become admin from the UI (seeded/manually set).
- Shows: total users, total trips, top 10 cities/activities by popularity, signups-over-time line chart.

## 11. Error Handling

- Form validation client-side (zod) + server-side re-validation on all mutating endpoints.
- Auth errors (expired session, unauthorized) redirect to `/login` with a toast.
- Realtime disconnects fall back silently to normal query refetch-on-focus; no user-facing error for a dropped realtime channel.
- AI Gateway failures degrade gracefully: "Suggestions unavailable right now" — never blocks manually adding a stop.

## 12. Testing

- Unit: budget calculation service, AI-suggest prompt builder (pure functions).
- API: integration tests against a test Postgres schema for trip/stop/activity CRUD and the budget endpoint.
- Frontend: component tests for ItineraryBuilder drag-reorder and Budget chart rendering.
- Manual: full click-through of all 13 screens + realtime collab with two browser sessions before demo.

## 13. Deployment

- Single Vercel project. `vercel.ts` config: build client via Vite, rewrite `/api/*` to `api/index.ts` (Express app wrapped for serverless).
- Env vars: Supabase URL/anon key/service key, DATABASE_URL (Prisma), AI Gateway credentials — managed via `vercel env`.
- Preview deployments per branch for iterative judging links; promote to production before final submission.

## 14. MVP Cut Line (if time runs short)

1. Auth → 2. Create Trip → 3. Itinerary Builder (add stop + city) → 4. Itinerary View → 5. Budget.
Cut first: Admin dashboard, then AI suggestions, then live collaboration, then Public Share, then Activity filters (keep a basic list).
