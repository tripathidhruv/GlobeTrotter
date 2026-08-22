import { useRef, useState } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { Link } from "react-router-dom";
import { useTrips, type Trip } from "../trips/useTrips";
import { useCities, type City } from "../cities/useCities";
import { useTripBudget } from "../budget/useTripBudget";
import { Button } from "../../components/ui/Button";
import { VideoBackdrop } from "../../components/ui/VideoBackdrop";
import { Ticker } from "../../components/ui/Ticker";
import { SceneryBand } from "../../components/ui/SceneryBand";
import { CityDialog } from "../../components/ui/CityDialog";
import { FeatureReel, type ReelItem } from "../../components/ui/FeatureReel";

const HERO_CLIPS = [
  { src: "/video/paris.mp4", label: "Paris" },
  { src: "/video/tokyo.mp4", label: "Tokyo" },
  { src: "/video/rome.mp4", label: "Rome" },
  { src: "/video/barcelona.mp4", label: "Barcelona" },
];

function formatDate(iso: string) {
  return iso.slice(0, 10);
}

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function nights(start: string, end: string) {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(0, Math.round(ms / 86_400_000));
}

/** The trip whose start date is soonest in the future, falling back to the most recent past trip. */
function findNearestUpcomingTrip(trips: Trip[] | undefined): Trip | undefined {
  if (!trips || trips.length === 0) return undefined;
  const now = Date.now();
  const upcoming = trips
    .filter((t) => new Date(t.startDate).getTime() >= now)
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  if (upcoming[0]) return upcoming[0];
  return [...trips].sort(
    (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
  )[0];
}


/* -------------------------------------------------------------------------- */

function TripRowContent({ trip, index }: { trip: Trip; index: number }) {
  const stops = trip._count?.stops ?? 0;
  return (
    <Link
      to={`/trips/${trip.id}/build`}
      className="group grid grid-cols-[auto_1fr_auto] items-center gap-x-5 gap-y-1 border-b border-rail py-5 transition-colors hover:border-ink sm:gap-x-8"
    >
      <span className="font-mono text-sm text-signal">{String(index + 1).padStart(2, "0")}</span>

      <span className="min-w-0">
        <span className="block truncate font-display text-2xl uppercase tracking-board transition-colors group-hover:text-transit sm:text-3xl">
          {trip.name}
        </span>
        <span className="mt-1 block font-mono text-xs text-mute">
          {formatDate(trip.startDate)} — {formatDate(trip.endDate)} · {nights(trip.startDate, trip.endDate)}N
          {stops > 0 ? ` · ${stops} ${stops === 1 ? "STOP" : "STOPS"}` : ""}
        </span>
      </span>

      <span className="hidden font-mono text-xs uppercase text-mute transition-colors group-hover:text-ink sm:inline">
        On time →
      </span>
    </Link>
  );
}

function TripRow({ trip, index, reduce }: { trip: Trip; index: number; reduce: boolean }) {
  if (reduce) return <TripRowContent trip={trip} index={index} />;
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10% 0px" }}
      transition={{ delay: index * 0.06, duration: 0.4 }}
    >
      <TripRowContent trip={trip} index={index} />
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */

function CityCardContent({ city, onOpen }: { city: City; onOpen: () => void }) {
  return (
    <article
      onClick={onOpen}
      className="group relative cursor-pointer overflow-hidden rounded-sm border border-rail bg-ink"
    >
      {city.imageUrl ? (
        <img
          src={city.imageUrl}
          alt=""
          loading="lazy"
          className="h-52 w-full object-cover opacity-70 transition-all duration-500 group-hover:scale-105 group-hover:opacity-90"
        />
      ) : (
        <div className="h-52 w-full bg-board" />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />

      <div className="absolute inset-x-0 bottom-0 p-4">
        <h3 className="font-display text-xl uppercase tracking-board text-platform">{city.name}</h3>
        <p className="font-mono text-[11px] uppercase text-platform/70">{city.country}</p>
        <span className="pointer-events-none absolute right-4 top-4 rounded-sm border border-platform/40 bg-ink/60 px-2 py-1 font-mono text-[10px] uppercase text-platform opacity-0 transition-opacity group-hover:opacity-100">
          View
        </span>
        <div className="mt-2 flex items-center gap-3 font-mono text-[11px] text-platform/60">
          <span>
            COST <span className="text-signal">{city.costIndex}</span>
          </span>
          <span aria-hidden className="h-3 w-px bg-platform/30" />
          <span>
            POP <span className="text-signal">{city.popularityScore}</span>
          </span>
        </div>
      </div>
    </article>
  );
}

function CityCard({
  city,
  index,
  reduce,
  onOpen,
}: {
  city: City;
  index: number;
  reduce: boolean;
  onOpen: () => void;
}) {
  if (reduce) return <CityCardContent city={city} onOpen={onOpen} />;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10% 0px" }}
      transition={{ delay: index * 0.05, duration: 0.45 }}
    >
      <CityCardContent city={city} onOpen={onOpen} />
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */

export function DashboardPage() {
  const reduce = useReducedMotion() ?? false;
  const [openCity, setOpenCity] = useState<City | null>(null);
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress: heroProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  // Hero content drifts up and dissolves as the page scrolls past it.
  const heroY = useTransform(heroProgress, [0, 1], ["0%", "28%"]);
  const heroFade = useTransform(heroProgress, [0, 0.75], [1, 0]);
  const { data: trips, isLoading: tripsLoading, isError: tripsError } = useTrips();
  const { data: cities, isLoading: citiesLoading, isError: citiesError } = useCities();

  const nearest = findNearestUpcomingTrip(trips);
  const { data: budget, isError: budgetError } = useTripBudget(nearest?.id);

  const reelItems: ReelItem[] = HERO_CLIPS.map((clip) => {
    const city = cities?.find((c) => c.name === clip.label);
    return {
      src: clip.src,
      label: clip.label,
      meta: city ? `${city.country} · COST ${city.costIndex}` : undefined,
      poster: city?.imageUrl ?? undefined,
    };
  });

  const tripCount = trips?.length ?? 0;
  const stopCount = trips?.reduce((sum, t) => sum + (t._count?.stops ?? 0), 0) ?? 0;

  return (
    <div className="-mx-4 sm:-mx-6">
      {/* ---------------------------------------------------------------- Hero */}
      <section
        ref={heroRef}
        className="relative isolate flex min-h-[88vh] items-center overflow-hidden bg-ink text-platform"
      >
        <VideoBackdrop sources={HERO_CLIPS} className="absolute inset-0" />

        <motion.div
          style={reduce ? undefined : { y: heroY, opacity: heroFade }}
          className="relative mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-12 px-6 py-20 sm:py-28 lg:grid-cols-[1.1fr_0.9fr]"
        >
          <div>
          <p className="font-mono text-xs uppercase tracking-board text-signal">
            Departures · Live board
          </p>

          <h1 className="mt-4 max-w-3xl font-display text-5xl uppercase leading-[0.95] tracking-board sm:text-7xl">
            Every trip is a
            <span className="text-signal"> route</span>
          </h1>

          <p className="mt-5 max-w-md text-platform/70">
            Multi-city itineraries planned down to the departure time, the stop order, and the cost
            per day.
          </p>

          {/* Board-style stat strip */}
          <dl className="mt-10 flex flex-wrap gap-x-10 gap-y-4 border-t border-platform/20 pt-6">
            {[
              { label: "Trips", value: tripCount },
              { label: "Stops", value: stopCount },
              { label: "Cities", value: cities?.length ?? 0 },
            ].map((stat) => (
              <div key={stat.label}>
                <dt className="font-mono text-[11px] uppercase tracking-board text-platform/50">
                  {stat.label}
                </dt>
                <dd className="font-mono text-3xl text-signal tabular-nums">
                  {String(stat.value).padStart(2, "0")}
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link to="/trips/new">
              <Button>Plan new trip</Button>
            </Link>
            <Link
              to="/trips"
              className="inline-flex items-center rounded-sm border border-platform/30 px-5 py-2.5 font-display text-sm uppercase tracking-board text-platform transition-colors hover:border-signal hover:text-signal"
            >
              All trips
            </Link>
          </div>
          </div>

          <FeatureReel items={reelItems} />
        </motion.div>

        {!reduce && (
          <motion.span
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0], y: [0, 10, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-x-0 bottom-8 mx-auto w-max font-mono text-[11px] uppercase tracking-board text-platform/60"
          >
            Scroll
          </motion.span>
        )}
      </section>

      <Ticker items={(cities ?? []).slice(0, 16).map((c) => c.name)} />

      {/* ------------------------------------------------------------ Your trips */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="flex items-end justify-between border-b-2 border-ink pb-3">
          <h2 className="font-display text-2xl uppercase tracking-board">Your departures</h2>
          <span className="font-mono text-xs uppercase text-mute">
            {tripCount > 0 ? `${String(tripCount).padStart(2, "0")} scheduled` : "—"}
          </span>
        </div>

        {tripsLoading && <p className="py-8 font-mono text-sm text-mute">Loading board…</p>}
        {tripsError && (
          <p className="py-8 font-mono text-sm text-signal">
            Couldn&apos;t load your trips right now.
          </p>
        )}
        {!tripsLoading && !tripsError && tripCount === 0 && (
          <div className="py-12">
            <p className="text-mute">No trips yet. Plan your first one to see it here.</p>
            <Link
              to="/trips/new"
              className="mt-3 inline-block font-display text-sm uppercase tracking-board text-transit hover:text-ink"
            >
              Plan your first trip →
            </Link>
          </div>
        )}

        <div>
          {trips?.map((trip, i) => (
            <TripRow key={trip.id} trip={trip} index={i} reduce={reduce} />
          ))}
        </div>
      </section>

      <SceneryBand
        imageUrl={cities?.[0]?.imageUrl}
        eyebrow="Now boarding"
        title={cities?.[0] ? `${cities[0].name} is running today` : "Somewhere is always boarding"}
        caption="Pick a destination, set the dates, and the board fills itself in."
      />

      {/* ------------------------------------------------------- Recommended */}
      <section className="bg-ink py-16 text-platform">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex items-end justify-between border-b border-platform/20 pb-3">
            <h2 className="font-display text-2xl uppercase tracking-board">Recommended cities</h2>
            <span className="font-mono text-xs uppercase text-platform/50">
              By popularity
            </span>
          </div>

          {citiesLoading && (
            <p className="py-8 font-mono text-sm text-platform/60">Loading cities…</p>
          )}
          {citiesError && (
            <p className="py-8 font-mono text-sm text-signal">
              Couldn&apos;t load recommended cities right now.
            </p>
          )}

          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {cities?.slice(0, 8).map((city, i) => (
              <CityCard
                key={city.id}
                city={city}
                index={i}
                reduce={reduce}
                onOpen={() => setOpenCity(city)}
              />
            ))}
          </div>
        </div>
      </section>

      <SceneryBand
        imageUrl={cities?.[3]?.imageUrl}
        eyebrow="Cost control"
        title="Know the price before you go"
        caption="Every stop, activity and night adds up on one board — no surprises at the gate."
      />

      {/* ------------------------------------------------------------- Budget */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="flex items-end justify-between border-b-2 border-ink pb-3">
          <h2 className="font-display text-2xl uppercase tracking-board">Budget highlight</h2>
          {nearest && (
            <span className="font-mono text-xs uppercase text-mute">
              {formatDate(nearest.startDate)} — {formatDate(nearest.endDate)}
            </span>
          )}
        </div>

        {budgetError && (
          <p className="py-8 font-mono text-sm text-signal">
            Couldn&apos;t load the budget for this trip right now.
          </p>
        )}

        {!nearest && !budgetError && (
          <p className="py-8 text-mute">Plan a trip to see your budget breakdown here.</p>
        )}

        {nearest && budget && !budgetError && (
          <div className="mt-8 grid gap-px bg-rail sm:grid-cols-4">
            <div className="bg-platform p-6">
              <p className="font-mono text-[11px] uppercase tracking-board text-mute">Total</p>
              <p className="mt-1 font-mono text-3xl tabular-nums text-ink">
                {money.format(budget.totalCost)}
              </p>
            </div>
            {Object.entries(budget.byCategory)
              .slice(0, 3)
              .map(([category, amount]) => (
                <div key={category} className="bg-platform p-6">
                  <p className="font-mono text-[11px] uppercase tracking-board text-mute">
                    {category}
                  </p>
                  <p className="mt-1 font-mono text-3xl tabular-nums text-signal">
                    {money.format(amount)}
                  </p>
                </div>
              ))}
          </div>
        )}
      </section>

      <CityDialog city={openCity} onClose={() => setOpenCity(null)} />
    </div>
  );
}
