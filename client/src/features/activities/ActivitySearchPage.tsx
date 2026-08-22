import { useMemo, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { useTrip, type TripStop } from "../itinerary/useTrip";
import {
  useActivities,
  useAttachActivity,
  useDetachActivity,
  type Activity,
} from "./useActivities";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { ZoomImage } from "../../components/ui/ZoomImage";

const CATEGORIES = ["sightseeing", "food", "leisure", "adventure"];

const inputClass =
  "w-full rounded-sm border border-rail bg-white px-3 py-2 text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-transit";

function formatDate(iso: string) {
  return iso.slice(0, 10);
}

function money(n: number) {
  return `$${n.toFixed(0)}`;
}

function stopLabel(stop: TripStop) {
  return `${stop.city.name} · ${formatDate(stop.arrivalDate)} - ${formatDate(stop.departureDate)}`;
}

function AttachForm({
  stop,
  activity,
  isPending,
  error,
  onCancel,
  onConfirm,
}: {
  stop: TripStop;
  activity: Activity;
  isPending: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: (scheduledDate: string, scheduledTime: string) => void;
}) {
  const [scheduledDate, setScheduledDate] = useState(formatDate(stop.arrivalDate));
  const [scheduledTime, setScheduledTime] = useState("");

  return (
    <div className="mt-3 space-y-3 border-t border-rail pt-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label
            htmlFor={`date-${activity.id}`}
            className="mb-1 block font-display text-xs uppercase tracking-board text-mute"
          >
            Date
          </label>
          <input
            id={`date-${activity.id}`}
            type="date"
            value={scheduledDate}
            min={formatDate(stop.arrivalDate)}
            max={formatDate(stop.departureDate)}
            onChange={(e) => setScheduledDate(e.target.value)}
            className={`${inputClass} font-mono`}
          />
        </div>
        <div>
          <label
            htmlFor={`time-${activity.id}`}
            className="mb-1 block font-display text-xs uppercase tracking-board text-mute"
          >
            Time (optional)
          </label>
          <input
            id={`time-${activity.id}`}
            type="time"
            value={scheduledTime}
            onChange={(e) => setScheduledTime(e.target.value)}
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
          onClick={() => onConfirm(scheduledDate, scheduledTime)}
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

function ActivityRow({
  activity,
  stop,
  tripId,
  index,
  reduce,
}: {
  activity: Activity;
  stop: TripStop | undefined;
  tripId: string;
  index: number;
  reduce: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [attaching, setAttaching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const attach = useAttachActivity(tripId);

  const alreadyAttached = stop?.activities.some((sa) => sa.activity.id === activity.id) ?? false;

  async function confirmAttach(scheduledDate: string, scheduledTime: string) {
    if (!stop) return;
    setError(null);
    try {
      await attach.mutateAsync({
        stopId: stop.id,
        activityId: activity.id,
        scheduledDate,
        scheduledTime: scheduledTime || undefined,
      });
      setAttaching(false);
    } catch {
      setError("Couldn't add this activity right now. Please try again.");
    }
  }

  const content = (
    <div className="border-b border-rail py-4 transition-colors hover:bg-platform/60">
      <div className="flex items-start justify-between gap-4 px-1">
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-transit"
          >
            <h3 className="font-display text-base uppercase tracking-board text-ink">
              {activity.name}
            </h3>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-board text-mute">
              {activity.category}
            </p>
          </button>
          {expanded && (
            <div className="mt-3 max-w-xl space-y-3">
              {activity.imageUrl && (
                <img
                  src={activity.imageUrl}
                  alt={activity.name}
                  className="h-40 w-full rounded-sm object-cover"
                />
              )}
              {activity.description && (
                <p className="text-sm text-mute">{activity.description}</p>
              )}
            </div>
          )}
        </div>
        <div className="flex-shrink-0 text-right text-sm text-mute">
          <div className="font-mono">{activity.estDurationMinutes}min</div>
          <div className="font-mono text-ink">{money(activity.estCost)}</div>
        </div>
        <div className="flex-shrink-0">
          {alreadyAttached ? (
            <span className="font-display text-xs uppercase tracking-board text-signal">
              Added
            </span>
          ) : (
            !attaching && (
              <Button
                variant="secondary"
                disabled={!stop}
                onClick={() => setAttaching(true)}
              >
                Add
              </Button>
            )
          )}
        </div>
      </div>
      {attaching && stop && !alreadyAttached && (
        <div className="px-1">
          <AttachForm
            stop={stop}
            activity={activity}
            isPending={attach.isPending}
            error={error}
            onCancel={() => setAttaching(false)}
            onConfirm={confirmAttach}
          />
        </div>
      )}
    </div>
  );

  if (reduce) return content;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.25 }}
    >
      {content}
    </motion.div>
  );
}

function AttachedRow({
  stopActivity,
  tripId,
}: {
  stopActivity: TripStop["activities"][number];
  tripId: string;
}) {
  const detach = useDetachActivity(tripId);
  return (
    <div className="flex items-center justify-between gap-4 border-b border-rail/60 py-2.5">
      <div className="min-w-0">
        <p className="truncate text-sm text-ink">{stopActivity.activity.name}</p>
        <p className="font-mono text-[11px] uppercase tracking-board text-mute">
          {formatDate(stopActivity.scheduledDate)}
          {stopActivity.scheduledTime ? ` · ${stopActivity.scheduledTime}` : ""}
        </p>
      </div>
      <div className="flex flex-shrink-0 items-center gap-3">
        <span className="font-mono text-xs text-mute">{money(stopActivity.activity.estCost)}</span>
        <Button
          type="button"
          variant="ghost"
          disabled={detach.isPending}
          onClick={() => detach.mutate(stopActivity.id)}
        >
          Remove
        </Button>
      </div>
    </div>
  );
}

export function ActivitySearchPage() {
  const { id: tripId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const preselectStop = searchParams.get("stop") ?? undefined;

  const { data: trip, isLoading: isTripLoading } = useTrip(tripId);
  const reduce = useReducedMotion() ?? false;

  const [selectedStopId, setSelectedStopId] = useState<string | undefined>(preselectStop);
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [costMax, setCostMax] = useState("");
  const [maxDuration, setMaxDuration] = useState("");

  const stops = trip?.stops ?? [];
  const effectiveStopId = selectedStopId ?? stops[0]?.id;
  const selectedStop = stops.find((s) => s.id === effectiveStopId);

  const costMaxNumber = costMax !== "" && !isNaN(Number(costMax)) ? Number(costMax) : undefined;
  const {
    data: activities,
    isLoading: isActivitiesLoading,
    isError: isActivitiesError,
  } = useActivities(selectedStop?.cityId, category, costMaxNumber);

  const filteredActivities = useMemo(() => {
    if (!activities) return activities;
    const maxDurationNumber =
      maxDuration !== "" && !isNaN(Number(maxDuration)) ? Number(maxDuration) : undefined;
    if (maxDurationNumber === undefined) return activities;
    return activities.filter((a) => a.estDurationMinutes <= maxDurationNumber);
  }, [activities, maxDuration]);

  const heroImage = selectedStop?.city.imageUrl ?? trip?.stops[0]?.city.imageUrl ?? null;

  return (
    <div>
      <div className="relative flex h-[36vh] min-h-[240px] items-end overflow-hidden bg-ink text-platform">
        {heroImage && <ZoomImage src={heroImage} from={1} to={1.2} />}
        <div aria-hidden className="absolute inset-0 bg-ink/70" />
        <div className="relative z-10 mx-auto w-full max-w-4xl px-6 pb-8">
          <p className="font-mono text-xs uppercase tracking-board text-signal">Activities</p>
          <h1 className="mt-2 font-display text-3xl uppercase tracking-board sm:text-4xl">
            {trip ? trip.name : "Add activities"}
          </h1>
          {trip && (
            <p className="mt-2 font-mono text-sm text-platform/70">
              {stops.length} {stops.length === 1 ? "stop" : "stops"} on this trip
            </p>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-10">
        {isTripLoading && <p className="text-mute">Loading trip...</p>}

        {trip && stops.length === 0 && (
          <Card className="p-6">
            <p className="text-mute">
              Add a city to this trip before attaching activities.
            </p>
            <Link to={`/trips/${tripId}/cities`} className="mt-4 inline-block">
              <Button>Add a city</Button>
            </Link>
          </Card>
        )}

        {trip && stops.length > 0 && (
          <>
            <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-4">
              <div className="sm:col-span-2">
                <label
                  htmlFor="stop-select"
                  className="mb-1 block font-display text-xs uppercase tracking-board text-mute"
                >
                  Stop
                </label>
                <select
                  id="stop-select"
                  value={effectiveStopId ?? ""}
                  onChange={(e) => setSelectedStopId(e.target.value)}
                  className={inputClass}
                >
                  {stops.map((stop) => (
                    <option key={stop.id} value={stop.id}>
                      {stopLabel(stop)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="category-filter"
                  className="mb-1 block font-display text-xs uppercase tracking-board text-mute"
                >
                  Category
                </label>
                <select
                  id="category-filter"
                  value={category ?? ""}
                  onChange={(e) => setCategory(e.target.value || undefined)}
                  className={inputClass}
                >
                  <option value="">All</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="cost-filter"
                  className="mb-1 block font-display text-xs uppercase tracking-board text-mute"
                >
                  Max cost
                </label>
                <input
                  id="cost-filter"
                  type="number"
                  min={0}
                  value={costMax}
                  onChange={(e) => setCostMax(e.target.value)}
                  placeholder="Any"
                  className={`${inputClass} font-mono`}
                />
              </div>
              <div className="sm:col-start-4">
                <label
                  htmlFor="duration-filter"
                  className="mb-1 block font-display text-xs uppercase tracking-board text-mute"
                >
                  Max duration (min)
                </label>
                <input
                  id="duration-filter"
                  type="number"
                  min={0}
                  value={maxDuration}
                  onChange={(e) => setMaxDuration(e.target.value)}
                  placeholder="Any"
                  className={`${inputClass} font-mono`}
                />
              </div>
            </div>

            {selectedStop && selectedStop.activities.length > 0 && (
              <div className="mb-8">
                <h2 className="mb-2 font-display text-sm uppercase tracking-board text-mute">
                  Already attached to {selectedStop.city.name}
                </h2>
                <div className="rounded-sm border border-rail bg-white px-4">
                  {selectedStop.activities.map((sa) => (
                    <AttachedRow key={sa.id} stopActivity={sa} tripId={tripId!} />
                  ))}
                </div>
              </div>
            )}

            <h2 className="mb-2 font-display text-sm uppercase tracking-board text-mute">
              Available activities
            </h2>

            {isActivitiesLoading && <p className="text-mute">Loading activities...</p>}
            {isActivitiesError && (
              <p className="text-mute">Couldn't load activities right now. Please try again shortly.</p>
            )}
            {!isActivitiesLoading &&
              !isActivitiesError &&
              (!filteredActivities || filteredActivities.length === 0) && (
                <p className="text-mute">No activities found. Try different filters.</p>
              )}

            <div className="rounded-sm border border-rail bg-white px-4">
              {filteredActivities?.map((activity, i) => (
                <ActivityRow
                  key={activity.id}
                  activity={activity}
                  stop={selectedStop}
                  tripId={tripId!}
                  index={i}
                  reduce={reduce}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
