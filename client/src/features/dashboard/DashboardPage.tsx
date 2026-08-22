import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useTrips, type Trip } from "../trips/useTrips";
import { useCities } from "../cities/useCities";
import { useTripBudget } from "../budget/useTripBudget";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { RouteLine } from "../../components/ui/RouteLine";

function formatDate(iso: string) {
  return iso.slice(0, 10);
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

export function DashboardPage() {
  const { data: trips, isLoading: tripsLoading } = useTrips();
  const { data: cities, isLoading: citiesLoading } = useCities();
  const nearestTrip = findNearestUpcomingTrip(trips);
  const { data: budget, isLoading: budgetLoading } = useTripBudget(nearestTrip?.id);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-display text-3xl uppercase tracking-board">Your trips</h1>
        <Link to="/trips/new">
          <Button>Plan New Trip</Button>
        </Link>
      </div>

      {tripsLoading && <p className="text-mute">Loading...</p>}
      {!tripsLoading && (!trips || trips.length === 0) && (
        <p className="mb-4 text-mute">No trips yet. Plan your first one to see it here.</p>
      )}

      <div className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-3">
        {trips?.map((trip, i) => (
          <motion.div
            key={trip.id}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.05 }}
          >
            <Link to={`/trips/${trip.id}`}>
              <Card className="p-5">
                <h2 className="font-display text-lg uppercase tracking-board">{trip.name}</h2>
                <p className="font-mono text-sm text-mute">
                  {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
                </p>
                <div className="mt-3">
                  <RouteLine
                    compact
                    stops={[
                      { id: `${trip.id}-depart`, label: "Depart", meta: formatDate(trip.startDate) },
                      { id: `${trip.id}-return`, label: "Return", meta: formatDate(trip.endDate) },
                    ]}
                  />
                </div>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>

      <section className="mb-12">
        <h2 className="mb-4 font-display text-xl uppercase tracking-board">Recommended cities</h2>
        {citiesLoading && <p className="text-mute">Loading...</p>}
        {!citiesLoading && (!cities || cities.length === 0) && (
          <p className="text-mute">No cities available yet.</p>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
          {cities?.slice(0, 4).map((city) => (
            <Card key={city.id} className="p-4">
              <h3 className="font-display text-base uppercase tracking-board">{city.name}</h3>
              <p className="text-sm text-mute">{city.country}</p>
              <p className="font-mono text-xs text-mute">Cost index {city.costIndex}</p>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 font-display text-xl uppercase tracking-board">Budget highlight</h2>
        {!nearestTrip && (
          <p className="text-mute">Plan a trip to see your budget breakdown here.</p>
        )}
        {nearestTrip && budgetLoading && <p className="text-mute">Loading...</p>}
        {nearestTrip && !budgetLoading && budget && (
          <Card className="p-5">
            <p className="text-sm text-mute">Estimated total cost — {nearestTrip.name}</p>
            <p className="font-mono text-2xl">
              ${budget.totalCost.toLocaleString()}
            </p>
          </Card>
        )}
        {nearestTrip && !budgetLoading && !budget && (
          <p className="text-mute">Budget details aren't available for this trip yet.</p>
        )}
      </section>
    </div>
  );
}
