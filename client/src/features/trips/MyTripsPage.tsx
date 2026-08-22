import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import { useTrips, useDeleteTrip, type Trip } from "./useTrips";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";

function formatDate(iso: string) {
  return iso.slice(0, 10);
}

function TripCoverImage({ trip }: { trip: Trip }) {
  const [failed, setFailed] = useState(false);
  if (!trip.coverPhotoUrl || failed) return null;
  return (
    <img
      src={trip.coverPhotoUrl}
      alt={trip.name}
      className="h-36 w-full object-cover"
      onError={() => setFailed(true)}
    />
  );
}

function TripCardContent({
  trip,
  onRequestDelete,
}: {
  trip: Trip;
  onRequestDelete: (id: string, trigger: HTMLElement) => void;
}) {
  return (
    <Card className="p-0">
      <TripCoverImage trip={trip} />
      <div className="p-5">
        <h2 className="font-display text-lg uppercase tracking-board">{trip.name}</h2>
        <p className="mt-1 font-mono text-xs text-mute">
          {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
        </p>
        <p className="mt-1 text-sm text-mute">
          <span className="font-mono text-signal">{trip._count?.stops ?? 0}</span>{" "}
          {trip._count?.stops === 1 ? "destination" : "destinations"}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
          <Link
            to={`/trips/${trip.id}`}
            className="font-display uppercase tracking-board text-transit hover:underline"
          >
            View
          </Link>
          <Link
            to={`/trips/${trip.id}/build`}
            className="font-display uppercase tracking-board text-ink hover:underline"
          >
            Edit
          </Link>
          <button
            type="button"
            onClick={(e) => onRequestDelete(trip.id, e.currentTarget)}
            className="font-display uppercase tracking-board text-signal hover:underline"
          >
            Delete
          </button>
        </div>
      </div>
    </Card>
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
      <div className="bg-ink px-6 py-10 text-platform">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <h1 className="font-display text-3xl uppercase tracking-board">My Trips</h1>
          <Link to="/trips/new">
            <Button>Plan New Trip</Button>
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-10">
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

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
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
