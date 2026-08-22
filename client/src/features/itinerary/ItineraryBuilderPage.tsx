import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Reorder, motion, useReducedMotion } from "framer-motion";
import { useTrip, useReorderStop, useDeleteStop, type TripStop } from "./useTrip";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { Button } from "../../components/ui/Button";
import { AiSuggestPanel } from "../ai/AiSuggestPanel";

function formatDate(iso: string) {
  return iso.slice(0, 10);
}

function StopNode({ index, reduce }: { index: number; reduce: boolean }) {
  const label = String(index + 1).padStart(2, "0");
  const inner = (
    <span className="relative z-10 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-signal font-mono text-xs font-bold text-ink">
      {label}
    </span>
  );
  if (reduce) return inner;
  return (
    <motion.span
      layout
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: index * 0.05, type: "spring", stiffness: 400, damping: 22 }}
      className="relative z-10 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-signal font-mono text-xs font-bold text-ink"
    >
      {label}
    </motion.span>
  );
}

function StopActivityRow({
  name,
  cost,
  durationMinutes,
}: {
  name: string;
  cost: number;
  durationMinutes: number;
}) {
  return (
    <li className="flex items-baseline justify-between gap-3 text-sm">
      <span className="truncate text-platform/90">{name}</span>
      <span className="flex-shrink-0 font-mono text-xs text-rail">
        ${cost.toFixed(0)} · {durationMinutes}min
      </span>
    </li>
  );
}

function StopCard({
  stop,
  index,
  tripId,
  reduce,
  onRequestDelete,
}: {
  stop: TripStop;
  index: number;
  tripId: string;
  reduce: boolean;
  onRequestDelete: (stop: TripStop, trigger: HTMLElement) => void;
}) {
  return (
    <div className="flex-1 rounded-sm bg-board p-5 text-platform">
      <div className="flex gap-4">
        {stop.city.imageUrl && (
          <img
            src={stop.city.imageUrl}
            alt={stop.city.name}
            className="h-20 w-20 flex-shrink-0 rounded-sm object-cover"
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate font-display text-lg uppercase tracking-board">
                {stop.city.name}
              </h3>
              <p className="font-mono text-xs text-rail">{stop.city.country}</p>
            </div>
            <button
              type="button"
              onClick={(e) => onRequestDelete(stop, e.currentTarget)}
              className="flex-shrink-0 font-mono text-xs uppercase text-signal transition-colors hover:text-platform focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-transit"
            >
              Remove
            </button>
          </div>

          <p className="mt-2 font-mono text-xs text-platform/80">
            {formatDate(stop.arrivalDate)} <span className="text-rail">to</span>{" "}
            {formatDate(stop.departureDate)}
          </p>

          {stop.activities.length > 0 && (
            <ul className="mt-3 space-y-1 border-t border-white/10 pt-2">
              {stop.activities.map((sa) => (
                <StopActivityRow
                  key={sa.id}
                  name={sa.activity.name}
                  cost={sa.activity.estCost}
                  durationMinutes={sa.activity.estDurationMinutes}
                />
              ))}
            </ul>
          )}

          <Link
            to={`/trips/${tripId}/cities`}
            className="mt-3 inline-block font-mono text-xs uppercase text-transit hover:underline"
          >
            + Add activities
          </Link>
        </div>
      </div>
    </div>
  );
}

function StopRow({
  stop,
  index,
  tripId,
  reduce,
  onRequestDelete,
}: {
  stop: TripStop;
  index: number;
  tripId: string;
  reduce: boolean;
  onRequestDelete: (stop: TripStop, trigger: HTMLElement) => void;
}) {
  const content = (
    <div className="flex items-start gap-4">
      <StopNode index={index} reduce={reduce} />
      <StopCard stop={stop} index={index} tripId={tripId} reduce={reduce} onRequestDelete={onRequestDelete} />
    </div>
  );

  if (reduce) {
    return (
      <Reorder.Item value={stop} className="cursor-grab list-none active:cursor-grabbing" transition={{ duration: 0 }}>
        {content}
      </Reorder.Item>
    );
  }

  return (
    <Reorder.Item
      value={stop}
      className="list-none cursor-grab active:cursor-grabbing"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, type: "spring", stiffness: 400, damping: 30 }}
      whileDrag={{ scale: 1.03, boxShadow: "0 12px 30px rgba(14,17,22,0.35)", zIndex: 20 }}
    >
      {content}
    </Reorder.Item>
  );
}

export function ItineraryBuilderPage() {
  const { id: tripId } = useParams<{ id: string }>();
  const { data: trip, isLoading, isError } = useTrip(tripId);
  const { mutate: reorder } = useReorderStop(tripId);
  const { mutate: deleteStop, isPending: isDeleting } = useDeleteStop(tripId);
  const reduce = useReducedMotion() ?? false;

  const [stops, setStops] = useState<TripStop[]>([]);
  const [pendingDelete, setPendingDelete] = useState<TripStop | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);

  const stopsSignature = trip?.stops
    ? trip.stops.map((s) => `${s.id}:${s.orderIndex}`).join(",")
    : "";

  useEffect(() => {
    if (trip?.stops) {
      setStops([...trip.stops].sort((a, b) => a.orderIndex - b.orderIndex));
    }
    // Re-sync only when the actual stop set/order changes, not on every
    // render of a fresh (but equivalent) array reference from the query.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopsSignature]);

  function handleReorder(newOrder: TripStop[]) {
    setStops(newOrder);
    newOrder.forEach((stop, index) => {
      if (stop.orderIndex !== index) {
        reorder({ stopId: stop.id, orderIndex: index });
      }
    });
  }

  function requestDelete(stop: TripStop, trigger: HTMLElement) {
    trigger.focus();
    setDeleteError(null);
    setPendingDelete(stop);
  }

  function confirmDelete() {
    if (!pendingDelete) return;
    setDeleteError(null);
    deleteStop(pendingDelete.id, {
      onSuccess: () => setPendingDelete(null),
      onError: () => setDeleteError("Couldn't remove this stop right now. Please try again."),
    });
  }

  if (!tripId) return null;

  return (
    <div className="min-h-screen bg-platform pb-16">
      <div className="bg-ink px-6 py-12 text-platform">
        <div className="mx-auto max-w-3xl">
          <p className="font-mono text-xs uppercase tracking-board text-signal">Route builder</p>
          {isLoading && <div className="mt-2 h-9 w-64 animate-pulse rounded-sm bg-board" />}
          {trip && (
            <>
              <h1 className="mt-2 font-display text-3xl uppercase tracking-board sm:text-4xl">
                {trip.name}
              </h1>
              <p className="mt-2 font-mono text-sm text-rail">
                {formatDate(trip.startDate)} — {formatDate(trip.endDate)}
              </p>
              <div className="mt-4">
                <Button type="button" variant="secondary" onClick={() => setAiPanelOpen(true)}>
                  AI suggest
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-6 py-10">
        {isLoading && (
          <div className="space-y-4" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-sm bg-board/20" />
            ))}
          </div>
        )}

        {isError && (
          <p className="text-mute">
            Couldn't load this trip right now. Please try again shortly.
          </p>
        )}

        {deleteError && (
          <p role="alert" className="mb-4 font-mono text-sm text-signal">
            {deleteError}
          </p>
        )}

        {trip && !isLoading && !isError && (
          <>
            {stops.length === 0 ? (
              <p className="text-mute">No stops on this route yet. Add your first city to begin.</p>
            ) : (
              <div className="relative">
                <div
                  aria-hidden
                  className="absolute bottom-4 left-[17px] top-4 w-px bg-rail"
                />
                <Reorder.Group
                  axis="y"
                  values={stops}
                  onReorder={handleReorder}
                  className="relative space-y-4"
                >
                  {stops.map((stop, index) => (
                    <StopRow
                      key={stop.id}
                      stop={stop}
                      index={index}
                      tripId={tripId}
                      reduce={reduce}
                      onRequestDelete={requestDelete}
                    />
                  ))}
                </Reorder.Group>
              </div>
            )}

            <div className="mt-8">
              <Link to={`/trips/${tripId}/cities`}>
                <Button variant="secondary">Add city</Button>
              </Link>
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Remove this stop?"
        description={
          pendingDelete && (
            <>
              This will remove <span className="text-ink">{pendingDelete.city.name}</span> and its
              activities from the route.
            </>
          )
        }
        confirmLabel="Remove"
        pendingLabel="Removing..."
        isConfirming={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      <AiSuggestPanel
        open={aiPanelOpen}
        tripId={tripId}
        trip={trip}
        onClose={() => setAiPanelOpen(false)}
      />
    </div>
  );
}
