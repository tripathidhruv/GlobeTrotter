import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { useCities, useCreateStop, type City } from "./useCities";
import { useTrip } from "../trips/useTrips";
import { Button } from "../../components/ui/Button";
import { ZoomImage } from "../../components/ui/ZoomImage";

// The catalog import (server/prisma/seed.ts) sticks to this set of regions —
// keeping the filter options in sync with what actually appears in the data.
const REGIONS = [
  "Europe",
  "Asia",
  "North America",
  "South America",
  "Africa",
  "Middle East",
  "Oceania",
];

const inputClass =
  "w-full rounded-sm border border-rail bg-white px-3 py-2 text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-transit";

function formatDate(iso: string) {
  return iso.slice(0, 10);
}

/** Adds `days` calendar days to an ISO/date-only string, returning a date-only string. */
function addDays(dateStr: string, days: number): string {
  const d = new Date(`${formatDate(dateStr)}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function clampDate(dateStr: string, maxStr: string): string {
  return dateStr > maxStr ? maxStr : dateStr;
}

/** The trip's first stop city photo, if the API happened to include one. */
function firstStopImage(trip: { stops: unknown[] } | undefined): string | null {
  const stop = (trip?.stops as { city?: { imageUrl?: string | null } }[] | undefined)?.[0];
  return stop?.city?.imageUrl ?? null;
}

function CityPhoto({ city }: { city: City }) {
  const [failed, setFailed] = useState(false);
  if (!city.imageUrl || failed) {
    return <div className="h-52 w-full bg-board" />;
  }
  return (
    <img
      src={city.imageUrl}
      alt={city.name}
      loading="lazy"
      onError={() => setFailed(true)}
      className="h-52 w-full object-cover opacity-80 transition-all duration-500 group-hover:scale-110 group-hover:opacity-100"
    />
  );
}

function AddCityForm({
  defaultArrival,
  defaultDeparture,
  isPending,
  error,
  onCancel,
  onConfirm,
}: {
  defaultArrival: string;
  defaultDeparture: string;
  isPending: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: (arrivalDate: string, departureDate: string) => void;
}) {
  const [arrivalDate, setArrivalDate] = useState(defaultArrival);
  const [departureDate, setDepartureDate] = useState(defaultDeparture);

  return (
    <div className="mt-4 space-y-3 border-t border-rail pt-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label
            htmlFor={`arrival-${defaultArrival}`}
            className="mb-1 block font-display text-xs uppercase tracking-board text-mute"
          >
            Arrival date
          </label>
          <input
            id={`arrival-${defaultArrival}`}
            type="date"
            value={arrivalDate}
            onChange={(e) => setArrivalDate(e.target.value)}
            className={`${inputClass} font-mono`}
          />
        </div>
        <div>
          <label
            htmlFor={`departure-${defaultArrival}`}
            className="mb-1 block font-display text-xs uppercase tracking-board text-mute"
          >
            Departure date
          </label>
          <input
            id={`departure-${defaultArrival}`}
            type="date"
            value={departureDate}
            onChange={(e) => setDepartureDate(e.target.value)}
            className={`${inputClass} font-mono`}
          />
        </div>
      </div>
      {error && (
        <p role="alert" className="text-sm text-signal">
          {error}
        </p>
      )}
      <div className="flex gap-3">
        <Button
          type="button"
          disabled={isPending}
          onClick={() => onConfirm(arrivalDate, departureDate)}
        >
          {isPending ? "Adding..." : "Confirm"}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function CityResultContent({
  city,
  defaultArrival,
  defaultDeparture,
  nextOrderIndex,
}: {
  city: City;
  defaultArrival: string;
  defaultDeparture: string;
  nextOrderIndex: number;
}) {
  const { id: tripId } = useParams<{ id: string }>();
  const { mutateAsync, isPending } = useCreateStop(tripId!);
  const [expanded, setExpanded] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmAdd(arrivalDate: string, departureDate: string) {
    setError(null);
    try {
      await mutateAsync({ cityId: city.id, orderIndex: nextOrderIndex, arrivalDate, departureDate });
      setAdded(true);
      setExpanded(false);
    } catch {
      setError("Couldn't add this city right now. Please try again.");
    }
  }

  return (
    <article className="group overflow-hidden rounded-sm border border-rail bg-ink text-platform transition-colors hover:border-signal">
      <div className="relative overflow-hidden">
        <CityPhoto city={city} />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-4">
          <h3 className="font-display text-xl uppercase tracking-board">{city.name}</h3>
          <p className="mt-1 font-mono text-[11px] uppercase text-platform/70">
            {city.country}
            {city.region ? ` · ${city.region}` : ""}
          </p>
          <div className="mt-2 flex items-center gap-3 text-[11px] uppercase text-platform/60">
            <span>
              Cost index <span className="font-mono text-signal">{city.costIndex}</span>
            </span>
            <span aria-hidden className="h-3 w-px bg-platform/30" />
            <span>
              Popularity <span className="font-mono text-signal">{city.popularityScore}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 text-ink">
        <div className="flex items-center justify-between gap-4">
          <p className="font-display text-xs uppercase tracking-board text-mute">
            {added ? "On this trip" : "Add this stop"}
          </p>
          {added ? (
            <span className="font-display text-sm uppercase tracking-board text-signal">Added</span>
          ) : (
            !expanded && (
              <Button variant="secondary" onClick={() => setExpanded(true)}>
                Add to Trip
              </Button>
            )
          )}
        </div>

        {expanded && !added && (
          <AddCityForm
            defaultArrival={defaultArrival}
            defaultDeparture={defaultDeparture}
            isPending={isPending}
            error={error}
            onCancel={() => setExpanded(false)}
            onConfirm={confirmAdd}
          />
        )}
      </div>
    </article>
  );
}

function CityResult({
  city,
  index,
  reduce,
  defaultArrival,
  defaultDeparture,
  nextOrderIndex,
}: {
  city: City;
  index: number;
  reduce: boolean;
  defaultArrival: string;
  defaultDeparture: string;
  nextOrderIndex: number;
}) {
  if (reduce) {
    return (
      <CityResultContent
        city={city}
        defaultArrival={defaultArrival}
        defaultDeparture={defaultDeparture}
        nextOrderIndex={nextOrderIndex}
      />
    );
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
    >
      <CityResultContent
        city={city}
        defaultArrival={defaultArrival}
        defaultDeparture={defaultDeparture}
        nextOrderIndex={nextOrderIndex}
      />
    </motion.div>
  );
}

export function CitySearchPage() {
  const { id: tripId } = useParams<{ id: string }>();
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState<string | undefined>(undefined);
  const { data: cities, isLoading, isError } = useCities(search, region);
  const { data: trip } = useTrip(tripId);
  const reduce = useReducedMotion() ?? false;

  const stopCount = trip?.stops.length ?? 0;

  // Chain dates: the next city's arrival defaults to the day after the last
  // stop's departure, so multi-city trips don't all collapse onto day one.
  const defaultArrival = useMemo(() => {
    if (!trip) return "";
    if (trip.stops.length > 0) {
      const lastStop = trip.stops[trip.stops.length - 1];
      return addDays(lastStop.departureDate, 1);
    }
    return formatDate(trip.startDate);
  }, [trip]);

  const defaultDeparture = useMemo(() => {
    if (!trip || !defaultArrival) return "";
    const tripEnd = formatDate(trip.endDate);
    return clampDate(addDays(defaultArrival, 3), tripEnd);
  }, [trip, defaultArrival]);

  const nextOrderIndex = useMemo(() => trip?.stops.length ?? 0, [trip]);

  // Prefer the trip's own first-stop photo; fall back to any catalogue city photo.
  const heroImage = firstStopImage(trip) ?? cities?.find((c) => c.imageUrl)?.imageUrl ?? null;

  return (
    <div>
      <div className="relative flex h-[38vh] min-h-[260px] items-end overflow-hidden bg-ink text-platform">
        {heroImage && <ZoomImage src={heroImage} from={1.02} to={1.3} />}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink via-ink/75 to-ink/25" />
        <div className="relative z-10 mx-auto w-full max-w-5xl px-6 pb-8">
          <p className="font-mono text-xs uppercase tracking-board text-signal">Add a city</p>
          <h1 className="mt-2 font-display text-3xl uppercase tracking-board sm:text-5xl">
            {trip ? trip.name : "Plan your route"}
          </h1>
          {trip && (
            <p className="mt-2 font-mono text-sm text-platform/70">
              {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
            </p>
          )}
          {trip && (
            <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-platform/15 pt-5">
              <p className="font-mono text-xs uppercase tracking-board text-platform/60">
                <span className="text-platform">{stopCount}</span>{" "}
                {stopCount === 1 ? "stop" : "stops"} added
              </p>
              <div className="flex flex-1 flex-wrap justify-end gap-3">
                <Link
                  to={`/trips/${tripId}`}
                  className="rounded-sm border border-platform/40 px-5 py-2.5 font-display text-sm font-semibold uppercase tracking-board text-platform transition-colors hover:border-platform focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-transit"
                >
                  Done
                </Link>
                {stopCount === 0 ? (
                  <Button disabled title="Add a city first">
                    Next: add activities
                  </Button>
                ) : (
                  <Link to={`/trips/${tripId}/activities`}>
                    <Button>Next: add activities</Button>
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search cities..."
            className={`${inputClass} sm:col-span-2`}
          />
          <div>
            <label htmlFor="region-filter" className="sr-only">
              Filter by region
            </label>
            <select
              id="region-filter"
              value={region ?? ""}
              onChange={(e) => setRegion(e.target.value || undefined)}
              className={inputClass}
            >
              <option value="">All regions</option>
              {REGIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>

        {isLoading && <p className="text-mute">Loading...</p>}
        {isError && (
          <p className="text-mute">Couldn't load cities right now. Please try again shortly.</p>
        )}
        {!isLoading && !isError && (!cities || cities.length === 0) && (
          <p className="text-mute">No cities found. Try a different search or region.</p>
        )}

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {cities?.map((city, i) => (
            <CityResult
              key={city.id}
              city={city}
              index={i}
              reduce={reduce}
              defaultArrival={defaultArrival}
              defaultDeparture={defaultDeparture}
              nextOrderIndex={nextOrderIndex}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
