import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { useCities, useCreateStop, type City } from "./useCities";
import { useTrip } from "../trips/useTrips";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";

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

function CityImage({ city }: { city: City }) {
  const [failed, setFailed] = useState(false);
  if (!city.imageUrl || failed) return null;
  return (
    <img
      src={city.imageUrl}
      alt={city.name}
      className="h-36 w-full object-cover"
      onError={() => setFailed(true)}
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
    <Card className="p-0">
      <CityImage city={city} />
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-display text-lg uppercase tracking-board">{city.name}</h3>
            <p className="text-sm text-mute">
              {city.country}
              {city.region ? ` · ${city.region}` : ""}
            </p>
            <div className="mt-2 flex gap-4 text-xs text-mute">
              <span>
                Cost index <span className="font-mono text-ink">{city.costIndex}</span>
              </span>
              <span>
                Popularity <span className="font-mono text-ink">{city.popularityScore}</span>
              </span>
            </div>
          </div>
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
    </Card>
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

  const defaultArrival = trip ? formatDate(trip.startDate) : "";
  const defaultDeparture = trip ? formatDate(trip.endDate) : "";
  const nextOrderIndex = useMemo(() => trip?.stops.length ?? 0, [trip]);

  return (
    <div>
      <div className="bg-ink px-6 py-10 text-platform">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-display text-3xl uppercase tracking-board">Add a city</h1>
          {trip && (
            <p className="mt-1 text-sm text-platform/60">
              {trip.name} ·{" "}
              <span className="font-mono">
                {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
              </span>
            </p>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
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

        <div className="space-y-4">
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
