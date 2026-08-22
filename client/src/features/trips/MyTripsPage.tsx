import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import { useTrips, useDeleteTrip, type Trip } from "./useTrips";
import { SceneryBand } from "../../components/ui/SceneryBand";
import { ZoomImage } from "../../components/ui/ZoomImage";
import { Button } from "../../components/ui/Button";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";

function formatDate(iso: string) {
  return iso.slice(0, 10);
}

/** Trip's own cover if set, otherwise the photo of its first stop's city. */
function tripImage(trip: Trip): string | null {
  return trip.coverPhotoUrl ?? trip.stops?.[0]?.city?.imageUrl ?? null;
}

function TripCoverImage({ trip }: { trip: Trip }) {
  const [failed, setFailed] = useState(false);
  const src = tripImage(trip);
  if (!src || failed) {
    return <div className="h-48 w-full bg-board" />;
  }
  return (
    <div className="relative h-48 w-full overflow-hidden">
      <img
        src={src}
        alt=""
        loading="lazy"
        onError={() => setFailed(true)}
        className="h-48 w-full object-cover opacity-75 transition-all duration-500 group-hover:scale-110 group-hover:opacity-100"
      />
    </div>
  );
}

function TripCardContent({
  trip,
  onRequestDelete,
}: {
  trip: Trip;
  onRequestDelete: (id: string, trigger: HTMLElement) => void;
}) {
  const first = trip.stops?.[0]?.city;
  return (
    <article className="group overflow-hidden rounded-sm border border-rail bg-ink text-platform transition-colors hover:border-signal">
      <div className="relative overflow-hidden">
        <TripCoverImage trip={trip} />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-4">
          <h2 className="font-display text-2xl uppercase leading-none tracking-board">
            {trip.name}
          </h2>
          {first && (
            <p className="mt-1 font-mono text-[10px] uppercase text-platform/60">
              via {first.name}, {first.country}
            </p>
          )}
        </div>
        <span className="absolute right-3 top-3 rounded-sm border border-platform/40 bg-ink/70 px-2 py-1 font-mono text-[10px] text-signal">
          {String(trip._count?.stops ?? 0).padStart(2, "0")} STOPS
        </span>
      </div>

      <div className="p-5">
        <p className="font-mono text-xs text-platform/70">
          {formatDate(trip.startDate)} — {formatDate(trip.endDate)}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
          <Link
            to={`/trips/${trip.id}`}
            className="font-display uppercase tracking-board text-platform transition-colors hover:text-signal"
          >
            View
          </Link>
          <Link
            to={`/trips/${trip.id}/build`}
            className="font-display uppercase tracking-board text-platform/70 transition-colors hover:text-platform"
          >
            Edit
          </Link>
          <button
            type="button"
            onClick={(e) => onRequestDelete(trip.id, e.currentTarget)}
            className="font-display uppercase tracking-board text-signal transition-colors hover:text-platform"
          >
            Delete
          </button>
        </div>
      </div>
    </article>
  );
}

function TripCard({
  trip,
  index,
  reduce,
  onRequestDelete,
}: {
  trip: Trip;
  index: number;
  reduce: boolean;
  onRequestDelete: (id: string, trigger: HTMLElement) => void;
}) {
  if (reduce) {
    return <TripCardContent trip={trip} onRequestDelete={onRequestDelete} />;
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.05 }}
    >
      <TripCardContent trip={trip} onRequestDelete={onRequestDelete} />
    </motion.div>
  );
}

export function MyTripsPage() {
  const { data: trips, isLoading, isError } = useTrips();
  const { mutate: deleteTrip, isPending: isDeleting } = useDeleteTrip();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const reduce = useReducedMotion() ?? false;

  const pendingTrip = trips?.find((t) => t.id === pendingDeleteId);
  const tripCount = trips?.length ?? 0;
  const stopTotal = trips?.reduce((n, t) => n + (t._count?.stops ?? 0), 0) ?? 0;
  const nightTotal =
    trips?.reduce(
      (n, t) =>
        n +
        Math.max(
          0,
          Math.round(
            (new Date(t.endDate).getTime() - new Date(t.startDate).getTime()) / 86_400_000
          )
        ),
      0
    ) ?? 0;
  const heroImage = trips?.map(tripImage).find((src): src is string => !!src) ?? null;

  function requestDelete(id: string, trigger: HTMLElement) {
    // The trigger receives focus explicitly so ConfirmDialog can restore focus to it on close,
    // even in test environments where a raw click doesn't move focus by itself.
    trigger.focus();
    setDeleteError(null);
    setPendingDeleteId(id);
  }

  function confirmDelete() {
    if (!pendingDeleteId) return;
    setDeleteError(null);
    deleteTrip(pendingDeleteId, {
      onSuccess: () => setPendingDeleteId(null),
      onError: () => setDeleteError("Couldn't delete this trip right now. Please try again."),
    });
  }

  return (
    <div>
      <section className="relative isolate overflow-hidden bg-ink text-platform">
        {heroImage && <ZoomImage src={heroImage} className="opacity-45" from={1} to={1.3} />}
        <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/80 to-ink/40" />

        <div className="relative mx-auto max-w-6xl px-6 py-20">
          <p className="font-mono text-xs uppercase tracking-board text-signal">
            {tripCount > 0 ? `${String(tripCount).padStart(2, "0")} services scheduled` : "No services"}
          </p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-6">
            <h1 className="font-display text-5xl uppercase leading-none tracking-board sm:text-7xl">
              My Trips
            </h1>
            <Link to="/trips/new">
              <Button>Plan New Trip</Button>
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-10 gap-y-3 border-t border-platform/20 pt-5 font-mono text-xs uppercase text-platform/60">
            <span>
              Stops <span className="text-signal">{String(stopTotal).padStart(2, "0")}</span>
            </span>
            <span>
              Nights <span className="text-signal">{String(nightTotal).padStart(3, "0")}</span>
            </span>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-6 py-14">
        {isLoading && <p className="text-mute">Loading...</p>}
        {isError && (
          <p className="text-mute">Couldn't load your trips right now. Please try again shortly.</p>
        )}
        {!isLoading && !isError && (!trips || trips.length === 0) && (
          <p className="text-mute">No trips yet. Plan your first one to see it here.</p>
        )}

        {deleteError && (
          <p role="alert" className="mb-4 text-sm text-signal">
            {deleteError}
          </p>
        )}

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {trips?.map((trip, i) => (
            <TripCard
              key={trip.id}
              trip={trip}
              index={i}
              reduce={reduce}
              onRequestDelete={requestDelete}
            />
          ))}
        </div>
      </div>

      <SceneryBand
        imageUrl={trips?.slice(1).map(tripImage).find((src): src is string => !!src) ?? heroImage}
        eyebrow="Next departure"
        title="Where to next?"
        caption="Add a city, set the dates, and the board updates itself."
      />

      <ConfirmDialog
        open={!!pendingTrip}
        title="Delete this trip?"
        description={
          pendingTrip && (
            <>
              This will permanently delete <span className="text-ink">{pendingTrip.name}</span>.
              This action cannot be undone.
            </>
          )
        }
        confirmLabel="Confirm delete"
        pendingLabel="Deleting..."
        isConfirming={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  );
}
